import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Palette,
  Home,
  Building2,
  Droplets,
  Layers,
  Paintbrush,
  Wrench,
  FolderGit2,
  HelpCircle,
  MapPin,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Info,
  X,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { ActiveView, SolutionCategoryKey } from '../layout/Navbar';
import { UserRole, ProjectStatus, HumidityLevel, WearLevel } from '../../types';
import { CATALOG_IMAGES } from '../../assets/images/catalogImages';
import { projectService } from '../../services/projects/projectService';
import { authService } from '../../services/auth/authService';
import { getStatusBadge } from '../common/Badge';
import { ColorExplorerSection } from '../common/ColorExplorerSection';
import {
  ColorExplorerFilterRequest,
  ExplorerEnvironmentId,
  getColorById,
  getCombinationById,
} from '../../data/colorExplorerData';
import { WizardPrefill } from '../../App';

interface LandingViewProps {
  onNavigate: (view: ActiveView, projectId?: string) => void;
  onSelectCategory?: (category: SolutionCategoryKey) => void;
  onExploreColors?: (filter?: Omit<ColorExplorerFilterRequest, 'timestamp'>) => void;
  onStartProjectWithPrefill?: (prefill?: WizardPrefill) => void;
  onOpenAssistant?: () => void;
  onSwitchRole: (role: UserRole) => void;
  onOpenSupabaseModal: () => void;
  activeRole: UserRole;
  colorExplorerRequest?: ColorExplorerFilterRequest;
}

interface SolutionLandingCard {
  key: Exclude<SolutionCategoryKey, 'TODAS' | 'HERRAMIENTAS'>;
  title: string;
  shortDesc: string;
  detailIntro: string;
  image: string;
  icon: React.ReactNode;
  recommendedSteps: string[];
  requiresSpecialistNote: string;
  prefill: WizardPrefill;
}

function getNextStepDescription(status: ProjectStatus): string {
  switch (status) {
    case 'BORRADOR':
      return 'Completar información del proyecto';
    case 'RECIBIDO':
      return 'Revisión inicial de superficie y evidencias';
    case 'EN_ANALISIS':
    case 'VALIDACION_TECNICA':
      return 'Validación técnica por especialista';
    case 'SOLUCION_GENERADA':
      return 'Revisión de solución propuesta y cotización';
    case 'COTIZACION':
      return 'Revisión y aprobación de propuesta comercial';
    case 'APROBADO':
    case 'ABASTECIMIENTO':
    case 'SERVICIO_PROGRAMADO':
      return 'Coordinación operativa de ejecución';
    case 'EN_EJECUCION':
    case 'CALIDAD':
      return 'Seguimiento de obra y control de acabado';
    case 'CERRADO':
      return 'Expediente finalizado';
    default:
      return 'Consultar detalle del proyecto';
  }
}

const HERO_SLIDES = [
  {
    id: 'slide-interior',
    image: CATALOG_IMAGES.heroColorStudio,
    alt: 'Sala moderna iluminada con paredes en tonos marfil cálido y verde salvia',
    captionTitle: 'Ambientes interiores llenos de armonía',
    captionNote: 'Muestras referenciales: Marfil Luz · Verde Salvia · Mostaza Artesanal',
    swatches: ['#F4EFE6', '#96AD98', '#C9963B'],
  },
  {
    id: 'slide-fachada',
    image: CATALOG_IMAGES.heroFacadeShowcase,
    alt: 'Fachada contemporánea pintada en tono piedra cálido con volumen azul profundo',
    captionTitle: 'Fachadas protegidas frente al clima',
    captionNote: 'Muestras referenciales: Piedra Serena · Azul Profundo · Blanco Algodón',
    swatches: ['#D8D2C5', '#1E3A5F', '#FAF7F2'],
  },
  {
    id: 'slide-confort',
    image: CATALOG_IMAGES.heroLivingRoom,
    alt: 'Espacio interior contemporáneo con acabado uniforme y luz natural',
    captionTitle: 'Soluciones guiadas para cada superficie',
    captionNote: 'Muestras referenciales: Blanco Algodón · Azul Bruma · Bruma Botánica',
    swatches: ['#FAF7F2', '#738996', '#C7D3C6'],
  },
];

