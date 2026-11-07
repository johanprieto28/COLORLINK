import { randomUUID } from 'crypto';
import { HttpError, text } from './http';
import { db, EVIDENCIAS_BUCKET } from './supabase';

const MAX_BYTES = 8 * 1024 * 1024;
/** Fotos del estado actual y documentos (fichas técnicas, planos, actas) en PDF */
const MIME_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']);

export interface ArchivoSubido {
  buffer: Buffer;
  mime: string;
  nombre: string;
  /** Nombre seguro para usar en la ruta de Storage */
  nombreSeguro: string;
}

/**
 * Lee un archivo enviado como JSON { nombre, mime, base64 } (data URL o base64 puro).
 * Se usa JSON en lugar de multipart para no agregar dependencias al servidor.
 */
export function leerImagenBase64(body: any): ArchivoSubido {
  const nombre = text(body?.nombre, 'nombre del archivo', { required: true, max: 180 });
  const mime = text(body?.mime, 'tipo de archivo', { required: true, max: 60 }).toLowerCase();
  if (!MIME_PERMITIDOS.has(mime)) {
    throw new HttpError(415, 'Solo se permiten imágenes JPG, PNG, WEBP o HEIC y documentos PDF.');
  }

  const raw = String(body?.base64 || '').replace(/^data:[^;]+;base64,/, '');
  if (!raw) throw new HttpError(400, 'El archivo está vacío.');
  const buffer = Buffer.from(raw, 'base64');
  if (buffer.length === 0) throw new HttpError(400, 'El archivo está vacío.');
  if (buffer.length > MAX_BYTES) throw new HttpError(413, 'El archivo supera 8 MB. Reduce su tamaño e inténtalo de nuevo.');

  const nombreSeguro = `${randomUUID().slice(0, 8)}-${nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]+/g, '_')
    .slice(-80)}`;

  return { buffer, mime, nombre, nombreSeguro };
}

export interface ArchivoParaIA {
  mime: string;
  base64: string;
  nombre: string;
}

/**
 * Descarga de Storage las primeras evidencias para que Gemini las interprete.
 * Se limita la cantidad y el peso total para no exceder el tamaño de la solicitud.
 */
export async function evidenciasParaIA(
  evidencias: Array<{ storage_path: string; mime_type?: string | null; nombre_archivo?: string | null }>,
  max = 4,
  maxBytesTotal = 14 * 1024 * 1024
): Promise<ArchivoParaIA[]> {
  const archivos: ArchivoParaIA[] = [];
  let total = 0;
  for (const ev of evidencias) {
    if (archivos.length >= max) break;
    const mime = String(ev.mime_type || '').toLowerCase();
    if (!MIME_PERMITIDOS.has(mime)) continue;
    const { data, error } = await db().storage.from(EVIDENCIAS_BUCKET).download(ev.storage_path);
    if (error || !data) {
      console.warn('[archivos] No se pudo descargar la evidencia para la IA:', error?.message);
      continue;
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    if (total + buffer.length > maxBytesTotal) continue;
    total += buffer.length;
    archivos.push({ mime, base64: buffer.toString('base64'), nombre: ev.nombre_archivo || 'archivo' });
  }
  return archivos;
}
