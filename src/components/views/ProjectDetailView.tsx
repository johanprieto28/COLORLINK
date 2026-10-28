import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Building,
  User,
  Phone,
  Mail,
  Camera,
  Layers,
  Sparkles,
  Wrench,
  DollarSign,
  Activity,
  CheckCircle2,
  Upload,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import {
  Proyecto,
  ProjectStatus,
  SolucionTecnica,
  CapaRecubrimiento,
} from '../../types';
import { projectService } from '../../services/projects/projectService';
import { authService } from '../../services/auth/authService';
import { uploadEvidenceFile } from '../../services/storage/storageService';
import { runColorlinkAIDiagnosis } from '../../services/diagnostics/diagnosticService';
import { quoteService } from '../../services/quotes/quoteService';
import { getStatusBadge, getSeverityBadge, getComplexityBadge } from '../common/Badge';
import { CATALOG_IMAGES } from '../../assets/images/catalogImages';

interface ProjectDetailViewProps {
  projectId: string;
  onBack: () => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ projectId, onBack }) => {
  const currentUser = authService.getCurrentUser();
  const activeRole = authService.getActiveRole();

  const [project, setProject] = useState<Proyecto | undefined>(() =>
    projectService.getProjectById(projectId)
  );
  const [activeTab, setActiveTab] = useState<
    'resumen' | 'evidencias' | 'diagnostico' | 'solucion' | 'cotizacion' | 'seguimiento'
  >('resumen');

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [, setIsUpdatingStatus] = useState(false);
  const [analyzingAI, setAnalyzingAI] = useState(false);

  const [editingSolution, setEditingSolution] = useState(false);
  const [solutionName, setSolutionName] = useState(
    project?.solucion_tecnica?.nombre_sistema || 'Sistema Multicapa de Protección y Acabado'
  );
  const [surfacePrep, setSurfacePrep] = useState(
    project?.solucion_tecnica?.preparacion_superficie ||
      'Limpieza integral, tratamiento de fisuras e imprimación de adherencia'
  );
  const [warrantyYears, setWarrantyYears] = useState(
    project?.solucion_tecnica?.garantia_anos || 5
  );

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
        <p className="text-slate-600 text-sm">No se encontró el expediente solicitado.</p>
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 bg-[#0B1F3A] text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Volver a mis proyectos
        </button>
      </div>
    );
  }

  const primaryArea = project.areas[0];

  const reloadProject = () => {
    const updated = projectService.getProjectById(projectId);
    if (updated) setProject({ ...updated });
  };

  const handleTransitionState = (nextStatus: ProjectStatus, motivo: string) => {
    setIsUpdatingStatus(true);
    try {
      projectService.updateProjectStatus(
        project.id,
        nextStatus,
        currentUser.nombre_completo,
        currentUser.rol,
        motivo
      );
      reloadProject();
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadEvidenceFile(file, project.id);
        projectService.addEvidence(project.id, {
          id: `ev-${Date.now()}-${i}`,
          proyecto_id: project.id,
          archivo_url: res.url,
          storage_path: res.storage_path,
          nombre_archivo: res.nombre_archivo,
          tamano_bytes: res.tamano_bytes,
          mime_type: res.mime_type,
          descripcion: 'Fotografía complementaria registrada en el expediente',
          fecha_captura: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      }
      reloadProject();
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRunAIDiagnosis = async () => {
    setAnalyzingAI(true);
    try {
      const result = await runColorlinkAIDiagnosis({
        tipoSuperficie: primaryArea?.tipo_superficie,
        areaAproximada: primaryArea?.area_m2,
        ambiente: primaryArea?.ambiente,
        ubicacion: primaryArea?.ubicacion,
        humedad: primaryArea?.humedad,
        fisuras: primaryArea?.fisuras,
        desgaste: primaryArea?.desgaste,
        desprendimiento: primaryArea?.desprendimiento,
        descripcionProblema: primaryArea?.descripcion_problema,
        evidencias: (project.evidencias || []).map((e) => ({
          id: e.id,
          archivo_url: e.archivo_url,
          nombre_archivo: e.nombre_archivo,
          descripcion: e.descripcion || '',
          fecha_captura: e.fecha_captura,
          tamano_bytes: e.tamano_bytes,
          mime_type: e.mime_type,
        })),
      });

      project.diagnostico = {
        id: `diag-${Date.now()}`,
        proyecto_id: project.id,
        tecnico_id: currentUser.id,
        complejidad: result.nivelComplejidad,
        severidad: result.severidad,
        humedad_detectada: primaryArea?.humedad || 'MEDIA',
        fisuras_presentes: Boolean(primaryArea?.fisuras),
        desgaste_detectado: primaryArea?.desgaste || 'MODERADO',
        desprendimiento_presente: Boolean(primaryArea?.desprendimiento),
        patologias: result.patologiasDetectadas,
        validacion_tecnica_requerida: result.validacionTecnicaRequerida,
        recomendacion_preliminar: result.recomendacionPreliminar,
        preparacion_superficie_recomendada: result.preparacionSuperficieSugerida,
        norma_aplicable: 'Revisión técnica COLORLINK',
        origen_motor: 'COLORLINK_IA',
        created_at: new Date().toISOString(),
      };

      projectService.updateProjectStatus(
        project.id,
        'VALIDACION_TECNICA',
        'COLORLINK IA',
        'administrador',
        'Orientación técnica preliminar generada por COLORLINK IA.'
      );

      reloadProject();
    } finally {
      setAnalyzingAI(false);
    }
  };

  const handleSaveSolution = () => {
    const capas: CapaRecubrimiento[] = [
      {
        tipo: 'IMPRIMANTE',
        producto: 'Imprimante promotor de adherencia y control de humedad',
        espesor_dft_micrones: 100,
        numero_manos: 1,
        intervalo_repintado_horas: '8 - 24 horas',
        funcion_tecnica: 'Consolidación del sustrato y sellado base',
      },
      {
        tipo: 'INTERMEDIO',
        producto: 'Capa intermedia niveladora de alta resistencia',
        espesor_dft_micrones: 200,
        numero_manos: 1,
        intervalo_repintado_horas: '12 - 24 horas',
        funcion_tecnica: 'Barrera mecánica de protección',
      },
      {
        tipo: 'ACABADO',
        producto: 'Recubrimiento de acabado arquitectónico protector',
        espesor_dft_micrones: 60,
        numero_manos: 2,
        intervalo_repintado_horas: '6 - 12 horas',
        funcion_tecnica: 'Estabilidad de color, lavabilidad y protección final',
      },
    ];

    const solucion: SolucionTecnica = {
      id: `sol-${Date.now()}`,
      proyecto_id: project.id,
      tecnico_id: currentUser.id,
      nombre_sistema: solutionName,
      descripcion_sistema: 'Sistema estructurado según las condiciones observadas en el expediente.',
      preparacion_superficie: surfacePrep,
      metodo_aplicacion: 'BROCHA_RODILLO',
      garantia_anos: warrantyYears,
      capas,
      aprobado_cliente: false,
      created_at: new Date().toISOString(),
    };

    projectService.saveTechnicalSolution(project.id, solucion, currentUser.nombre_completo);
    setEditingSolution(false);
    reloadProject();
  };

  const handleGenerateQuote = () => {
    const quote = quoteService.generateQuoteFromSolution(
      project.id,
      project.codigo,
      primaryArea?.area_m2 || 100,
      project.solucion_tecnica,
      currentUser.id
    );
    quote.estado = 'ENVIADA';
    projectService.attachQuote(project.id, quote, currentUser.nombre_completo);
    reloadProject();
  };

  const activeQuote = project.cotizaciones?.[0];

  const trackingStages: Array<{ status: ProjectStatus; label: string }> = [
    { status: 'RECIBIDO', label: 'Recibido' },
    { status: 'EN_ANALISIS', label: 'En análisis' },
    { status: 'SOLUCION_GENERADA', label: 'Solución propuesta' },
    { status: 'COTIZACION', label: 'Cotización' },
    { status: 'APROBADO', label: 'Aprobado' },
    { status: 'EN_EJECUCION', label: 'En ejecución' },
    { status: 'CERRADO', label: 'Cerrado' },
  ];

  const statesOrder: ProjectStatus[] = [
    'BORRADOR',
    'RECIBIDO',
    'EN_ANALISIS',
    'VALIDACION_TECNICA',
    'SOLUCION_GENERADA',
    'COTIZACION',
    'APROBADO',
    'ABASTECIMIENTO',
    'SERVICIO_PROGRAMADO',
    'EN_EJECUCION',
    'CALIDAD',
    'CERRADO',
  ];

  const currentOrderIdx = statesOrder.indexOf(project.estado);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Navegación superior y cabecera del proyecto */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#0B1F3A] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a proyectos</span>
        </button>

        <div className="p-6 sm:p-8 bg-white border border-slate-200/90 rounded-3xl shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-[#FAF9F6] text-[#0B1F3A] border border-slate-200">
                {project.codigo}
              </span>
              {getStatusBadge(project.estado)}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] tracking-tight">
              {project.nombre}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <Building className="w-4 h-4 text-slate-400" />
                <span>{project.cliente?.empresa || project.cliente?.nombre}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>
                  {project.ciudad} · {project.direccion}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Fecha requerida: {project.fecha_requerida}</span>
              </span>
            </div>
          </div>

          {/* Acciones contextuales según rol autorizado */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {activeRole === 'tecnico' && project.estado === 'RECIBIDO' && (
              <button
                type="button"
                onClick={() =>
                  handleTransitionState(
                    'EN_ANALISIS',
                    'Especialista técnico inició el análisis de evidencias.'
                  )
                }
                className="px-4 py-2.5 bg-[#1D4ED8] hover:bg-[#0B1F3A] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Iniciar análisis técnico
              </button>
            )}

            {activeRole === 'tecnico' &&
              ['EN_ANALISIS', 'VALIDACION_TECNICA'].includes(project.estado) && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('solucion');
                    setEditingSolution(true);
                  }}
                  className="px-4 py-2.5 bg-[#0891B2] hover:bg-[#0E7490] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Estructurar solución técnica
                </button>
              )}

            {activeRole === 'comercial' &&
              ['SOLUCION_GENERADA', 'COTIZACION'].includes(project.estado) && (
                <button
                  type="button"
                  onClick={handleGenerateQuote}
                  className="px-4 py-2.5 bg-[#0B1F3A] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  {activeQuote ? 'Actualizar cotización' : 'Generar cotización'}
                </button>
              )}

            {activeRole === 'operaciones' && project.estado === 'APROBADO' && (
              <button
                type="button"
                onClick={() =>
                  handleTransitionState(
                    'EN_EJECUCION',
                    'Operaciones inició la programación y ejecución del proyecto.'
                  )
                }
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Pasar a ejecución
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              title="Imprimir resumen del expediente"
              className="p-2.5 bg-[#FAF9F6] hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra visual clara de seguimiento de etapas */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl overflow-x-auto shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-3">
            Estado de avance del proyecto
          </span>
          <div className="flex items-center min-w-[640px] justify-between">
            {trackingStages.map((stage, idx, arr) => {
              const stageOrderIdx = statesOrder.indexOf(stage.status);
              const isPast = stageOrderIdx <= currentOrderIdx;
              const isCurrent =
                project.estado === stage.status ||
                (stage.status === 'EN_ANALISIS' && project.estado === 'VALIDACION_TECNICA') ||
                (stage.status === 'APROBADO' &&
                  ['ABASTECIMIENTO', 'SERVICIO_PROGRAMADO'].includes(project.estado)) ||
                (stage.status === 'EN_EJECUCION' && project.estado === 'CALIDAD');

              return (
                <React.Fragment key={stage.status}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold tabular-nums transition-colors ${
                        isCurrent
                          ? 'bg-[#0891B2] text-white ring-4 ring-cyan-500/20'
                          : isPast
                          ? 'bg-[#0B1F3A] text-white'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {isPast && !isCurrent ? '✓' : idx + 1}
                    </div>
                    <span
                      className={`text-[11px] whitespace-nowrap ${
                        isCurrent
                          ? 'text-[#0B1F3A] font-bold'
                          : isPast
                          ? 'text-slate-700 font-medium'
                          : 'text-slate-400'
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        isPast && stageOrderIdx < currentOrderIdx ? 'bg-[#0B1F3A]' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pestañas de detalle */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
        {[
          { id: 'resumen', label: 'Resumen y superficie', icon: <Layers className="w-4 h-4" /> },
          {
            id: 'evidencias',
            label: `Evidencias (${project.evidencias?.length || 0})`,
            icon: <Camera className="w-4 h-4" />,
          },
          { id: 'diagnostico', label: 'Orientación y diagnóstico', icon: <Sparkles className="w-4 h-4" /> },
          { id: 'solucion', label: 'Solución propuesta', icon: <Wrench className="w-4 h-4" /> },
          { id: 'cotizacion', label: 'Cotización', icon: <DollarSign className="w-4 h-4" /> },
          { id: 'seguimiento', label: 'Historial de etapas', icon: <Activity className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? 'border-[#1D4ED8] text-[#1D4ED8] bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-[#0B1F3A]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Pestaña 1: Resumen */}
      {activeTab === 'resumen' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="p-6 bg-white border border-slate-200/90 rounded-2xl space-y-5 shadow-2xs">
              <h2 className="text-base font-extrabold text-[#0B1F3A] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#1D4ED8]" />
                <span>Características de la superficie</span>
              </h2>

              {primaryArea && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 text-[11px] block">Tipo de superficie</span>
                    <span className="text-[#0B1F3A] font-bold">{primaryArea.tipo_superficie}</span>
                  </div>
                  <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 text-[11px] block">Área aproximada</span>
                    <span className="text-[#1D4ED8] font-bold text-sm tabular-nums">
                      {primaryArea.area_m2} {primaryArea.unidad_medida}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 text-[11px] block">Exposición</span>
                    <span className="text-[#0B1F3A] font-semibold">{primaryArea.ubicacion}</span>
                  </div>
                  <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 text-[11px] block">Humedad observada</span>
                    <span className="text-[#0B1F3A] font-semibold">{primaryArea.humedad}</span>
                  </div>
                  <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 text-[11px] block">Fisuras</span>
                    <span className="text-[#0B1F3A] font-semibold">
                      {primaryArea.fisuras ? 'Sí reportadas' : 'No reportadas'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 text-[11px] block">Color deseado</span>
                    <span className="text-[#0B1F3A] font-semibold truncate block">
                      {primaryArea.color_requerido || 'Por definir'}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-4 bg-[#FAF9F6] rounded-xl border border-slate-200/80 text-xs space-y-1">
                <span className="text-slate-500 text-[11px] font-semibold block">
                  Descripción registrada
                </span>
                <p className="text-slate-700 leading-relaxed text-sm">
                  {primaryArea?.descripcion_problema || 'Sin descripción adicional.'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-white border border-slate-200/90 rounded-2xl space-y-4 text-xs shadow-2xs">
              <h2 className="text-sm font-extrabold text-[#0B1F3A] flex items-center gap-2">
                <User className="w-4 h-4 text-[#1D4ED8]" />
                <span>Datos del titular</span>
              </h2>

              <div className="space-y-3">
                <div>
                  <span className="text-slate-500 text-[11px] block">Nombre</span>
                  <span className="font-bold text-[#0B1F3A]">{project.cliente?.nombre}</span>
                </div>
                {project.cliente?.empresa && (
                  <div>
                    <span className="text-slate-500 text-[11px] block">Empresa</span>
                    <span className="text-slate-700 font-medium">{project.cliente.empresa}</span>
                  </div>
                )}
                {project.cliente?.documento_nit && (
                  <div>
                    <span className="text-slate-500 text-[11px] block">Identificación / NIT</span>
                    <span className="text-slate-700 font-mono tabular-nums">
                      {project.cliente.documento_nit}
                    </span>
                  </div>
                )}
                {project.cliente?.telefono && (
                  <div className="flex items-center gap-2 pt-1 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-[#0891B2]" />
                    <span className="tabular-nums">{project.cliente.telefono}</span>
                  </div>
                )}
                {project.cliente?.correo && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-[#0891B2]" />
                    <span className="truncate">{project.cliente.correo}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 text-[11px] space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Consentimiento de tratamiento de datos registrado</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pestaña 2: Evidencias */}
      {activeTab === 'evidencias' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200/90 rounded-2xl">
            <div>
              <h2 className="text-base font-extrabold text-[#0B1F3A]">
                Evidencias fotográficas centralizadas
              </h2>
              <p className="text-xs text-slate-600">
                Fotografías asociadas al expediente para análisis de condiciones y seguimiento.
              </p>
            </div>

            <label className="px-4 py-2.5 bg-[#0891B2] hover:bg-[#0E7490] text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-center whitespace-nowrap">
              <Upload className="w-4 h-4" />
              <span>{uploadingPhoto ? 'Subiendo...' : 'Agregar fotografía'}</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                className="hidden"
              />
            </label>
          </div>

          {!project.evidencias || project.evidencias.length === 0 ? (
            <div className="p-10 text-center bg-white border border-slate-200 rounded-2xl space-y-2">
              <Camera className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-600">
                Aún no se han cargado fotografías en este proyecto.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {project.evidencias.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xs"
                >
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    <img
                      src={ev.archivo_url}
                      alt={ev.nombre_archivo}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = CATALOG_IMAGES.solPreparacion;
                      }}
                      className="w-full h-full object-cover"
                    />
                    {ev.severidad_visual && (
                      <div className="absolute top-2.5 right-2.5">
                        {getSeverityBadge(ev.severidad_visual)}
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2 text-xs">
                    <p className="font-bold text-[#0B1F3A] truncate">{ev.nombre_archivo}</p>
                    <p className="text-slate-600 text-xs line-clamp-2">
                      {ev.descripcion || 'Sin observaciones adicionales.'}
                    </p>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                      <span>{ev.fecha_captura?.split('T')[0]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pestaña 3: Diagnóstico */}
      {activeTab === 'diagnostico' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200/90 rounded-2xl">
            <div>
              <span className="text-xs font-bold text-[#0891B2] uppercase tracking-wider">
                Evaluación de superficie
              </span>
              <h2 className="text-lg font-extrabold text-[#0B1F3A]">
                Orientación preliminar y validación técnica
              </h2>
            </div>

            <button
              type="button"
              onClick={handleRunAIDiagnosis}
              disabled={analyzingAI}
              className="px-4 py-2.5 bg-[#0B1F3A] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>{analyzingAI ? 'Evaluando...' : 'Actualizar orientación IA'}</span>
            </button>
          </div>

          {project.diagnostico ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white border border-slate-200/90 rounded-2xl">
                  <span className="text-xs text-slate-500 block mb-1.5">Severidad estimada</span>
                  {getSeverityBadge(project.diagnostico.severidad)}
                </div>
                <div className="p-4 bg-white border border-slate-200/90 rounded-2xl">
                  <span className="text-xs text-slate-500 block mb-1.5">Nivel de complejidad</span>
                  {getComplexityBadge(project.diagnostico.complejidad)}
                </div>
                <div className="p-4 bg-white border border-slate-200/90 rounded-2xl">
                  <span className="text-xs text-slate-500 block mb-1.5">Estado de revisión</span>
                  <span className="text-xs font-bold text-[#0B1F3A]">
                    {project.diagnostico.validado_por
                      ? 'Validado por especialista técnico'
                      : 'Sugerencia preliminar pendiente de validación técnica'}
                  </span>
                </div>
              </div>

              <div className="p-6 bg-white border border-slate-200/90 rounded-2xl space-y-4 text-xs">
                <div>
                  <h3 className="font-bold text-[#0B1F3A] text-sm mb-2">
                    Condiciones detectadas en la superficie
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {project.diagnostico.patologias.map((pat, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-[#FAF9F6] border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
                      >
                        {pat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-1.5">
                  <h3 className="font-bold text-[#0B1F3A] text-sm">Recomendación técnica</h3>
                  <p className="text-slate-700 leading-relaxed text-sm">
                    {project.diagnostico.recomendacion_preliminar}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-1">
                  <span className="text-slate-500 text-xs font-semibold block">
                    Preparación de superficie recomendada:
                  </span>
                  <p className="text-[#1D4ED8] font-medium text-xs">
                    {project.diagnostico.preparacion_superficie_recomendada}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-slate-700 text-xs flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#1D4ED8]" />
                <span>
                  {project.diagnostico.validado_por
                    ? 'Este diagnóstico cuenta con revisión registrada por parte del equipo técnico.'
                    : 'Orientación preliminar generada por COLORLINK IA. El diagnóstico definitivo requiere validación de un técnico autorizado.'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
              <Sparkles className="w-8 h-8 text-[#0891B2] mx-auto" />
              <p className="text-xs text-slate-600">
                Aún no se ha generado la evaluación técnica para este proyecto.
              </p>
              <button
                type="button"
                onClick={handleRunAIDiagnosis}
                className="px-5 py-2.5 bg-[#0891B2] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Generar orientación preliminar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pestaña 4: Solución Técnica */}
      {activeTab === 'solucion' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200/90 rounded-2xl">
            <div>
              <span className="text-xs font-bold text-[#0891B2] uppercase tracking-wider">
                Esquema de aplicación
              </span>
              <h2 className="text-lg font-extrabold text-[#0B1F3A]">Solución técnica propuesta</h2>
            </div>

            {activeRole === 'tecnico' && !editingSolution && (
              <button
                type="button"
                onClick={() => setEditingSolution(true)}
                className="px-4 py-2 bg-[#FAF9F6] hover:bg-slate-100 text-[#0B1F3A] rounded-xl text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
              >
                Editar especificación
              </button>
            )}
          </div>

          {editingSolution ? (
            <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-[#0B1F3A]">Editor de solución técnica</h3>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nombre del sistema *
                </label>
                <input
                  type="text"
                  value={solutionName}
                  onChange={(e) => setSolutionName(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Preparación de superficie *
                </label>
                <textarea
                  rows={2}
                  value={surfacePrep}
                  onChange={(e) => setSurfacePrep(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl p-3 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Horizonte estimado de desempeño (años)
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={warrantyYears}
                  onChange={(e) => setWarrantyYears(Number(e.target.value))}
                  className="w-32 bg-[#FAF9F6] border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 tabular-nums"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveSolution}
                  className="px-5 py-2.5 bg-[#0891B2] hover:bg-[#0E7490] text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Guardar solución
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSolution(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : project.solucion_tecnica ? (
            <div className="p-6 bg-white border border-slate-200/90 rounded-2xl space-y-5">
              <div>
                <h3 className="text-base font-extrabold text-[#0B1F3A]">
                  {project.solucion_tecnica.nombre_sistema}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Preparación requerida: {project.solucion_tecnica.preparacion_superficie}
                </p>
              </div>

              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Capas del sistema
                </span>
                {project.solucion_tecnica.capas.map((capa, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#FAF9F6] border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-[#1D4ED8] uppercase">
                        {capa.tipo}
                      </span>
                      <p className="font-bold text-[#0B1F3A] text-sm">{capa.producto}</p>
                      <p className="text-slate-600">{capa.funcion_tecnica}</p>
                    </div>
                    <div className="text-slate-700 font-mono text-xs shrink-0 tabular-nums">
                      {capa.numero_manos} mano(s) · {capa.espesor_dft_micrones} µm
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-10 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
              <Wrench className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-600">
                La solución técnica detallada se mostrará aquí una vez sea emitida por el especialista.
              </p>
              {activeRole === 'tecnico' && (
                <button
                  type="button"
                  onClick={() => setEditingSolution(true)}
                  className="px-4 py-2 bg-[#0891B2] text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Especificar sistema ahora
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pestaña 5: Cotización */}
      {activeTab === 'cotizacion' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200/90 rounded-2xl">
            <div>
              <span className="text-xs font-bold text-[#0891B2] uppercase tracking-wider">
                Propuesta comercial
              </span>
              <h2 className="text-lg font-extrabold text-[#0B1F3A]">
                Cotización del proyecto {activeQuote?.codigo || ''}
              </h2>
            </div>

            {activeRole === 'comercial' && (
              <button
                type="button"
                onClick={handleGenerateQuote}
                className="px-4 py-2.5 bg-[#0B1F3A] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                {activeQuote ? 'Recalcular propuesta' : 'Generar cotización'}
              </button>
            )}
          </div>

          {activeQuote ? (
            <div className="p-6 bg-white border border-slate-200/90 rounded-2xl space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-b border-slate-100 pb-4">
                <div>
                  <span className="text-slate-500 block">Código</span>
                  <span className="font-mono font-bold text-[#0B1F3A]">{activeQuote.codigo}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Estado</span>
                  <span className="font-bold text-[#1D4ED8]">{activeQuote.estado}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Validez</span>
                  <span className="font-semibold text-slate-800 tabular-nums">
                    {activeQuote.validez_dias} días
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Moneda</span>
                  <span className="font-semibold text-slate-800">{activeQuote.moneda}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-2.5 font-semibold">Categoría</th>
                      <th className="pb-2.5 font-semibold">Descripción</th>
                      <th className="pb-2.5 text-right font-semibold">Cant.</th>
                      <th className="pb-2.5 text-right font-semibold">Unidad</th>
                      <th className="pb-2.5 text-right font-semibold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeQuote.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-3 font-semibold text-[#1D4ED8]">{it.categoria}</td>
                        <td className="py-3 text-slate-800">{it.descripcion}</td>
                        <td className="py-3 text-right tabular-nums text-slate-700">{it.cantidad}</td>
                        <td className="py-3 text-right text-slate-500">{it.unidad}</td>
                        <td className="py-3 text-right font-bold tabular-nums text-[#0B1F3A]">
                          ${it.subtotal.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <div className="w-72 space-y-2 text-xs tabular-nums">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>
                      ${activeQuote.subtotal.toLocaleString()} {activeQuote.moneda}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>IVA ({activeQuote.impuesto_porcentaje}%):</span>
                    <span>
                      ${activeQuote.impuesto_valor.toLocaleString()} {activeQuote.moneda}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold text-[#0B1F3A] pt-2 border-t border-slate-200">
                    <span>Total:</span>
                    <span className="text-[#1D4ED8]">
                      ${activeQuote.total.toLocaleString()} {activeQuote.moneda}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
              <DollarSign className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-600">
                La cotización comercial estará disponible una vez se valide la solución técnica del
                proyecto.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pestaña 6: Seguimiento e historial */}
      {activeTab === 'seguimiento' && (
        <div className="space-y-4">
          {project.actividades?.map((act) => (
            <div
              key={act.id}
              className="p-5 bg-white border border-slate-200/90 rounded-2xl flex items-start gap-4 text-xs shadow-2xs"
            >
              <div className="w-9 h-9 rounded-xl bg-[#FAF9F6] border border-slate-200 flex items-center justify-center shrink-0 text-[#0891B2]">
                <Activity className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-[#0B1F3A] text-sm">{act.titulo}</span>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {act.created_at?.replace('T', ' ').slice(0, 16)}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">{act.descripcion}</p>
                <div className="text-[11px] text-slate-500 pt-1">
                  Registrado por: <strong className="text-slate-700">{act.usuario_nombre}</strong> (
                  <span className="capitalize">{act.usuario_rol}</span>)
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