export const LandingView: React.FC<LandingViewProps> = ({
  onNavigate,
  onSelectCategory,
  onExploreColors,
  onStartProjectWithPrefill,
  onOpenAssistant,
  activeRole,
  colorExplorerRequest,
}) => {
  const currentUser = authService.getCurrentUser();
  const userProjects = projectService.getProjects(activeRole, currentUser.id).slice(0, 2);

  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [heroPaused, setHeroPaused] = useState<boolean>(false);
  const [selectedSolutionModal, setSelectedSolutionModal] = useState<SolutionLandingCard | null>(
    null
  );

  useEffect(() => {
    if (heroPaused) return;
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [heroPaused]);

  const solutionCards: SolutionLandingCard[] = [
    {
      key: 'INTERIOR',
      title: 'Pintura interior',
      shortDesc:
        'Acabados uniformes y fáciles de limpiar para salas, alcobas, estudios y zonas sociales.',
      detailIntro:
        'Orientación preliminar para renovar paredes interiores según el nivel de tránsito, entrada de luz y estado del estuco existente.',
      image: CATALOG_IMAGES.solInteriores,
      icon: <Home className="w-4 h-4 text-[#155EEF]" />,
      recommendedSteps: [
        'Limpieza superficial de polvo o manchas y resane puntual de imperfecciones.',
        'Aplicación de sellador o imprimante acrílico si hay cambios fuertes de tono.',
        'Acabado interior en el color elegido respetando tiempos de secado entre manos.',
      ],
      requiresSpecialistNote:
        'Sugerencia preliminar orientativa. Si existen manchas activas de agua o desprendimientos extensos, se recomienda evaluación técnica previa.',
      prefill: {
        tipoSuperficie: 'MAMPOSTERIA',
        ubicacion: 'INTERIOR',
        humedad: 'BAJA' as HumidityLevel,
        fisuras: false,
        desgaste: 'LEVE' as WearLevel,
        descripcionProblema:
          'Necesito orientación para pintura interior y renovación de muros en mi espacio.',
      },
    },
    {
      key: 'EXTERIOR',
      title: 'Pintura exterior y fachadas',
      shortDesc:
        'Sistemas formulados para resistir sol, lluvia y cambios climáticos conservando el color.',
      detailIntro:
        'Esquema orientativo para proteger fachadas, muros de cerramiento, balcones y volúmenes arquitectónicos expuestos a la intemperie.',
      image: CATALOG_IMAGES.solFachadas,
      icon: <Building2 className="w-4 h-4 text-[#155EEF]" />,
      recommendedSteps: [
        'Lavado de superficie exterior y retiro de material suelto, polvo o contaminación.',
        'Sellado alcalino y revisión de juntas o dilataciones expuestas a lluvia.',
        'Recubrimiento exterior resistente a radiación solar y humedad ambiental.',
      ],
      requiresSpecialistNote:
        'Sugerencia preliminar orientativa. En fachadas de altura o con deterioro estructural se requiere valoración profesional antes de ejecutar.',
      prefill: {
        tipoSuperficie: 'MAMPOSTERIA',
        ubicacion: 'EXTERIOR',
        humedad: 'MEDIA' as HumidityLevel,
        fisuras: false,
        desgaste: 'MODERADO' as WearLevel,
        descripcionProblema:
          'Busco proteger y renovar una fachada exterior expuesta al sol y la lluvia.',
      },
    },
    {
      key: 'HUMEDAD',
      title: 'Humedad e impermeabilización',
      shortDesc:
        'Barreras protectoras y sistemas impermeables para cubiertas, terrazas y muros con filtración.',
      detailIntro:
        'Guía preliminar para identificar si la humedad proviene de filtración exterior, cubierta, capilaridad o condensación interior antes de recubrir.',
      image: CATALOG_IMAGES.solImpermeabilizacion,
      icon: <Droplets className="w-4 h-4 text-[#08B6CC]" />,
      recommendedSteps: [
        'Identificación y corrección de la fuente de entrada de agua o pendiente en cubierta.',
        'Saneamiento de sales, moho o pintura ampollada hasta llegar a base firme.',
        'Aplicación de imprimante y sistema impermeabilizante acorde al sustrato.',
      ],
      requiresSpecialistNote:
        'Importante: toda humedad activa requiere evaluación profesional para corregir el origen de la filtración antes de aplicar pintura decorativa.',
      prefill: {
        tipoSuperficie: 'CONCRETO',
        ubicacion: 'EXTERIOR',
        humedad: 'ALTA' as HumidityLevel,
        fisuras: true,
        desgaste: 'AVANZADO' as WearLevel,
        descripcionProblema:
          'Presento humedad o filtración en superficie y requiero orientación de impermeabilización.',
      },
    },
    {
      key: 'FISURAS',
      title: 'Reparación de fisuras',
      shortDesc:
        'Tratamiento técnico de microfisuras y grietas superficiales para recuperar un plano liso.',
      detailIntro:
        'Solución enfocada en el saneamiento, sellado flexible y nivelación de fisuras en muros de mampostería, concreto o drywall antes de pintar.',
      image: CATALOG_IMAGES.solReparacionFisuras,
      icon: <Wrench className="w-4 h-4 text-[#155EEF]" />,
      recommendedSteps: [
        'Apertura limpia y retiro de bordes débiles o polvo acumulado en la línea de fisura.',
        'Relleno con masilla o sellador flexible compatible con el movimiento superficial.',
        'Nivelación, lijado fino e imprimación uniforme previo al acabado final.',
      ],
      requiresSpecialistNote:
        'Sugerencia preliminar para fisuras superficiales no estructurales. Si observas grietas profundas o diagonales activas, solicita revisión profesional.',
      prefill: {
        tipoSuperficie: 'MAMPOSTERIA',
        ubicacion: 'INTERIOR',
        humedad: 'BAJA' as HumidityLevel,
        fisuras: true,
        desgaste: 'MODERADO' as WearLevel,
        descripcionProblema:
          'Necesito reparar fisuras visibles y nivelar la pared antes de aplicar pintura.',
      },
    },
    {
      key: 'PREPARACION',
      title: 'Preparación de superficies',
      shortDesc:
        'Estucos, imprimantes y nivelación esencial para garantizar adherencia y buen rendimiento.',
      detailIntro:
        'Alistamiento previo indispensable para superficies nuevas, repintes con descascaramiento o cambios de acabado en interiores y exteriores.',
      image: CATALOG_IMAGES.solPreparacion,
      icon: <Layers className="w-4 h-4 text-[#08B6CC]" />,
      recommendedSteps: [
        'Remoción completa de capas mal adheridas, grasas o contaminantes superficiales.',
        'Nivelación con estuco o pasta adecuada para uso interior o intemperie.',
        'Aplicación de base imprimante reguladora de absorción para optimizar el color.',
      ],
      requiresSpecialistNote:
        'Recomendación preliminar sujeta a las condiciones reales de porosidad y adherencia del sustrato en tu proyecto.',
      prefill: {
        tipoSuperficie: 'DRYWALL',
        ubicacion: 'INTERIOR',
        humedad: 'BAJA' as HumidityLevel,
        fisuras: false,
        desgaste: 'MODERADO' as WearLevel,
        descripcionProblema:
          'Requiero preparar, estucar o imprimar adecuadamente la superficie antes de pintar.',
      },
    },
    {
      key: 'DECORATIVOS',
      title: 'Acabados decorativos',
      shortDesc:
        'Texturas sutiles, efectos minerales y muros protagonistas con carácter arquitectónico.',
      detailIntro:
        'Opciones orientativas para destacar paredes principales en salas, recibidores, oficinas y locales comerciales mediante color y textura.',
      image: CATALOG_IMAGES.solDecorativos,
      icon: <Paintbrush className="w-4 h-4 text-[#08B6CC]" />,
      recommendedSteps: [
        'Alistamiento fino y homogéneo del muro protagonista libre de imperfecciones.',
        'Fondeo cromático coordinado con la paleta decorativa seleccionada.',
        'Aplicación controlada del acabado especial o contraste arquitectónico.',
      ],
      requiresSpecialistNote:
        'Sugerencia estética preliminar; la apariencia final depende de la iluminación y técnica de aplicación en obra.',
      prefill: {
        tipoSuperficie: 'DRYWALL',
        ubicacion: 'INTERIOR',
        humedad: 'BAJA' as HumidityLevel,
        fisuras: false,
        desgaste: 'LEVE' as WearLevel,
        descripcionProblema:
          'Deseo aplicar un acabado decorativo o muro protagonista en mi espacio.',
      },
    },
  ];

  const quickAccessItems: Array<{
    id: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    accentBg: string;
    onClick: () => void;
  }> = [
    {
      id: 'qa-color',
      title: 'Encuentra tu color',
      subtitle: 'Paletas y simulador',
      icon: <Palette className="w-5 h-5 text-[#092653]" />,
      accentBg: 'bg-[#FFE34D]',
      onClick: () => {
        if (onExploreColors) onExploreColors();
        else document.getElementById('encuentra-tu-color')?.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      id: 'qa-humedad',
      title: 'Soluciones para humedad',
      subtitle: 'Cubiertas y filtraciones',
      icon: <Droplets className="w-5 h-5 text-[#08B6CC]" />,
      accentBg: 'bg-[#08B6CC]/12',
      onClick: () => {
        if (onSelectCategory) onSelectCategory('HUMEDAD');
        else onNavigate('soluciones');
      },
    },
    {
      id: 'qa-paredes',
      title: 'Renueva tus paredes',
      subtitle: 'Interiores y habitaciones',
      icon: <Home className="w-5 h-5 text-[#155EEF]" />,
      accentBg: 'bg-[#155EEF]/10',
      onClick: () => {
        if (onSelectCategory) onSelectCategory('INTERIOR');
        else onNavigate('soluciones');
      },
    },
    {
      id: 'qa-fachadas',
      title: 'Protege tus fachadas',
      subtitle: 'Resistencia exterior',
      icon: <Building2 className="w-5 h-5 text-[#092653]" />,
      accentBg: 'bg-[#E7EAF0]',
      onClick: () => {
        if (onSelectCategory) onSelectCategory('EXTERIOR');
        else onNavigate('soluciones');
      },
    },
    {
      id: 'qa-preparacion',
      title: 'Prepara tu superficie',
      subtitle: 'Fisuras, estuco y sellado',
      icon: <Layers className="w-5 h-5 text-[#155EEF]" />,
      accentBg: 'bg-[#155EEF]/10',
      onClick: () => {
        if (onSelectCategory) onSelectCategory('PREPARACION');
        else onNavigate('soluciones');
      },
    },
    {
      id: 'qa-ia',
      title: 'Asesoría COLORLINK IA',
      subtitle: 'Orientación inmediata',
      icon: <Sparkles className="w-5 h-5 text-[#FFE34D]" />,
      accentBg: 'bg-[#092653]',
      onClick: () => {
        if (onOpenAssistant) onOpenAssistant();
        else onNavigate('colorlink-ia');
      },
    },
  ];

  const inspirationSpaces: Array<{
    id: string;
    environmentLabel: string;
    environmentFilter: ExplorerEnvironmentId;
    title: string;
    description: string;
    image: string;
    combinationId: string;
  }> = [
    {
      id: 'insp-salas',
      environmentLabel: 'Salas',
      environmentFilter: 'SALA',
      title: 'Sala luminosa con acento botánico',
      description:
        'Paredes principales cálidas que amplían la luz natural acompañadas por un muro focal en verde salvia y detalles tierra.',
      image: CATALOG_IMAGES.inspSalaBotanica,
      combinationId: 'combo-sala-natural',
    },
    {
      id: 'insp-habitaciones',
      environmentLabel: 'Habitaciones',
      environmentFilter: 'HABITACION',
      title: 'Habitación serena para el descanso',
      description:
        'Atmósfera fresca y relajante que combina tonos brisa suave en el cabecero con blancos cálidos de baja saturación.',
      image: CATALOG_IMAGES.inspHabitacionSerena,
      combinationId: 'combo-descanso-sereno',
    },
    {
      id: 'insp-fachadas',
      environmentLabel: 'Fachadas',
      environmentFilter: 'FACHADA',
      title: 'Fachada contemporánea de alto contraste',
      description:
        'Equilibrio arquitectónico entre tonos piedra mineral y un volumen profundo que resalta accesos y carpintería en madera.',
      image: CATALOG_IMAGES.inspFachadaModerna,
      combinationId: 'combo-fachada-elegante',
    },
    {
      id: 'insp-comercial',
      environmentLabel: 'Espacios comerciales',
      environmentFilter: 'COMERCIAL',
      title: 'Café y estudio con sello propio',
      description:
        'Base neutra luminosa para favorecer la amplitud visual junto a acentos expresivos en verde bosque y ocre artesanal.',
      image: CATALOG_IMAGES.inspEspacioComercial,
      combinationId: 'combo-estudio-moderno',
    },
  ];

  const currentHero = HERO_SLIDES[activeSlide];

  return (
    <div className="bg-[#FAFAF7] text-[#15243B]">
      {/* =================================================================== */}
      {/* 1. PORTADA PRINCIPAL (HERO COMERCIAL CON CARRUSEL ACCESIBLE)        */}
      {/* =================================================================== */}
      <section
        className="relative overflow-hidden bg-white border-b border-[#E7EAF0]"
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Contenido comercial claro y directo */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-5">
              <div className="inline-flex items-center gap-2 self-start">
                <span className="w-2 h-2 rounded-full bg-[#08B6CC]" aria-hidden="true" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#155EEF]">
                  Inspiración para cada espacio
                </span>
              </div>

              <h1
                className="font-display text-3xl sm:text-4xl lg:text-[2.85rem] font-extrabold text-[#092653] tracking-tight leading-[1.1]"
                style={{ textWrap: 'balance' }}
              >
                Dale vida a tus espacios
              </h1>

              <p className="text-base sm:text-lg text-[#15243B]/80 leading-relaxed">
                Encuentra colores, descubre soluciones para tus superficies y transforma tus ideas
                en proyectos.
              </p>

              {/* Botones principal y secundario requeridos */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onExploreColors) onExploreColors();
                    else
                      document
                        .getElementById('encuentra-tu-color')
                        ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-6 py-3.5 rounded-xl bg-[#155EEF] hover:bg-[#092653] text-white font-bold text-sm shadow-md shadow-[#155EEF]/15 inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Palette className="w-4 h-4 text-[#FFE34D]" />
                  <span>Encuentra tu color</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onStartProjectWithPrefill) onStartProjectWithPrefill(undefined);
                    else onNavigate('crear-proyecto');
                  }}
                  className="px-6 py-3.5 rounded-xl bg-white hover:bg-[#FAFAF7] text-[#092653] border-2 border-[#092653]/15 hover:border-[#08B6CC] font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Crear mi proyecto</span>
                  <ArrowRight className="w-4 h-4 text-[#08B6CC]" />
                </button>
              </div>

              {/* Indicador discreto de orientación asistida */}
              <div className="pt-2 flex items-center gap-2.5 text-xs text-[#15243B]/75">
                <span className="px-2 py-0.5 rounded-md bg-[#FFE34D] text-[#092653] font-extrabold">
                  Guía paso a paso
                </span>
                <span>
                  Explora tonos ilustrativos o registra el estado real de tus paredes en minutos.
                </span>
              </div>
            </div>

            {/* Banner fotográfico con controles accesibles */}
            <div className="lg:col-span-7 relative">
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-3xl overflow-hidden bg-[#E7EAF0] shadow-lg border border-[#E7EAF0]">
                <img
                  src={currentHero.image}
                  alt={currentHero.alt}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-opacity duration-300"
                />

                {/* Gradiente suave inferior solo para legibilidad de tarjeta */}
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#092653]/65 via-[#092653]/20 to-transparent pointer-events-none" />

                {/* Tarjeta cromática de la escena actual */}
                <div className="absolute bottom-3.5 left-3.5 right-3.5 sm:right-auto sm:max-w-md bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-md border border-white/70 flex items-center gap-3">
                  <div className="flex -space-x-2 shrink-0">
                    {currentHero.swatches.map((hex) => (
                      <span
                        key={hex}
                        className="w-7 h-7 rounded-full border-2 border-white shadow-2xs"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-xs font-extrabold text-[#092653] truncate">
                      {currentHero.captionTitle}
                    </p>
                    <p className="text-[11px] text-[#15243B]/75 truncate">
                      {currentHero.captionNote}
                    </p>
                  </div>
                </div>

                {/* Controles visibles Anterior / Siguiente */}
                <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSlide(
                        (prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length
                      )
                    }
                    aria-label="Imagen anterior de portada"
                    className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#092653] shadow-sm flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length)
                    }
                    aria-label="Siguiente imagen de portada"
                    className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#092653] shadow-sm flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Indicadores de diapositiva */}
              <div className="flex items-center justify-end gap-1.5 mt-3 pr-1">
                {HERO_SLIDES.map((slide, idx) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    aria-label={`Ver escena ${idx + 1}: ${slide.captionTitle}`}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      activeSlide === idx
                        ? 'w-7 bg-[#155EEF]'
                        : 'w-2 bg-[#092653]/25 hover:bg-[#092653]/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 2. FRANJA HORIZONTAL DE 6 ACCESOS RÁPIDOS DEBAJO DEL HERO           */}
      {/* =================================================================== */}
      <section
        aria-label="Accesos rápidos comerciales"
        className="bg-white border-b border-[#E7EAF0]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex lg:grid lg:grid-cols-6 gap-3 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
            {quickAccessItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="group min-w-[205px] lg:min-w-0 p-3.5 rounded-2xl bg-[#FAFAF7] hover:bg-white border border-[#E7EAF0] hover:border-[#155EEF]/50 shadow-2xs hover:shadow-sm transition-all flex items-center gap-3 text-left shrink-0 cursor-pointer"
              >
                <div
                  className={`w-11 h-11 rounded-xl ${item.accentBg} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}
                >
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <span className="font-display text-xs sm:text-[13px] font-extrabold text-[#092653] group-hover:text-[#155EEF] block leading-snug truncate">
                    {item.title}
                  </span>
                  <span className="text-[11px] text-[#15243B]/65 block truncate mt-0.5">
                    {item.subtitle}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 3. SECCIÓN "ENCUENTRA TU COLOR" INTEGRADA                           */}
      {/* =================================================================== */}
      <ColorExplorerSection
        externalRequest={colorExplorerRequest}
        onStartProjectWithPrefill={onStartProjectWithPrefill}
        onOpenAssistant={onOpenAssistant}
      />

      {/* =================================================================== */}
      {/* 4. SECCIÓN DE SOLUCIONES COMERCIALES (6 TARJETAS VISUALES)          */}
      {/* =================================================================== */}
      <section
        id="explorar-soluciones"
        className="py-16 sm:py-20 bg-white border-b border-[#E7EAF0] scroll-mt-24"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#155EEF]">
                Soluciones para tus superficies
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#092653] tracking-tight">
                Elige la solución según lo que necesita tu espacio
              </h2>
              <p className="text-sm sm:text-base text-[#15243B]/80">
                Conoce la orientación recomendada para cada tipo de superficie e inicia tu proyecto
                conservando siempre la información que hayas registrado.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onSelectCategory) onSelectCategory('TODAS');
                else onNavigate('soluciones');
              }}
              className="text-xs font-bold text-[#155EEF] hover:text-[#092653] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <span>Ver catálogo completo de soluciones</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {solutionCards.map((card) => (
              <article
                key={card.key}
                onClick={() => setSelectedSolutionModal(card)}
                className="group bg-[#FAFAF7] rounded-3xl border border-[#E7EAF0] hover:border-[#155EEF]/50 overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="aspect-[4/3] w-full bg-[#E7EAF0] overflow-hidden relative">
                    <img
                      src={card.image}
                      alt={card.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="p-6 space-y-2.5">
                    <div className="inline-flex items-center gap-2 text-xs font-bold text-[#15243B]/70">
                      {card.icon}
                      <span>Solución COLORLINK</span>
                    </div>

                    <h3 className="font-display text-lg font-extrabold text-[#092653] group-hover:text-[#155EEF] transition-colors">
                      {card.title}
                    </h3>

                    <p className="text-sm text-[#15243B]/80 leading-relaxed">{card.shortDesc}</p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSolutionModal(card);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-white group-hover:bg-[#155EEF] text-[#092653] group-hover:text-white border border-[#E7EAF0] group-hover:border-[#155EEF] text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>Explorar solución</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 5. SECCIÓN DE INSPIRACIÓN: "INSPÍRATE PARA TRANSFORMAR"             */}
      {/* =================================================================== */}
      <section
        id="inspiracion"
        className="py-16 sm:py-20 bg-[#FAFAF7] border-b border-[#E7EAF0] scroll-mt-24"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-3xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#08B6CC]">
              Ambientes y armonías
            </span>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#092653] tracking-tight">
              Inspírate para transformar
            </h2>
            <p className="text-sm sm:text-base text-[#15243B]/80 leading-relaxed">
              Descubre ideas reales de combinación cromática para salas, habitaciones, fachadas y
              espacios comerciales, y llévalas directamente al explorador de color.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            {inspirationSpaces.map((space) => {
              const combo = getCombinationById(space.combinationId);
              const swatches = combo
                ? [
                    getColorById(combo.mainColorId),
                    getColorById(combo.complementaryColorId),
                    getColorById(combo.accentColorId),
                  ]
                : [];

              return (
                <article
                  key={space.id}
                  className="bg-white rounded-3xl border border-[#E7EAF0] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[4/3] w-full bg-[#E7EAF0] overflow-hidden relative">
                      <img
                        src={space.image}
                        alt={`${space.environmentLabel}: ${space.title}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover hover:scale-103 transition-transform duration-300"
                      />
                      <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-xl bg-[#092653]/90 backdrop-blur-xs text-white text-xs font-bold">
                        {space.environmentLabel}
                      </span>
                    </div>

                    <div className="p-6 space-y-4">
                      <div>
                        <h3 className="font-display text-xl font-extrabold text-[#092653]">
                          {space.title}
                        </h3>
                        <p className="text-sm text-[#15243B]/80 mt-1.5 leading-relaxed">
                          {space.description}
                        </p>
                      </div>

                      {/* Paleta sugerida con selección individual de cada tono */}
                      {swatches.length > 0 && (
                        <div className="pt-2 space-y-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                            Paleta de colores sugerida
                          </span>
                          <div className="grid grid-cols-3 gap-2">
                            {swatches.map((swatch) => (
                              <button
                                key={`${space.id}-${swatch.id}`}
                                type="button"
                                onClick={() => {
                                  if (onExploreColors) {
                                    onExploreColors({
                                      environment: space.environmentFilter,
                                      colorId: swatch.id,
                                    });
                                  }
                                }}
                                className="p-2 rounded-xl bg-[#FAFAF7] hover:bg-[#E7EAF0]/70 border border-[#E7EAF0] flex items-center gap-2 text-left transition-colors cursor-pointer"
                              >
                                <span
                                  className="w-6 h-6 rounded-lg border border-black/10 shrink-0 shadow-2xs"
                                  style={{ backgroundColor: swatch.hex }}
                                />
                                <span className="text-xs font-bold text-[#092653] truncate">
                                  {swatch.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-6 pb-6">
                    <button
                      type="button"
                      onClick={() => {
                        if (onExploreColors) {
                          onExploreColors({
                            environment: space.environmentFilter,
                            combinationId: space.combinationId,
                            openSimulator: true,
                          });
                        }
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-[#092653] hover:bg-[#155EEF] text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-[#FFE34D]" />
                      <span>Explorar esta combinación</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Aclaración de orientación visual */}
          <p className="text-xs text-[#15243B]/65 flex items-center gap-2 pt-1">
            <Info className="w-4 h-4 text-[#08B6CC] shrink-0" />
            <span>
              Nota: las fotografías y paletas mostradas tienen fines de inspiración y orientación
              visual; no constituyen una promesa de resultado idéntico, ya que el acabado depende de
              la luz y características propias de cada superficie.
            </span>
          </p>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 6. MIS PROYECTOS Y SEGUIMIENTO EN LÍNEA                             */}
      {/* =================================================================== */}
      <section className="py-14 bg-white border-b border-[#E7EAF0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-[#155EEF]">
                Tus proyectos en COLORLINK
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#092653] tracking-tight">
                Registro y seguimiento organizado
              </h2>
              <p className="text-sm text-[#15243B]/80">
                Consulta tus proyectos activos o inicia uno nuevo con las fotos y necesidades de tu
                espacio.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('mis-proyectos')}
                className="px-4 py-2.5 rounded-xl bg-[#FAFAF7] border border-[#E7EAF0] hover:border-[#155EEF] text-xs font-bold text-[#092653] inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <FolderGit2 className="w-4 h-4 text-[#155EEF]" />
                <span>Mis proyectos</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onStartProjectWithPrefill) onStartProjectWithPrefill(undefined);
                  else onNavigate('crear-proyecto');
                }}
                className="px-4 py-2.5 rounded-xl bg-[#08B6CC] hover:bg-[#092653] text-white text-xs font-bold inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <span>Crear mi proyecto</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {userProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userProjects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => onNavigate('detalle-proyecto', proj.id)}
                  className="p-5 sm:p-6 rounded-2xl bg-[#FAFAF7] border border-[#E7EAF0] hover:border-[#155EEF]/50 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-500">
                        {proj.codigo}
                      </span>
                      {getStatusBadge(proj.estado)}
                    </div>

                    <h3 className="font-display text-base font-extrabold text-[#092653]">
                      {proj.nombre}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#15243B]/75">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{proj.ciudad}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Creado: {proj.created_at.split('T')[0]}</span>
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E7EAF0] flex items-center justify-between gap-2 text-xs">
                    <span className="text-[#15243B]/80 truncate">
                      <strong className="text-[#092653]">Próxima etapa:</strong>{' '}
                      {getNextStepDescription(proj.estado)}
                    </span>
                    <span className="font-bold text-[#155EEF] inline-flex items-center gap-1 shrink-0">
                      <span>Ver detalle</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-7 rounded-2xl bg-[#FAFAF7] border border-[#E7EAF0] flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="space-y-1 max-w-xl">
                <h3 className="font-display text-base font-extrabold text-[#092653]">
                  Convierte tus ideas en un proyecto organizado
                </h3>
                <p className="text-sm text-[#15243B]/80 leading-relaxed">
                  Registra el área aproximada, el estado de tus paredes y los tonos de tu interés
                  para llevar seguimiento claro de principio a fin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('crear-proyecto')}
                className="px-5 py-3 rounded-xl bg-[#092653] hover:bg-[#155EEF] text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Registrar primer proyecto</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* =================================================================== */}
      {/* 7. FRANJA DE CONFIANZA Y ORIENTACIÓN (BENEFICIOS VERIFICABLES)      */}
      {/* =================================================================== */}
      <section aria-label="Beneficios de orientación COLORLINK" className="py-14 bg-[#FAFAF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: <Palette className="w-5 h-5 text-[#08B6CC]" />,
                title: 'Orientación para elegir colores',
                desc: 'Explora familias cromáticas, armonías sugeridas y simulación ilustrativa por tipo de ambiente.',
              },
              {
                icon: <FolderGit2 className="w-5 h-5 text-[#155EEF]" />,
                title: 'Registro y seguimiento de proyectos',
                desc: 'Centraliza las necesidades de tu espacio, fotografías y avances en un solo expediente.',
              },
              {
                icon: <ShieldCheck className="w-5 h-5 text-[#08B6CC]" />,
                title: 'Recomendaciones preliminares para superficies',
                desc: 'Guía inicial según el tipo de muro, ubicación e indicadores visibles de humedad o fisuras.',
              },
              {
                icon: <HelpCircle className="w-5 h-5 text-[#155EEF]" />,
                title: 'Acceso a información y asistencia',
                desc: 'Consulta nuestras guías prácticas por categoría o apóyate en el asistente COLORLINK IA.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-5 rounded-2xl bg-white border border-[#E7EAF0] space-y-2.5 shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FAFAF7] border border-[#E7EAF0] flex items-center justify-center">
                  {item.icon}
                </div>
                <h3 className="font-display text-sm font-extrabold text-[#092653] leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-[#15243B]/75 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* MODAL DE INFORMACIÓN DE SOLUCIÓN E INICIO RÁPIDO DE PROYECTO        */}
      {/* =================================================================== */}
      {selectedSolutionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#092653]/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedSolutionModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Detalle de solución: ${selectedSolutionModal.title}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90dvh] bg-white rounded-3xl border border-[#E7EAF0] shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="relative h-52 sm:h-60 w-full bg-[#E7EAF0] shrink-0">
              <img
                src={selectedSolutionModal.image}
                alt={selectedSolutionModal.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setSelectedSolutionModal(null)}
                aria-label="Cerrar detalle de solución"
                className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-[#092653] shadow-md flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3.5 left-4 px-3 py-1 rounded-xl bg-[#092653]/92 text-white text-xs font-bold inline-flex items-center gap-1.5">
                <span>Solución COLORLINK</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-5">
              <div>
                <h3 className="font-display text-2xl font-extrabold text-[#092653]">
                  {selectedSolutionModal.title}
                </h3>
                <p className="text-sm text-[#15243B]/80 mt-1.5 leading-relaxed">
                  {selectedSolutionModal.detailIntro}
                </p>
              </div>

              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#155EEF] block">
                  Etapas orientativas recomendadas
                </span>
                <ul className="space-y-2">
                  {selectedSolutionModal.recommendedSteps.map((step, idx) => (
                    <li
                      key={step}
                      className="p-3 rounded-xl bg-[#FAFAF7] border border-[#E7EAF0] flex items-start gap-3 text-xs sm:text-sm text-[#15243B]"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#08B6CC] shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-[#092653]">Paso {idx + 1}:</strong> {step}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{selectedSolutionModal.requiresSpecialistNote}</p>
              </div>
            </div>

            <div className="px-6 sm:px-7 py-4 bg-[#FAFAF7] border-t border-[#E7EAF0] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const cat = selectedSolutionModal.key;
                  setSelectedSolutionModal(null);
                  if (onSelectCategory) onSelectCategory(cat);
                  else onNavigate('soluciones');
                }}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#E7EAF0]/50 border border-[#E7EAF0] text-xs font-bold text-[#092653] cursor-pointer"
              >
                Ver ficha completa en catálogo
              </button>

              <button
                type="button"
                onClick={() => {
                  const prefill = selectedSolutionModal.prefill;
                  setSelectedSolutionModal(null);
                  if (onStartProjectWithPrefill) {
                    onStartProjectWithPrefill(prefill);
                  } else {
                    onNavigate('crear-proyecto');
                  }
                }}
                className="px-5 py-3 rounded-xl bg-[#155EEF] hover:bg-[#092653] text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <span>Iniciar proyecto con esta necesidad</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
