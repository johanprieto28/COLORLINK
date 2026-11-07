const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function cop(value: number | null | undefined): string {
  return copFormatter.format(Number(value || 0));
}

export function fecha(iso: string | null | undefined, conHora = false): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

/** Minúsculas y sin tildes, para búsquedas por palabra clave */
export function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export const SUPERFICIE_LABELS: Record<string, string> = {
  MAMPOSTERIA: 'Muro / mampostería',
  CONCRETO: 'Concreto / losa',
  DRYWALL: 'Drywall / estuco',
  ACERO_CARBONO: 'Metal / estructura',
  MADERA: 'Madera',
  PISO_INDUSTRIAL: 'Piso industrial',
};

export function superficieLabel(value?: string | null): string {
  return (value && SUPERFICIE_LABELS[value]) || value || '—';
}
