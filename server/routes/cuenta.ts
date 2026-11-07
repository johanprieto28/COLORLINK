import { Router } from 'express';
import { COLOR_EXPLORER_PALETTE } from '../../src/data/colorExplorerData';
import { currentUser, requireAuth } from '../auth';
import { emails } from '../email';
import { normalizar, validarCampo } from '../../src/data/reglasRegistro';
import { handler, HttpError, revisar } from '../http';
import { ciudad } from '../ciudades';
import { db, must } from '../supabase';

export const cuentaRouter = Router();

const TIPOS_DOCUMENTO = ['CC', 'CE', 'PPT', 'PA', 'TI', 'NIT'];

// GET /api/cuenta → perfil del usuario autenticado (y envía la bienvenida una sola vez)
cuentaRouter.get(
  '/cuenta',
  requireAuth,
  handler(async (req, res) => {
    const user = currentUser(req);

    // Reclama el envío de bienvenida de forma atómica: solo una petición obtiene la fila
    const { data: reclamado } = await db()
      .from('perfiles')
      .update({ bienvenida_enviada: true })
      .eq('id', user.id)
      .eq('bienvenida_enviada', false)
      .select('id')
      .maybeSingle();
    if (reclamado) {
      void emails.bienvenida(user.email, user.nombre_completo || 'cliente');
    }

    res.json(user);
  })
);

// PATCH /api/cuenta → actualiza datos de contacto (nunca el rol ni el correo)
cuentaRouter.patch(
  '/cuenta',
  requireAuth,
  handler(async (req, res) => {
    const user = currentUser(req);
    const body = req.body || {};
    // Mismas reglas que el registro (src/data/reglasRegistro.ts); los campos opcionales se validan si vienen
    // Solo se cambian los campos que vienen en la petición: lo que no se envía se conserva
    const viene = (campo: string) => Object.prototype.hasOwnProperty.call(body, campo);
    const cambios: Record<string, unknown> = {};

    if (viene('nombre_completo')) {
      const nombre = normalizar.texto(body.nombre_completo);
      revisar(validarCampo.nombreCompleto(nombre));
      cambios.nombre_completo = nombre;
    }
    if (viene('telefono')) {
      const telefono = normalizar.telefono(body.telefono);
      if (telefono) revisar(validarCampo.telefono(telefono));
      cambios.telefono = telefono || null;
    }
    if (viene('empresa')) {
      const empresa = normalizar.texto(body.empresa);
      if (empresa) revisar(validarCampo.razonSocial(empresa));
      cambios.empresa = empresa || null;
    }
    if (viene('documento')) {
      const tipoDocumento = TIPOS_DOCUMENTO.includes(body.tipo_documento)
        ? (body.tipo_documento as string)
        : user.tipo_documento || 'CC';
      const documento = normalizar.documento(body.documento, tipoDocumento);
      if (documento) revisar(validarCampo.documento(documento, tipoDocumento));
      cambios.documento = documento || null;
      cambios.tipo_documento = documento ? tipoDocumento : null;
    }
    if (viene('ciudad')) cambios.ciudad = await ciudad(body.ciudad);
    if (viene('direccion')) {
      const direccion = normalizar.texto(body.direccion);
      if (direccion) revisar(validarCampo.direccion(direccion));
      cambios.direccion = direccion || null;
    }
    if (Object.keys(cambios).length === 0) return res.json(user);

    const perfil = must(
      await db().from('perfiles').update(cambios).eq('id', user.id).select('*').single(),
      'actualizar tu perfil'
    );
    res.json(perfil);
  })
);

// ------------------------------------------------------------------------------
// Colores favoritos
// ------------------------------------------------------------------------------
const COLOR_IDS = new Set(COLOR_EXPLORER_PALETTE.map((c) => c.id));

cuentaRouter.get(
  '/cuenta/favoritos',
  requireAuth,
  handler(async (req, res) => {
    const rows = must(
      await db().from('favoritos_color').select('color_id').eq('usuario_id', currentUser(req).id).order('created_at'),
      'consultar tus favoritos'
    ) as Array<{ color_id: string }>;
    res.json(rows.map((r) => r.color_id));
  })
);

// PUT /api/cuenta/favoritos { colores: string[] } → reemplaza la lista completa
cuentaRouter.put(
  '/cuenta/favoritos',
  requireAuth,
  handler(async (req, res) => {
    const user = currentUser(req);
    const colores = req.body?.colores;
    if (!Array.isArray(colores) || colores.length > 100) {
      throw new HttpError(400, 'La lista de favoritos no es válida.');
    }
    const validos = Array.from(new Set(colores.map(String).filter((id) => COLOR_IDS.has(id))));

    const actuales = must(
      await db().from('favoritos_color').select('color_id').eq('usuario_id', user.id),
      'consultar tus favoritos'
    ) as Array<{ color_id: string }>;
    const actualesSet = new Set(actuales.map((r) => r.color_id));

    const quitar = [...actualesSet].filter((id) => !validos.includes(id));
    const agregar = validos.filter((id) => !actualesSet.has(id));

    if (quitar.length) {
      must(
        await db().from('favoritos_color').delete().eq('usuario_id', user.id).in('color_id', quitar),
        'actualizar tus favoritos'
      );
    }
    if (agregar.length) {
      must(
        await db().from('favoritos_color').insert(agregar.map((color_id) => ({ usuario_id: user.id, color_id }))),
        'actualizar tus favoritos'
      );
    }
    res.json(validos);
  })
);
