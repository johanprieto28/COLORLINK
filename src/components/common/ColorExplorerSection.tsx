import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  Heart,
  ArrowRight,
  ChevronUp,
  Info,
  RotateCcw,
} from 'lucide-react';
import {
  ORDERED_CATALOG_COLORS,
  FEATURED_COLOR_IDS,
  FAVORITES_UPDATED_EVENT,
  ExplorerColorCombination,
  ExplorerColorItem,
  ExplorerEnvironmentId,
  SimulatorSceneId,
  ColorExplorerFilterRequest,
  getCategoryLabel,
  getCategoryBriefDescription,
  getColorById,
  getCombinationById,
  getStoredFavoriteColorIds,
  saveStoredFavoriteColorIds,
} from '../../data/colorExplorerData';
import { PaintBucketPackshot } from './PaintBucketPackshot';
import { SpaceColorSimulatorModal } from './SpaceColorSimulatorModal';
import { WizardPrefill } from '../../App';

interface ColorExplorerSectionProps {
  externalRequest?: ColorExplorerFilterRequest;
  onStartProjectWithPrefill?: (prefill?: WizardPrefill) => void;
  onOpenAssistant?: () => void;
}

function mapEnvironmentToSimulatorScene(
  envId?: ExplorerEnvironmentId | null
): SimulatorSceneId | undefined {
  if (!envId) return undefined;
  if (envId === 'HABITACION') return 'HABITACION';
  if (envId === 'FACHADA') return 'FACHADA';
  return 'SALA';
}

