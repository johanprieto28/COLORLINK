import React from 'react';
import { ClipboardCheck, Wrench } from 'lucide-react';
import type { InspeccionCalidad, ServicioCampo } from '../../../types';
import { useApi } from '../../../lib/useApi';
import { navigate } from '../../../lib/router';
import { fecha } from '../../../lib/format';
import { Card, EmptyState, ErrorBox, Spinner } from '../../ui';

/** Vista global; la programación y el avance se gestionan desde el detalle de cada proyecto */
export const ServiciosSection: React.FC = () => {
  const { data, loading, error, reload } = useApi<ServicioCampo[]>('/panel/servicios');
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data?.length) {
    return (
      <EmptyState
        icon={<Wrench className="w-6 h-6" />}
        title="No hay servicios programados"
        description="Programa un servicio desde un proyecto aprobado (pestaña Ejecución)."
      />
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.map((s) => (
        <button key={s.id} type="button" onClick={() => navigate('detalle-proyecto', s.proyecto_id)} className="text-left cursor-pointer">
          <Card className="p-5 space-y-3 hover:border-[#155EEF]/40 transition-colors h-full">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-[#092653]">{s.proyecto_nombre}</p>
                <p className="text-xs text-slate-500 font-mono">{s.proyecto_codigo}</p>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-md bg-[#155EEF]/10 text-[#155EEF]">{s.estado.replace('_', ' ').toLowerCase()}</span>
            </div>
            <p className="text-sm text-slate-600">
              {s.cuadrilla} · líder {s.lider}
              <br />
              {fecha(s.fecha_inicio)} → {fecha(s.fecha_fin_estimada)}
            </p>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-[#08B6CC]" style={{ width: `${s.avance}%` }} />
            </div>
            <p className="text-xs text-slate-500">{s.avance}% de avance</p>
          </Card>
        </button>
      ))}
    </div>
  );
};

export const CalidadSection: React.FC = () => {
  const { data, loading, error, reload } = useApi<InspeccionCalidad[]>('/panel/calidad');
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data?.length) {
    return (
      <EmptyState
        icon={<ClipboardCheck className="w-6 h-6" />}
        title="Aún no hay inspecciones"
        description="Regístralas desde el proyecto cuando termine la ejecución."
      />
    );
  }
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="text-left text-xs text-slate-500 border-b border-[#E7EAF0]">
            <th className="px-4 py-3 font-semibold">Proyecto</th>
            <th className="px-4 py-3 font-semibold">Inspector</th>
            <th className="px-4 py-3 font-semibold">Pruebas</th>
            <th className="px-4 py-3 font-semibold">Resultado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E7EAF0]">
          {data.map((q) => (
            <tr key={q.id} onClick={() => navigate('detalle-proyecto', q.proyecto_id)} className="hover:bg-[#FAFAF7] cursor-pointer">
              <td className="px-4 py-3">
                <span className="font-semibold text-[#092653]">{q.proyecto_nombre}</span>
                <span className="block text-xs text-slate-500">
                  {q.proyecto_codigo} · {fecha(q.fecha)}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-slate-600">{q.inspector_nombre}</td>
              <td className="px-4 py-3 text-xs text-slate-600">
                Adherencia {q.adherencia_ok ? '✓' : '✗'} · Espesor {q.espesor_ok ? '✓' : '✗'} · Curado {q.curado_ok ? '✓' : '✗'}
                <br />
                Acabado {q.acabado_visual.replace('_', ' ').toLowerCase()}
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs font-bold px-2 py-1 rounded-md ${q.resultado === 'APROBADO' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                  {q.resultado === 'APROBADO' ? 'Aprobada' : 'Requiere ajustes'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};
