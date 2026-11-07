import { useEffect, useState } from 'react';
import type { Ciudad } from '../types';
import { api } from './api';

let cache: Ciudad[] | null = null;
let pendiente: Promise<Ciudad[]> | null = null;

function cargar(): Promise<Ciudad[]> {
  pendiente ??= api
    .get<Ciudad[]>('/ciudades')
    .then((lista) => (cache = lista))
    .catch(() => {
      // Se reintenta en el próximo montaje; mientras tanto el campo acepta texto libre
      pendiente = null;
      return [];
    });
  return pendiente;
}

/** Catálogo de ciudades (public.ciudades). null mientras carga; [] si no hay catálogo. */
export function useCiudades(): Ciudad[] | null {
  const [ciudades, setCiudades] = useState<Ciudad[] | null>(cache);
  useEffect(() => {
    if (cache) return;
    let vivo = true;
    void cargar().then((lista) => vivo && setCiudades(lista));
    return () => {
      vivo = false;
    };
  }, []);
  return ciudades;
}
