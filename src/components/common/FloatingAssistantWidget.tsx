import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Maximize2,
  Minimize2,
  ArrowRight,
  Sliders,
  Palette,
  FolderPlus,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { HumidityLevel, WearLevel } from '../../types';
import {
  runColorlinkAIDiagnosis,
  AIDiagnosisResult,
} from '../../services/diagnostics/diagnosticService';
import { ActiveView, SolutionCategoryKey } from '../layout/Navbar';
import {
  ColorExplorerFilterRequest,
  ExplorerColorItem,
  suggestColorsFromUserText,
} from '../../data/colorExplorerData';
import { WizardPrefill } from '../../App';

export interface FloatingAssistantWidgetProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onNavigate: (view: ActiveView) => void;
  onSelectCategory: (category: SolutionCategoryKey) => void;
  onExploreColors: (filter?: Omit<ColorExplorerFilterRequest, 'timestamp'>) => void;
  onStartProjectWithPrefill: (prefill?: WizardPrefill) => void;
}

interface TechnicalFormState {
  need: string;
  surface: string;
  location: 'INTERIOR' | 'EXTERIOR';
  humidity: HumidityLevel;
  cracks: boolean;
  wear: WearLevel;
}

interface ChatAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  colorFilter?: Omit<ColorExplorerFilterRequest, 'timestamp'>;
  actionType:
    | 'OPEN_TECH_FORM'
    | 'EXPAND_MODAL'
    | 'EXPLORE_COLORS'
    | 'CREATE_PROJECT'
    | 'CREATE_PROJECT_WITH_DATA'
    | 'GO_CATEGORY_HUMEDAD'
    | 'GO_CATEGORY_INTERIOR'
    | 'GO_CATEGORY_FISURAS'
    | 'GO_CATEGORY_PREPARACION';
}

interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  diagnosis?: AIDiagnosisResult;
  formSnapshot?: TechnicalFormState;
  suggestedColors?: ExplorerColorItem[];
  showInlineForm?: boolean;
  actions?: ChatAction[];
}

const QUICK_PROMPTS: string[] = [
  'Quiero elegir un color.',
  'Tengo humedad.',
  'Necesito reparar fisuras.',
  'Quiero pintar una habitación.',
  'Crear un proyecto.',
];

const WELCOME_MESSAGE =
  '¡Hola! Soy COLORLINK IA. Te ayudo a encontrar el color ideal, orientar el cuidado de tus superficies o iniciar tu proyecto. ¿Qué necesitas transformar hoy?';

function formatSurfaceLabel(surface: string): string {
  switch (surface) {
    case 'MAMPOSTERIA':
      return 'Muro / Mampostería';
    case 'CONCRETO':
      return 'Concreto / Losa';
    case 'DRYWALL':
      return 'Drywall / Estuco';
    case 'ACERO_CARBONO':
      return 'Metal / Estructura';
    case 'MADERA':
      return 'Madera';
    default:
      return surface;
  }
}

function inferParametersFromText(
  text: string,
  current: TechnicalFormState
): TechnicalFormState {
  const lower = text.toLowerCase();

  let surface = current.surface;
  if (lower.includes('concreto') || lower.includes('losa') || lower.includes('piso') || lower.includes('terraza')) {
    surface = 'CONCRETO';
  } else if (lower.includes('drywall') || lower.includes('yeso')) {
    surface = 'DRYWALL';
  } else if (lower.includes('metal') || lower.includes('acero') || lower.includes('reja') || lower.includes('estructura')) {
    surface = 'ACERO_CARBONO';
  } else if (lower.includes('madera') || lower.includes('puerta') || lower.includes('pérgola')) {
    surface = 'MADERA';
  } else if (lower.includes('pared') || lower.includes('muro') || lower.includes('ladrillo') || lower.includes('estuco')) {
    surface = 'MAMPOSTERIA';
  }

  let location: 'INTERIOR' | 'EXTERIOR' = current.location;
  if (
    lower.includes('fachada') ||
    lower.includes('exterior') ||
    lower.includes('terraza') ||
    lower.includes('cubierta') ||
    lower.includes('lluvia') ||
    lower.includes('intemperie')
  ) {
    location = 'EXTERIOR';
  } else if (
    lower.includes('interior') ||
    lower.includes('sala') ||
    lower.includes('habitaci') ||
    lower.includes('alcoba') ||
    lower.includes('oficina') ||
    lower.includes('cocina')
  ) {
    location = 'INTERIOR';
  }

  let humidity: HumidityLevel = current.humidity;
  if (
    lower.includes('filtrac') ||
    lower.includes('gotera') ||
    lower.includes('moho') ||
    lower.includes('humedad alta') ||
    lower.includes('mucha humedad')
  ) {
    humidity = 'ALTA';
  } else if (lower.includes('humedad') || lower.includes('mancha') || lower.includes('ampolla')) {
    humidity = 'MEDIA';
  } else if (lower.includes('seco') || lower.includes('sin humedad')) {
    humidity = 'BAJA';
  }

  let cracks = current.cracks;
  if (lower.includes('sin fisura') || lower.includes('sin grieta')) {
    cracks = false;
  } else if (lower.includes('fisura') || lower.includes('grieta') || lower.includes('rajadura') || lower.includes('cuarte')) {
    cracks = true;
  }

  const wear: WearLevel =
    lower.includes('desprend') || lower.includes('descascara') || humidity === 'ALTA'
      ? 'AVANZADO'
      : cracks
      ? 'MODERADO'
      : 'LEVE';

  return {
    need: text,
    surface,
    location,
    humidity,
    cracks,
    wear,
  };
}

