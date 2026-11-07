import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardList, Minus, Paintbrush, Plus, Ruler, ShoppingBag, Truck } from 'lucide-react';
import type { Producto } from '../../types';
import { CATEGORIA_PRODUCTO_LABELS } from '../../types';
import { useApi } from '../../lib/useApi';
import { navigate } from '../../lib/router';
import { cop } from '../../lib/format';
import { errorMessage } from '../../lib/api';
import { cartStore } from '../../stores/cart';
import { ProductCard, ProductVisual, colorDeProducto } from '../store/ProductCard';
import { Button, ErrorBox, Spinner, toast } from '../ui';
import type { WizardPrefill } from '../../App';

interface Props {
  slug: string;
  onStartProjectWithPrefill: (prefill?: WizardPrefill) => void;
}

export const ProductDetailView: React.FC<Props> = ({ slug, onStartProjectWithPrefill }) => {
  const { data, loading, error, reload } = useApi<{ producto: Producto; relacionados: Producto[] }>(
    `/productos/${encodeURIComponent(slug)}`
  );
  const [cantidad, setCantidad] = useState(1);
  const [adding, setAdding] = useState(false);
  const [area, setArea] = useState('');

  if (loading) return <Spinner label="Cargando producto…" />;
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-4">
        <ErrorBox message={error || 'Producto no encontrado.'} onRetry={reload} />
        <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('tienda')}>
          Volver a la tienda
        </Button>
      </div>
    );
  }

  const { producto, relacionados } = data;
  const agotado = producto.stock <= 0;
  const maximo = Math.max(1, Math.min(99, Math.floor(producto.stock)));
  const color = colorDeProducto(producto);
  const areaNum = Number(area);
  const unidadesSugeridas =
    producto.rendimiento_m2 && areaNum > 0 ? Math.ceil((areaNum * 2) / Number(producto.rendimiento_m2)) : null;

  const agregar = async () => {
    setAdding(true);
    try {
      await cartStore.agregar(producto, cantidad);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <nav aria-label="Ruta de navegación" className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
        <a href="#/tienda" className="hover:text-[#155EEF]">
          Tienda
        </a>
        <span>/</span>
        <a href={`#/tienda?categoria=${producto.categoria}`} className="hover:text-[#155EEF]">
          {CATEGORIA_PRODUCTO_LABELS[producto.categoria]}
        </a>
        <span>/</span>
        <span className="text-[#092653] font-medium">{producto.nombre}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-start">
        <div className="aspect-square max-w-xl w-full mx-auto bg-white border border-[#E7EAF0] rounded-3xl overflow-hidden lg:sticky lg:top-24">
          <ProductVisual producto={producto} size="detail" />
        </div>

        <div className="space-y-6 min-w-0">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#08B6CC]">
              {CATEGORIA_PRODUCTO_LABELS[producto.categoria]}
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#092653] tracking-tight">{producto.nombre}</h1>
            <p className="text-xs text-slate-500 font-mono">SKU {producto.sku}</p>
          </div>

          <div className="flex items-end gap-3">
            <span className="text-3xl font-extrabold text-[#092653] tabular-nums">{cop(producto.precio)}</span>
            {producto.precio_anterior && producto.precio_anterior > producto.precio && (
              <span className="text-base text-slate-400 line-through tabular-nums pb-1">{cop(producto.precio_anterior)}</span>
            )}
            <span className="text-xs text-slate-500 pb-1.5">IVA incluido</span>
          </div>

          <p className="text-[15px] text-[#15243B]/85 leading-relaxed">{producto.descripcion}</p>

          {!!producto.ficha?.beneficios?.length && (
            <ul className="space-y-1.5 text-sm text-[#15243B]/85">
              {producto.ficha.beneficios.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#08B6CC] shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          )}

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Spec icon={<ClipboardList className="w-4 h-4" />} label="Presentación" value={producto.presentacion} />
            {producto.acabado && <Spec icon={<Paintbrush className="w-4 h-4" />} label="Acabado" value={producto.acabado} />}
            {producto.rendimiento_m2 && (
              <Spec icon={<Ruler className="w-4 h-4" />} label="Rendimiento" value={`~${producto.rendimiento_m2} m² por mano`} />
            )}
            {color && (
              <div className="p-3 rounded-xl bg-[#FAFAF7] border border-[#E7EAF0] flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg border border-black/10 shrink-0" style={{ backgroundColor: color.hex }} />
                <div>
                  <dt className="text-[11px] text-slate-500">Color</dt>
                  <dd className="font-semibold text-[#092653]">{color.name}</dd>
                </div>
              </div>
            )}
          </dl>

          {producto.rendimiento_m2 && (
            <div className="p-4 rounded-2xl bg-[#FFE34D]/25 border border-[#FFE34D] space-y-2">
              <label htmlFor="calc-area" className="text-sm font-semibold text-[#092653] block">
                ¿Cuánto necesito? Calcula para 2 manos
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  id="calc-area"
                  type="number"
                  min={1}
                  inputMode="decimal"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="m² a pintar"
                  className="w-32 bg-white border border-[#E7EAF0] rounded-xl px-3 py-2 text-sm"
                />
                {unidadesSugeridas !== null && (
                  <span className="text-sm text-[#092653]">
                    Necesitas aprox. <strong>{unidadesSugeridas}</strong> {unidadesSugeridas === 1 ? 'unidad' : 'unidades'}.
                    {unidadesSugeridas !== cantidad && unidadesSugeridas <= maximo && (
                      <button type="button" onClick={() => setCantidad(unidadesSugeridas)} className="ml-2 font-semibold text-[#155EEF] underline cursor-pointer">
                        Usar esta cantidad
                      </button>
                    )}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="inline-flex items-center border border-[#E7EAF0] rounded-xl bg-white">
              <button
                type="button"
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                aria-label="Disminuir cantidad"
                className="p-3 text-[#092653] hover:bg-[#FAFAF7] rounded-l-xl cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center font-bold tabular-nums" aria-live="polite">
                {cantidad}
              </span>
              <button
                type="button"
                onClick={() => setCantidad((c) => Math.min(maximo, c + 1))}
                aria-label="Aumentar cantidad"
                className="p-3 text-[#092653] hover:bg-[#FAFAF7] rounded-r-xl cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <Button size="lg" onClick={agregar} loading={adding} disabled={agotado} icon={<ShoppingBag className="w-5 h-5" />}>
              {agotado ? 'Agotado' : 'Agregar al carrito'}
            </Button>
          </div>

          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              {agotado ? (
                <span className="text-rose-600">Sin unidades disponibles por ahora.</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {producto.stock <= 5 ? `¡Últimas ${producto.stock} unidades!` : 'Disponible para envío inmediato'}
                </>
              )}
            </li>
            <li className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#155EEF]" />
              Pago contra entrega o transferencia
            </li>
          </ul>

          <div className="p-4 rounded-2xl bg-white border border-[#E7EAF0] text-sm text-slate-600 flex flex-wrap items-center justify-between gap-3">
            <span>¿Tu superficie tiene humedad, fisuras o es un área grande?</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                onStartProjectWithPrefill({
                  colorRequerido: color?.name,
                  descripcionProblema: `Interés en ${producto.nombre}.`,
                })
              }
            >
              Pide asesoría técnica
            </Button>
          </div>
        </div>
      </div>

      {(!!producto.ficha?.especificaciones?.length || !!producto.ficha?.usos?.length) && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {!!producto.ficha?.especificaciones?.length && (
            <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 space-y-3">
              <h2 className="font-display text-lg font-extrabold text-[#092653]">Ficha técnica</h2>
              <dl className="divide-y divide-[#E7EAF0] text-sm">
                {producto.ficha.especificaciones.map((e) => (
                  <div key={e.etiqueta} className="py-2.5 grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-3">
                    <dt className="text-slate-500">{e.etiqueta}</dt>
                    <dd className="font-semibold text-[#092653]">{e.valor}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {!!producto.ficha?.usos?.length && (
            <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 space-y-3">
              <h2 className="font-display text-lg font-extrabold text-[#092653]">Recomendado para</h2>
              <ul className="flex flex-wrap gap-2">
                {producto.ficha.usos.map((u) => (
                  <li key={u} className="px-3 py-1.5 rounded-xl bg-[#FAFAF7] border border-[#E7EAF0] text-sm text-[#092653]">
                    {u}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {relacionados.length > 0 && (
        <section className="space-y-5">
          <h2 className="font-display text-xl font-extrabold text-[#092653]">También te puede servir</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {relacionados.map((p) => (
              <ProductCard key={p.id} producto={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const Spec: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="p-3 rounded-xl bg-[#FAFAF7] border border-[#E7EAF0] flex items-start gap-2.5">
    <span className="text-[#155EEF] mt-0.5">{icon}</span>
    <div>
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="font-semibold text-[#092653]">{value}</dd>
    </div>
  </div>
);
