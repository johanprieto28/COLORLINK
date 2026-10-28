import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { createClient, FunctionsHttpError, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

function cleanEnv(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
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

// Resolve Supabase URL strictly from server environment variables (no hardcoded fallback)
function resolveServerSupabaseUrl(): { url: string; error: string | null } {
  const rawUrl = cleanEnv(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  if (isPlaceholder(rawUrl)) {
    return {
      url: '',
      error: 'Variable SUPABASE_URL / VITE_SUPABASE_URL no configurada en el servidor.',
    };
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return {
        url: parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname),
        error: null,
      };
    }
    return { url: '', error: `Protocolo inválido en URL de Supabase: ${parsed.protocol}` };
  } catch {
    if (rawUrl.includes('.supabase.co')) {
      try {
        const parsed = new URL(`https://${rawUrl}`);
        return { url: parsed.origin, error: null };
      } catch {
        return { url: '', error: `URL de Supabase inválida: "${rawUrl}"` };
      }
    }
    if (/^[a-z0-9]{15,30}$/i.test(rawUrl)) {
      return { url: `https://${rawUrl}.supabase.co`, error: null };
    }
    return { url: '', error: `URL de Supabase inválida en entorno: "${rawUrl}"` };
  }
}

// Resolve server-side Supabase key (never exposed to browser)
function resolveServerSupabaseKey(): {
  key: string;
  keySource: 'SUPABASE_SERVICE_ROLE_KEY' | 'VITE_SUPABASE_PUBLISHABLE_KEY' | 'NONE';
  hadInternalWhitespace: boolean;
  error: string | null;
} {
  const rawServiceKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!isPlaceholder(rawServiceKey)) {
    const hadInternalWhitespace = /\s/.test(rawServiceKey);
    return {
      key: rawServiceKey.replace(/\s+/g, ''),
      keySource: 'SUPABASE_SERVICE_ROLE_KEY',
      hadInternalWhitespace,
      error: null,
    };
  }

  const rawPubKey = cleanEnv(process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  if (!isPlaceholder(rawPubKey)) {
    const hadInternalWhitespace = /\s/.test(rawPubKey);
    return {
      key: rawPubKey.replace(/\s+/g, ''),
      keySource: 'VITE_SUPABASE_PUBLISHABLE_KEY',
      hadInternalWhitespace,
      error: null,
    };
  }

  return {
    key: '',
    keySource: 'NONE',
    hadInternalWhitespace: false,
    error: 'Ninguna clave de Supabase está configurada en las variables de entorno del servidor.',
  };
}

const serverUrlInfo = resolveServerSupabaseUrl();
const serverKeyInfo = resolveServerSupabaseKey();

let supabaseServerClient: SupabaseClient | null = null;
if (serverUrlInfo.url && serverKeyInfo.key) {
  try {
    supabaseServerClient = createClient(serverUrlInfo.url, serverKeyInfo.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err) {
    console.warn('Notice: Supabase server client initialization warning:', err);
  }
}

// Endpoint: Check Supabase Server-side Health (separately checks gateway, public.cliente, public.proyecto)
app.get('/api/supabase/health', async (_req, res) => {
  try {
    if (!supabaseServerClient || !serverUrlInfo.url || !serverKeyInfo.key) {
      const configErr =
        serverUrlInfo.error ||
        serverKeyInfo.error ||
        'Cliente Supabase no inicializado en el servidor.';
      return res.status(200).json({
        success: false,
        connected: false,
        keySource: serverKeyInfo.keySource,
        gatewayStatus: 'ERROR',
        clienteStatus: 'ERROR',
        proyectoStatus: 'ERROR',
        error: configErr,
        message: configErr,
      });
    }

    let gatewayStatus: 'OK' | 'ERROR' = 'ERROR';
    let gatewayError: string | null = null;

    try {
      const gwRes = await fetch(`${serverUrlInfo.url}/auth/v1/settings`, {
        method: 'GET',
        headers: { apikey: serverKeyInfo.key },
      });
      if (gwRes.ok) {
        gatewayStatus = 'OK';
      } else {
        const body = await gwRes.json().catch(() => ({ message: gwRes.statusText }));
        gatewayError = `[HTTP ${gwRes.status}] ${body?.message || gwRes.statusText}`;
      }
    } catch (gwErr: any) {
      gatewayError = gwErr?.message || 'Error de red hacia Supabase Gateway';
    }

    const [clienteRes, proyectoRes] = await Promise.all([
      supabaseServerClient.from('cliente').select('id', { count: 'exact' }).limit(1),
      supabaseServerClient.from('proyecto').select('idproyecto', { count: 'exact' }).limit(1),
    ]);

    const clienteStatus: 'OK' | 'ERROR' = clienteRes.error ? 'ERROR' : 'OK';
    const proyectoStatus: 'OK' | 'ERROR' = proyectoRes.error ? 'ERROR' : 'OK';
    const clienteError = clienteRes.error
      ? `[HTTP ${clienteRes.status}] ${clienteRes.error.message}`
      : null;
    const proyectoError = proyectoRes.error
      ? `[HTTP ${proyectoRes.status}] ${proyectoRes.error.message}`
      : null;

    const allOk =
      gatewayStatus === 'OK' && clienteStatus === 'OK' && proyectoStatus === 'OK';
    const firstError = gatewayError || clienteError || proyectoError;

    return res.json({
      success: allOk,
      url: serverUrlInfo.url,
      keySource: serverKeyInfo.keySource,
      hadInternalWhitespaceSanitized: serverKeyInfo.hadInternalWhitespace,
      connected: allOk,
      gatewayStatus,
      gatewayError,
      clienteStatus,
      clienteCount: clienteRes.count ?? null,
      clienteError,
      proyectoStatus,
      proyectoCount: proyectoRes.count ?? null,
      proyectoError,
      tablesInitialized: clienteStatus === 'OK' && proyectoStatus === 'OK',
      error: firstError,
      message: allOk
        ? `Servidor conectado a public.cliente (${clienteRes.count ?? 0}) y public.proyecto (${proyectoRes.count ?? 0}).`
        : `Detalle Supabase en servidor: ${firstError}`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, connected: false, error: err.message });
  }
});

const VALID_CLIENT_TYPES = new Set([
  'PERSONA_NATURAL',
  'EMPRESA',
  'COPROPIEDAD',
  'ENTIDAD',
]);

function normalizeTipoCliente(rawTipo: unknown, rawEmpresa: unknown): string {
  const cleaned = String(rawTipo ?? '').trim().toUpperCase();
  if (VALID_CLIENT_TYPES.has(cleaned)) {
    return cleaned;
  }
  const hasEmpresa = String(rawEmpresa ?? '').trim().length > 0;
  return hasEmpresa ? 'EMPRESA' : 'PERSONA_NATURAL';
}

function escapeIlikeLiteral(val: string): string {
  return val.replace(/[\\%_]/g, '\\$&');
}

// Endpoint: Read clients from public.cliente via server client
app.get('/api/supabase/clientes', async (_req, res) => {
  try {
    if (!supabaseServerClient) {
      return res.status(503).json({
        success: false,
        error: serverUrlInfo.error || serverKeyInfo.error || 'Cliente Supabase no inicializado en el servidor.',
      });
    }

    const { data, error, status } = await supabaseServerClient
      .from('cliente')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(status || 400).json({
        success: false,
        error: `[HTTP ${status}] ${error.message}`,
      });
    }

    return res.json({ success: true, data: data || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Error al consultar public.cliente' });
  }
});

// Endpoint: Read projects from public.proyecto via server client
app.get('/api/supabase/proyectos', async (_req, res) => {
  try {
    if (!supabaseServerClient) {
      return res.status(503).json({
        success: false,
        error: serverUrlInfo.error || serverKeyInfo.error || 'Cliente Supabase no inicializado en el servidor.',
      });
    }

    const { data, error, status } = await supabaseServerClient
      .from('proyecto')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(status || 400).json({
        success: false,
        error: `[HTTP ${status}] ${error.message}`,
      });
    }

    return res.json({ success: true, data: data || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Error al consultar public.proyecto' });
  }
});

const WELCOME_EMAIL_FUNCTION_NAME =
  cleanEnv(process.env.WELCOME_EMAIL_FUNCTION_NAME) || 'colorlink-welcome-email';

/**
 * Redacts credentials, tokens, keys, and authorization headers and bounds length
 * before persisting `error_detail` in `public.welcome_email_events` or logging.
 */
function sanitizeWelcomeErrorDetail(raw: unknown): string {
  let msg = String(raw ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();

  if (!msg) {
    return 'Error desconocido al invocar servicio de bienvenida';
  }

  // Redact explicit runtime secrets if they ever appear in an exception string
  const runtimeSecrets = [
    serverKeyInfo.key,
    cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
    cleanEnv(process.env.GEMINI_API_KEY),
  ].filter((s) => s && s.length >= 8);

  for (const secret of runtimeSecrets) {
    msg = msg.split(secret).join('[REDACTED]');
  }

  // Redact standard token/key patterns
  msg = msg
    .replace(/sb_secret_[A-Za-z0-9_-]+/gi, '[REDACTED_KEY]')
    .replace(/sb_publishable_[A-Za-z0-9_-]+/gi, '[REDACTED_KEY]')
    .replace(/sb_publicable_[A-Za-z0-9_-]+/gi, '[REDACTED_KEY]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/(apikey|authorization|token|secret|password)\s*[:=]\s*\S+/gi, '$1=[REDACTED]');

  return msg.slice(0, 240);
}

/**
 * Atomically claims the welcome email event in Supabase PostgreSQL (`public.welcome_email_events`).
 * Relies on `PRIMARY KEY (cliente_id)` and `UNIQUE (email)` in PostgreSQL so duplicate dispatches
 * are blocked across multiple Cloud Run instances, retries, and container cold starts.
 */
async function claimWelcomeEmailEventInPostgres(params: {
  client: SupabaseClient;
  clienteId: number;
  cleanEmail: string;
  idproyecto: number;
}): Promise<{ claimed: boolean; reason?: string }> {
  const { client, clienteId, cleanEmail, idproyecto } = params;
  const nowIso = new Date().toISOString();

  try {
    const { error, status } = await client.from('welcome_email_events').insert({
      cliente_id: clienteId,
      email: cleanEmail,
      idproyecto,
      status: 'CLAIMING',
      error_detail: null,
      created_at: nowIso,
      updated_at: nowIso,
    });

    if (!error) {
      return { claimed: true };
    }

    const isUniqueConflict =
      error.code === '23505' ||
      status === 409 ||
      /duplicate key|unique constraint/i.test(error.message || '');

    if (isUniqueConflict) {
      return { claimed: false, reason: 'welcome_event_already_recorded' };
    }

    console.warn(
      `[welcome-email] No se pudo registrar evento en public.welcome_email_events [HTTP ${status}]: ${sanitizeWelcomeErrorDetail(error.message)}`
    );
    return { claimed: false, reason: 'welcome_event_claim_failed' };
  } catch (err: any) {
    console.warn(
      `[welcome-email] Excepción al reclamar evento en public.welcome_email_events: ${sanitizeWelcomeErrorDetail(err?.message || err)}`
    );
    return { claimed: false, reason: 'welcome_event_claim_failed' };
  }
}

/**
 * Updates `public.welcome_email_events.status` to `'SENT'` or `'FAILED'` with a sanitized,
 * bounded `error_detail`. Isolated so any failure never affects the saved project response.
 */
async function finalizeWelcomeEmailEventInPostgres(params: {
  client: SupabaseClient;
  clienteId: number;
  sent: boolean;
  errorDetail?: string;
}): Promise<void> {
  const { client, clienteId, sent, errorDetail } = params;
  const safeErrorDetail = sent
    ? null
    : sanitizeWelcomeErrorDetail(errorDetail || 'Fallo al enviar correo de bienvenida');

  try {
    const { error, status } = await client
      .from('welcome_email_events')
      .update({
        status: sent ? 'SENT' : 'FAILED',
        error_detail: safeErrorDetail,
        updated_at: new Date().toISOString(),
      })
      .eq('cliente_id', clienteId);

    if (error) {
      console.warn(
        `[welcome-email] No se pudo actualizar estado final (${sent ? 'SENT' : 'FAILED'}) en public.welcome_email_events [HTTP ${status}]: ${sanitizeWelcomeErrorDetail(error.message)}`
      );
    }
  } catch (err: any) {
    console.warn(
      `[welcome-email] Excepción al actualizar public.welcome_email_events: ${sanitizeWelcomeErrorDetail(err?.message || err)}`
    );
  }
}

// Note: In-memory X-Idempotency-Key cache applies ONLY within the current warm Cloud Run instance
// (non-persistent across cold starts or separate instances). Cross-instance welcome email deduplication
// is guaranteed persistently in PostgreSQL via `public.welcome_email_events`.
interface InMemoryIdempotencyEntry {
  clienteId: number;
  idproyecto: number;
  reusedExistingClient: boolean;
  expiresAt: number;
}
const SUBMISSION_IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const inMemorySubmissionCache = new Map<string, InMemoryIdempotencyEntry>();

function findInMemorySubmissionByIdempotencyKey(
  idempotencyKey: string
): Omit<InMemoryIdempotencyEntry, 'expiresAt'> | null {
  if (!idempotencyKey) return null;
  const entry = inMemorySubmissionCache.get(idempotencyKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    inMemorySubmissionCache.delete(idempotencyKey);
    return null;
  }
  return {
    clienteId: entry.clienteId,
    idproyecto: entry.idproyecto,
    reusedExistingClient: entry.reusedExistingClient,
  };
}

function recordInMemorySubmissionIdempotency(params: {
  idempotencyKey: string;
  clienteId: number;
  idproyecto: number;
  reusedExistingClient: boolean;
}): void {
  if (!params.idempotencyKey) return;
  if (inMemorySubmissionCache.size >= 500) {
    const now = Date.now();
    for (const [k, v] of inMemorySubmissionCache.entries()) {
      if (now > v.expiresAt) inMemorySubmissionCache.delete(k);
    }
    if (inMemorySubmissionCache.size >= 500) {
      const oldestKey = inMemorySubmissionCache.keys().next().value;
      if (oldestKey) inMemorySubmissionCache.delete(oldestKey);
    }
  }
  inMemorySubmissionCache.set(params.idempotencyKey, {
    clienteId: params.clienteId,
    idproyecto: params.idproyecto,
    reusedExistingClient: params.reusedExistingClient,
    expiresAt: Date.now() + SUBMISSION_IDEMPOTENCY_TTL_MS,
  });
}

function isMeaningfulDocument(rawDoc: string): boolean {
  const normalized = rawDoc.trim().toUpperCase();
  if (normalized.length < 5) return false;
  const placeholders = new Set(['0', '00000', 'N/A', 'NA', 'NONE', 'NULL', 'SIN DOCUMENTO', 'PENDIENTE']);
  return !placeholders.has(normalized);
}

// Per-key asynchronous mutex queue to serialize concurrent requests within the same server process
const keyLockChains = new Map<string, Promise<void>>();

async function withSerializedLocks<T>(rawKeys: string[], fn: () => Promise<T>): Promise<T> {
  const uniqueKeys = Array.from(new Set(rawKeys.filter(Boolean))).sort();
  if (uniqueKeys.length === 0) {
    return fn();
  }

  const releases: Array<() => void> = [];
  for (const key of uniqueKeys) {
    const previous = keyLockChains.get(key) || Promise.resolve();
    let releaseCurrent!: () => void;
    const current = new Promise<void>((resolve) => {
      releaseCurrent = resolve;
    });
    const chained = previous.then(() => current);
    keyLockChains.set(key, chained);
    await previous;
    releases.push(() => {
      releaseCurrent();
      if (keyLockChains.get(key) === chained) {
        keyLockChains.delete(key);
      }
    });
  }

  try {
    return await fn();
  } finally {
    for (let i = releases.length - 1; i >= 0; i--) {
      releases[i]();
    }
  }
}

interface WelcomeEmailResult {
  attempted: boolean;
  sent: boolean;
  skippedReason?: string;
}

/**
 * Verifies in `public.proyecto` strictly for THIS `clienteId` (never limiting globally across `public.cliente`)
 * that `confirmedProjectId` is the client's first saved project (`count === 1`).
 */
async function verifyIsFirstProjectForClient(
  client: SupabaseClient,
  clienteId: number,
  confirmedProjectId: number
): Promise<{ isFirstProject: boolean; reason?: string }> {
  const { data: clientProjects, error: projCheckErr } = await client
    .from('proyecto')
    .select('idproyecto')
    .eq('cliente_id', clienteId)
    .limit(2);

  if (projCheckErr || !clientProjects || clientProjects.length === 0) {
    return { isFirstProject: false, reason: 'project_verification_failed' };
  }

  if (clientProjects.length > 1 || Number(clientProjects[0].idproyecto) !== confirmedProjectId) {
    return { isFirstProject: false, reason: 'client_already_has_projects' };
  }

  return { isFirstProject: true };
}

/**
 * Invokes the existing Supabase Edge Function `colorlink-welcome-email` from the server
 * with `{ email, name }`. Isolated so any failure never rolls back or blocks the saved project.
 */
async function invokeColorlinkWelcomeEmail(
  client: SupabaseClient,
  email: string,
  name: string
): Promise<WelcomeEmailResult & { errorDetail?: string }> {
  try {
    const { error } = await client.functions.invoke(WELCOME_EMAIL_FUNCTION_NAME, {
      body: {
        email,
        name,
      },
      timeout: 8000,
    });

    if (error) {
      let detail = error.message || 'Error al invocar Edge Function';
      if (error instanceof FunctionsHttpError && error.context) {
        const errText = await error.context.text().catch(() => '');
        if (errText) detail = `${detail} (${errText.slice(0, 200)})`;
      }
      const safeDetail = sanitizeWelcomeErrorDetail(detail);
      console.warn(`[welcome-email] No se pudo enviar correo de bienvenida: ${safeDetail}`);
      return {
        attempted: true,
        sent: false,
        skippedReason: 'edge_function_error',
        errorDetail: safeDetail,
      };
    }

    return {
      attempted: true,
      sent: true,
    };
  } catch (err: any) {
    const safeDetail = sanitizeWelcomeErrorDetail(err?.message || err || 'Excepción desconocida');
    console.warn(
      `[welcome-email] Excepción controlada al invocar ${WELCOME_EMAIL_FUNCTION_NAME}:`,
      safeDetail
    );
    return {
      attempted: true,
      sent: false,
      skippedReason: 'edge_function_exception',
      errorDetail: safeDetail,
    };
  }
}

// Endpoint: Persist client in public.cliente (reusing existing if matched) and project in public.proyecto
app.post('/api/supabase/proyectos', async (req, res) => {
  try {
    if (!supabaseServerClient) {
      return res.status(503).json({
        success: false,
        error: serverUrlInfo.error || serverKeyInfo.error || 'Cliente Supabase no inicializado en el servidor.',
      });
    }

    const activeClient = supabaseServerClient;
    const body = req.body || {};
    const nombreCompleto = String(body.nombre_completo ?? '').trim();
    const nombreEmpresa = String(body.nombre_empresa ?? '').trim();
    const numeroDocumento = String(body.numero_documento ?? '').trim();
    const cleanEmail = String(body['correo_electrónico'] ?? body.correo_electronico ?? '')
      .trim()
      .toLowerCase();
    const telefono = String(body.telefono ?? '').trim();
    const ciudad = String(body.ciudad ?? '').trim();
    const nombreProyecto = String(body.nombre_proyecto ?? '').trim();
    const tipoObra = String(body.tipo_obra ?? '').trim();
    const estado = String(body.estado ?? 'RECIBIDO').trim() || 'RECIBIDO';
    const descripcion = body.descripcion ? String(body.descripcion).trim() : null;
    const tipoCliente = normalizeTipoCliente(body.tipo_cliente, nombreEmpresa);
    const idempotencyHeader = String(req.headers['x-idempotency-key'] ?? body.idempotency_key ?? '')
      .trim()
      .slice(0, 120);

    if (!nombreCompleto || !cleanEmail || !telefono) {
      return res.status(400).json({
        success: false,
        error: 'Nombre completo, correo electrónico y teléfono del cliente son obligatorios.',
      });
    }

    if (!nombreProyecto) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del proyecto es obligatorio.',
      });
    }

    const hasValidDocument = isMeaningfulDocument(numeroDocumento);
    const lockKeys = [
      `email:${cleanEmail}`,
      hasValidDocument ? `doc:${numeroDocumento}` : '',
      idempotencyHeader ? `idem:${idempotencyHeader}` : '',
    ];

    const outcome = await withSerializedLocks(lockKeys, async () => {
      // 0. Per-instance in-memory idempotency check (protects rapid retries hitting the same warm instance)
      const cachedSubmission = findInMemorySubmissionByIdempotencyKey(idempotencyHeader);
      if (cachedSubmission) {
        return {
          httpStatus: 200,
          payload: {
            success: true,
            idproyecto: cachedSubmission.idproyecto,
            cliente_id: cachedSubmission.clienteId,
            reusedExistingClient: cachedSubmission.reusedExistingClient,
            deduplicatedRecentSubmission: true,
            welcomeEmail: {
              attempted: false,
              sent: false,
              skippedReason: 'deduplicated_retry',
            } as WelcomeEmailResult,
          },
        };
      }

      let clienteId: number | null = null;
      let reusedExistingClient = false;
      let createdNewClient = false;

      // 1. Check existing client by case-insensitive email
      const { data: byEmail, error: emailErr, status: emailStatus } = await activeClient
        .from('cliente')
        .select('id')
        .ilike('correo_electrónico', escapeIlikeLiteral(cleanEmail))
        .limit(1);

      if (emailErr) {
        return {
          httpStatus: emailStatus || 400,
          payload: {
            success: false,
            error: `Error al consultar public.cliente: [HTTP ${emailStatus}] ${emailErr.message}`,
          },
        };
      }

      if (byEmail && byEmail.length > 0 && byEmail[0].id != null) {
        clienteId = Number(byEmail[0].id);
        reusedExistingClient = true;
      }

      // 2. Fallback check by numero_documento only when a meaningful document identifier was provided
      if (clienteId === null && hasValidDocument) {
        const { data: byDoc, error: docErr, status: docStatus } = await activeClient
          .from('cliente')
          .select('id')
          .eq('numero_documento', numeroDocumento)
          .limit(1);

        if (docErr) {
          return {
            httpStatus: docStatus || 400,
            payload: {
              success: false,
              error: `Error al verificar documento en public.cliente: [HTTP ${docStatus}] ${docErr.message}`,
            },
          };
        }

        if (byDoc && byDoc.length > 0 && byDoc[0].id != null) {
          clienteId = Number(byDoc[0].id);
          reusedExistingClient = true;
        }
      }

      // 3. Insert new client into public.cliente if not found (recovering gracefully on 23505 unique race)
      if (clienteId === null) {
        const { data: cliData, error: cliErr, status: cliStatus } = await activeClient
          .from('cliente')
          .insert({
            tipo_cliente: tipoCliente,
            nombre_completo: nombreCompleto,
            nombre_empresa: nombreEmpresa,
            numero_documento: numeroDocumento,
            correo_electrónico: cleanEmail,
            telefono,
            ciudad: ciudad || null,
          })
          .select('id');

        if (cliErr && cliErr.code === '23505') {
          const { data: racedClient } = await activeClient
            .from('cliente')
            .select('id')
            .ilike('correo_electrónico', escapeIlikeLiteral(cleanEmail))
            .limit(1);

          if (racedClient && racedClient.length > 0 && racedClient[0].id != null) {
            clienteId = Number(racedClient[0].id);
            reusedExistingClient = true;
            createdNewClient = false;
          }
        }

        if (clienteId === null) {
          if (cliErr || !cliData || cliData.length === 0 || cliData[0].id == null) {
            return {
              httpStatus: cliStatus || 400,
              payload: {
                success: false,
                error: cliErr
                  ? `Error al insertar en public.cliente: [HTTP ${cliStatus}] ${cliErr.message}`
                  : 'Supabase no devolvió el id del cliente creado en public.cliente.',
              },
            };
          }

          clienteId = Number(cliData[0].id);
          createdNewClient = true;
        }
      }

      const parsedArea =
        body.area_m2 !== undefined && body.area_m2 !== null && !Number.isNaN(Number(body.area_m2))
          ? Number(body.area_m2)
          : null;
      const validDate =
        body.fecha_requerida && /^\d{4}-\d{2}-\d{2}$/.test(String(body.fecha_requerida))
          ? String(body.fecha_requerida)
          : null;
      const normalizedProjectName = nombreProyecto.slice(0, 200);

      // 4. Short-window PostgreSQL check (60s) in `public.proyecto` against rapid duplicate submissions
      const recentIsoCutoff = new Date(Date.now() - 60_000).toISOString();
      const { data: recentDup } = await activeClient
        .from('proyecto')
        .select('idproyecto, cliente_id')
        .eq('cliente_id', clienteId)
        .eq('nombre_proyecto', normalizedProjectName)
        .gte('created_at', recentIsoCutoff)
        .order('created_at', { ascending: false })
        .limit(1);

      if (recentDup && recentDup.length > 0 && recentDup[0].idproyecto != null) {
        const existingProjId = Number(recentDup[0].idproyecto);
        recordInMemorySubmissionIdempotency({
          idempotencyKey: idempotencyHeader,
          clienteId,
          idproyecto: existingProjId,
          reusedExistingClient,
        });
        return {
          httpStatus: 200,
          payload: {
            success: true,
            idproyecto: existingProjId,
            cliente_id: clienteId,
            reusedExistingClient,
            deduplicatedRecentSubmission: true,
            welcomeEmail: {
              attempted: false,
              sent: false,
              skippedReason: 'deduplicated_retry',
            } as WelcomeEmailResult,
          },
        };
      }

      // 5. Insert project into public.proyecto linked by cliente_id
      const { data: projData, error: projErr, status: projStatus } = await activeClient
        .from('proyecto')
        .insert({
          cliente_id: clienteId,
          nombre_proyecto: normalizedProjectName,
          ciudad: ciudad ? ciudad.slice(0, 100) : null,
          tipo_obra: tipoObra ? tipoObra.slice(0, 100) : null,
          area_m2: parsedArea,
          fecha_requerida: validDate,
          estado: estado.slice(0, 50),
          descripcion,
        })
        .select('idproyecto, cliente_id');

      if (projErr || !projData || !projData.length || projData[0].idproyecto == null) {
        return {
          httpStatus: projStatus || 400,
          payload: {
            success: false,
            error: projErr
              ? `Error al insertar en public.proyecto: [HTTP ${projStatus}] ${projErr.message}`
              : 'Supabase no devolvió idproyecto confirmado en public.proyecto.',
          },
        };
      }

      const confirmedProjectId = Number(projData[0].idproyecto);
      recordInMemorySubmissionIdempotency({
        idempotencyKey: idempotencyHeader,
        clienteId,
        idproyecto: confirmedProjectId,
        reusedExistingClient,
      });

      // 6. Send welcome email ONLY when a new client is created and its first project is confirmed,
      // claiming an atomic row in `public.welcome_email_events` (PostgreSQL) before dispatching.
      let welcomeEmail: WelcomeEmailResult = {
        attempted: false,
        sent: false,
        skippedReason: reusedExistingClient ? 'existing_client' : 'not_eligible',
      };

      if (createdNewClient && !reusedExistingClient) {
        const firstProjCheck = await verifyIsFirstProjectForClient(
          activeClient,
          clienteId,
          confirmedProjectId
        );

        if (!firstProjCheck.isFirstProject) {
          welcomeEmail = {
            attempted: false,
            sent: false,
            skippedReason: firstProjCheck.reason || 'client_already_has_projects',
          };
        } else {
          const claim = await claimWelcomeEmailEventInPostgres({
            client: activeClient,
            clienteId,
            cleanEmail,
            idproyecto: confirmedProjectId,
          });

          if (!claim.claimed) {
            welcomeEmail = {
              attempted: false,
              sent: false,
              skippedReason: claim.reason || 'welcome_event_already_recorded',
            };
          } else {
            const dispatchResult = await invokeColorlinkWelcomeEmail(
              activeClient,
              cleanEmail,
              nombreCompleto
            );
            await finalizeWelcomeEmailEventInPostgres({
              client: activeClient,
              clienteId,
              sent: dispatchResult.sent,
              errorDetail: dispatchResult.errorDetail,
            });
            welcomeEmail = {
              attempted: dispatchResult.attempted,
              sent: dispatchResult.sent,
              ...(dispatchResult.skippedReason
                ? { skippedReason: dispatchResult.skippedReason }
                : {}),
            };
          }
        }
      }

      return {
        httpStatus: 201,
        payload: {
          success: true,
          idproyecto: confirmedProjectId,
          cliente_id: clienteId,
          reusedExistingClient,
          welcomeEmail,
        },
      };
    });

    return res.status(outcome.httpStatus).json(outcome.payload);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Error interno al registrar cliente y proyecto en Supabase.',
    });
  }
});

// Shared Gemini client for COLORLINK IA (Server-side)
let ai: GoogleGenAI | null = null;
const geminiKey = cleanEnv(process.env.GEMINI_API_KEY);
if (!isPlaceholder(geminiKey)) {
  try {
    ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Gemini client initialization notice:', err);
  }
}

// Endpoint: AI Diagnostic & Coating Specification
app.post('/api/ai/diagnose', async (req, res) => {
  try {
    const {
      surfaceType,
      area,
      environment,
      locationType,
      humidity,
      cracks,
      wear,
      detachment,
      problemDescription,
      hasPhotos,
    } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'API key not configured or AI client not ready',
        fallback: true,
      });
    }

    const prompt = `Eres el motor experto de inteligencia técnica de COLORLINK, plataforma líder en ingeniería de recubrimientos y pinturas técnicas (normas NACE, SSPC, ISO 12944 y ASTM).
Evalúa minuciosamente el siguiente caso técnico:
- Tipo de superficie: ${surfaceType || 'Concreto / Mampostería'}
- Área aproximada: ${area || 100} m²
- Ambiente / Industria: ${environment || 'Industrial'} (${locationType || 'Exterior'})
- Nivel de humedad registrado: ${humidity || 'Media'}
- Presencia de fisuras o grietas: ${cracks ? 'Sí (visibles/activas)' : 'No'}
- Grado de desgaste: ${wear || 'Moderado'}
- Desprendimiento o pérdida de adherencia: ${detachment ? 'Sí' : 'No'}
- Descripción del problema por el cliente: ${problemDescription || 'Mantenimiento preventivo y renovación estética'}
- Evidencias fotográficas cargadas: ${hasPhotos ? 'Sí' : 'No'}

Genera un dictamen técnico preliminar estructurado en formato JSON estricto con los siguientes campos:
{
  "nivelComplejidad": "BAJA" | "MEDIA" | "ALTA" | "CRITICA",
  "severidad": "LEVE" | "MODERADO" | "SEVERO" | "CRITICO",
  "patologiasDetectadas": ["patología 1", "patología 2", "patología 3"],
  "validacionTecnicaRequerida": true,
  "recomendacionPreliminar": "Explicación técnica detallada de la condición y solución recomendada en español",
  "preparacionSuperficieSugerida": "Método estándar de preparación superficial con norma aplicable (ej. SSPC-SP 13 / NACE 6, SSPC-SP 10)",
  "sistemaSugerido": {
    "nombreSistema": "Nombre del sistema de recubrimiento (ej. Sistema Epóxico-Poliuretano Alto Desempeño)",
    "capas": [
      {
        "tipo": "IMPRIMANTE",
        "producto": "Nombre técnico del imprimante (ej. Imprimante Epóxico Tolerante a Humedad)",
        "espesor_micrones": 75,
        "manos": 1,
        "funcion": "Promotor de adherencia y barrera de vapor"
      },
      {
        "tipo": "INTERMEDIO",
        "producto": "Nombre técnico de la capa intermedia (ej. Epóxico Alto Sólidos Poliamida)",
        "espesor_micrones": 125,
        "manos": 1,
        "funcion": "Barrera dieléctrica y espesor anticorrosivo/mecánico"
      },
      {
        "tipo": "ACABADO",
        "producto": "Nombre técnico del acabado (ej. Poliuretano Alifático Acrílico UV)",
        "espesor_micrones": 50,
        "manos": 2,
        "funcion": "Resistencia a intemperie, brillo y retención de color"
      }
    ],
    "garantiaEstimadaAnos": 5
  },
  "advertencias": [
    "Recomendación preliminar generada por COLORLINK IA sujeta a validación técnica por un profesional autorizado."
  ]
}

Responde estrictamente con el JSON válido.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const json = JSON.parse(text);
    return res.json(json);
  } catch (error: any) {
    console.error('Error calling Gemini for COLORLINK IA:', error);
    return res.status(500).json({
      error: error.message || 'Error executing AI diagnosis',
      fallback: true,
    });
  }
});

// Endpoint: AI Material & Cost Estimation helper
app.post('/api/ai/estimate-coating', async (req, res) => {
  try {
    const { surfaceType, area, systemName, layersCount } = req.body;
    if (!ai) {
      return res.status(503).json({
        error: 'API key not configured or AI client not ready',
        fallback: true,
      });
    }

    const prompt = `Calcula rendimientos teóricos y prácticos de recubrimiento para:
- Superficie: ${surfaceType}
- Área: ${area} m²
- Sistema: ${systemName}
- Capas: ${layersCount}

Devuelve un JSON con:
{
  "galonesEstimados": number,
  "tiempoEjecucionDias": number,
  "costoMateriaPrimaEstimadoUSD": number,
  "costoManoObraEstimadoUSD": number,
  "recomendacionCuradoHoras": number,
  "resumen": "string"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    return res.status(500).json({ error: error.message, fallback: true });
  }
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`COLORLINK Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
