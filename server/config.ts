import dotenv from 'dotenv';

dotenv.config();

function cleanEnv(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
}

/** Trata como vacío cualquier valor de ejemplo (MY_..., YOUR_..., TU_...) */
function env(name: string): string {
  const value = cleanEnv(process.env[name]);
  const upper = value.toUpperCase();
  if (
    !value ||
    upper === 'UNDEFINED' ||
    upper === 'NULL' ||
    upper.startsWith('MY_') ||
    upper.startsWith('YOUR_') ||
    upper.startsWith('TU_') ||
    upper.includes('<TU_')
  ) {
    return '';
  }
  return value;
}

function normalizeSupabaseUrl(raw: string): string {
  if (!raw) return '';
  if (/^[a-z0-9]{15,30}$/i.test(raw)) return `https://${raw}.supabase.co`;
  try {
    const parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return parsed.origin;
  } catch {
    return '';
  }
}

export const config = {
  port: Number(env('PORT')) || 3000,
  // `npm start` pasa --production para no depender de NODE_ENV (la sintaxis cambia entre Windows y Linux)
  isProduction: process.env.NODE_ENV === 'production' || process.argv.includes('--production'),
  appUrl: env('APP_URL') || 'http://localhost:3000',

  supabaseUrl: normalizeSupabaseUrl(env('SUPABASE_URL') || env('VITE_SUPABASE_URL')),
  supabaseServiceKey: env('SUPABASE_SERVICE_ROLE_KEY').replace(/\s+/g, ''),
  /** Clave pública: se entrega al navegador en /api/config para iniciar sesión */
  supabasePublishableKey: (env('SUPABASE_PUBLISHABLE_KEY') || env('VITE_SUPABASE_PUBLISHABLE_KEY')).replace(/\s+/g, ''),

  geminiApiKey: env('GEMINI_API_KEY'),
  // Modelo que usaba la versión generada en AI Studio; configurable sin tocar código
  geminiModel: env('GEMINI_MODEL') || 'gemini-3.5-flash',
  /** Se usa si el modelo principal falla (503 por alta demanda) o no responde a tiempo */
  geminiFallbackModel: env('GEMINI_FALLBACK_MODEL') || 'gemini-3.5-flash-lite',
  /** Tiempo máximo por intento antes de pasar al respaldo o a las respuestas básicas */
  geminiTimeoutMs: Number(env('GEMINI_TIMEOUT_MS')) || 15000,

  /** Proveedor de correo: 'gmail', 'resend' o vacío para solo registrar en BD */
  emailProvider:
    env('EMAIL_PROVIDER').toLowerCase() ||
    (env('GMAIL_APP_PASSWORD') ? 'gmail' : env('RESEND_API_KEY') ? 'resend' : ''),
  resendApiKey: env('RESEND_API_KEY'),
  /** Gmail / Google Workspace: cuenta y contraseña de aplicación (no la contraseña normal) */
  gmailUser: env('GMAIL_USER'),
  gmailAppPassword: env('GMAIL_APP_PASSWORD').replace(/\s+/g, ''),
  emailFrom:
    env('EMAIL_FROM') || (env('GMAIL_USER') ? `COLORLINK <${env('GMAIL_USER')}>` : 'COLORLINK <no-responder@colorlink.com>'),
  /** Correo del equipo interno que recibe avisos de nuevos proyectos y pedidos */
  emailNotificacionesInternas: env('EMAIL_NOTIFICACIONES_INTERNAS'),

  /** Texto con los datos bancarios que se envía en pedidos por transferencia */
  datosTransferencia:
    env('DATOS_TRANSFERENCIA') ||
    'Nuestro equipo te contactará con los datos bancarios para completar la transferencia.',

  /** Envío gratis a partir de este subtotal (COP) */
  envioGratisDesde: Number(env('ENVIO_GRATIS_DESDE')) || 300000,
  costoEnvio: Number(env('COSTO_ENVIO')) || 15000,
};

/** Rol declarado dentro de una clave JWT de Supabase ('anon', 'service_role'…); null si no es JWT */
function jwtRole(key: string): string | null {
  try {
    return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role ?? null;
  } catch {
    return null;
  }
}

// El servidor necesita la clave secreta: con la pública (anon) RLS bloquearía todas las escrituras en silencio
const serviceKeyIsPublic =
  config.supabaseServiceKey.startsWith('sb_publishable_') || jwtRole(config.supabaseServiceKey) === 'anon';
if (serviceKeyIsPublic) {
  console.warn(
    '[config] SUPABASE_SERVICE_ROLE_KEY contiene la clave PÚBLICA (anon). Usa la clave "service_role" / "secret" ' +
      '(Supabase → Project Settings → API Keys). La pública va en VITE_SUPABASE_PUBLISHABLE_KEY.'
  );
}

export const missingConfig: string[] = [
  !config.supabaseUrl && 'SUPABASE_URL',
  (!config.supabaseServiceKey || serviceKeyIsPublic) && 'SUPABASE_SERVICE_ROLE_KEY',
].filter(Boolean) as string[];
