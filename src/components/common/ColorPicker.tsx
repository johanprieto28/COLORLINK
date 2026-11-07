import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Check, Loader2, Palette, Search, X } from 'lucide-react';
import {
  DISPONIBILIDAD_LABELS,
  FAMILIA_LABELS,
  galonesEstimados,
  MAX_COLORES_PROYECTO,
  type ColorCatalogo,
  type Disponibilidad,
  type FamiliaColor,
} from '../../data/colores';
import { useColores } from '../../lib/useColores';

interface ColorPickerProps {
  /** Ids elegidos; el primero es el principal */
  value: string[];
  onChange: (ids: string[]) => void;
  /** Área del proyecto, para estimar los galones de cada color */
  areaM2?: number;
}

const ROLES = ['Principal', 'Secundario'];

const PUNTO_DISPONIBILIDAD: Record<Disponibilidad, string> = {
  DISPONIBLE: 'bg-emerald-500',
  POCAS: 'bg-amber-400',
  BAJO_PEDIDO: 'bg-slate-400',
};

const sinTildes = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** true si el texto debe ir oscuro sobre ese color */
function esClaro(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150;
}

/**
 * Selector de colores del proyecto: solo colores del catálogo (con stock), máximo 2.
 * Muestra una pared de vista previa con el reparto principal / secundario.
 */
