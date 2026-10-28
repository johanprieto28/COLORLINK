import { createClient, SupabaseClient } from '@supabase/supabase-js';

function cleanEnvValue(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function isPlaceholder(val: string): boolean {
  if (!val) return true;
  const upper = val.toUpperCase();
  return (
    upper === 'UNDEFINED' ||
    upper === 'NULL' ||
    upper.startsWith('MY_') ||
    upper.startsWith('YOUR_') ||
    upper.includes('YOUR_SUPABASE')
  );
}

interface ResolvedSupabaseConfig {
  url: string;
  publishableKey: string;
  rawEnvUrl: string;
  urlNormalizedFromProjectId: boolean;
  configError: string | null;
  keyFormatNotice: string | null;
  hasValidBrowserKey: boolean;
}

function resolveSupabaseConfig(): ResolvedSupabaseConfig {
  const rawEnvUrl = cleanEnvValue(import.meta.env.VITE_SUPABASE_URL);
  const rawKey = cleanEnvValue(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

  let url = '';
  let urlNormalizedFromProjectId = false;
  const errors: string[] = [];
  let keyFormatNotice: string | null = null;
  let hasValidBrowserKey = false;

  // 1. Validate & resolve VITE_SUPABASE_URL strictly from environment (no invented fallback URL)
  if (isPlaceholder(rawEnvUrl)) {
    errors.push('La variable de entorno VITE_SUPABASE_URL no está configurada.');
  } else {
    try {
      const parsed = new URL(rawEnvUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        url = parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname);
      } else {
        errors.push(
          `VITE_SUPABASE_URL tiene un protocolo inválido (${parsed.protocol}). Debe usar https://.`
        );
      }
    } catch {
      if (rawEnvUrl.includes('.supabase.co')) {
        try {
          const parsed = new URL(`https://${rawEnvUrl}`);
          url = parsed.origin;
          urlNormalizedFromProjectId = true;
        } catch {
          errors.push(`VITE_SUPABASE_URL no es una URL válida: "${rawEnvUrl}".`);
        }
      } else if (/^[a-z0-9]{15,30}$/i.test(rawEnvUrl)) {
        // Environment variable contains the bare Supabase Project ID
        url = `https://${rawEnvUrl}.supabase.co`;
        urlNormalizedFromProjectId = true;
      } else {
        errors.push(`VITE_SUPABASE_URL no es una URL HTTP/HTTPS válida: "${rawEnvUrl}".`);
      }
    }
  }

  // 2. Validate & resolve VITE_SUPABASE_PUBLISHABLE_KEY strictly from environment (no fallback key, no secret/service_role)
  let publishableKey = '';
  if (isPlaceholder(rawKey)) {
    errors.push('La variable de entorno VITE_SUPABASE_PUBLISHABLE_KEY no está configurada.');
  } else if (rawKey.startsWith('sb_secret_') || rawKey.toLowerCase().includes('service_role')) {
    errors.push(
      'Seguridad bloqueada: VITE_SUPABASE_PUBLISHABLE_KEY contiene una clave secreta o service_role. En el frontend solo se permite la clave pública (sb_publishable_... o anon JWT).'
    );
  } else if (rawKey.startsWith('sb_publicable_')) {
    publishableKey = rawKey;
    hasValidBrowserKey = false;
    keyFormatNotice =
      'VITE_SUPABASE_PUBLISHABLE_KEY comienza con "sb_publicable_" (alterada por traducción automática del navegador al copiarla del panel de Supabase). Debe actualizarse con la clave original sin traducir ("sb_publishable_..." o anon JWT "eyJ...") para habilitar Supabase Auth/Storage directo en el navegador.';
  } else if (rawKey.startsWith('sb_publishable_') || rawKey.startsWith('eyJ')) {
    publishableKey = rawKey;
    hasValidBrowserKey = true;
  } else {
    publishableKey = rawKey;
    hasValidBrowserKey = false;
    keyFormatNotice =
      'Formato de VITE_SUPABASE_PUBLISHABLE_KEY no reconocido (se esperaba "sb_publishable_..." o anon JWT "eyJ...").';
  }

  return {
    url,
    publishableKey,
    rawEnvUrl,
    urlNormalizedFromProjectId,
    configError: errors.length > 0 ? errors.join(' ') : null,
    keyFormatNotice,
    hasValidBrowserKey,
  };
}

const resolvedConfig = resolveSupabaseConfig();

export const SUPABASE_URL = resolvedConfig.url;
export const SUPABASE_PUBLISHABLE_KEY = resolvedConfig.publishableKey;
export const SUPABASE_CONFIG_ERROR = resolvedConfig.configError;
export const SUPABASE_KEY_FORMAT_NOTICE = resolvedConfig.keyFormatNotice;
export const SUPABASE_URL_NORMALIZED = resolvedConfig.urlNormalizedFromProjectId;
export const HAS_VALID_BROWSER_SUPABASE_KEY = Boolean(
  SUPABASE_URL && resolvedConfig.hasValidBrowserKey && !SUPABASE_CONFIG_ERROR
);
export const HAS_VALID_SUPABASE_ENV = HAS_VALID_BROWSER_SUPABASE_KEY;

function initSupabaseClient(): SupabaseClient {
  if (!HAS_VALID_BROWSER_SUPABASE_KEY) {
    // Prevent sending invalid API key requests directly from browser when key is missing or browser-translated,
    // while backend endpoints (/api/supabase/*) handle DB persistence securely.
    return createClient('https://invalid.supabase.local', 'missing-or-invalid-browser-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase: SupabaseClient = initSupabaseClient();

export function formatSupabaseError(err: any, httpStatus?: number | null): string {
  if (!err) return 'Error desconocido devuelto por Supabase';
  if (typeof err === 'string') return err;

  const parts: string[] = [];
  const statusOrCode = [
    httpStatus ? `HTTP ${httpStatus}` : null,
    err.code ? `Código ${err.code}` : null,
  ]
    .filter(Boolean)
    .join(' / ');

  if (statusOrCode) {
    parts.push(`[${statusOrCode}]`);
  }

  if (err.message) {
    parts.push(err.message);
  } else {
    parts.push(JSON.stringify(err));
  }

  if (err.details) {
    parts.push(`Detalle: ${err.details}`);
  }
  if (err.hint) {
    parts.push(`Sugerencia: ${err.hint}`);
  }
  if (
    SUPABASE_KEY_FORMAT_NOTICE &&
    (httpStatus === 401 || String(err.message || '').toLowerCase().includes('invalid api key'))
  ) {
    parts.push(`Causa detectada en variable: ${SUPABASE_KEY_FORMAT_NOTICE}`);
  }

  return parts.join(' — ');
}

async function getOptionalAuthHeader(): Promise<Record<string, string>> {
  if (!HAS_VALID_BROWSER_SUPABASE_KEY) return {};
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export interface SupabaseDiagnosticResult {
  connected: boolean;
  connectionStatus: 'OK' | 'ERROR';
  connectionError: string | null;
  frontendKeyWarning: string | null;
  channelMode: 'SERVER_API' | 'BROWSER_DIRECT' | 'ERROR';
  authStatus: 'AUTENTICADO' | 'ANONIMO' | 'ERROR';
  authEmail: string | null;
  authError: string | null;
  clienteStatus: 'OK' | 'ERROR';
  proyectoStatus: 'OK' | 'ERROR';
  clienteCount: number | null;
  proyectoCount: number | null;
  clienteError: string | null;
  proyectoError: string | null;
  clienteData: any[] | null;
  proyectoData: any[] | null;
  rawEnvUrl: string;
  testedAt: string;
}

/**
 * Real diagnostic check that verifies:
 * 1) Server-side persistence gateway (/api/supabase/health) against public.cliente & public.proyecto
 * 2) Browser-side VITE_SUPABASE_PUBLISHABLE_KEY format & Supabase Auth session state
 * Never uses mock data to report CONECTADO.
 */
export async function testSupabaseConnection(): Promise<SupabaseDiagnosticResult> {
  const timestamp = new Date().toISOString();
  const frontendKeyWarning = SUPABASE_CONFIG_ERROR || SUPABASE_KEY_FORMAT_NOTICE || null;

  let authStatus: 'AUTENTICADO' | 'ANONIMO' | 'ERROR' = 'ANONIMO';
  let authEmail: string | null = null;
  let authError: string | null = null;

  if (HAS_VALID_BROWSER_SUPABASE_KEY) {
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        authStatus = 'ERROR';
        authError = formatSupabaseError(sessionErr);
      } else if (sessionData?.session?.user) {
        authStatus = 'AUTENTICADO';
        authEmail = sessionData.session.user.email || sessionData.session.user.id;
      } else {
        authStatus = 'ANONIMO';
      }
    } catch (err: any) {
      authStatus = 'ERROR';
      authError = formatSupabaseError(err);
    }
  }

  // Primary verification: Server-side Supabase gateway (/api/supabase/health)
  try {
    const serverRes = await fetch('/api/supabase/health');
    if (serverRes.ok) {
      const health = await serverRes.json();
      const connectionStatus: 'OK' | 'ERROR' = health.gatewayStatus === 'OK' ? 'OK' : 'ERROR';
      const clienteStatus: 'OK' | 'ERROR' = health.clienteStatus === 'OK' ? 'OK' : 'ERROR';
      const proyectoStatus: 'OK' | 'ERROR' = health.proyectoStatus === 'OK' ? 'OK' : 'ERROR';
      const connected =
        connectionStatus === 'OK' && clienteStatus === 'OK' && proyectoStatus === 'OK';

      return {
        connected,
        connectionStatus,
        connectionError: health.gatewayError || (!connected ? health.error : null),
        frontendKeyWarning,
        channelMode: connected ? 'SERVER_API' : 'ERROR',
        authStatus,
        authEmail,
        authError,
        clienteStatus,
        proyectoStatus,
        clienteCount: health.clienteCount ?? null,
        proyectoCount: health.proyectoCount ?? null,
        clienteError: health.clienteError || null,
        proyectoError: health.proyectoError || null,
        clienteData: null,
        proyectoData: null,
        rawEnvUrl: resolvedConfig.rawEnvUrl,
        testedAt: timestamp,
      };
    }
  } catch {
    // Fallback to browser-direct verification if server endpoint is unavailable
  }

  if (!HAS_VALID_BROWSER_SUPABASE_KEY) {
    const cfgErr =
      frontendKeyWarning || 'Variables de entorno de Supabase incompletas en el navegador.';
    return {
      connected: false,
      connectionStatus: 'ERROR',
      connectionError: cfgErr,
      frontendKeyWarning,
      channelMode: 'ERROR',
      authStatus: 'ERROR',
      authEmail: null,
      authError: cfgErr,
      clienteStatus: 'ERROR',
      proyectoStatus: 'ERROR',
      clienteCount: null,
      proyectoCount: null,
      clienteError: cfgErr,
      proyectoError: cfgErr,
      clienteData: null,
      proyectoData: null,
      rawEnvUrl: resolvedConfig.rawEnvUrl,
      testedAt: timestamp,
    };
  }

  let connectionStatus: 'OK' | 'ERROR' = 'ERROR';
  let connectionError: string | null = null;
  let clienteStatus: 'OK' | 'ERROR' = 'ERROR';
  let proyectoStatus: 'OK' | 'ERROR' = 'ERROR';
  let clienteError: string | null = null;
  let proyectoError: string | null = null;
  let clienteCount: number | null = null;
  let proyectoCount: number | null = null;
  let clienteData: any[] | null = null;
  let proyectoData: any[] | null = null;

  try {
    const gwRes = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      method: 'GET',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
    });
    if (gwRes.ok) {
      connectionStatus = 'OK';
    } else {
      const bodyObj = await gwRes.json().catch(() => ({ message: gwRes.statusText }));
      connectionError = formatSupabaseError(bodyObj, gwRes.status);
    }
  } catch (err: any) {
    connectionError = formatSupabaseError(err);
  }

  try {
    const { data: cData, error: cErr, count: cCnt, status: cStatus } = await supabase
      .from('cliente')
      .select('*', { count: 'exact' });
    if (cErr) {
      clienteError = formatSupabaseError(cErr, cStatus);
    } else {
      clienteStatus = 'OK';
      clienteData = cData || [];
      clienteCount = cCnt !== null ? cCnt : (cData ? cData.length : 0);
    }
  } catch (err: any) {
    clienteError = formatSupabaseError(err);
  }

  try {
    const { data: pData, error: pErr, count: pCnt, status: pStatus } = await supabase
      .from('proyecto')
      .select('*', { count: 'exact' });
    if (pErr) {
      proyectoError = formatSupabaseError(pErr, pStatus);
    } else {
      proyectoStatus = 'OK';
      proyectoData = pData || [];
      proyectoCount = pCnt !== null ? pCnt : (pData ? pData.length : 0);
    }
  } catch (err: any) {
    proyectoError = formatSupabaseError(err);
  }

  const connected =
    connectionStatus === 'OK' && clienteStatus === 'OK' && proyectoStatus === 'OK';

  return {
    connected,
    connectionStatus,
    connectionError,
    frontendKeyWarning,
    channelMode: connected ? 'BROWSER_DIRECT' : 'ERROR',
    authStatus,
    authEmail,
    authError,
    clienteStatus,
    proyectoStatus,
    clienteCount,
    proyectoCount,
    clienteError,
    proyectoError,
    clienteData,
    proyectoData,
    rawEnvUrl: resolvedConfig.rawEnvUrl,
    testedAt: timestamp,
  };
}

/**
 * Fetch real clients from public.cliente via server API (preserving RLS) with direct fallback
 */
export async function fetchClientesFromSupabase(): Promise<{
  data: any[] | null;
  error: any;
  errorMessage: string | null;
}> {
  try {
    const authHeaders = await getOptionalAuthHeader();
    const apiRes = await fetch('/api/supabase/clientes', {
      headers: { ...authHeaders },
    });
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json.success) {
        return { data: json.data || [], error: null, errorMessage: null };
      }
      return {
        data: null,
        error: new Error(json.error || 'Error al consultar public.cliente'),
        errorMessage: json.error || 'Error al consultar public.cliente',
      };
    }
    if (apiRes.status !== 404) {
      const errJson = await apiRes.json().catch(() => null);
      const msg = errJson?.error || `Error HTTP ${apiRes.status} al consultar public.cliente`;
      return { data: null, error: new Error(msg), errorMessage: msg };
    }
  } catch {
    // Fallback below if /api/supabase/clientes is not reachable
  }

  if (!HAS_VALID_BROWSER_SUPABASE_KEY) {
    const msg =
      SUPABASE_CONFIG_ERROR ||
      SUPABASE_KEY_FORMAT_NOTICE ||
      'Configuración de Supabase incompleta en variables de entorno.';
    return { data: null, error: new Error(msg), errorMessage: msg };
  }

  try {
    const { data, error, status } = await supabase
      .from('cliente')
      .select('*')
      .order('created_at', { ascending: false });

    return {
      data,
      error,
      errorMessage: error ? formatSupabaseError(error, status) : null,
    };
  } catch (err: any) {
    return { data: null, error: err, errorMessage: formatSupabaseError(err) };
  }
}

