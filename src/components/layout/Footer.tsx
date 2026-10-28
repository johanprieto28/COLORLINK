import React from 'react';
import {
  ShieldCheck,
  HelpCircle,
  Sparkles,
  FolderGit2,
  Palette,
  Heart,
  PlusCircle,
} from 'lucide-react';
import { UserRole } from '../../types';
import { ActiveView, SolutionCategoryKey } from './Navbar';
import { ColorExplorerFilterRequest } from '../../data/colorExplorerData';

interface FooterProps {
  onNavigate: (view: ActiveView) => void;
  onSelectCategory?: (category: SolutionCategoryKey) => void;
  onExploreColors?: (filter?: Omit<ColorExplorerFilterRequest, 'timestamp'>) => void;
  onExploreInspiration?: () => void;
  onOpenAssistant?: () => void;
  onOpenSupabaseModal: () => void;
  onSwitchRole: (role: UserRole) => void;
  activeRole?: UserRole;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onSelectCategory,
  onExploreColors,
  onExploreInspiration,
  onOpenAssistant,
  onOpenSupabaseModal,
  activeRole = 'cliente',
}) => {
  const goToCategory = (cat: SolutionCategoryKey) => {
    if (onSelectCategory) onSelectCategory(cat);
    onNavigate('soluciones');
  };

  return (
    <footer className="bg-[#092653] text-slate-200 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-24 sm:pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10">
          {/* 1. Información de COLORLINK */}
          <div className="lg:col-span-4 space-y-4">
            <button
              type="button"
              onClick={() => onNavigate('inicio')}
              className="flex items-center gap-2.5 text-left cursor-pointer"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 border border-white/10">
                <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                  <span className="rounded-[2px] bg-[#155EEF]" />
                  <span className="rounded-[2px] bg-[#08B6CC]" />
                  <span className="rounded-[2px] bg-[#FFE34D]" />
                  <span className="rounded-[2px] bg-white" />
                </div>
              </div>
              <span className="font-display font-extrabold text-xl tracking-tight text-white">
                COLOR<span className="text-[#08B6CC]">LINK</span>
              </span>
            </button>

            <p className="text-sm text-slate-300 leading-relaxed max-w-sm">
              Plataforma especializada para inspirar tus espacios, explorar paletas de color,
              conocer soluciones para cada superficie y gestionar tus proyectos con trazabilidad
              clara.
            </p>

            <div className="pt-1 flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-[#08B6CC] shrink-0" />
              <span>Información tratada con autorización expresa en cada proyecto</span>
            </div>
          </div>

          {/* 2. Navegación por soluciones */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-white">
              Soluciones
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => goToCategory('INTERIOR')}
                  className="text-slate-300 hover:text-[#FFE34D] transition-colors text-left cursor-pointer"
                >
                  Pintura interior
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => goToCategory('EXTERIOR')}
                  className="text-slate-300 hover:text-[#FFE34D] transition-colors text-left cursor-pointer"
                >
                  Pintura exterior y fachadas
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => goToCategory('HUMEDAD')}
                  className="text-slate-300 hover:text-[#FFE34D] transition-colors text-left cursor-pointer"
                >
                  Humedad e impermeabilización
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => goToCategory('FISURAS')}
                  className="text-slate-300 hover:text-[#FFE34D] transition-colors text-left cursor-pointer"
                >
                  Reparación de fisuras
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => goToCategory('PREPARACION')}
                  className="text-slate-300 hover:text-[#FFE34D] transition-colors text-left cursor-pointer"
                >
                  Preparación de superficies
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => goToCategory('HERRAMIENTAS')}
                  className="text-slate-300 hover:text-[#FFE34D] transition-colors text-left cursor-pointer"
                >
                  Herramientas y acabados
                </button>
              </li>
            </ul>
          </div>

          {/* 3. Explorador de colores */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-white">
              Explorador de colores
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (onExploreColors) onExploreColors();
                    else onNavigate('inicio');
                  }}
                  className="text-slate-300 hover:text-[#FFE34D] transition-colors text-left inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Palette className="w-3.5 h-3.5 text-[#08B6CC]" />
                  <span>Encuentra tu color</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (onExploreColors) onExploreColors({ onlyFavorites: true });
                    else onNavigate('inicio');
                  }}
                  className="text-slate-300 hover:text-[#FFE34D] transition-colors text-left inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5 text-[#FFE34D]" />
                  <span>Mis colores favoritos</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (onExploreInspiration) onExploreInspiration();
                    else onNavigate('inicio');
                  }}
                  className="text-slate-300 hover:text-[#FFE34D] transition-colors text-left cursor-pointer"
                >
                  Inspiración por ambientes
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (onExploreColors) onExploreColors({ category: 'NEUTROS' });
                    else onNavigate('inicio');
                  }}
                  className="text-slate-300 hover:text-[#FFE34D] transition-colors text-left cursor-pointer"
                >
                  Tonos neutros y cálidos
                </button>
              </li>
            </ul>
          </div>

          {/* 4. Mis proyectos */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-white">
              Mis proyectos
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('crear-proyecto')}
                  className="text-slate-300 hover:text-[#FFE34D] transition-colors text-left inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-[#08B6CC]" />
                  <span>Crear mi proyecto</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('mis-proyectos')}
                  className="text-slate-300 hover:text-[#FFE34D] transition-colors text-left inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FolderGit2 className="w-3.5 h-3.5 text-[#08B6CC]" />
                  <span>Consultar mis proyectos</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('seguimiento')}
                  className="text-slate-300 hover:text-[#FFE34D] transition-colors text-left cursor-pointer"
                >
                  Seguimiento en línea
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('perfil')}
                  className="text-slate-300 hover:text-[#FFE34D] transition-colors text-left cursor-pointer"
                >
                  Mi perfil y cuenta
                </button>
              </li>
            </ul>
          </div>

          {/* 5. Ayuda y contacto */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-white">
              Ayuda y contacto
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('como-funciona')}
                  className="text-slate-300 hover:text-[#FFE34D] transition-colors text-left inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#08B6CC]" />
                  <span>Cómo funciona COLORLINK</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenAssistant) onOpenAssistant();
                    else onNavigate('colorlink-ia');
                  }}
                  className="text-slate-300 hover:text-[#FFE34D] transition-colors text-left inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FFE34D]" />
                  <span>Asesoría COLORLINK IA</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('crear-proyecto')}
                  className="text-slate-300 hover:text-[#FFE34D] transition-colors text-left cursor-pointer"
                >
                  Solicitar revisión de mi espacio
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra inferior de transparencia */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} COLORLINK. Todos los derechos reservados.</p>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('crear-proyecto')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Consentimiento y tratamiento de datos en proyectos
            </button>
            {activeRole === 'administrador' && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={onOpenSupabaseModal}
                  className="hover:text-[#08B6CC] transition-colors cursor-pointer"
                >
                  Administración Supabase
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
