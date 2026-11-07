import { Router } from 'express';
import type { EstadoPedido, MetodoPago, Pedido, TipoEventoPedido, UserProfile } from '../../src/types';
import { ESTADO_PEDIDO_LABELS, TRANSPORTADORAS } from '../../src/types';
import { currentUser, isStaff, requireAuth, requireRole } from '../auth';
import { emails } from '../email';
import { email, handler, HttpError, oneOf, revisar, uuid } from '../http';
import { normalizar, validarCampo } from '../../src/data/reglasRegistro';
import { ciudad } from '../ciudades';
import { db, must } from '../supabase';
import { cargarCarrito } from './tienda';

export const pedidosRouter = Router();

const METODOS: MetodoPago[] = ['CONTRA_ENTREGA', 'TRANSFERENCIA'];
const ESTADOS: EstadoPedido[] = ['PENDIENTE', 'CONFIRMADO', 'PREPARANDO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'];

/** Flujo permitido de estados para la gestión interna */
const SIGUIENTE_ESTADO: Partial<Record<EstadoPedido, EstadoPedido[]>> = {
  PENDIENTE: ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['PREPARANDO', 'CANCELADO'],
  PREPARANDO: ['ENVIADO', 'CANCELADO'],
  ENVIADO: ['ENTREGADO'],
};

const ETIQUETA_PAGO: Record<string, string> = { PENDIENTE: 'Pendiente', PAGADO: 'Pagado', REEMBOLSADO: 'Reembolsado' };

/**
 * Agrega una entrada al historial del pedido (public.pedido_eventos).
 * Nunca lanza: si falla, el cambio del pedido ya quedó hecho y solo se registra el aviso.
 */
async function registrarEvento(
  pedidoId: string,
  user: UserProfile | null,
  evento: { tipo: TipoEventoPedido; estado_anterior?: string | null; estado_nuevo?: string | null; nota?: string | null }
) {
  const { error } = await db()
    .from('pedido_eventos')
    .insert({
      pedido_id: pedidoId,
      ...evento,
      usuario_id: user?.id ?? null,
      usuario_nombre: user?.nombre_completo ?? null,
      usuario_rol: user?.rol ?? null,
    });
  if (error) console.warn('[pedidos] No se pudo registrar el evento:', error.message);
}

/** Texto libre corto (notas del equipo y motivos): se recorta y se limita el largo */
function notaCorta(value: unknown, max = 500): string | null {
  const limpio = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (limpio.length > max) throw new HttpError(400, `La nota puede tener máximo ${max} caracteres.`);
  return limpio || null;
}

export async function cargarPedido(id: string): Promise<Pedido | null> {
  const pedido = must(
    await db().from('pedidos').select('*, items:pedido_items(*)').eq('id', id).maybeSingle(),
    'consultar el pedido'
  );
  return pedido as Pedido | null;
}

// POST /api/pedidos → checkout del carrito actual (transacción en PostgreSQL)
pedidosRouter.post(
  '/pedidos',
  requireAuth,
  handler(async (req, res) => {
    const user = currentUser(req);
    const body = req.body || {};

    const carrito = await cargarCarrito(user.id);
    if (carrito.items.length === 0) throw new HttpError(400, 'Tu carrito está vacío.');

    // Mismas reglas que el registro (src/data/reglasRegistro.ts)
    const nombreContacto = normalizar.texto(body.nombre_contacto);
    revisar(validarCampo.nombreCompleto(nombreContacto));
    const telefono = normalizar.telefono(body.telefono);
    revisar(validarCampo.telefono(telefono));
    const direccion = normalizar.texto(body.direccion);
    revisar(validarCampo.direccion(direccion));
    const notas = String(body.notas ?? '').trim();
    revisar(validarCampo.notas(notas));

    const pedidoId = must(
      await db().rpc('crear_pedido_desde_carrito', {
        p_usuario: user.id,
        p_metodo_pago: oneOf(body.metodo_pago, METODOS, 'método de pago'),
        p_nombre: nombreContacto,
        p_telefono: telefono,
        p_correo: email(body.correo),
        p_ciudad: await ciudad(body.ciudad, { required: true }),
        p_direccion: direccion,
        p_notas: notas,
        // El costo de envío lo decide el servidor, nunca el navegador
        p_costo_envio: carrito.costo_envio,
      }),
      'registrar el pedido'
    ) as string;

    const pedido = await cargarPedido(pedidoId);
    if (!pedido) throw new HttpError(500, 'El pedido se creó pero no se pudo leer.');

    // Guarda la dirección como predeterminada si el perfil no tenía una
    if (!user.direccion || !user.ciudad || !user.telefono) {
      await db()
        .from('perfiles')
        .update({
          direccion: user.direccion || pedido.direccion,
          ciudad: user.ciudad || pedido.ciudad,
          telefono: user.telefono || pedido.telefono,
        })
        .eq('id', user.id);
    }

    await registrarEvento(pedido.id, user, { tipo: 'ESTADO', estado_nuevo: 'PENDIENTE', nota: 'Pedido creado desde la tienda' });
    void emails.pedidoConfirmado(pedido);
    void emails.avisoInternoPedido(pedido);
    res.status(201).json(pedido);
  })
);