export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, areaM2 = 0 }) => {
  const { colores, error } = useColores();
  const [familia, setFamilia] = useState<FamiliaColor | 'TODAS'>('TODAS');
  const [busqueda, setBusqueda] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const [sacudir, setSacudir] = useState(0);
  const avisoTimer = useRef<number | undefined>(undefined);

  const porId = useMemo(() => new Map((colores || []).map((c) => [c.id, c])), [colores]);
  const elegidos = value.map((id) => porId.get(id)).filter((c): c is ColorCatalogo => Boolean(c));
  const galones = galonesEstimados(areaM2, elegidos.length);

  const visibles = useMemo(() => {
    const q = sinTildes(busqueda.trim());
    return (colores || []).filter(
      (c) => (familia === 'TODAS' || c.familia === familia) && (!q || sinTildes(c.nombre).includes(q) || sinTildes(FAMILIA_LABELS[c.familia]).includes(q))
    );
  }, [colores, familia, busqueda]);

  const avisar = (texto: string) => {
    setAviso(texto);
    setSacudir((n) => n + 1);
    window.clearTimeout(avisoTimer.current);
    avisoTimer.current = window.setTimeout(() => setAviso(null), 3200);
  };

  const alternar = (c: ColorCatalogo) => {
    if (value.includes(c.id)) return onChange(value.filter((id) => id !== c.id));
    if (value.length >= MAX_COLORES_PROYECTO) {
      return avisar(`Puedes elegir máximo ${MAX_COLORES_PROYECTO} colores. Quita uno para cambiarlo.`);
    }
    onChange([...value, c.id]);
  };

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------- Vista previa */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4 items-stretch">
        <div
          className="relative h-40 md:h-auto md:min-h-[180px] rounded-2xl overflow-hidden border border-[#E7EAF0] bg-[repeating-linear-gradient(45deg,#FAFAF7_0,#FAFAF7_10px,#F1F3F7_10px,#F1F3F7_20px)] flex"
          aria-hidden="true"
        >
          {elegidos.length === 0 ? (
            <div className="m-auto text-center px-4">
              <Palette className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs text-slate-500">Tu pared se pintará aquí</p>
            </div>
          ) : (
            elegidos.map((c, i) => (
              <div
                key={c.id}
                className="relative h-full transition-[flex-grow,background-color] duration-500 ease-out"
                style={{ backgroundColor: c.hex, flexGrow: elegidos.length === 1 ? 1 : i === 0 ? 7 : 3, flexBasis: 0 }}
              >
                <span
                  className={`absolute bottom-2 left-2.5 text-[10px] font-bold uppercase tracking-wider ${
                    esClaro(c.hex) ? 'text-[#092653]/70' : 'text-white/85'
                  }`}
                >
                  {ROLES[i]}
                </span>
              </div>
            ))
          )}
          {/* Zócalo y sombra para que se lea como una pared */}
          <div className="absolute inset-x-0 bottom-0 h-2.5 bg-white/70 border-t border-black/5" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/10 pointer-events-none" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tu selección</span>
            <span className="text-xs font-semibold text-slate-500 tabular-nums">
              {elegidos.length}/{MAX_COLORES_PROYECTO}
            </span>
          </div>
          {Array.from({ length: MAX_COLORES_PROYECTO }, (_, i) => {
            const c = elegidos[i];
            return c ? (
              <div key={c.id} className="cl-slide-down flex items-center gap-3 p-2.5 pr-2 rounded-xl bg-white border border-[#E7EAF0] shadow-2xs">
                <span className="w-10 h-10 rounded-lg shrink-0 border border-black/10" style={{ backgroundColor: c.hex }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#0B1F3A] truncate">{c.nombre}</p>
                  <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-1.5">
                    <span className="font-semibold text-[#0891B2]">{ROLES[i]}</span>
                    {galones[i] ? <span>· ≈ {galones[i]} gal</span> : null}
                    <span className="inline-flex items-center gap-1">
                      · <span className={`w-1.5 h-1.5 rounded-full ${PUNTO_DISPONIBILIDAD[c.disponibilidad]}`} />
                      {DISPONIBILIDAD_LABELS[c.disponibilidad]}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((id) => id !== c.id))}
                  aria-label={`Quitar ${c.nombre}`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                key={`vacio-${i}`}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-dashed border-slate-300 text-xs text-slate-400"
              >
                <span className="w-10 h-10 rounded-lg border border-dashed border-slate-300 shrink-0" />
                {i === 0 ? 'Elige el color principal' : 'Opcional: un segundo color para detalles o un muro'}
              </div>
            );
          })}
          {elegidos.length === 2 && (
            <button
              type="button"
              onClick={() => onChange([value[1], value[0]])}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Intercambiar principal y secundario
            </button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Familia de color">
          {(['TODAS', ...(Object.keys(FAMILIA_LABELS) as FamiliaColor[])] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={familia === f}
              onClick={() => setFamilia(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                familia === f ? 'bg-[#092653] border-[#092653] text-white' : 'bg-white border-[#E7EAF0] text-slate-600 hover:border-slate-300'
              }`}
            >
              {f === 'TODAS' ? 'Todas' : FAMILIA_LABELS[f]}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-52">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value.slice(0, 40))}
            placeholder="Buscar color"
            aria-label="Buscar color"
            className="w-full bg-white border border-[#E7EAF0] rounded-full pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#1D4ED8]"
          />
        </div>
      </div>

      {aviso && (
        <p role="alert" className="cl-slide-down text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {aviso}
        </p>
      )}

      {/* ---------------------------------------------------- Paleta */}
      {error ? (
        <p className="text-sm text-rose-700">{error}</p>
      ) : colores === null ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando colores…
        </div>
      ) : visibles.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">No hay colores con ese filtro.</p>
      ) : (
        <div key={sacudir} className={`grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 ${sacudir ? 'cl-shake' : ''}`}>
          {visibles.map((c) => {
            const pos = value.indexOf(c.id);
            const elegido = pos >= 0;
            const lleno = !elegido && value.length >= MAX_COLORES_PROYECTO;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => alternar(c)}
                aria-pressed={elegido}
                title={c.disponibilidad === 'BAJO_PEDIDO' ? 'Bajo pedido: puede tardar unos días más en llegar' : DISPONIBILIDAD_LABELS[c.disponibilidad]}
                className={`group text-left rounded-2xl p-1.5 border-2 transition-all duration-200 cursor-pointer ${
                  elegido
                    ? 'border-[#08B6CC] bg-[#08B6CC]/6 shadow-md -translate-y-0.5'
                    : lleno
                      ? 'border-transparent opacity-45 hover:opacity-70'
                      : 'border-transparent hover:border-[#E7EAF0] hover:bg-white hover:-translate-y-0.5 hover:shadow-sm'
                }`}
              >
                <span
                  className="relative block aspect-[4/3] rounded-xl border border-black/10 shadow-[inset_0_-12px_18px_-12px_rgba(0,0,0,0.25)] transition-transform duration-200 group-hover:scale-[1.03]"
                  style={{ backgroundColor: c.hex }}
                >
                  {elegido && (
                    <span
                      key={pos}
                      className="cl-pop absolute top-1.5 right-1.5 min-w-6 h-6 px-1.5 rounded-full bg-[#092653] text-white text-[11px] font-extrabold flex items-center justify-center gap-0.5 shadow"
                    >
                      <Check className="w-3 h-3" strokeWidth={3} />
                      {pos + 1}
                    </span>
                  )}
                  <span
                    className={`absolute bottom-1.5 left-1.5 w-2 h-2 rounded-full ring-2 ring-white ${PUNTO_DISPONIBILIDAD[c.disponibilidad]}`}
                    aria-hidden="true"
                  />
                </span>
                <span className="block mt-1.5 px-0.5 text-xs font-semibold text-[#0B1F3A] leading-tight truncate">{c.nombre}</span>
                <span className="block px-0.5 text-[10px] text-slate-500 truncate">
                  {c.disponibilidad === 'DISPONIBLE' ? FAMILIA_LABELS[c.familia] : DISPONIBILIDAD_LABELS[c.disponibilidad]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        {(Object.keys(DISPONIBILIDAD_LABELS) as Disponibilidad[]).map((d) => (
          <span key={d} className="inline-flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${PUNTO_DISPONIBILIDAD[d]}`} />
            {DISPONIBILIDAD_LABELS[d]}
          </span>
        ))}
        <span className="sm:ml-auto">¿No lo tienes claro? Déjalo vacío y tu asesor te ayudará a elegir.</span>
      </p>
    </div>
  );
};
