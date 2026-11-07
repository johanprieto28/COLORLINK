import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import type { DimensionValidacion, NivelHallazgo, ValidacionReporte } from '../../types';
import { DIMENSION_VALIDACION_LABELS } from '../../types';

const ESTADO_ESTILO: Record<ValidacionReporte['estado'], { label: string; clase: string }> = {
  APROBADA: { label: 'Datos confiables', clase: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  CON_OBSERVACIONES: { label: 'Con observaciones', clase: 'bg-amber-50 text-amber-800 border-amber-200' },
  RECHAZADA: { label: 'Requiere correcciones', clase: 'bg-rose-50 text-rose-800 border-rose-200' },
};

const ICONO: Record<NivelHallazgo, React.ReactNode> = {
  OK: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
  ADVERTENCIA: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
  ERROR: <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
};

/** Reporte de validación automática agrupado por dimensión (completitud, formato, coherencia, duplicidad, trazabilidad) */
export const ValidacionReportePanel: React.FC<{ reporte: ValidacionReporte; titulo?: string }> = ({
  reporte,
  titulo = 'Validación automática',
}) => {
  const estilo = ESTADO_ESTILO[reporte.estado];
  const dimensiones = Object.keys(DIMENSION_VALIDACION_LABELS) as DimensionValidacion[];

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-extrabold text-[#0B1F3A]">
          <ShieldCheck className="w-4 h-4 text-[#0891B2]" />
          {titulo}
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${estilo.clase}`}>{estilo.label}</span>
          <span className="text-xs font-bold text-[#0B1F3A] tabular-nums">{reporte.puntaje}/100</span>
        </div>
      </div>

      <ul className="space-y-3">
        {dimensiones.map((dim) => {
          const items = reporte.hallazgos.filter((h) => h.dimension === dim);
          if (!items.length) return null;
          return (
            <li key={dim} className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{DIMENSION_VALIDACION_LABELS[dim]}</span>
              {items.map((h, i) => (
                <p key={i} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                  {ICONO[h.nivel]}
                  <span>{h.mensaje}</span>
                </p>
              ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
