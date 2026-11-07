import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Palette, Search, SlidersHorizontal } from 'lucide-react';
import {
  DISPONIBILIDAD_LABELS,
  FAMILIA_LABELS,
  MANOS,
  RENDIMIENTO_M2_GALON,
  type ColorInventario,
  type FamiliaColor,
  type MovimientoColor,
} from '../../../data/colores';
import { api, errorMessage } from '../../../lib/api';
import { useApi } from '../../../lib/useApi';
import { fecha } from '../../../lib/format';
import { Button, Card, EmptyState, ErrorBox, Field, Input, Modal, Select, Spinner, Textarea, toast } from '../../ui';

const CHIP: Record<ColorInventario['disponibilidad'], string> = {
  DISPONIBLE: 'bg-emerald-50 text-emerald-700',
  POCAS: 'bg-amber-50 text-amber-800',
  BAJO_PEDIDO: 'bg-rose-50 text-rose-700',
};

const fmt = (n: number) => Number(n).toLocaleString('es-CO', { maximumFractionDigits: 1 });

/** Ventana para registrar entradas, salidas o ajustes de un color y ver sus movimientos */
const AjusteColorModal: React.FC<{ color: ColorInventario | null; onClose: () => void; onSaved: () => void }> = ({
  color,
  onClose,
  onSaved,
}) => {
  const [tipo, setTipo] = useState<'ENTRADA' | 'SALIDA' | 'AJUSTE'>('ENTRADA');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [minimo, setMinimo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const { data: movimientos, loading } = useApi<MovimientoColor[]>(color ? `/panel/colores/${color.id}/movimientos` : null);

  useEffect(() => {
    setTipo('ENTRADA');
    setCantidad('');
    setMotivo('');
    setMinimo(color ? String(color.stock_minimo) : '');
  }, [color]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!color) return;
    setGuardando(true);
    try {
      if (cantidad) {
        await api.post(`/panel/colores/${color.id}/ajuste`, { tipo, cantidad: Number(cantidad), motivo });
      }
      if (minimo !== '' && Number(minimo) !== color.stock_minimo) {
        await api.patch(`/panel/colores/${color.id}`, { stock_minimo: Number(minimo) });
      }
      toast(`Inventario de ${color.nombre} actualizado.`);
      onSaved();
      onClose();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal open={Boolean(color)} onClose={onClose} title={color ? `Inventario · ${color.nombre}` : ''} size="lg">
      {color && (
        <div className="space-y-5">
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-[#FAFAF7] border border-[#E7EAF0]">
            <span className="w-14 h-14 rounded-xl border border-black/10 shrink-0" style={{ backgroundColor: color.hex }} />
            <div className="grid grid-cols-3 gap-4 text-sm flex-1">
              <div>
                <p className="text-[11px] text-slate-500">En bodega</p>
                <p className="font-extrabold text-[#092653] tabular-nums">{fmt(color.stock_galones)} gal</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Comprometido</p>
                <p className="font-extrabold text-[#092653] tabular-nums">{fmt(color.comprometido_galones)} gal</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Mínimo</p>
                <p className="font-extrabold text-[#092653] tabular-nums">{fmt(color.stock_minimo)} gal</p>
              </div>
            </div>
          </div>

          <form onSubmit={guardar} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Movimiento">
                <Select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
                  <option value="ENTRADA">Entrada (suma)</option>
                  <option value="SALIDA">Salida (resta)</option>
                  <option value="AJUSTE">Ajuste (conteo físico)</option>
                </Select>
              </Field>
              <Field label={tipo === 'AJUSTE' ? 'Galones contados' : 'Galones'}>
                <Input
                  type="number"
                  min={0}
                  step="0.5"
                  max={10000}
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="Stock mínimo (alerta)">
                <Input type="number" min={0} step="1" max={10000} value={minimo} onChange={(e) => setMinimo(e.target.value)} />
              </Field>
            </div>
            {cantidad && (
              <Field label="Motivo" required hint="Queda en el historial de movimientos.">
                <Textarea
                  rows={2}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value.slice(0, 200))}
                  maxLength={200}
                  placeholder={tipo === 'ENTRADA' ? 'Ej. Llegada de proveedor, factura 1234' : tipo === 'SALIDA' ? 'Ej. Muestras para tienda' : 'Ej. Conteo de fin de mes'}
                />
              </Field>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cerrar
              </Button>
              <Button type="submit" loading={guardando} disabled={(!cantidad && Number(minimo) === color.stock_minimo) || (Boolean(cantidad) && motivo.trim().length < 3)}>
                Guardar
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#08B6CC]">Últimos movimientos</h3>
            {loading ? (
              <Spinner className="py-6!" />
            ) : !movimientos?.length ? (
              <p className="text-xs text-slate-500">Sin movimientos todavía.</p>
            ) : (
              <ul className="divide-y divide-[#E7EAF0] text-sm max-h-64 overflow-y-auto">
                {movimientos.map((m) => (
                  <li key={m.id} className="py-2 flex items-start gap-3">
                    <span
                      className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        m.tipo === 'ENTRADA' ? 'bg-emerald-50 text-emerald-700' : m.tipo === 'SALIDA' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {m.tipo === 'ENTRADA' ? <ArrowDownToLine className="w-3.5 h-3.5" /> : m.tipo === 'SALIDA' ? <ArrowUpFromLine className="w-3.5 h-3.5" /> : <SlidersHorizontal className="w-3.5 h-3.5" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#15243B]">{m.motivo || m.tipo.toLowerCase()}</p>
                      <p className="text-[11px] text-slate-400">{fecha(m.created_at, true)}</p>
                    </div>
                    <div className="text-right text-xs tabular-nums">
                      <p className="font-bold text-[#092653]">
                        {m.tipo === 'ENTRADA' ? '+' : m.tipo === 'SALIDA' ? '−' : '='}
                        {fmt(m.cantidad)}
                      </p>
                      <p className="text-slate-400">queda {fmt(m.stock_resultante)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export const ColoresSection: React.FC<{ puedeEditar: boolean }> = ({ puedeEditar }) => {
  const { data: colores, loading, error, reload } = useApi<ColorInventario[]>('/panel/colores');
  const [familia, setFamilia] = useState<FamiliaColor | ''>('');
  const [q, setQ] = useState('');
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [editando, setEditando] = useState<ColorInventario | null>(null);

  const resumen = useMemo(() => {
    const lista = colores || [];
    return {
      agotados: lista.filter((c) => c.stock_galones <= 0).length,
      bajoMinimo: lista.filter((c) => c.stock_galones > 0 && c.stock_galones <= c.stock_minimo).length,
      faltaParaProyectos: lista.filter((c) => c.comprometido_galones > c.stock_galones).length,
      comprometido: lista.reduce((a, c) => a + c.comprometido_galones, 0),
    };
  }, [colores]);

  const visibles = (colores || []).filter((c) => {
    const texto = q.trim().toLowerCase();
    return (
      (!familia || c.familia === familia) &&
      (!texto || c.nombre.toLowerCase().includes(texto)) &&
      (!soloAlertas || c.stock_galones <= c.stock_minimo || c.comprometido_galones > c.stock_galones)
    );
  });

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Agotados', resumen.agotados, 'text-rose-700'],
          ['Bajo el mínimo', resumen.bajoMinimo, 'text-amber-700'],
          ['No alcanzan para proyectos', resumen.faltaParaProyectos, 'text-rose-700'],
          ['Galones comprometidos', fmt(resumen.comprometido), 'text-[#092653]'],
        ].map(([label, valor, color]) => (
          <Card key={String(label)} className="p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`font-display text-2xl font-extrabold tabular-nums ${color}`}>{valor}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-60">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input value={q} onChange={(e) => setQ(e.target.value.slice(0, 40))} placeholder="Buscar color" className="pl-9!" aria-label="Buscar color" />
        </div>
        <Select value={familia} onChange={(e) => setFamilia(e.target.value as FamiliaColor | '')} className="w-auto!" aria-label="Familia">
          <option value="">Todas las familias</option>
          {(Object.keys(FAMILIA_LABELS) as FamiliaColor[]).map((f) => (
            <option key={f} value={f}>
              {FAMILIA_LABELS[f]}
            </option>
          ))}
        </Select>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={soloAlertas} onChange={(e) => setSoloAlertas(e.target.checked)} className="w-4 h-4 accent-[#155EEF]" />
          Solo con alertas
        </label>
      </div>

      {!visibles.length ? (
        <EmptyState icon={<Palette className="w-6 h-6" />} title="No hay colores con ese filtro" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-[#E7EAF0]">
                <th className="px-4 py-3 font-semibold">Color</th>
                <th className="px-4 py-3 font-semibold text-right">En bodega</th>
                <th className="px-4 py-3 font-semibold text-right">Comprometido</th>
                <th className="px-4 py-3 font-semibold text-right">Libre</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                {puedeEditar && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EAF0]">
              {visibles.map((c) => {
                const libre = c.stock_galones - c.comprometido_galones;
                const falta = libre < 0;
                const pct = Math.min(100, (c.stock_galones / Math.max(c.stock_minimo * 3, 1)) * 100);
                return (
                  <tr key={c.id} className={c.activo ? '' : 'opacity-50'}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-lg border border-black/10 shrink-0" style={{ backgroundColor: c.hex }} />
                        <div>
                          <p className="font-semibold text-[#092653]">{c.nombre}</p>
                          <p className="text-[11px] text-slate-500">
                            {FAMILIA_LABELS[c.familia]} · mínimo {fmt(c.stock_minimo)} gal
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold tabular-nums text-[#092653]">{fmt(c.stock_galones)} gal</p>
                      <div className="mt-1 ml-auto w-24 h-1.5 rounded-full bg-[#E7EAF0] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${c.stock_galones <= 0 ? 'bg-rose-500' : c.stock_galones <= c.stock_minimo ? 'bg-amber-400' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {c.comprometido_galones ? (
                        <>
                          <p className="font-semibold">{fmt(c.comprometido_galones)} gal</p>
                          <p className="text-[11px] text-slate-500">
                            {c.proyectos_activos} {c.proyectos_activos === 1 ? 'proyecto' : 'proyectos'}
                          </p>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold tabular-nums ${falta ? 'text-rose-700' : 'text-[#092653]'}`}>
                      {falta ? (
                        <span className="inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> faltan {fmt(-libre)}
                        </span>
                      ) : (
                        `${fmt(libre)} gal`
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-md ${CHIP[c.disponibilidad]}`}>
                        {c.disponibilidad === 'BAJO_PEDIDO' ? 'Agotado' : DISPONIBILIDAD_LABELS[c.disponibilidad]}
                      </span>
                    </td>
                    {puedeEditar && (
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="secondary" onClick={() => setEditando(c)}>
                          Ajustar
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <p className="text-[11px] text-slate-500">
        <strong>Comprometido</strong>: galones estimados de proyectos activos que aún no aprueban su cotización ({MANOS} manos,{' '}
        {RENDIMIENTO_M2_GALON} m² por galón y mano; 70 % / 30 % si el proyecto lleva dos colores). Al aprobarse la cotización, los
        galones se descuentan solos de la bodega y quedan en los movimientos del color.
      </p>

      <AjusteColorModal color={editando} onClose={() => setEditando(null)} onSaved={reload} />
    </div>
  );
};
