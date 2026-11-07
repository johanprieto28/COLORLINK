import { useEffect, useState } from 'react';
import type { ColorCatalogo } from '../data/colores';
import { api } from './api';

let cache: { lista: ColorCatalogo[]; hasta: number } | null = null;

/** Catálogo de colores para proyectos (con disponibilidad). null mientras carga. */
export function useColores(): { colores: ColorCatalogo[] | null; error: string | null } {
  const [colores, setColores] = useState<ColorCatalogo[] | null>(cache && cache.hasta > Date.now() ? cache.lista : null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (cache && cache.hasta > Date.now()) return;
    let vivo = true;
    api
      .get<ColorCatalogo[]>('/colores')
      .then((lista) => {
        // La disponibilidad cambia con el inventario: se refresca cada minuto
        cache = { lista, hasta: Date.now() + 60_000 };
        if (vivo) setColores(lista);
      })
      .catch((err) => vivo && setError(err instanceof Error ? err.message : 'No se pudieron cargar los colores.'));
    return () => {
      vivo = false;
    };
  }, []);
  return { colores, error };
}
