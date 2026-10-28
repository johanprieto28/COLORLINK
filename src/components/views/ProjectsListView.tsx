import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  PlusCircle,
  Search,
  Filter,
  MapPin,
  Calendar,
  ChevronRight,
  Building,
  AlertCircle,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { ProjectStatus } from '../../types';
import { projectService } from '../../services/projects/projectService';
import { authService } from '../../services/auth/authService';
import { getStatusBadge, getSeverityBadge } from '../common/Badge';

interface ProjectsListViewProps {
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  title?: string;
  subtitle?: string;
  allowedStatuses?: ProjectStatus[];
}

function getNextActivityLabel(status: ProjectStatus): string {
  switch (status) {
    case 'BORRADOR':
      return 'Completar datos iniciales del proyecto';
    case 'RECIBIDO':
      return 'Asignación y revisión inicial del expediente';
    case 'EN_ANALISIS':
    case 'VALIDACION_TECNICA':
      return 'Evaluación de condiciones y diagnóstico por especialista técnico';
    case 'SOLUCION_GENERADA':
      return 'Preparación de alternativa comercial y cotización';
    case 'COTIZACION':
      return 'Revisión de propuesta económica por parte del cliente';
    case 'APROBADO':
    case 'ABASTECIMIENTO':
    case 'SERVICIO_PROGRAMADO':
      return 'Programación de materiales e inicio de intervención';
    case 'EN_EJECUCION':
    case 'CALIDAD':
      return 'Verificación de acabado y pruebas de calidad';
    case 'CERRADO':
      return 'Proyecto finalizado y documentado';
    default:
      return 'Consultar bitácora del expediente';
  }
}

