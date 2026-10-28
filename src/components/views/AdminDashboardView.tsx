import React, { useState } from 'react';
import {
  BarChart3,
  Users,
  Sliders,
  Database,
  ShieldCheck,
  Copy,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  DollarSign,
  Wrench,
  CheckSquare,
  Activity,
  FileCode,
  Download,
  Terminal,
} from 'lucide-react';
import { projectService } from '../../services/projects/projectService';
import { authService, DEMO_USERS } from '../../services/auth/authService';
import { isSupabaseConfigured, checkSupabaseConnection } from '../../services/supabase/client';
import { UserRole } from '../../types';
import { getRoleBadge } from '../common/Badge';

interface AdminDashboardViewProps {
  onSelectProject: (projectId: string) => void;
  subview?: 'dashboard' | 'usuarios' | 'configuracion' | 'reportes';
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onSelectProject,
  subview = 'dashboard',
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'usuarios' | 'configuracion' | 'reportes'>(
    subview
  );

  const allProjects = projectService.getProjects('administrador');
  const [copiedSql, setCopiedSql] = useState(false);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [testResult, setTestResult] = useState<{ connected: boolean; message: string } | null>(null);

  // Indicators required by prompt:
  // - Proyectos recibidos
  // - Proyectos en análisis
  // - Proyectos pendientes de validación
  // - Cotizaciones
  // - Proyectos aprobados
  // - Servicios programados
  // - Proyectos cerrados
  const countRecibidos = allProjects.filter((p) => p.estado === 'RECIBIDO').length;
  const countEnAnalisis = allProjects.filter((p) => p.estado === 'EN_ANALISIS').length;
  const countPendientesValidacion = allProjects.filter((p) => p.estado === 'VALIDACION_TECNICA').length;
  const countCotizaciones = allProjects.filter((p) => p.estado === 'COTIZACION').length;
  const countAprobados = allProjects.filter((p) => p.estado === 'APROBADO').length;
  const countServiciosProgramados = allProjects.filter(
    (p) => p.estado === 'SERVICIO_PROGRAMADO' || p.estado === 'EN_EJECUCION'
  ).length;
  const countCerrados = allProjects.filter((p) => p.estado === 'CERRADO').length;

  const handleTestConnection = async () => {
    setTestingSupabase(true);
    setTestResult(null);
    try {
      const res = await checkSupabaseConnection();
      setTestResult(res);
    } finally {
      setTestingSupabase(false);
    }
  };

