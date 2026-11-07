import React, { useState } from 'react';
import { AlertTriangle, ImagePlus, Package, Pencil, Plus, SlidersHorizontal, Truck } from 'lucide-react';
import type { Abastecimiento, CategoriaProducto, EstadoAbastecimiento, MovimientoInventario, ProductoInventario } from '../../../types';
import { CATEGORIA_PRODUCTO_LABELS } from '../../../types';
import { api, errorMessage, fileToUpload } from '../../../lib/api';
import { useApi } from '../../../lib/useApi';
import { cop, fecha } from '../../../lib/format';
import { Button, Card, EmptyState, ErrorBox, Field, Input, Modal, Select, Spinner, Textarea, toast } from '../../ui';

// ------------------------------------------------------------------------------
// Productos
// ------------------------------------------------------------------------------
type ProductoForm = {
  sku: string;
  nombre: string;
  descripcion: string;
  categoria: CategoriaProducto;
  presentacion: string;
  unidad: string;
  precio: string;
  precio_anterior: string;
  costo: string;
  stock: string;
  stock_minimo: string;
  color_hex: string;
  acabado: string;
  rendimiento_m2: string;
  imagen_url: string;
  ubicacion_bodega: string;
  activo: boolean;
  destacado: boolean;
};

const VACIO: ProductoForm = {
  sku: '',
  nombre: '',
  descripcion: '',
  categoria: 'INTERIOR',
  presentacion: 'Galón (3,78 L)',
  unidad: 'GALON',
  precio: '',
  precio_anterior: '',
  costo: '',
  stock: '',
  stock_minimo: '5',
  color_hex: '',
  acabado: '',
  rendimiento_m2: '',
  imagen_url: '',
  ubicacion_bodega: '',
  activo: true,
  destacado: false,
};

const aForm = (p: ProductoInventario): ProductoForm => ({
  sku: p.sku,
  nombre: p.nombre,
  descripcion: p.descripcion,
  categoria: p.categoria,
  presentacion: p.presentacion,
  unidad: p.unidad,
  precio: String(p.precio),
  precio_anterior: p.precio_anterior ? String(p.precio_anterior) : '',
  costo: String(p.costo ?? ''),
  stock: String(p.stock),
  stock_minimo: String(p.stock_minimo),
  color_hex: p.color_hex || '',
  acabado: p.acabado || '',
  rendimiento_m2: p.rendimiento_m2 ? String(p.rendimiento_m2) : '',
  imagen_url: p.imagen_url || '',
  ubicacion_bodega: p.ubicacion_bodega || '',
  activo: p.activo,
  destacado: p.destacado,
});

