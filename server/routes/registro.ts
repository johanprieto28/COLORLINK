import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { Router, type Request } from 'express';
import { config } from '../config';
import { emails } from '../email';
import { normalizarRegistro, validarRegistro } from '../../src/data/reglasRegistro';
import { email as emailValido, handler, HttpError } from '../http';
import { ciudad } from '../ciudades';
import { db, must } from '../supabase';

/**
 * Registro en tres pasos:
 *   1. POST /api/registro/codigo     { email }          → envía un código de 6 dígitos
 *   2. POST /api/registro/verificar  { email, codigo }  → devuelve un token de registro
 *   3. POST /api/registro            { email, token, ...identificación, password } → crea la cuenta ya confirmada
 * Solo se guardan hashes del código y del token (public.registro_otp).
 */
export const registroRouter = Router();

const MINUTOS_CODIGO = 10;
const MINUTOS_TOKEN = 30;
const MAX_INTENTOS = 5;
const ESPERA_REENVIO_MS = 60_000;

const CANALES = ['WEB', 'WHATSAPP', 'REFERIDO', 'COMERCIAL', 'FERIA'] as const;

interface FilaOtp {
  email: string;
  codigo_hash: string;
  expira_at: string;
  intentos: number;
  enviado_at: string;
  verificado_at: string | null;
  token_hash: string | null;
}

const hashCodigo = (email: string, codigo: string) =>
  createHmac('sha256', config.supabaseServiceKey).update(`${email}:${codigo}`).digest('hex');
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

