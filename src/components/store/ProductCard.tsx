import React, { useState } from 'react';
import { Check, ShoppingBag } from 'lucide-react';
import type { Producto } from '../../types';
import { CATEGORIA_PRODUCTO_LABELS } from '../../types';
import { COLOR_EXPLORER_PALETTE, ExplorerColorItem } from '../../data/colorExplorerData';
import { cop } from '../../lib/format';
import { errorMessage } from '../../lib/api';
import { navigate } from '../../lib/router';
import { cartStore } from '../../stores/cart';
import { toast } from '../ui';
import { CATEGORY_ACCENT, ProductPackshot } from './ProductPackshot';

/** Color de la paleta que corresponde al tono del producto */
export function colorDeProducto(producto: Producto): ExplorerColorItem | null {
  if (!producto.color_hex) return null;
  const hex = producto.color_hex.toUpperCase();
  const match = COLOR_EXPLORER_PALETTE.find((c) => c.hex.toUpperCase() === hex);
  if (match) return match;
  return { ...COLOR_EXPLORER_PALETTE[0], id: `producto-${producto.id}`, name: producto.nombre, hex: producto.color_hex };
}

/** Foto del producto si existe; si no, la ilustración de su empaque */
export const ProductVisual: React.FC<{ producto: Producto; size?: 'card' | 'detail' }> = ({ producto, size = 'card' }) => {
  if (producto.imagen_url) {
    return <img src={producto.imagen_url} alt={producto.nombre} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" />;
  }
  const tono = producto.color_hex || CATEGORY_ACCENT[producto.categoria];
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: `radial-gradient(circle at 50% 38%, #FFFFFF 0%, #FAFAF7 45%, ${tono}26 100%)` }}
    >
      <ProductPackshot producto={producto} className={size === 'detail' ? 'w-[78%] h-[78%]' : 'w-[88%] h-[88%]'} />
    </div>
  );
};

export const ProductCard: React.FC<{ producto: Producto }> = ({ producto }) => {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const agotado = producto.stock <= 0;
  const descuento =
    producto.precio_anterior && producto.precio_anterior > producto.precio
      ? Math.round((1 - producto.precio / producto.precio_anterior) * 100)
      : 0;

  const agregar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setAdding(true);
    try {
      await cartStore.agregar(producto);
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <article
      data-reveal
      onClick={() => navigate('producto', producto.slug)}
      className="group h-full bg-white border border-[#E7EAF0] rounded-2xl overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300 transition-all cursor-pointer"
    >
      <div className="relative aspect-square bg-[#FAFAF7] overflow-hidden">
        <ProductVisual producto={producto} />
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {descuento > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-[#FFE34D] text-[#092653] text-[11px] font-extrabold">-{descuento}%</span>
          )}
          {agotado && <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-white text-[11px] font-semibold">Agotado</span>}
        </div>
        {producto.color_hex && (
          <span
            className="absolute top-2 right-2 w-5 h-5 rounded-full border-2 border-white shadow"
            style={{ backgroundColor: producto.color_hex }}
            title="Color del producto"
          />
        )}
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-[#08B6CC] line-clamp-1">
          {CATEGORIA_PRODUCTO_LABELS[producto.categoria]}
        </span>
        <h3 className="mt-1 font-display text-sm sm:text-[15px] font-bold text-[#092653] leading-snug line-clamp-2 min-h-[2.5em] group-hover:text-[#155EEF]">
          <a href={`#/tienda/${producto.slug}`} onClick={(e) => e.stopPropagation()}>
            {producto.nombre}
          </a>
        </h3>
        <p className="mt-1 text-xs text-slate-500 line-clamp-1">
          {producto.presentacion}
          {producto.acabado ? ` · ${producto.acabado}` : ''}
        </p>

        <div className="mt-auto pt-3">
          <p className="h-4 text-xs text-slate-400 line-through tabular-nums">{descuento > 0 ? cop(producto.precio_anterior) : ''}</p>
          <p className="text-base sm:text-lg font-extrabold text-[#092653] tabular-nums leading-tight">{cop(producto.precio)}</p>
          <button
            type="button"
            onClick={agregar}
            disabled={agotado || adding}
            aria-label={`Agregar ${producto.nombre} al carrito`}
            className={`mt-2.5 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              added ? 'bg-emerald-600 text-white' : 'bg-[#155EEF] hover:bg-[#092653] text-white'
            }`}
          >
            {added ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
            {agotado ? 'Agotado' : added ? 'Agregado' : 'Agregar'}
          </button>
        </div>
      </div>
    </article>
  );
};