export const ColorExplorerSection: React.FC<ColorExplorerSectionProps> = ({
  externalRequest,
  onStartProjectWithPrefill,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCatalogExpanded, setIsCatalogExpanded] = useState<boolean>(false);
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getStoredFavoriteColorIds());

  // Estado de la vista de detalle ("Ver color")
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [detailColor, setDetailColor] = useState<ExplorerColorItem>(ORDERED_CATALOG_COLORS[0]);
  const [detailCombo, setDetailCombo] = useState<ExplorerColorCombination | null>(null);
  const [detailScene, setDetailScene] = useState<SimulatorSceneId | undefined>(undefined);

  const sectionTopRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const syncExternalFavorites = () => {
      setFavoriteIds(getStoredFavoriteColorIds());
    };
    window.addEventListener(FAVORITES_UPDATED_EVENT, syncExternalFavorites);
    window.addEventListener('storage', syncExternalFavorites);
    return () => {
      window.removeEventListener(FAVORITES_UPDATED_EVENT, syncExternalFavorites);
      window.removeEventListener('storage', syncExternalFavorites);
    };
  }, []);

  // Sincronización con solicitudes desde el encabezado (Favoritos), Inspiración o COLORLINK IA
  useEffect(() => {
    if (!externalRequest) return;

    if (externalRequest.onlyFavorites) {
      setSearchQuery('');
      setOnlyFavorites(true);
      return;
    }

    setOnlyFavorites(false);

    if (externalRequest.combinationId) {
      const targetCombo = getCombinationById(externalRequest.combinationId);
      if (targetCombo) {
        const mainC = getColorById(targetCombo.mainColorId);
        setDetailColor(mainC);
        setDetailCombo(targetCombo);
        setDetailScene(
          mapEnvironmentToSimulatorScene(externalRequest.environment) || targetCombo.defaultScene
        );
        setDetailOpen(true);
        return;
      }
    }

    if (externalRequest.colorId) {
      const targetColor = getColorById(externalRequest.colorId);
      setDetailCombo(null);
      setDetailColor(targetColor);
      setDetailScene(
        mapEnvironmentToSimulatorScene(externalRequest.environment) || targetColor.defaultScene
      );
      setDetailOpen(true);
    }
  }, [externalRequest]);

  const toggleFavorite = (colorId: string) => {
    setFavoriteIds((prev) => {
      const next = prev.includes(colorId)
        ? prev.filter((id) => id !== colorId)
        : [...prev, colorId];
      saveStoredFavoriteColorIds(next);
      return next;
    });
  };

  const normalizedQuery = searchQuery
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const isSearchingOrFiltering = Boolean(normalizedQuery) || onlyFavorites;

  const matchingColors = useMemo(() => {
    return ORDERED_CATALOG_COLORS.filter((item) => {
      if (onlyFavorites && !favoriteIds.includes(item.id)) {
        return false;
      }
      if (normalizedQuery) {
        const searchable = [item.name, getCategoryLabel(item.category), ...item.searchKeywords]
          .join(' ')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        if (!searchable.includes(normalizedQuery)) {
          return false;
        }
      }
      return true;
    });
  }, [normalizedQuery, onlyFavorites, favoriteIds]);

  const featuredColors = useMemo(
    () =>
      ORDERED_CATALOG_COLORS.filter((item) => FEATURED_COLOR_IDS.includes(item.id)).slice(0, 4),
    []
  );

  const visibleColors = isSearchingOrFiltering
    ? matchingColors
    : isCatalogExpanded
    ? ORDERED_CATALOG_COLORS
    : featuredColors;

  const handleOpenColorDetail = (color: ExplorerColorItem) => {
    setDetailCombo(null);
    setDetailColor(color);
    setDetailScene(color.defaultScene);
    setDetailOpen(true);
  };

  const handleReturnToFeatured = () => {
    setSearchQuery('');
    setOnlyFavorites(false);
    setIsCatalogExpanded(false);
    sectionTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      ref={sectionTopRef}
      id="encuentra-tu-color"
      className="py-16 sm:py-24 bg-[#FAFAF7] scroll-mt-24 border-b border-[#E7EAF0]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        {/* ================================================================= */}
        {/* 1. ENCABEZADO COMERCIAL LIMPIO + BÚSQUEDA SENCILLA POR NOMBRE     */}
        {/* ================================================================= */}
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="space-y-2.5">
            <p className="text-xs font-bold tracking-wider uppercase text-[#155EEF]">
              Encuentra tu color
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl font-extrabold text-[#092653] tracking-tight leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Elige el tono ideal para transformar tus espacios
            </h2>
            <p className="text-sm sm:text-base text-[#15243B]/75 leading-relaxed">
              Explora nuestra selección destacada en presentación ilustrativa, visualiza cada tono
              aplicado en pared y llévalo directamente a tu proyecto.
            </p>
          </div>

          {/* Búsqueda sencilla por nombre del color */}
          <div className="max-w-lg mx-auto">
            <div className="relative flex items-center bg-white rounded-2xl border border-[#E7EAF0] shadow-2xs focus-within:border-[#155EEF] focus-within:ring-4 focus-within:ring-[#155EEF]/10 transition-all">
              <Search className="w-4 h-4 text-[#08B6CC] ml-4 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar color por nombre (ej. Marfil Luz, Verde Salvia)…"
                aria-label="Buscar color por nombre"
                className="w-full bg-transparent px-3.5 py-3.5 text-sm sm:text-base text-[#15243B] placeholder-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpiar búsqueda de color"
                  className="mr-2.5 p-1.5 rounded-xl text-slate-400 hover:text-[#092653] hover:bg-[#FAFAF7] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Barra discreta de contexto únicamente cuando se expande todo el catálogo o se buscan favoritos */}
        {(isCatalogExpanded || isSearchingOrFiltering) && (
          <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-[#E7EAF0]">
            <p className="text-xs sm:text-sm text-slate-600 tabular-nums">
              {onlyFavorites ? (
                <>
                  Mostrando <strong className="text-[#092653]">{visibleColors.length}</strong>{' '}
                  {visibleColors.length === 1 ? 'color favorito' : 'colores favoritos'}
                </>
              ) : normalizedQuery ? (
                <>
                  Resultados para “<strong className="text-[#092653]">{searchQuery.trim()}</strong>
                  ”: <strong className="text-[#092653]">{visibleColors.length}</strong>{' '}
                  {visibleColors.length === 1 ? 'color' : 'colores'}
                </>
              ) : (
                <>
                  Catálogo completo desplegado ·{' '}
                  <strong className="text-[#092653]">{ORDERED_CATALOG_COLORS.length}</strong>{' '}
                  colores ilustrativos
                </>
              )}
            </p>

            <button
              type="button"
              onClick={handleReturnToFeatured}
              className="text-xs font-bold text-[#155EEF] hover:text-[#092653] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Volver a colores destacados</span>
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. CATÁLOGO DE RECIPIENTES INDIVIDUALES (4 POR FILA EN DESKTOP)   */}
        {/* ================================================================= */}
        {visibleColors.length > 0 ? (
          <div className="space-y-10">
            <div className="grid grid-cols-1 min-[500px]:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7">
              {visibleColors.map((color) => {
                const isFav = favoriteIds.includes(color.id);
                const familyLabel = getCategoryLabel(color.category);
                const familyDesc = getCategoryBriefDescription(color.category);

                return (
                  <article
                    key={color.id}
                    onClick={() => handleOpenColorDetail(color)}
                    className="group bg-white rounded-2xl border border-[#E7EAF0] hover:border-[#08B6CC]/70 shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden cursor-pointer"
                  >
                    {/* Área superior con cubeta individual centrada sobre fondo claro de estudio */}
                    <div className="relative bg-[radial-gradient(circle_at_50%_46%,#FFFFFF_0%,#F4F6FA_100%)] border-b border-[#E7EAF0]/80 pt-7 pb-5 px-5 flex items-center justify-center min-h-[248px]">
                      {/* Indicador de favorito */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(color.id);
                        }}
                        aria-label={
                          isFav
                            ? `Quitar ${color.name} de favoritos`
                            : `Guardar ${color.name} en favoritos`
                        }
                        className="absolute top-3.5 right-3.5 z-10 w-9 h-9 rounded-full bg-white/95 hover:bg-white border border-[#E7EAF0] shadow-2xs flex items-center justify-center transition-transform duration-150 hover:scale-105 cursor-pointer"
                      >
                        <Heart
                          className={`w-4 h-4 transition-colors ${
                            isFav
                              ? 'fill-rose-500 text-rose-500'
                              : 'text-slate-400 hover:text-rose-500'
                          }`}
                        />
                      </button>

                      {/* Recipiente de pintura realista con etiqueta del tono seleccionado */}
                      <div className="transition-transform duration-200 group-hover:scale-[1.03]">
                        <PaintBucketPackshot color={color} size="card" />
                      </div>
                    </div>

                    {/* Información limpia del producto cromático */}
                    <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-5">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-display text-lg font-extrabold text-[#092653] group-hover:text-[#155EEF] transition-colors leading-snug">
                            {color.name}
                          </h3>
                          <span
                            aria-hidden="true"
                            className="w-4 h-4 rounded-full border border-black/12 shadow-2xs shrink-0"
                            style={{ backgroundColor: color.hex }}
                          />
                        </div>

                        <p className="text-xs font-semibold text-[#15243B]/70">
                          Familia {familyLabel} · {color.sensationShort}
                        </p>

                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 pt-0.5">
                          {familyDesc}
                        </p>
                      </div>

                      {/* Botón discreto "Ver color" */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenColorDetail(color);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#FAFAF7] group-hover:bg-[#092653] text-[#092653] group-hover:text-white border border-[#E7EAF0] group-hover:border-[#092653] text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors duration-200 whitespace-nowrap cursor-pointer"
                      >
                        <span>Ver color</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Botón "Ver todos los colores" o "Volver a colores destacados" */}
            {!isSearchingOrFiltering && (
              <div className="flex justify-center pt-2">
                {!isCatalogExpanded ? (
                  <button
                    type="button"
                    onClick={() => setIsCatalogExpanded(true)}
                    className="px-7 py-3.5 rounded-xl bg-[#092653] hover:bg-[#155EEF] text-white text-sm font-bold shadow-xs inline-flex items-center justify-center gap-2.5 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <span>Ver todos los colores</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleReturnToFeatured}
                    className="px-7 py-3.5 rounded-xl bg-white hover:bg-[#FAFAF7] border border-[#E7EAF0] hover:border-[#092653] text-[#092653] text-sm font-bold shadow-2xs inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4" />
                    <span>Volver a colores destacados</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Estado vacío limpio cuando la búsqueda o favoritos no tienen coincidencias */
          <div className="bg-white rounded-2xl border border-[#E7EAF0] p-10 text-center space-y-4 max-w-xl mx-auto">
            <p className="font-display text-base sm:text-lg font-bold text-[#092653]">
              {onlyFavorites
                ? 'Aún no tienes colores guardados en favoritos'
                : 'No encontramos un color con ese nombre'}
            </p>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {onlyFavorites
                ? 'Marca el ícono de corazón en cualquier cubeta para guardar tus tonos preferidos.'
                : 'Prueba buscando nombres como Marfil Luz, Arena Dorada, Azul Profundo, Verde Salvia o Terracota.'}
            </p>
            <button
              type="button"
              onClick={handleReturnToFeatured}
              className="px-5 py-2.5 rounded-xl bg-[#092653] hover:bg-[#155EEF] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ver colores destacados</span>
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* 3. AVISO TRANSPARENTE DE DEMOSTRACIÓN VISUAL                      */}
        {/* ================================================================= */}
        <div className="pt-2 flex items-start justify-center gap-2.5 text-center max-w-3xl mx-auto">
          <Info className="w-4 h-4 text-[#08B6CC] shrink-0 mt-0.5 hidden sm:block" />
          <p className="text-xs text-slate-500 leading-relaxed">
            Representación visual demostrativa: los recipientes y muestras de pintura de esta
            sección son ilustraciones orientativas con identidad COLORLINK y no corresponden a
            referencias comerciales oficiales, presentaciones de venta ni inventario disponible.
          </p>
        </div>
      </div>

      {/* Vista de detalle al pulsar "Ver color" */}
      <SpaceColorSimulatorModal
        isOpen={detailOpen}
        initialColor={detailColor}
        initialCombination={detailCombo}
        initialScene={detailScene}
        favoriteIds={favoriteIds}
        onToggleFavorite={toggleFavorite}
        onSelectColorInExplorer={(color) => setDetailColor(color)}
        onUseInProject={({ colorLabel, ubicacion, suggestedNote }) => {
          setDetailOpen(false);
          if (onStartProjectWithPrefill) {
            onStartProjectWithPrefill({
              colorRequerido: colorLabel,
              ubicacion,
              descripcionProblema: suggestedNote,
            });
          }
        }}
        onClose={() => setDetailOpen(false)}
      />
    </section>
  );
};
