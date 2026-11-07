import type { NextFunction, Request, Response } from 'express';
import type { UserProfile, UserRole } from '../src/types';
import { db, isDbConfigured } from './supabase';
import { HttpError } from './http';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserProfile;
    }
  }
}

const STAFF_ROLES: UserRole[] = ['tecnico', 'comercial', 'operaciones', 'administrador'];

export function isStaff(user?: UserProfile): boolean {
  return Boolean(user && STAFF_ROLES.includes(user.rol));
}

/**
 * Lee el JWT de Supabase Auth (Authorization: Bearer ...), lo valida contra Supabase
 * y carga el perfil con su rol desde public.perfiles. Nunca confía en un rol enviado
 * por el navegador.
 */
async function resolveUser(req: Request): Promise<UserProfile | undefined> {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || !isDbConfigured()) return undefined;

  const { data, error } = await db().auth.getUser(token);
  if (error || !data?.user) return undefined;

  const { data: perfil } = await db().from('perfiles').select('*').eq('id', data.user.id).maybeSingle();

  if (perfil) {
    if (!perfil.activo) throw new HttpError(403, 'Tu cuenta está desactivada. Contacta a COLORLINK.');
    return perfil as UserProfile;
  }

  // Respaldo: si el trigger handle_new_user no creó el perfil, se crea aquí como cliente
  const meta = data.user.user_metadata || {};
  const { data: creado, error: insertErr } = await db()
    .from('perfiles')
    .upsert(
      {
        id: data.user.id,
        email: (data.user.email || '').toLowerCase(),
        nombre_completo: meta.nombre_completo || (data.user.email || '').split('@')[0],
        telefono: meta.telefono || null,
        empresa: meta.empresa || null,
        rol: 'cliente',
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();
  if (insertErr) {
    console.error('[auth] No se pudo crear el perfil:', insertErr.message);
    return undefined;
  }
  return creado as UserProfile;
}

/** Adjunta req.user si hay sesión válida; no exige autenticación */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    req.user = await resolveUser(req);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, 'Debes iniciar sesión para continuar.'));
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, 'Debes iniciar sesión para continuar.'));
    if (req.user.rol !== 'administrador' && !roles.includes(req.user.rol)) {
      return next(new HttpError(403, 'Tu rol no tiene permiso para esta acción.'));
    }
    next();
  };
}

export const requireStaff = requireRole('tecnico', 'comercial', 'operaciones', 'administrador');

export function currentUser(req: Request): UserProfile {
  if (!req.user) throw new HttpError(401, 'Debes iniciar sesión para continuar.');
  return req.user;
}
