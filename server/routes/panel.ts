import { Router } from 'express';
import type { CategoriaProducto, EstadoPedido, MetricasPanel, ProjectStatus, UserRole } from '../../src/types';
import { CATEGORIA_PRODUCTO_LABELS } from '../../src/types';
import { geminiStatus } from '../ai';
import { leerImagenBase64 } from '../archivos';
import { currentUser, requireRole, requireStaff } from '../auth';
import { emailStatus } from '../email';
import { bool, handler, HttpError, isoDate, num, oneOf, optionalText, text, uuid } from '../http';
import { db, isDbConfigured, must, PRODUCTOS_BUCKET } from '../supabase';

export const panelRouter = Router();

const CATEGORIAS = Object.keys(CATEGORIA_PRODUCTO_LABELS) as CategoriaProducto[];
const ROLES: UserRole[] = ['cliente', 'tecnico', 'comercial', 'operaciones', 'administrador'];
const inventario = requireRole('operaciones');

// ------------------------------------------------------------------------------
// Métricas
// ------------------------------------------------------------------------------
panelRouter.get(
  '/panel/metricas',
  requireStaff,
  handler(async (_req, res) => {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString();

    const [proyectos, pedidos, productos, clientes, cotizaciones, servicios] = await Promise.all([
      db().from('proyectos').select('estado'),
      db().from('pedidos').select('estado, total, created_at').gte('created_at', inicioMesAnterior),
      db().from('productos').select('stock, stock_minimo').eq('activo', true),
      db().from('clientes').select('id', { count: 'exact', head: true }),
      db().from('cotizaciones').select('id', { count: 'exact', head: true }).eq('estado', 'ENVIADA'),
      db().from('servicios').select('id', { count: 'exact', head: true }).in('estado', ['PROGRAMADO', 'EN_EJECUCION']),
    ]);

    const proyectosPorEstado: Partial<Record<ProjectStatus, number>> = {};
    for (const p of must(proyectos, 'calcular métricas') as any[]) {
      proyectosPorEstado[p.estado as ProjectStatus] = (proyectosPorEstado[p.estado as ProjectStatus] || 0) + 1;
    }

    const pedidosPorEstado: Partial<Record<EstadoPedido, number>> = {};
    let ventasMes = 0;
    let ventasMesAnterior = 0;
    for (const p of must(pedidos, 'calcular métricas') as any[]) {
      if (p.created_at >= inicioMes) {
        pedidosPorEstado[p.estado as EstadoPedido] = (pedidosPorEstado[p.estado as EstadoPedido] || 0) + 1;
      }
      if (p.estado === 'CANCELADO') continue;
      if (p.created_at >= inicioMes) ventasMes += Number(p.total);
      else ventasMesAnterior += Number(p.total);
    }

    const metricas: MetricasPanel = {
      proyectosPorEstado,
      proyectosTotal: (proyectos.data || []).length,
      pedidosPorEstado,
      ventasMes,
      ventasMesAnterior,
      productosBajoStock: (must(productos, 'calcular métricas') as any[]).filter(
        (p) => Number(p.stock) <= Number(p.stock_minimo)
      ).length,
      clientesTotal: clientes.count || 0,
      cotizacionesPendientes: cotizaciones.count || 0,
      serviciosActivos: servicios.count || 0,
    };
    res.json(metricas);
  })
);

