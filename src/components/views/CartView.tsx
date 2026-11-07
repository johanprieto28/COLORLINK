import React, { useState } from 'react';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { navigate } from '../../lib/router';
import { cop } from '../../lib/format';
import { errorMessage } from '../../lib/api';
import { authStore, useAuth } from '../../stores/auth';
import { cartStore, useCart } from '../../stores/cart';
import { ProductVisual } from '../store/ProductCard';
import { Button, Card, EmptyState, PageHeader, Spinner, toast } from '../ui';

export const CONTINUAR_A_PAGO_KEY = 'colorlink_continuar_a_pago';

export const CartView: React.FC = () => {
  const { user, status } = useAuth();
  const { cart, loading } = useCart();
  const [busy, setBusy] = useState<string | null>(null);

  if (status === 'cargando' || (loading && cart.items.length === 0)) return <Spinner label="Cargando tu carrito…" />;

  const irAPagar = () => {
    if (user) {
      navigate('checkout');
      return;
    }
    // Tras iniciar sesión, App continúa al pago (el carrito se pasa a la cuenta automáticamente)
    try {
      window.sessionStorage.setItem(CONTINUAR_A_PAGO_KEY, '1');
    } catch {
      // sin almacenamiento: el usuario vuelve a tocar "Pagar" después de ingresar
    }
    authStore.requestLogin('Inicia sesión o crea tu cuenta para finalizar la compra. Tu carrito se conserva.');
  };

  const cambiar = async (productoId: string, cantidad: number) => {
    setBusy(productoId);
    try {
      await cartStore.fijarCantidad(productoId, cantidad);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <EmptyState
          icon={<ShoppingBag className="w-6 h-6" />}
          title="Tu carrito está vacío"
          description="Explora pinturas, impermeabilizantes y herramientas para tu próximo proyecto."
          action={<Button onClick={() => navigate('tienda')}>Ir a la tienda</Button>}
        />
      </div>
    );
  }

  const faltaEnvioGratis = cart.envio_gratis_desde - cart.subtotal;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <PageHeader eyebrow="Tu compra" title="Carrito" />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
        <ul className="space-y-3">
          {cart.items.map(({ producto, cantidad }) => (
            <li key={producto.id}>
              <Card className="p-3 sm:p-4 flex gap-4">
                <a href={`#/tienda/${producto.slug}`} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[#FAFAF7] shrink-0">
                  <ProductVisual producto={producto} />
                </a>
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <a href={`#/tienda/${producto.slug}`} className="font-semibold text-[#092653] hover:text-[#155EEF] leading-snug">
                        {producto.nombre}
                      </a>
                      <p className="text-xs text-slate-500">{producto.presentacion}</p>
                    </div>
                    <p className="font-bold text-[#092653] tabular-nums whitespace-nowrap">{cop(producto.precio * cantidad)}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <div className="inline-flex items-center border border-[#E7EAF0] rounded-lg">
                      <button
                        type="button"
                        disabled={busy === producto.id}
                        onClick={() => cambiar(producto.id, cantidad - 1)}
                        aria-label="Disminuir"
                        className="p-2 hover:bg-[#FAFAF7] rounded-l-lg cursor-pointer disabled:opacity-50"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-9 text-center text-sm font-bold tabular-nums">{cantidad}</span>
                      <button
                        type="button"
                        disabled={busy === producto.id || cantidad >= producto.stock}
                        onClick={() => cambiar(producto.id, cantidad + 1)}
                        aria-label="Aumentar"
                        className="p-2 hover:bg-[#FAFAF7] rounded-r-lg cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={busy === producto.id}
                      onClick={() => cambiar(producto.id, 0)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Quitar
                    </button>
                  </div>
                  {producto.stock < cantidad && (
                    <p className="text-xs text-rose-600">Solo quedan {producto.stock} unidades. Ajusta la cantidad.</p>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>

        <Card className="p-5 space-y-4 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-extrabold text-[#092653]">Resumen</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="font-semibold tabular-nums">{cop(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Envío</dt>
              <dd className="font-semibold tabular-nums">{cart.costo_envio ? cop(cart.costo_envio) : 'Gratis'}</dd>
            </div>
            <div className="flex justify-between pt-3 border-t border-[#E7EAF0] text-base">
              <dt className="font-bold text-[#092653]">Total</dt>
              <dd className="font-extrabold text-[#092653] tabular-nums">{cop(cart.total)}</dd>
            </div>
            <p className="text-[11px] text-slate-500">Precios con IVA incluido.</p>
          </dl>
          {faltaEnvioGratis > 0 && (
            <p className="flex items-start gap-2 text-xs text-[#092653] bg-[#FFE34D]/30 rounded-xl p-3">
              <Truck className="w-4 h-4 shrink-0" />
              Te faltan {cop(faltaEnvioGratis)} para obtener envío gratis.
            </p>
          )}
          <Button
            size="lg"
            className="w-full"
            onClick={irAPagar}
            disabled={cart.items.some((it) => it.producto.stock < it.cantidad)}
          >
            {user ? 'Continuar con el pago' : 'Ingresar y pagar'} <ArrowRight className="w-4 h-4" />
          </Button>
          {!user && (
            <p className="text-xs text-slate-500 text-center">
              Puedes seguir agregando productos sin cuenta; te pediremos ingresar solo para pagar.
            </p>
          )}
          <Button variant="ghost" className="w-full" onClick={() => navigate('tienda')}>
            Seguir comprando
          </Button>
        </Card>
      </div>
    </div>
  );
};
