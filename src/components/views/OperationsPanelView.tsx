import React, { useState } from 'react';
import {
  Package,
  Wrench,
  CheckSquare,
  Truck,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  ChevronRight,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { inventoryService } from '../../services/inventory/inventoryService';
import { projectService } from '../../services/projects/projectService';
import { authService } from '../../services/auth/authService';
import { MaterialInventario, Abastecimiento, ServicioProgramado, ControlCalidad } from '../../types';
import { getStatusBadge } from '../common/Badge';

interface OperationsPanelViewProps {
  onSelectProject: (projectId: string) => void;
  subview?: 'proyectos' | 'inventario' | 'abastecimiento' | 'servicios' | 'calidad';
}

export const OperationsPanelView: React.FC<OperationsPanelViewProps> = ({
  onSelectProject,
  subview = 'proyectos',
}) => {
  const [activeTab, setActiveTab] = useState<'proyectos' | 'inventario' | 'abastecimiento' | 'servicios' | 'calidad'>(
    subview
  );

  const currentUser = authService.getCurrentUser();
  const approvedProjects = projectService.getProjects('operaciones', currentUser.id);
  const [inventoryList, setInventoryList] = useState<MaterialInventario[]>(() =>
    inventoryService.getInventory()
  );
  const [abastecimientos, setAbastecimientos] = useState<Abastecimiento[]>(() =>
    inventoryService.getAbastecimientos()
  );
  const [servicios, setServicios] = useState<ServicioProgramado[]>(() =>
    inventoryService.getServices()
  );
  const [calidadList, setCalidadList] = useState<ControlCalidad[]>(() =>
    inventoryService.getQualityChecks()
  );

  const [newOrderModal, setNewOrderModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [orderQty, setOrderQty] = useState(10);
  const [supplier, setSupplier] = useState('Químicos y Recubrimientos Industriales S.A.');

  const refreshInventory = () => {
    setInventoryList([...inventoryService.getInventory()]);
  };

  const handleAdjustStock = (id: string, delta: number) => {
    inventoryService.updateStock(id, delta);
    refreshInventory();
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const mat = inventoryList.find((m) => m.id === selectedMaterial) || inventoryList[0];
    const order = inventoryService.createAbastecimiento({
      proyecto_id: approvedProjects[0]?.id || 'gen',
      material_id: mat.id,
      material_nombre: mat.nombre,
      cantidad_requerida: orderQty,
      unidad: mat.unidad,
      proveedor: supplier,
      costo_total: orderQty * mat.costo_unitario,
    });
    setAbastecimientos([...inventoryService.getAbastecimientos()]);
    setNewOrderModal(false);
  };

  const lowStock = inventoryService.getLowStockItems();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            PANEL DE OPERACIONES & LOGÍSTICA
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Abastecimiento, Inventario & Aplicación
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Control de stock, órdenes de compra a proveedores, programación de cuadrillas e inspección de calidad.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
          {[
            { id: 'proyectos', label: 'Proyectos Aprobados', icon: <Building className="w-3.5 h-3.5" /> },
            { id: 'inventario', label: `Inventario (${inventoryList.length})`, icon: <Package className="w-3.5 h-3.5" /> },
            { id: 'abastecimiento', label: 'Abastecimiento', icon: <Truck className="w-3.5 h-3.5" /> },
            { id: 'servicios', label: 'Servicios en Campo', icon: <Wrench className="w-3.5 h-3.5" /> },
            { id: 'calidad', label: 'Control Calidad', icon: <CheckSquare className="w-3.5 h-3.5" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">PROYECTOS APROBADOS</span>
          <span className="text-2xl font-bold text-white">{approvedProjects.length}</span>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-mono text-rose-400 uppercase block">ALERTAS STOCK BAJO</span>
          <span className="text-2xl font-bold text-rose-400">{lowStock.length}</span>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-mono text-cyan-400 uppercase block">ÓRDENES ABASTECIMIENTO</span>
          <span className="text-2xl font-bold text-cyan-400">{abastecimientos.length}</span>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-mono text-emerald-400 uppercase block">INSPECCIONES CALIDAD</span>
          <span className="text-2xl font-bold text-emerald-400">
            {calidadList.filter((c) => c.estado === 'APROBADO').length}
          </span>
        </div>
      </div>

      {/* Low stock alert banner if any */}
      {lowStock.length > 0 && (
        <div className="p-4 bg-rose-950/30 border border-rose-500/30 rounded-xl flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>
              <strong>Alerta de Reorden:</strong> Hay {lowStock.length} producto(s) con inventario
              igual o por debajo del stock de seguridad mínimo ({lowStock.map((i) => i.nombre).join(', ')}).
            </span>
          </div>
          <button
            onClick={() => setActiveTab('abastecimiento')}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold shrink-0 cursor-pointer"
          >
            Generar Orden
          </button>
        </div>
      )}

      {/* View 1: Proyectos Aprobados */}
      {activeTab === 'proyectos' && (
        <div className="space-y-4">
          {approvedProjects.map((proj) => (
            <div
              key={proj.id}
              onClick={() => onSelectProject(proj.id)}
              className="p-5 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all cursor-pointer group"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    {proj.codigo}
                  </span>
                  <div>{getStatusBadge(proj.estado)}</div>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {proj.nombre}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <span>{proj.cliente?.empresa || proj.cliente?.nombre}</span>
                  <span>•</span>
                  <span>{proj.ciudad}</span>
                  <span>•</span>
                  <span>Área: {proj.areas[0]?.area_m2} m²</span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Gestionar Ejecución</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View 2: Inventario */}
      {activeTab === 'inventario' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Stock en Bodega Central</h3>
            <button
              onClick={refreshInventory}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualizar</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="pb-3">SKU</th>
                  <th className="pb-3">PRODUCTO / ESPECIFICACIÓN</th>
                  <th className="pb-3">CATEGORÍA</th>
                  <th className="pb-3 text-right">STOCK</th>
                  <th className="pb-3 text-right">MÍNIMO</th>
                  <th className="pb-3">UBICACIÓN</th>
                  <th className="pb-3 text-right">AJUSTE RÁPIDO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {inventoryList.map((item) => {
                  const isLow = item.stock_actual <= item.stock_minimo;
                  return (
                    <tr key={item.id} className="hover:bg-slate-950/40">
                      <td className="py-3 font-mono text-[11px] text-cyan-400">{item.codigo_sku}</td>
                      <td className="py-3">
                        <span className="font-semibold text-white block">{item.nombre}</span>
                        <span className="text-[11px] text-slate-400 font-mono">Lote: {item.lote || 'N/A'}</span>
                      </td>
                      <td className="py-3 text-slate-300 font-mono text-[11px]">{item.categoria}</td>
                      <td className="py-3 text-right font-mono font-bold">
                        <span className={isLow ? 'text-rose-400 font-extrabold' : 'text-slate-100'}>
                          {item.stock_actual} {item.unidad}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono text-slate-400">{item.stock_minimo}</td>
                      <td className="py-3 text-slate-400 text-[11px]">{item.ubicacion_bodega}</td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleAdjustStock(item.id, -1)}
                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-mono cursor-pointer"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleAdjustStock(item.id, 5)}
                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 flex items-center justify-center font-mono cursor-pointer"
                          >
                            +5
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 3: Abastecimiento */}
      {activeTab === 'abastecimiento' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <div>
              <h3 className="text-base font-bold text-white">Órdenes de Abastecimiento & Compras</h3>
              <p className="text-xs text-slate-400">
                Suministro de recubrimientos y diluyentes vinculados a proyectos activos.
              </p>
            </div>
            <button
              onClick={() => setNewOrderModal(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md shadow-cyan-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Orden de Compra</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {abastecimientos.map((ord) => (
              <div key={ord.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-cyan-400">{ord.codigo_orden}</span>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-slate-950 text-amber-300 border border-amber-500/30">
                    {ord.estado}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">{ord.material_nombre}</h4>
                  <p className="text-xs text-slate-400">Proveedor: {ord.proveedor}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-950 rounded-xl text-xs font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] block">CANTIDAD:</span>
                    <span className="text-white">
                      {ord.cantidad_requerida} {ord.unidad}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">COSTO TOTAL:</span>
                    <span className="text-emerald-400 font-bold">${ord.costo_total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Solicitado: {ord.fecha_solicitud}</span>
                  <span className="text-cyan-400">Llegada estimada: {ord.fecha_estimada_llegada}</span>
                </div>
              </div>
            ))}
          </div>

          {/* New Order Modal */}
          {newOrderModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 space-y-4">
                <h3 className="text-base font-bold text-white">Generar Orden de Abastecimiento</h3>
                <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
                  <div>
                    <label className="text-slate-300 block mb-1">Producto a Abastecer</label>
                    <select
                      value={selectedMaterial}
                      onChange={(e) => setSelectedMaterial(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    >
                      {inventoryList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre} (Stock actual: {m.stock_actual} {m.unidad})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">Cantidad Requerida</label>
                    <input
                      type="number"
                      min="1"
                      value={orderQty}
                      onChange={(e) => setOrderQty(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">Proveedor Autorizado</label>
                    <input
                      type="text"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold cursor-pointer"
                    >
                      Emitir Orden
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewOrderModal(false)}
                      className="py-2.5 px-4 bg-slate-800 text-slate-300 rounded-xl font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View 4: Servicios */}
      {activeTab === 'servicios' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <h3 className="text-base font-bold text-white">Programación de Cuadrillas & Avance en Campo</h3>
            <p className="text-xs text-slate-400">
              Coordinación de aplicadores técnicos calificados y registro de novedades climáticas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-400 font-bold">SRV-2026-001</span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  EN EJECUCIÓN
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Cuadrilla Alfa - Airless Graco Heavy</h4>
                <p className="text-xs text-slate-400">Líder: Téc. Marco Aurelio Vargas (NACE Coating)</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>Avance Físico:</span>
                  <span className="text-cyan-400 font-bold">65%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 w-[65%]" />
                </div>
              </div>
              <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                <strong>Novedad:</strong> Imprimante y capa intermedia aplicados y curados conforme a SSPC-SP 13.
              </p>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-400 font-bold">SRV-2026-002</span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/30">
                  PROGRAMADO
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Cuadrilla Beta - Granallado & C5</h4>
                <p className="text-xs text-slate-400">Líder: Téc. Hernán Darío Gómez</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>Avance Físico:</span>
                  <span className="text-slate-400 font-bold">0%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-slate-800 w-[0%]" />
                </div>
              </div>
              <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                <strong>Inicio programado:</strong> 15 de Octubre 2026. Preparación con chorro abrasivo SSPC-SP 10.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* View 5: Calidad */}
      {activeTab === 'calidad' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <h3 className="text-base font-bold text-white">Protocolos de Inspección & Control de Calidad</h3>
            <p className="text-xs text-slate-400">
              Ensayos normativos de adherencia (ASTM D3359), medición de espesor DFT (SSPC-PA 2) y curado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-cyan-400 font-bold">ACTA-QC-2026-0042</span>
                <span className="px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-mono">
                  APROBADO
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Piso Almacén Logístico Montevideo</h4>
                <p className="text-slate-400">Inspector: Ing. Laura Marcela Gómez (NACE Inspector #4218)</p>
              </div>

              <div className="space-y-2 p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span>Prueba Adherencia Cruzada (ASTM D3359):</span>
                  <span className="text-emerald-400 font-bold font-mono">Clasificación 5B (100% OK)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Espesor Promedio DFT (SSPC-PA 2):</span>
                  <span className="text-cyan-400 font-bold font-mono">1,680 µm (Cumple spec)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Inspección Visual de Superficie:</span>
                  <span className="text-white font-mono">EXCELENTE (Sin ojos de pescado)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Curado Químico Completo:</span>
                  <span className="text-emerald-400 font-mono">Verificado Barcol 934</span>
                </div>
              </div>

              <p className="text-slate-400">
                <strong>Dictamen del Inspector:</strong> El sistema epóxico autonivelante cumple
                satisfactoriamente con los criterios de aceptación mecánica y estética para la entrega de garantía de 5 años.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
