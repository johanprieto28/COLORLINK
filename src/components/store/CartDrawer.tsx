import React, { useEffect } from 'react';
import { Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import { navigate } from '../../lib/router';
import { cop } from '../../lib/format';
import { errorMessage } from '../../lib/api';
import { cartStore, totalUnidades, useCart } from '../../stores/cart';
import { ProductVisual } from './ProductCard';
import { Button, toast, usePresence } from '../ui';

/** Mini-carrito lateral: se abre al agregar un producto o desde el ícono del carrito */
export const CartDrawer: React.FC = () => {
  const { cart, drawerOpen } = useCart();

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cartStore.closeDrawer();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const { mounted, state } = usePresence(drawerOpen, 260);
  if (!mounted) return null;

  const cambiar = async (id: string, cantidad: number) => {
    try {
      await cartStore.fijarCantidad(id, cantidad);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };
  const ir = (view: 'carrito' | 'tienda') => {
    cartStore.closeDrawer();
    navigate(view);
  };
  const falta = cart.envio_gratis_desde - cart.subtotal;
  const progreso = cart.envio_gratis_desde ? Math.min(100, (cart.subtotal / cart.envio_gratis_desde) * 100) : 0;

  return (
    <div
      data-state={state}
      className="cl-overlay fixed inset-0 z-[65] flex justify-end bg-[#092653]/40 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && cartStore.closeDrawer()}
    >
      <aside role="dialog" aria-modal="true" aria-label="Tu carrito" className="cl-drawer w-full max-w-[420px] h-full bg-white shadow-2xl flex flex-col">
        <header className="flex items-center justify-between px-5 py-4 border-b border-[#E7EAF0]">
          <h2 className="font-display text-lg font-extrabold text-[#092653] flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#155EEF]" />
            Tu carrito <span className="text-sm font-semibold text-slate-500">({totalUnidades(cart)})</span>
          </h2>
          <button type="button" onClick={() => cartStore.closeDrawer()} aria-label="Cerrar carrito" className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </header>

        {cart.items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingBag className="w-10 h-10 text-slate-300" />
            <p className="text-sm text-slate-600">Tu carrito está vacío.</p>
            <Button variant="secondary" onClick={() => ir('tienda')}>
              Ver productos
            </Button>
          </div>
        ) : (
          <>
            {cart.envio_gratis_desde > 0 && (
              <div className="px-5 py-3 bg-[#FAFAF7] border-b border-[#E7EAF0] space-y-1.5">
                <p className="text-xs text-[#092653] flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#155EEF]" />
                  {falta > 0 ? (
                    <span>
                      Te faltan <strong>{cop(falta)}</strong> para el envío gratis
                    </span>
                  ) : (
                    <strong>¡Tienes envío gratis!</strong>
                  )}
                </p>
                <div className="h-1.5 rounded-full bg-[#E7EAF0] overflow-hidden">
                  <div className="h-full bg-[#08B6CC] transition-all" style={{ width: `${progreso}%` }} />
                </div>
              </div>
            )}

            <ul className="flex-1 overflow-y-auto divide-y divide-[#E7EAF0] px-5">
              {cart.items.map(({ producto, cantidad }) => (
                <li key={producto.id} className="py-4 flex gap-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#FAFAF7] border border-[#E7EAF0] shrink-0">
                    <ProductVisual producto={producto} />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <p className="text-sm font-semibold text-[#092653] leading-snug line-clamp-2">{producto.nombre}</p>
                    <p className="text-xs text-slate-500">{producto.presentacion}</p>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <div className="inline-flex items-center border border-[#E7EAF0] rounded-lg">
                        <button type="button" onClick={() => cambiar(producto.id, cantidad - 1)} aria-label="Disminuir" className="p-1.5 hover:bg-[#FAFAF7] rounded-l-lg cursor-pointer">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold tabular-nums">{cantidad}</span>
                        <button
                          type="button"
                          disabled={cantidad >= producto.stock}
                          onClick={() => cambiar(producto.id, cantidad + 1)}
                          aria-label="Aumentar"
                          className="p-1.5 hover:bg-[#FAFAF7] rounded-r-lg cursor-pointer disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-[#092653] tabular-nums">{cop(producto.precio * cantidad)}</span>
                      <button type="button" onClick={() => cambiar(producto.id, 0)} aria-label={`Quitar ${producto.nombre}`} className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="border-t border-[#E7EAF0] px-5 py-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-extrabold text-[#092653] tabular-nums">{cop(cart.subtotal)}</span>
              </div>
              <Button size="lg" className="w-full" onClick={() => ir('carrito')}>
                Ver carrito y pagar
              </Button>
              <button type="button" onClick={() => cartStore.closeDrawer()} className="w-full text-sm font-semibold text-[#155EEF] hover:underline cursor-pointer">
                Seguir comprando
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
};
