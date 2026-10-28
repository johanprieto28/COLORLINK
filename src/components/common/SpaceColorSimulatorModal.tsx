import React, { useState, useEffect } from 'react';
import {
  X,
  Heart,
  ArrowRight,
  Columns2,
  Sun,
  Home,
  BedDouble,
  Building2,
  Info,
  Sparkles,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  ExplorerColorItem,
  ExplorerColorCombination,
  SimulatorSceneId,
  ORDERED_CATALOG_COLORS,
  getColorById,
  getCategoryLabel,
  getIntensityLabel,
} from '../../data/colorExplorerData';
import { PaintBucketPackshot } from './PaintBucketPackshot';

interface SpaceColorSimulatorModalProps {
  isOpen: boolean;
  initialColor: ExplorerColorItem;
  initialCombination?: ExplorerColorCombination | null;
  initialScene?: SimulatorSceneId;
  favoriteIds: string[];
  onToggleFavorite: (colorId: string) => void;
  onSelectColorInExplorer?: (color: ExplorerColorItem) => void;
  onUseInProject: (payload: {
    colorLabel: string;
    ubicacion: 'INTERIOR' | 'EXTERIOR';
    suggestedNote?: string;
  }) => void;
  onClose: () => void;
}

const SCENE_TABS: Array<{
  id: SimulatorSceneId;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'SALA',
    label: 'Sala',
    icon: <Home className="w-3.5 h-3.5" />,
  },
  {
    id: 'HABITACION',
    label: 'Habitación',
    icon: <BedDouble className="w-3.5 h-3.5" />,
  },
  {
    id: 'FACHADA',
    label: 'Fachada',
    icon: <Building2 className="w-3.5 h-3.5" />,
  },
];

