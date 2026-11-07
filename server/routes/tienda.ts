import { Router } from 'express';
import type { Carrito, CategoriaProducto, Producto } from '../../src/types';
import { CATEGORIA_PRODUCTO_LABELS } from '../../src/types';
import { config } from '../config';
import { currentUser, requireAuth } from '../auth';
import { handler, HttpError, num, uuid } from '../http';
import { db, must } from '../supabase';

export const tiendaRouter = Router();

/**
 * Se lee la fila completa y se filtra aquí: así la ficha técnica (migración 006) aparece
 * cuando existe sin romper la tienda si aún no se ha creado la columna.
 */
const PRODUCTO_PUBLICO = '*';

/** Nunca se envían al navegador el costo, el stock mínimo ni la ubicación en bodega */
export function publico(row: any): Producto {
  const { costo: _costo, stock_minimo: _min, ubicacion_bodega: _bodega, created_at: _c, updated_at: _u, ...resto } = row || {};
  return { ...resto, precio: Number(resto.precio), stock: Number(resto.stock), ficha: resto.ficha || null } as Producto;
}

const CATEGORIAS = Object.keys(CATEGORIA_PRODUCTO_LABELS) as CategoriaProducto[];

export async function productosActivos(): Promise<Producto[]> {
  const data = must(
    await db().from('productos').select(PRODUCTO_PUBLICO).eq('activo', true).order('nombre'),
    'consultar el catálogo'
  );
  return ((data || []) as any[]).map(publico);
}

// GET /api/productos?categoria=&q=&orden=&destacados=1
tiendaRouter.get(
  '/productos',
  handler(async (req, res) => {
    let query = db().from('productos').select(PRODUCTO_PUBLICO).eq('activo', true);

    const categoria = String(req.query.categoria || '').toUpperCase();
    if (categoria && CATEGORIAS.includes(categoria as CategoriaProducto)) {
      query = query.eq('categoria', categoria);
    }
    if (req.query.destacados === '1') query = query.eq('destacado', true);

    const q = String(req.query.q || '').trim().slice(0, 80);
    if (q) {
      const term = q.replace(/[%_,()]/g, ' ');
      query = query.or(`nombre.ilike.%${term}%,descripcion.ilike.%${term}%,acabado.ilike.%${term}%`);
    }

    switch (req.query.orden) {
      case 'precio_asc':
        query = query.order('precio', { ascending: true });
        break;
      case 'precio_desc':
        query = query.order('precio', { ascending: false });
        break;
      default:
        query = query.order('destacado', { ascending: false }).order('nombre');
    }

    res.json((must(await query, 'consultar el catálogo') as any[]).map(publico));
  })
);

// GET /api/productos/:slug
tiendaRouter.get(
  '/productos/:slug',
  handler(async (req, res) => {
    const producto = must(
      await db().from('productos').select(PRODUCTO_PUBLICO).eq('slug', req.params.slug).eq('activo', true).maybeSingle(),
      'consultar el producto'
    );
    if (!producto) throw new HttpError(404, 'Producto no encontrado.');
    const p = publico(producto);

    const relacionados = must(
      await db()
        .from('productos')
        .select(PRODUCTO_PUBLICO)
        .eq('activo', true)
        .eq('categoria', p.categoria)
        .neq('id', p.id)
        .limit(4),
      'consultar productos relacionados'
    );
    res.json({ producto: p, relacionados: (relacionados as any[]).map(publico) });
  })
);

// ------------------------------------------------------------------------------
// Carrito (persistido en public.carrito_items por usuario)
// ------------------------------------------------------------------------------

export async function cargarCarrito(usuarioId: string): Promise<Carrito> {
  const rows = must(
    await db()
      .from('carrito_items')
      .select(`cantidad, producto:productos(${PRODUCTO_PUBLICO})`)
      .eq('usuario_id', usuarioId)
      .order('created_at'),
    'consultar el carrito'
  ) as any[];

  return construirCarrito(
    (rows || []).filter((r) => r.producto).map((r) => ({ producto: publico(r.producto), cantidad: Number(r.cantidad) }))
  );
}

function construirCarrito(items: Carrito['items']): Carrito {
  const subtotal = items.reduce((acc, it) => acc + Number(it.producto.precio) * it.cantidad, 0);
  const costo_envio = items.length === 0 || subtotal >= config.envioGratisDesde ? 0 : config.costoEnvio;
  return { items, subtotal, costo_envio, total: subtotal + costo_envio, envio_gratis_desde: config.envioGratisDesde };
}

