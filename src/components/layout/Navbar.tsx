import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  FolderOpen,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Palette,
  Search,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import { CATEGORIA_PRODUCTO_LABELS, CategoriaProducto, ROLE_LABELS } from '../../types';
import { ActiveView, navigate, Route } from '../../lib/router';
import { authStore, isStaffRole, useAuth } from '../../stores/auth';
import { cartStore, totalUnidades, useCart } from '../../stores/cart';
import { BrandMark } from '../ui';
import { FAVORITES_UPDATED_EVENT, getStoredFavoriteColorIds } from '../../data/colorExplorerData';

export type SolutionCategoryKey = 'TODAS' | CategoriaProducto;

interface NavbarProps {
  route: Route;
  onSearch: (query: string) => void;
  onExploreColors: (filter?: { onlyFavorites?: boolean }) => void;
}

const MAIN_LINKS: Array<{ view: ActiveView; label: string; match: ActiveView[] }> = [
  { view: 'tienda', label: 'Tienda', match: ['tienda', 'producto', 'carrito', 'checkout'] },
  { view: 'soluciones', label: 'Soluciones', match: ['soluciones'] },
  { view: 'mis-proyectos', label: 'Proyectos', match: ['mis-proyectos', 'crear-proyecto', 'detalle-proyecto'] },
  { view: 'como-funciona', label: 'Cómo funciona', match: ['como-funciona'] },
];

const CATEGORY_LINKS = Object.entries(CATEGORIA_PRODUCTO_LABELS) as Array<[CategoriaProducto, string]>;

function useFavoriteCount() {
  const [count, setCount] = useState(() => getStoredFavoriteColorIds().length);
  useEffect(() => {
    const sync = () => setCount(getStoredFavoriteColorIds().length);
    window.addEventListener(FAVORITES_UPDATED_EVENT, sync);
    return () => window.removeEventListener(FAVORITES_UPDATED_EVENT, sync);
  }, []);
  return count;
}

function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

