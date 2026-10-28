import React, { useState, useEffect } from 'react';
import {
  Layers,
  Droplets,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Home,
  Building2,
  Paintbrush,
  Wrench,
  X,
  AlertTriangle,
} from 'lucide-react';
import { ActiveView, SolutionCategoryKey } from '../layout/Navbar';
import { CATALOG_IMAGES } from '../../assets/images/catalogImages';
import { WizardPrefill } from '../../App';
import { HumidityLevel, WearLevel } from '../../types';

interface SolutionsCatalogViewProps {
  onNavigate: (view: ActiveView) => void;
  onOpenAssistant?: () => void;
  initialCategory?: SolutionCategoryKey;
  searchQuery?: string;
  onClearSearch?: () => void;
  onStartProjectWithPrefill?: (prefill?: WizardPrefill) => void;
}

interface SolutionSystemItem {
  id: string;
  category: Exclude<SolutionCategoryKey, 'TODAS'>;
  categoryLabel: string;
  title: string;
  subtitle: string;
  image: string;
  prefill: WizardPrefill;
  stages: Array<{ step: string; detail: string }>;
  highlights: string[];
  preliminaryNote: string;
  icon: React.ReactNode;
}

export const SolutionsCatalogView: React.FC<SolutionsCatalogViewProps> = ({
  onNavigate,
  onOpenAssistant,
  initialCategory = 'TODAS',
  searchQuery = '',
  onClearSearch,
  onStartProjectWithPrefill,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SolutionCategoryKey>(initialCategory);

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  const categories: Array<{ id: SolutionCategoryKey; label: string }> = [
    { id: 'TODAS', label: 'Todas las soluciones' },
    { id: 'INTERIOR', label: 'Pintura para interiores' },
    { id: 'EXTERIOR', label: 'Pintura para exteriores' },
    { id: 'HUMEDAD', label: 'Humedad e impermeabilización' },
    { id: 'FISURAS', label: 'Reparación de fisuras' },
    { id: 'PREPARACION', label: 'Preparación de superficies' },
    { id: 'DECORATIVOS', label: 'Acabados decorativos' },
    { id: 'HERRAMIENTAS', label: 'Herramientas y acabados' },
  ];

  const solutions: SolutionSystemItem[] = [
    {
      id: 'sol-interiores',
      category: 'INTERIOR',
      categoryLabel: 'Pintura interior',
      title: 'Renovación armónica de espacios interiores',
      subtitle:
        'Esquema orientativo de acabado uniforme y lavable para salas, habitaciones, pasillos, oficinas y zonas sociales.',
      image: CATALOG_IMAGES.solInteriores,
      prefill: {
        tipoSuperficie: 'MAMPOSTERIA',
        ubicacion: 'INTERIOR',
        humedad: 'BAJA' as HumidityLevel,
        fisuras: false,
        desgaste: 'LEVE' as WearLevel,
        descripcionProblema: 'Interés en pintura interior: Renovación armónica de espacios interiores.',
      },
      stages: [
        { step: 'Preparación', detail: 'Limpieza, resane de imperfecciones puntuales y lijado suave' },
        { step: 'Sellado base', detail: 'Imprimante acrílico regulador de absorción del sustrato' },
        { step: 'Acabado final', detail: 'Aplicación de recubrimiento interior en el tono seleccionado' },
      ],
      highlights: [
        'Adaptado al tránsito cotidiano de hogares y oficinas',
        'Facilita el mantenimiento y limpieza periódica de muros',
        'Compatible con paletas neutras, cálidas, frescas y naturales',
      ],
      preliminaryNote:
        'Recomendación preliminar orientativa. Sujeta a revisión si existen manchas de humedad activa.',
      icon: <Home className="w-5 h-5 text-[#155EEF]" />,
    },
    {
      id: 'sol-fachadas',
      category: 'EXTERIOR',
      categoryLabel: 'Pintura exterior y fachadas',
      title: 'Protección climática para fachadas y muros exteriores',
      subtitle:
        'Sistema orientativo para proteger mampostería y concreto exterior frente a radiación UV, lluvia y polución.',
      image: CATALOG_IMAGES.solFachadas,
      prefill: {
        tipoSuperficie: 'MAMPOSTERIA',
        ubicacion: 'EXTERIOR',
        humedad: 'MEDIA' as HumidityLevel,
        fisuras: false,
        desgaste: 'MODERADO' as WearLevel,
        descripcionProblema:
          'Interés en pintura exterior y fachadas: Protección climática para muros exteriores.',
      },
      stages: [
        { step: 'Acondicionamiento', detail: 'Lavado exterior, retiro de material suelto y revisión de juntas' },
        { step: 'Barrera alcalina', detail: 'Sellador exterior resistente a alcalinidad y humedad ambiental' },
        { step: 'Capa protectora', detail: 'Recubrimiento acrílico de intemperie con estabilidad cromática' },
      ],
      highlights: [
        'Protección frente a cambios bruscos de temperatura y lluvia',
        'Ayuda a prevenir desprendimientos prematuros en exteriores',
        'Apto para viviendas, edificios residenciales y sedes comerciales',
      ],
      preliminaryNote:
        'Recomendación preliminar orientativa. En trabajos en altura o fachadas deterioradas se requiere valoración profesional.',
      icon: <Building2 className="w-5 h-5 text-[#155EEF]" />,
    },
    {
      id: 'sol-humedad',
      category: 'HUMEDAD',
      categoryLabel: 'Humedad e impermeabilización',
      title: 'Control de humedad e impermeabilización de cubiertas y muros',
      subtitle:
        'Soluciones orientativas para losas, terrazas, culatas y paredes con filtración o condensación recurrente.',
      image: CATALOG_IMAGES.solImpermeabilizacion,
      prefill: {
        tipoSuperficie: 'CONCRETO',
        ubicacion: 'EXTERIOR',
        humedad: 'ALTA' as HumidityLevel,
        fisuras: true,
        desgaste: 'AVANZADO' as WearLevel,
        descripcionProblema:
          'Interés en humedad e impermeabilización: Control de filtraciones en cubiertas o muros.',
      },
      stages: [
        { step: 'Diagnóstico de origen', detail: 'Identificación de puntos de filtración, grietas y pendientes' },
        { step: 'Imprimación', detail: 'Promotor de adherencia sobre sustrato mineral limpio y sano' },
        { step: 'Membrana continua', detail: 'Sistema impermeabilizante flexible sin uniones abiertas' },
      ],
      highlights: [
        'Acompaña el movimiento térmico natural de losas y terrazas',
        'Protege espacios interiores frente al paso de agua lluvia',
        'Se articula con validación técnica cuando existe humedad severa',
      ],
      preliminaryNote:
        'Sugerencia preliminar: cuando existe filtración o nivel freático activo se requiere evaluación profesional en sitio.',
      icon: <Droplets className="w-5 h-5 text-[#08B6CC]" />,
    },
    {
      id: 'sol-fisuras',
      category: 'FISURAS',
      categoryLabel: 'Reparación de fisuras',
      title: 'Saneamiento y sellado técnico de fisuras superficiales',
      subtitle:
        'Tratamiento focalizado para corregir microfisuras en estuco, revoque o concreto antes de aplicar el acabado de color.',
      image: CATALOG_IMAGES.solReparacionFisuras,
      prefill: {
        tipoSuperficie: 'MAMPOSTERIA',
        ubicacion: 'INTERIOR',
        humedad: 'BAJA' as HumidityLevel,
        fisuras: true,
        desgaste: 'MODERADO' as WearLevel,
        descripcionProblema:
          'Interés en reparación de fisuras: Sellado y nivelación previa a pintura.',
      },
      stages: [
        { step: 'Apertura y limpieza', detail: 'Retiro de bordes sueltos y polvo a lo largo de la fisura' },
        { step: 'Sellado flexible', detail: 'Aplicación de masilla o resanador acrílico elástico' },
        { step: 'Nivelación e imprimación', detail: 'Lijado uniforme y sellado para evitar marcas en el color final' },
      ],
      highlights: [
        'Previene que las líneas de retracción reaparezcan tras pintar',
        'Devuelve continuidad estética a muros interiores y fachadas',
        'Compatible con sistemas de acabado mate y satinado',
      ],
      preliminaryNote:
        'Aplica de forma orientativa para microfisuras no estructurales. Las grietas profundas requieren revisión especializada.',
      icon: <Wrench className="w-5 h-5 text-[#155EEF]" />,
    },
    {
      id: 'sol-preparacion',
      category: 'PREPARACION',
      categoryLabel: 'Preparación de superficies',
      title: 'Nivelación, estucado e imprimación de sustratos',
      subtitle:
        'Base técnica indispensable antes de pintar superficies nuevas, porosas o con capas antiguas deterioradas.',
      image: CATALOG_IMAGES.solPreparacion,
      prefill: {
        tipoSuperficie: 'DRYWALL',
        ubicacion: 'INTERIOR',
        humedad: 'BAJA' as HumidityLevel,
        fisuras: false,
        desgaste: 'MODERADO' as WearLevel,
        descripcionProblema:
          'Interés en preparación de superficies: Nivelación e imprimación previa al acabado.',
      },
      stages: [
        { step: 'Saneamiento', detail: 'Remoción de pintura desprendida, polvo, grasas o sales superficiales' },
        { step: 'Nivelación', detail: 'Aplicación de estuco o pasta niveladora acorde al ambiente' },
        { step: 'Imprimación', detail: 'Consolidación de porosidad para optimizar rendimiento del acabado' },
      ],
      highlights: [
        'Determinante para la adherencia y durabilidad de la pintura',
        'Corrige irregularidades visibles antes de aplicar el color',
        'Aplicable sobre concreto, estuco, drywall, madera y metal',
      ],
      preliminaryNote:
        'Orientación preliminar sujeta al tipo de material y grado de deterioro observado.',
      icon: <Layers className="w-5 h-5 text-[#08B6CC]" />,
    },
    {
      id: 'sol-decorativos',
      category: 'DECORATIVOS',
      categoryLabel: 'Acabados decorativos',
      title: 'Acabados arquitectónicos y texturas decorativas',
      subtitle:
        'Propuestas estéticas de aspecto mineral, satinado o texturizado para muros focales en residencias y comercios.',
      image: CATALOG_IMAGES.solDecorativos,
      prefill: {
        tipoSuperficie: 'DRYWALL',
        ubicacion: 'INTERIOR',
        humedad: 'BAJA' as HumidityLevel,
        fisuras: false,
        desgaste: 'LEVE' as WearLevel,
        descripcionProblema:
          'Interés en acabados decorativos: Muro protagonista con textura o efecto especial.',
      },
      stages: [
        { step: 'Alistamiento fino', detail: 'Superficie lisa y homogénea libre de imperfecciones' },
        { step: 'Fondo tonal', detail: 'Base cromática coordinada con el efecto decorativo elegido' },
        { step: 'Definición estética', detail: 'Aplicación controlada según el acabado arquitectónico deseado' },
      ],
      highlights: [
        'Realza salas principales, recepciones y locales comerciales',
        'Integra color e iluminación natural con profundidad visual',
        'Asesoría personalizada en la creación de tu proyecto',
      ],
      preliminaryNote:
        'Recomendación estética preliminar; el resultado depende de la preparación del plano y la luz del lugar.',
      icon: <Paintbrush className="w-5 h-5 text-[#08B6CC]" />,
    },
    {
      id: 'sol-herramientas',
      category: 'HERRAMIENTAS',
      categoryLabel: 'Herramientas y acabados',
      title: 'Guía de herramientas, protección de áreas y aplicación',
      subtitle:
        'Selección adecuada del método de aplicación (rodillo, brocha, llana o equipo especializado) según cada superficie.',
      image: CATALOG_IMAGES.solHerramientas,
      prefill: {
        tipoSuperficie: 'MAMPOSTERIA',
        ubicacion: 'INTERIOR',
        humedad: 'BAJA' as HumidityLevel,
        fisuras: false,
        desgaste: 'LEVE' as WearLevel,
        descripcionProblema:
          'Interés en guía de herramientas y método de aplicación para mi proyecto.',
      },
      stages: [
        { step: 'Protección del entorno', detail: 'Enmascarado de bordes, pisos, carpintería y luminarias' },
        { step: 'Selección de herramienta', detail: 'Elección del perfil de rodillo o brocha acorde a la rugosidad' },
        { step: 'Control de aplicación', detail: 'Respeto de tiempos de secado entre manos para un acabado parejo' },
      ],
      highlights: [
        'Evita marcas de empalme, salpicaduras y desperdicio de material',
        'Define cuándo se recomienda aplicación profesional en obra',
        'Integrado dentro de las recomendaciones de cada expediente',
      ],
      preliminaryNote:
        'Guía práctica de orientación general para proyectos residenciales y comerciales.',
      icon: <Wrench className="w-5 h-5 text-[#155EEF]" />,
    },
  ];

  const filtered = solutions.filter((sol) => {
    const matchCategory = selectedCategory === 'TODAS' || sol.category === selectedCategory;
    if (!searchQuery.trim()) return matchCategory;
    const q = searchQuery.toLowerCase();
    const matchQuery =
      sol.title.toLowerCase().includes(q) ||
      sol.subtitle.toLowerCase().includes(q) ||
      sol.categoryLabel.toLowerCase().includes(q) ||
      sol.highlights.some((h) => h.toLowerCase().includes(q));
    return matchCategory && (matchQuery || selectedCategory !== 'TODAS');
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Encabezado y filtros de categoría */}
      <div className="space-y-6">
        <div className="max-w-3xl space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#155EEF]">
            Soluciones COLORLINK
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#092653] tracking-tight">
            Encuentra la solución adecuada para tu superficie
          </h1>
          <p className="text-sm sm:text-base text-[#15243B]/80 leading-relaxed">
            Explora nuestras categorías de orientación para interiores, fachadas, humedad, fisuras,
            preparación de superficies y acabados. Inicia tu proyecto conservando los datos que ya
            hayas ingresado.
          </p>
        </div>

        {searchQuery && (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#155EEF]/8 border border-[#155EEF]/25 text-xs text-[#092653]">
            <span>
              Mostrando orientación relacionada con: <strong>“{searchQuery}”</strong>
            </span>
            {onClearSearch && (
              <button
                type="button"
                onClick={onClearSearch}
                className="p-0.5 hover:bg-white rounded text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Pestañas de categorías */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#092653] text-white shadow-xs'
                  : 'bg-white text-[#15243B] border border-[#E7EAF0] hover:border-[#155EEF]/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grilla de tarjetas de soluciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filtered.map((sol) => (
          <div
            key={sol.id}
            className="bg-white border border-[#E7EAF0] rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="aspect-[16/9] bg-[#E7EAF0] overflow-hidden relative">
                <img
                  src={sol.image}
                  alt={sol.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-6 sm:p-7 space-y-5">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-[#155EEF]">
                    {sol.icon}
                    <span>{sol.categoryLabel}</span>
                  </div>
                  <h2 className="font-display text-xl font-extrabold text-[#092653]">
                    {sol.title}
                  </h2>
                  <p className="text-sm text-[#15243B]/80 leading-relaxed">{sol.subtitle}</p>
                </div>

                {/* Etapas recomendadas */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Estructura orientativa de intervención
                  </span>
                  <div className="space-y-2">
                    {sol.stages.map((st, idx) => (
                      <div
                        key={st.step}
                        className="p-3 rounded-xl bg-[#FAFAF7] border border-[#E7EAF0] flex items-start gap-3 text-xs"
                      >
                        <span className="w-5 h-5 rounded-full bg-[#092653] text-white font-bold text-[11px] flex items-center justify-center shrink-0 tabular-nums">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-[#092653]">{st.step}: </span>
                          <span className="text-[#15243B]/80">{st.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Beneficios técnicos */}
                <ul className="space-y-1.5 text-xs text-[#15243B]/80 pt-1">
                  {sol.highlights.map((feat) => (
                    <li key={feat} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#08B6CC] shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-2 text-[11px] text-amber-950">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{sol.preliminaryNote}</span>
                </div>
              </div>
            </div>

            <div className="px-6 sm:px-7 py-4 bg-[#FAFAF7] border-t border-[#E7EAF0] flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (onOpenAssistant) onOpenAssistant();
                  else onNavigate('colorlink-ia');
                }}
                className="text-xs font-bold text-[#08B6CC] hover:text-[#092653] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Consultar con COLORLINK IA</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onStartProjectWithPrefill) {
                    onStartProjectWithPrefill(sol.prefill);
                  } else {
                    onNavigate('crear-proyecto');
                  }
                }}
                className="px-4 py-2.5 bg-[#155EEF] hover:bg-[#092653] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>Iniciar proyecto con esta necesidad</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
