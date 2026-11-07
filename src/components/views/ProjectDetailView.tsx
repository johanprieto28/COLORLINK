import React, { useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Building,
  Calendar,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  DollarSign,
  FileText,
  Layers,
  Mail,
  MapPin,
  Phone,
  Plus,
  Printer,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  Wrench,
  XCircle,
  FileDown,
} from 'lucide-react';
import type {
  CapaSistema,
  CategoriaItemCotizacion,
  Cotizacion,
  ItemCotizacion,
  MetodoAplicacion,
  ProjectStatus,
  Proyecto,
  ServicioCampo,
} from '../../types';
import { CATEGORIA_NECESIDAD_LABELS, PROJECT_STATUS_LABELS } from '../../types';
import { api, descargarArchivo, errorMessage, fileToUpload } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { navigate } from '../../lib/router';
import { cop, fecha, superficieLabel } from '../../lib/format';
import { isStaffRole, useAuth } from '../../stores/auth';
import { getComplexityBadge, getSeverityBadge, getStatusBadge } from '../common/Badge';
import { ValidacionReportePanel } from '../common/ValidacionReportePanel';
import { useColores } from '../../lib/useColores';
import { galonesEstimados } from '../../data/colores';
import { Button, Card, EmptyState, ErrorBox, Field, Input, Modal, Select, Spinner, Textarea, toast } from '../ui';

type Tab = 'resumen' | 'evidencias' | 'diagnostico' | 'solucion' | 'cotizacion' | 'ejecucion' | 'historial';

const ETAPAS: Array<{ estados: ProjectStatus[]; label: string }> = [
  { estados: ['RECIBIDO'], label: 'Recibido' },
  { estados: ['EN_ANALISIS', 'VALIDACION_TECNICA'], label: 'Análisis técnico' },
  { estados: ['SOLUCION_GENERADA'], label: 'Solución' },
  { estados: ['COTIZACION'], label: 'Cotización' },
  { estados: ['APROBADO', 'ABASTECIMIENTO', 'SERVICIO_PROGRAMADO'], label: 'Aprobado' },
  { estados: ['EN_EJECUCION', 'CALIDAD'], label: 'Ejecución' },
  { estados: ['CERRADO'], label: 'Entregado' },
];

