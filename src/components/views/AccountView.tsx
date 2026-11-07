import React, { useEffect, useRef, useState } from 'react';
import { Heart, KeyRound, Package, User } from 'lucide-react';
import type { EstadoPedido, Pedido, UserProfile } from '../../types';
import { ESTADO_PEDIDO_LABELS, METODO_PAGO_LABELS, ROLE_LABELS } from '../../types';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { navigate } from '../../lib/router';
import { cop, fecha } from '../../lib/format';
import { authStore, useAuth } from '../../stores/auth';
import { FAVORITES_UPDATED_EVENT, getColorById, getStoredFavoriteColorIds } from '../../data/colorExplorerData';
import { Badge } from '../common/Badge';
import { CiudadCombobox } from '../common/CiudadCombobox';
import { Button, Card, EmptyState, ErrorBox, Field, Input, PageHeader, Select, Spinner, toast } from '../ui';
import {
  ayudaDocumento,
  DOCUMENTOS,
  filtrar,
  LIMITES,
  normalizar,
  validarCampo,
  type TipoDocumento,
  type TipoDocumentoPersona,
} from '../../data/reglasRegistro';

const TABS = [
  { id: 'perfil', label: 'Mis datos', icon: <User className="w-4 h-4" /> },
  { id: 'pedidos', label: 'Mis pedidos', icon: <Package className="w-4 h-4" /> },
  { id: 'favoritos', label: 'Colores favoritos', icon: <Heart className="w-4 h-4" /> },
  { id: 'seguridad', label: 'Contraseña', icon: <KeyRound className="w-4 h-4" /> },
];

export const AccountView: React.FC<{ tab: string }> = ({ tab }) => {
  const active = TABS.some((t) => t.id === tab) ? tab : 'perfil';
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <PageHeader eyebrow="Mi cuenta" title="Tu cuenta COLORLINK" />
      <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-[#E7EAF0]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => navigate('cuenta', t.id)}
            aria-current={active === t.id ? 'page' : undefined}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
              active === t.id ? 'border-[#155EEF] text-[#155EEF]' : 'border-transparent text-slate-600 hover:text-[#092653]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      {active === 'perfil' && <ProfileTab />}
      {active === 'pedidos' && <OrdersTab />}
      {active === 'favoritos' && <FavoritesTab />}
      {active === 'seguridad' && <SecurityTab />}
    </div>
  );
};

type CampoPerfil = 'nombre_completo' | 'telefono' | 'empresa' | 'documento' | 'direccion';

