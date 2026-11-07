import React from 'react';
import { ChevronRight, FolderOpen, MapPin, PlusCircle } from 'lucide-react';
import type { ProyectoResumen } from '../../types';
import { useApi } from '../../lib/useApi';
import { navigate } from '../../lib/router';
import { fecha, superficieLabel } from '../../lib/format';
import { authStore, useAuth } from '../../stores/auth';
import { getStatusBadge } from '../common/Badge';
import { Button, EmptyState, ErrorBox, PageHeader, Spinner } from '../ui';

export const ProjectsListView: React.FC = () => {
  const { user } = useAuth();
  const { data: proyectos, loading, error, reload } = useApi<ProyectoResumen[]>(user ? '/proyectos' : null);

  const crear = () => (user ? navigate('crear-proyecto') : authStore.requestLogin('Inicia sesión o crea tu cuenta para registrar tu proyecto.'));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <PageHeader
        eyebrow="Proyectos"
        title={user ? 'Mis proyectos' : 'Proyectos con acompañamiento técnico'}
        description={
          user
            ? 'Consulta el estado, la orientación técnica, la cotización y el historial de cada proyecto.'
            : 'Para humedad, fisuras, fachadas o áreas grandes te acompañamos desde el diagnóstico hasta la entrega.'
        }
        actions={
          <Button icon={<PlusCircle className="w-4 h-4" />} onClick={crear}>
            Nuevo proyecto
          </Button>
        }
      />

      {user &&
        (loading ? (
          <Spinner label="Cargando tus proyectos…" />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !proyectos?.length ? (
          <EmptyState
            icon={<FolderOpen className="w-6 h-6" />}
            title="Todavía no tienes proyectos"
            description="Registra tu primer proyecto y recibe orientación técnica y cotización sin salir de casa."
            action={<Button onClick={crear}>Crear mi primer proyecto</Button>}
          />
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {proyectos.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => navigate('detalle-proyecto', p.id)}
                  className="w-full text-left bg-white border border-[#E7EAF0] rounded-2xl p-5 hover:border-[#155EEF]/40 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-xs font-bold text-slate-500">{p.codigo}</span>
                    {getStatusBadge(p.estado)}
                  </div>
                  <h2 className="mt-2 font-display text-lg font-bold text-[#092653] group-hover:text-[#155EEF]">{p.nombre}</h2>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {p.ciudad}
                    </span>
                    {p.area_m2 && (
                      <span>
                        {p.area_m2} m² · {superficieLabel(p.tipo_superficie)}
                      </span>
                    )}
                    <span>Actualizado {fecha(p.updated_at || p.created_at)}</span>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#155EEF]">
                    Ver seguimiento <ChevronRight className="w-4 h-4" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
};