/** Ejecuta una acción sobre el proyecto y actualiza la vista con la respuesta del servidor */
function useProjectAction(setProject: (p: Proyecto) => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<Proyecto>, exito?: string) => {
    setBusy(key);
    try {
      setProject(await fn());
      if (exito) toast(exito);
      return true;
    } catch (err) {
      toast(errorMessage(err), 'error');
      return false;
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
}

export const ProjectDetailView: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { user } = useAuth();
  const { data: project, setData, loading, error, reload } = useApi<Proyecto>(`/proyectos/${encodeURIComponent(projectId)}`);
  const [tab, setTab] = useState<Tab>('resumen');
  const setProject = (p: Proyecto) => setData(p);
  const { busy, run } = useProjectAction(setProject);
  const [cancelOpen, setCancelOpen] = useState(false);
  const staff = isStaffRole(user);

  if (loading && !project) return <Spinner label="Cargando proyecto…" />;
  if (error || !project) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-4">
        <ErrorBox message={error || 'Proyecto no encontrado.'} onRetry={reload} />
        <Button variant="secondary" onClick={() => navigate(staff ? 'panel' : 'mis-proyectos', staff ? 'proyectos' : undefined)}>
          Volver
        </Button>
      </div>
    );
  }

  const p = project.permisos;
  const area = project.areas[0];
  const etapaActual = ETAPAS.findIndex((e) => e.estados.includes(project.estado));
  const cotizacionPendiente = project.cotizaciones.find((c) => c.estado === 'ENVIADA');

  const transicion = (estado: ProjectStatus) =>
    run(`estado-${estado}`, () => api.post<Proyecto>(`/proyectos/${project.id}/estado`, { estado }), `Proyecto en "${PROJECT_STATUS_LABELS[estado]}".`);

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'resumen', label: 'Resumen', icon: <Layers className="w-4 h-4" /> },
    { id: 'evidencias', label: `Evidencias (${project.evidencias.length})`, icon: <Camera className="w-4 h-4" /> },
    { id: 'diagnostico', label: 'Diagnóstico', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'solucion', label: 'Solución', icon: <Wrench className="w-4 h-4" /> },
    { id: 'cotizacion', label: 'Cotización', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'ejecucion', label: 'Ejecución', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'historial', label: 'Historial', icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <button
        type="button"
        onClick={() => (staff ? navigate('panel', 'proyectos') : navigate('mis-proyectos'))}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#092653] cursor-pointer print:hidden"
      >
        <ArrowLeft className="w-4 h-4" />
        {staff ? 'Volver al panel' : 'Mis proyectos'}
      </button>

      {/* Cabecera */}
      <Card className="p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-[#FAFAF7] text-[#092653] border border-[#E7EAF0]">
              {project.codigo}
            </span>
            {getStatusBadge(project.estado)}
            {project.prioridad !== 'NORMAL' && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                Prioridad {project.prioridad.toLowerCase()}
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#092653] tracking-tight">{project.nombre}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Building className="w-4 h-4 text-slate-400" />
              {project.cliente.empresa || project.cliente.nombre}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-400" />
              {project.ciudad}
              {project.direccion ? ` · ${project.direccion}` : ''}
            </span>
            {project.fecha_requerida && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                Requerido para {fecha(project.fecha_requerida)}
              </span>
            )}
          </div>
          {staff && (
            <p className="text-xs text-slate-500">
              Técnico: <strong>{project.tecnico_nombre || 'sin asignar'}</strong> · Comercial:{' '}
              <strong>{project.comercial_nombre || 'sin asignar'}</strong>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
          {p.puedeTomarComoTecnico && user?.rol !== 'administrador' && (
            <Button
              variant="secondary"
              icon={<UserCheck className="w-4 h-4" />}
              loading={busy === 'asignar'}
              onClick={() => run('asignar', () => api.post<Proyecto>(`/proyectos/${project.id}/asignarme`), 'Te asignaste el proyecto.')}
            >
              Asignármelo
            </Button>
          )}
          {user?.rol === 'comercial' && project.comercial_id !== user.id && (
            <Button
              variant="secondary"
              icon={<UserCheck className="w-4 h-4" />}
              loading={busy === 'asignar'}
              onClick={() => run('asignar', () => api.post<Proyecto>(`/proyectos/${project.id}/asignarme`), 'Te asignaste el proyecto.')}
            >
              Asignármelo
            </Button>
          )}
          {p.transicionesPermitidas.map((estado) => (
            <Button key={estado} loading={busy === `estado-${estado}`} onClick={() => transicion(estado)}>
              Pasar a {PROJECT_STATUS_LABELS[estado].toLowerCase()}
            </Button>
          ))}
          {p.puedeResponderCotizacion && (
            <Button variant="accent" onClick={() => setTab('cotizacion')}>
              Revisar cotización
            </Button>
          )}
          {p.puedeCancelar && (
            <Button variant="danger" icon={<XCircle className="w-4 h-4" />} onClick={() => setCancelOpen(true)}>
              Cancelar
            </Button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            title="Imprimir resumen"
            aria-label="Imprimir resumen"
            className="p-2.5 bg-[#FAFAF7] hover:bg-slate-100 text-slate-700 rounded-xl border border-[#E7EAF0] cursor-pointer"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </Card>

      {cotizacionPendiente && p.puedeResponderCotizacion && (
        <div className="p-4 rounded-2xl bg-[#FFE34D]/30 border border-[#FFE34D] flex flex-wrap items-center justify-between gap-3 text-sm text-[#092653]">
          <span>
            Tienes una cotización por <strong>{cop(cotizacionPendiente.total)}</strong> esperando tu respuesta.
          </span>
          <Button size="sm" onClick={() => setTab('cotizacion')}>
            Ver y responder
          </Button>
        </div>
      )}

      {/* Línea de avance */}
      {project.estado !== 'CANCELADO' ? (
        <Card className="p-5 overflow-x-auto">
          <ol className="flex items-center min-w-[620px]">
            {ETAPAS.map((etapa, idx) => {
              const hecho = idx < etapaActual;
              const actual = idx === etapaActual;
              return (
                <React.Fragment key={etapa.label}>
                  <li className="flex flex-col items-center gap-1.5 shrink-0">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        actual
                          ? 'bg-[#08B6CC] text-white ring-4 ring-[#08B6CC]/20'
                          : hecho
                            ? 'bg-[#092653] text-white'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {hecho ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </span>
                    <span className={`text-xs whitespace-nowrap ${actual ? 'font-bold text-[#092653]' : hecho ? 'text-slate-700' : 'text-slate-400'}`}>
                      {etapa.label}
                    </span>
                  </li>
                  {idx < ETAPAS.length - 1 && <li aria-hidden="true" className={`flex-1 h-0.5 mx-2 ${hecho ? 'bg-[#092653]' : 'bg-slate-200'}`} />}
                </React.Fragment>
              );
            })}
          </ol>
        </Card>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-sm text-slate-700">Este proyecto fue cancelado.</div>
      )}

      {/* Pestañas */}
      <div role="tablist" className="flex gap-1 border-b border-[#E7EAF0] overflow-x-auto no-scrollbar print:hidden">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
              tab === t.id ? 'border-[#155EEF] text-[#155EEF]' : 'border-transparent text-slate-600 hover:text-[#092653]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 p-6 space-y-5">
            <h2 className="font-display text-base font-extrabold text-[#092653]">Superficie y condiciones</h2>
            {area ? (
              <>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <Dato label="Superficie" value={superficieLabel(area.tipo_superficie)} />
                  <Dato label="Área" value={`${area.area_m2} m²`} />
                  <Dato label="Ubicación" value={area.ubicacion.toLowerCase()} />
                  <Dato label="Humedad" value={area.humedad.toLowerCase()} />
                  <Dato label="Fisuras" value={area.fisuras ? `Sí${area.tipo_fisura ? ` (${area.tipo_fisura.toLowerCase()})` : ''}` : 'No'} />
                  <Dato label="Desgaste" value={area.desgaste.toLowerCase()} />
                  <Dato label="Desprendimiento" value={area.desprendimiento ? 'Sí' : 'No'} />
                  <Dato label="Color actual" value={area.color_actual || '—'} />
                  <ColoresProyecto ids={area.colores || []} texto={area.color_requerido} areaM2={Number(area.area_m2)} />
                </dl>
                <div className="p-4 bg-[#FAFAF7] rounded-xl border border-[#E7EAF0]">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">Necesidad descrita</span>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{area.descripcion_problema || 'Sin descripción.'}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Sin superficie registrada.</p>
            )}
            {staff && project.validacion && <ValidacionReportePanel reporte={project.validacion} titulo="Validación automática al registrar" />}
          </Card>
          <Card className="p-6 space-y-3 text-sm">
            <h2 className="font-display text-base font-extrabold text-[#092653]">Titular</h2>
            <p className="font-bold text-[#092653]">{project.cliente.nombre}</p>
            {project.cliente.empresa && <p className="text-slate-600">{project.cliente.empresa}</p>}
            {project.cliente.documento && (
              <p className="text-slate-600 font-mono text-xs">
                {project.cliente.tipo_cliente !== 'PERSONA_NATURAL' ? 'NIT' : project.cliente.tipo_documento || 'Doc.'} {project.cliente.documento}
              </p>
            )}
            <p className="flex items-center gap-2 text-slate-700">
              <Phone className="w-4 h-4 text-[#08B6CC]" />
              {project.cliente.telefono}
            </p>
            <p className="flex items-center gap-2 text-slate-700 break-all">
              <Mail className="w-4 h-4 text-[#08B6CC] shrink-0" />
              {project.cliente.correo}
            </p>
            {project.consentimiento && (
              <p className="pt-3 border-t border-[#E7EAF0] flex items-start gap-2 text-xs text-emerald-700">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                Autorización de datos y uso técnico registrada el {fecha(project.consentimiento.created_at)}.
              </p>
            )}
          </Card>
        </div>
      )}

      {tab === 'evidencias' && <EvidenciasTab project={project} onUpdated={setProject} />}
      {tab === 'diagnostico' && <DiagnosticoTab project={project} run={run} busy={busy} />}
      {tab === 'solucion' && <SolucionTab project={project} run={run} busy={busy} />}
      {tab === 'cotizacion' && <CotizacionTab project={project} run={run} busy={busy} />}
      {tab === 'ejecucion' && <EjecucionTab project={project} run={run} busy={busy} />}
      {tab === 'historial' && (
        <ol className="space-y-3">
          {project.actividades.map((act) => (
            <li key={act.id}>
              <Card className="p-4 flex items-start gap-4 text-sm">
                <span className="w-9 h-9 rounded-xl bg-[#FAFAF7] border border-[#E7EAF0] flex items-center justify-center shrink-0 text-[#08B6CC]">
                  <Activity className="w-4 h-4" />
                </span>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-[#092653]">{act.titulo}</span>
                    <span className="text-xs text-slate-400">{fecha(act.created_at, true)}</span>
                  </div>
                  {act.descripcion && <p className="text-slate-600">{act.descripcion}</p>}
                  <p className="text-xs text-slate-500">
                    {act.usuario_nombre} · {act.usuario_rol}
                  </p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}

      <CancelModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        loading={busy === 'cancelar'}
        onConfirm={async (motivo) => {
          const ok = await run(
            'cancelar',
            () => api.post<Proyecto>(`/proyectos/${project.id}/estado`, { estado: 'CANCELADO', motivo }),
            'Proyecto cancelado.'
          );
          if (ok) setCancelOpen(false);
        }}
      />
    </div>
  );
};

type RunFn = ReturnType<typeof useProjectAction>['run'];
interface TabProps {
  project: Proyecto;
  run: RunFn;
  busy: string | null;
}

/** Colores elegidos para la superficie, con su muestra y los galones estimados */
const ColoresProyecto: React.FC<{ ids: string[]; texto?: string | null; areaM2: number }> = ({ ids, texto, areaM2 }) => {
  const { colores } = useColores();
  if (!ids.length) return <Dato label="Colores" value={texto || 'Por definir con el asesor'} />;
  const galones = galonesEstimados(areaM2, ids.length);
  return (
    <div className="p-3 bg-[#FAFAF7] rounded-xl border border-[#E7EAF0] sm:col-span-2">
      <dt className="text-[11px] text-slate-500 mb-1.5">Colores</dt>
      <dd className="flex flex-wrap gap-2">
        {ids.map((id, i) => {
          const c = colores?.find((x) => x.id === id);
          return (
            <span key={id} className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white border border-[#E7EAF0]">
              <span className="w-6 h-6 rounded-full border border-black/10" style={{ backgroundColor: c?.hex ?? '#E7EAF0' }} />
              <span className="text-sm font-semibold text-[#092653]">{c?.nombre ?? id}</span>
              <span className="text-[11px] text-slate-500">
                {i === 0 ? 'principal' : 'secundario'}
                {galones[i] ? ` · ≈ ${galones[i]} gal` : ''}
              </span>
            </span>
          );
        })}
      </dd>
    </div>
  );
};

const Dato: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="p-3 bg-[#FAFAF7] rounded-xl border border-[#E7EAF0]">
    <dt className="text-[11px] text-slate-500">{label}</dt>
    <dd className="font-semibold text-[#092653] first-letter:uppercase break-words">{value}</dd>
  </div>
);

const CancelModal: React.FC<{ open: boolean; onClose: () => void; loading: boolean; onConfirm: (motivo: string) => void }> = ({
  open,
  onClose,
  loading,
  onConfirm,
}) => {
  const [motivo, setMotivo] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Cancelar proyecto">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Esta acción detiene el proceso. Cuéntanos el motivo para mejorar.</p>
        <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (opcional)" />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button variant="danger" loading={loading} onClick={() => onConfirm(motivo)}>
            Cancelar proyecto
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ------------------------------------------------------------------------------
// Fotos
// ------------------------------------------------------------------------------
const EvidenciasTab: React.FC<{ project: Proyecto; onUpdated: (p: Proyecto) => void }> = ({ project, onUpdated }) => {
  const [subiendo, setSubiendo] = useState(false);

  const subir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setSubiendo(true);
    try {
      let actualizado: Proyecto | null = null;
      for (const file of files) {
        const upload = await fileToUpload(file);
        actualizado = await api.post<Proyecto>(`/proyectos/${project.id}/evidencias`, upload);
      }
      if (actualizado) onUpdated(actualizado);
      toast(files.length === 1 ? 'Evidencia agregada.' : `${files.length} evidencias agregadas.`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="space-y-5">
      {project.permisos.puedeSubirEvidencias && (
        <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-extrabold text-[#092653]">Fotos y documentos del espacio</h2>
            <p className="text-sm text-slate-600">Agrega fotos con buena luz, de cerca y de lejos, o documentos PDF. Máximo 8 MB cada uno.</p>
          </div>
          <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#08B6CC] hover:bg-[#092653] text-white text-sm font-semibold cursor-pointer shrink-0">
            <Upload className="w-4 h-4" />
            {subiendo ? 'Subiendo…' : 'Agregar fotos'}
            <input type="file" accept="image/*,application/pdf" multiple onChange={subir} disabled={subiendo} className="sr-only" />
          </label>
        </Card>
      )}
      {project.evidencias.length === 0 ? (
        <EmptyState icon={<Camera className="w-6 h-6" />} title="Aún no hay evidencias" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {project.evidencias.map((ev) => (
            <Card key={ev.id} className="overflow-hidden">
              <a href={ev.url || undefined} target="_blank" rel="noreferrer" className="block aspect-[4/3] bg-slate-100">
                {ev.mime_type === 'application/pdf' ? (
                  <span className="w-full h-full flex flex-col items-center justify-center gap-2 text-rose-600">
                    <FileText className="w-10 h-10" />
                    <span className="text-xs font-semibold text-slate-600">Documento PDF</span>
                  </span>
                ) : ev.url ? (
                  <img src={ev.url} alt={ev.descripcion || ev.nombre_archivo} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-xs text-slate-400">Vista previa no disponible</span>
                )}
              </a>
              <div className="p-4 text-sm space-y-1">
                <p className="font-semibold text-[#092653] truncate">{ev.descripcion || ev.nombre_archivo}</p>
                <p className="text-xs text-slate-400">{fecha(ev.created_at, true)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------------------
// Diagnóstico
// ------------------------------------------------------------------------------
const DiagnosticoTab: React.FC<TabProps> = ({ project, run, busy }) => {
  const d = project.diagnostico;
  const [editando, setEditando] = useState(false);
  const formDesde = (diag: typeof d) => ({
    severidad: diag?.severidad || 'MODERADO',
    complejidad: diag?.complejidad || 'MEDIA',
    patologias: (diag?.patologias || []).join('\n'),
    recomendacion_preliminar: diag?.recomendacion_preliminar || '',
    preparacion_superficie_recomendada: diag?.preparacion_superficie_recomendada || '',
    observaciones_tecnicas: diag?.observaciones_tecnicas || '',
    norma_aplicable: diag?.norma_aplicable || '',
  });
  const [form, setForm] = useState(() => formDesde(d));
  const abrirEditor = () => {
    setForm(formDesde(d));
    setEditando(true);
  };

  const regenerar = () =>
    run('diag', () => api.post<Proyecto>(`/proyectos/${project.id}/diagnostico`), 'Orientación técnica actualizada.');

  const validar = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(
      'validar',
      () =>
        api.patch<Proyecto>(`/proyectos/${project.id}/diagnostico`, {
          ...form,
          patologias: form.patologias.split('\n').map((s) => s.trim()).filter(Boolean),
        }),
      'Diagnóstico validado.'
    );
    if (ok) setEditando(false);
  };

  if (!d) {
    return (
      <EmptyState
        icon={<Sparkles className="w-6 h-6" />}
        title="Aún no hay orientación técnica"
        action={
          project.permisos.puedeDiagnosticar && (
            <Button loading={busy === 'diag'} onClick={regenerar}>
              Generar orientación
            </Button>
          )
        }
      />
    );
  }

  if (editando) {
    return (
      <Card className="p-6">
        <form onSubmit={validar} className="space-y-4">
          <h2 className="font-display font-extrabold text-[#092653]">Validar y ajustar diagnóstico</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Severidad">
              <Select value={form.severidad} onChange={(e) => setForm({ ...form, severidad: e.target.value as any })}>
                {['LEVE', 'MODERADO', 'SEVERO', 'CRITICO'].map((s) => (
                  <option key={s} value={s}>
                    {s.toLowerCase()}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Complejidad">
              <Select value={form.complejidad} onChange={(e) => setForm({ ...form, complejidad: e.target.value as any })}>
                {['BAJA', 'MEDIA', 'ALTA', 'CRITICA'].map((s) => (
                  <option key={s} value={s}>
                    {s.toLowerCase()}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Condiciones detectadas" hint="Una por línea.">
            <Textarea rows={4} value={form.patologias} onChange={(e) => setForm({ ...form, patologias: e.target.value })} />
          </Field>
          <Field label="Recomendación" required>
            <Textarea rows={4} required value={form.recomendacion_preliminar} onChange={(e) => setForm({ ...form, recomendacion_preliminar: e.target.value })} />
          </Field>
          <Field label="Preparación de superficie" required>
            <Textarea rows={2} required value={form.preparacion_superficie_recomendada} onChange={(e) => setForm({ ...form, preparacion_superficie_recomendada: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Observaciones técnicas">
              <Textarea rows={2} value={form.observaciones_tecnicas} onChange={(e) => setForm({ ...form, observaciones_tecnicas: e.target.value })} />
            </Field>
            <Field label="Norma aplicable">
              <Input value={form.norma_aplicable} onChange={(e) => setForm({ ...form, norma_aplicable: e.target.value })} placeholder="Ej. SSPC-SP 13" />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={busy === 'validar'}>
              Guardar y validar
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  const c = d.clasificacion;

  return (
    <div className="space-y-5">
      {c && (
        <Card className="p-6 space-y-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-[#092653] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#08B6CC]" />
              Clasificación de la necesidad
            </h3>
            <span className="text-xs text-slate-500">
              {c.motor === 'GEMINI'
                ? `Gemini · ${c.archivosAnalizados} archivo(s) analizados`
                : 'Motor de reglas (sin interpretación de texto ni imágenes)'}
            </span>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Dato label="Categoría" value={CATEGORIA_NECESIDAD_LABELS[c.categoria] || c.categoria} />
            <Dato label="Condición" value={c.condicion} />
            <Dato label="Complejidad" value={c.complejidad.toLowerCase()} />
            <Dato label="Confianza" value={`${Math.round(c.confianza * 100)} %`} />
          </dl>
          {c.confianza < 0.6 && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
              Confianza baja: un especialista debe revisar el caso antes de proponer la solución.
            </p>
          )}
          {c.hallazgosVisuales.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-slate-500 block mb-1.5">Lo que se observa en las fotos</span>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                {c.hallazgosVisuales.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          )}
          {c.textoExtraido && (
            <div>
              <span className="text-xs font-semibold text-slate-500 block mb-1.5">Texto extraído de fotos y documentos</span>
              <p className="p-3 bg-[#FAFAF7] border border-[#E7EAF0] rounded-xl text-xs text-slate-700 whitespace-pre-line font-mono">
                {c.textoExtraido}
              </p>
            </div>
          )}
        </Card>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-xs text-slate-500 block mb-1.5">Severidad</span>
          {getSeverityBadge(d.severidad)}
        </Card>
        <Card className="p-4">
          <span className="text-xs text-slate-500 block mb-1.5">Complejidad</span>
          {getComplexityBadge(d.complejidad)}
        </Card>
        <Card className="p-4">
          <span className="text-xs text-slate-500 block mb-1.5">Revisión</span>
          <span className="text-sm font-bold text-[#092653]">
            {d.validado_por ? `Validado por ${d.validado_por_nombre || 'el técnico'}` : 'Preliminar, pendiente de validación'}
          </span>
        </Card>
      </div>
      <Card className="p-6 space-y-4 text-sm">
        <div>
          <h3 className="font-bold text-[#092653] mb-2">Condiciones detectadas</h3>
          <div className="flex flex-wrap gap-2">
            {d.patologias.map((pat) => (
              <span key={pat} className="px-3 py-1.5 bg-[#FAFAF7] border border-[#E7EAF0] rounded-xl text-slate-700">
                {pat}
              </span>
            ))}
          </div>
        </div>
        <div className="pt-4 border-t border-[#E7EAF0]">
          <h3 className="font-bold text-[#092653] mb-1">Recomendación</h3>
          <p className="text-slate-700 leading-relaxed whitespace-pre-line">{d.recomendacion_preliminar}</p>
        </div>
        <div className="pt-4 border-t border-[#E7EAF0]">
          <h3 className="font-bold text-[#092653] mb-1">Preparación de superficie</h3>
          <p className="text-[#155EEF]">{d.preparacion_superficie_recomendada}</p>
        </div>
        {d.observaciones_tecnicas && (
          <div className="pt-4 border-t border-[#E7EAF0]">
            <h3 className="font-bold text-[#092653] mb-1">Observaciones del técnico</h3>
            <p className="text-slate-700">{d.observaciones_tecnicas}</p>
          </div>
        )}
      </Card>
      <p className="flex items-start gap-2.5 p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-sm text-slate-700">
        <ShieldCheck className="w-4 h-4 shrink-0 text-[#155EEF] mt-0.5" />
        {d.validado_por
          ? 'Diagnóstico revisado por el equipo técnico de COLORLINK.'
          : `Orientación preliminar generada por ${d.origen_motor === 'GEMINI' ? 'COLORLINK IA' : 'el motor técnico de COLORLINK'}. Un técnico debe validarla.`}
      </p>
      {project.permisos.puedeDiagnosticar && (
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button onClick={abrirEditor} icon={<CheckCircle2 className="w-4 h-4" />}>
            Validar / ajustar
          </Button>
          <Button variant="secondary" loading={busy === 'diag'} onClick={regenerar} icon={<Sparkles className="w-4 h-4" />}>
            Regenerar con IA
          </Button>
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------------------
// Solución técnica
// ------------------------------------------------------------------------------
const METODOS: Array<[MetodoAplicacion, string]> = [
  ['BROCHA_RODILLO', 'Brocha y rodillo'],
  ['AIRLESS', 'Equipo airless'],
  ['ASPERSION_CONVENCIONAL', 'Aspersión convencional'],
  ['LLANA', 'Llana'],
];

const SolucionTab: React.FC<TabProps> = ({ project, run, busy }) => {
  const s = project.solucion_tecnica;
  const sugerido = project.diagnostico?.sistema_sugerido;
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(() => ({
    nombre_sistema: s?.nombre_sistema || sugerido?.nombreSistema || '',
    descripcion_sistema: s?.descripcion_sistema || '',
    preparacion_superficie: s?.preparacion_superficie || project.diagnostico?.preparacion_superficie_recomendada || '',
    metodo_aplicacion: s?.metodo_aplicacion || ('BROCHA_RODILLO' as MetodoAplicacion),
    garantia_anos: s?.garantia_anos ?? sugerido?.garantiaEstimadaAnos ?? 3,
    observaciones: s?.observaciones || '',
    capas: (s?.capas || sugerido?.capas || []).map((c) => ({ ...c })) as CapaSistema[],
  }));

  const setCapa = (i: number, patch: Partial<CapaSistema>) =>
    setForm((f) => ({ ...f, capas: f.capas.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run('solucion', () => api.put<Proyecto>(`/proyectos/${project.id}/solucion`, form), 'Solución técnica guardada.');
    if (ok) setEditando(false);
  };

  if (editando) {
    return (
      <Card className="p-6">
        <form onSubmit={guardar} className="space-y-5">
          <h2 className="font-display font-extrabold text-[#092653]">Especificación del sistema</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre del sistema" required className="sm:col-span-2">
              <Input required value={form.nombre_sistema} onChange={(e) => setForm({ ...form, nombre_sistema: e.target.value })} />
            </Field>
            <Field label="Preparación de superficie" required className="sm:col-span-2">
              <Textarea rows={2} required value={form.preparacion_superficie} onChange={(e) => setForm({ ...form, preparacion_superficie: e.target.value })} />
            </Field>
            <Field label="Método de aplicación">
              <Select value={form.metodo_aplicacion} onChange={(e) => setForm({ ...form, metodo_aplicacion: e.target.value as MetodoAplicacion })}>
                {METODOS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Garantía (años)">
              <Input type="number" min={0} max={25} value={form.garantia_anos} onChange={(e) => setForm({ ...form, garantia_anos: Number(e.target.value) })} />
            </Field>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#092653]">Capas</h3>
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus className="w-3.5 h-3.5" />}
                disabled={form.capas.length >= 6}
                onClick={() =>
                  setForm((f) => ({ ...f, capas: [...f.capas, { tipo: 'ACABADO', producto: '', espesor_micrones: 50, manos: 2, funcion: '' }] }))
                }
              >
                Agregar capa
              </Button>
            </div>
            {form.capas.length === 0 && <p className="text-sm text-slate-500">Agrega al menos una capa.</p>}
            {form.capas.map((capa, i) => (
              <div key={i} className="p-4 rounded-xl bg-[#FAFAF7] border border-[#E7EAF0] grid grid-cols-2 sm:grid-cols-12 gap-3 items-end">
                <Field label="Tipo" className="sm:col-span-2">
                  <Select value={capa.tipo} onChange={(e) => setCapa(i, { tipo: e.target.value as CapaSistema['tipo'] })}>
                    <option value="IMPRIMANTE">Imprimante</option>
                    <option value="INTERMEDIO">Intermedio</option>
                    <option value="ACABADO">Acabado</option>
                  </Select>
                </Field>
                <Field label="Producto" className="col-span-2 sm:col-span-4">
                  <Input required value={capa.producto} onChange={(e) => setCapa(i, { producto: e.target.value })} />
                </Field>
                <Field label="Espesor µm" className="sm:col-span-2">
                  <Input type="number" min={1} required value={capa.espesor_micrones} onChange={(e) => setCapa(i, { espesor_micrones: Number(e.target.value) })} />
                </Field>
                <Field label="Manos" className="sm:col-span-1">
                  <Input type="number" min={1} max={6} required value={capa.manos} onChange={(e) => setCapa(i, { manos: Number(e.target.value) })} />
                </Field>
                <Field label="Función" className="col-span-2 sm:col-span-2">
                  <Input value={capa.funcion} onChange={(e) => setCapa(i, { funcion: e.target.value })} />
                </Field>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, capas: f.capas.filter((_, j) => j !== i) }))}
                  aria-label={`Quitar capa ${i + 1}`}
                  className="sm:col-span-1 p-2.5 justify-self-start rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <Field label="Observaciones para el cliente">
            <Textarea rows={2} value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={busy === 'solucion'} disabled={form.capas.length === 0}>
              Guardar solución
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  if (!s) {
    return (
      <EmptyState
        icon={<Wrench className="w-6 h-6" />}
        title="La solución técnica aún no está definida"
        description="El especialista la propondrá después de validar el diagnóstico."
        action={project.permisos.puedeEditarSolucion && <Button onClick={() => setEditando(true)}>Definir solución</Button>}
      />
    );
  }

  return (
    <Card className="p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-extrabold text-[#092653]">{s.nombre_sistema}</h2>
          <p className="text-sm text-slate-600 mt-1">
            {METODOS.find(([v]) => v === s.metodo_aplicacion)?.[1]} · garantía {s.garantia_anos} año(s)
          </p>
        </div>
        {project.permisos.puedeEditarSolucion && (
          <Button variant="secondary" size="sm" onClick={() => setEditando(true)}>
            Editar
          </Button>
        )}
      </div>
      <p className="text-sm text-slate-700">
        <strong>Preparación:</strong> {s.preparacion_superficie}
      </p>
      <ol className="space-y-2.5">
        {s.capas.map((capa, i) => (
          <li key={i} className="p-4 bg-[#FAFAF7] border border-[#E7EAF0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
            <div>
              <span className="text-[11px] font-bold text-[#155EEF] uppercase">{capa.tipo}</span>
              <p className="font-bold text-[#092653]">{capa.producto}</p>
              {capa.funcion && <p className="text-slate-600">{capa.funcion}</p>}
            </div>
            <span className="font-mono text-xs text-slate-700 shrink-0">
              {capa.manos} mano(s) · {capa.espesor_micrones} µm
            </span>
          </li>
        ))}
      </ol>
      {s.observaciones && <p className="text-sm text-slate-600">{s.observaciones}</p>}
    </Card>
  );
};

// ------------------------------------------------------------------------------
// Cotización
// ------------------------------------------------------------------------------
const CATEGORIAS_ITEM: Array<[CategoriaItemCotizacion, string]> = [
  ['PREPARACION', 'Preparación'],
  ['MATERIAL', 'Material'],
  ['MANO_OBRA', 'Mano de obra'],
  ['EQUIPO', 'Equipo'],
  ['LOGISTICA', 'Logística'],
];

/** Descarga la cotización en el mismo PDF que recibe el cliente por correo */
const DescargarPdf: React.FC<{ proyectoId: string; cot: Cotizacion }> = ({ proyectoId, cot }) => {
  const [descargando, setDescargando] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={descargando}
      icon={<FileDown className="w-3.5 h-3.5" />}
      onClick={async () => {
        setDescargando(true);
        try {
          await descargarArchivo(`/proyectos/${proyectoId}/cotizaciones/${cot.id}/pdf`, `Cotizacion-${cot.codigo}.pdf`);
        } catch (err) {
          toast(errorMessage(err), 'error');
        } finally {
          setDescargando(false);
        }
      }}
    >
      Descargar PDF
    </Button>
  );
};

const CotizacionTab: React.FC<TabProps> = ({ project, run, busy }) => {
  const borrador = project.cotizaciones.find((c) => c.estado === 'BORRADOR');
  const [respuesta, setRespuesta] = useState('');

  const crear = () => run('cot-crear', () => api.post<Proyecto>(`/proyectos/${project.id}/cotizaciones`), 'Borrador de cotización creado.');
  const responder = (cot: Cotizacion, decision: 'APROBADA' | 'RECHAZADA') =>
    run(
      `cot-${decision}`,
      () => api.post<Proyecto>(`/proyectos/${project.id}/cotizaciones/${cot.id}/responder`, { decision, comentario: respuesta }),
      decision === 'APROBADA' ? '¡Cotización aprobada! Programaremos tu servicio.' : 'Registramos tu respuesta.'
    );

  return (
    <div className="space-y-5">
      {project.permisos.puedeCotizar && !borrador && (
        <Card className="p-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Genera un borrador a partir de la solución técnica y ajústalo antes de enviarlo.</p>
          <Button loading={busy === 'cot-crear'} onClick={crear} disabled={!project.solucion_tecnica}>
            {project.cotizaciones.length ? 'Nueva versión' : 'Crear cotización'}
          </Button>
        </Card>
      )}

      {borrador && project.permisos.puedeCotizar && <EditorCotizacion key={borrador.id} project={project} cot={borrador} run={run} busy={busy} />}

      {project.cotizaciones.filter((c) => c.estado !== 'BORRADOR').length === 0 && !borrador && (
        <EmptyState
          icon={<DollarSign className="w-6 h-6" />}
          title="Aún no hay cotización"
          description="La recibirás aquí cuando el equipo comercial la prepare a partir de la solución técnica."
        />
      )}

      {project.cotizaciones
        .filter((c) => c.estado !== 'BORRADOR')
        .map((cot) => (
          <Card key={cot.id} className="p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono font-bold text-[#092653]">{cot.codigo}</p>
                <p className="text-xs text-slate-500">
                  {fecha(cot.created_at)} · válida {cot.validez_dias} días · entrega en {cot.tiempo_entrega_dias} días
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
              <DescargarPdf proyectoId={project.id} cot={cot} />
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                  cot.estado === 'APROBADA'
                    ? 'bg-emerald-50 text-emerald-700'
                    : cot.estado === 'RECHAZADA'
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-amber-50 text-amber-800'
                }`}
              >
                {cot.estado === 'ENVIADA' ? 'Pendiente de respuesta' : cot.estado.toLowerCase()}
              </span>
              </div>
            </div>
            <TablaItems items={cot.items} />
            <Totales cot={cot} />
            {cot.condiciones_pago && (
              <p className="text-sm text-slate-600">
                <strong>Condiciones de pago:</strong> {cot.condiciones_pago}
              </p>
            )}
            {cot.observaciones && <p className="text-sm text-slate-600">{cot.observaciones}</p>}
            {cot.respuesta_cliente && (
              <p className="text-sm text-slate-600 p-3 rounded-xl bg-[#FAFAF7] border border-[#E7EAF0]">
                <strong>Comentario del cliente:</strong> {cot.respuesta_cliente}
              </p>
            )}
            {cot.estado === 'ENVIADA' && project.permisos.puedeResponderCotizacion && (
              <div className="pt-4 border-t border-[#E7EAF0] space-y-3 print:hidden">
                <Textarea rows={2} value={respuesta} onChange={(e) => setRespuesta(e.target.value)} placeholder="Comentario para el equipo (opcional)" />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="secondary" loading={busy === 'cot-RECHAZADA'} onClick={() => responder(cot, 'RECHAZADA')}>
                    Rechazar
                  </Button>
                  <Button variant="accent" loading={busy === 'cot-APROBADA'} onClick={() => responder(cot, 'APROBADA')} icon={<CheckCircle2 className="w-4 h-4" />}>
                    Aprobar cotización
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
    </div>
  );
};

const TablaItems: React.FC<{ items: ItemCotizacion[] }> = ({ items }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm min-w-[560px]">
      <thead>
        <tr className="border-b border-[#E7EAF0] text-left text-slate-500 text-xs">
          <th className="pb-2 font-semibold">Concepto</th>
          <th className="pb-2 font-semibold text-right">Cant.</th>
          <th className="pb-2 font-semibold text-right">Unitario</th>
          <th className="pb-2 font-semibold text-right">Subtotal</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#E7EAF0]">
        {items.map((it, i) => (
          <tr key={it.id || i}>
            <td className="py-2.5 pr-3">
              <span className="block text-[11px] font-bold text-[#155EEF]">
                {CATEGORIAS_ITEM.find(([v]) => v === it.categoria)?.[1]}
              </span>
              {it.descripcion}
            </td>
            <td className="py-2.5 text-right tabular-nums whitespace-nowrap">
              {it.cantidad} {it.unidad.toLowerCase()}
            </td>
            <td className="py-2.5 text-right tabular-nums">{cop(it.precio_unitario)}</td>
            <td className="py-2.5 text-right font-semibold tabular-nums">{cop(it.subtotal)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Totales: React.FC<{ cot: Pick<Cotizacion, 'subtotal' | 'descuento_porcentaje' | 'descuento_valor' | 'impuesto_porcentaje' | 'impuesto_valor' | 'total'> }> = ({
  cot,
}) => (
  <dl className="ml-auto w-full max-w-xs space-y-1.5 text-sm tabular-nums">
    <div className="flex justify-between text-slate-600">
      <dt>Subtotal</dt>
      <dd>{cop(cot.subtotal)}</dd>
    </div>
    {cot.descuento_valor > 0 && (
      <div className="flex justify-between text-emerald-700">
        <dt>Descuento ({cot.descuento_porcentaje}%)</dt>
        <dd>-{cop(cot.descuento_valor)}</dd>
      </div>
    )}
    <div className="flex justify-between text-slate-600">
      <dt>IVA ({cot.impuesto_porcentaje}%)</dt>
      <dd>{cop(cot.impuesto_valor)}</dd>
    </div>
    <div className="flex justify-between pt-2 border-t border-[#E7EAF0] text-base font-extrabold text-[#092653]">
      <dt>Total</dt>
      <dd>{cop(cot.total)}</dd>
    </div>
  </dl>
);

const EditorCotizacion: React.FC<TabProps & { cot: Cotizacion }> = ({ project, cot, run, busy }) => {
  const [items, setItems] = useState<ItemCotizacion[]>(() => cot.items.map((i) => ({ ...i })));
  const [meta, setMeta] = useState({
    descuento_porcentaje: cot.descuento_porcentaje,
    validez_dias: cot.validez_dias,
    tiempo_entrega_dias: cot.tiempo_entrega_dias,
    condiciones_pago: cot.condiciones_pago || '',
    observaciones: cot.observaciones || '',
  });

  const setItem = (i: number, patch: Partial<ItemCotizacion>) => setItems((list) => list.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const subtotal = items.reduce((acc, it) => acc + it.cantidad * it.precio_unitario, 0);
  const descuento = (subtotal * meta.descuento_porcentaje) / 100;
  const iva = ((subtotal - descuento) * cot.impuesto_porcentaje) / 100;

  const guardar = (enviar: boolean) =>
    run(
      enviar ? 'cot-enviar' : 'cot-guardar',
      () => api.patch<Proyecto>(`/proyectos/${project.id}/cotizaciones/${cot.id}`, { items, ...meta, enviar }),
      enviar ? 'Cotización enviada al cliente.' : 'Borrador guardado.'
    );

  return (
    <Card className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display font-extrabold text-[#092653]">Borrador {cot.codigo}</h2>
        <span className="text-xs text-slate-500">Solo tú y el equipo interno pueden verlo hasta que lo envíes.</span>
      </div>

      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end p-3 rounded-xl bg-[#FAFAF7] border border-[#E7EAF0]">
            <Field label="Categoría" className="sm:col-span-2">
              <Select value={it.categoria} onChange={(e) => setItem(i, { categoria: e.target.value as CategoriaItemCotizacion })}>
                {CATEGORIAS_ITEM.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Descripción" className="col-span-2 sm:col-span-4">
              <Input value={it.descripcion} onChange={(e) => setItem(i, { descripcion: e.target.value })} />
            </Field>
            <Field label="Cantidad" className="sm:col-span-1">
              <Input type="number" min={0} step="0.01" value={it.cantidad} onChange={(e) => setItem(i, { cantidad: Number(e.target.value) })} />
            </Field>
            <Field label="Unidad" className="sm:col-span-1">
              <Input value={it.unidad} onChange={(e) => setItem(i, { unidad: e.target.value })} />
            </Field>
            <Field label="Precio unitario" className="sm:col-span-2">
              <Input type="number" min={0} step="100" value={it.precio_unitario} onChange={(e) => setItem(i, { precio_unitario: Number(e.target.value) })} />
            </Field>
            <div className="sm:col-span-2 flex items-center justify-between gap-2 pb-2">
              <span className="text-sm font-semibold tabular-nums">{cop(it.cantidad * it.precio_unitario)}</span>
              <button
                type="button"
                onClick={() => setItems((list) => list.filter((_, j) => j !== i))}
                aria-label="Quitar ítem"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setItems((l) => [...l, { categoria: 'MATERIAL', descripcion: '', unidad: 'UNIDAD', cantidad: 1, precio_unitario: 0, subtotal: 0 }])}
        >
          Agregar ítem
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Descuento (%)">
          <Input type="number" min={0} max={50} value={meta.descuento_porcentaje} onChange={(e) => setMeta({ ...meta, descuento_porcentaje: Number(e.target.value) })} />
        </Field>
        <Field label="Validez (días)">
          <Input type="number" min={1} max={180} value={meta.validez_dias} onChange={(e) => setMeta({ ...meta, validez_dias: Number(e.target.value) })} />
        </Field>
        <Field label="Tiempo de entrega (días)">
          <Input type="number" min={1} max={365} value={meta.tiempo_entrega_dias} onChange={(e) => setMeta({ ...meta, tiempo_entrega_dias: Number(e.target.value) })} />
        </Field>
        <Field label="Condiciones de pago" className="sm:col-span-3">
          <Textarea rows={2} value={meta.condiciones_pago} onChange={(e) => setMeta({ ...meta, condiciones_pago: e.target.value })} />
        </Field>
        <Field label="Observaciones" className="sm:col-span-3">
          <Textarea rows={2} value={meta.observaciones} onChange={(e) => setMeta({ ...meta, observaciones: e.target.value })} />
        </Field>
      </div>

      <Totales
        cot={{
          subtotal,
          descuento_porcentaje: meta.descuento_porcentaje,
          descuento_valor: descuento,
          impuesto_porcentaje: cot.impuesto_porcentaje,
          impuesto_valor: iva,
          total: subtotal - descuento + iva,
        }}
      />

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" loading={busy === 'cot-guardar'} onClick={() => guardar(false)}>
          Guardar borrador
        </Button>
        <Button loading={busy === 'cot-enviar'} onClick={() => guardar(true)} disabled={items.length === 0}>
          Enviar al cliente
        </Button>
      </div>
    </Card>
  );
};

// ------------------------------------------------------------------------------
// Ejecución: servicio en campo y control de calidad
// ------------------------------------------------------------------------------
const EjecucionTab: React.FC<TabProps> = ({ project, run, busy }) => {
  const p = project.permisos;
  const [servicioForm, setServicioForm] = useState({
    cuadrilla: '',
    lider: '',
    fecha_inicio: '',
    fecha_fin_estimada: '',
    novedades: '',
  });
  const [calidad, setCalidad] = useState({
    adherencia_ok: true,
    espesor_ok: true,
    curado_ok: true,
    acabado_visual: 'EXCELENTE',
    espesor_promedio_micrones: '',
    observaciones: '',
  });

  const programar = (e: React.FormEvent) => {
    e.preventDefault();
    void run('servicio', () => api.post<Proyecto>(`/proyectos/${project.id}/servicios`, servicioForm), 'Servicio programado.');
  };
  const actualizarServicio = (s: ServicioCampo, patch: Partial<ServicioCampo>) =>
    run(`srv-${s.id}`, () => api.patch<Proyecto>(`/proyectos/${project.id}/servicios/${s.id}`, patch), 'Servicio actualizado.');
  const registrarCalidad = (e: React.FormEvent) => {
    e.preventDefault();
    void run('calidad', () => api.post<Proyecto>(`/proyectos/${project.id}/calidad`, calidad), 'Inspección registrada.');
  };

  const sinNada = project.servicios.length === 0 && project.inspecciones.length === 0;

  return (
    <div className="space-y-5">
      {sinNada && !p.puedeProgramarServicio && (
        <EmptyState
          icon={<ClipboardCheck className="w-6 h-6" />}
          title="La ejecución aún no inicia"
          description="Cuando apruebes la cotización, operaciones programará el servicio y verás aquí su avance."
        />
      )}

      {project.servicios.map((s) => (
        <Card key={s.id} className="p-5 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-bold text-[#092653]">{s.cuadrilla}</p>
              <p className="text-sm text-slate-600">
                Líder: {s.lider} · {fecha(s.fecha_inicio)} → {fecha(s.fecha_fin_estimada)}
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#155EEF]/10 text-[#155EEF]">{s.estado.replace('_', ' ').toLowerCase()}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={s.avance} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-[#08B6CC]" style={{ width: `${s.avance}%` }} />
          </div>
          <p className="text-xs text-slate-500">{s.avance}% de avance</p>
          {s.novedades && <p className="text-sm text-slate-600">{s.novedades}</p>}
          {p.puedeProgramarServicio && s.estado !== 'FINALIZADO' && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E7EAF0] print:hidden">
              {s.estado === 'PROGRAMADO' && (
                <Button size="sm" loading={busy === `srv-${s.id}`} onClick={() => actualizarServicio(s, { estado: 'EN_EJECUCION', avance: 10 })}>
                  Iniciar trabajos
                </Button>
              )}
              {s.estado === 'EN_EJECUCION' && (
                <>
                  {[25, 50, 75].filter((v) => v > s.avance).map((v) => (
                    <Button key={v} size="sm" variant="secondary" loading={busy === `srv-${s.id}`} onClick={() => actualizarServicio(s, { avance: v })}>
                      {v}%
                    </Button>
                  ))}
                  <Button size="sm" variant="accent" loading={busy === `srv-${s.id}`} onClick={() => actualizarServicio(s, { estado: 'FINALIZADO' })}>
                    Finalizar
                  </Button>
                </>
              )}
            </div>
          )}
        </Card>
      ))}

      {p.puedeProgramarServicio && project.servicios.every((s) => s.estado === 'FINALIZADO') && (
        <Card className="p-6">
          <form onSubmit={programar} className="space-y-4">
            <h2 className="font-display font-extrabold text-[#092653]">Programar servicio</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Cuadrilla" required>
                <Input required value={servicioForm.cuadrilla} onChange={(e) => setServicioForm({ ...servicioForm, cuadrilla: e.target.value })} />
              </Field>
              <Field label="Líder" required>
                <Input required value={servicioForm.lider} onChange={(e) => setServicioForm({ ...servicioForm, lider: e.target.value })} />
              </Field>
              <Field label="Inicio" required>
                <Input type="date" required value={servicioForm.fecha_inicio} onChange={(e) => setServicioForm({ ...servicioForm, fecha_inicio: e.target.value })} />
              </Field>
              <Field label="Fin estimado" required>
                <Input type="date" required value={servicioForm.fecha_fin_estimada} onChange={(e) => setServicioForm({ ...servicioForm, fecha_fin_estimada: e.target.value })} />
              </Field>
              <Field label="Indicaciones" className="sm:col-span-2">
                <Textarea rows={2} value={servicioForm.novedades} onChange={(e) => setServicioForm({ ...servicioForm, novedades: e.target.value })} />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={busy === 'servicio'}>
                Programar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {project.inspecciones.map((q) => (
        <Card key={q.id} className="p-5 space-y-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-[#092653]">Inspección de calidad · {fecha(q.fecha)}</p>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${q.resultado === 'APROBADO' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
              {q.resultado === 'APROBADO' ? 'Aprobada' : 'Requiere ajustes'}
            </span>
          </div>
          <p className="text-slate-600">
            Inspector: {q.inspector_nombre} · Adherencia {q.adherencia_ok ? '✓' : '✗'} · Espesor {q.espesor_ok ? '✓' : '✗'}
            {q.espesor_promedio_micrones ? ` (${q.espesor_promedio_micrones} µm)` : ''} · Curado {q.curado_ok ? '✓' : '✗'} · Acabado{' '}
            {q.acabado_visual.replace('_', ' ').toLowerCase()}
          </p>
          {q.observaciones && <p className="text-slate-600">{q.observaciones}</p>}
        </Card>
      ))}

      {p.puedeRegistrarCalidad && (
        <Card className="p-6">
          <form onSubmit={registrarCalidad} className="space-y-4">
            <h2 className="font-display font-extrabold text-[#092653]">Registrar control de calidad</h2>
            <div className="flex flex-wrap gap-4 text-sm">
              {(['adherencia_ok', 'espesor_ok', 'curado_ok'] as const).map((k) => (
                <label key={k} className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={calidad[k]} onChange={(e) => setCalidad({ ...calidad, [k]: e.target.checked })} className="w-4 h-4 accent-[#155EEF]" />
                  {k === 'adherencia_ok' ? 'Adherencia correcta' : k === 'espesor_ok' ? 'Espesor dentro de especificación' : 'Curado adecuado'}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Acabado visual">
                <Select value={calidad.acabado_visual} onChange={(e) => setCalidad({ ...calidad, acabado_visual: e.target.value })}>
                  <option value="EXCELENTE">Excelente</option>
                  <option value="BUENO">Bueno</option>
                  <option value="CON_OBSERVACIONES">Con observaciones</option>
                  <option value="RECHAZADO">Rechazado</option>
                </Select>
              </Field>
              <Field label="Espesor promedio (µm)">
                <Input type="number" min={0} value={calidad.espesor_promedio_micrones} onChange={(e) => setCalidad({ ...calidad, espesor_promedio_micrones: e.target.value })} />
              </Field>
              <Field label="Observaciones" className="sm:col-span-2">
                <Textarea rows={2} value={calidad.observaciones} onChange={(e) => setCalidad({ ...calidad, observaciones: e.target.value })} />
              </Field>
            </div>
            <p className="text-xs text-slate-500">Si todo está correcto y el acabado es bueno o excelente, el proyecto se cerrará automáticamente.</p>
            <div className="flex justify-end">
              <Button type="submit" loading={busy === 'calidad'}>
                Registrar inspección
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
