import React from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { CATEGORIA_PRODUCTO_LABELS, CategoriaProducto } from '../../types';
import { ActiveView, navigate } from '../../lib/router';

interface FooterProps {
  onExploreColors: (filter?: { onlyFavorites?: boolean }) => void;
  onOpenAssistant: () => void;
}

const linkClass = 'text-slate-300 hover:text-[#FFE34D] transition-colors text-left cursor-pointer';

export const Footer: React.FC<FooterProps> = ({ onExploreColors, onOpenAssistant }) => {
  const go = (view: ActiveView, param?: string) => () => navigate(view, param);
  const categorias = Object.entries(CATEGORIA_PRODUCTO_LABELS) as Array<[CategoriaProducto, string]>;

  return (
    <footer className="bg-[#092653] text-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-24 sm:pb-16">
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-10">
          <div className="col-span-2 lg:col-span-4 space-y-4">
            <a href="#/" className="inline-flex items-center gap-2.5">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 border border-white/10">
                <span className="grid grid-cols-2 gap-0.5 w-4 h-4">
                  <span className="rounded-[2px] bg-[#155EEF]" />
                  <span className="rounded-[2px] bg-[#08B6CC]" />
                  <span className="rounded-[2px] bg-[#FFE34D]" />
                  <span className="rounded-[2px] bg-white" />
                </span>
              </span>
              <span className="font-display font-extrabold text-xl tracking-tight text-white">
                COLOR<span className="text-[#08B6CC]">LINK</span>
              </span>
            </a>
            <p className="text-sm text-slate-300 leading-relaxed max-w-sm">
              Pinturas, impermeabilizantes y herramientas con asesoría de color y acompañamiento técnico para cada
              proyecto, de principio a fin.
            </p>
            <p className="flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-[#08B6CC] shrink-0" />
              Tus datos se tratan con autorización expresa y solo para gestionar tus compras y proyectos.
            </p>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-white">Tienda</h4>
            <ul className="space-y-2.5 text-sm">
              {categorias.map(([key, label]) => (
                <li key={key}>
                  <button type="button" onClick={() => navigate('tienda', undefined, { categoria: key })} className={linkClass}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-white">Inspírate</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button type="button" onClick={() => onExploreColors()} className={linkClass}>
                  Encuentra tu color
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onExploreColors({ onlyFavorites: true })} className={linkClass}>
                  Mis colores favoritos
                </button>
              </li>
              <li>
                <button type="button" onClick={go('soluciones')} className={linkClass}>
                  Soluciones por superficie
                </button>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-white">Tu cuenta y ayuda</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button type="button" onClick={go('cuenta', 'pedidos')} className={linkClass}>
                  Mis pedidos
                </button>
              </li>
              <li>
                <button type="button" onClick={go('mis-proyectos')} className={linkClass}>
                  Mis proyectos
                </button>
              </li>
              <li>
                <button type="button" onClick={go('crear-proyecto')} className={linkClass}>
                  Solicitar revisión de mi espacio
                </button>
              </li>
              <li>
                <button type="button" onClick={go('como-funciona')} className={linkClass}>
                  Cómo funciona COLORLINK
                </button>
              </li>
              <li>
                <button type="button" onClick={onOpenAssistant} className={`${linkClass} inline-flex items-center gap-1.5`}>
                  <Sparkles className="w-3.5 h-3.5 text-[#FFE34D]" />
                  Asesoría COLORLINK IA
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 text-xs text-slate-400">
          © {new Date().getFullYear()} COLORLINK. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
};
