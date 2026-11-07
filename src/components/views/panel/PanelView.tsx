import React, { useState } from 'react';
import {
  BarChart3,
  Briefcase,
  ClipboardCheck,
  FolderOpen,
  Package,
  Palette,
  PlusCircle,
  Search,
  Server,
  ShoppingCart,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import type { MetricasPanel, ProjectStatus, ProyectoResumen, StaffRole, UserRole } from '../../../types';
import { PROJECT_STATUS_LABELS, ROLE_LABELS } from '../../../types';
import { useApi } from '../../../lib/useApi';
import { navigate } from '../../../lib/router';
import { cop, fecha, superficieLabel } from '../../../lib/format';
import { useAuth } from '../../../stores/auth';
import { getStatusBadge } from '../../common/Badge';
import { Button, Card, EmptyState, ErrorBox, Input, Select, Spinner } from '../../ui';
import { ClientesSection, PedidosSection } from './PanelComercial';
import { AbastecimientoSection, ProductosSection } from './PanelInventario';
import { ColoresSection } from './PanelColores';
import { CalidadSection, ServiciosSection } from './PanelOperaciones';
import { SistemaSection, UsuariosSection } from './PanelAdmin';

interface Seccion {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: StaffRole[];
}

const SECCIONES: Seccion[] = [
  { id: 'resumen', label: 'Resumen', icon: <BarChart3 className="w-4 h-4" />, roles: ['tecnico', 'comercial', 'operaciones'] },
  { id: 'proyectos', label: 'Proyectos', icon: <FolderOpen className="w-4 h-4" />, roles: ['tecnico', 'comercial', 'operaciones'] },
  { id: 'pedidos', label: 'Pedidos de la tienda', icon: <ShoppingCart className="w-4 h-4" />, roles: ['comercial', 'operaciones'] },
  { id: 'clientes', label: 'Clientes', icon: <Briefcase className="w-4 h-4" />, roles: ['comercial'] },
  { id: 'productos', label: 'Productos e inventario', icon: <Package className="w-4 h-4" />, roles: ['operaciones', 'comercial'] },
  { id: 'colores', label: 'Stock de colores', icon: <Palette className="w-4 h-4" />, roles: ['operaciones', 'comercial', 'tecnico'] },
  { id: 'abastecimiento', label: 'Abastecimiento', icon: <Truck className="w-4 h-4" />, roles: ['operaciones'] },
  { id: 'servicios', label: 'Servicios en campo', icon: <Wrench className="w-4 h-4" />, roles: ['operaciones', 'tecnico'] },
  { id: 'calidad', label: 'Control de calidad', icon: <ClipboardCheck className="w-4 h-4" />, roles: ['operaciones', 'tecnico'] },
  { id: 'usuarios', label: 'Usuarios y roles', icon: <Users className="w-4 h-4" />, roles: [] },
  { id: 'sistema', label: 'Estado del sistema', icon: <Server className="w-4 h-4" />, roles: [] },
];

function seccionesPara(rol: UserRole): Seccion[] {
  if (rol === 'administrador') return SECCIONES;
  return SECCIONES.filter((s) => s.roles.includes(rol as StaffRole));
}

export const PanelView: React.FC<{ section: string }> = ({ section }) => {
  const { user } = useAuth();
  if (!user) return null;
  const disponibles = seccionesPara(user.rol);
  const activa = disponibles.find((s) => s.id === section) || disponibles[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-6 lg:gap-8 items-start">
        <aside className="lg:sticky lg:top-24 space-y-4">
          <div className="px-1">
            <p className="text-xs font-bold uppercase tracking-widest text-[#155EEF]">Panel de gestión</p>
            <p className="text-sm text-slate-600">
              {user.nombre_completo.split(' ')[0]} · {ROLE_LABELS[user.rol]}
            </p>
          </div>
          <nav aria-label="Secciones del panel" className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
            {disponibles.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate('panel', s.id)}
                aria-current={activa.id === s.id ? 'page' : undefined}
                className={`inline-flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap text-left transition-colors cursor-pointer ${
                  activa.id === s.id ? 'bg-[#092653] text-white' : 'text-[#15243B] hover:bg-white'
                }`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </nav>
          <Button variant="accent" className="w-full hidden lg:inline-flex" icon={<PlusCircle className="w-4 h-4" />} onClick={() => navigate('crear-proyecto')}>
            Registrar proyecto
          </Button>
        </aside>

        <section className="min-w-0 space-y-6">
          <h1 className="font-display text-2xl font-extrabold text-[#092653]">{activa.label}</h1>
          {activa.id === 'resumen' && <ResumenSection rol={user.rol} />}
          {activa.id === 'proyectos' && <ProyectosSection rol={user.rol} />}
          {activa.id === 'pedidos' && <PedidosSection />}
          {activa.id === 'clientes' && <ClientesSection />}
          {activa.id === 'productos' && <ProductosSection puedeEditar={user.rol === 'operaciones' || user.rol === 'administrador'} />}
          {activa.id === 'colores' && <ColoresSection puedeEditar={user.rol === 'operaciones' || user.rol === 'administrador'} />}
          {activa.id === 'abastecimiento' && <AbastecimientoSection />}
          {activa.id === 'servicios' && <ServiciosSection />}
          {activa.id === 'calidad' && <CalidadSection />}
          {activa.id === 'usuarios' && <UsuariosSection />}
          {activa.id === 'sistema' && <SistemaSection />}
        </section>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------
// Resumen
// ------------------------------------------------------------------------------
/** Estados en los que cada rol tiene trabajo pendiente */
const PENDIENTES: Record<StaffRole, ProjectStatus[]> = {
  tecnico: ['RECIBIDO', 'EN_ANALISIS', 'VALIDACION_TECNICA'],
  comercial: ['SOLUCION_GENERADA', 'COTIZACION'],
  operaciones: ['APROBADO', 'ABASTECIMIENTO', 'SERVICIO_PROGRAMADO', 'EN_EJECUCION', 'CALIDAD'],
  administrador: ['RECIBIDO', 'SOLUCION_GENERADA', 'APROBADO', 'EN_EJECUCION', 'CALIDAD'],
};

const Stat: React.FC<{ label: string; value: string | number; hint?: string; onClick?: () => void }> = ({ label, value, hint, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className="text-left bg-white border border-[#E7EAF0] rounded-2xl p-4 hover:border-[#155EEF]/40 transition-colors disabled:cursor-default cursor-pointer"
  >
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    <p className="mt-1 font-display text-2xl font-extrabold text-[#092653] tabular-nums">{value}</p>
    {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
  </button>
);

const ResumenSection: React.FC<{ rol: UserRole }> = ({ rol }) => {
  const { data: m, loading, error, reload } = useApi<MetricasPanel>('/panel/metricas');
  const pendientes = PENDIENTES[rol as StaffRole] || [];
  const { data: proyectos } = useApi<ProyectoResumen[]>(`/proyectos?estado=${pendientes.join(',')}`);

  if (loading) return <Spinner />;
  if (error || !m) return <ErrorBox message={error || 'Sin datos.'} onRetry={reload} />;

  const variacion = m.ventasMesAnterior > 0 ? Math.round(((m.ventasMes - m.ventasMesAnterior) / m.ventasMesAnterior) * 100) : null;
  const pedidosMes = Object.values(m.pedidosPorEstado).reduce((a, b) => a + (b || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat label="Proyectos activos" value={m.proyectosTotal - (m.proyectosPorEstado.CERRADO || 0) - (m.proyectosPorEstado.CANCELADO || 0)} onClick={() => navigate('panel', 'proyectos')} />
        <Stat
          label="Ventas del mes"
          value={cop(m.ventasMes)}
          hint={variacion === null ? 'Sin datos del mes anterior' : `${variacion >= 0 ? '+' : ''}${variacion}% vs. mes anterior`}
          onClick={rol === 'tecnico' ? undefined : () => navigate('panel', 'pedidos')}
        />
        <Stat label="Pedidos del mes" value={pedidosMes} hint={`${m.pedidosPorEstado.PENDIENTE || 0} por confirmar`} />
        <Stat label="Productos con stock bajo" value={m.productosBajoStock} onClick={rol === 'tecnico' ? undefined : () => navigate('panel', 'productos')} />
        <Stat label="Cotizaciones por responder" value={m.cotizacionesPendientes} />
        <Stat label="Servicios activos" value={m.serviciosActivos} />
        <Stat label="Clientes registrados" value={m.clientesTotal} />
        <Stat label="Proyectos cerrados" value={m.proyectosPorEstado.CERRADO || 0} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display font-bold text-[#092653]">Requieren tu atención</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('panel', 'proyectos')}>
              Ver todos
            </Button>
          </div>
          {!proyectos ? (
            <Spinner className="py-8" />
          ) : proyectos.length === 0 ? (
            <p className="text-sm text-slate-500">No hay proyectos pendientes para tu rol. ¡Buen trabajo!</p>
          ) : (
            <ul className="divide-y divide-[#E7EAF0]">
              {proyectos.slice(0, 8).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => navigate('detalle-proyecto', p.id)}
                    className="w-full py-3 flex flex-wrap items-center justify-between gap-2 text-left hover:bg-[#FAFAF7] -mx-2 px-2 rounded-lg cursor-pointer"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#092653] truncate">{p.nombre}</span>
                      <span className="block text-xs text-slate-500">
                        {p.codigo} · {p.cliente_nombre} · {p.ciudad}
                      </span>
                    </span>
                    {getStatusBadge(p.estado)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-display font-bold text-[#092653]">Proyectos por estado</h2>
          <ul className="space-y-2 text-sm">
            {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[])
              .filter((e) => m.proyectosPorEstado[e])
              .map((e) => (
                <li key={e}>
                  <button
                    type="button"
                    onClick={() => navigate('panel', 'proyectos', { estado: e })}
                    className="w-full flex items-center justify-between gap-2 hover:text-[#155EEF] cursor-pointer"
                  >
                    <span>{PROJECT_STATUS_LABELS[e]}</span>
                    <span className="font-bold tabular-nums">{m.proyectosPorEstado[e]}</span>
                  </button>
                </li>
              ))}
            {m.proyectosTotal === 0 && <li className="text-slate-500">Aún no hay proyectos.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------
// Proyectos
// ------------------------------------------------------------------------------
const ProyectosSection: React.FC<{ rol: UserRole }> = ({ rol }) => {
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const [estado, setEstado] = useState<string>(params.get('estado') || '');
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [asignados, setAsignados] = useState(false);

  const query = new URLSearchParams();
  if (estado) query.set('estado', estado);
  if (busqueda) query.set('q', busqueda);
  if (asignados) query.set('asignados', '1');
  const { data: proyectos, loading, error, reload } = useApi<ProyectoResumen[]>(`/proyectos?${query.toString()}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setBusqueda(q.trim());
          }}
          className="relative flex-1 min-w-[200px]"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código, nombre o ciudad" className="pl-9" aria-label="Buscar proyectos" />
        </form>
        <Select value={estado} onChange={(e) => setEstado(e.target.value)} className="!w-auto" aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((e) => (
            <option key={e} value={e}>
              {PROJECT_STATUS_LABELS[e]}
            </option>
          ))}
        </Select>
        {rol !== 'administrador' && rol !== 'operaciones' && (
          <label className="inline-flex items-center gap-2 text-sm text-slate-600 px-2 cursor-pointer">
            <input type="checkbox" checked={asignados} onChange={(e) => setAsignados(e.target.checked)} className="w-4 h-4 accent-[#155EEF]" />
            Solo asignados a mí
          </label>
        )}
        <Button variant="accent" icon={<PlusCircle className="w-4 h-4" />} onClick={() => navigate('crear-proyecto')} className="lg:hidden">
          Registrar
        </Button>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !proyectos?.length ? (
        <EmptyState icon={<FolderOpen className="w-6 h-6" />} title="No hay proyectos con esos filtros" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-[#E7EAF0]">
                <th className="px-4 py-3 font-semibold">Proyecto</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Superficie</th>
                <th className="px-4 py-3 font-semibold">Responsables</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EAF0]">
              {proyectos.map((p) => (
                <tr key={p.id} onClick={() => navigate('detalle-proyecto', p.id)} className="hover:bg-[#FAFAF7] cursor-pointer">
                  <td className="px-4 py-3">
                    <a href={`#/proyectos/${p.id}`} className="font-semibold text-[#092653] hover:text-[#155EEF]" onClick={(e) => e.stopPropagation()}>
                      {p.nombre}
                    </a>
                    <span className="block text-xs text-slate-500 font-mono">
                      {p.codigo}
                      {p.prioridad !== 'NORMAL' && <span className="ml-2 text-rose-600 font-sans font-bold">{p.prioridad.toLowerCase()}</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.cliente_nombre}
                    <span className="block text-xs text-slate-500">{p.ciudad}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {superficieLabel(p.tipo_superficie)}
                    {p.area_m2 ? ` · ${p.area_m2} m²` : ''}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    T: {p.tecnico_nombre || '—'}
                    <br />
                    C: {p.comercial_nombre || '—'}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(p.estado)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fecha(p.updated_at || p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
