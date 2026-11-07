import React, { useEffect, useState } from 'react';
import { Briefcase, ChevronDown, ChevronUp, History, MessageSquarePlus, Search, ShoppingCart, Truck, X } from 'lucide-react';
import type { Cliente, EstadoPedido, Pedido, PedidoEvento } from '../../../types';
import { ESTADO_PEDIDO_LABELS, METODO_PAGO_LABELS, TRANSPORTADORAS } from '../../../types';
import { api, errorMessage } from '../../../lib/api';
import { useApi } from '../../../lib/useApi';
import { cop, fecha } from '../../../lib/format';
import { PedidoEstadoBadge } from '../AccountView';
import { Button, Card, EmptyState, ErrorBox, Field, Input, Modal, Select, Spinner, Textarea, toast } from '../../ui';

const SIGUIENTE: Partial<Record<EstadoPedido, { estado: EstadoPedido; label: string }>> = {
  PENDIENTE: { estado: 'CONFIRMADO', label: 'Confirmar' },
  CONFIRMADO: { estado: 'PREPARANDO', label: 'Pasar a preparación' },
  PREPARANDO: { estado: 'ENVIADO', label: 'Registrar envío' },
  ENVIADO: { estado: 'ENTREGADO', label: 'Marcar como entregado' },
};

const ETIQUETA_ROL: Record<string, string> = {
  cliente: 'Cliente',
  tecnico: 'Técnico',
  comercial: 'Comercial',
  operaciones: 'Operaciones',
  administrador: 'Administrador',
};

const MAX_NOTA = 500;

/** Acción que necesita datos antes de aplicarse (envío o cancelación) */
type AccionPedido = { tipo: 'enviar' | 'cancelar'; pedido: Pedido } | null;