export const FloatingAssistantWidget: React.FC<FloatingAssistantWidgetProps> = ({
  isOpen,
  onOpen,
  onClose,
  onNavigate,
  onSelectCategory,
  onExploreColors,
  onStartProjectWithPrefill,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showCompactForm, setShowCompactForm] = useState(false);

  const [techForm, setTechForm] = useState<TechnicalFormState>({
    need: 'Quiero renovar las paredes de un espacio interior con humedad leve y pequeñas fisuras.',
    surface: 'MAMPOSTERIA',
    location: 'INTERIOR',
    humidity: 'MEDIA',
    cracks: true,
    wear: 'MODERADO',
  });

  const [latestResult, setLatestResult] = useState<AIDiagnosisResult | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: WELCOME_MESSAGE,
    },
  ]);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Desplazamiento interno dentro del contenedor del chat sin mover la página principal
  useEffect(() => {
    if (isOpen && chatScrollRef.current) {
      const container = chatScrollRef.current;
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      });
    }
  }, [messages, isAnalyzing, showCompactForm, isOpen]);

  // Cerrar con tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isExpanded) {
          setIsExpanded(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExpanded, onClose]);

  const executeTechnicalEvaluation = async (formToRun: TechnicalFormState) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const diagnosis = await runColorlinkAIDiagnosis({
        tipoSuperficie: formToRun.surface,
        ubicacion: formToRun.location,
        ambiente: 'RESIDENCIAL',
        areaAproximada: 45,
        humedad: formToRun.humidity,
        fisuras: formToRun.cracks,
        desgaste: formToRun.wear,
        desprendimiento: formToRun.humidity === 'ALTA',
        descripcionProblema: formToRun.need,
      });

      setLatestResult(diagnosis);
      setShowCompactForm(false);

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-diag-${Date.now()}`,
          sender: 'assistant',
          text: 'He estructurado una orientación preliminar según las condiciones indicadas:',
          diagnosis,
          formSnapshot: { ...formToRun },
          actions: [
            {
              label: 'Crear proyecto con estos datos',
              variant: 'primary',
              actionType: 'CREATE_PROJECT_WITH_DATA',
            },
            {
              label: 'Ver análisis completo',
              variant: 'secondary',
              actionType: 'EXPAND_MODAL',
            },
          ],
        },
      ]);
    } catch (err: any) {
      const message =
        err?.message || 'No fue posible completar el análisis en este momento. Intenta nuevamente.';
      setAnalysisError(message);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          text: `Ocurrió un inconveniente al consultar el análisis: ${message}`,
        },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: prompt,
    };

    if (prompt === 'Tengo humedad.') {
      const nextForm: TechnicalFormState = {
        ...techForm,
        need: 'Tengo humedad en la superficie y necesito orientación sobre el tratamiento adecuado antes de pintar.',
        humidity: 'ALTA',
        cracks: false,
        wear: 'MODERADO',
      };
      setTechForm(nextForm);
      setShowCompactForm(false);
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: `ast-${Date.now() + 1}`,
          sender: 'assistant',
          text: 'Cuando hay humedad, lo primero es identificar si proviene de filtración exterior, cubierta o condensación antes de aplicar pintura. Cuéntame en qué pared o techo aparece, o si prefieres abre el formulario técnico para evaluarla paso a paso.',
          actions: [
            {
              label: 'Abrir formulario técnico',
              variant: 'primary',
              actionType: 'OPEN_TECH_FORM',
            },
            {
              label: 'Soluciones de humedad',
              variant: 'secondary',
              actionType: 'GO_CATEGORY_HUMEDAD',
            },
          ],
        },
      ]);
      return;
    }

    if (prompt === 'Quiero pintar una habitación.') {
      const nextForm: TechnicalFormState = {
        ...techForm,
        need: 'Quiero pintar y renovar una habitación logrando un ambiente armónico, lavable y duradero.',
        location: 'INTERIOR',
        humidity: 'BAJA',
        cracks: false,
        wear: 'LEVE',
      };
      setTechForm(nextForm);
      setShowCompactForm(false);
      const roomRec = suggestColorsFromUserText('habitacion relajante y luminosa');
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: `ast-${Date.now() + 1}`,
          sender: 'assistant',
          text: '¡Excelente idea! Para una habitación suelen funcionar muy bien tonos serenos y luminosos como estos. Puedes probarlos en la habitación ilustrada o pedir una evaluación técnica de tus paredes:',
          suggestedColors: roomRec.suggestedColors,
          actions: [
            {
              label: 'Ver colores para habitación',
              variant: 'primary',
              actionType: 'EXPLORE_COLORS',
              colorFilter: { environment: 'HABITACION' },
            },
            {
              label: 'Abrir formulario técnico',
              variant: 'secondary',
              actionType: 'OPEN_TECH_FORM',
            },
            {
              label: 'Soluciones de interior',
              variant: 'ghost',
              actionType: 'GO_CATEGORY_INTERIOR',
            },
          ],
        },
      ]);
      return;
    }

    if (prompt === 'Necesito reparar fisuras.') {
      const nextForm: TechnicalFormState = {
        ...techForm,
        need: 'Necesito reparar fisuras visibles y nivelar la superficie antes de aplicar el acabado final.',
        humidity: 'BAJA',
        cracks: true,
        wear: 'MODERADO',
      };
      setTechForm(nextForm);
      setShowCompactForm(false);
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: `ast-${Date.now() + 1}`,
          sender: 'assistant',
          text: 'Las microfisuras superficiales deben limpiarse y sellarse con masilla flexible antes de pintar para evitar que reaparezcan. ¿Deseas revisar la guía de reparación de fisuras o completar el formulario técnico de tu pared?',
          actions: [
            {
              label: 'Abrir formulario técnico',
              variant: 'primary',
              actionType: 'OPEN_TECH_FORM',
            },
            {
              label: 'Ver solución para fisuras',
              variant: 'secondary',
              actionType: 'GO_CATEGORY_FISURAS',
            },
          ],
        },
      ]);
      return;
    }

    if (prompt === 'Quiero elegir un color.') {
      setShowCompactForm(false);
      const initialRec = suggestColorsFromUserText('sala luminosa y acogedora');
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: `ast-${Date.now() + 1}`,
          sender: 'assistant',
          text: '¡Con gusto! Cuéntame qué espacio vas a pintar (sala, habitación, cocina, fachada u oficina) y qué sensación buscas, o explora una de estas armonías:',
          suggestedColors: initialRec.suggestedColors,
          actions: [
            {
              label: 'Sala luminosa',
              variant: 'secondary',
              actionType: 'EXPLORE_COLORS',
              colorFilter: { environment: 'SALA', mood: 'LUMINOSO' },
            },
            {
              label: 'Habitación relajante',
              variant: 'secondary',
              actionType: 'EXPLORE_COLORS',
              colorFilter: { environment: 'HABITACION', mood: 'RELAJANTE' },
            },
            {
              label: 'Fachada moderna',
              variant: 'secondary',
              actionType: 'EXPLORE_COLORS',
              colorFilter: { environment: 'FACHADA', mood: 'MODERNO' },
            },
            {
              label: 'Explorar todos los colores',
              variant: 'primary',
              actionType: 'EXPLORE_COLORS',
            },
          ],
        },
      ]);
      return;
    }

    if (prompt === 'Crear un proyecto.') {
      setShowCompactForm(false);
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: `ast-${Date.now() + 1}`,
          sender: 'assistant',
          text: 'Puedes pasar directamente al registro guiado de tu proyecto (conservando cualquier dato que ya hayas escrito), o si lo deseas solicita aquí primero el formulario técnico preliminar.',
          actions: [
            {
              label: 'Ir a Crear mi proyecto',
              variant: 'primary',
              actionType: 'CREATE_PROJECT',
            },
            {
              label: 'Formulario técnico completo',
              variant: 'secondary',
              actionType: 'EXPAND_MODAL',
            },
          ],
        },
      ]);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isAnalyzing) return;

    setInputText('');
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);

    const lower = trimmed.toLowerCase();
    const mentionsSurfacePathology =
      lower.includes('humedad') ||
      lower.includes('filtrac') ||
      lower.includes('gotera') ||
      lower.includes('moho') ||
      lower.includes('fisura') ||
      lower.includes('grieta') ||
      lower.includes('descascara') ||
      lower.includes('desprend') ||
      lower.includes('estuco');

    const mentionsColorOrMood =
      lower.includes('color') ||
      lower.includes('tono') ||
      lower.includes('paleta') ||
      lower.includes('combin') ||
      lower.includes('relaj') ||
      lower.includes('calid') ||
      lower.includes('acogedor') ||
      lower.includes('luminos') ||
      lower.includes('modern') ||
      lower.includes('natural') ||
      lower.includes('verde') ||
      lower.includes('azul') ||
      lower.includes('beige') ||
      lower.includes('blanco') ||
      lower.includes('terracota');

    if (mentionsColorOrMood && !mentionsSurfacePathology) {
      const rec = suggestColorsFromUserText(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          id: `ast-${Date.now() + 1}`,
          sender: 'assistant',
          text: rec.explanation,
          suggestedColors: rec.suggestedColors,
          actions: [
            {
              label: 'Ver selección en el explorador',
              variant: 'primary',
              actionType: 'EXPLORE_COLORS',
              colorFilter: {
                environment: rec.detectedEnvironment,
                mood: rec.detectedMood,
                colorId: rec.suggestedColors[0]?.id,
              },
            },
            {
              label: 'Probar en mi espacio',
              variant: 'secondary',
              actionType: 'EXPLORE_COLORS',
              colorFilter: {
                environment: rec.detectedEnvironment,
                mood: rec.detectedMood,
                colorId: rec.suggestedColors[0]?.id,
                openSimulator: true,
              },
            },
            {
              label: 'Evaluar también mi pared',
              variant: 'ghost',
              actionType: 'OPEN_TECH_FORM',
            },
          ],
        },
      ]);
      return;
    }

    const updatedForm = inferParametersFromText(trimmed, techForm);
    setTechForm(updatedForm);
    await executeTechnicalEvaluation(updatedForm);
  };

  const handleActionClick = (action: ChatAction, snapshot?: TechnicalFormState) => {
    const activeForm = snapshot || techForm;

    switch (action.actionType) {
      case 'OPEN_TECH_FORM':
        setShowCompactForm(true);
        break;
      case 'EXPAND_MODAL':
        setIsExpanded(true);
        break;
      case 'EXPLORE_COLORS':
        setIsExpanded(false);
        onClose();
        onExploreColors(action.colorFilter);
        break;
      case 'CREATE_PROJECT':
        setIsExpanded(false);
        onClose();
        onStartProjectWithPrefill(undefined);
        break;
      case 'CREATE_PROJECT_WITH_DATA':
        setIsExpanded(false);
        onClose();
        onStartProjectWithPrefill({
          tipoSuperficie: activeForm.surface,
          ubicacion: activeForm.location,
          descripcionProblema: activeForm.need,
          humedad: activeForm.humidity,
          fisuras: activeForm.cracks,
          desgaste: activeForm.wear,
        });
        break;
      case 'GO_CATEGORY_HUMEDAD':
        setIsExpanded(false);
        onClose();
        onSelectCategory('HUMEDAD');
        onNavigate('soluciones');
        break;
      case 'GO_CATEGORY_INTERIOR':
        setIsExpanded(false);
        onClose();
        onSelectCategory('INTERIOR');
        onNavigate('soluciones');
        break;
      case 'GO_CATEGORY_FISURAS':
        setIsExpanded(false);
        onClose();
        onSelectCategory('FISURAS');
        onNavigate('soluciones');
        break;
      case 'GO_CATEGORY_PREPARACION':
        setIsExpanded(false);
        onClose();
        onSelectCategory('PREPARACION');
        onNavigate('soluciones');
        break;
    }
  };

  const handleCompactFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!techForm.need.trim() || isAnalyzing) return;
    await executeTechnicalEvaluation(techForm);
  };

  return (
    <>
      {/* =================================================================== */}
      {/* 1. BOTÓN FLOTANTE COMPACTO (ESQUINA INFERIOR DERECHA)               */}
      {/* =================================================================== */}
      {!isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 flex items-center gap-2 pointer-events-none">
          <button
            type="button"
            onClick={onOpen}
            aria-label="Abrir agente COLORLINK IA"
            className="pointer-events-auto group inline-flex items-center justify-center gap-2.5 h-12 px-3 sm:pl-2.5 sm:pr-4 rounded-full bg-[#092653] hover:bg-[#155EEF] text-white border-2 border-white shadow-lg shadow-[#092653]/25 transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#08B6CC] cursor-pointer"
          >
            <span className="w-8 h-8 rounded-full bg-[#08B6CC] text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[#FFE34D]" />
            </span>
            <span className="font-display text-xs font-extrabold tracking-wide whitespace-nowrap">
              COLORLINK IA
            </span>
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. VENTANA FLOTANTE DEL AGENTE (~380px ANCHO, ADAPTABLE A MÓVIL)    */}
      {/* =================================================================== */}
      {isOpen && !isExpanded && (
        <section
          aria-label="Ventana de asistente COLORLINK IA"
          className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-50 w-[calc(100vw-1.5rem)] max-w-[384px] sm:w-[380px] h-[min(520px,calc(100dvh-1.5rem))] sm:h-[min(520px,calc(100dvh-2.5rem))] bg-white rounded-2xl border border-[#E7EAF0] shadow-2xl shadow-[#092653]/20 flex flex-col overflow-hidden"
        >
          {/* Encabezado de la ventana flotante */}
          <div className="bg-[#092653] text-white px-4 py-3.5 flex items-center justify-between gap-2 shrink-0 border-b border-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#08B6CC] text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-[#FFE34D]" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-sm font-extrabold tracking-tight text-white leading-tight truncate">
                  COLORLINK IA
                </h2>
                <p className="text-[11px] text-cyan-200 truncate">
                  Asesor de color y superficies
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                title="Abrir formulario técnico completo"
                aria-label="Formulario técnico completo"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-cyan-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Formulario</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar asistente"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cuerpo conversacional con desplazamiento independiente */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3.5 bg-[#FAF9F6]"
          >
            {messages.map((msg, index) => (
              <div key={msg.id} className="space-y-2.5">
                <div
                  className={`flex ${
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#0B1F3A] text-white rounded-br-sm'
                        : 'bg-white text-slate-800 border border-slate-200/90 shadow-2xs rounded-bl-sm'
                    }`}
                  >
                    <p>{msg.text}</p>

                    {/* Resumen compacto de los 5 elementos del análisis técnico cuando existe */}
                    {msg.diagnosis && msg.formSnapshot && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2 text-xs">
                        <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 font-medium">
                          Sugerencia preliminar sujeta a validación técnica
                        </div>

                        <div>
                          <span className="font-bold text-[#0B1F3A] block">
                            1. Necesidad identificada:
                          </span>
                          <span className="text-slate-600 line-clamp-2">
                            {msg.formSnapshot.need}
                          </span>
                        </div>

                        <div>
                          <span className="font-bold text-[#0B1F3A] block">
                            2. Condiciones de la superficie:
                          </span>
                          <span className="text-slate-600">
                            {formatSurfaceLabel(msg.formSnapshot.surface)} (
                            {msg.formSnapshot.location.toLowerCase()}) · Humedad{' '}
                            {msg.formSnapshot.humidity.toLowerCase()} ·{' '}
                            {msg.diagnosis.patologiasDetectadas[0]}
                          </span>
                        </div>

                        <div>
                          <span className="font-bold text-[#0B1F3A] block">
                            3. Recomendación preliminar:
                          </span>
                          <span className="text-slate-600">
                            {msg.diagnosis.preparacionSuperficieSugerida}
                          </span>
                        </div>

                        <div>
                          <span className="font-bold text-[#0B1F3A] block">
                            4. Alternativa comercial:
                          </span>
                          <span className="text-[#0891B2] font-semibold">
                            {msg.diagnosis.sistemaSugerido.nombreSistema}
                          </span>
                        </div>

                        <div>
                          <span className="font-bold text-[#0B1F3A] block">
                            5. Próximos pasos:
                          </span>
                          <span className="text-slate-600">
                            Registra tu proyecto con fotos para validación por un especialista.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Muestras cromáticas sugeridas dentro de la conversación */}
                    {msg.suggestedColors && msg.suggestedColors.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Muestras ilustrativas recomendadas (pulsa para simular)
                        </span>
                        <div className="grid grid-cols-1 gap-1.5">
                          {msg.suggestedColors.map((swatch) => (
                            <button
                              key={swatch.id}
                              type="button"
                              onClick={() => {
                                setIsExpanded(false);
                                onClose();
                                onExploreColors({
                                  colorId: swatch.id,
                                  openSimulator: true,
                                });
                              }}
                              className="w-full p-2 rounded-xl bg-[#FAF9F6] hover:bg-cyan-50/60 border border-slate-200/80 hover:border-[#0891B2]/50 flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className="w-7 h-7 rounded-lg border border-black/10 shadow-2xs shrink-0"
                                  style={{ backgroundColor: swatch.hex }}
                                />
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-[#0B1F3A] block truncate">
                                    {swatch.name}
                                  </span>
                                  <span className="text-[11px] text-slate-500 block truncate">
                                    {swatch.sensationShort}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[11px] font-semibold text-[#0891B2] shrink-0">
                                Simular →
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Acciones contextuales del mensaje */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {msg.actions.map((act) => (
                          <button
                            key={act.label}
                            type="button"
                            onClick={() => handleActionClick(act, msg.formSnapshot)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                              act.variant === 'primary'
                                ? 'bg-[#0891B2] hover:bg-[#0E7490] text-white'
                                : act.variant === 'secondary'
                                ? 'bg-slate-100 hover:bg-slate-200 text-[#0B1F3A]'
                                : 'text-[#1D4ED8] hover:underline px-1'
                            }`}
                          >
                            <span>{act.label}</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Accesos rápidos debajo del mensaje de bienvenida */}
                {index === 0 && (
                  <div className="pt-1 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 block px-0.5">
                      Accesos rápidos:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_PROMPTS.map((qp) => (
                        <button
                          key={qp}
                          type="button"
                          onClick={() => handleQuickPrompt(qp)}
                          className="text-left px-3 py-1.5 rounded-xl bg-white hover:bg-cyan-50/70 text-[#0B1F3A] hover:text-[#0891B2] border border-slate-200 hover:border-[#0891B2]/50 text-xs font-medium transition-colors cursor-pointer"
                        >
                          {qp}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Indicador de evaluación en curso */}
            {isAnalyzing && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-600 shadow-2xs">
                  Analizando las condiciones de tu superficie…
                </div>
              </div>
            )}

            {/* Formulario técnico compacto integrado en la conversación cuando se solicita */}
            {showCompactForm && (
              <form
                onSubmit={handleCompactFormSubmit}
                className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-3 shadow-xs text-xs"
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <span className="font-bold text-[#0B1F3A] inline-flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#0891B2]" />
                    <span>Datos técnicos de la superficie</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCompactForm(false)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Ocultar
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Descripción de la necesidad
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={techForm.need}
                    onChange={(e) =>
                      setTechForm((prev) => ({ ...prev, need: e.target.value }))
                    }
                    placeholder="Describe el estado actual y lo que deseas lograr..."
                    className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-[#0891B2]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Tipo de superficie
                    </label>
                    <select
                      value={techForm.surface}
                      onChange={(e) =>
                        setTechForm((prev) => ({ ...prev, surface: e.target.value }))
                      }
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] text-slate-900 focus:outline-none focus:border-[#0891B2]"
                    >
                      <option value="MAMPOSTERIA">Muro / Mampostería</option>
                      <option value="CONCRETO">Concreto / Losa</option>
                      <option value="DRYWALL">Drywall / Estuco</option>
                      <option value="ACERO_CARBONO">Metal / Estructura</option>
                      <option value="MADERA">Madera</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Ubicación
                    </label>
                    <select
                      value={techForm.location}
                      onChange={(e) =>
                        setTechForm((prev) => ({
                          ...prev,
                          location: e.target.value as 'INTERIOR' | 'EXTERIOR',
                        }))
                      }
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] text-slate-900 focus:outline-none focus:border-[#0891B2]"
                    >
                      <option value="INTERIOR">Interior</option>
                      <option value="EXTERIOR">Exterior / Fachada</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Humedad observada
                    </label>
                    <select
                      value={techForm.humidity}
                      onChange={(e) =>
                        setTechForm((prev) => ({
                          ...prev,
                          humidity: e.target.value as HumidityLevel,
                        }))
                      }
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] text-slate-900 focus:outline-none focus:border-[#0891B2]"
                    >
                      <option value="BAJA">Baja / Sin humedad</option>
                      <option value="MEDIA">Moderada / Manchas</option>
                      <option value="ALTA">Alta / Filtración activa</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Desgaste o fisuras
                    </label>
                    <select
                      value={techForm.cracks ? 'CON_FISURAS' : 'SIN_FISURAS'}
                      onChange={(e) => {
                        const hasCracks = e.target.value === 'CON_FISURAS';
                        setTechForm((prev) => ({
                          ...prev,
                          cracks: hasCracks,
                          wear: hasCracks ? 'MODERADO' : 'LEVE',
                        }));
                      }}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] text-slate-900 focus:outline-none focus:border-[#0891B2]"
                    >
                      <option value="CON_FISURAS">Con fisuras visibles</option>
                      <option value="SIN_FISURAS">Sin fisuras visibles</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isAnalyzing}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Obtener recomendación</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    className="py-2 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-[#0B1F3A] font-semibold text-[11px] cursor-pointer whitespace-nowrap"
                  >
                    Vista amplia
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Campo de entrada inferior */}
          <form
            onSubmit={handleChatSubmit}
            className="p-3 bg-white border-t border-slate-200/90 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe tu necesidad…"
              aria-label="Describe tu necesidad"
              className="flex-1 bg-[#FAF9F6] border border-slate-200 focus:bg-white focus:border-[#0891B2] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isAnalyzing}
              aria-label="Enviar mensaje"
              className="w-10 h-10 rounded-xl bg-[#0891B2] hover:bg-[#0E7490] disabled:bg-slate-200 disabled:text-slate-400 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>
      )}

      {/* =================================================================== */}
      {/* 3. VISTA AMPLIADA (MODAL DE ANÁLISIS TÉCNICO COMPLETO)              */}
      {/* =================================================================== */}
      {isOpen && isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Análisis técnico completo COLORLINK IA"
            className="w-full max-w-4xl max-h-[92dvh] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Encabezado del modal ampliado */}
            <div className="bg-[#0B1F3A] text-white px-5 sm:px-7 py-4 flex items-center justify-between gap-4 shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#0891B2] text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-extrabold text-white truncate">
                    COLORLINK IA · Análisis técnico de superficies
                  </h2>
                  <p className="text-xs text-cyan-200 truncate">
                    Tu asistente de soluciones · Evaluación preliminar estructurada
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Volver al chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    onClose();
                  }}
                  aria-label="Cerrar asistente"
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido desplazable del análisis ampliado */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-7 bg-[#FAF9F6]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                {/* Columna izquierda: Formulario organizado con los 5 campos conservados */}
                <form
                  onSubmit={handleCompactFormSubmit}
                  className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-sm font-bold text-[#0B1F3A] inline-flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#1D4ED8]" />
                      <span>Condiciones de tu espacio</span>
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Descripción de la necesidad
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={techForm.need}
                      onChange={(e) =>
                        setTechForm((prev) => ({ ...prev, need: e.target.value }))
                      }
                      placeholder="Ej. Pared exterior con descascaramiento por lluvia y pequeñas grietas..."
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:border-[#0891B2]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Tipo de superficie
                      </label>
                      <select
                        value={techForm.surface}
                        onChange={(e) =>
                          setTechForm((prev) => ({ ...prev, surface: e.target.value }))
                        }
                        className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0891B2]"
                      >
                        <option value="MAMPOSTERIA">Muro / Mampostería</option>
                        <option value="CONCRETO">Concreto / Losa</option>
                        <option value="DRYWALL">Drywall / Estuco</option>
                        <option value="ACERO_CARBONO">Metal / Estructura</option>
                        <option value="MADERA">Madera</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Ubicación interior o exterior
                      </label>
                      <select
                        value={techForm.location}
                        onChange={(e) =>
                          setTechForm((prev) => ({
                            ...prev,
                            location: e.target.value as 'INTERIOR' | 'EXTERIOR',
                          }))
                        }
                        className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0891B2]"
                      >
                        <option value="INTERIOR">Interior</option>
                        <option value="EXTERIOR">Exterior / Fachada</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Humedad observada
                      </label>
                      <select
                        value={techForm.humidity}
                        onChange={(e) =>
                          setTechForm((prev) => ({
                            ...prev,
                            humidity: e.target.value as HumidityLevel,
                          }))
                        }
                        className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0891B2]"
                      >
                        <option value="BAJA">Baja / Sin humedad</option>
                        <option value="MEDIA">Moderada / Manchas</option>
                        <option value="ALTA">Alta / Filtración activa</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Desgaste o fisuras
                      </label>
                      <select
                        value={techForm.cracks ? 'CON_FISURAS' : 'SIN_FISURAS'}
                        onChange={(e) => {
                          const hasCracks = e.target.value === 'CON_FISURAS';
                          setTechForm((prev) => ({
                            ...prev,
                            cracks: hasCracks,
                            wear: hasCracks ? 'MODERADO' : 'LEVE',
                          }));
                        }}
                        className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0891B2]"
                      >
                        <option value="CON_FISURAS">Con fisuras visibles</option>
                        <option value="SIN_FISURAS">Sin fisuras visibles</option>
                      </select>
                    </div>
                  </div>

                  {analysisError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                      {analysisError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAnalyzing}
                    className="w-full py-3 px-4 rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {isAnalyzing ? 'Analizando condiciones...' : 'Obtener orientación IA'}
                    </span>
                  </button>

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setIsExpanded(false);
                        onClose();
                        onExploreColors();
                      }}
                      className="inline-flex items-center gap-1.5 text-slate-600 hover:text-[#0891B2] font-semibold cursor-pointer"
                    >
                      <Palette className="w-3.5 h-3.5 text-[#0891B2]" />
                      <span>Explorar colores</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsExpanded(false);
                        onClose();
                        onNavigate('colorlink-ia');
                      }}
                      className="text-[#1D4ED8] hover:underline font-semibold cursor-pointer"
                    >
                      Simulador técnico avanzado →
                    </button>
                  </div>
                </form>

                {/* Columna derecha: Resultado estructurado en los 5 elementos clave */}
                <div className="lg:col-span-7 bg-[#0B1F3A] text-white rounded-2xl p-5 sm:p-6 space-y-4 border border-slate-800 shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <span className="text-xs font-bold text-cyan-300">
                      Resultado del análisis orientativo
                    </span>
                    <span className="text-[11px] px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-200 border border-amber-400/30 font-medium">
                      Sugerencia preliminar · Sujeta a validación técnica
                    </span>
                  </div>

                  {latestResult ? (
                    <div className="space-y-3.5 text-xs sm:text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                            1. Necesidad identificada
                          </span>
                          <p className="text-slate-200 text-xs leading-relaxed">
                            {techForm.need}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                            2. Condiciones de la superficie
                          </span>
                          <p className="text-slate-200 text-xs leading-relaxed">
                            {formatSurfaceLabel(techForm.surface)} en{' '}
                            {techForm.location.toLowerCase()} · Humedad{' '}
                            {techForm.humidity.toLowerCase()} ·{' '}
                            {latestResult.patologiasDetectadas.join(', ')}.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block">
                          3. Recomendación preliminar
                        </span>
                        <p className="text-slate-100 text-xs sm:text-sm leading-relaxed">
                          {latestResult.recomendacionPreliminar}
                        </p>
                        <p className="text-xs text-cyan-200 pt-1">
                          Preparación sugerida: {latestResult.preparacionSuperficieSugerida}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                            4. Alternativa comercial
                          </span>
                          <p className="text-white text-xs font-semibold">
                            {latestResult.sistemaSugerido.nombreSistema}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Esquema multicapa ({latestResult.sistemaSugerido.capas.length} etapas)
                            sujeto a cotización formal según metraje real.
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between gap-2.5">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                              5. Próximos pasos
                            </span>
                            <p className="text-slate-300 text-xs leading-relaxed">
                              Registra tu proyecto con fotos del área para que un especialista
                              valide el diagnóstico definitivo.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleActionClick(
                                {
                                  label: 'Crear proyecto con estos datos',
                                  actionType: 'CREATE_PROJECT_WITH_DATA',
                                },
                                techForm
                              )
                            }
                            className="py-2 px-3 rounded-lg bg-[#06B6D4] hover:bg-[#0891B2] text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                            <span>Crear proyecto con estos datos</span>
                          </button>
                        </div>
                      </div>

                      {latestResult.validacionTecnicaRequerida && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/25 flex items-start gap-2.5 text-xs text-amber-100">
                          <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                          <span>
                            Por las condiciones reportadas se recomienda revisión por un técnico
                            especialista antes de aplicar el recubrimiento final.
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 space-y-4">
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        Completa los campos a la izquierda y pulsa{' '}
                        <strong className="text-white">Obtener orientación IA</strong> para
                        visualizar el análisis organizado en cinco puntos:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        {[
                          '1. Necesidad identificada',
                          '2. Condiciones de la superficie',
                          '3. Recomendación preliminar',
                          '4. Alternativa comercial',
                          '5. Próximos pasos para crear tu proyecto',
                        ].map((item) => (
                          <div
                            key={item}
                            className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-2 text-slate-200"
                          >
                            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => executeTechnicalEvaluation(techForm)}
                          disabled={isAnalyzing}
                          className="px-4 py-2.5 rounded-xl bg-[#06B6D4] hover:bg-[#0891B2] text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Evaluar condiciones actuales</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
