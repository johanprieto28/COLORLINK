import React, { useState } from 'react';
import {
  Wrench,
  Sparkles,
  Camera,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Shield,
  FileText,
  Search,
} from 'lucide-react';
import { projectService } from '../../services/projects/projectService';
import { authService } from '../../services/auth/authService';
import { getStatusBadge, getSeverityBadge } from '../common/Badge';

interface TechnicalPanelViewProps {
  onSelectProject: (projectId: string) => void;
  subview?: 'proyectos' | 'diagnosticos' | 'soluciones' | 'evidencias';
}

export const TechnicalPanelView: React.FC<TechnicalPanelViewProps> = ({
  onSelectProject,
  subview = 'proyectos',
}) => {
  const currentUser = authService.getCurrentUser();
  const projects = projectService.getProjects('tecnico', currentUser.id);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = projects.filter(
    (p) =>
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ciudad.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            PANEL DE INGENIERÍA & EVALUACIÓN
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {subview === 'diagnosticos'
              ? 'Diagnósticos Técnicos de Sustratos'
              : subview === 'soluciones'
              ? 'Diseño de Soluciones Técnicas'
              : subview === 'evidencias'
              ? 'Revisión de Evidencias Fotográficas'
              : 'Proyectos Asignados para Análisis Técnico'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Validación de patologías, cálculo de severidad y emisión de sistemas según normas NACE /
            SSPC.
          </p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar proyectos..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">PENDIENTES ANÁLISIS</span>
          <span className="text-2xl font-bold text-white">
            {projects.filter((p) => p.estado === 'RECIBIDO' || p.estado === 'EN_ANALISIS').length}
          </span>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-mono text-cyan-400 uppercase block">VALIDACIÓN TÉCNICA</span>
          <span className="text-2xl font-bold text-cyan-400">
            {projects.filter((p) => p.estado === 'VALIDACION_TECNICA').length}
          </span>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-mono text-emerald-400 uppercase block">SOLUCIONES EMITIDAS</span>
          <span className="text-2xl font-bold text-emerald-400">
            {projects.filter((p) => p.solucion_tecnica !== undefined).length}
          </span>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-mono text-amber-400 uppercase block">EVIDENCIAS EN STORAGE</span>
          <span className="text-2xl font-bold text-amber-400">
            {projects.reduce((acc, p) => acc + (p.evidencias?.length || 0), 0)}
          </span>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {filtered.map((proj) => {
          const area = proj.areas[0];
          return (
            <div
              key={proj.id}
              onClick={() => onSelectProject(proj.id)}
              className="p-5 bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all cursor-pointer group"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    {proj.codigo}
                  </span>
                  <div>{getStatusBadge(proj.estado)}</div>
                  {proj.diagnostico && (
                    <div>{getSeverityBadge(proj.diagnostico.severidad)}</div>
                  )}
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {proj.nombre}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <span>{proj.cliente?.empresa || proj.cliente?.nombre}</span>
                  <span>•</span>
                  <span>{proj.ciudad}</span>
                  <span>•</span>
                  <span>
                    {area?.tipo_superficie} ({area?.area_m2} m²)
                  </span>
                </div>

                {proj.diagnostico?.recomendacion_preliminar && (
                  <p className="text-xs text-slate-300 line-clamp-1 bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-cyan-400 font-mono">Dictamen: </span>
                    {proj.diagnostico.recomendacion_preliminar}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <span className="text-xs text-cyan-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Abrir Expediente</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