/**
 * Fetch real projects from public.proyecto via server API (preserving RLS) with direct fallback
 */
export async function fetchProyectosFromSupabase(): Promise<{
  data: any[] | null;
  error: any;
  errorMessage: string | null;
}> {
  try {
    const authHeaders = await getOptionalAuthHeader();
    const apiRes = await fetch('/api/supabase/proyectos', {
      headers: { ...authHeaders },
    });
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json.success) {
        return { data: json.data || [], error: null, errorMessage: null };
      }
      return {
        data: null,
        error: new Error(json.error || 'Error al consultar public.proyecto'),
        errorMessage: json.error || 'Error al consultar public.proyecto',
      };
    }
    if (apiRes.status !== 404) {
      const errJson = await apiRes.json().catch(() => null);
      const msg = errJson?.error || `Error HTTP ${apiRes.status} al consultar public.proyecto`;
      return { data: null, error: new Error(msg), errorMessage: msg };
    }
  } catch {
    // Fallback below if /api/supabase/proyectos is not reachable
  }

  if (!HAS_VALID_BROWSER_SUPABASE_KEY) {
    const msg =
      SUPABASE_CONFIG_ERROR ||
      SUPABASE_KEY_FORMAT_NOTICE ||
      'Configuración de Supabase incompleta en variables de entorno.';
    return { data: null, error: new Error(msg), errorMessage: msg };
  }

  try {
    const { data, error, status } = await supabase
      .from('proyecto')
      .select('*')
      .order('created_at', { ascending: false });

    return {
      data,
      error,
      errorMessage: error ? formatSupabaseError(error, status) : null,
    };
  } catch (err: any) {
    return { data: null, error: err, errorMessage: formatSupabaseError(err) };
  }
}

