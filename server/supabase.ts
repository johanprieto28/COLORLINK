import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config, missingConfig } from './config';
import { HttpError } from './http';

let client: SupabaseClient | null = null;

if (missingConfig.length === 0) {
  client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
} else {
  console.warn(
    `[supabase] Faltan variables de entorno: ${missingConfig.join(', ')}. ` +
      'Los endpoints que usan la base de datos responderán 503 hasta configurarlas.'
  );
}

/** Cliente con service_role. Solo se usa en el servidor, nunca se expone al navegador. */
export function db(): SupabaseClient {
  if (!client) {
    throw new HttpError(
      503,
      `La base de datos no está configurada en el servidor (${missingConfig.join(', ')}).`
    );
  }
  return client;
}

export function isDbConfigured(): boolean {
  return client !== null;
}

/**
 * Lanza HttpError si la consulta de Supabase falló; devuelve los datos si no.
 * Traduce los errores de las funciones SQL (RAISE EXCEPTION 'CODIGO:detalle').
 */
export function must<T>(result: { data: T; error: any }, contexto: string): T {
  if (result.error) {
    const message = String(result.error.message || '');
    const known = translateDbError(message);
    if (known) throw known;
    console.error(`[db] ${contexto}:`, message);
    throw new HttpError(500, `Error al ${contexto}.`);
  }
  return result.data;
}

function translateDbError(message: string): HttpError | null {
  const [code, detail] = message.split(':');
  switch (code) {
    case 'CARRITO_VACIO':
      return new HttpError(400, 'Tu carrito está vacío.');
    case 'STOCK_INSUFICIENTE':
      return new HttpError(
        409,
        detail ? `No hay stock suficiente de "${detail}". Ajusta la cantidad.` : 'No hay stock suficiente.'
      );
    case 'PRODUCTO_INACTIVO':
      return new HttpError(409, `"${detail}" ya no está disponible. Retíralo del carrito.`);
    case 'PEDIDO_NO_ENCONTRADO':
      return new HttpError(404, 'Pedido no encontrado.');
    case 'PEDIDO_NO_CANCELABLE':
      return new HttpError(409, `El pedido no se puede cancelar porque está ${detail?.toLowerCase()}.`);
    case 'ORDEN_NO_ENCONTRADA':
      return new HttpError(404, 'Orden de abastecimiento no encontrada.');
    case 'ORDEN_CERRADA':
      return new HttpError(409, `La orden ya está ${detail?.toLowerCase()}.`);
    case 'PRODUCTO_NO_ENCONTRADO':
      return new HttpError(404, 'Producto no encontrado.');
    case 'COLOR_NO_ENCONTRADO':
      return new HttpError(404, 'Color no encontrado.');
    case 'CANTIDAD_INVALIDA':
      return new HttpError(400, 'La cantidad no es válida.');
    default:
      if (/duplicate key|unique constraint/i.test(message)) {
        return new HttpError(409, 'Ya existe un registro con esos datos únicos (SKU, correo o código).');
      }
      if (/violates check constraint/i.test(message)) {
        return new HttpError(400, 'Algún valor enviado no es válido para la base de datos.');
      }
      return null;
  }
}

export const EVIDENCIAS_BUCKET = 'evidencias';
export const PRODUCTOS_BUCKET = 'productos';

/** Genera URLs firmadas (1 h) para archivos privados del bucket de evidencias */
export async function signedUrls(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const { data, error } = await db().storage.from(EVIDENCIAS_BUCKET).createSignedUrls(paths, 3600);
  if (error) {
    console.warn('[storage] No se pudieron firmar URLs:', error.message);
    return map;
  }
  for (const item of data || []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  }
  return map;
}
