import React, { useState } from 'react';
import {
  DollarSign,
  Briefcase,
  Users,
  FileText,
  Search,
  ChevronRight,
  Plus,
  Building,
  Phone,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import { projectService } from '../../services/projects/projectService';
import { quoteService } from '../../services/quotes/quoteService';
import { authService } from '../../services/auth/authService';
import { getStatusBadge } from '../common/Badge';

interface CommercialPanelViewProps {
  onSelectProject: (projectId: string) => void;
  subview?: 'clientes' | 'proyectos' | 'cotizaciones';
}

export const CommercialPanelView: React.FC<CommercialPanelViewProps> = ({
  onSelectProject,
  subview = 'proyectos',
}) => {
  const currentUser = authService.getCurrentUser();
  const projects = projectService.getProjects('comercial', currentUser.id);
  const [searchTerm, setSearchTerm] = useState('');

  // Extract clients from projects
  const clientsMap = new Map();
  projects.forEach((p) => {
    if (p.cliente) {
      clientsMap.set(p.cliente.correo, {
        ...p.cliente,
        projectCount: (clientsMap.get(p.cliente.correo)?.projectCount || 0) + 1,
        latestProject: p.nombre,
      });
    }
  });
  const clientsList = Array.from(clientsMap.values());

  const filteredProjects = projects.filter(
    (p) =>
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente?.empresa?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            PANEL COMERCIAL & PROPUESTAS
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {subview === 'clientes'
              ? 'Clientes Autorizados'
              : subview === 'cotizaciones'
              ? 'Cotizaciones & Propuestas Económicas'
              : 'Proyectos en Gestión Comercial'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Formulación económica, márgenes, cálculo de impuestos e historial de clientes.
          </p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">CLIENTES ACTIVOS</span>
          <span className="text-2xl font-bold text-white">{clientsList.length}</span>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-mono text-amber-400 uppercase block">EN COTIZACIÓN</span>
          <span className="text-2xl font-bold text-amber-400">
            {projects.filter((p) => p.estado === 'COTIZACION').length}
          </span>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-mono text-emerald-400 uppercase block">PROPUESTAS APROBADAS</span>
          <span className="text-2xl font-bold text-emerald-400">
            {projects.filter((p) => p.estado === 'APROBADO' || p.estado === 'CERRADO').length}
          </span>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-mono text-cyan-400 uppercase block">MONTO TOTAL COTIZADO</span>
          <span className="text-2xl font-bold text-cyan-400">
            $
            {projects
              .reduce((acc, p) => acc + (p.cotizaciones?.[0]?.total || 0), 0)
              .toLocaleString()}
          </span>
        </div>
      </div>

      {/* Subview: Clientes */}
      {subview === 'clientes' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clientsList.map((cli, idx) => (
            <div
              key={idx}
              className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{cli.nombre}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cli.empresa || 'Empresa no especificada'}</span>
                  </p>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                  {cli.projectCount} Proyecto(s)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{cli.telefono}</span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="truncate">{cli.correo}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 pt-1">
                <span className="text-slate-400">Canal de entrada: </span>
                <span className="text-slate-300 font-mono">{cli.canal_entrada || 'WEB'}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Subview: Proyectos & Cotizaciones */
        <div className="space-y-4">
          {filteredProjects.map((proj) => {
            const quote = proj.cotizaciones?.[0];
            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className="p-5 bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all cursor-pointer group"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      {proj.codigo}
                    </span>
                    <div>{getStatusBadge(proj.estado)}</div>
                    {quote && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30">
                        {quote.codigo}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                    {proj.nombre}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span>{proj.cliente?.empresa || proj.cliente?.nombre}</span>
                    <span>•</span>
                    <span>{proj.ciudad}</span>
                    <span>•</span>
                    <span>
                      Área: {proj.areas[0]?.area_m2} {proj.areas[0]?.unidad_medida}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 self-end md:self-center text-right">
                  {quote ? (
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono block">VALOR PROPUESTA:</span>
                      <span className="text-base font-bold text-emerald-400 font-mono">
                        ${quote.total.toLocaleString()} {quote.moneda}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-400 font-semibold bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-500/30">
                      Pendiente Cotizar
                    </span>
                  )}

                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
