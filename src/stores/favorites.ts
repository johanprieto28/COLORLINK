import { api } from '../lib/api';
import {
  FAVORITES_UPDATED_EVENT,
  getStoredFavoriteColorIds,
  saveStoredFavoriteColorIds,
} from '../data/colorExplorerData';
import { authStore } from './auth';

/**
 * Sincroniza los colores favoritos con public.favoritos_color.
 * - Con sesión: la base de datos es la fuente de verdad; localStorage solo es caché.
 * - Sin sesión: guardar un favorito pide iniciar sesión.
 * Los componentes siguen usando get/saveStoredFavoriteColorIds y el evento de cambios.
 */
let syncing = false;
let pending: string[] | null = null;
/** Evita reenviar al servidor la lista que acabamos de recibir de él */
let aplicandoRemoto = false;

async function pushToServer(ids: string[]) {
  if (syncing) {
    pending = ids;
    return;
  }
  syncing = true;
  try {
    await api.put<string[]>('/cuenta/favoritos', { colores: ids });
  } catch (err) {
    console.warn('[favoritos] No se pudo guardar en el servidor:', err);
  } finally {
    syncing = false;
    if (pending) {
      const next = pending;
      pending = null;
      void pushToServer(next);
    }
  }
}

authStore.onUserChange(async (user) => {
  if (!user) {
    saveStoredFavoriteColorIds([]);
    return;
  }
  try {
    const remotos = await api.get<string[]>('/cuenta/favoritos');
    const locales = getStoredFavoriteColorIds();
    // Fusiona lo que el usuario marcó antes de que cargara la sesión
    const union = Array.from(new Set([...remotos, ...locales]));
    aplicandoRemoto = true;
    saveStoredFavoriteColorIds(union);
    aplicandoRemoto = false;
    if (union.length !== remotos.length) void pushToServer(union);
  } catch (err) {
    console.warn('[favoritos] No se pudieron cargar:', err);
  }
});

// Si la sesión resulta anónima (nunca inició o venció), no se muestran favoritos de nadie
authStore.subscribe(() => {
  if (authStore.getState().status === 'anonimo' && getStoredFavoriteColorIds().length) {
    saveStoredFavoriteColorIds([]);
  }
});

window.addEventListener(FAVORITES_UPDATED_EVENT, (event) => {
  if (aplicandoRemoto || !authStore.getState().user) return;
  const ids = (event as CustomEvent<string[]>).detail;
  if (Array.isArray(ids)) void pushToServer(ids);
});

/** Devuelve false (y abre el inicio de sesión) si no hay usuario */
export function ensureCanSaveFavorites(): boolean {
  if (authStore.getState().user) return true;
  authStore.requestLogin('Inicia sesión para guardar tus colores favoritos en tu cuenta.');
  return false;
}