/**
 * Insert real records into public.cliente and public.proyecto via server.ts (/api/supabase/proyectos)
 * so RLS stays active without exposing customer PII or secret keys in the browser.
 * Only returns success: true if Supabase confirms both cliente_id and idproyecto.
 */
export async function insertProyectoYClienteInSupabase(params: {
  tipo_cliente: string;
  nombre_completo: string;
  nombre_empresa?: string;
  numero_documento?: string;
  correo_electrónico: string;
  telefono: string;
  ciudad?: string;
  nombre_proyecto: string;
  tipo_obra?: string;
  area_m2?: number;
  fecha_requerida?: string;
  estado?: string;
  descripcion?: string;
  idempotency_key?: string;
}): Promise<{
  success: boolean;
  idproyecto?: number;
  cliente_id?: number;
  error?: string;
}> {
  // Primary channel: Server-side proxy endpoint (/api/supabase/proyectos) in server.ts
  try {
    const authHeaders = await getOptionalAuthHeader();
    const idempotencyHeaders: Record<string, string> = params.idempotency_key
      ? { 'X-Idempotency-Key': params.idempotency_key }
      : {};
    const apiRes = await fetch('/api/supabase/proyectos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...idempotencyHeaders,
      },
      body: JSON.stringify(params),
    });

    if (apiRes.status !== 404) {
      const json = await apiRes.json().catch(() => null);
      if (apiRes.ok && json?.success && json?.idproyecto != null) {
        return {
          success: true,
          idproyecto: Number(json.idproyecto),
          cliente_id: json.cliente_id != null ? Number(json.cliente_id) : undefined,
        };
      }
      return {
        success: false,
        error:
          json?.error ||
          `Error HTTP ${apiRes.status} al registrar cliente y proyecto en el servidor.`,
      };
    }
  } catch {
    // Only fall back to direct browser insert if /api/supabase/proyectos is unreachable
  }

  if (!HAS_VALID_BROWSER_SUPABASE_KEY) {
    return {
      success: false,
      error:
        SUPABASE_CONFIG_ERROR ||
        SUPABASE_KEY_FORMAT_NOTICE ||
        'Configuración de Supabase incompleta en variables de entorno.',
    };
  }

  try {
    let clienteId: number | null = null;
    const cleanEmail = (params.correo_electrónico || '').trim().toLowerCase();

    if (cleanEmail) {
      const { data: existingClients, error: findErr, status: findStatus } = await supabase
        .from('cliente')
        .select('id')
        .ilike('correo_electrónico', cleanEmail.replace(/[\\%_]/g, '\\$&'))
        .limit(1);

      if (findErr) {
        return {
          success: false,
          error: `Error al consultar public.cliente: ${formatSupabaseError(findErr, findStatus)}`,
        };
      }

      if (existingClients && existingClients.length > 0 && existingClients[0].id != null) {
        clienteId = Number(existingClients[0].id);
      }
    }

    if (clienteId === null) {
      const { data: cliData, error: cliError, status: cliStatus } = await supabase
        .from('cliente')
        .insert({
          tipo_cliente: params.tipo_cliente || 'PERSONA_NATURAL',
          nombre_completo: params.nombre_completo || '',
          nombre_empresa: params.nombre_empresa || '',
          numero_documento: params.numero_documento || '',
          correo_electrónico: cleanEmail,
          telefono: params.telefono || '',
          ciudad: params.ciudad || null,
        })
        .select('id');

      if (cliError || !cliData || cliData.length === 0 || cliData[0].id == null) {
        return {
          success: false,
          error: `Error al insertar en public.cliente: ${
            cliError
              ? formatSupabaseError(cliError, cliStatus)
              : 'Supabase no devolvió el id del cliente creado (verifica política RLS de SELECT e INSERT en public.cliente).'
          }`,
        };
      }

      clienteId = Number(cliData[0].id);
    }

    const parsedArea =
      params.area_m2 !== undefined && params.area_m2 !== null && !Number.isNaN(Number(params.area_m2))
        ? Number(params.area_m2)
        : null;
    const validDate =
      params.fecha_requerida && /^\d{4}-\d{2}-\d{2}$/.test(params.fecha_requerida)
        ? params.fecha_requerida
        : null;

    const { data: projData, error: projError, status: projStatus } = await supabase
      .from('proyecto')
      .insert({
        cliente_id: clienteId,
        nombre_proyecto: (params.nombre_proyecto || 'Proyecto COLORLINK').slice(0, 200),
        ciudad: params.ciudad ? params.ciudad.slice(0, 100) : null,
        tipo_obra: params.tipo_obra ? params.tipo_obra.slice(0, 100) : null,
        area_m2: parsedArea,
        fecha_requerida: validDate,
        estado: (params.estado || 'RECIBIDO').slice(0, 50),
        descripcion: params.descripcion || null,
      })
      .select('idproyecto, cliente_id');

    if (projError || !projData || projData.length === 0 || projData[0].idproyecto == null) {
      return {
        success: false,
        error: `Error al insertar en public.proyecto: ${
          projError
            ? formatSupabaseError(projError, projStatus)
            : 'Supabase no devolvió idproyecto confirmado (verifica política RLS de SELECT e INSERT en public.proyecto).'
        }`,
      };
    }

    return {
      success: true,
      idproyecto: Number(projData[0].idproyecto),
      cliente_id: clienteId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: formatSupabaseError(err),
    };
  }
}
