import React, { useEffect, useState } from 'react';
import { PackageSearch, Search, SlidersHorizontal, Truck, X } from 'lucide-react';
import type { CategoriaProducto, Producto } from '../../types';
import { CATEGORIA_PRODUCTO_LABELS } from '../../types';
import { useApi } from '../../lib/useApi';
import { navigate } from '../../lib/router';
import { cop } from '../../lib/format';
import { ProductCard } from '../store/ProductCard';
import { Button, EmptyState, ErrorBox, PageHeader, Select, Spinner } from '../ui';

interface StoreViewProps {
  categoria?: string;
  q?: string;
  orden?: string;
}

const CATEGORIAS = Object.entries(CATEGORIA_PRODUCTO_LABELS) as Array<[CategoriaProducto, string]>;

export const StoreView: React.FC<StoreViewProps> = ({ categoria, q, orden }) => {
  const categoriaValida = categoria && categoria in CATEGORIA_PRODUCTO_LABELS ? (categoria as CategoriaProducto) : undefined;
  const params = new URLSearchParams();
  if (categoriaValida) params.set('categoria', categoriaValida);
  if (q) params.set('q', q);
  if (orden) params.set('orden', orden);
  const { data: productos, loading, error, reload } = useApi<Producto[]>(`/productos?${params.toString()}`);
  const { data: config } = useApi<{ envioGratisDesde: number }>('/config');

  const [busqueda, setBusqueda] = useState(q || '');
  useEffect(() => setBusqueda(q || ''), [q]);

  const update = (patch: Record<string, string | undefined>) =>
    navigate('tienda', undefined, { categoria: categoriaValida, q, orden, ...patch });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <PageHeader
        eyebrow="Tienda COLORLINK"
        title={categoriaValida ? CATEGORIA_PRODUCTO_LABELS[categoriaValida] : 'Todo para transformar tus espacios'}
        description="Pinturas, impermeabilizantes, preparación y herramientas con precios con IVA incluido."
      />

      {config && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#155EEF]/6 border border-[#155EEF]/15 text-sm text-[#092653]">
          <Truck className="w-5 h-5 text-[#155EEF] shrink-0" />
          <span>
            Envío <strong>gratis</strong> en compras desde <strong>{cop(config.envioGratisDesde)}</strong>. Paga contra
            entrega o por transferencia.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-8">
        {/* Filtros */}
        <aside className="space-y-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update({ q: busqueda.trim() || undefined });
            }}
            className="relative"
            role="search"
          >
            <label htmlFor="buscar-tienda" className="sr-only">
              Buscar en la tienda
            </label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="buscar-tienda"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto"
              className="w-full bg-white border border-[#E7EAF0] rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#155EEF]"
            />
          </form>

          <nav aria-label="Filtrar por categoría" className="flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
            <CategoryButton active={!categoriaValida} onClick={() => update({ categoria: undefined })}>
              Todas las categorías
            </CategoryButton>
            {CATEGORIAS.map(([key, label]) => (
              <CategoryButton key={key} active={categoriaValida === key} onClick={() => update({ categoria: key })}>
                {label}
              </CategoryButton>
            ))}
          </nav>
        </aside>

        <section className="space-y-5 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              {productos && !loading && (
                <span>
                  {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
                </span>
              )}
              {q && (
                <button
                  type="button"
                  onClick={() => update({ q: undefined })}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#155EEF]/8 text-[#155EEF] text-xs font-semibold cursor-pointer"
                >
                  “{q}” <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="sr-only sm:not-sr-only">Ordenar</span>
              <Select value={orden || ''} onChange={(e) => update({ orden: e.target.value || undefined })} className="!w-auto !py-2">
                <option value="">Destacados</option>
                <option value="precio_asc">Menor precio</option>
                <option value="precio_desc">Mayor precio</option>
              </Select>
            </label>
          </div>

          {loading ? (
            <Spinner label="Cargando productos…" />
          ) : error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : !productos?.length ? (
            <EmptyState
              icon={<PackageSearch className="w-6 h-6" />}
              title="No encontramos productos con esos filtros"
              description="Prueba con otra palabra o revisa todas las categorías. También puedes pedir orientación a COLORLINK IA."
              action={
                <Button variant="secondary" onClick={() => navigate('tienda')}>
                  Ver todo el catálogo
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {productos.map((p) => (
                <ProductCard key={p.id} producto={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const CategoryButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`px-3.5 py-2 rounded-xl text-sm text-left whitespace-nowrap transition-colors cursor-pointer ${
      active ? 'bg-[#092653] text-white font-semibold' : 'bg-white lg:bg-transparent border border-[#E7EAF0] lg:border-transparent text-[#15243B] hover:bg-white hover:border-[#E7EAF0]'
    }`}
  >
    {children}
  </button>
);
