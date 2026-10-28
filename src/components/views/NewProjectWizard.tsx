import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Building,
  MapPin,
  Layers,
  Sparkles,
  Camera,
  Upload,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Check,
  Palette,
  RefreshCw,
} from 'lucide-react';
import { ProjectFormData, HumidityLevel, WearLevel, ClientType } from '../../types';
import { projectService } from '../../services/projects/projectService';
import { uploadEvidenceFile } from '../../services/storage/storageService';
import { runColorlinkAIDiagnosis, AIDiagnosisResult } from '../../services/diagnostics/diagnosticService';
import { authService } from '../../services/auth/authService';
import { WizardPrefill } from '../../App';

interface NewProjectWizardProps {
  prefill?: WizardPrefill;
  onSuccess: (projectId: string) => void;
  onCancel: () => void;
}

const WIZARD_DRAFT_STORAGE_KEY = 'colorlink_project_wizard_draft_v1';
const DEFAULT_PROBLEM_DESC =
  'Busco renovar el espacio corrigiendo pequeñas fisuras y asegurando un acabado lavable y duradero.';

export const NewProjectWizard: React.FC<NewProjectWizardProps> = ({
  prefill,
  onSuccess,
  onCancel,
}) => {
  const currentUser = authService.getCurrentUser();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [aiPreview, setAiPreview] = useState<AIDiagnosisResult | null>(null);
  const [stepValidationMsg, setStepValidationMsg] = useState<string | null>(null);
  const submittingLockRef = useRef<boolean>(false);
  const idempotencyKeyRef = useRef<string>(
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `clk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );

  const buildDefaultFormData = (): ProjectFormData => ({
    clienteTipo: currentUser.empresa?.trim() ? 'EMPRESA' : 'PERSONA_NATURAL',
    clienteNombre: currentUser.nombre_completo || '',
    clienteEmpresa: currentUser.empresa || '',
    clienteDocumento: currentUser.documento_nit || '',
    clienteTelefono: currentUser.telefono || '',
    clienteCorreo: currentUser.email || '',
    clienteCanal: 'WEB',

    proyectoNombre: 'Renovación y protección de superficies',
    ciudad: 'Bogotá D.C.',
    direccion: 'Calle 85 # 15-24',
    tipoProyecto: 'RESIDENCIAL',
    fechaRequerida: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],

    tipoSuperficie: prefill?.tipoSuperficie || 'MAMPOSTERIA',
    areaAproximada: 65,
    unidadMedida: 'm2',
    ambiente: 'RESIDENCIAL',
    ubicacion: prefill?.ubicacion || 'INTERIOR',
    colorActual: 'Blanco desgastado',
    colorRequerido: prefill?.colorRequerido || 'Marfil Luz (muestra ilustrativa #F4EFE6)',

    humedad: prefill?.humedad || 'MEDIA',
    fisuras: prefill?.fisuras !== undefined ? prefill.fisuras : true,
    tipoFisura: 'SUPERFICIAL',
    desgaste: prefill?.desgaste || 'MODERADO',
    desprendimiento: false,
    estadoSuperficie: 'Muros con pérdida de acabado uniforme y microfisuras puntuales.',
    descripcionProblema: prefill?.descripcionProblema || DEFAULT_PROBLEM_DESC,

    evidencias: [],

    autorizacionDatos: true,
    autorizacionUsoTecnico: true,
    origenCanal: 'PORTAL_CLIENTE_WEB',
  });

  const [formData, setFormData] = useState<ProjectFormData>(() => {
    const base = buildDefaultFormData();
    try {
      const savedRaw = window.sessionStorage.getItem(WIZARD_DRAFT_STORAGE_KEY);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw) as Partial<ProjectFormData>;
        const inferredTipo: ClientType =
          parsed.clienteTipo ||
          (parsed.clienteEmpresa && parsed.clienteEmpresa.trim().length > 0
            ? 'EMPRESA'
            : base.clienteTipo);
        return {
          ...base,
          ...parsed,
          clienteTipo: inferredTipo,
        };
      }
    } catch {
      // Ignorar errores de sessionStorage restringido
    }
    return base;
  });

  // Persistir borrador automáticamente para no perder datos ya ingresados por el cliente
  useEffect(() => {
    try {
      window.sessionStorage.setItem(WIZARD_DRAFT_STORAGE_KEY, JSON.stringify(formData));
    } catch {
      // Ignorar errores de sessionStorage restringido
    }
  }, [formData]);

  // Fusionar preselección de color o solución sin borrar datos previamente ingresados
  useEffect(() => {
    if (!prefill) return;
    setFormData((prev) => {
      let nextDesc = prev.descripcionProblema;
      if (prefill.descripcionProblema) {
        const trimmedCurrent = prev.descripcionProblema.trim();
        if (!trimmedCurrent || trimmedCurrent === DEFAULT_PROBLEM_DESC) {
          nextDesc = prefill.descripcionProblema;
        } else if (!trimmedCurrent.includes(prefill.descripcionProblema)) {
          nextDesc = `${trimmedCurrent} | ${prefill.descripcionProblema}`;
        }
      }

      return {
        ...prev,
        colorRequerido: prefill.colorRequerido || prev.colorRequerido,
        tipoSuperficie: prefill.tipoSuperficie || prev.tipoSuperficie,
        ubicacion: prefill.ubicacion || prev.ubicacion,
        descripcionProblema: nextDesc,
        humedad: prefill.humedad || prev.humedad,
        fisuras: prefill.fisuras !== undefined ? prefill.fisuras : prev.fisuras,
        desgaste: prefill.desgaste || prev.desgaste,
      };
    });
  }, [prefill]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadEvidenceFile(file, 'nuevo-proyecto');
        setFormData((prev) => ({
          ...prev,
          evidencias: [
            ...prev.evidencias,
            {
              id: `ev-${Date.now()}-${i}`,
              archivo_url: res.url,
              nombre_archivo: res.nombre_archivo,
              descripcion: `Fotografía del espacio (${file.name})`,
              fecha_captura: new Date().toISOString(),
              tamano_bytes: res.tamano_bytes,
              mime_type: res.mime_type,
            },
          ],
        }));
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const updateEvidenceDescription = (id: string, descripcion: string) => {
    setFormData((prev) => ({
      ...prev,
      evidencias: prev.evidencias.map((ev) => (ev.id === id ? { ...ev, descripcion } : ev)),
    }));
  };

  const removeEvidence = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      evidencias: prev.evidencias.filter((ev) => ev.id !== id),
    }));
  };

  const validateCurrentStep = (): boolean => {
    setStepValidationMsg(null);
    if (currentStep === 1) {
      if (!formData.clienteNombre.trim() || !formData.clienteCorreo.trim() || !formData.clienteTelefono.trim()) {
        setStepValidationMsg('Por favor ingresa tu nombre completo, teléfono y correo electrónico para continuar.');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!formData.proyectoNombre.trim() || !formData.ciudad.trim() || !formData.fechaRequerida) {
        setStepValidationMsg('Por favor indica el nombre del proyecto, la ciudad y la fecha requerida.');
        return false;
      }
    }
    if (currentStep === 3) {
      if (!formData.areaAproximada || formData.areaAproximada <= 0 || !formData.descripcionProblema.trim()) {
        setStepValidationMsg('Por favor especifica un área aproximada mayor a 0 y una breve descripción de la necesidad.');
        return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) return;

    if (currentStep === 3) {
      const diag = await runColorlinkAIDiagnosis(formData);
      setAiPreview(diag);
    }
    setCurrentStep((prev) => Math.min(prev + 1, 5));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setStepValidationMsg(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const requiresTechnicalAuthorization = Boolean(
    formData.descripcionProblema.trim() ||
      formData.estadoSuperficie.trim() ||
      formData.evidencias.length > 0
  );

  const isConfirmationAllowed =
    formData.autorizacionDatos &&
    (!requiresTechnicalAuthorization || formData.autorizacionUsoTecnico);

  const handleSubmit = async () => {
    if (submittingLockRef.current) return;

    setStepValidationMsg(null);
    if (!formData.clienteNombre.trim() || !formData.clienteCorreo.trim() || !formData.clienteTelefono.trim()) {
      setStepValidationMsg('Verifica el nombre completo, correo electrónico y teléfono del cliente.');
      return;
    }
    if (!formData.proyectoNombre.trim() || !formData.ciudad.trim() || !formData.fechaRequerida) {
      setStepValidationMsg('Verifica el nombre del proyecto, la ciudad y la fecha requerida.');
      return;
    }
    if (!formData.autorizacionDatos) {
      setStepValidationMsg(
        'Debes aceptar la autorización de tratamiento de datos personales para confirmar el proyecto.'
      );
      return;
    }
    if (requiresTechnicalAuthorization && !formData.autorizacionUsoTecnico) {
      setStepValidationMsg(
        'Debes autorizar el uso técnico de la información y evidencias registradas para emitir el diagnóstico del espacio.'
      );
      return;
    }

    submittingLockRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload: ProjectFormData = {
        ...formData,
        descripcionProblema: [
          formData.descripcionProblema,
          formData.colorRequerido ? `Color deseado: ${formData.colorRequerido}` : '',
        ]
          .filter(Boolean)
          .join(' | '),
      };
      const createdProject = await projectService.createProjectFromWizard(
        payload,
        currentUser.id,
        idempotencyKeyRef.current
      );
      try {
        window.sessionStorage.removeItem(WIZARD_DRAFT_STORAGE_KEY);
      } catch {
        // Ignorar errores de sessionStorage restringido
      }
      idempotencyKeyRef.current =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `clk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      onSuccess(createdProject.id);
    } catch (err: any) {
      setSubmitError(
        err?.message ||
          'No fue posible confirmar el registro en Supabase. Revisa la conexión e inténtalo nuevamente.'
      );
    } finally {
      submittingLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, label: 'Datos del cliente' },
    { num: 2, label: 'Información del proyecto' },
    { num: 3, label: 'Superficie y condiciones' },
    { num: 4, label: 'Evidencias fotográficas' },
    { num: 5, label: 'Confirmación y guardado' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24 space-y-8">
      {/* Encabezado del recorrido principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-widest text-[#155EEF]">
            Crea tu proyecto
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#092653] tracking-tight">
            Cuéntanos sobre el espacio que vas a transformar
          </h1>
          <p className="text-sm text-[#15243B]/75">
            Paso {currentStep} de 5 · {stepsList[currentStep - 1].label} · Tus datos ingresados se
            conservan mientras exploras colores o soluciones.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-bold text-[#092653] hover:text-[#155EEF] px-3.5 py-2 rounded-xl border border-[#E7EAF0] bg-white hover:bg-[#FAFAF7] transition-colors self-start sm:self-center whitespace-nowrap cursor-pointer"
        >
          Seguir explorando tienda
        </button>
      </div>

      {/* Indicador de progreso en 5 pasos */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {stepsList.map((step) => {
            const isDone = currentStep > step.num;
            const isCurrent = currentStep === step.num;
            return (
              <button
                key={step.num}
                type="button"
                onClick={() => {
                  if (step.num < currentStep) setCurrentStep(step.num);
                }}
                disabled={step.num > currentStep}
                className="text-left flex flex-col gap-2 disabled:cursor-default cursor-pointer"
              >
                <div
                  className={`h-2 rounded-full transition-colors ${
                    isDone
                      ? 'bg-[#0891B2]'
                      : isCurrent
                      ? 'bg-[#1D4ED8]'
                      : 'bg-slate-200'
                  }`}
                />
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 tabular-nums ${
                      isDone
                        ? 'bg-cyan-50 text-[#0891B2] border border-cyan-200'
                        : isCurrent
                        ? 'bg-[#0B1F3A] text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isDone ? '✓' : step.num}
                  </span>
                  <span
                    className={`text-xs truncate hidden md:inline ${
                      isCurrent
                        ? 'font-bold text-[#0B1F3A]'
                        : isDone
                        ? 'font-medium text-slate-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenedor del paso activo */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 lg:p-10 space-y-6 shadow-sm">
        {stepValidationMsg && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{stepValidationMsg}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* PASO 1: Datos del cliente                                    */}
        {/* ============================================================ */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-extrabold text-[#0B1F3A] flex items-center gap-2.5">
                <User className="w-5 h-5 text-[#1D4ED8]" />
                <span>1. Datos del cliente</span>
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Registra los datos de contacto a los que asociaremos el seguimiento de tu proyecto.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Tipo de cliente *
                </label>
                <select
                  value={formData.clienteTipo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      clienteTipo: e.target.value as ClientType,
                    })
                  }
                  className="w-full bg-[#FAF9F6] focus:bg-white border border-slate-300 focus:border-[#1D4ED8] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none"
                >
                  <option value="PERSONA_NATURAL">Persona natural / Hogar</option>
                  <option value="EMPRESA">Empresa / Constructora / Comercio</option>
                  <option value="COPROPIEDAD">Copropiedad / Conjunto residencial</option>
                  <option value="ENTIDAD">Entidad institucional / Salud / Educación</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Nombre completo del cliente *
                </label>
                <input
                  type="text"
                  required
                  value={formData.clienteNombre}
                  onChange={(e) => setFormData({ ...formData, clienteNombre: e.target.value })}
                  placeholder="Ej. Carlos Eduardo Mendoza"
                  className="w-full bg-[#FAF9F6] focus:bg-white border border-slate-300 focus:border-[#1D4ED8] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Documento o NIT de identificación
                </label>
                <input
                  type="text"
                  value={formData.clienteDocumento}
                  onChange={(e) => setFormData({ ...formData, clienteDocumento: e.target.value })}
                  placeholder="Ej. 1.020.458.120 o 900.548.120-4"
                  className="w-full bg-[#FAF9F6] focus:bg-white border border-slate-300 focus:border-[#1D4ED8] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Teléfono de contacto *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.clienteTelefono}
                  onChange={(e) => setFormData({ ...formData, clienteTelefono: e.target.value })}
                  placeholder="Ej. +57 312 458 9901"
                  className="w-full bg-[#FAF9F6] focus:bg-white border border-slate-300 focus:border-[#1D4ED8] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Correo electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={formData.clienteCorreo}
                  onChange={(e) => setFormData({ ...formData, clienteCorreo: e.target.value })}
                  placeholder="nombre@correo.com"
                  className="w-full bg-[#FAF9F6] focus:bg-white border border-slate-300 focus:border-[#1D4ED8] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Empresa o copropiedad (opcional)
                </label>
                <input
                  type="text"
                  value={formData.clienteEmpresa}
                  onChange={(e) => setFormData({ ...formData, clienteEmpresa: e.target.value })}
                  placeholder="Opcional si es persona natural"
                  className="w-full bg-[#FAF9F6] focus:bg-white border border-slate-300 focus:border-[#1D4ED8] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Canal de contacto preferido
                </label>
                <select
                  value={formData.clienteCanal}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      clienteCanal: e.target.value as ProjectFormData['clienteCanal'],
                    })
                  }
                  className="w-full bg-[#FAF9F6] focus:bg-white border border-slate-300 focus:border-[#1D4ED8] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none"
                >
                  <option value="WEB">Plataforma Web COLORLINK</option>
                  <option value="WHATSAPP">Atención vía WhatsApp</option>
                  <option value="COMERCIAL">Asesoría Comercial</option>
                  <option value="REFERIDO">Recomendación / Referido</option>
                  <option value="FERIA">Evento o Punto físico</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PASO 2: Información del proyecto                             */}
        {/* ============================================================ */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-extrabold text-[#0B1F3A] flex items-center gap-2.5">
                <Building className="w-5 h-5 text-[#1D4ED8]" />
                <span>2. Información del proyecto</span>
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Indícanos dónde se ubica el proyecto, el tipo de espacio y cuándo planeas realizarlo.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Nombre del proyecto *
                </label>
                <input
                  type="text"
                  required
                  value={formData.proyectoNombre}
                  onChange={(e) => setFormData({ ...formData, proyectoNombre: e.target.value })}
                  placeholder="Ej. Pintura de sala principal y fachada exterior"
                  className="w-full bg-[#FAF9F6] focus:bg-white border border-slate-300 focus:border-[#1D4ED8] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Ciudad o municipio *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={formData.ciudad}
                      onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                      placeholder="Ej. Bogotá D.C., Medellín, Cali"
                      className="w-full bg-[#FAF9F6] focus:bg-white border border-slate-300 focus:border-[#1D4ED8] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Dirección o referencia de ubicación
                  </label>
                  <input
                    type="text"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Barrio, conjunto o dirección del inmueble"
                    className="w-full bg-[#FAF9F6] focus:bg-white border border-slate-300 focus:border-[#1D4ED8] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Tipo de espacio *
                  </label>
                  <select
                    value={formData.tipoProyecto}
                    onChange={(e) => {
                      const val = e.target.value as ProjectFormData['tipoProyecto'];
                      setFormData({
                        ...formData,
                        tipoProyecto: val,
                        ambiente:
                          val === 'INFRAESTRUCTURA' ? 'INDUSTRIAL' : val,
                      });
                    }}
                    className="w-full bg-[#FAF9F6] focus:bg-white border border-slate-300 focus:border-[#1D4ED8] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none"
                  >
                    <option value="RESIDENCIAL">Hogar / Residencial (Sala, habitaciones, fachada)</option>
                    <option value="COMERCIAL">Espacio Comercial / Oficinas / Local</option>
                    <option value="INDUSTRIAL">Industrial / Bodega / Planta</option>
                    <option value="HOSPITALARIO">Institucional / Clínico / Educativo</option>
                    <option value="INFRAESTRUCTURA">Infraestructura / Zonas comunes</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Fecha estimada o requerida *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fechaRequerida}
                    onChange={(e) => setFormData({ ...formData, fechaRequerida: e.target.value })}
                    className="w-full bg-[#FAF9F6] focus:bg-white border border-slate-300 focus:border-[#1D4ED8] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PASO 3: Superficie, color deseado y condiciones              */}
        {/* ============================================================ */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-extrabold text-[#0B1F3A] flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-[#1D4ED8]" />
                <span>3. Superficie y condiciones observadas</span>
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Describe el material, área aproximada, color deseado y estado actual de tus paredes o pisos.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Tipo de superficie *
                </label>
                <select
                  value={formData.tipoSuperficie}
                  onChange={(e) => setFormData({ ...formData, tipoSuperficie: e.target.value })}
                  className="w-full bg-[#FAF9F6] focus:bg-white border border-slate-300 focus:border-[#1D4ED8] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none"
                >
                  <option value="MAMPOSTERIA">Pared en mampostería / Estuco / Ladrillo</option>
                  <option value="DRYWALL">Drywall / Panel de yeso</option>
                  <option value="CONCRETO">Concreto / Losa / Terraza</option>
                  <option value="MADERA">Madera arquitectónica</option>
                  <option value="ACERO_CARBONO">Metal / Rejas / Estructura de acero</option>
                  <option value="ACERO_GALVANIZADO">Lámina galvanizada / Cubierta</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Exposición del espacio *
                </label>
                <select
                  value={formData.ubicacion}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ubicacion: e.target.value as ProjectFormData['ubicacion'],
                    })
                  }
                  className="w-full bg-[#FAF9F6] focus:bg-white border border-slate-300 focus:border-[#1D4ED8] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none"
                >
                  <option value="INTERIOR">Interior (bajo techo)</option>
                  <option value="EXTERIOR">Exterior (expuesto a lluvia y sol)</option>
                  <option value="MIXTO">Interior y exterior</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Área aproximada *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.areaAproximada}
                    onChange={(e) =>
                      setFormData({ ...formData, areaAproximada: Number(e.target.value) })
                    }
                    className="w-full bg-[#FAF9F6] focus:bg-white border border-slate-300 focus:border-[#1D4ED8] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 tabular-nums focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">Unidad</label>
                  <select
                    value={formData.unidadMedida}
                    onChange={(e) => setFormData({ ...formData, unidadMedida: e.target.value })}
                    className="w-full bg-[#FAF9F6] focus:bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none"
                  >
                    <option value="m2">m²</option>
                    <option value="m">m lin.</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#0891B2]" />
                  <span>Color o acabado deseado</span>
                </label>
                <input
                  type="text"
                  value={formData.colorRequerido}
                  onChange={(e) => setFormData({ ...formData, colorRequerido: e.target.value })}
                  placeholder="Ej. Blanco cálido mate, Verde Salvia, Gris Bruma..."
                  className="w-full bg-[#FAF9F6] focus:bg-white border border-slate-300 focus:border-[#1D4ED8] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Condiciones observadas */}
            <div className="pt-2 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Condiciones observadas en la superficie
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Presencia de humedad
                  </label>
                  <select
                    value={formData.humedad}
                    onChange={(e) =>
                      setFormData({ ...formData, humedad: e.target.value as HumidityLevel })
                    }
                    className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none"
                  >
                    <option value="BAJA">Baja (Superficie seca)</option>
                    <option value="MEDIA">Media (Manchas leves o condensación)</option>
                    <option value="ALTA">Alta (Filtración, salitre o humedad activa)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Nivel de desgaste
                  </label>
                  <select
                    value={formData.desgaste}
                    onChange={(e) =>
                      setFormData({ ...formData, desgaste: e.target.value as WearLevel })
                    }
                    className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none"
                  >
                    <option value="LEVE">Leve (Solo cambio de color o manchas menores)</option>
                    <option value="MODERADO">Moderado (Desgaste visible o pérdida de brillo)</option>
                    <option value="AVANZADO">Avanzado (Deterioro profundo de la capa actual)</option>
                  </select>
                </div>

                <label className="p-3.5 rounded-xl bg-[#FAF9F6] border border-slate-200 flex items-center justify-between gap-3 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-[#0B1F3A] block">
                      ¿Observas fisuras o grietas?
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Líneas o grietas en el estuco o concreto
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.fisuras}
                    onChange={(e) => setFormData({ ...formData, fisuras: e.target.checked })}
                    className="w-4 h-4 accent-[#0891B2] rounded cursor-pointer"
                  />
                </label>

                <label className="p-3.5 rounded-xl bg-[#FAF9F6] border border-slate-200 flex items-center justify-between gap-3 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-[#0B1F3A] block">
                      ¿Pintura descascarada o ampollada?
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Desprendimiento de capas anteriores
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.desprendimiento}
                    onChange={(e) =>
                      setFormData({ ...formData, desprendimiento: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#0891B2] rounded cursor-pointer"
                  />
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Descripción de lo que necesitas resolver *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.descripcionProblema}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcionProblema: e.target.value })
                  }
                  placeholder="Cuéntanos brevemente cómo está el espacio hoy y qué resultado esperas..."
                  className="w-full bg-[#FAF9F6] focus:bg-white border border-slate-300 focus:border-[#1D4ED8] rounded-xl p-3.5 text-sm text-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PASO 4: Evidencias fotográficas                              */}
        {/* ============================================================ */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-extrabold text-[#0B1F3A] flex items-center gap-2.5">
                <Camera className="w-5 h-5 text-[#1D4ED8]" />
                <span>4. Evidencias fotográficas</span>
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Agrega fotografías del espacio o de los detalles que quieras mostrar al equipo técnico
                (opcional pero recomendado).
              </p>
            </div>

            {/* Zona de carga */}
            <div className="border-2 border-dashed border-slate-300 hover:border-[#0891B2] rounded-2xl p-7 text-center bg-[#FAF9F6] transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3 text-[#0891B2] shadow-2xs">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#0B1F3A]">
                Sube fotografías de tus paredes, fachadas o áreas a intervenir
              </p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Formatos JPG, PNG o WebP. Puedes añadir una breve nota en cada foto.
              </p>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B1F3A] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                <span>{uploadingPhoto ? 'Cargando imagen...' : 'Seleccionar fotografías'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploadingPhoto}
                  className="hidden"
                />
              </label>
            </div>

            {/* Galería de fotos cargadas */}
            {formData.evidencias.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Fotografías adjuntas ({formData.evidencias.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {formData.evidencias.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3.5 bg-[#FAF9F6] border border-slate-200 rounded-2xl flex items-start gap-3"
                    >
                      <div className="w-16 h-16 rounded-xl bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
                        <img
                          src={ev.archivo_url}
                          alt={ev.nombre_archivo}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-xs font-bold text-[#0B1F3A] truncate">
                          {ev.nombre_archivo}
                        </p>
                        <input
                          type="text"
                          value={ev.descripcion}
                          onChange={(e) => updateEvidenceDescription(ev.id, e.target.value)}
                          placeholder="Descripción de esta foto..."
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-[#1D4ED8]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEvidence(ev.id)}
                        aria-label="Eliminar fotografía"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Orientación preliminar COLORLINK IA generada al avanzar desde paso 3 */}
            {aiPreview && (
              <div className="p-5 rounded-2xl bg-[#0B1F3A] text-white space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Orientación preliminar COLORLINK IA</span>
                  </span>
                  <span className="text-[11px] text-slate-300">
                    Sujeta a revisión de un especialista técnico
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {aiPreview.recomendacionPreliminar}
                </p>
                <p className="text-xs text-cyan-300 font-medium">
                  Sistema orientativo: {aiPreview.sistemaSugerido.nombreSistema}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* PASO 5: Confirmación, consentimiento y guardado              */}
        {/* ============================================================ */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-extrabold text-[#0B1F3A] flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#0891B2]" />
                <span>5. Confirmación y guardado</span>
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Verifica los datos de tu proyecto y confirma el consentimiento de tratamiento de datos
                antes de guardar.
              </p>
            </div>

            {/* Tarjeta de resumen del proyecto */}
            <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-slate-200/90 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1D4ED8] block">
                Resumen de tu solicitud
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">
                    Cliente ({formData.clienteTipo.replace('_', ' ')})
                  </span>
                  <span className="font-bold text-[#0B1F3A] text-sm">{formData.clienteNombre}</span>
                  <span className="text-slate-500 block">{formData.clienteCorreo}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Proyecto y ubicación</span>
                  <span className="font-bold text-[#0B1F3A] text-sm">{formData.proyectoNombre}</span>
                  <span className="text-slate-500 block">
                    {formData.ciudad} · Fecha: {formData.fechaRequerida}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Superficie y área</span>
                  <span className="font-bold text-[#0B1F3A] text-sm tabular-nums">
                    {formData.tipoSuperficie} · {formData.areaAproximada} {formData.unidadMedida}
                  </span>
                  <span className="text-slate-500 block">
                    Humedad {formData.humedad.toLowerCase()} ·{' '}
                    {formData.fisuras ? 'Con fisuras' : 'Sin fisuras'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Color deseado: </span>
                  <span className="font-semibold text-[#0B1F3A]">
                    {formData.colorRequerido || 'Por definir'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Fotografías adjuntas: </span>
                  <span className="font-semibold text-[#0B1F3A] tabular-nums">
                    {formData.evidencias.length} archivo(s)
                  </span>
                </div>
              </div>
            </div>

            {/* Casillas de consentimiento informado */}
            <div className="space-y-3 p-5 rounded-2xl bg-white border border-slate-200 text-xs">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={formData.autorizacionDatos}
                  onChange={(e) =>
                    setFormData({ ...formData, autorizacionDatos: e.target.checked })
                  }
                  className="w-4 h-4 mt-0.5 accent-[#0891B2] rounded shrink-0"
                />
                <span className="text-slate-700 leading-relaxed">
                  <strong className="text-[#0B1F3A]">
                    Autorización de tratamiento de datos personales:
                  </strong>{' '}
                  Autorizo de manera previa, expresa e informada a COLORLINK para gestionar mis
                  datos de contacto con el fin de atender este proyecto, elaborar propuestas y
                  brindar seguimiento.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer pt-3 border-t border-slate-100">
                <input
                  type="checkbox"
                  required={requiresTechnicalAuthorization}
                  checked={formData.autorizacionUsoTecnico}
                  onChange={(e) =>
                    setFormData({ ...formData, autorizacionUsoTecnico: e.target.checked })
                  }
                  className="w-4 h-4 mt-0.5 accent-[#0891B2] rounded shrink-0"
                />
                <span className="text-slate-700 leading-relaxed">
                  <strong className="text-[#0B1F3A]">
                    Uso técnico de información y evidencias fotográficas:
                  </strong>{' '}
                  Autorizo a los especialistas de COLORLINK a analizar la descripción y fotografías
                  registradas para estructurar el diagnóstico y la recomendación técnica del espacio.
                </span>
              </label>

              {!isConfirmationAllowed && (
                <p className="text-[11px] font-medium text-amber-700 pt-2 border-t border-slate-100">
                  Debes aceptar tanto el tratamiento de datos personales como el uso técnico de la
                  información registrada para habilitar el guardado del proyecto.
                </p>
              )}
            </div>

            {/* Estado real de error si Supabase rechaza el guardado (nunca se simula éxito falso) */}
            {submitError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2.5">
                <div className="font-bold flex items-center gap-2 text-rose-800 text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>No se pudo confirmar el guardado del proyecto en la base de datos</span>
                </div>
                <p className="text-rose-800 leading-relaxed">
                  Para proteger la integridad de tu información, COLORLINK no registra proyectos
                  ficticios cuando el servidor reporta un inconveniente. Detalle devuelto por
                  Supabase:
                </p>
                <div className="p-2.5 rounded-xl bg-white border border-rose-200 font-mono text-[11px] text-rose-900 break-words">
                  {submitError}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                    <span>Reintentar confirmación</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botones de navegación del formulario */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-100">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-3 rounded-xl bg-[#0B1F3A] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !isConfirmationAllowed}
              className="px-6 py-3 rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white text-xs font-semibold inline-flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Confirmando en Supabase...' : 'Confirmar proyecto'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
