import {
  SUPABASE_URL,
  HAS_VALID_SUPABASE_ENV,
  testSupabaseConnection,
} from '../supabase';

export * from '../supabase';
export { supabase, testSupabaseConnection } from '../supabase';

export const PROJECT_ID = SUPABASE_URL
  ? SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0]
  : '';

export const isSupabaseConfigured = HAS_VALID_SUPABASE_ENV;

export async function checkSupabaseConnection() {
  const res = await testSupabaseConnection();
  const detailedError =
    res.connectionError || res.clienteError || res.proyectoError || undefined;

  const baseSuccessMsg = `Conectado exitosamente a Supabase (${res.clienteCount ?? 0} clientes, ${res.proyectoCount ?? 0} proyectos).`;
  const message = res.connected
    ? res.frontendKeyWarning
      ? `${baseSuccessMsg} Nota: actualiza VITE_SUPABASE_PUBLISHABLE_KEY sin traducción automática para habilitar Auth/Storage directo en navegador.`
      : baseSuccessMsg
    : `Error de conexión: ${detailedError || 'No autorizado'}`;

  return {
    connected: res.connected,
    message,
    error: detailedError,
  };
}
