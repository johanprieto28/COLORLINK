import { getSupabase } from './supabase';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const supabase = await getSupabase();
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(await authHeader()),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error || `Error ${res.status} al comunicarse con el servidor.`);
  }
  return data as T;
}

/** Descarga un archivo de la API (con la sesión del usuario) y lo guarda con el nombre indicado */
export async function descargarArchivo(path: string, nombre: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { headers: await authHeader() });
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.error || `Error ${res.status} al descargar el archivo.`);
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

/** Convierte un File en el JSON { nombre, mime, base64 } que espera el backend */
export function fileToUpload(file: File): Promise<{ nombre: string; mime: string; base64: string }> {
  return new Promise((resolve, reject) => {
    if (file.size > 8 * 1024 * 1024) {
      reject(new ApiError(413, `"${file.name}" supera 8 MB.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ nombre: file.name, mime: file.type || 'image/jpeg', base64: String(reader.result) });
    reader.onerror = () => reject(new ApiError(400, `No se pudo leer "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
}