function iguales(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// Límite simple por IP para no usar el servidor como emisor masivo de correos
const enviosPorIp = new Map<string, number[]>();
function limitarPorIp(req: Request) {
  const ip = req.ip || 'desconocida';
  const ahora = Date.now();
  const recientes = (enviosPorIp.get(ip) || []).filter((t) => ahora - t < 15 * 60_000);
  if (recientes.length >= 8) {
    throw new HttpError(429, 'Demasiadas solicitudes de código. Espera unos minutos e inténtalo de nuevo.');
  }
  recientes.push(ahora);
  enviosPorIp.set(ip, recientes);
}

async function cuentaExiste(email: string): Promise<boolean> {
  const { data } = await db().from('perfiles').select('id').eq('email', email).maybeSingle();
  return Boolean(data);
}

async function leerOtp(email: string): Promise<FilaOtp | null> {
  const { data } = await db().from('registro_otp').select('*').eq('email', email).maybeSingle();
  return (data as FilaOtp) || null;
}

// POST /api/registro/codigo { email }
registroRouter.post(
  '/registro/codigo',
  handler(async (req, res) => {
    const email = emailValido(req.body?.email);
    if (await cuentaExiste(email)) {
      throw new HttpError(409, 'Ya existe una cuenta con ese correo. Inicia sesión.');
    }

    const previa = await leerOtp(email);
    if (previa && Date.now() - new Date(previa.enviado_at).getTime() < ESPERA_REENVIO_MS) {
      throw new HttpError(429, 'Ya te enviamos un código. Espera un minuto antes de pedir otro.');
    }
    limitarPorIp(req);

    const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
    must(
      await db()
        .from('registro_otp')
        .upsert(
          {
            email,
            codigo_hash: hashCodigo(email, codigo),
            expira_at: new Date(Date.now() + MINUTOS_CODIGO * 60_000).toISOString(),
            intentos: 0,
            enviado_at: new Date().toISOString(),
            verificado_at: null,
            token_hash: null,
          },
          { onConflict: 'email' }
        ),
      'generar el código de verificación'
    );

    const envio = await emails.codigoRegistro(email, codigo, MINUTOS_CODIGO);
    if (envio.estado !== 'ENVIADO') {
      if (envio.estado === 'OMITIDO' && !config.isProduction) {
        console.info(`[registro] Correo no configurado. Código para ${email}: ${codigo}`);
      } else {
        await db().from('registro_otp').delete().eq('email', email);
        throw new HttpError(503, 'No pudimos enviar el código a tu correo. Inténtalo de nuevo en unos minutos.');
      }
    }

    res.json({ ok: true, minutos: MINUTOS_CODIGO });
  })
);

// POST /api/registro/verificar { email, codigo } → { token }
registroRouter.post(
  '/registro/verificar',
  handler(async (req, res) => {
    const email = emailValido(req.body?.email);
    const codigo = String(req.body?.codigo ?? '').replace(/\D/g, '');
    if (codigo.length !== 6) throw new HttpError(400, 'Escribe el código de 6 dígitos que te enviamos.');

    const fila = await leerOtp(email);
    if (!fila || new Date(fila.expira_at).getTime() < Date.now()) {
      throw new HttpError(400, 'El código venció o no existe. Solicita uno nuevo.');
    }
    if (fila.intentos >= MAX_INTENTOS) {
      throw new HttpError(429, 'Superaste el número de intentos. Solicita un código nuevo.');
    }

    if (!iguales(fila.codigo_hash, hashCodigo(email, codigo))) {
      // Solo cuenta el intento si nadie lo contó antes (evita carreras con peticiones en paralelo)
      await db()
        .from('registro_otp')
        .update({ intentos: fila.intentos + 1 })
        .eq('email', email)
        .eq('intentos', fila.intentos);
      const restantes = MAX_INTENTOS - fila.intentos - 1;
      throw new HttpError(
        400,
        restantes > 0
          ? `El código no es correcto. Te quedan ${restantes} ${restantes === 1 ? 'intento' : 'intentos'}.`
          : 'El código no es correcto. Solicita un código nuevo.'
      );
    }

    const token = randomBytes(32).toString('base64url');
    must(
      await db()
        .from('registro_otp')
        .update({
          verificado_at: new Date().toISOString(),
          token_hash: hashToken(token),
          expira_at: new Date(Date.now() + MINUTOS_TOKEN * 60_000).toISOString(),
        })
        .eq('email', email),
      'verificar el código'
    );
    res.json({ token });
  })
);

// POST /api/registro → crea la cuenta (correo ya confirmado) y la ficha de cliente
registroRouter.post(
  '/registro',
  handler(async (req, res) => {
    const b = req.body || {};
    const email = emailValido(b.email);
    const token = String(b.token ?? '');

    const fila = await leerOtp(email);
    if (
      !fila?.verificado_at ||
      !fila.token_hash ||
      !token ||
      new Date(fila.expira_at).getTime() < Date.now() ||
      !iguales(fila.token_hash, hashToken(token))
    ) {
      throw new HttpError(401, 'La verificación del correo venció. Solicita un código nuevo.');
    }

    // Mismas reglas que el formulario (src/data/reglasRegistro.ts)
    const datos = normalizarRegistro(b);
    const invalido = validarRegistro(datos);
    if (invalido) throw new HttpError(400, invalido.mensaje);
    const juridica = datos.tipoPersona === 'JURIDICA';
    const nombreCompleto = `${datos.nombres} ${datos.apellidos}`;
    const { tipoDocumento, documento, telefono, direccion, password } = datos;
    const empresa = juridica ? datos.razonSocial : null;
    const cargo = juridica ? datos.cargo || null : null;
    const ciudadOficial = await ciudad(b.ciudad, { required: true });
    const canal = CANALES.includes(b.canal) ? (b.canal as (typeof CANALES)[number]) : 'WEB';
    if (b.aceptaDatos !== true) {
      throw new HttpError(400, 'Debes aceptar el tratamiento de datos personales para crear tu cuenta.');
    }

    const { data: creado, error } = await db().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre_completo: nombreCompleto, telefono, empresa: empresa || '' },
    });
    if (error || !creado?.user) {
      if (/already|registered|exists/i.test(error?.message || '')) {
        throw new HttpError(409, 'Ya existe una cuenta con ese correo. Inicia sesión.');
      }
      console.error('[registro] No se pudo crear el usuario:', error?.message);
      throw new HttpError(500, 'No pudimos crear tu cuenta. Inténtalo de nuevo.');
    }
    const usuarioId = creado.user.id;

    // El trigger handle_new_user crea el perfil; aquí se completa con los datos de entrega,
    // que luego precargan el formulario de compra y el de proyectos
    must(
      await db()
        .from('perfiles')
        .upsert(
          {
            id: usuarioId,
            email,
            nombre_completo: nombreCompleto,
            telefono,
            empresa,
            cargo,
            tipo_documento: tipoDocumento,
            documento,
            ciudad: ciudadOficial,
            direccion,
          },
          { onConflict: 'id' }
        ),
      'guardar tu perfil'
    );

    // Ficha de cliente (CRM): si el equipo ya la había creado con este correo, el trigger ya la vinculó
    const { data: vinculada } = await db().from('clientes').select('id').eq('usuario_id', usuarioId).limit(1);
    if (!vinculada?.length) {
      must(
        await db().from('clientes').insert({
          usuario_id: usuarioId,
          tipo_cliente: juridica ? 'EMPRESA' : 'PERSONA_NATURAL',
          nombre: nombreCompleto,
          empresa,
          tipo_documento: tipoDocumento,
          documento,
          telefono,
          correo: email,
          canal_entrada: canal,
          ciudad: ciudadOficial,
        }),
        'registrar tu ficha de cliente'
      );
    }

    await db().from('registro_otp').delete().eq('email', email);
    res.status(201).json({ ok: true });
  })
);