export const SpaceColorSimulatorModal: React.FC<SpaceColorSimulatorModalProps> = ({
  isOpen,
  initialColor,
  initialCombination = null,
  initialScene,
  favoriteIds,
  onToggleFavorite,
  onSelectColorInExplorer,
  onUseInProject,
  onClose,
}) => {
  const [activeScene, setActiveScene] = useState<SimulatorSceneId>(
    initialScene || initialCombination?.defaultScene || initialColor.defaultScene || 'SALA'
  );
  const [primaryColor, setPrimaryColor] = useState<ExplorerColorItem>(initialColor);
  const [isComparing, setIsComparing] = useState<boolean>(Boolean(initialCombination));
  const [compareColor, setCompareColor] = useState<ExplorerColorItem>(() => {
    if (initialCombination) {
      return getColorById(initialCombination.complementaryColorId);
    }
    const firstRec = initialColor.recommendedPairIds[0];
    return firstRec ? getColorById(firstRec) : ORDERED_CATALOG_COLORS[1];
  });
  const [accentComboColor, setAccentComboColor] = useState<ExplorerColorItem | null>(() =>
    initialCombination ? getColorById(initialCombination.accentColorId) : null
  );
  const [lightingMode, setLightingMode] = useState<'DIA' | 'CALIDA'>('DIA');

  useEffect(() => {
    if (!isOpen) return;
    if (initialCombination) {
      const mainC = getColorById(initialCombination.mainColorId);
      const compC = getColorById(initialCombination.complementaryColorId);
      const accC = getColorById(initialCombination.accentColorId);
      setPrimaryColor(mainC);
      setCompareColor(compC);
      setAccentComboColor(accC);
      setIsComparing(true);
      setActiveScene(initialScene || initialCombination.defaultScene);
    } else {
      setPrimaryColor(initialColor);
      const defaultPairId =
        initialColor.recommendedPairIds.find((id) => id !== initialColor.id) ||
        ORDERED_CATALOG_COLORS.find((c) => c.id !== initialColor.id)?.id ||
        initialColor.id;
      setCompareColor(getColorById(defaultPairId));
      setAccentComboColor(null);
      setIsComparing(false);
      setActiveScene(initialScene || initialColor.defaultScene);
    }
  }, [isOpen, initialColor, initialCombination, initialScene]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isPrimaryFavorite = favoriteIds.includes(primaryColor.id);
  const secondaryWallHex = isComparing ? compareColor.hex : primaryColor.hex;
  const decorativeAccentHex =
    accentComboColor?.hex ||
    (isComparing
      ? compareColor.hex
      : getColorById(primaryColor.recommendedPairIds[0] || primaryColor.id).hex);

  const recommendedPairs = primaryColor.recommendedPairIds
    .map((id) => getColorById(id))
    .filter((item) => item.id !== primaryColor.id);

  const otherPaletteOptions = ORDERED_CATALOG_COLORS.filter(
    (item) =>
      item.id !== primaryColor.id && !recommendedPairs.some((rec) => rec.id === item.id)
  );

  const handlePrimaryChange = (color: ExplorerColorItem) => {
    setPrimaryColor(color);
    if (onSelectColorInExplorer) {
      onSelectColorInExplorer(color);
    }
    if (compareColor.id === color.id) {
      const fallback =
        color.recommendedPairIds.find((id) => id !== color.id) ||
        ORDERED_CATALOG_COLORS.find((c) => c.id !== color.id)?.id;
      if (fallback) {
        setCompareColor(getColorById(fallback));
      }
    }
  };

  const handleSwapComparison = () => {
    const prevPrimary = primaryColor;
    setPrimaryColor(compareColor);
    setCompareColor(prevPrimary);
  };

  const handleApplyToProject = () => {
    const ubicacion: 'INTERIOR' | 'EXTERIOR' =
      activeScene === 'FACHADA' ? 'EXTERIOR' : 'INTERIOR';

    let colorLabel = `${primaryColor.name} (muestra ilustrativa ${primaryColor.hex})`;
    let suggestedNote = `Deseo evaluar la aplicación del tono referencial ${primaryColor.name} (${primaryColor.sensationShort.toLowerCase()}) en ${
      activeScene === 'SALA'
        ? 'sala interior'
        : activeScene === 'HABITACION'
        ? 'habitación'
        : 'fachada exterior'
    }.`;

    if (initialCombination && accentComboColor && isComparing) {
      colorLabel = `Combinación ${initialCombination.title}: ${primaryColor.name} + ${compareColor.name} + acento ${accentComboColor.name}`;
      suggestedNote = `Me interesa la combinación sugerida "${initialCombination.title}" con ${primaryColor.name} como tono principal, ${compareColor.name} como complementario y ${accentComboColor.name} en detalles.`;
    } else if (isComparing && compareColor.id !== primaryColor.id) {
      colorLabel = `${primaryColor.name} comparado con ${compareColor.name} (muestras ilustrativas)`;
      suggestedNote = `Deseo combinar ${primaryColor.name} en paredes principales con ${compareColor.name} en muro secundario (${
        activeScene === 'FACHADA' ? 'exterior' : 'interior'
      }).`;
    }

    onUseInProject({
      colorLabel,
      ubicacion,
      suggestedNote,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle del color ${primaryColor.name}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl max-h-[92dvh] bg-white rounded-3xl border border-[#E7EAF0] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Encabezado limpio de vista de detalle */}
        <div className="px-5 sm:px-7 py-4 bg-white border-b border-[#E7EAF0] flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Catálogo COLORLINK</span>
              <span aria-hidden="true">·</span>
              <span>Familia {getCategoryLabel(primaryColor.category)}</span>
              <span aria-hidden="true">·</span>
              <span>Presentación ilustrativa</span>
            </div>
            <h3 className="font-display text-lg sm:text-xl font-extrabold text-[#092653] truncate mt-0.5">
              {initialCombination
                ? `${primaryColor.name} · ${initialCombination.title}`
                : primaryColor.name}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle del color"
            className="p-2 rounded-xl text-slate-400 hover:text-[#092653] hover:bg-[#FAFAF7] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido principal desplazable */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-[#FAFAF7] p-4 sm:p-6 lg:p-7">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-7 items-start">
            {/* ============================================================= */}
            {/* COLUMNA IZQUIERDA (5 cols): CUBETA EN MAYOR TAMAÑO + MUESTRA  */}
            {/* ============================================================= */}
            <div className="lg:col-span-5 space-y-5">
              {/* Escenario de estudio con la cubeta protagonista */}
              <div className="relative rounded-2xl bg-[radial-gradient(circle_at_50%_42%,#FFFFFF_0%,#F3F6FA_100%)] border border-[#E7EAF0] px-6 pt-7 pb-6 flex flex-col items-center justify-center">
                <button
                  type="button"
                  onClick={() => onToggleFavorite(primaryColor.id)}
                  aria-label={
                    isPrimaryFavorite
                      ? `Quitar ${primaryColor.name} de favoritos`
                      : `Guardar ${primaryColor.name} en favoritos`
                  }
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white hover:bg-[#FAFAF7] border border-[#E7EAF0] shadow-2xs flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
                >
                  <Heart
                    className={`w-4 h-4 transition-colors ${
                      isPrimaryFavorite
                        ? 'fill-rose-500 text-rose-500'
                        : 'text-slate-500 hover:text-rose-500'
                    }`}
                  />
                </button>

                {isComparing && compareColor.id !== primaryColor.id ? (
                  <div className="w-full flex items-end justify-center gap-3 sm:gap-5 py-2">
                    <div className="flex flex-col items-center">
                      <PaintBucketPackshot
                        color={primaryColor}
                        size="card"
                        className="w-36 sm:w-44"
                      />
                      <span className="text-xs font-bold text-[#092653] mt-1">
                        {primaryColor.name}
                      </span>
                    </div>
                    <div className="flex flex-col items-center opacity-95">
                      <PaintBucketPackshot
                        color={compareColor}
                        size="mini"
                        className="w-28 sm:w-32"
                      />
                      <span className="text-[11px] font-semibold text-slate-600 mt-1">
                        {compareColor.name}
                      </span>
                    </div>
                  </div>
                ) : (
                  <PaintBucketPackshot color={primaryColor} size="detail" />
                )}

                <p className="text-[11px] text-slate-500 text-center mt-2">
                  Recipiente ilustrativo de demostración · Marca COLORLINK
                </p>
              </div>

              {/* Ficha del nombre y muestra física digital del tono */}
              <div className="bg-white rounded-2xl border border-[#E7EAF0] p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      Familia {getCategoryLabel(primaryColor.category)} · Intensidad{' '}
                      {getIntensityLabel(primaryColor.intensity).toLowerCase()}
                    </p>
                    <h4 className="font-display text-xl font-extrabold text-[#092653] mt-0.5">
                      {primaryColor.name}
                    </h4>
                  </div>
                  <span className="text-xs font-mono text-slate-500 tabular-nums shrink-0">
                    Muestra {primaryColor.hex}
                  </span>
                </div>

                {/* Muestra amplia del tono (o par comparado) */}
                {isComparing && compareColor.id !== primaryColor.id ? (
                  <div className="rounded-xl overflow-hidden border border-[#E7EAF0] grid grid-cols-2 h-20 relative">
                    <div
                      className="h-full p-2.5 flex items-end"
                      style={{ backgroundColor: primaryColor.hex }}
                    >
                      <span className="text-[11px] font-bold text-[#092653] bg-white/90 px-2 py-0.5 rounded-md truncate">
                        1. {primaryColor.name}
                      </span>
                    </div>
                    <div
                      className="h-full p-2.5 flex items-end justify-end border-l border-white/60"
                      style={{ backgroundColor: compareColor.hex }}
                    >
                      <span className="text-[11px] font-bold text-[#092653] bg-white/90 px-2 py-0.5 rounded-md truncate">
                        2. {compareColor.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSwapComparison}
                      title="Intercambiar tonos"
                      aria-label="Intercambiar tonos comparados"
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-[#E7EAF0] shadow-sm flex items-center justify-center text-[#092653] hover:text-[#155EEF] cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="h-20 w-full rounded-xl border border-black/8 shadow-2xs transition-colors duration-200 flex items-end justify-between p-3"
                    style={{ backgroundColor: primaryColor.hex }}
                  >
                    <span className="text-[11px] font-semibold text-[#092653] bg-white/92 px-2.5 py-1 rounded-lg">
                      {primaryColor.sensationShort}
                    </span>
                  </div>
                )}

                <p className="text-xs sm:text-sm text-[#15243B]/80 leading-relaxed">
                  {primaryColor.inspirationNote}
                </p>

                {/* Botones principales de acción */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E7EAF0]">
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(primaryColor.id)}
                    className={`py-3 px-4 rounded-xl border text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
                      isPrimaryFavorite
                        ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                        : 'bg-[#FAFAF7] border-[#E7EAF0] text-[#092653] hover:bg-white'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 shrink-0 ${
                        isPrimaryFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-500'
                      }`}
                    />
                    <span>{isPrimaryFavorite ? 'En favoritos' : 'Favorito'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyToProject}
                    className="py-3 px-4 rounded-xl bg-[#08B6CC] hover:bg-[#092653] text-white text-xs sm:text-sm font-bold shadow-xs inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <span>Usar en mi proyecto</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </div>
            </div>

            {/* ============================================================= */}
            {/* COLUMNA DERECHA (7 cols): PARED APLICADA + COMPARACIÓN        */}
            {/* ============================================================= */}
            <div className="lg:col-span-7 space-y-5">
              {/* Previsualización del color aplicado en una pared */}
              <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden shadow-2xs">
                <div className="px-4 sm:px-5 py-3.5 border-b border-[#E7EAF0] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#092653] block">
                      Previsualización del color aplicado en pared
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Cambia el espacio o el tipo de iluminación para observar el tono
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Selector de escena */}
                    <div className="inline-flex items-center gap-1 bg-[#FAFAF7] p-1 rounded-xl border border-[#E7EAF0]">
                      {SCENE_TABS.map((tab) => {
                        const active = activeScene === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveScene(tab.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                              active
                                ? 'bg-[#092653] text-white'
                                : 'text-[#15243B] hover:text-[#155EEF]'
                            }`}
                          >
                            {tab.icon}
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Selector de luz */}
                    <div className="inline-flex items-center gap-1 bg-[#FAFAF7] p-1 rounded-xl border border-[#E7EAF0]">
                      <button
                        type="button"
                        onClick={() => setLightingMode('DIA')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                          lightingMode === 'DIA'
                            ? 'bg-[#08B6CC] text-white'
                            : 'text-slate-600 hover:text-[#092653]'
                        }`}
                      >
                        <Sun className="w-3 h-3" />
                        <span>Luz día</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLightingMode('CALIDA')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                          lightingMode === 'CALIDA'
                            ? 'bg-amber-600 text-white'
                            : 'text-slate-600 hover:text-[#092653]'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Luz cálida</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Escenas arquitectónicas con pared pintada */}
                <div className="relative">
                  {activeScene === 'SALA' && (
                    <svg
                      viewBox="0 0 800 470"
                      className="w-full h-auto block select-none"
                      role="img"
                      aria-label={`Pared de sala previsualizada con ${primaryColor.name}`}
                    >
                      <defs>
                        <linearGradient id="salaLightOverlay" x1="0%" y1="0%" x2="100%" y2="85%">
                          <stop
                            offset="0%"
                            stopColor="#FFFFFF"
                            stopOpacity={lightingMode === 'DIA' ? '0.22' : '0.08'}
                          />
                          <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0" />
                          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.12" />
                        </linearGradient>
                        <linearGradient id="warmAmbient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop
                            offset="0%"
                            stopColor="#F59E0B"
                            stopOpacity={lightingMode === 'CALIDA' ? '0.14' : '0'}
                          />
                          <stop
                            offset="100%"
                            stopColor="#EA580C"
                            stopOpacity={lightingMode === 'CALIDA' ? '0.08' : '0'}
                          />
                        </linearGradient>
                        <linearGradient id="oakFloor" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#DECBB3" />
                          <stop offset="100%" stopColor="#C9B090" />
                        </linearGradient>
                      </defs>

                      <polygon points="0,0 800,0 800,52 565,52 0,40" fill="#FAF8F4" />

                      {/* Pared principal pintada */}
                      <polygon
                        points="0,40 565,52 565,355 0,368"
                        fill={primaryColor.hex}
                        className="transition-colors duration-200"
                      />
                      <polygon points="0,40 565,52 565,355 0,368" fill="url(#salaLightOverlay)" />

                      {/* Pared secundaria para comparación */}
                      <polygon
                        points="565,52 800,28 800,388 565,355"
                        fill={secondaryWallHex}
                        className="transition-colors duration-200"
                      />
                      <polygon
                        points="565,52 800,28 800,388 565,355"
                        fill="#0F172A"
                        fillOpacity={isComparing ? '0.06' : '0.14'}
                      />

                      <rect x="0" y="74" width="76" height="210" fill="#EBF4F8" />
                      <rect
                        x="0"
                        y="74"
                        width="76"
                        height="210"
                        fill="none"
                        stroke="#F8FAFC"
                        strokeWidth="8"
                      />
                      <line x1="38" y1="74" x2="38" y2="284" stroke="#F8FAFC" strokeWidth="5" />
                      <line x1="0" y1="180" x2="76" y2="180" stroke="#F8FAFC" strokeWidth="5" />
                      <polygon
                        points="76,80 265,110 245,310 76,280"
                        fill="#FFFFFF"
                        fillOpacity={lightingMode === 'DIA' ? '0.14' : '0.06'}
                      />

                      <polygon points="0,360 565,348 565,358 0,371" fill="#F8F7F4" />
                      <polygon points="565,348 800,380 800,391 565,358" fill="#ECEAE4" />
                      <polygon points="0,371 565,358 800,391 800,470 0,470" fill="url(#oakFloor)" />
                      <polygon
                        points="105,406 545,396 655,462 58,466"
                        fill="#F3EFE8"
                        stroke="#E4DDD1"
                        strokeWidth="2"
                      />

                      <rect
                        x="242"
                        y="100"
                        width="118"
                        height="144"
                        rx="4"
                        fill="#FAF9F6"
                        stroke="#D6CFC2"
                        strokeWidth="4"
                      />
                      <rect x="258" y="116" width="86" height="112" fill="#F1ECE2" />
                      <circle cx="301" cy="162" r="23" fill={decorativeAccentHex} fillOpacity="0.88" />
                      <path
                        d="M268 214 Q301 180 334 214"
                        fill="none"
                        stroke="#092653"
                        strokeWidth="2.5"
                        strokeOpacity="0.45"
                      />

                      <rect
                        x="632"
                        y="116"
                        width="96"
                        height="150"
                        rx="48"
                        fill={accentComboColor ? accentComboColor.hex : '#FAF9F6'}
                        fillOpacity={accentComboColor ? '0.92' : '0.25'}
                      />

                      <line x1="504" y1="176" x2="504" y2="385" stroke="#B79352" strokeWidth="4" />
                      <ellipse cx="504" cy="386" rx="22" ry="5" fill="#9D7B3E" />
                      <path
                        d="M476 178 L532 178 L520 142 L488 142 Z"
                        fill="#FFFDF9"
                        stroke="#E2D9C8"
                        strokeWidth="2"
                      />

                      <rect x="168" y="382" width="8" height="22" rx="2" fill="#7C5E42" />
                      <rect x="444" y="380" width="8" height="22" rx="2" fill="#7C5E42" />
                      <rect x="156" y="276" width="308" height="78" rx="18" fill="#EAE4DA" />
                      <rect x="174" y="284" width="132" height="58" rx="12" fill="#F5F1EA" />
                      <rect x="312" y="284" width="132" height="58" rx="12" fill="#F5F1EA" />
                      <rect
                        x="184"
                        y="298"
                        width="44"
                        height="42"
                        rx="10"
                        fill={decorativeAccentHex}
                      />
                      <rect
                        x="388"
                        y="300"
                        width="42"
                        height="40"
                        rx="10"
                        fill={isComparing ? compareColor.hex : '#96AD98'}
                      />
                      <rect x="144" y="336" width="332" height="50" rx="14" fill="#EFEAE1" />
                      <rect x="142" y="306" width="26" height="80" rx="11" fill="#E3DCD0" />
                      <rect x="452" y="306" width="26" height="80" rx="11" fill="#E3DCD0" />

                      <ellipse cx="322" cy="424" rx="88" ry="17" fill="#C89F74" />
                      <rect x="268" y="426" width="9" height="28" rx="3" fill="#A67E56" />
                      <rect x="366" y="426" width="9" height="28" rx="3" fill="#A67E56" />
                      <ellipse cx="332" cy="414" rx="11" ry="14" fill="#FAF8F5" />

                      <path d="M635 334 L685 334 L677 402 L643 402 Z" fill="#DFD5C7" />
                      <path
                        d="M660 336 C645 302 622 292 618 272 C638 274 652 294 659 322"
                        fill="#6D876E"
                      />
                      <path
                        d="M660 336 C660 292 678 268 696 258 C695 282 678 306 663 332"
                        fill="#587259"
                      />
                      <path
                        d="M658 334 C644 290 652 256 662 240 C672 260 669 296 661 332"
                        fill="#7D987E"
                      />

                      <rect
                        x="0"
                        y="0"
                        width="800"
                        height="470"
                        fill="url(#warmAmbient)"
                        pointerEvents="none"
                      />
                    </svg>
                  )}

                  {activeScene === 'HABITACION' && (
                    <svg
                      viewBox="0 0 800 470"
                      className="w-full h-auto block select-none"
                      role="img"
                      aria-label={`Pared de habitación previsualizada con ${primaryColor.name}`}
                    >
                      <defs>
                        <linearGradient id="habLight" x1="100%" y1="0%" x2="0%" y2="85%">
                          <stop
                            offset="0%"
                            stopColor="#FFFFFF"
                            stopOpacity={lightingMode === 'DIA' ? '0.24' : '0.08'}
                          />
                          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0" />
                          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.12" />
                        </linearGradient>
                        <linearGradient id="habWarm" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop
                            offset="0%"
                            stopColor="#F59E0B"
                            stopOpacity={lightingMode === 'CALIDA' ? '0.15' : '0'}
                          />
                          <stop
                            offset="100%"
                            stopColor="#EA580C"
                            stopOpacity={lightingMode === 'CALIDA' ? '0.08' : '0'}
                          />
                        </linearGradient>
                      </defs>

                      <polygon points="0,0 800,0 800,46 210,54 0,36" fill="#FAF8F5" />
                      <polygon
                        points="0,36 210,54 210,358 0,388"
                        fill={secondaryWallHex}
                        className="transition-colors duration-200"
                      />
                      <polygon
                        points="0,36 210,54 210,358 0,388"
                        fill="#0F172A"
                        fillOpacity={isComparing ? '0.05' : '0.13'}
                      />
                      <polygon
                        points="210,54 800,46 800,368 210,358"
                        fill={primaryColor.hex}
                        className="transition-colors duration-200"
                      />
                      <polygon points="210,54 800,46 800,368 210,358" fill="url(#habLight)" />

                      <rect x="698" y="82" width="102" height="215" fill="#EBF4F8" />
                      <rect
                        x="698"
                        y="82"
                        width="102"
                        height="215"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="7"
                      />
                      <rect
                        x="668"
                        y="74"
                        width="42"
                        height="280"
                        rx="6"
                        fill="#FAF8F4"
                        fillOpacity="0.88"
                      />

                      <polygon points="0,380 210,350 210,360 0,390" fill="#ECE9E2" />
                      <polygon points="210,350 800,360 800,370 210,360" fill="#F8F6F2" />
                      <polygon points="0,390 210,360 800,370 800,470 0,470" fill="#D8C3A8" />
                      <polygon
                        points="180,404 675,406 730,466 115,466"
                        fill="#F4F0E8"
                        stroke="#E5DECFE0"
                        strokeWidth="2"
                      />

                      <rect
                        x="378"
                        y="100"
                        width="76"
                        height="98"
                        rx="3"
                        fill="#FAF9F6"
                        stroke="#D8D0C5"
                        strokeWidth="3"
                      />
                      <circle cx="416" cy="149" r="18" fill={decorativeAccentHex} fillOpacity="0.82" />
                      <rect
                        x="470"
                        y="100"
                        width="76"
                        height="98"
                        rx="3"
                        fill="#FAF9F6"
                        stroke="#D8D0C5"
                        strokeWidth="3"
                      />
                      <path
                        d="M488 172 Q508 128 528 172 Z"
                        fill={secondaryWallHex}
                        fillOpacity="0.85"
                      />

                      <rect x="304" y="226" width="312" height="110" rx="16" fill="#E5DDD0" />
                      <rect x="332" y="270" width="116" height="44" rx="12" fill="#FFFFFF" />
                      <rect x="472" y="270" width="116" height="44" rx="12" fill="#FFFFFF" />
                      <rect
                        x="366"
                        y="284"
                        width="64"
                        height="32"
                        rx="10"
                        fill={decorativeAccentHex}
                      />
                      <rect
                        x="490"
                        y="284"
                        width="64"
                        height="32"
                        rx="10"
                        fill={secondaryWallHex}
                      />
                      <rect x="286" y="308" width="348" height="94" rx="18" fill="#FAF8F4" />
                      <path
                        d="M286 356 L634 356 L634 390 Q634 402 620 402 L300 402 Q286 402 286 390 Z"
                        fill={accentComboColor ? accentComboColor.hex : '#D8CFC2'}
                        fillOpacity={accentComboColor ? '0.85' : '0.9'}
                      />
                      <rect x="296" y="400" width="328" height="16" rx="4" fill="#A9845E" />
                      <rect x="312" y="414" width="10" height="20" rx="2" fill="#8A6845" />
                      <rect x="600" y="414" width="10" height="20" rx="2" fill="#8A6845" />

                      <rect x="218" y="326" width="60" height="58" rx="6" fill="#C6A27E" />
                      <line x1="226" y1="354" x2="270" y2="354" stroke="#A6825E" strokeWidth="2" />
                      <rect x="241" y="298" width="14" height="28" rx="4" fill="#EFEAE1" />
                      <path
                        d="M230 298 L266 298 L259 272 L237 272 Z"
                        fill="#FFFBEB"
                        stroke="#E5DEC9"
                        strokeWidth="1.5"
                      />

                      <rect
                        x="0"
                        y="0"
                        width="800"
                        height="470"
                        fill="url(#habWarm)"
                        pointerEvents="none"
                      />
                    </svg>
                  )}

                  {activeScene === 'FACHADA' && (
                    <svg
                      viewBox="0 0 800 470"
                      className="w-full h-auto block select-none"
                      role="img"
                      aria-label={`Fachada exterior previsualizada con ${primaryColor.name}`}
                    >
                      <defs>
                        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop
                            offset="0%"
                            stopColor={lightingMode === 'DIA' ? '#DCECF5' : '#F6E6D2'}
                          />
                          <stop
                            offset="100%"
                            stopColor={lightingMode === 'DIA' ? '#F5F9FC' : '#FBF5EC'}
                          />
                        </linearGradient>
                        <linearGradient id="facadeSun" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.1" />
                        </linearGradient>
                      </defs>

                      <rect x="0" y="0" width="800" height="380" fill="url(#skyGrad)" />
                      <circle cx="88" cy="326" r="64" fill="#8BA189" />
                      <circle cx="136" cy="340" r="48" fill="#768E75" />
                      <circle cx="726" cy="322" r="68" fill="#8BA189" />
                      <circle cx="678" cy="342" r="46" fill="#738B72" />

                      <rect
                        x="136"
                        y="94"
                        width="390"
                        height="292"
                        rx="4"
                        fill={primaryColor.hex}
                        className="transition-colors duration-200"
                      />
                      <rect x="136" y="94" width="390" height="292" fill="url(#facadeSun)" />
                      <rect x="126" y="82" width="410" height="16" rx="2" fill="#F5F3EE" />

                      <rect
                        x="472"
                        y="138"
                        width="208"
                        height="248"
                        rx="4"
                        fill={secondaryWallHex}
                        className="transition-colors duration-200"
                      />
                      <rect
                        x="472"
                        y="138"
                        width="208"
                        height="248"
                        fill="#0F172A"
                        fillOpacity={isComparing ? '0.04' : '0.12'}
                      />
                      <rect x="464" y="128" width="224" height="13" rx="2" fill="#F5F3EE" />

                      <rect
                        x="448"
                        y="138"
                        width="24"
                        height="248"
                        fill={accentComboColor ? accentComboColor.hex : decorativeAccentHex}
                        fillOpacity="0.92"
                      />

                      <rect
                        x="186"
                        y="138"
                        width="212"
                        height="92"
                        rx="4"
                        fill="#BFD6E2"
                        stroke="#F8FAFC"
                        strokeWidth="6"
                      />
                      <line x1="292" y1="138" x2="292" y2="230" stroke="#F8FAFC" strokeWidth="5" />
                      <polygon
                        points="192,144 252,144 214,224 192,224"
                        fill="#FFFFFF"
                        fillOpacity="0.32"
                      />

                      <rect
                        x="186"
                        y="264"
                        width="212"
                        height="90"
                        rx="4"
                        fill="#BFD6E2"
                        stroke="#F8FAFC"
                        strokeWidth="6"
                      />
                      <line x1="292" y1="264" x2="292" y2="354" stroke="#F8FAFC" strokeWidth="5" />

                      <rect
                        x="526"
                        y="216"
                        width="96"
                        height="170"
                        rx="4"
                        fill="#9E6F47"
                        stroke="#F5F3EE"
                        strokeWidth="5"
                      />
                      <line x1="558" y1="219" x2="558" y2="384" stroke="#855A36" strokeWidth="2" />
                      <line x1="590" y1="219" x2="590" y2="384" stroke="#855A36" strokeWidth="2" />
                      <rect x="606" y="286" width="4" height="36" rx="2" fill="#E2E8F0" />

                      <rect x="0" y="386" width="800" height="84" fill="#E6E1D8" />
                      <polygon points="512,386 636,386 692,470 456,470" fill="#D5CEC2" />

                      <rect x="486" y="352" width="30" height="34" rx="4" fill="#FAF8F5" />
                      <circle cx="501" cy="342" r="18" fill="#5F7D61" />
                      <rect x="634" y="352" width="30" height="34" rx="4" fill="#FAF8F5" />
                      <circle cx="649" cy="342" r="18" fill="#5F7D61" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Opción de comparar con otro tono */}
              <div className="bg-white rounded-2xl border border-[#E7EAF0] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Columns2 className="w-4 h-4 text-[#08B6CC]" />
                    <span className="text-sm font-bold text-[#092653]">
                      Comparar con otro tono
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsComparing((prev) => !prev)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      isComparing
                        ? 'bg-[#092653] text-white'
                        : 'bg-[#FAFAF7] text-[#092653] border border-[#E7EAF0] hover:border-[#155EEF]'
                    }`}
                  >
                    {isComparing ? 'Ocultar comparación' : 'Comparar con otro tono'}
                  </button>
                </div>

                {isComparing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-slate-500 block">
                        Tonos que armonizan con {primaryColor.name}:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {recommendedPairs.map((rec) => {
                          const selected = compareColor.id === rec.id;
                          return (
                            <button
                              key={rec.id}
                              type="button"
                              onClick={() => setCompareColor(rec)}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                                selected
                                  ? 'border-[#155EEF] bg-[#155EEF]/8 text-[#092653]'
                                  : 'border-[#E7EAF0] bg-[#FAFAF7] text-[#15243B] hover:bg-white'
                              }`}
                            >
                              <span
                                className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                                style={{ backgroundColor: rec.hex }}
                              />
                              <span>{rec.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-medium text-slate-500 block">
                        Otros tonos disponibles en el catálogo:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {otherPaletteOptions.map((opt) => {
                          const selected = compareColor.id === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              title={opt.name}
                              aria-label={`Comparar con ${opt.name}`}
                              onClick={() => setCompareColor(opt)}
                              className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center cursor-pointer ${
                                selected
                                  ? 'border-[#092653] scale-110 shadow-xs'
                                  : 'border-white shadow-2xs ring-1 ring-black/10'
                              }`}
                              style={{ backgroundColor: opt.hex }}
                            >
                              {selected && (
                                <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Activa la comparación para evaluar otro color en el muro secundario y ver ambos
                    recipientes juntos antes de llevar la elección a tu proyecto.
                  </p>
                )}
              </div>

              {/* Si el modal fue abierto desde una combinación de Inspiración, permitir cambiar tono principal */}
              {initialCombination && accentComboColor && (
                <div className="bg-white rounded-2xl border border-[#E7EAF0] p-4 space-y-2.5">
                  <span className="text-xs font-bold text-[#092653] block">
                    Tonos sugeridos en esta combinación (pulsa para ver su cubeta):
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { role: 'Principal', item: getColorById(initialCombination.mainColorId) },
                      {
                        role: 'Complemento',
                        item: getColorById(initialCombination.complementaryColorId),
                      },
                      { role: 'Acento', item: getColorById(initialCombination.accentColorId) },
                    ].map(({ role, item }) => {
                      const isMain = primaryColor.id === item.id;
                      return (
                        <button
                          key={`${role}-${item.id}`}
                          type="button"
                          onClick={() => handlePrimaryChange(item)}
                          className={`p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                            isMain
                              ? 'border-[#155EEF] bg-[#155EEF]/6'
                              : 'border-[#E7EAF0] bg-[#FAFAF7] hover:bg-white'
                          }`}
                        >
                          <div
                            className="h-7 w-full rounded-lg border border-black/8 mb-1.5"
                            style={{ backgroundColor: item.hex }}
                          />
                          <span className="text-[10px] text-slate-500 block">{role}</span>
                          <span className="text-xs font-bold text-[#092653] truncate block">
                            {item.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nota transparente de fidelidad */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E7EAF0] flex items-start gap-2.5 text-xs text-slate-600">
                <Info className="w-4 h-4 text-[#08B6CC] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Los recipientes y las previsualizaciones en pared son representaciones visuales de
                  demostración para orientar tu proyecto en COLORLINK. No corresponden a envases
                  comerciales oficiales, precios ni existencias en inventario.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