  const sqlSchemaSnippet = `-- ==============================================================================
-- COLORLINK - Ecosistema Inteligente de Pintura y Recubrimientos
-- Esquema DDL de Base de Datos PostgreSQL para Supabase (19 Tablas + RLS)
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.roles (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    nombre_completo VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    empresa VARCHAR(255),
    documento_nit VARCHAR(50),
    rol VARCHAR(50) NOT NULL REFERENCES public.roles(id) DEFAULT 'cliente',
    cargo VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    nombre VARCHAR(255) NOT NULL,
    empresa VARCHAR(255),
    documento_nit VARCHAR(50),
    telefono VARCHAR(50) NOT NULL,
    correo VARCHAR(255) NOT NULL,
    canal_entrada VARCHAR(50) DEFAULT 'WEB',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.proyectos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
    tecnico_asignado_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    comercial_asignado_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    ciudad VARCHAR(100) NOT NULL,
    direccion TEXT NOT NULL,
    tipo_proyecto VARCHAR(50) NOT NULL DEFAULT 'INDUSTRIAL',
    fecha_requerida DATE NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'RECIBIDO',
    prioridad VARCHAR(20) DEFAULT 'NORMAL',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tablas complementarias: areas_proyecto, materiales, area_material, evidencias,
-- diagnosticos, soluciones_tecnicas, cotizaciones, detalle_cotizacion, inventario,
-- abastecimientos, servicios, calidad, actividades, consentimientos, auditoria.
-- (Ver archivo completo en /src/services/supabase/schema.sql)`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlSchemaSnippet);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            CENTRO DE MANDO CORPORATIVO
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard Administrativo</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Métricas ejecutivas de los 13 estados de proyectos, control de accesos e infraestructura Supabase.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Indicadores Globales', icon: <BarChart3 className="w-3.5 h-3.5" /> },
            { id: 'usuarios', label: 'Usuarios & Roles', icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'configuracion', label: 'Configuración & SQL Supabase', icon: <Sliders className="w-3.5 h-3.5" /> },
            { id: 'reportes', label: 'Auditoría & Trazabilidad', icon: <Activity className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* View 1: Main Indicators Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          {/* Key Indicators Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[10px] font-mono text-cyan-400 uppercase block">RECIBIDOS</span>
              <span className="text-2xl font-bold text-white mt-1 block">{countRecibidos}</span>
              <span className="text-[10px] text-slate-400">Nuevos expedientes</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[10px] font-mono text-blue-400 uppercase block">EN ANÁLISIS</span>
              <span className="text-2xl font-bold text-blue-400 mt-1 block">{countEnAnalisis}</span>
              <span className="text-[10px] text-slate-400">Revisión inicial</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[10px] font-mono text-amber-400 uppercase block">PENDIENTE VALIDACIÓN</span>
              <span className="text-2xl font-bold text-amber-400 mt-1 block">
                {countPendientesValidacion}
              </span>
              <span className="text-[10px] text-slate-400">Inspección técnica</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[10px] font-mono text-purple-400 uppercase block">COTIZACIONES</span>
              <span className="text-2xl font-bold text-purple-400 mt-1 block">
                {countCotizaciones}
              </span>
              <span className="text-[10px] text-slate-400">Propuestas comerciales</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[10px] font-mono text-emerald-400 uppercase block">APROBADOS</span>
              <span className="text-2xl font-bold text-emerald-400 mt-1 block">{countAprobados}</span>
              <span className="text-[10px] text-slate-400">Listos para obra</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[10px] font-mono text-cyan-300 uppercase block">SERVICIOS PROGRAMADOS</span>
              <span className="text-2xl font-bold text-cyan-300 mt-1 block">
                {countServiciosProgramados}
              </span>
              <span className="text-[10px] text-slate-400">Cuadrillas activas</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[10px] font-mono text-emerald-300 uppercase block">CERRADOS</span>
              <span className="text-2xl font-bold text-emerald-300 mt-1 block">{countCerrados}</span>
              <span className="text-[10px] text-slate-400">Con calidad y acta</span>
            </div>
          </div>

          {/* Clean Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status distribution clean bar chart */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Distribución de Proyectos por Etapa
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Total: {allProjects.length} Proyectos
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  { label: 'Recibidos & En Análisis', count: countRecibidos + countEnAnalisis, color: 'bg-blue-500' },
                  { label: 'Validación Técnica & Solución', count: countPendientesValidacion + allProjects.filter(p => p.estado === 'SOLUCION_GENERADA').length, color: 'bg-cyan-500' },
                  { label: 'En Cotización Comercial', count: countCotizaciones, color: 'bg-amber-500' },
                  { label: 'Aprobados / Abastecimiento', count: countAprobados + allProjects.filter(p => p.estado === 'ABASTECIMIENTO').length, color: 'bg-emerald-500' },
                  { label: 'En Ejecución / Calidad', count: countServiciosProgramados + allProjects.filter(p => p.estado === 'CALIDAD').length, color: 'bg-indigo-500' },
                  { label: 'Cerrados a Satisfacción', count: countCerrados, color: 'bg-emerald-400' },
                ].map((item, i) => {
                  const maxVal = Math.max(1, allProjects.length);
                  const percentage = Math.round((item.count / maxVal) * 100);
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">{item.label}</span>
                        <span className="font-mono text-white font-bold">{item.count} ({percentage}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max(percentage, item.count > 0 ? 8 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Industrial Category Breakdown */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Distribución por Tipo de Industria
                </h3>
                <span className="text-xs font-mono text-cyan-400">Sectorización</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                {[
                  { sector: 'Industrial / Manufactura', count: allProjects.filter(p => p.tipo_proyecto === 'INDUSTRIAL').length },
                  { sector: 'Infraestructura & Puertos', count: allProjects.filter(p => p.tipo_proyecto === 'INFRAESTRUCTURA').length },
                  { sector: 'Sector Hospitalario', count: allProjects.filter(p => p.tipo_proyecto === 'HOSPITALARIO').length },
                  { sector: 'Comercial & Retail', count: allProjects.filter(p => p.tipo_proyecto === 'COMERCIAL').length },
                ].map((sec, i) => (
                  <div key={i} className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 text-[11px] block">{sec.sector}</span>
                    <span className="text-xl font-bold text-white font-mono">{sec.count}</span>
                  </div>
                ))}
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>Total m² bajo gestión COLORLINK:</span>
                <span className="text-base font-bold text-cyan-400 font-mono">
                  {allProjects.reduce((acc, p) => acc + (p.areas[0]?.area_m2 || 0), 0).toLocaleString()} m²
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Usuarios & Roles */}
      {activeTab === 'usuarios' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Directorio de Usuarios de la Plataforma</h3>
            <span className="text-xs text-slate-400 font-mono">5 Roles de Acceso</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="pb-3">NOMBRE</th>
                  <th className="pb-3">EMAIL (SUPABASE AUTH)</th>
                  <th className="pb-3">EMPRESA / CARGO</th>
                  <th className="pb-3">ROL</th>
                  <th className="pb-3 text-right">ESTADO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(Object.keys(DEMO_USERS) as UserRole[]).map((role) => {
                  const u = DEMO_USERS[role];
                  return (
                    <tr key={u.id} className="hover:bg-slate-950/40">
                      <td className="py-3 font-semibold text-white">{u.nombre_completo}</td>
                      <td className="py-3 font-mono text-cyan-400 text-[11px]">{u.email}</td>
                      <td className="py-3 text-slate-300">
                        {u.empresa} <span className="text-slate-400 block text-[10px]">{u.cargo}</span>
                      </td>
                      <td className="py-3">{getRoleBadge(u.rol)}</td>
                      <td className="py-3 text-right font-mono text-emerald-400 text-[11px]">ACTIVO</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 3: Configuración & SQL Supabase */}
      {activeTab === 'configuracion' && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-cyan-400" />
                  <span>Esquema DDL de Base de Datos para Supabase</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  19 tablas relacionales con UUIDs, triggers updated_at y políticas de seguridad RLS.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copySqlToClipboard}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedSql ? '¡Copiado!' : 'Copiar SQL'}</span>
                </button>

                <button
                  onClick={handleTestConnection}
                  disabled={testingSupabase}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{testingSupabase ? 'Comprobando...' : 'Probar Conexión'}</span>
                </button>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.connected
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                }`}
              >
                {testResult.connected ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="relative">
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-[350px]">
                {sqlSchemaSnippet}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* View 4: Auditoría & Trazabilidad */}
      {activeTab === 'reportes' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Registro de Auditoría de Operaciones</h3>
            <span className="text-xs text-slate-400 font-mono">Tabla: public.auditoria</span>
          </div>

          <div className="space-y-3">
            {allProjects.flatMap((p) => p.actividades || []).slice(0, 10).map((act, i) => (
              <div
                key={i}
                className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-0.5">
                  <span className="font-semibold text-white block">{act.titulo}</span>
                  <span className="text-slate-400 text-[11px]">{act.descripcion}</span>
                </div>
                <div className="text-right shrink-0 font-mono text-[10px] text-slate-400">
                  <span className="text-cyan-400 block">{act.usuario_nombre}</span>
                  <span>{act.created_at?.split('T')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