/** Historial del pedido y notas internas del equipo */
const HistorialPedido: React.FC<{ pedido: Pedido; version: string }> = ({ pedido, version }) => {
  const { data: eventos, setData, loading, error, reload } = useApi<PedidoEvento[]>(`/panel/pedidos/${pedido.id}/eventos?v=${version}`);
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);

  const agregarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nota.trim()) return;
    setGuardando(true);
    try {
      const evento = await api.post<PedidoEvento>(`/panel/pedidos/${pedido.id}/notas`, { nota: nota.trim() });
      setData((lista) => [evento, ...(lista || [])]);
      setNota('');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setGuardando(false);
    }
  };

  const describir = (ev: PedidoEvento) => {
    if (ev.tipo === 'NOTA') return 'Nota interna';
    if (ev.tipo === 'PAGO') return `Pago: ${ev.estado_anterior ?? '—'} → ${ev.estado_nuevo}`;
    const nuevo = ESTADO_PEDIDO_LABELS[ev.estado_nuevo as EstadoPedido] ?? ev.estado_nuevo;
    return ev.estado_anterior ? `${ESTADO_PEDIDO_LABELS[ev.estado_anterior as EstadoPedido] ?? ev.estado_anterior} → ${nuevo}` : nuevo;
  };

  return (
    <div className="space-y-3">
      <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#08B6CC]">
        <History className="w-3.5 h-3.5" /> Historial
      </h4>

      <form onSubmit={agregarNota} className="space-y-1.5">
        <Textarea
          rows={2}
          value={nota}
          onChange={(e) => setNota(e.target.value.slice(0, MAX_NOTA))}
          maxLength={MAX_NOTA}
          placeholder="Nota interna para el equipo (el cliente no la ve)"
          aria-label="Nota interna"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400 tabular-nums">
            {nota.length}/{MAX_NOTA}
          </span>
          <Button type="submit" size="sm" variant="secondary" loading={guardando} disabled={!nota.trim()} icon={<MessageSquarePlus className="w-3.5 h-3.5" />}>
            Agregar nota
          </Button>
        </div>
      </form>

      {loading ? (
        <Spinner className="py-6!" />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !eventos?.length ? (
        <p className="text-xs text-slate-500">Sin movimientos registrados.</p>
      ) : (
        <ol className="relative border-l-2 border-[#E7EAF0] ml-1.5 space-y-3">
          {eventos.map((ev) => (
            <li key={ev.id} className="pl-4 relative">
              <span
                className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2 border-white ${
                  ev.tipo === 'NOTA' ? 'bg-[#FFE34D]' : ev.tipo === 'PAGO' ? 'bg-emerald-500' : ev.tipo === 'ENVIO' ? 'bg-[#08B6CC]' : 'bg-[#155EEF]'
                }`}
              />
              <p className="text-xs font-semibold text-[#092653]">{describir(ev)}</p>
              {ev.nota && <p className={`text-xs mt-0.5 ${ev.tipo === 'NOTA' ? 'text-[#15243B] bg-[#FFE34D]/15 rounded-lg px-2 py-1' : 'text-slate-600'}`}>{ev.nota}</p>}
              <p className="text-[11px] text-slate-400 mt-0.5">
                {fecha(ev.created_at, true)}
                {ev.usuario_nombre && ` · ${ev.usuario_nombre}`}
                {ev.usuario_rol && ` (${ETIQUETA_ROL[ev.usuario_rol] ?? ev.usuario_rol})`}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

/** Ventana para registrar el envío (transportadora y guía) o confirmar la cancelación con su motivo */
const AccionPedidoModal: React.FC<{
  accion: AccionPedido;
  onClose: () => void;
  onConfirm: (cambios: { estado: EstadoPedido; transportadora?: string; numero_guia?: string; nota?: string }) => Promise<void>;
}> = ({ accion, onClose, onConfirm }) => {
  const [transportadora, setTransportadora] = useState('');
  const [guia, setGuia] = useState('');
  const [nota, setNota] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setTransportadora('');
    setGuia('');
    setNota('');
    setErrorLocal(null);
  }, [accion]);

  const enviar = accion?.tipo === 'enviar';

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviar) {
      if (!transportadora) return setErrorLocal('Elige la transportadora.');
      if (!/^[A-Z0-9-]{4,30}$/.test(guia)) return setErrorLocal('El número de guía debe tener entre 4 y 30 letras, números o guiones.');
    }
    setEnviando(true);
    try {
      await onConfirm(
        enviar
          ? { estado: 'ENVIADO', transportadora, numero_guia: guia, nota: nota.trim() || undefined }
          : { estado: 'CANCELADO', nota: nota.trim() || undefined }
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      open={Boolean(accion)}
      onClose={onClose}
      title={accion ? (enviar ? `Registrar envío · ${accion.pedido.codigo}` : `Cancelar pedido ${accion.pedido.codigo}`) : ''}
    >
      {accion && (
        <form onSubmit={confirmar} noValidate className="space-y-4">
          {enviar ? (
            <>
              <p className="text-sm text-slate-600">
                El cliente recibirá un correo con la transportadora y el número de guía para rastrear su pedido.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Transportadora" required>
                  <Select value={transportadora} onChange={(e) => setTransportadora(e.target.value)} autoFocus>
                    <option value="">Selecciona…</option>
                    {TRANSPORTADORAS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Número de guía" required hint="Letras, números o guiones.">
                  <Input
                    value={guia}
                    onChange={(e) => setGuia(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 30))}
                    maxLength={30}
                    className="font-mono tracking-wide"
                    placeholder="Ej. 2024567890"
                  />
                </Field>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">
              Se devolverán al inventario las unidades del pedido y el cliente recibirá un correo avisando la cancelación.
            </p>
          )}
          <Field label={enviar ? 'Nota interna' : 'Motivo de la cancelación'} hint="Queda en el historial; el cliente no la ve.">
            <Textarea rows={2} value={nota} onChange={(e) => setNota(e.target.value.slice(0, MAX_NOTA))} maxLength={MAX_NOTA} />
          </Field>
          {errorLocal && <ErrorBox message={errorLocal} />}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Volver
            </Button>
            <Button type="submit" variant={enviar ? 'primary' : 'danger'} loading={enviando} icon={enviar ? <Truck className="w-4 h-4" /> : undefined}>
              {enviar ? 'Marcar como enviado' : 'Cancelar pedido'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export const PedidosSection: React.FC = () => {
  const [estado, setEstado] = useState('');
  const [texto, setTexto] = useState('');
  const [q, setQ] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const filtros = new URLSearchParams(Object.entries({ estado, q, desde, hasta }).filter(([, v]) => v)).toString();
  const { data: pedidos, setData, loading, error, reload } = useApi<Pedido[]>(`/panel/pedidos${filtros ? `?${filtros}` : ''}`);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [accion, setAccion] = useState<AccionPedido>(null);

  const hayFiltros = Boolean(estado || q || desde || hasta);
  const limpiar = () => {
    setEstado('');
    setTexto('');
    setQ('');
    setDesde('');
    setHasta('');
  };

  const actualizar = async (pedido: Pedido, cambios: Record<string, string | undefined>) => {
    setBusy(pedido.id);
    try {
      const actualizado = await api.patch<Pedido>(`/panel/pedidos/${pedido.id}`, cambios);
      setData((list) => list?.map((p) => (p.id === actualizado.id ? actualizado : p)) || null);
      toast(`Pedido ${actualizado.codigo} actualizado.`);
      setAccion(null);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setQ(texto.trim());
            }}
            className="relative"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={texto}
              onChange={(e) => setTexto(e.target.value.slice(0, 80))}
              onBlur={() => setQ(texto.trim())}
              placeholder="Código, cliente, correo, teléfono o guía"
              className="pl-9!"
              aria-label="Buscar pedidos"
            />
          </form>
          <Select value={estado} onChange={(e) => setEstado(e.target.value)} className="md:w-56!" aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            {(Object.keys(ESTADO_PEDIDO_LABELS) as EstadoPedido[]).map((e) => (
              <option key={e} value={e}>
                {ESTADO_PEDIDO_LABELS[e]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-slate-600 space-y-1">
            <span className="block">Desde</span>
            <Input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} className="w-auto!" />
          </label>
          <label className="text-xs font-semibold text-slate-600 space-y-1">
            <span className="block">Hasta</span>
            <Input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} className="w-auto!" />
          </label>
          {hayFiltros && (
            <Button variant="ghost" size="sm" onClick={limpiar} icon={<X className="w-3.5 h-3.5" />}>
              Quitar filtros
            </Button>
          )}
          {pedidos && (
            <span className="ml-auto text-xs text-slate-500">
              {pedidos.length === 200 ? 'Mostrando los 200 más recientes' : `${pedidos.length} ${pedidos.length === 1 ? 'pedido' : 'pedidos'}`}
            </span>
          )}
        </div>
      </Card>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !pedidos?.length ? (
        <EmptyState icon={<ShoppingCart className="w-6 h-6" />} title={hayFiltros ? 'No hay pedidos con esos filtros' : 'Aún no hay pedidos'} />
      ) : (
        <ul className="space-y-3">
          {pedidos.map((p) => {
            const siguiente = SIGUIENTE[p.estado];
            const open = abierto === p.id;
            return (
              <li key={p.id}>
                <Card className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setAbierto(open ? null : p.id)}
                      aria-expanded={open}
                      className="text-left flex items-center gap-2 cursor-pointer"
                    >
                      {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      <span>
                        <span className="block font-mono text-sm font-bold text-[#092653]">{p.codigo}</span>
                        <span className="block text-xs text-slate-500">
                          {p.nombre_contacto} · {p.ciudad} · {fecha(p.created_at, true)}
                        </span>
                      </span>
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <PedidoEstadoBadge estado={p.estado} />
                      <span className={`text-xs font-semibold px-2 py-1 rounded-md ${p.estado_pago === 'PAGADO' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {p.estado_pago === 'PAGADO' ? 'Pagado' : p.estado_pago === 'REEMBOLSADO' ? 'Reembolsado' : 'Pago pendiente'}
                      </span>
                      <span className="font-extrabold text-[#092653] tabular-nums">{cop(p.total)}</span>
                    </div>
                  </div>

                  {open && (
                    <div className="cl-slide-down grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.2fr] gap-5 pt-3 border-t border-[#E7EAF0] text-sm">
                      <ul className="space-y-1">
                        {p.items.map((it) => (
                          <li key={it.id} className="flex justify-between gap-3">
                            <span>
                              {it.nombre} <span className="text-slate-400">× {it.cantidad}</span>
                            </span>
                            <span className="tabular-nums">{cop(it.subtotal)}</span>
                          </li>
                        ))}
                        <li className="flex justify-between gap-3 text-slate-500">
                          <span>Envío</span>
                          <span className="tabular-nums">{p.costo_envio ? cop(p.costo_envio) : 'Gratis'}</span>
                        </li>
                      </ul>
                      <div className="space-y-1 text-slate-600">
                        <p>
                          <strong className="text-[#092653]">Entrega:</strong> {p.direccion}, {p.ciudad}
                        </p>
                        <p>
                          <strong className="text-[#092653]">Contacto:</strong> {p.telefono} · {p.correo}
                        </p>
                        <p>
                          <strong className="text-[#092653]">Pago:</strong> {METODO_PAGO_LABELS[p.metodo_pago]}
                        </p>
                        {p.transportadora && (
                          <p>
                            <strong className="text-[#092653]">Envío:</strong> {p.transportadora} · guía{' '}
                            <span className="font-mono font-semibold">{p.numero_guia}</span>
                          </p>
                        )}
                        {p.entregado_at && (
                          <p>
                            <strong className="text-[#092653]">Entregado:</strong> {fecha(p.entregado_at, true)}
                          </p>
                        )}
                        {p.notas && (
                          <p>
                            <strong className="text-[#092653]">Indicaciones del cliente:</strong> {p.notas}
                          </p>
                        )}
                      </div>
                      <HistorialPedido pedido={p} version={`${p.estado}-${p.estado_pago}`} />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {siguiente && (
                      <Button
                        size="sm"
                        loading={busy === p.id}
                        icon={siguiente.estado === 'ENVIADO' ? <Truck className="w-3.5 h-3.5" /> : undefined}
                        onClick={() =>
                          siguiente.estado === 'ENVIADO' ? setAccion({ tipo: 'enviar', pedido: p }) : actualizar(p, { estado: siguiente.estado })
                        }
                      >
                        {siguiente.label}
                      </Button>
                    )}
                    {p.estado_pago === 'PENDIENTE' && p.estado !== 'CANCELADO' && (
                      <Button size="sm" variant="secondary" loading={busy === p.id} onClick={() => actualizar(p, { estado_pago: 'PAGADO' })}>
                        Registrar pago
                      </Button>
                    )}
                    {['PENDIENTE', 'CONFIRMADO', 'PREPARANDO'].includes(p.estado) && (
                      <Button size="sm" variant="danger" loading={busy === p.id} onClick={() => setAccion({ tipo: 'cancelar', pedido: p })}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <AccionPedidoModal
        accion={accion}
        onClose={() => setAccion(null)}
        onConfirm={async (cambios) => {
          if (accion) await actualizar(accion.pedido, cambios);
        }}
      />
    </div>
  );
};

const TIPO_CLIENTE_LABEL: Record<string, string> = {
  PERSONA_NATURAL: 'Persona natural',
  EMPRESA: 'Empresa',
  COPROPIEDAD: 'Copropiedad',
  ENTIDAD: 'Entidad',
};

const CANAL_LABEL: Record<string, string> = {
  WEB: 'Web',
  WHATSAPP: 'WhatsApp',
  REFERIDO: 'Referido',
  COMERCIAL: 'Asesor comercial',
  FERIA: 'Evento / punto físico',
};

export const ClientesSection: React.FC = () => {
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('');
  const filtros = new URLSearchParams(Object.entries({ q: busqueda, tipo }).filter(([, v]) => v)).toString();
  const { data: clientes, loading, error, reload } = useApi<Cliente[]>(`/panel/clientes${filtros ? `?${filtros}` : ''}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setBusqueda(q.trim());
          }}
          className="relative flex-1 min-w-[240px] max-w-md"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value.slice(0, 80))}
            onBlur={() => setBusqueda(q.trim())}
            placeholder="Nombre, empresa, correo, documento o NIT"
            className="pl-9!"
            aria-label="Buscar clientes"
          />
        </form>
        <div role="radiogroup" aria-label="Tipo de cliente" className="inline-flex rounded-xl border border-[#E7EAF0] bg-white p-1">
          {[
            ['', 'Todos'],
            ['NATURAL', 'Personas naturales'],
            ['JURIDICA', 'Personas jurídicas'],
          ].map(([valor, label]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={tipo === valor}
              onClick={() => setTipo(valor)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                tipo === valor ? 'bg-[#092653] text-white' : 'text-slate-600 hover:bg-[#FAFAF7]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !clientes?.length ? (
        <EmptyState
          icon={<Briefcase className="w-6 h-6" />}
          title={busqueda || tipo ? 'No hay clientes con ese filtro' : 'No hay clientes registrados'}
          description="Los clientes se crean al registrarse en la tienda o al registrar proyectos."
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-[#E7EAF0]">
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Identificación</th>
                <th className="px-4 py-3 font-semibold">Contacto</th>
                <th className="px-4 py-3 font-semibold">Canal</th>
                <th className="px-4 py-3 font-semibold text-right">Proyectos</th>
                <th className="px-4 py-3 font-semibold">Desde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EAF0]">
              {clientes.map((c) => {
                const juridica = c.tipo_cliente !== 'PERSONA_NATURAL';
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block mb-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                          juridica ? 'bg-[#092653] text-white' : 'bg-[#08B6CC]/10 text-[#0B7285]'
                        }`}
                      >
                        {TIPO_CLIENTE_LABEL[c.tipo_cliente] ?? c.tipo_cliente}
                      </span>
                      {juridica && c.empresa ? (
                        <>
                          <span className="block font-semibold text-[#092653]">{c.empresa}</span>
                          <span className="block text-xs text-slate-500">Contacto: {c.nombre}</span>
                        </>
                      ) : (
                        <span className="block font-semibold text-[#092653]">{c.nombre}</span>
                      )}
                      {c.usuario_id && <span className="text-[11px] text-emerald-700">Con cuenta</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {c.documento ? (
                        <>
                          <span className="block text-slate-400">{juridica ? 'NIT' : c.tipo_documento || 'Documento'}</span>
                          <span className="font-mono font-semibold text-[#15243B]">{c.documento}</span>
                        </>
                      ) : (
                        <span className="text-amber-700">Sin documento</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {c.correo}
                      <br />
                      {c.telefono}
                      {c.ciudad && <span className="block text-slate-400">{c.ciudad}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{CANAL_LABEL[c.canal_entrada] ?? c.canal_entrada}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{c.total_proyectos ?? 0}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fecha(c.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
