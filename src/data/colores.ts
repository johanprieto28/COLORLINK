/**
 * Colores para proyectos (public.colores). Lo usan el selector del asistente,
 * el inventario del panel y el servidor, para que todos estimen igual.
 * La misma fórmula está en la función SQL consumir_colores_proyecto (migración 012).
 */

export const MAX_COLORES_PROYECTO = 2;
/** Rendimiento de referencia de un vinilo: m² por galón en una mano */
export const RENDIMIENTO_M2_GALON = 35;
export const MANOS = 2;
/** Reparto del área cuando hay dos colores: principal / secundario */
export const REPARTO_DOS_COLORES = [0.7, 0.3] as const;

export type FamiliaColor = 'NEUTROS' | 'CALIDOS' | 'FRESCOS' | 'NATURALES' | 'ACENTOS';
export type Disponibilidad = 'DISPONIBLE' | 'POCAS' | 'BAJO_PEDIDO';

export const FAMILIA_LABELS: Record<FamiliaColor, string> = {
  NEUTROS: 'Neutros',
  CALIDOS: 'Cálidos',
  FRESCOS: 'Frescos',
  NATURALES: 'Naturales',
  ACENTOS: 'Acentos',
};

export const DISPONIBILIDAD_LABELS: Record<Disponibilidad, string> = {
  DISPONIBLE: 'Disponible',
  POCAS: 'Pocas unidades',
  BAJO_PEDIDO: 'Bajo pedido',
};

/** Lo que ve el cliente: sin cantidades exactas */
export interface ColorCatalogo {
  id: string;
  nombre: string;
  hex: string;
  familia: FamiliaColor;
  disponibilidad: Disponibilidad;
}

/** Lo que ve el equipo en el inventario */
export interface ColorInventario extends ColorCatalogo {
  stock_galones: number;
  stock_minimo: number;
  activo: boolean;
  /** Galones estimados de proyectos activos que aún no se han aprobado */
  comprometido_galones: number;
  proyectos_activos: number;
}

export interface MovimientoColor {
  id: string;
  color_id: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  cantidad: number;
  stock_resultante: number;
  motivo?: string | null;
  referencia?: string | null;
  created_at: string;
}

export function disponibilidad(stock: number, minimo: number): Disponibilidad {
  if (stock <= 0) return 'BAJO_PEDIDO';
  return stock <= minimo ? 'POCAS' : 'DISPONIBLE';
}

/** Galones estimados por color para un área (mismo cálculo que el descuento al aprobar) */
export function galonesEstimados(areaM2: number, cantidadColores: number): number[] {
  if (!(areaM2 > 0) || cantidadColores <= 0) return [];
  const n = Math.min(cantidadColores, MAX_COLORES_PROYECTO);
  return Array.from({ length: n }, (_, i) => {
    const reparto = n === 1 ? 1 : REPARTO_DOS_COLORES[i];
    return Math.max(1, Math.ceil(((areaM2 * MANOS) / RENDIMIENTO_M2_GALON) * reparto));
  });
}

/** Texto legible para guardar en el proyecto: "Marfil Luz (principal) + Verde Salvia (secundario)" */
export function describirColores(nombres: string[]): string {
  if (nombres.length === 0) return '';
  if (nombres.length === 1) return nombres[0];
  return `${nombres[0]} (principal) + ${nombres[1]} (secundario)`;
}