// GET /api/pedidos → pedidos del usuario
pedidosRouter.get(
  '/pedidos',
  requireAuth,
  handler(async (req, res) => {
    const data = must(
      await db()
        .from('pedidos')
        .select('*, items:pedido_items(*)')
        .eq('usuario_id', currentUser(req).id)
        .order('created_at', { ascending: false }),
      'consultar tus pedidos'
    );
    res.json(data);
  })
);

pedidosRouter.get(
  '/pedidos/:id',
  requireAuth,
  handler(async (req, res) => {
    const user = currentUser(req);
    const pedido = await cargarPedido(uuid(req.params.id));
    if (!pedido || (pedido.usuario_id !== user.id && !isStaff(user))) {
      throw new HttpError(404, 'Pedido no encontrado.');
    }
    res.json(pedido);
  })
);

// POST /api/pedidos/:id/cancelar → el cliente cancela antes del envío (devuelve stock)
pedidosRouter.post(
  '/pedidos/:id/cancelar',
  requireAuth,
  handler(async (req, res) => {
    const user = currentUser(req);
    const pedido = await cargarPedido(uuid(req.params.id));
    if (!pedido || (pedido.usuario_id !== user.id && !isStaff(user))) {
      throw new HttpError(404, 'Pedido no encontrado.');
    }
    must(await db().rpc('cancelar_pedido', { p_pedido: pedido.id, p_usuario: user.id }), 'cancelar el pedido');
    await registrarEvento(pedido.id, user, {
      tipo: 'ESTADO',
      estado_anterior: pedido.estado,
      estado_nuevo: 'CANCELADO',
      nota: pedido.usuario_id === user.id ? 'Cancelado por el cliente' : 'Cancelado desde la cuenta del cliente',
    });
    const actualizado = (await cargarPedido(pedido.id))!;
    void emails.estadoPedido(actualizado);
    res.json(actualizado);
  })
);

// ------------------------------------------------------------------------------
// Gestión interna de pedidos (comercial, operaciones, administrador)
// ------------------------------------------------------------------------------
const gestionPedidos = requireRole('comercial', 'operaciones');

