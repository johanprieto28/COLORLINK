import { Router } from 'express';
import { handler, HttpError } from './http';
import { db } from './supabase';

/**
 * Catálogo de ciudades (public.ciudades). Los formularios solo aceptan ciudades
 * de esta lista; el servidor guarda siempre el nombre oficial ("Bogotá D.C.").
 */
export interface Ciudad {
  nombre: string;
  departamento: string;
}

const CACHE_MS = 5 * 60_000;
let cache: { ciudades: Ciudad[]; hasta: number } | null = null;

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\bd\.?\s*c\.?$/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export async function listarCiudades(): Promise<Ciudad[]> {
  if (cache && cache.hasta > Date.now()) return cache.ciudades;
  const { data, error } = await db()
    .from('ciudades')
    .select('nombre, departamento')
    .eq('activo', true)
    .order('nombre');
  if (error) {
    // Sin la migración 010 no hay catálogo: se sigue aceptando texto libre
    console.warn('[ciudades] No se pudo leer el catálogo:', error.message);
    return [];
  }
  cache = { ciudades: data as Ciudad[], hasta: Date.now() + CACHE_MS };
  return cache.ciudades;
}

/** Devuelve el nombre oficial de la ciudad o lanza 400 si no está en el catálogo */
export async function ciudad(value: unknown, opts: { required?: boolean } = {}): Promise<string | null> {
  const texto = String(value ?? '').trim();
  if (!texto) {
    if (opts.required) throw new HttpError(400, 'Selecciona la ciudad de la lista.');
    return null;
  }
  const ciudades = await listarCiudades();
  if (ciudades.length === 0) return texto.slice(0, 80);
  const buscada = normalizar(texto);
  const encontrada = ciudades.find((c) => normalizar(c.nombre) === buscada);
  if (!encontrada) throw new HttpError(400, `"${texto.slice(0, 40)}" no está en la lista de ciudades. Selecciónala de la lista.`);
  return encontrada.nombre;
}

export const ciudadesRouter = Router();

// GET /api/ciudades → catálogo público para los selectores
ciudadesRouter.get(
  '/ciudades',
  handler(async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json(await listarCiudades());
  })
);
