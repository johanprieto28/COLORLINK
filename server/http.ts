import type { NextFunction, Request, Response, RequestHandler } from 'express';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/** Envuelve un handler async para que los errores lleguen al middleware de errores */
export function handler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof SyntaxError && 'body' in (err as any)) {
    res.status(400).json({ error: 'El cuerpo de la solicitud no es JSON válido.' });
    return;
  }
  if ((err as any)?.type === 'entity.too.large') {
    res.status(413).json({ error: 'El archivo o la solicitud supera el tamaño permitido.' });
    return;
  }
  console.error('[api] Error no controlado:', err);
  res.status(500).json({ error: 'Ocurrió un error inesperado en el servidor.' });
}

// ------------------------------------------------------------------------------
// Validación de entrada (sin dependencias externas)
// ------------------------------------------------------------------------------

export function text(
  value: unknown,
  field: string,
  opts: { required?: boolean; max?: number; min?: number } = {}
): string {
  const { required = false, max = 500, min = 0 } = opts;
  const clean = String(value ?? '').trim();
  if (required && !clean) throw new HttpError(400, `El campo "${field}" es obligatorio.`);
  if (clean && clean.length < min) {
    throw new HttpError(400, `El campo "${field}" debe tener al menos ${min} caracteres.`);
  }
  if (clean.length > max) throw new HttpError(400, `El campo "${field}" supera ${max} caracteres.`);
  return clean;
}

/** Lanza 400 con el mensaje de un validador de src/data/reglasRegistro.ts (si hay error) */
export function revisar(error: string | null): void {
  if (error) throw new HttpError(400, error);
}

export function optionalText(value: unknown, field: string, max = 500): string | null {
  const clean = text(value, field, { max });
  return clean || null;
}

export function email(value: unknown, field = 'correo'): string {
  const clean = text(value, field, { required: true, max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) {
    throw new HttpError(400, `El ${field} no tiene un formato válido.`);
  }
  return clean;
}

export function phone(value: unknown, field = 'teléfono'): string {
  const clean = text(value, field, { required: true, max: 30 });
  if ((clean.match(/\d/g) || []).length < 7) {
    throw new HttpError(400, `El ${field} debe tener al menos 7 dígitos.`);
  }
  return clean;
}

export function num(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number; integer?: boolean; required?: boolean } = {}
): number {
  const { min = -Infinity, max = Infinity, integer = false, required = true } = opts;
  if ((value === undefined || value === null || value === '') && !required) return NaN;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new HttpError(400, `El campo "${field}" debe ser numérico.`);
  if (integer && !Number.isInteger(n)) throw new HttpError(400, `El campo "${field}" debe ser entero.`);
  if (n < min || n > max) throw new HttpError(400, `El campo "${field}" debe estar entre ${min} y ${max}.`);
  return n;
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string, fallback?: T): T {
  const clean = String(value ?? '').trim().toUpperCase() as T;
  if (allowed.includes(clean)) return clean;
  if (fallback !== undefined && (value === undefined || value === null || value === '')) return fallback;
  throw new HttpError(400, `Valor no válido para "${field}".`);
}

export function bool(value: unknown): boolean {
  return value === true || value === 'true' || value === 1;
}

export function isoDate(value: unknown, field: string, required = false): string | null {
  const clean = String(value ?? '').trim();
  if (!clean) {
    if (required) throw new HttpError(400, `El campo "${field}" es obligatorio.`);
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean) || Number.isNaN(Date.parse(clean))) {
    throw new HttpError(400, `El campo "${field}" debe ser una fecha AAAA-MM-DD.`);
  }
  return clean;
}

export function uuid(value: unknown, field = 'id'): string {
  const clean = String(value ?? '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
    throw new HttpError(400, `Identificador "${field}" no válido.`);
  }
  return clean;
}

/** Limitador simple en memoria por clave (IP o usuario) */
export function rateLimit(opts: { windowMs: number; max: number; message: string }): RequestHandler {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req, res, next) => {
    const key = (req as any).user?.id || req.ip || 'anon';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + opts.windowMs });
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
      }
      return next();
    }
    entry.count += 1;
    if (entry.count > opts.max) {
      res.status(429).json({ error: opts.message });
      return;
    }
    next();
  };
}
