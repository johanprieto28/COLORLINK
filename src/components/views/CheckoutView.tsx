import React, { useRef, useState } from 'react';
import { ArrowLeft, Banknote, CheckCircle2, Landmark, ShieldCheck } from 'lucide-react';
import type { CheckoutData, MetodoPago, Pedido } from '../../types';
import { METODO_PAGO_LABELS } from '../../types';
import { api, errorMessage } from '../../lib/api';
import { navigate } from '../../lib/router';
import { cop } from '../../lib/format';
import { useAuth } from '../../stores/auth';
import { cartStore, useCart } from '../../stores/cart';
import { Button, Card, ErrorBox, Field, Input, PageHeader, Textarea } from '../ui';
import { CiudadCombobox } from '../common/CiudadCombobox';
import { filtrar, LIMITES, normalizar, validarCampo } from '../../data/reglasRegistro';

type CampoEntrega = 'nombre_contacto' | 'telefono' | 'correo' | 'ciudad' | 'direccion' | 'notas';

const METODOS: Array<{ id: MetodoPago; descripcion: string; icon: React.ReactNode }> = [
  { id: 'CONTRA_ENTREGA', descripcion: 'Pagas en efectivo o datáfono al recibir.', icon: <Banknote className="w-5 h-5" /> },
  { id: 'TRANSFERENCIA', descripcion: 'Te enviamos los datos bancarios por correo.', icon: <Landmark className="w-5 h-5" /> },
];

