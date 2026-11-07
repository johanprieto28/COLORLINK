import { useSyncExternalStore } from 'react';

/**
 * Router mínimo basado en el hash de la URL (#/tienda?categoria=INTERIOR).
 * Da URLs compartibles y hace funcionar los botones atrás/adelante del navegador
 * sin dependencias ni configuración extra en el servidor.
 */

export type ActiveView =
  | 'inicio'
  | 'tienda'
  | 'producto'
  | 'carrito'
  | 'checkout'
  | 'soluciones'
  | 'como-funciona'
  | 'mis-proyectos'
  | 'crear-proyecto'
  | 'detalle-proyecto'
  | 'cuenta'
  | 'panel'
  | 'no-encontrado';

export interface Route {
  view: ActiveView;
  /** id de proyecto, slug de producto, pestaña de cuenta o sección del panel */
  param?: string;
  query: URLSearchParams;
  path: string;
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const query = new URLSearchParams(queryPart);

  const route = (view: ActiveView, param?: string): Route => ({ view, param, query, path });

  switch (parts[0]) {
    case undefined:
      return route('inicio');
    case 'tienda':
      return parts[1] ? route('producto', parts[1]) : route('tienda');
    case 'carrito':
      return route('carrito');
    case 'checkout':
      return route('checkout');
    case 'soluciones':
      return route('soluciones');
    case 'como-funciona':
      return route('como-funciona');
    case 'proyectos':
      if (!parts[1]) return route('mis-proyectos');
      if (parts[1] === 'nuevo') return route('crear-proyecto');
      return route('detalle-proyecto', parts[1]);
    case 'cuenta':
      return route('cuenta', parts[1] || 'perfil');
    case 'panel':
      return route('panel', parts[1] || 'resumen');
    default:
      return route('no-encontrado');
  }
}

export function pathFor(view: ActiveView, param?: string, query?: Record<string, string | undefined>): string {
  const base = (() => {
    switch (view) {
      case 'inicio':
        return '/';
      case 'tienda':
        return '/tienda';
      case 'producto':
        return `/tienda/${encodeURIComponent(param || '')}`;
      case 'carrito':
        return '/carrito';
      case 'checkout':
        return '/checkout';
      case 'soluciones':
        return '/soluciones';
      case 'como-funciona':
        return '/como-funciona';
      case 'mis-proyectos':
        return '/proyectos';
      case 'crear-proyecto':
        return '/proyectos/nuevo';
      case 'detalle-proyecto':
        return `/proyectos/${encodeURIComponent(param || '')}`;
      case 'cuenta':
        return param && param !== 'perfil' ? `/cuenta/${param}` : '/cuenta';
      case 'panel':
        return param && param !== 'resumen' ? `/panel/${param}` : '/panel';
      default:
        return '/';
    }
  })();
  const qs = new URLSearchParams(
    Object.entries(query || {}).filter((e): e is [string, string] => Boolean(e[1]))
  ).toString();
  return qs ? `${base}?${qs}` : base;
}

export function navigate(view: ActiveView, param?: string, query?: Record<string, string | undefined>) {
  const target = `#${pathFor(view, param, query)}`;
  if (window.location.hash === target) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  window.location.hash = target;
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  // parseHash es barato; se recalcula solo cuando cambia el hash
  return parseHash(hash);
}
