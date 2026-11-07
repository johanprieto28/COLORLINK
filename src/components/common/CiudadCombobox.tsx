import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, MapPin } from 'lucide-react';
import type { Ciudad } from '../../types';
import { useCiudades } from '../../lib/useCiudades';
import { INPUT_CLASS } from '../ui';

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\bd\.?\s*c\.?$/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

interface CiudadComboboxProps {
  value: string;
  onChange: (nombre: string) => void;
  required?: boolean;
  name?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  /** Reemplaza el estilo del campo (p. ej. para igualar el asistente de proyectos) */
  inputClassName?: string;
}

/**
 * Selector de ciudad con búsqueda. Solo deja elegir ciudades del catálogo (public.ciudades):
 * si se escribe algo que no está en la lista, al salir del campo vuelve a la ciudad elegida.
 * Si el catálogo no está disponible, funciona como un campo de texto normal.
 */
export const CiudadCombobox: React.FC<CiudadComboboxProps> = ({
  value,
  onChange,
  required,
  name,
  disabled,
  autoFocus,
  placeholder = 'Busca tu ciudad',
  inputClassName = INPUT_CLASS,
}) => {
  const ciudades = useCiudades();
  const sinCatalogo = ciudades !== null && ciudades.length === 0;
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activo, setActivo] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) setQuery(value);
  }, [value, open]);

  const resultados = useMemo<Ciudad[]>(() => {
    if (!ciudades) return [];
    const q = normalizar(query);
    // Con la ciudad ya elegida en el campo se muestra toda la lista para poder cambiarla
    if (!q || query === value) return ciudades;
    return ciudades
      .filter((c) => normalizar(c.nombre).includes(q) || normalizar(c.departamento).includes(q))
      .sort((a, b) => Number(!normalizar(a.nombre).startsWith(q)) - Number(!normalizar(b.nombre).startsWith(q)));
  }, [ciudades, query, value]);

  useEffect(() => {
    setActivo(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activo}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activo, open]);

  const elegir = (c: Ciudad) => {
    onChange(c.nombre);
    setQuery(c.nombre);
    setOpen(false);
  };

  const alSalir = () => {
    setOpen(false);
    if (sinCatalogo) return onChange(query.trim());
    if (!ciudades) return;
    if (!query.trim()) return onChange('');
    const exacta = ciudades.find((c) => normalizar(c.nombre) === normalizar(query));
    if (exacta) elegir(exacta);
    else setQuery(value);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (sinCatalogo) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActivo((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivo((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (resultados[activo]) elegir(resultados[activo]);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
      setQuery(value);
    }
  };

  return (
    <div className="relative">
      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && resultados[activo] ? `${listId}-${activo}` : undefined}
        name={name}
        value={query}
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={ciudades === null ? 'Cargando ciudades…' : placeholder}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          if (sinCatalogo) onChange(e.target.value);
          else setOpen(true);
        }}
        onFocus={(e) => {
          e.target.select();
          if (!sinCatalogo) setOpen(true);
        }}
        onClick={() => !sinCatalogo && setOpen(true)}
        onBlur={alSalir}
        onKeyDown={onKeyDown}
        className={`${inputClassName} pl-10! pr-10!`}
      />
      {ciudades === null ? (
        <Loader2 className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin pointer-events-none" />
      ) : (
        <ChevronsUpDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      )}

      {open && ciudades && !sinCatalogo && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className="cl-dropdown absolute z-30 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white border border-[#E7EAF0] rounded-xl shadow-xl py-1.5"
          style={{ transformOrigin: 'top center' }}
        >
          {resultados.length === 0 ? (
            <li className="px-3.5 py-3 text-sm text-slate-500">
              No encontramos "{query.trim()}". Revisa la escritura o elige la ciudad más cercana.
            </li>
          ) : (
            resultados.map((c, i) => (
              <li
                key={c.nombre}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={c.nombre === value}
                // mousedown en lugar de click: así el campo no pierde el foco antes de elegir
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(c);
                }}
                onMouseEnter={() => setActivo(i)}
                className={`flex items-center justify-between gap-3 px-3.5 py-2 text-sm cursor-pointer ${
                  i === activo ? 'bg-[#155EEF]/8' : ''
                }`}
              >
                <span className="min-w-0">
                  <span className="font-semibold text-[#15243B]">{c.nombre}</span>
                  {c.departamento !== c.nombre && <span className="text-xs text-slate-500"> · {c.departamento}</span>}
                </span>
                {c.nombre === value && <Check className="w-4 h-4 text-[#08B6CC] shrink-0" />}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