export const ProductosSection: React.FC<{ puedeEditar: boolean }> = ({ puedeEditar }) => {
  const { data: productos, setData, loading, error, reload } = useApi<ProductoInventario[]>('/panel/productos');
  const [editando, setEditando] = useState<{ id: string | null; form: ProductoForm } | null>(null);
  const [ajuste, setAjuste] = useState<ProductoInventario | null>(null);
  const [soloBajo, setSoloBajo] = useState(false);

  const upsert = (p: ProductoInventario) =>
    setData((list) => {
      if (!list) return [p];
      return list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p].sort((a, b) => a.nombre.localeCompare(b.nombre));
    });

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const lista = (productos || []).filter((p) => !soloBajo || Number(p.stock) <= Number(p.stock_minimo));
  const bajos = (productos || []).filter((p) => p.activo && Number(p.stock) <= Number(p.stock_minimo)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={soloBajo} onChange={(e) => setSoloBajo(e.target.checked)} className="w-4 h-4 accent-[#155EEF]" />
          Solo stock bajo ({bajos})
        </label>
        {puedeEditar && (
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setEditando({ id: null, form: { ...VACIO } })}>
            Nuevo producto
          </Button>
        )}
      </div>

      {lista.length === 0 ? (
        <EmptyState icon={<Package className="w-6 h-6" />} title="No hay productos" description="Crea el primero o ejecuta la migración del catálogo inicial." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-[#E7EAF0]">
                <th className="px-4 py-3 font-semibold">Producto</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 font-semibold text-right">Precio</th>
                <th className="px-4 py-3 font-semibold text-right">Costo</th>
                <th className="px-4 py-3 font-semibold text-right">Stock</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                {puedeEditar && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EAF0]">
              {lista.map((p) => {
                const bajo = Number(p.stock) <= Number(p.stock_minimo);
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        {p.color_hex && <span className="w-4 h-4 rounded border border-black/10 shrink-0" style={{ backgroundColor: p.color_hex }} />}
                        <span className="font-semibold text-[#092653]">{p.nombre}</span>
                      </span>
                      <span className="block text-xs text-slate-500 font-mono">
                        {p.sku} · {p.presentacion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{CATEGORIA_PRODUCTO_LABELS[p.categoria]}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{cop(p.precio)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{cop(p.costo)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-bold ${bajo ? 'text-rose-600' : 'text-[#092653]'}`}>
                      {bajo && <AlertTriangle className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}
                      {Number(p.stock)}
                      <span className="block text-[11px] font-normal text-slate-400">mín. {Number(p.stock_minimo)}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {p.activo ? <span className="text-emerald-700">Publicado</span> : <span className="text-slate-500">Oculto</span>}
                      {p.destacado && <span className="block text-[#155EEF]">Destacado</span>}
                    </td>
                    {puedeEditar && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setAjuste(p)}
                            title="Ajustar stock"
                            aria-label={`Ajustar stock de ${p.nombre}`}
                            className="p-2 rounded-lg text-slate-500 hover:text-[#155EEF] hover:bg-[#155EEF]/8 cursor-pointer"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditando({ id: p.id, form: aForm(p) })}
                            title="Editar"
                            aria-label={`Editar ${p.nombre}`}
                            className="p-2 rounded-lg text-slate-500 hover:text-[#155EEF] hover:bg-[#155EEF]/8 cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {editando && (
        <ProductoModal
          inicial={editando}
          onClose={() => setEditando(null)}
          onSaved={(p) => {
            upsert(p);
            setEditando(null);
          }}
        />
      )}
      {ajuste && (
        <AjusteStockModal
          producto={ajuste}
          onClose={() => setAjuste(null)}
          onSaved={(p) => {
            upsert(p);
            setAjuste(null);
          }}
        />
      )}
    </div>
  );
};

const ProductoModal: React.FC<{
  inicial: { id: string | null; form: ProductoForm };
  onClose: () => void;
  onSaved: (p: ProductoInventario) => void;
}> = ({ inicial, onClose, onSaved }) => {
  const [form, setForm] = useState<ProductoForm>(inicial.form);
  const [saving, setSaving] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof ProductoForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const subirImagen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSubiendo(true);
    try {
      const { url } = await api.post<{ url: string }>('/panel/productos/imagen', await fileToUpload(file));
      setForm((f) => ({ ...f, imagen_url: url }));
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubiendo(false);
    }
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = inicial.id
        ? await api.put<ProductoInventario>(`/panel/productos/${inicial.id}`, form)
        : await api.post<ProductoInventario>('/panel/productos', form);
      toast(inicial.id ? 'Producto actualizado.' : 'Producto creado.');
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={inicial.id ? 'Editar producto' : 'Nuevo producto'} size="lg">
      <form onSubmit={guardar} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre" required className="sm:col-span-2">
            <Input value={form.nombre} onChange={set('nombre')} required minLength={3} />
          </Field>
          <Field label="SKU" required>
            <Input value={form.sku} onChange={set('sku')} required className="font-mono uppercase" />
          </Field>
          <Field label="Categoría" required>
            <Select value={form.categoria} onChange={set('categoria')}>
              {Object.entries(CATEGORIA_PRODUCTO_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Descripción" className="sm:col-span-2">
            <Textarea rows={3} value={form.descripcion} onChange={set('descripcion')} />
          </Field>
          <Field label="Presentación" required>
            <Input value={form.presentacion} onChange={set('presentacion')} required />
          </Field>
          <Field label="Unidad">
            <Input value={form.unidad} onChange={set('unidad')} />
          </Field>
          <Field label="Precio de venta (COP, IVA incluido)" required>
            <Input type="number" min={0} step={100} value={form.precio} onChange={set('precio')} required />
          </Field>
          <Field label="Precio anterior (para mostrar descuento)">
            <Input type="number" min={0} step={100} value={form.precio_anterior} onChange={set('precio_anterior')} />
          </Field>
          <Field label="Costo (interno)">
            <Input type="number" min={0} step={100} value={form.costo} onChange={set('costo')} />
          </Field>
          {inicial.id ? (
            <Field label="Stock actual" hint="Se modifica con “Ajustar stock” para dejar trazabilidad.">
              <Input value={form.stock} disabled />
            </Field>
          ) : (
            <Field label="Stock inicial">
              <Input type="number" min={0} value={form.stock} onChange={set('stock')} />
            </Field>
          )}
          <Field label="Stock mínimo">
            <Input type="number" min={0} value={form.stock_minimo} onChange={set('stock_minimo')} />
          </Field>
          <Field label="Ubicación en bodega">
            <Input value={form.ubicacion_bodega} onChange={set('ubicacion_bodega')} />
          </Field>
          <Field label="Color (#RRGGBB)" hint="Opcional, para pinturas de un tono específico.">
            <div className="flex gap-2">
              <Input value={form.color_hex} onChange={set('color_hex')} placeholder="#F4EFE6" className="font-mono" />
              {/^#[0-9a-f]{6}$/i.test(form.color_hex) && <span className="w-11 shrink-0 rounded-xl border border-[#E7EAF0]" style={{ backgroundColor: form.color_hex }} />}
            </div>
          </Field>
          <Field label="Acabado">
            <Input value={form.acabado} onChange={set('acabado')} placeholder="Mate, satinado…" />
          </Field>
          <Field label="Rendimiento (m² por mano)">
            <Input type="number" min={0} step="0.5" value={form.rendimiento_m2} onChange={set('rendimiento_m2')} />
          </Field>
          <Field label="Imagen" className="sm:col-span-2">
            <div className="flex flex-wrap items-center gap-3">
              {form.imagen_url && <img src={form.imagen_url} alt="" className="w-16 h-16 rounded-xl object-cover border border-[#E7EAF0]" />}
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E7EAF0] text-sm font-semibold text-[#092653] cursor-pointer hover:bg-[#FAFAF7]">
                <ImagePlus className="w-4 h-4" />
                {subiendo ? 'Subiendo…' : 'Subir imagen'}
                <input type="file" accept="image/*" onChange={subirImagen} className="sr-only" disabled={subiendo} />
              </label>
              {form.imagen_url && (
                <button type="button" onClick={() => setForm((f) => ({ ...f, imagen_url: '' }))} className="text-xs text-slate-500 hover:text-rose-600 cursor-pointer">
                  Quitar
                </button>
              )}
            </div>
          </Field>
        </div>
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="w-4 h-4 accent-[#155EEF]" />
            Publicado en la tienda
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.destacado} onChange={(e) => setForm({ ...form, destacado: e.target.checked })} className="w-4 h-4 accent-[#155EEF]" />
            Destacado en el inicio
          </label>
        </div>
        {error && <ErrorBox message={error} />}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const AjusteStockModal: React.FC<{ producto: ProductoInventario; onClose: () => void; onSaved: (p: ProductoInventario) => void }> = ({
  producto,
  onClose,
  onSaved,
}) => {
  const [tipo, setTipo] = useState<'ENTRADA' | 'SALIDA' | 'AJUSTE'>('ENTRADA');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: movimientos } = useApi<MovimientoInventario[]>(`/panel/movimientos?producto=${producto.id}`);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const p = await api.post<ProductoInventario>(`/panel/productos/${producto.id}/ajuste-stock`, { tipo, cantidad, motivo });
      toast(`Stock de ${p.nombre}: ${Number(p.stock)}.`);
      onSaved(p);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Inventario · ${producto.nombre}`} size="lg">
      <div className="space-y-6">
        <form onSubmit={guardar} className="space-y-4">
          <p className="text-sm text-slate-600">
            Stock actual: <strong className="text-[#092653]">{Number(producto.stock)}</strong>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Movimiento">
              <Select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
                <option value="ENTRADA">Entrada (+)</option>
                <option value="SALIDA">Salida (−)</option>
                <option value="AJUSTE">Conteo físico (=)</option>
              </Select>
            </Field>
            <Field label={tipo === 'AJUSTE' ? 'Stock contado' : 'Cantidad'} required>
              <Input type="number" min={0} step="0.01" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required />
            </Field>
            <Field label="Motivo" required>
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} required minLength={3} placeholder="Ej. avería, inventario" />
            </Field>
          </div>
          {error && <ErrorBox message={error} />}
          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              Registrar movimiento
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-[#092653]">Últimos movimientos</h3>
          {!movimientos ? (
            <Spinner className="py-6" />
          ) : movimientos.length === 0 ? (
            <p className="text-sm text-slate-500">Sin movimientos registrados.</p>
          ) : (
            <ul className="divide-y divide-[#E7EAF0] text-sm">
              {movimientos.slice(0, 15).map((m) => (
                <li key={m.id} className="py-2 flex flex-wrap justify-between gap-2">
                  <span>
                    <strong className={m.tipo === 'SALIDA' ? 'text-rose-600' : m.tipo === 'ENTRADA' ? 'text-emerald-700' : 'text-[#155EEF]'}>
                      {m.tipo === 'SALIDA' ? '−' : m.tipo === 'ENTRADA' ? '+' : '='}
                      {Number(m.cantidad)}
                    </strong>{' '}
                    {m.motivo}
                  </span>
                  <span className="text-xs text-slate-500">
                    queda {Number(m.stock_resultante)} · {fecha(m.created_at, true)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ------------------------------------------------------------------------------
// Abastecimiento
// ------------------------------------------------------------------------------
const ESTADOS_OC: Record<EstadoAbastecimiento, string> = {
  PENDIENTE: 'Pendiente',
  ORDENADO: 'Ordenado',
  EN_TRANSITO: 'En tránsito',
  RECIBIDO: 'Recibido',
  CANCELADO: 'Cancelado',
};

export const AbastecimientoSection: React.FC = () => {
  const { data: ordenes, loading, error, reload } = useApi<Abastecimiento[]>('/panel/abastecimientos');
  const { data: productos } = useApi<ProductoInventario[]>('/panel/productos');
  const [nueva, setNueva] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const cambiar = async (o: Abastecimiento, estado: EstadoAbastecimiento) => {
    if (estado === 'RECIBIDO' && !window.confirm(`¿Confirmas la recepción de ${o.cantidad} unidades de ${o.producto_nombre}? Se sumarán al inventario.`)) return;
    setBusy(o.id);
    try {
      await api.patch(`/panel/abastecimientos/${o.id}`, { estado });
      toast(estado === 'RECIBIDO' ? 'Orden recibida y stock actualizado.' : 'Orden actualizada.');
      await reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setNueva(true)} disabled={!productos?.length}>
          Nueva orden de compra
        </Button>
      </div>
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !ordenes?.length ? (
        <EmptyState icon={<Truck className="w-6 h-6" />} title="No hay órdenes de abastecimiento" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-[#E7EAF0]">
                <th className="px-4 py-3 font-semibold">Orden</th>
                <th className="px-4 py-3 font-semibold">Producto</th>
                <th className="px-4 py-3 font-semibold">Proveedor</th>
                <th className="px-4 py-3 font-semibold text-right">Costo</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EAF0]">
              {ordenes.map((o) => {
                const abierta = o.estado !== 'RECIBIDO' && o.estado !== 'CANCELADO';
                return (
                  <tr key={o.id}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-[#092653]">{o.codigo_orden}</span>
                      <span className="block text-xs text-slate-500">
                        {fecha(o.created_at)}
                        {o.proyecto_codigo ? ` · ${o.proyecto_codigo}` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {o.producto_nombre}
                      <span className="block text-xs text-slate-500">{Number(o.cantidad)} unidades</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {o.proveedor}
                      {o.fecha_estimada_llegada && <span className="block">Llega {fecha(o.fecha_estimada_llegada)}</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{cop(o.costo_total)}</td>
                    <td className="px-4 py-3 text-xs font-semibold">{ESTADOS_OC[o.estado]}</td>
                    <td className="px-4 py-3">
                      {abierta && (
                        <div className="flex justify-end gap-1.5">
                          {o.estado === 'ORDENADO' && (
                            <Button size="sm" variant="secondary" loading={busy === o.id} onClick={() => cambiar(o, 'EN_TRANSITO')}>
                              En tránsito
                            </Button>
                          )}
                          <Button size="sm" loading={busy === o.id} onClick={() => cambiar(o, 'RECIBIDO')}>
                            Recibir
                          </Button>
                          <Button size="sm" variant="ghost" loading={busy === o.id} onClick={() => cambiar(o, 'CANCELADO')}>
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      {nueva && productos && (
        <NuevaOrdenModal
          productos={productos}
          onClose={() => setNueva(false)}
          onSaved={() => {
            setNueva(false);
            void reload();
          }}
        />
      )}
    </div>
  );
};

const NuevaOrdenModal: React.FC<{ productos: ProductoInventario[]; onClose: () => void; onSaved: () => void }> = ({ productos, onClose, onSaved }) => {
  const sugerido = productos.find((p) => Number(p.stock) <= Number(p.stock_minimo)) || productos[0];
  const [form, setForm] = useState({
    producto_id: sugerido?.id || '',
    cantidad: '',
    proveedor: '',
    fecha_estimada_llegada: '',
    costo_total: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const producto = productos.find((p) => p.id === form.producto_id);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/panel/abastecimientos', form);
      toast('Orden de compra creada.');
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Nueva orden de compra">
      <form onSubmit={guardar} className="space-y-4">
        <Field label="Producto" required>
          <Select value={form.producto_id} onChange={(e) => setForm({ ...form, producto_id: e.target.value })}>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} (stock {Number(p.stock)})
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Cantidad" required>
            <Input type="number" min={1} value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} required />
          </Field>
          <Field label="Costo total" hint={producto && form.cantidad ? `Sugerido: ${cop(Number(producto.costo) * Number(form.cantidad))}` : undefined}>
            <Input type="number" min={0} value={form.costo_total} onChange={(e) => setForm({ ...form, costo_total: e.target.value })} />
          </Field>
        </div>
        <Field label="Proveedor" required>
          <Input value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} required />
        </Field>
        <Field label="Fecha estimada de llegada">
          <Input type="date" value={form.fecha_estimada_llegada} onChange={(e) => setForm({ ...form, fecha_estimada_llegada: e.target.value })} />
        </Field>
        {error && <ErrorBox message={error} />}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Crear orden
          </Button>
        </div>
      </form>
    </Modal>
  );
};
