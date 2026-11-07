import { Router } from 'express';
import { chat, diagnose, type ContextoUsuario, type MensajeChat } from '../ai';
import { handler, HttpError, num, oneOf, rateLimit, text } from '../http';
import { db, isDbConfigured } from '../supabase';
import { productosActivos } from './tienda';
import type { Producto } from '../../src/types';

export const iaRouter = Router();

const limiteIa = rateLimit({
  windowMs: 60_000,
  max: 15,
  message: 'Estás enviando muchas consultas seguidas. Espera un momento e inténtalo de nuevo.',
});

async function contextoUsuario(userId: string, nombre: string, rol: string): Promise<ContextoUsuario> {
  const [clientes, pedidos, carrito] = await Promise.all([
    db().from('clientes').select('id').eq('usuario_id', userId),
    db().from('pedidos').select('codigo, estado, total').eq('usuario_id', userId).order('created_at', { ascending: false }).limit(5),
    db().from('carrito_items').select('cantidad').eq('usuario_id', userId),
  ]);
  const ids = (clientes.data || []).map((c: any) => c.id);
  const proyectos = ids.length
    ? await db()
        .from('proyectos')
        .select('codigo, nombre, estado')
        .or(`creado_por.eq.${userId},cliente_id.in.(${ids.join(',')})`)
        .order('updated_at', { ascending: false })
        .limit(5)
    : await db().from('proyectos').select('codigo, nombre, estado').eq('creado_por', userId).limit(5);

  return {
    nombre,
    rol,
    proyectos: (proyectos.data || []) as ContextoUsuario['proyectos'],
    pedidos: ((pedidos.data || []) as any[]).map((p) => ({ ...p, total: Number(p.total) })),
    carrito: ((carrito.data || []) as any[]).reduce((acc, it) => acc + Number(it.cantidad), 0),
  };
}

// POST /api/ia/chat { sessionId, mensajes: [{rol, texto}], vista }
iaRouter.post(
  '/ia/chat',
  limiteIa,
  handler(async (req, res) => {
    const sessionId = text(req.body?.sessionId, 'sesión', { required: true, max: 80 });
    const vista = text(req.body?.vista, 'vista', { max: 60 });
    const raw = req.body?.mensajes;
    if (!Array.isArray(raw) || raw.length === 0) throw new HttpError(400, 'Envía al menos un mensaje.');

    const mensajes: MensajeChat[] = raw.slice(-10).map((m: any) => ({
      rol: m?.rol === 'asistente' ? 'asistente' : 'usuario',
      texto: text(m?.texto, 'mensaje', { required: true, max: 1500 }),
    }));
    if (mensajes[mensajes.length - 1].rol !== 'usuario') throw new HttpError(400, 'El último mensaje debe ser del usuario.');

    let productos: Producto[] = [];
    let usuario: ContextoUsuario | null = null;
    if (isDbConfigured()) {
      productos = await productosActivos().catch(() => []);
      if (req.user) {
        usuario = await contextoUsuario(req.user.id, req.user.nombre_completo, req.user.rol).catch(() => null);
      }
    }

    const respuesta = await chat(mensajes, productos, usuario, vista);

    // Toda conversación queda registrada para trazabilidad y mejora del asistente
    if (isDbConfigured()) {
      const { error } = await db().from('conversaciones_ia').insert({
        session_id: sessionId,
        usuario_id: req.user?.id || null,
        vista: vista || null,
        pregunta: mensajes[mensajes.length - 1].texto,
        respuesta: respuesta.respuesta,
        motor: respuesta.motor,
      });
      if (error) console.warn('[ia] No se pudo registrar la conversación:', error.message);
    }

    res.json(respuesta);
  })
);

// POST /api/ia/diagnostico → orientación preliminar (no crea proyecto)
iaRouter.post(
  '/ia/diagnostico',
  limiteIa,
  handler(async (req, res) => {
    const b = req.body || {};
    const resultado = await diagnose({
      tipoSuperficie: text(b.tipoSuperficie, 'superficie', { max: 60 }) || 'MAMPOSTERIA',
      areaAproximada: b.areaAproximada ? num(b.areaAproximada, 'área', { min: 0, max: 1_000_000 }) : undefined,
      ambiente: text(b.ambiente, 'ambiente', { max: 40 }) || undefined,
      ubicacion: oneOf(b.ubicacion, ['INTERIOR', 'EXTERIOR', 'MIXTO'] as const, 'ubicación', 'INTERIOR'),
      humedad: oneOf(b.humedad, ['BAJA', 'MEDIA', 'ALTA'] as const, 'humedad', 'BAJA'),
      fisuras: Boolean(b.fisuras),
      desgaste: oneOf(b.desgaste, ['NINGUNO', 'LEVE', 'MODERADO', 'AVANZADO'] as const, 'desgaste', 'LEVE'),
      desprendimiento: Boolean(b.desprendimiento),
      descripcionProblema: text(b.descripcionProblema, 'descripción', { max: 2000 }),
      tieneFotos: Boolean(b.tieneFotos),
    });

    if (isDbConfigured() && b.sessionId) {
      await db()
        .from('conversaciones_ia')
        .insert({
          session_id: String(b.sessionId).slice(0, 80),
          usuario_id: req.user?.id || null,
          vista: 'diagnostico',
          pregunta: String(b.descripcionProblema || 'Diagnóstico de superficie').slice(0, 1500),
          respuesta: resultado.recomendacionPreliminar,
          motor: resultado.motorUtilizado,
        })
        .then(({ error }) => error && console.warn('[ia] No se pudo registrar el diagnóstico:', error.message));
    }
    res.json(resultado);
  })
);
