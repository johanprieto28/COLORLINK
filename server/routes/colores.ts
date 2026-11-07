import { Router } from 'express';
import {
  disponibilidad,
  galonesEstimados,
  MAX_COLORES_PROYECTO,
  type ColorCatalogo,
  type ColorInventario,
  type FamiliaColor,
} from '../../src/data/colores';
import { currentUser, requireRole, requireStaff } from '../auth';
import { handler, HttpError, num, oneOf, text } from '../http';
import { db, must } from '../supabase';

export const coloresRouter = Router();

/** Estados en los que un proyecto ya pidió color pero todavía no se descontó del stock */
const ESTADOS_COMPROMETIDOS = ['RECIBIDO', 'EN_ANALISIS', 'VALIDACION_TECNICA', 'SOLUCION_GENERADA', 'COTIZACION'];

interface FilaColor {
  id: string;
  nombre: string;
  hex: string;
  familia: FamiliaColor;
  stock_galones: number;
  stock_minimo: number;
  activo: boolean;
}

async function leerColores(soloActivos: boolean): Promise<FilaColor[]> {
  let query = db().from('colores').select('id, nombre, hex, familia, stock_galones, stock_minimo, activo').order('orden');
  if (soloActivos) query = query.eq('activo', true);
  return (must(await query, 'consultar los colores') as FilaColor[]).map((c) => ({
    ...c,
    stock_galones: Number(c.stock_galones),
    stock_minimo: Number(c.stock_minimo),
  }));
}

/**
 * Valida los colores elegidos para un proyecto: máximo 2, sin repetir y del catálogo activo.
 * Devuelve los colores en el orden elegido (el primero es el principal).
 */
export async function validarColoresProyecto(raw: unknown): Promise<FilaColor[]> {
  if (raw === undefined || raw === null || raw === '') return [];
  if (!Array.isArray(raw)) throw new HttpError(400, 'Los colores del proyecto no son válidos.');
  const ids = [...new Set(raw.map((x) => String(x).trim()).filter(Boolean))];
  if (ids.length > MAX_COLORES_PROYECTO) {
    throw new HttpError(400, `Puedes elegir máximo ${MAX_COLORES_PROYECTO} colores por proyecto.`);
  }
  if (ids.length === 0) return [];
  const catalogo = await leerColores(true);
  return ids.map((id) => {
    const color = catalogo.find((c) => c.id === id);
    if (!color) throw new HttpError(400, 'Uno de los colores elegidos ya no está disponible. Elige otro.');
    return color;
  });
}

// GET /api/colores → catálogo para el cliente (disponibilidad, sin cantidades exactas)
coloresRouter.get(
  '/colores',
  handler(async (_req, res) => {
    const colores: ColorCatalogo[] = (await leerColores(true)).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      hex: c.hex,
      familia: c.familia,
      disponibilidad: disponibilidad(c.stock_galones, c.stock_minimo),
    }));
    res.set('Cache-Control', 'no-store');
    res.json(colores);
  })
);

// GET /api/panel/colores → stock, mínimo y galones comprometidos en proyectos activos
coloresRouter.get(
  '/panel/colores',
  requireStaff,
  handler(async (_req, res) => {
    const [colores, areas] = await Promise.all([
      leerColores(false),
      db()
        .from('areas_proyecto')
        .select('area_m2, colores, proyectos!inner(estado)')
        .in('proyectos.estado', ESTADOS_COMPROMETIDOS)
        .neq('colores', '{}'),
    ]);
    const filas = must(areas, 'calcular los colores comprometidos') as Array<{ area_m2: number; colores: string[] }>;

    const comprometido = new Map<string, { galones: number; proyectos: number }>();
    for (const area of filas) {
      const galones = galonesEstimados(Number(area.area_m2), area.colores.length);
      area.colores.slice(0, galones.length).forEach((id, i) => {
        const actual = comprometido.get(id) || { galones: 0, proyectos: 0 };
        comprometido.set(id, { galones: actual.galones + galones[i], proyectos: actual.proyectos + 1 });
      });
    }

    const inventario: ColorInventario[] = colores.map((c) => ({
      ...c,
      disponibilidad: disponibilidad(c.stock_galones, c.stock_minimo),
      comprometido_galones: comprometido.get(c.id)?.galones || 0,
      proyectos_activos: comprometido.get(c.id)?.proyectos || 0,
    }));
    res.json(inventario);
  })
);

// GET /api/panel/colores/:id/movimientos → últimos movimientos del color
coloresRouter.get(
  '/panel/colores/:id/movimientos',
  requireStaff,
  handler(async (req, res) => {
    const movimientos = must(
      await db()
        .from('movimientos_color')
        .select('id, color_id, tipo, cantidad, stock_resultante, motivo, referencia, created_at')
        .eq('color_id', String(req.params.id))
        .order('created_at', { ascending: false })
        .limit(30),
      'consultar los movimientos del color'
    );
    res.json(movimientos);
  })
);

// POST /api/panel/colores/:id/ajuste { tipo, cantidad, motivo } → entrada, salida o ajuste de inventario
coloresRouter.post(
  '/panel/colores/:id/ajuste',
  requireRole('operaciones'),
  handler(async (req, res) => {
    const b = req.body || {};
    const tipo = oneOf(b.tipo, ['ENTRADA', 'SALIDA', 'AJUSTE'] as const, 'tipo de movimiento');
    const cantidad = num(b.cantidad, 'cantidad', { min: tipo === 'AJUSTE' ? 0 : 0.5, max: 10_000 });
    const motivo = text(b.motivo, 'motivo', { required: true, min: 3, max: 200 });
    must(
      await db().rpc('ajustar_stock_color', {
        p_color: String(req.params.id),
        p_tipo: tipo,
        p_cantidad: cantidad,
        p_motivo: motivo,
        p_referencia: null,
        p_usuario: currentUser(req).id,
      }),
      'ajustar el stock del color'
    );
    res.json({ ok: true });
  })
);

// PATCH /api/panel/colores/:id { stock_minimo?, activo? }
coloresRouter.patch(
  '/panel/colores/:id',
  requireRole('operaciones'),
  handler(async (req, res) => {
    const b = req.body || {};
    const cambios: Record<string, unknown> = {};
    if (b.stock_minimo !== undefined) cambios.stock_minimo = num(b.stock_minimo, 'stock mínimo', { min: 0, max: 10_000 });
    if (b.activo !== undefined) cambios.activo = Boolean(b.activo);
    if (!Object.keys(cambios).length) throw new HttpError(400, 'No hay cambios para guardar.');
    must(await db().from('colores').update(cambios).eq('id', String(req.params.id)), 'actualizar el color');
    res.json({ ok: true });
  })
);