export const ProjectsListView: React.FC<ProjectsListViewProps> = ({
  onSelectProject,
  onCreateProject,
  title,
  subtitle,
  allowedStatuses,
}) => {
  const activeRole = authService.getActiveRole();
  const currentUser = authService.getCurrentUser();
  const [, setTick] = useState(0);
  const [retryingSync, setRetryingSync] = useState(false);

  useEffect(() => {
    const unsub = projectService.subscribe(() => setTick((t) => t + 1));
    projectService.syncFromSupabase();
    return unsub;
  }, []);

  const handleRetrySync = async () => {
    setRetryingSync(true);
    try {
      await projectService.syncFromSupabase();
      setTick((t) => t + 1);
    } finally {
      setRetryingSync(false);
    }
  };

  const allProjects = projectService.getProjects(activeRole, currentUser.id);
  const syncErrors = projectService.getSyncErrors();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');

  let filtered = allProjects;

  if (allowedStatuses && allowedStatuses.length > 0) {
    filtered = filtered.filter((p) => allowedStatuses.includes(p.estado));
  }

  if (selectedStatus !== 'TODOS') {
    filtered = filtered.filter((p) => p.estado === selectedStatus);
  }

  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.codigo.toLowerCase().includes(term) ||
        p.nombre.toLowerCase().includes(term) ||
        p.ciudad.toLowerCase().includes(term) ||
        p.cliente?.nombre.toLowerCase().includes(term) ||
        p.cliente?.empresa?.toLowerCase().includes(term)
    );
  }

  const defaultTitle =
    activeRole === 'cliente'
      ? 'Mis proyectos y seguimiento'
      : activeRole === 'tecnico'
      ? 'Proyectos asignados para análisis técnico'
      : activeRole === 'comercial'
      ? 'Proyectos para gestión comercial y cotización'
      : activeRole === 'operaciones'
      ? 'Proyectos aprobados para ejecución y calidad'
      : 'Gestión general de proyectos COLORLINK';

  const defaultSubtitle =
    activeRole === 'cliente'
      ? 'Consulta la ubicación, fecha de registro, estado actual y próxima etapa de cada uno de tus proyectos.'
      : 'Expedientes organizados según su etapa dentro del flujo técnico y comercial.';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Encabezado de sección */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0891B2]">
            Seguimiento de proyectos
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] tracking-tight">
            {title || defaultTitle}
          </h1>
          <p className="text-sm text-slate-600">{subtitle || defaultSubtitle}</p>
        </div>

        <button
          type="button"
          onClick={onCreateProject}
          className="self-start md:self-center px-5 py-3 bg-[#0891B2] hover:bg-[#0E7490] text-white rounded-xl text-xs font-semibold shadow-sm inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Crear nuevo proyecto</span>
        </button>
      </div>

      {/* Estado de lectura real desde Supabase con opción de reintentar */}
      {(syncErrors.clienteError || syncErrors.proyectoError) && (
        <div className="p-4 sm:p-5 bg-amber-50/90 border border-amber-200 rounded-2xl text-xs text-amber-950 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="font-bold text-amber-900 flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Aviso de sincronización con la base de datos en línea</span>
            </div>

            <button
              type="button"
              onClick={handleRetrySync}
              disabled={retryingSync}
              className="self-start sm:self-center inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 font-semibold text-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retryingSync ? 'animate-spin' : ''}`} />
              <span>{retryingSync ? 'Consultando...' : 'Reintentar conexión'}</span>
            </button>
          </div>

          <p className="text-amber-800 leading-relaxed">
            No se pudo completar la lectura en tiempo real desde Supabase; se muestran temporalmente
            los expedientes locales de referencia sin modificar tus registros:
          </p>

          <div className="p-2.5 rounded-xl bg-white/80 border border-amber-200/80 font-mono text-[11px] text-amber-900 space-y-1">
            {syncErrors.clienteError && (
              <div className="break-words">• public.cliente: {syncErrors.clienteError}</div>
            )}
            {syncErrors.proyectoError && (
              <div className="break-words">• public.proyecto: {syncErrors.proyectoError}</div>
            )}
          </div>
        </div>
      )}

      {/* Resumen numérico rápido */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
          <span className="text-xs font-medium text-slate-500 block">Total de proyectos</span>
          <span className="text-2xl font-extrabold text-[#0B1F3A] tabular-nums mt-0.5 block">
            {allProjects.length}
          </span>
        </div>
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
          <span className="text-xs font-medium text-slate-500 block">Recibidos / En análisis</span>
          <span className="text-2xl font-extrabold text-[#1D4ED8] tabular-nums mt-0.5 block">
            {
              allProjects.filter((p) =>
                ['RECIBIDO', 'EN_ANALISIS', 'VALIDACION_TECNICA', 'SOLUCION_GENERADA'].includes(
                  p.estado
                )
              ).length
            }
          </span>
        </div>
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
          <span className="text-xs font-medium text-slate-500 block">En cotización</span>
          <span className="text-2xl font-extrabold text-amber-700 tabular-nums mt-0.5 block">
            {allProjects.filter((p) => p.estado === 'COTIZACION').length}
          </span>
        </div>
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
          <span className="text-xs font-medium text-slate-500 block">Aprobados / Cerrados</span>
          <span className="text-2xl font-extrabold text-emerald-700 tabular-nums mt-0.5 block">
            {
              allProjects.filter((p) =>
                ['APROBADO', 'EN_EJECUCION', 'CERRADO'].includes(p.estado)
              ).length
            }
          </span>
        </div>
      </div>

      {/* Buscador y filtro por estado */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre del proyecto, código o ciudad..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1D4ED8]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1D4ED8]"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="RECIBIDO">Recibido</option>
            <option value="EN_ANALISIS">En análisis</option>
            <option value="SOLUCION_GENERADA">Solución propuesta</option>
            <option value="COTIZACION">Cotización</option>
            <option value="APROBADO">Aprobado</option>
            <option value="EN_EJECUCION">En ejecución</option>
            <option value="CERRADO">Cerrado</option>
          </select>
        </div>
      </div>

      {/* Listado de tarjetas de proyectos */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-3">
          <FolderGit2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-[#0B1F3A]">No encontramos proyectos con ese criterio</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm || selectedStatus !== 'TODOS'
              ? 'Prueba ajustando el texto de búsqueda o seleccionando todos los estados.'
              : 'Aún no tienes proyectos registrados. Crea el primero en pocos pasos.'}
          </p>
          <button
            type="button"
            onClick={onCreateProject}
            className="mt-2 px-5 py-2.5 bg-[#0891B2] hover:bg-[#0E7490] text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Crear mi proyecto</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((proj) => {
            const area = proj.areas[0];
            const createdDate = proj.created_at ? proj.created_at.split('T')[0] : proj.fecha_requerida;
            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className="p-6 bg-white border border-slate-200/90 hover:border-[#1D4ED8]/50 rounded-2xl flex flex-col justify-between space-y-5 transition-all cursor-pointer group shadow-2xs hover:shadow-md"
              >
                <div className="space-y-3.5">
                  {/* Código y estado actual */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-semibold text-slate-500">
                      {proj.codigo}
                    </span>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(proj.estado)}
                    </div>
                  </div>

                  {/* Nombre y ubicación */}
                  <div>
                    <h3 className="text-lg font-bold text-[#0B1F3A] group-hover:text-[#1D4ED8] transition-colors">
                      {proj.nombre}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{proj.ciudad}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Creado: {createdDate}</span>
                      </span>
                      {proj.cliente && (
                        <span className="inline-flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{proj.cliente.empresa || proj.cliente.nombre}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Resumen de superficie */}
                  {area && (
                    <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 text-[11px] block">Superficie y área</span>
                        <span className="font-semibold text-[#0B1F3A] truncate block tabular-nums">
                          {area.tipo_superficie} · {area.area_m2} {area.unidad_medida}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Condición reportada</span>
                        <span className="font-semibold text-slate-700">
                          Humedad {area.humedad.toLowerCase()} ·{' '}
                          {area.fisuras ? 'Con fisuras' : 'Sin fisuras'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Próxima actividad */}
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <Clock className="w-4 h-4 text-[#0891B2] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#0B1F3A]">Próxima actividad: </span>
                      <span>{getNextActivityLabel(proj.estado)}</span>
                    </div>
                  </div>

                  {proj.diagnostico && (
                    <div className="pt-1 flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Evaluación preliminar:</span>
                      {getSeverityBadge(proj.diagnostico.severidad)}
                    </div>
                  )}
                </div>

                {/* Pie de tarjeta con acceso al detalle */}
                <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 tabular-nums">
                    Fecha estimada: {proj.fecha_requerida}
                  </span>

                  <span className="text-[#1D4ED8] font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    <span>Ver detalle del proyecto</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
