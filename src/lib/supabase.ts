import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase del navegador. Solo se usa para la sesión (Supabase Auth);
 * los datos se leen y escriben a través del backend (/api), que valida el rol.
 *
 * La URL y la clave pública llegan del servidor (/api/config) al arrancar, así el
 * mismo build funciona en cualquier entorno: basta con configurar las variables
 * del servidor (SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_PUBLISHABLE_KEY).
 */
let clientPromise: Promise<SupabaseClient | null> | null = null;

async function init(): Promise<SupabaseClient | null> {
  try {
    const res = await fetch('/api/config');
    const cfg = (await res.json()) as { supabaseUrl?: string; supabasePublishableKey?: string };
    if (!cfg.supabaseUrl || !cfg.supabasePublishableKey) {
      console.warn('[auth] El servidor no tiene configurada la clave pública de Supabase: el inicio de sesión no estará disponible.');
      return null;
    }
    return createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  } catch (err) {
    console.warn('[auth] No se pudo leer la configuración del servidor:', err);
    return null;
  }
}

export function getSupabase(): Promise<SupabaseClient | null> {
  clientPromise ??= init();
  return clientPromise;
}