pedidosRouter.get(
  '/panel/pedidos',
  gestionPedidos,
  handler(async (req, res) => {
    let query = db().from('pedidos').select('*, items:pedido_items(*)').order('created_at', { ascending: false }).limit(200);
    const estado = String(req.query.estado || '').toUpperCase();
    if (ESTADOS.includes(estado as EstadoPedido)) query = query.eq('estado', estado);

    // Búsqueda por código, cliente, correo, teléfono o número de guía
    const q = String(req.query.q || '').trim().replace(/[%_,()"\\]/g, ' ').slice(0, 80).trim();
    if (q) {
      query = query.or(
        ['codigo', 'nombre_contacto', 'correo', 'telefono', 'numero_guia'].map((c) => `${c}.ilike.%${q}%`).join(',')
      );
    }

    // Rango de fechas (YYYY-MM-DD, hora de Colombia, ambos días incluidos)
    const fechaValida = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null);
    const desde = fechaValida(req.query.desde);
    const hasta = fechaValida(req.query.hasta);
    if (desde) query = query.gte('created_at', `${desde}T00:00:00-05:00`);
    if (hasta) query = query.lte('created_at', `${hasta}T23:59:59.999-05:00`);

    res.json(must(await query, 'consultar pedidos'));
  })
);

// PATCH /api/panel/pedidos/:id { estado?, estado_pago?, nota?, transportadora?, numero_guia? }
// Para pasar a ENVIADO se exigen la transportadora y el número de guía.
pedidosRouter.patch(
  '/panel/pedidos/:id',
  gestionPedidos,
  handler(async (req, res) => {
    const user = currentUser(req);
    const body = req.body || {};
    const pedido = await cargarPedido(uuid(req.params.id));
    if (!pedido) throw new HttpError(404, 'Pedido no encontrado.');
    const nota = notaCorta(body.nota);

    if (body.estado_pago && body.estado_pago !== pedido.estado_pago) {
      const estadoPago = oneOf(body.estado_pago, ['PENDIENTE', 'PAGADO', 'REEMBOLSADO'] as const, 'estado de pago');
      must(await db().from('pedidos').update({ estado_pago: estadoPago }).eq('id', pedido.id), 'actualizar el pago');
      await registrarEvento(pedido.id, user, {
        tipo: 'PAGO',
        estado_anterior: ETIQUETA_PAGO[pedido.estado_pago],
        estado_nuevo: ETIQUETA_PAGO[estadoPago],
        nota: body.estado ? null : nota,
      });
    }

    if (body.estado) {
      const nuevo = oneOf(body.estado, ESTADOS, 'estado');
      if (!SIGUIENTE_ESTADO[pedido.estado]?.includes(nuevo)) {
        throw new HttpError(409, `No se puede pasar de ${ESTADO_PEDIDO_LABELS[pedido.estado]} a ${ESTADO_PEDIDO_LABELS[nuevo]}.`);
      }

      if (nuevo === 'CANCELADO') {
        must(await db().rpc('cancelar_pedido', { p_pedido: pedido.id, p_usuario: user.id }), 'cancelar el pedido');
      } else {
        const cambios: Record<string, unknown> = { estado: nuevo };
        if (nuevo === 'ENVIADO') {
          const transportadora = String(body.transportadora ?? '').trim();
          if (!(TRANSPORTADORAS as readonly string[]).includes(transportadora)) {
            throw new HttpError(400, 'Elige la transportadora que lleva el pedido.');
          }
          const guia = String(body.numero_guia ?? '').replace(/\s+/g, '').toUpperCase();
          if (!/^[A-Z0-9-]{4,30}$/.test(guia)) {
            throw new HttpError(400, 'El número de guía debe tener entre 4 y 30 letras, números o guiones.');
          }
          Object.assign(cambios, { transportadora, numero_guia: guia, enviado_at: new Date().toISOString() });
        }
        if (nuevo === 'ENTREGADO') cambios.entregado_at = new Date().toISOString();

        // El filtro por estado evita que dos personas avancen el mismo pedido a la vez
        const filas = must(
          await db().from('pedidos').update(cambios).eq('id', pedido.id).eq('estado', pedido.estado).select('id'),
          'actualizar el pedido'
        ) as Array<{ id: string }>;
        if (!filas.length) throw new HttpError(409, 'Otra persona actualizó este pedido. Recarga la lista.');
      }

      await registrarEvento(pedido.id, user, {
        tipo: nuevo === 'ENVIADO' ? 'ENVIO' : 'ESTADO',
        estado_anterior: pedido.estado,
        estado_nuevo: nuevo,
        nota:
          nuevo === 'ENVIADO'
            ? [`${body.transportadora} · guía ${String(body.numero_guia).replace(/\s+/g, '').toUpperCase()}`, nota].filter(Boolean).join(' — ')
            : nota,
      });
    }

    const actualizado = (await cargarPedido(pedido.id))!;
    if (actualizado.estado !== pedido.estado) void emails.estadoPedido(actualizado);
    res.json(actualizado);
  })
);

// GET /api/panel/pedidos/:id/eventos → historial del pedido (más reciente primero)
pedidosRouter.get(
  '/panel/pedidos/:id/eventos',
  gestionPedidos,
  handler(async (req, res) => {
    const eventos = must(
      await db()
        .from('pedido_eventos')
        .select('id, pedido_id, tipo, estado_anterior, estado_nuevo, nota, usuario_nombre, usuario_rol, created_at')
        .eq('pedido_id', uuid(req.params.id))
        .order('created_at', { ascending: false }),
      'consultar el historial del pedido'
    );
    res.json(eventos);
  })
);

// POST /api/panel/pedidos/:id/notas { nota } → nota interna (el cliente no la ve)
pedidosRouter.post(
  '/panel/pedidos/:id/notas',
  gestionPedidos,
  handler(async (req, res) => {
    const pedido = await cargarPedido(uuid(req.params.id));
    if (!pedido) throw new HttpError(404, 'Pedido no encontrado.');
    const nota = notaCorta(req.body?.nota);
    if (!nota) throw new HttpError(400, 'Escribe la nota.');
    const user = currentUser(req);
    const evento = must(
      await db()
        .from('pedido_eventos')
        .insert({
          pedido_id: pedido.id,
          tipo: 'NOTA',
          nota,
          usuario_id: user.id,
          usuario_nombre: user.nombre_completo,
          usuario_rol: user.rol,
        })
        .select('id, pedido_id, tipo, estado_anterior, estado_nuevo, nota, usuario_nombre, usuario_rol, created_at')
        .single(),
      'guardar la nota'
    );
    res.status(201).json(evento);
  })
);