export const CheckoutView: React.FC = () => {
  const { user } = useAuth();
  const { cart } = useCart();
  const [form, setForm] = useState<CheckoutData>({
    nombre_contacto: user?.nombre_completo || '',
    telefono: filtrar.telefono(normalizar.telefono(user?.telefono)),
    correo: user?.email || '',
    ciudad: user?.ciudad || '',
    direccion: user?.direccion || '',
    notas: '',
    metodo_pago: 'CONTRA_ENTREGA',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);

  const [errores, setErrores] = useState<Partial<Record<CampoEntrega, string>>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const set = (patch: Partial<CheckoutData>) => {
    setForm((f) => ({ ...f, ...patch }));
    // Al corregir un campo se quita su aviso
    const corregidos = Object.keys(patch).filter((k) => errores[k as CampoEntrega]);
    if (corregidos.length) setErrores((e) => ({ ...e, ...Object.fromEntries(corregidos.map((k) => [k, undefined])) }));
  };

  /** Mismas reglas que el servidor (src/data/reglasRegistro.ts) */
  const validar = (): Partial<Record<CampoEntrega, string>> => {
    const r: Record<CampoEntrega, string | null> = {
      nombre_contacto: validarCampo.nombreCompleto(normalizar.texto(form.nombre_contacto)),
      telefono: validarCampo.telefono(form.telefono),
      correo: validarCampo.email(form.correo.trim()),
      ciudad: form.ciudad ? null : 'Selecciona la ciudad de la lista.',
      direccion: validarCampo.direccion(normalizar.texto(form.direccion)),
      notas: validarCampo.notas(form.notas || ''),
    };
    return Object.fromEntries(Object.entries(r).filter(([, v]) => v)) as Partial<Record<CampoEntrega, string>>;
  };

  if (pedido) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="font-display text-3xl font-extrabold text-[#092653]">¡Gracias por tu compra!</h1>
        <p className="text-slate-600">
          Registramos tu pedido <strong className="text-[#092653]">{pedido.codigo}</strong> por{' '}
          <strong className="text-[#092653]">{cop(pedido.total)}</strong>. Te enviamos la confirmación a {pedido.correo}.
        </p>
        {pedido.metodo_pago === 'TRANSFERENCIA' && (
          <p className="text-sm text-slate-600 bg-[#FAFAF7] border border-[#E7EAF0] rounded-2xl p-4">
            Recibirás los datos bancarios por correo. Despachamos el pedido cuando confirmemos el pago.
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => navigate('cuenta', 'pedidos')}>Ver mis pedidos</Button>
          <Button variant="secondary" onClick={() => navigate('tienda')}>
            Seguir comprando
          </Button>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-slate-600">No tienes productos en el carrito.</p>
        <Button onClick={() => navigate('tienda')}>Ir a la tienda</Button>
      </div>
    );
  }

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    const encontrados = validar();
    setErrores(encontrados);
    const primero = Object.keys(encontrados)[0];
    if (primero) {
      formRef.current?.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus();
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const creado = await api.post<Pedido>('/pedidos', form);
      cartStore.vaciarLocal();
      setPedido(creado);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(errorMessage(err));
      void cartStore.refresh();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <button
        type="button"
        onClick={() => navigate('carrito')}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#092653] cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al carrito
      </button>
      <PageHeader eyebrow="Finalizar compra" title="Datos de entrega y pago" />

      <form ref={formRef} onSubmit={confirmar} noValidate className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6 space-y-4">
            <h2 className="font-display font-bold text-[#092653]">¿Quién recibe?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre completo" required error={errores.nombre_contacto} hint="Nombre y apellido, solo letras.">
                <Input
                  name="nombre_contacto"
                  value={form.nombre_contacto}
                  onChange={(e) => set({ nombre_contacto: filtrar.nombre(e.target.value, LIMITES.nombreCompleto.max) })}
                  maxLength={LIMITES.nombreCompleto.max}
                  autoComplete="name"
                />
              </Field>
              <Field label="Celular" required error={errores.telefono} hint={`${LIMITES.telefono.largo} números, sin espacios.`}>
                <Input
                  name="telefono"
                  value={form.telefono}
                  onChange={(e) => set({ telefono: filtrar.telefono(e.target.value) })}
                  type="tel"
                  inputMode="numeric"
                  maxLength={LIMITES.telefono.largo}
                  autoComplete="tel-national"
                  placeholder="3001234567"
                />
              </Field>
              <Field label="Correo para la confirmación" required error={errores.correo} className="sm:col-span-2">
                <Input
                  name="correo"
                  value={form.correo}
                  onChange={(e) => set({ correo: filtrar.email(e.target.value) })}
                  type="email"
                  maxLength={LIMITES.email.max}
                  autoComplete="email"
                />
              </Field>
            </div>
          </Card>

          <Card className="p-5 sm:p-6 space-y-4">
            <h2 className="font-display font-bold text-[#092653]">Dirección de entrega</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Ciudad" required error={errores.ciudad}>
                <CiudadCombobox name="ciudad" value={form.ciudad} onChange={(ciudad) => set({ ciudad })} />
              </Field>
              <Field label="Dirección" required error={errores.direccion} className="sm:col-span-2">
                <Input
                  name="direccion"
                  value={form.direccion}
                  onChange={(e) => set({ direccion: filtrar.direccion(e.target.value) })}
                  maxLength={LIMITES.direccion.max}
                  placeholder="Ej. Calle 10 # 43E-28, apto 301"
                  autoComplete="street-address"
                />
              </Field>
              <Field
                label="Indicaciones para la entrega"
                error={errores.notas}
                hint={`Opcional · ${(form.notas || '').length}/${LIMITES.notas.max}`}
                className="sm:col-span-3"
              >
                <Textarea
                  name="notas"
                  rows={2}
                  value={form.notas}
                  onChange={(e) => set({ notas: filtrar.notas(e.target.value) })}
                  maxLength={LIMITES.notas.max}
                  placeholder="Horario, portería, referencias"
                />
              </Field>
            </div>
          </Card>

          <Card className="p-5 sm:p-6 space-y-4">
            <h2 className="font-display font-bold text-[#092653]">Método de pago</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {METODOS.map((m) => (
                <label
                  key={m.id}
                  className={`p-4 rounded-2xl border-2 flex gap-3 cursor-pointer transition-colors ${
                    form.metodo_pago === m.id ? 'border-[#155EEF] bg-[#155EEF]/5' : 'border-[#E7EAF0] hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="metodo_pago"
                    value={m.id}
                    checked={form.metodo_pago === m.id}
                    onChange={() => set({ metodo_pago: m.id })}
                    className="sr-only"
                  />
                  <span className="text-[#155EEF]">{m.icon}</span>
                  <span>
                    <span className="block font-semibold text-[#092653]">{METODO_PAGO_LABELS[m.id]}</span>
                    <span className="block text-xs text-slate-500">{m.descripcion}</span>
                  </span>
                </label>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-5 space-y-4 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-extrabold text-[#092653]">Tu pedido</h2>
          <ul className="space-y-2 text-sm max-h-60 overflow-y-auto">
            {cart.items.map(({ producto, cantidad }) => (
              <li key={producto.id} className="flex justify-between gap-3">
                <span className="text-slate-700">
                  {producto.nombre} <span className="text-slate-400">× {cantidad}</span>
                </span>
                <span className="font-semibold tabular-nums">{cop(producto.precio * cantidad)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 text-sm pt-3 border-t border-[#E7EAF0]">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="tabular-nums">{cop(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Envío</dt>
              <dd className="tabular-nums">{cart.costo_envio ? cop(cart.costo_envio) : 'Gratis'}</dd>
            </div>
            <div className="flex justify-between text-base pt-2 border-t border-[#E7EAF0]">
              <dt className="font-bold text-[#092653]">Total</dt>
              <dd className="font-extrabold text-[#092653] tabular-nums">{cop(cart.total)}</dd>
            </div>
          </dl>
          {error && <ErrorBox message={error} />}
          <Button type="submit" size="lg" className="w-full" loading={enviando}>
            Confirmar pedido
          </Button>
          <p className="flex items-start gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 shrink-0 text-[#08B6CC]" />
            Al confirmar autorizas el uso de estos datos para gestionar la entrega de tu pedido.
          </p>
        </Card>
      </form>
    </div>
  );
};