// ------------------------------------------------------------------------------
// Clientes (CRM)
// ------------------------------------------------------------------------------
panelRouter.get(
  '/panel/clientes',
  requireRole('comercial'),
  handler(async (req, res) => {
    let query = db()
      .from('clientes')
      .select('*, proyectos!proyectos_cliente_id_fkey(id)')
      .order('created_at', { ascending: false })
      .limit(500);
    const q = String(req.query.q || '').trim().replace(/[%_,()"]/g, ' ').slice(0, 80);
    if (q) query = query.or(`nombre.ilike.%${q}%,empresa.ilike.%${q}%,correo.ilike.%${q}%,documento.ilike.%${q}%`);
    // ?tipo=NATURAL | JURIDICA (empresa, copropiedad o entidad)
    if (req.query.tipo === 'NATURAL') query = query.eq('tipo_cliente', 'PERSONA_NATURAL');
    if (req.query.tipo === 'JURIDICA') query = query.neq('tipo_cliente', 'PERSONA_NATURAL');
    const rows = must(await query, 'consultar clientes') as any[];
    res.json(rows.map(({ proyectos, ...c }) => ({ ...c, total_proyectos: (proyectos || []).length })));
  })
);

// ------------------------------------------------------------------------------
// Productos e inventario
// ------------------------------------------------------------------------------
panelRouter.get(
  '/panel/productos',
  requireStaff,
  handler(async (_req, res) => {
    res.json(must(await db().from('productos').select('*').order('nombre'), 'consultar productos'));
  })
);

function leerProducto(b: any) {
  const nombre = text(b.nombre, 'nombre', { required: true, max: 160, min: 3 });
  const datos: Record<string, unknown> = {
    sku: text(b.sku, 'SKU', { required: true, max: 40 }).toUpperCase(),
    nombre,
    descripcion: text(b.descripcion, 'descripción', { max: 2000 }),
    categoria: oneOf(b.categoria, CATEGORIAS, 'categoría'),
    presentacion: text(b.presentacion, 'presentación', { required: true, max: 60 }),
    unidad: text(b.unidad, 'unidad', { max: 20 }) || 'UNIDAD',
    precio: num(b.precio, 'precio', { min: 0, max: 100_000_000 }),
    precio_anterior: b.precio_anterior ? num(b.precio_anterior, 'precio anterior', { min: 0, max: 100_000_000 }) : null,
    costo: b.costo !== undefined && b.costo !== '' ? num(b.costo, 'costo', { min: 0, max: 100_000_000 }) : 0,
    stock_minimo: b.stock_minimo !== undefined && b.stock_minimo !== '' ? num(b.stock_minimo, 'stock mínimo', { min: 0, max: 1_000_000 }) : 5,
    color_hex: b.color_hex ? text(b.color_hex, 'color', { max: 7 }) : null,
    acabado: optionalText(b.acabado, 'acabado', 40),
    rendimiento_m2: b.rendimiento_m2 ? num(b.rendimiento_m2, 'rendimiento', { min: 0, max: 10_000 }) : null,
    imagen_url: optionalText(b.imagen_url, 'imagen', 500),
    ubicacion_bodega: optionalText(b.ubicacion_bodega, 'ubicación en bodega', 80),
    activo: b.activo === undefined ? true : bool(b.activo),
    destacado: bool(b.destacado),
  };
  if (datos.color_hex && !/^#[0-9a-f]{6}$/i.test(String(datos.color_hex))) {
    throw new HttpError(400, 'El color debe tener formato #RRGGBB.');
  }
  datos.slug = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .concat('-', String(datos.sku).toLowerCase());
  return datos;
}

panelRouter.post(
  '/panel/productos',
  inventario,
  handler(async (req, res) => {
    const user = currentUser(req);
    const datos = leerProducto(req.body || {});
    const stockInicial = req.body?.stock ? num(req.body.stock, 'stock inicial', { min: 0, max: 1_000_000 }) : 0;
    const producto = must(
      await db().from('productos').insert({ ...datos, stock: 0 }).select('*').single(),
      'crear el producto'
    ) as any;
    if (stockInicial > 0) {
      must(
        await db().rpc('ajustar_stock', {
          p_producto: producto.id,
          p_tipo: 'ENTRADA',
          p_cantidad: stockInicial,
          p_motivo: 'Stock inicial',
          p_referencia: null,
          p_usuario: user.id,
        }),
        'registrar el stock inicial'
      );
    }
    res.status(201).json(must(await db().from('productos').select('*').eq('id', producto.id).single(), 'leer el producto'));
  })
);

// El stock no se edita aquí: se mueve con /ajuste-stock para dejar trazabilidad
panelRouter.put(
  '/panel/productos/:id',
  inventario,
  handler(async (req, res) => {
    const datos = leerProducto(req.body || {});
    const producto = must(
      await db().from('productos').update(datos).eq('id', uuid(req.params.id)).select('*').maybeSingle(),
      'actualizar el producto'
    );
    if (!producto) throw new HttpError(404, 'Producto no encontrado.');
    res.json(producto);
  })
);

panelRouter.post(
  '/panel/productos/:id/ajuste-stock',
  inventario,
  handler(async (req, res) => {
    const user = currentUser(req);
    const tipo = oneOf(req.body?.tipo, ['ENTRADA', 'SALIDA', 'AJUSTE'] as const, 'tipo de movimiento');
    must(
      await db().rpc('ajustar_stock', {
        p_producto: uuid(req.params.id),
        p_tipo: tipo,
        p_cantidad: num(req.body?.cantidad, 'cantidad', { min: tipo === 'AJUSTE' ? 0 : 0.01, max: 1_000_000 }),
        p_motivo: text(req.body?.motivo, 'motivo', { required: true, max: 200, min: 3 }),
        p_referencia: optionalText(req.body?.referencia, 'referencia', 80),
        p_usuario: user.id,
      }),
      'ajustar el inventario'
    );
    res.json(must(await db().from('productos').select('*').eq('id', req.params.id).single(), 'leer el producto'));
  })
);

panelRouter.post(
  '/panel/productos/imagen',
  inventario,
  handler(async (req, res) => {
    const archivo = leerImagenBase64(req.body);
    const path = `catalogo/${archivo.nombreSeguro}`;
    must(
      await db().storage.from(PRODUCTOS_BUCKET).upload(path, archivo.buffer, { contentType: archivo.mime }),
      'subir la imagen'
    );
    const { data } = db().storage.from(PRODUCTOS_BUCKET).getPublicUrl(path);
    res.status(201).json({ url: data.publicUrl });
  })
);

panelRouter.get(
  '/panel/movimientos',
  requireStaff,
  handler(async (req, res) => {
    let query = db()
      .from('movimientos_inventario')
      .select('*, producto:productos(nombre)')
      .order('created_at', { ascending: false })
      .limit(150);
    if (req.query.producto) query = query.eq('producto_id', uuid(req.query.producto, 'producto'));
    const rows = must(await query, 'consultar movimientos') as any[];
    res.json(rows.map(({ producto, ...m }) => ({ ...m, producto_nombre: producto?.nombre })));
  })
);

// ------------------------------------------------------------------------------
// Abastecimiento (órdenes de compra a proveedores)
// ------------------------------------------------------------------------------
panelRouter.get(
  '/panel/abastecimientos',
  requireStaff,
  handler(async (_req, res) => {
    const rows = must(
      await db()
        .from('abastecimientos')
        .select('*, producto:productos(nombre, sku), proyecto:proyectos(codigo)')
        .order('created_at', { ascending: false })
        .limit(200),
      'consultar abastecimientos'
    ) as any[];
    res.json(
      rows.map(({ producto, proyecto, ...a }) => ({
        ...a,
        producto_nombre: producto?.nombre,
        producto_sku: producto?.sku,
        proyecto_codigo: proyecto?.codigo || null,
      }))
    );
  })
);

panelRouter.post(
  '/panel/abastecimientos',
  inventario,
  handler(async (req, res) => {
    const user = currentUser(req);
    const b = req.body || {};
    const productoId = uuid(b.producto_id, 'producto');
    const cantidad = num(b.cantidad, 'cantidad', { min: 0.01, max: 1_000_000 });
    const producto = must(await db().from('productos').select('costo').eq('id', productoId).maybeSingle(), 'consultar el producto') as any;
    if (!producto) throw new HttpError(404, 'Producto no encontrado.');

    const orden = must(
      await db()
        .from('abastecimientos')
        .insert({
          producto_id: productoId,
          proyecto_id: b.proyecto_id ? uuid(b.proyecto_id, 'proyecto') : null,
          cantidad,
          proveedor: text(b.proveedor, 'proveedor', { required: true, max: 160 }),
          fecha_estimada_llegada: isoDate(b.fecha_estimada_llegada, 'fecha estimada'),
          costo_total: b.costo_total ? num(b.costo_total, 'costo total', { min: 0 }) : cantidad * Number(producto.costo || 0),
          estado: 'ORDENADO',
          creado_por: user.id,
        })
        .select('*')
        .single(),
      'crear la orden'
    );
    res.status(201).json(orden);
  })
);

panelRouter.patch(
  '/panel/abastecimientos/:id',
  inventario,
  handler(async (req, res) => {
    const user = currentUser(req);
    const id = uuid(req.params.id);
    const estado = oneOf(req.body?.estado, ['ORDENADO', 'EN_TRANSITO', 'RECIBIDO', 'CANCELADO'] as const, 'estado');
    if (estado === 'RECIBIDO') {
      must(await db().rpc('recibir_abastecimiento', { p_orden: id, p_usuario: user.id }), 'recibir la orden');
    } else {
      const actualizada = must(
        await db().from('abastecimientos').update({ estado }).eq('id', id).not('estado', 'in', '(RECIBIDO,CANCELADO)').select('id'),
        'actualizar la orden'
      ) as any[];
      if (!actualizada.length) throw new HttpError(409, 'La orden ya está cerrada.');
    }
    res.json(must(await db().from('abastecimientos').select('*').eq('id', id).single(), 'leer la orden'));
  })
);

// ------------------------------------------------------------------------------
// Servicios y calidad (vistas globales; las acciones viven en /api/proyectos/:id)
// ------------------------------------------------------------------------------
panelRouter.get(
  '/panel/servicios',
  requireStaff,
  handler(async (_req, res) => {
    const rows = must(
      await db()
        .from('servicios')
        .select('*, proyecto:proyectos(codigo, nombre)')
        .order('fecha_inicio', { ascending: false })
        .limit(200),
      'consultar servicios'
    ) as any[];
    res.json(rows.map(({ proyecto, ...s }) => ({ ...s, proyecto_codigo: proyecto?.codigo, proyecto_nombre: proyecto?.nombre })));
  })
);

panelRouter.get(
  '/panel/calidad',
  requireStaff,
  handler(async (_req, res) => {
    const rows = must(
      await db()
        .from('inspecciones_calidad')
        .select('*, proyecto:proyectos(codigo, nombre)')
        .order('created_at', { ascending: false })
        .limit(200),
      'consultar inspecciones'
    ) as any[];
    res.json(rows.map(({ proyecto, ...q }) => ({ ...q, proyecto_codigo: proyecto?.codigo, proyecto_nombre: proyecto?.nombre })));
  })
);

// ------------------------------------------------------------------------------
// Usuarios y roles (solo administrador)
// ------------------------------------------------------------------------------
panelRouter.get(
  '/panel/usuarios',
  requireRole('administrador'),
  handler(async (_req, res) => {
    res.json(must(await db().from('perfiles').select('*').order('created_at', { ascending: false }), 'consultar usuarios'));
  })
);

panelRouter.patch(
  '/panel/usuarios/:id',
  requireRole('administrador'),
  handler(async (req, res) => {
    const user = currentUser(req);
    const id = uuid(req.params.id);
    const cambios: Record<string, unknown> = {};
    if (req.body?.rol !== undefined) {
      if (!ROLES.includes(req.body.rol)) throw new HttpError(400, 'Rol no válido.');
      cambios.rol = req.body.rol;
    }
    if (req.body?.activo !== undefined) cambios.activo = bool(req.body.activo);
    if (req.body?.cargo !== undefined) cambios.cargo = optionalText(req.body.cargo, 'cargo', 80);

    if (id === user.id && ((cambios.rol && cambios.rol !== 'administrador') || cambios.activo === false)) {
      throw new HttpError(409, 'No puedes quitarte el rol de administrador ni desactivar tu propia cuenta.');
    }
    const perfil = must(await db().from('perfiles').update(cambios).eq('id', id).select('*').maybeSingle(), 'actualizar el usuario');
    if (!perfil) throw new HttpError(404, 'Usuario no encontrado.');
    res.json(perfil);
  })
);

// ------------------------------------------------------------------------------
// Estado del sistema y trazabilidad (solo administrador)
// ------------------------------------------------------------------------------
export async function estadoSupabase() {
  if (!isDbConfigured()) return { ok: false, detalle: 'Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.' };
  const { error } = await db().from('productos').select('id', { head: true, count: 'exact' });
  return error
    ? { ok: false, detalle: `Conectado, pero el esquema no responde: ${error.message}. ¿Ejecutaste las migraciones?` }
    : { ok: true, detalle: 'Base de datos y esquema COLORLINK disponibles.' };
}

panelRouter.get(
  '/panel/sistema',
  requireRole('administrador'),
  handler(async (_req, res) => {
    const [supabase, correos, conversaciones] = await Promise.all([
      estadoSupabase(),
      db().from('correos_enviados').select('*').order('created_at', { ascending: false }).limit(40),
      db().from('conversaciones_ia').select('*').order('created_at', { ascending: false }).limit(40),
    ]);
    res.json({
      estado: { supabase, gemini: geminiStatus(), correo: emailStatus() },
      correos: correos.data || [],
      conversaciones: conversaciones.data || [],
    });
  })
);