/** Lee [{producto_id, cantidad}] del cuerpo; ignora entradas mal formadas */
function leerItemsInvitado(raw: unknown): Map<string, number> {
  if (!Array.isArray(raw) || raw.length > 60) throw new HttpError(400, 'El carrito no es válido.');
  const items = new Map<string, number>();
  for (const it of raw as any[]) {
    const id = String(it?.producto_id || '');
    const cantidad = Math.floor(Number(it?.cantidad));
    if (/^[0-9a-f-]{36}$/i.test(id) && cantidad >= 1 && cantidad <= 999) items.set(id, cantidad);
  }
  return items;
}

// POST /api/carrito/simular { items } → carrito de un visitante (sin sesión) con precios y stock actuales
tiendaRouter.post(
  '/carrito/simular',
  handler(async (req, res) => {
    const pedidos = leerItemsInvitado(req.body?.items);
    if (pedidos.size === 0) return res.json(construirCarrito([]));
    const productos = must(
      await db().from('productos').select(PRODUCTO_PUBLICO).in('id', [...pedidos.keys()]).eq('activo', true),
      'consultar el carrito'
    ) as any[];
    res.json(construirCarrito(productos.map(publico).map((producto) => ({ producto, cantidad: pedidos.get(producto.id)! }))));
  })
);

// POST /api/carrito/fusionar { items } → al iniciar sesión, pasa el carrito del visitante a la cuenta
tiendaRouter.post(
  '/carrito/fusionar',
  requireAuth,
  handler(async (req, res) => {
    const user = currentUser(req);
    const invitado = leerItemsInvitado(req.body?.items);
    if (invitado.size > 0) {
      const [productos, actuales] = await Promise.all([
        db().from('productos').select('id, stock').in('id', [...invitado.keys()]).eq('activo', true),
        db().from('carrito_items').select('producto_id, cantidad').eq('usuario_id', user.id),
      ]);
      const enCuenta = new Map((must(actuales, 'consultar el carrito') as any[]).map((r) => [r.producto_id, Number(r.cantidad)]));
      const filas = (must(productos, 'consultar el carrito') as any[])
        .map((p) => ({
          usuario_id: user.id,
          producto_id: p.id,
          cantidad: Math.min(999, Math.floor(Number(p.stock)), (enCuenta.get(p.id) || 0) + invitado.get(p.id)!),
        }))
        .filter((f) => f.cantidad >= 1);
      if (filas.length) {
        must(await db().from('carrito_items').upsert(filas, { onConflict: 'usuario_id,producto_id' }), 'guardar el carrito');
      }
    }
    res.json(await cargarCarrito(user.id));
  })
);

tiendaRouter.get(
  '/carrito',
  requireAuth,
  handler(async (req, res) => {
    res.json(await cargarCarrito(currentUser(req).id));
  })
);

// PUT /api/carrito/:productoId { cantidad } → fija la cantidad (agrega si no existe)
tiendaRouter.put(
  '/carrito/:productoId',
  requireAuth,
  handler(async (req, res) => {
    const user = currentUser(req);
    const productoId = uuid(req.params.productoId, 'producto');
    const cantidad = num(req.body?.cantidad, 'cantidad', { min: 1, max: 999, integer: true });

    const producto = must(
      await db().from('productos').select('id, nombre, stock, activo').eq('id', productoId).maybeSingle(),
      'consultar el producto'
    ) as { nombre: string; stock: number; activo: boolean } | null;
    if (!producto || !producto.activo) throw new HttpError(404, 'El producto ya no está disponible.');
    if (Number(producto.stock) < cantidad) {
      throw new HttpError(409, `Solo hay ${producto.stock} unidades disponibles de "${producto.nombre}".`);
    }

    must(
      await db()
        .from('carrito_items')
        .upsert({ usuario_id: user.id, producto_id: productoId, cantidad }, { onConflict: 'usuario_id,producto_id' }),
      'actualizar el carrito'
    );
    res.json(await cargarCarrito(user.id));
  })
);

tiendaRouter.delete(
  '/carrito/:productoId',
  requireAuth,
  handler(async (req, res) => {
    const user = currentUser(req);
    must(
      await db()
        .from('carrito_items')
        .delete()
        .eq('usuario_id', user.id)
        .eq('producto_id', uuid(req.params.productoId, 'producto')),
      'actualizar el carrito'
    );
    res.json(await cargarCarrito(user.id));
  })
);