const ProfileTab: React.FC = () => {
  const { user } = useAuth();
  const tipoInicial = (user?.tipo_documento || 'CC') as TipoDocumento;
  const [form, setForm] = useState({
    nombre_completo: user?.nombre_completo || '',
    telefono: filtrar.telefono(normalizar.telefono(user?.telefono)),
    empresa: user?.empresa || '',
    tipo_documento: tipoInicial,
    documento: user?.documento ? normalizar.documento(user.documento, tipoInicial) : '',
    ciudad: user?.ciudad || '',
    direccion: user?.direccion || '',
  });
  const [errores, setErrores] = useState<Partial<Record<CampoPerfil, string>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  if (!user) return null;

  const cambiar = (campo: CampoPerfil, valor: string) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    // Al corregir un campo se quita su aviso
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  const validar = (): Partial<Record<CampoPerfil, string>> => {
    const r: Partial<Record<CampoPerfil, string | null>> = {
      nombre_completo: validarCampo.nombreCompleto(normalizar.texto(form.nombre_completo)),
      telefono: form.telefono ? validarCampo.telefono(form.telefono) : null,
      empresa: form.empresa.trim() ? validarCampo.razonSocial(normalizar.texto(form.empresa)) : null,
      documento: form.documento ? validarCampo.documento(form.documento, form.tipo_documento) : null,
      direccion: form.direccion.trim() ? validarCampo.direccion(normalizar.texto(form.direccion)) : null,
    };
    return Object.fromEntries(Object.entries(r).filter(([, v]) => v)) as Partial<Record<CampoPerfil, string>>;
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const encontrados = validar();
    setErrores(encontrados);
    const primero = Object.keys(encontrados)[0];
    if (primero) {
      formRef.current?.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const perfil = await api.patch<UserProfile>('/cuenta', form);
      authStore.setUser(perfil);
      toast('Tus datos se guardaron correctamente.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 sm:p-7">
      <form ref={formRef} onSubmit={guardar} noValidate className="space-y-5">
        <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-[#E7EAF0]">
          <span className="w-12 h-12 rounded-2xl bg-[#092653] text-white flex items-center justify-center text-lg font-bold">
            {(user.nombre_completo || user.email).charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="font-bold text-[#092653]">{user.email}</p>
            <p className="text-xs text-slate-500">
              {ROLE_LABELS[user.rol]} · cliente desde {fecha(user.created_at)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre completo" required error={errores.nombre_completo} hint="Nombres y apellidos, solo letras.">
            <Input
              name="nombre_completo"
              value={form.nombre_completo}
              onChange={(e) => cambiar('nombre_completo', filtrar.nombre(e.target.value, LIMITES.nombreCompleto.max))}
              maxLength={LIMITES.nombreCompleto.max}
              autoComplete="name"
            />
          </Field>
          <Field label="Celular" error={errores.telefono} hint={`${LIMITES.telefono.largo} números, sin espacios.`}>
            <Input
              name="telefono"
              value={form.telefono}
              onChange={(e) => cambiar('telefono', filtrar.telefono(e.target.value))}
              type="tel"
              inputMode="numeric"
              maxLength={LIMITES.telefono.largo}
              autoComplete="tel-national"
              placeholder="3001234567"
            />
          </Field>
          <Field label="Empresa u organización" error={errores.empresa} hint="Opcional.">
            <Input
              name="empresa"
              value={form.empresa}
              onChange={(e) => cambiar('empresa', filtrar.razonSocial(e.target.value))}
              maxLength={LIMITES.razonSocial.max}
              autoComplete="organization"
            />
          </Field>
          <div className="grid grid-cols-[7.5rem_1fr] gap-3">
            <Field label="Documento">
              <Select
                value={form.tipo_documento}
                onChange={(e) => {
                  const tipo = e.target.value as TipoDocumento;
                  setForm((f) => ({
                    ...f,
                    tipo_documento: tipo,
                    documento: tipo === 'NIT' ? filtrar.nit(f.documento) : filtrar.documento(f.documento, tipo),
                  }));
                  setErrores((er) => ({ ...er, documento: undefined }));
                }}
              >
                {(Object.keys(DOCUMENTOS) as TipoDocumentoPersona[]).map((t) => (
                  <option key={t} value={t}>
                    {DOCUMENTOS[t].label}
                  </option>
                ))}
                <option value="NIT">NIT</option>
              </Select>
            </Field>
            <Field label="Número" error={errores.documento} hint={ayudaDocumento(form.tipo_documento)}>
              <Input
                name="documento"
                value={form.documento}
                onChange={(e) =>
                  cambiar(
                    'documento',
                    form.tipo_documento === 'NIT' ? filtrar.nit(e.target.value) : filtrar.documento(e.target.value, form.tipo_documento)
                  )
                }
                maxLength={form.tipo_documento === 'NIT' ? LIMITES.nit.largo + 2 : DOCUMENTOS[form.tipo_documento].max}
                inputMode={form.tipo_documento === 'PA' ? 'text' : 'numeric'}
              />
            </Field>
          </div>
          <Field label="Ciudad">
            <CiudadCombobox value={form.ciudad} onChange={(ciudad) => setForm((f) => ({ ...f, ciudad }))} />
          </Field>
          <Field label="Dirección de entrega predeterminada" error={errores.direccion} hint="Ej. Calle 10 # 43E-28, apto 301.">
            <Input
              name="direccion"
              value={form.direccion}
              onChange={(e) => cambiar('direccion', filtrar.direccion(e.target.value))}
              maxLength={LIMITES.direccion.max}
              autoComplete="street-address"
            />
          </Field>
        </div>
        {error && <ErrorBox message={error} />}
        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Card>
  );
};

const ESTADO_VARIANT: Record<EstadoPedido, 'cyan' | 'primary' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  PENDIENTE: 'warning',
  CONFIRMADO: 'cyan',
  PREPARANDO: 'primary',
  ENVIADO: 'primary',
  ENTREGADO: 'success',
  CANCELADO: 'neutral',
};

export const PedidoEstadoBadge: React.FC<{ estado: EstadoPedido }> = ({ estado }) => (
  <Badge variant={ESTADO_VARIANT[estado]}>{ESTADO_PEDIDO_LABELS[estado]}</Badge>
);

const OrdersTab: React.FC = () => {
  const { data: pedidos, loading, error, reload, setData } = useApi<Pedido[]>('/pedidos');
  const [cancelando, setCancelando] = useState<string | null>(null);

  const cancelar = async (pedido: Pedido) => {
    if (!window.confirm(`¿Cancelar el pedido ${pedido.codigo}?`)) return;
    setCancelando(pedido.id);
    try {
      const actualizado = await api.post<Pedido>(`/pedidos/${pedido.id}/cancelar`);
      setData((list) => list?.map((p) => (p.id === actualizado.id ? actualizado : p)) || null);
      toast('Pedido cancelado.');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setCancelando(null);
    }
  };

  if (loading) return <Spinner label="Cargando tus pedidos…" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!pedidos?.length) {
    return (
      <EmptyState
        icon={<Package className="w-6 h-6" />}
        title="Aún no tienes pedidos"
        description="Cuando compres en la tienda verás aquí el estado de cada envío."
        action={<Button onClick={() => navigate('tienda')}>Ir a la tienda</Button>}
      />
    );
  }

  return (
    <ul className="space-y-4">
      {pedidos.map((p) => (
        <li key={p.id}>
          <Card className="p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-bold text-[#092653]">{p.codigo}</p>
                <p className="text-xs text-slate-500">
                  {fecha(p.created_at, true)} · {METODO_PAGO_LABELS[p.metodo_pago]}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <PedidoEstadoBadge estado={p.estado} />
                <span className="font-extrabold text-[#092653] tabular-nums">{cop(p.total)}</span>
              </div>
            </div>
            <ul className="text-sm text-slate-700 space-y-1">
              {p.items.map((it) => (
                <li key={it.id} className="flex justify-between gap-3">
                  <span>
                    {it.nombre} <span className="text-slate-400">× {it.cantidad}</span>
                  </span>
                  <span className="tabular-nums">{cop(it.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E7EAF0] text-xs text-slate-500">
              <span className="space-y-0.5">
                <span className="block">
                  Entrega: {p.direccion}, {p.ciudad}
                </span>
                {p.transportadora && p.numero_guia && (
                  <span className="block text-[#092653]">
                    Enviado con <strong>{p.transportadora}</strong> · guía{' '}
                    <strong className="font-mono tracking-wide">{p.numero_guia}</strong>
                  </span>
                )}
              </span>
              {['PENDIENTE', 'CONFIRMADO', 'PREPARANDO'].includes(p.estado) && (
                <Button variant="danger" size="sm" loading={cancelando === p.id} onClick={() => cancelar(p)}>
                  Cancelar pedido
                </Button>
              )}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
};

const FavoritesTab: React.FC = () => {
  const [ids, setIds] = useState<string[]>(() => getStoredFavoriteColorIds());
  useEffect(() => {
    const sync = () => setIds(getStoredFavoriteColorIds());
    window.addEventListener(FAVORITES_UPDATED_EVENT, sync);
    return () => window.removeEventListener(FAVORITES_UPDATED_EVENT, sync);
  }, []);

  if (ids.length === 0) {
    return (
      <EmptyState
        icon={<Heart className="w-6 h-6" />}
        title="No tienes colores guardados"
        description="Marca con el corazón los colores que te gusten en el explorador y aparecerán aquí."
        action={<Button onClick={() => navigate('inicio')}>Explorar colores</Button>}
      />
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {ids.map((id) => {
        const c = getColorById(id);
        return (
          <Card key={id} className="overflow-hidden">
            <div className="h-24" style={{ backgroundColor: c.hex }} />
            <div className="p-3 space-y-2">
              <p className="font-semibold text-[#092653] text-sm">{c.name}</p>
              <p className="text-xs text-slate-500 font-mono">{c.hex}</p>
              <button
                type="button"
                onClick={() => navigate('tienda', undefined, { q: c.name })}
                className="text-xs font-semibold text-[#155EEF] hover:underline cursor-pointer"
              >
                Buscar pintura en este color
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

const SecurityTab: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setSaving(true);
    try {
      await authStore.updatePassword(password);
      setPassword('');
      setConfirm('');
      toast('Tu contraseña se actualizó.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 sm:p-7 max-w-lg">
      <form onSubmit={guardar} className="space-y-4">
        <Field label="Nueva contraseña" hint="Mínimo 8 caracteres.">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
        </Field>
        <Field label="Confirmar contraseña">
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
        </Field>
        {error && <ErrorBox message={error} />}
        <Button type="submit" loading={saving}>
          Actualizar contraseña
        </Button>
      </form>
    </Card>
  );
};