export const Navbar: React.FC<NavbarProps> = ({ route, onSearch, onExploreColors }) => {
  const { user, status } = useAuth();
  const { cart } = useCart();
  const favoriteCount = useFavoriteCount();
  const unidades = totalUnidades(cart);
  const scrolled = useScrolled();
  const staff = isStaffRole(user);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchText, setSearchText] = useState(route.query.get('q') || '');
  const accountRef = useRef<HTMLDivElement>(null);

  // Cierra menús al navegar
  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [route.path]);

  useEffect(() => {
    if (!accountOpen) return;
    const onClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [accountOpen]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchText.trim());
    setMobileOpen(false);
  };

  const activeCategory = route.view === 'tienda' ? route.query.get('categoria') : null;
  const showCategoryStrip = ['inicio', 'tienda', 'producto', 'soluciones'].includes(route.view);

  const searchForm = (idSuffix: string) => (
    <form onSubmit={submitSearch} role="search" className="relative flex items-center w-full">
      <label htmlFor={`buscar-${idSuffix}`} className="sr-only">
        Buscar productos, colores o soluciones
      </label>
      <Search className="w-4 h-4 text-[#15243B]/50 absolute left-3.5 pointer-events-none" />
      <input
        id={`buscar-${idSuffix}`}
        type="search"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder="Busca pinturas, colores o soluciones"
        className="w-full bg-[#FAFAF7] hover:bg-[#F3F4F8] focus:bg-white border border-[#E7EAF0] focus:border-[#155EEF] rounded-full pl-10 pr-4 py-2.5 text-sm text-[#15243B] placeholder-[#15243B]/50 transition-colors focus:outline-none focus:ring-3 focus:ring-[#155EEF]/15"
      />
    </form>
  );

  const iconButton =
    'relative inline-flex items-center justify-center w-10 h-10 rounded-xl text-[#092653] hover:bg-[#FAFAF7] transition-colors cursor-pointer';
  const badge =
    'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center tabular-nums';

  return (
    <header data-scrolled={scrolled} className="cl-header sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E7EAF0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3 lg:gap-6">
        {/* Logo */}
        <a
          href="#/"
          className="flex items-center gap-2.5 shrink-0 focus:outline-none focus-visible:ring-3 focus-visible:ring-[#155EEF]/30 rounded-xl"
          aria-label="COLORLINK, ir al inicio"
        >
          <BrandMark />
          <span className="font-display font-extrabold text-xl tracking-tight text-[#092653]">
            COLOR<span className="text-[#08B6CC]">LINK</span>
          </span>
        </a>

        {/* Navegación principal (escritorio) */}
        <nav aria-label="Principal" className="hidden lg:flex items-center gap-1">
          {MAIN_LINKS.map((link) => {
            const active = link.match.includes(route.view);
            return (
              <button
                key={link.view}
                type="button"
                onClick={() => navigate(link.view)}
                aria-current={active ? 'page' : undefined}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  active ? 'text-[#155EEF] bg-[#155EEF]/8' : 'text-[#15243B] hover:text-[#155EEF]'
                }`}
              >
                {link.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onExploreColors()}
            className="ml-1 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-[#092653] bg-[#FFE34D]/60 hover:bg-[#FFE34D] transition-colors cursor-pointer"
          >
            <Palette className="w-4 h-4" />
            Encuentra tu color
          </button>
        </nav>

        {/* Buscador (tablet y escritorio) */}
        <div className="hidden md:flex flex-1 min-w-0 max-w-sm ml-auto">{searchForm('desktop')}</div>

        {/* Acciones */}
        <div className="flex items-center gap-1 ml-auto md:ml-0 shrink-0">
          <button
            type="button"
            onClick={() =>
              user
                ? onExploreColors({ onlyFavorites: true })
                : authStore.requestLogin('Inicia sesión para ver tus colores favoritos.')
            }
            aria-label={`Colores favoritos (${favoriteCount})`}
            className={`${iconButton} hidden sm:inline-flex`}
          >
            <Heart className={`w-5 h-5 ${favoriteCount > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
            {favoriteCount > 0 && (
              <span key={favoriteCount} className={`${badge} cl-pop bg-[#FFE34D] text-[#092653]`}>
                {favoriteCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => cartStore.openDrawer()}
            aria-label={`Carrito (${unidades} productos)`}
            className={iconButton}
          >
            <ShoppingBag className="w-5 h-5" />
            {unidades > 0 && (
              <span key={unidades} className={`${badge} cl-pop bg-[#155EEF] text-white`}>
                {unidades}
              </span>
            )}
          </button>

          {staff && (
            <button
              type="button"
              onClick={() => navigate('panel')}
              className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                route.view === 'panel' ? 'bg-[#092653] text-white' : 'text-[#092653] border border-[#E7EAF0] hover:border-slate-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Panel
            </button>
          )}

          {/* Cuenta */}
          <div className="relative hidden lg:block" ref={accountRef}>
            {user ? (
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl border border-[#E7EAF0] hover:border-slate-300 bg-white cursor-pointer"
              >
                <span className="w-7 h-7 rounded-full bg-[#092653] text-white flex items-center justify-center font-bold text-xs">
                  {(user.nombre_completo || user.email).charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-semibold text-[#092653] max-w-[110px] truncate">
                  {user.nombre_completo.split(' ')[0] || 'Mi cuenta'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>
            ) : (
              <button
                type="button"
                disabled={status === 'cargando'}
                onClick={() => authStore.requestLogin()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#092653] hover:bg-[#155EEF] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                <User className="w-4 h-4" />
                Ingresar
              </button>
            )}

            {accountOpen && user && (
              <div role="menu" className="cl-dropdown absolute right-0 mt-2 w-64 bg-white border border-[#E7EAF0] rounded-2xl shadow-xl py-2 z-50">
                <div className="px-4 py-3 border-b border-[#E7EAF0]">
                  <p className="text-sm font-bold text-[#092653] truncate">{user.nombre_completo}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  {staff && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-[#092653] text-white text-[11px] font-semibold">
                      {ROLE_LABELS[user.rol]}
                    </span>
                  )}
                </div>
                <AccountMenuItems staff={staff} onPick={() => setAccountOpen(false)} />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileOpen}
            className={`${iconButton} lg:hidden`}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Franja de categorías de la tienda (escritorio) */}
      {showCategoryStrip && (
        <nav aria-label="Categorías de la tienda" className="hidden lg:block bg-[#FAFAF7] border-t border-[#E7EAF0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {CATEGORY_LINKS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => navigate('tienda', undefined, { categoria: key })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === key
                    ? 'bg-white text-[#155EEF] border border-[#E7EAF0] shadow-2xs'
                    : 'text-[#15243B] hover:text-[#155EEF] hover:bg-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Menú móvil */}
      {mobileOpen && (
        <div className="cl-slide-down lg:hidden border-t border-[#E7EAF0] bg-white px-4 pt-4 pb-6 space-y-5 shadow-xl max-h-[calc(100dvh-4rem)] overflow-y-auto">
          <div className="md:hidden">{searchForm('mobile')}</div>

          <div className="grid grid-cols-2 gap-2">
            {MAIN_LINKS.map((link) => (
              <button
                key={link.view}
                type="button"
                onClick={() => navigate(link.view)}
                className={`px-3 py-3 rounded-xl text-sm font-semibold text-left cursor-pointer ${
                  link.match.includes(route.view) ? 'bg-[#155EEF]/10 text-[#155EEF]' : 'bg-[#FAFAF7] text-[#092653]'
                }`}
              >
                {link.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onExploreColors();
              }}
              className="col-span-2 inline-flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-bold bg-[#FFE34D] text-[#092653] cursor-pointer"
            >
              <Palette className="w-4 h-4" />
              Encuentra tu color
              {favoriteCount > 0 && <span className="ml-auto text-xs font-semibold">{favoriteCount} favoritos</span>}
            </button>
          </div>

          <div className="space-y-1">
            <span className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Categorías</span>
            {CATEGORY_LINKS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => navigate('tienda', undefined, { categoria: key })}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#15243B] hover:bg-[#FAFAF7] cursor-pointer"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-[#E7EAF0]">
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-1 pb-2">
                  <span className="w-9 h-9 rounded-full bg-[#092653] text-white flex items-center justify-center font-bold">
                    {(user.nombre_completo || user.email).charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#092653] truncate">{user.nombre_completo}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
                <AccountMenuItems staff={staff} onPick={() => setMobileOpen(false)} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  authStore.requestLogin();
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#092653] text-white text-sm font-semibold cursor-pointer"
              >
                <User className="w-4 h-4" />
                Ingresar o crear cuenta
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

const AccountMenuItems: React.FC<{ staff: boolean; onPick: () => void }> = ({ staff, onPick }) => {
  const item = 'w-full text-left px-4 py-2.5 text-sm text-[#15243B] hover:bg-[#FAFAF7] flex items-center gap-2.5 cursor-pointer';
  const go = (view: ActiveView, param?: string) => {
    onPick();
    navigate(view, param);
  };
  return (
    <div className="py-1">
      {staff && (
        <button type="button" role="menuitem" onClick={() => go('panel')} className={`${item} font-semibold`}>
          <LayoutDashboard className="w-4 h-4 text-[#092653]" />
          Panel de gestión
        </button>
      )}
      <button type="button" role="menuitem" onClick={() => go('cuenta')} className={item}>
        <User className="w-4 h-4 text-[#155EEF]" />
        Mi cuenta
      </button>
      <button type="button" role="menuitem" onClick={() => go('cuenta', 'pedidos')} className={item}>
        <Package className="w-4 h-4 text-[#155EEF]" />
        Mis pedidos
      </button>
      <button type="button" role="menuitem" onClick={() => go('mis-proyectos')} className={item}>
        <FolderOpen className="w-4 h-4 text-[#155EEF]" />
        Mis proyectos
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onPick();
          void authStore.signOut();
          navigate('inicio');
        }}
        className={`${item} text-rose-600 hover:bg-rose-50 border-t border-[#E7EAF0] mt-1`}
      >
        <LogOut className="w-4 h-4" />
        Cerrar sesión
      </button>
    </div>
  );
};
