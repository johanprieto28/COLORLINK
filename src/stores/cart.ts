import { useSyncExternalStore } from 'react';
import type { Carrito, Producto } from '../types';
import { api } from '../lib/api';
import { authStore } from './auth';

/**
 * Carrito de compras.
 * - Con sesión: vive en public.carrito_items (se ve igual en cualquier dispositivo).
 * - Sin sesión: se guarda solo en este navegador (producto + cantidad) y los precios
 *   se calculan en el servidor. Al iniciar sesión se pasa a la cuenta y se borra de aquí.
 * Para pagar siempre se pide iniciar sesión.
 */
const GUEST_KEY = 'colorlink_carrito_invitado';
const EMPTY: Carrito = { items: [], subtotal: 0, costo_envio: 0, total: 0, envio_gratis_desde: 0 };

type GuestItem = { producto_id: string; cantidad: number };

let cart: Carrito = EMPTY;
let loading = true;
let drawerOpen = false;
const listeners = new Set<() => void>();
let snapshot = { cart, loading, drawerOpen };

function emit() {
  snapshot = { cart, loading, drawerOpen };
  listeners.forEach((l) => l());
}

function readGuest(): GuestItem[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(GUEST_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((it) => it?.producto_id && it.cantidad > 0) : [];
  } catch {
    return [];
  }
}

function writeGuest(items: GuestItem[]) {
  try {
    if (items.length) window.localStorage.setItem(GUEST_KEY, JSON.stringify(items));
    else window.localStorage.removeItem(GUEST_KEY);
  } catch {
    // Almacenamiento bloqueado: el carrito vive solo en memoria durante la visita
  }
}

const isLogged = () => Boolean(authStore.getState().user);

async function refresh() {
  loading = true;
  emit();
  try {
    if (isLogged()) {
      cart = await api.get<Carrito>('/carrito');
    } else {
      const guest = readGuest();
      cart = guest.length ? await api.post<Carrito>('/carrito/simular', { items: guest }) : EMPTY;
      // Limpia productos que ya no existen o fueron desactivados
      if (guest.length !== cart.items.length) {
        writeGuest(cart.items.map((it) => ({ producto_id: it.producto.id, cantidad: it.cantidad })));
      }
    }
  } catch {
    cart = EMPTY;
  } finally {
    loading = false;
    emit();
  }
}

authStore.onUserChange(async (user) => {
  if (user) {
    const guest = readGuest();
    if (guest.length) {
      try {
        cart = await api.post<Carrito>('/carrito/fusionar', { items: guest });
        writeGuest([]);
        loading = false;
        emit();
        return;
      } catch {
        // Si falla la fusión se conserva el carrito local para reintentar después
      }
    }
  }
  await refresh();
});

// Carga inicial cuando se sabe si hay sesión
const unsubscribeInit = authStore.subscribe(() => {
  if (authStore.getState().status !== 'cargando') {
    unsubscribeInit();
    if (!authStore.getState().user) void refresh();
  }
});

function setGuestQuantity(producto: Producto, cantidad: number) {
  const guest = readGuest().filter((it) => it.producto_id !== producto.id);
  if (cantidad > 0) guest.push({ producto_id: producto.id, cantidad });
  writeGuest(guest);
}

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => snapshot,
  refresh,

  cantidadDe(productoId: string): number {
    return cart.items.find((it) => it.producto.id === productoId)?.cantidad || 0;
  },

  /** Suma unidades al carrito (con o sin sesión) */
  async agregar(producto: Producto, cantidad = 1): Promise<boolean> {
    const nueva = Math.min(cartStore.cantidadDe(producto.id) + cantidad, Math.floor(producto.stock));
    if (nueva <= cartStore.cantidadDe(producto.id)) {
      throw new Error(`No hay más unidades disponibles de "${producto.nombre}".`);
    }
    if (isLogged()) {
      cart = await api.put<Carrito>(`/carrito/${producto.id}`, { cantidad: nueva });
      emit();
    } else {
      setGuestQuantity(producto, nueva);
      await refresh();
    }
    drawerOpen = true;
    emit();
    return true;
  },

  async fijarCantidad(productoId: string, cantidad: number) {
    if (isLogged()) {
      cart =
        cantidad <= 0
          ? await api.delete<Carrito>(`/carrito/${productoId}`)
          : await api.put<Carrito>(`/carrito/${productoId}`, { cantidad });
      emit();
      return;
    }
    const item = cart.items.find((it) => it.producto.id === productoId);
    if (item) setGuestQuantity(item.producto, Math.min(cantidad, Math.floor(item.producto.stock)));
    await refresh();
  },

  openDrawer() {
    drawerOpen = true;
    emit();
  },

  closeDrawer() {
    drawerOpen = false;
    emit();
  },

  /** Tras un pedido exitoso el servidor ya vació el carrito */
  vaciarLocal() {
    cart = { ...EMPTY, envio_gratis_desde: cart.envio_gratis_desde };
    emit();
  },
};

export function useCart() {
  return useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot);
}

export function totalUnidades(c: Carrito): number {
  return c.items.reduce((acc, it) => acc + it.cantidad, 0);
}
