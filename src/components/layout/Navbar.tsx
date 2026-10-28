import React, { useState, useEffect } from 'react';
import {
  Search,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Shield,
  FileText,
  Activity,
  Package,
  Wrench,
  CheckSquare,
  Users,
  BarChart3,
  Sliders,
  FolderGit2,
  HelpCircle,
  Palette,
  Briefcase,
  PlusCircle,
  Compass,
  Heart,
  Lightbulb,
} from 'lucide-react';
import { UserRole, UserProfile } from '../../types';
import { authService } from '../../services/auth/authService';
import { getRoleBadge } from '../common/Badge';
import {
  ColorExplorerFilterRequest,
  FAVORITES_UPDATED_EVENT,
  getStoredFavoriteColorIds,
} from '../../data/colorExplorerData';

export type ActiveView =
  | 'inicio'
  | 'como-funciona'
  | 'soluciones'
  | 'mis-proyectos'
  | 'crear-proyecto'
  | 'detalle-proyecto'
  | 'colorlink-ia'
  | 'seguimiento'
  | 'tecnico-proyectos'
  | 'tecnico-diagnosticos'
  | 'tecnico-soluciones'
  | 'tecnico-evidencias'
  | 'comercial-clientes'
  | 'comercial-proyectos'
  | 'comercial-cotizaciones'
  | 'operaciones-proyectos'
  | 'operaciones-inventario'
  | 'operaciones-abastecimiento'
  | 'operaciones-servicios'
  | 'operaciones-calidad'
  | 'admin-dashboard'
  | 'admin-proyectos'
  | 'admin-clientes'
  | 'admin-inventario'
  | 'admin-abastecimiento'
  | 'admin-servicios'
  | 'admin-calidad'
  | 'admin-usuarios'
  | 'admin-reportes'
  | 'admin-configuracion'
  | 'perfil';

export type SolutionCategoryKey =
  | 'TODAS'
  | 'INTERIOR'
  | 'EXTERIOR'
  | 'HUMEDAD'
  | 'FISURAS'
  | 'PREPARACION'
  | 'HERRAMIENTAS'
  | 'DECORATIVOS';

interface NavbarProps {
  currentView: ActiveView;
  selectedCategory?: SolutionCategoryKey;
  onNavigate: (view: ActiveView, projectId?: string) => void;
  onSelectCategory?: (category: SolutionCategoryKey) => void;
  onSearchSubmit?: (query: string) => void;
  onExploreColors?: (filter?: Omit<ColorExplorerFilterRequest, 'timestamp'>) => void;
  onExploreInspiration?: () => void;
  onOpenAssistant?: () => void;
  currentUser: UserProfile;
  activeRole: UserRole;
  onOpenSupabaseModal: () => void;
  onOpenAuthModal: () => void;
}

type NavBarItemId =
  | 'INICIO'
  | 'INTERIOR'
  | 'EXTERIOR'
  | 'HUMEDAD'
  | 'PREPARACION'
  | 'HERRAMIENTAS'
  | 'ENCUENTRA_COLOR'
  | 'INSPIRACION';

export const STOREFRONT_NAV_ITEMS: Array<{
  id: NavBarItemId;
  label: string;
}> = [
  { id: 'INICIO', label: 'Inicio' },
  { id: 'INTERIOR', label: 'Pintura para interiores' },
  { id: 'EXTERIOR', label: 'Pintura para exteriores' },
  { id: 'HUMEDAD', label: 'Humedad e impermeabilización' },
  { id: 'PREPARACION', label: 'Preparación de superficies' },
  { id: 'HERRAMIENTAS', label: 'Herramientas y acabados' },
  { id: 'ENCUENTRA_COLOR', label: 'Encuentra tu color' },
  { id: 'INSPIRACION', label: 'Inspiración' },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  selectedCategory,
  onNavigate,
  onSelectCategory,
  onSearchSubmit,
  onExploreColors,
  onExploreInspiration,
  onOpenAssistant,
  currentUser,
  activeRole,
  onOpenSupabaseModal,
  onOpenAuthModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [favoriteCount, setFavoriteCount] = useState<number>(() =>
    getStoredFavoriteColorIds().length
  );

  useEffect(() => {
    const syncFavorites = () => {
      setFavoriteCount(getStoredFavoriteColorIds().length);
    };
    window.addEventListener(FAVORITES_UPDATED_EVENT, syncFavorites);
    window.addEventListener('storage', syncFavorites);
    return () => {
      window.removeEventListener(FAVORITES_UPDATED_EVENT, syncFavorites);
      window.removeEventListener('storage', syncFavorites);
    };
  }, []);

  const handleRoleChange = (role: UserRole) => {
    authService.switchRole(role);
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    if (role === 'cliente') onNavigate('inicio');
    else if (role === 'tecnico') onNavigate('tecnico-proyectos');
    else if (role === 'comercial') onNavigate('comercial-proyectos');
    else if (role === 'operaciones') onNavigate('operaciones-proyectos');
    else if (role === 'administrador') onNavigate('admin-dashboard');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchText.trim();
    if (!trimmed) {
      if (onSelectCategory) onSelectCategory('TODAS');
      onNavigate('soluciones');
      return;
    }
    if (onSearchSubmit) {
      onSearchSubmit(trimmed);
    } else {
      onNavigate('soluciones');
    }
    setMobileMenuOpen(false);
  };

  const handleStorefrontNavClick = (itemId: NavBarItemId) => {
    setMobileMenuOpen(false);
    if (itemId === 'INICIO') {
      onNavigate('inicio');
      return;
    }
    if (itemId === 'ENCUENTRA_COLOR') {
      if (onExploreColors) onExploreColors();
      else onNavigate('inicio');
      return;
    }
    if (itemId === 'INSPIRACION') {
      if (onExploreInspiration) onExploreInspiration();
      else onNavigate('inicio');
      return;
    }
    if (onSelectCategory) {
      onSelectCategory(itemId);
    }
    onNavigate('soluciones');
  };

  // Navegación interna exclusivamente para roles autorizados distintos de cliente
  const getInternalNavItems = () => {
    switch (activeRole) {
      case 'tecnico':
        return [
          { id: 'tecnico-proyectos' as ActiveView, label: 'Proyectos asignados', icon: <FolderGit2 className="w-3.5 h-3.5" /> },
          { id: 'tecnico-diagnosticos' as ActiveView, label: 'Diagnósticos', icon: <Sparkles className="w-3.5 h-3.5" /> },
          { id: 'tecnico-soluciones' as ActiveView, label: 'Soluciones técnicas', icon: <FileText className="w-3.5 h-3.5" /> },
          { id: 'tecnico-evidencias' as ActiveView, label: 'Evidencias', icon: <Compass className="w-3.5 h-3.5" /> },
        ];
      case 'comercial':
        return [
          { id: 'comercial-clientes' as ActiveView, label: 'Clientes', icon: <Briefcase className="w-3.5 h-3.5" /> },
          { id: 'comercial-proyectos' as ActiveView, label: 'Proyectos', icon: <FolderGit2 className="w-3.5 h-3.5" /> },
          { id: 'comercial-cotizaciones' as ActiveView, label: 'Cotizaciones', icon: <FileText className="w-3.5 h-3.5" /> },
        ];
      case 'operaciones':
        return [
          { id: 'operaciones-proyectos' as ActiveView, label: 'Proyectos aprobados', icon: <FolderGit2 className="w-3.5 h-3.5" /> },
          { id: 'operaciones-inventario' as ActiveView, label: 'Inventario', icon: <Package className="w-3.5 h-3.5" /> },
          { id: 'operaciones-abastecimiento' as ActiveView, label: 'Abastecimiento', icon: <FolderGit2 className="w-3.5 h-3.5" /> },
          { id: 'operaciones-servicios' as ActiveView, label: 'Servicios', icon: <Wrench className="w-3.5 h-3.5" /> },
          { id: 'operaciones-calidad' as ActiveView, label: 'Calidad', icon: <CheckSquare className="w-3.5 h-3.5" /> },
        ];
      case 'administrador':
        return [
          { id: 'admin-dashboard' as ActiveView, label: 'Dashboard Interno', icon: <BarChart3 className="w-3.5 h-3.5" /> },
          { id: 'admin-proyectos' as ActiveView, label: 'Proyectos', icon: <FolderGit2 className="w-3.5 h-3.5" /> },
          { id: 'admin-clientes' as ActiveView, label: 'Clientes', icon: <Briefcase className="w-3.5 h-3.5" /> },
          { id: 'admin-inventario' as ActiveView, label: 'Inventario', icon: <Package className="w-3.5 h-3.5" /> },
          { id: 'admin-usuarios' as ActiveView, label: 'Usuarios', icon: <Users className="w-3.5 h-3.5" /> },
          { id: 'admin-configuracion' as ActiveView, label: 'Configuración', icon: <Sliders className="w-3.5 h-3.5" /> },
        ];
      default:
        return [];
    }
  };

  const internalNavItems = getInternalNavItems();

  return (
    <header className="w-full z-40 bg-white border-b border-[#E7EAF0]">
      {/* =================================================================== */}
      {/* NIVEL 1: Barra superior delgada                                     */}
      {/* =================================================================== */}
      <div className="bg-[#092653] text-white text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between gap-4">
          <p className="font-medium tracking-wide text-slate-100 truncate flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full bg-[#FFE34D] shrink-0"
              aria-hidden="true"
            />
            <span>Inspira tus espacios con COLORLINK</span>
          </p>

          <div className="flex items-center gap-4 sm:gap-5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('seguimiento')}
              className="hidden sm:inline-flex items-center gap-1.5 text-slate-200 hover:text-[#FFE34D] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-[#08B6CC]" />
              <span>Seguimiento de proyectos</span>
            </button>

            <span className="hidden sm:inline text-white/25" aria-hidden="true">
              |
            </span>

            <button
              type="button"
              onClick={() => onNavigate('como-funciona')}
              className="inline-flex items-center gap-1.5 text-white hover:text-[#FFE34D] font-medium transition-colors whitespace-nowrap cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#08B6CC]" />
              <span>Ayuda</span>
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* NIVEL 2: Barra principal comercial                                  */}
      {/* =================================================================== */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E7EAF0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[74px] flex items-center justify-between gap-3 sm:gap-5">
          {/* Logotipo COLORLINK */}
          <button
            type="button"
            onClick={() => onNavigate('inicio')}
            className="flex items-center gap-2.5 group focus:outline-none shrink-0 cursor-pointer"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#092653] shadow-xs group-hover:bg-[#0d326d] transition-colors">
              <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                <span className="rounded-[2px] bg-[#155EEF]" />
                <span className="rounded-[2px] bg-[#08B6CC]" />
                <span className="rounded-[2px] bg-[#FFE34D]" />
                <span className="rounded-[2px] bg-[#FAFAF7]" />
              </div>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-display font-extrabold text-xl tracking-tight text-[#092653] leading-none">
                COLOR<span className="text-[#08B6CC]">LINK</span>
              </span>
              <span className="text-[10px] font-medium tracking-wide text-[#15243B]/65 mt-0.5 hidden sm:inline">
                Tienda de Color &amp; Soluciones
              </span>
            </div>
          </button>

          {/* Buscador amplio comercial */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-xl relative items-center"
          >
            <Search className="w-4 h-4 text-[#15243B]/50 absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="¿Qué quieres transformar hoy?"
              aria-label="¿Qué quieres transformar hoy?"
              className="w-full bg-[#FAFAF7] hover:bg-[#F3F4F8] focus:bg-white border border-[#E7EAF0] focus:border-[#155EEF] rounded-full pl-11 pr-24 py-2.5 text-sm text-[#15243B] placeholder-[#15243B]/55 transition-all focus:outline-none focus:ring-3 focus:ring-[#155EEF]/15"
            />
            <button
              type="submit"
              className="absolute right-1.5 px-4 py-1.5 rounded-full bg-[#155EEF] hover:bg-[#092653] text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              Buscar
            </button>
          </form>

          {/* Accesos principales: Favoritos, Mis proyectos, Nuevo proyecto, Perfil / Iniciar sesión */}
          <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 shrink-0">
            {/* Favoritos */}
            <button
              type="button"
              onClick={() => {
                if (onExploreColors) {
                  onExploreColors({ onlyFavorites: true });
                } else {
                  onNavigate('inicio');
                }
              }}
              aria-label="Ver mis colores favoritos"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#15243B] hover:bg-[#FAFAF7] border border-transparent hover:border-[#E7EAF0] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Heart
                className={`w-4 h-4 ${
                  favoriteCount > 0 ? 'fill-rose-500 text-rose-500' : 'text-[#092653]'
                }`}
              />
              <span>Favoritos</span>
              {favoriteCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#FFE34D] text-[#092653] text-[10px] font-extrabold leading-none tabular-nums">
                  {favoriteCount}
                </span>
              )}
            </button>

            {/* Mis proyectos */}
            <button
              type="button"
              onClick={() => onNavigate('mis-proyectos')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentView === 'mis-proyectos'
                  ? 'bg-[#155EEF]/10 text-[#155EEF]'
                  : 'text-[#15243B] hover:bg-[#FAFAF7]'
              }`}
            >
              <FolderGit2 className="w-4 h-4 text-[#155EEF]" />
              <span>Mis proyectos</span>
            </button>

            {/* Nuevo Proyecto */}
            <button
              type="button"
              onClick={() => onNavigate('crear-proyecto')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#08B6CC] hover:bg-[#092653] text-white text-xs font-bold shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nuevo Proyecto</span>
            </button>

            {/* Perfil o Iniciar sesión */}
            <div className="relative ml-0.5">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-label="Perfil o iniciar sesión"
                className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-colors text-xs cursor-pointer ${
                  currentView === 'perfil'
                    ? 'border-[#155EEF] bg-[#155EEF]/5 text-[#092653]'
                    : 'border-[#E7EAF0] hover:border-slate-300 bg-white text-[#15243B]'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-[#092653] text-white flex items-center justify-center font-bold text-xs">
                  {currentUser.nombre_completo.charAt(0)}
                </div>
                <span className="font-semibold text-[#092653] hidden xl:inline whitespace-nowrap">
                  Perfil / Cuenta
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E7EAF0] rounded-2xl shadow-xl py-2 z-50">
                  <div className="px-4 py-3 border-b border-[#E7EAF0]">
                    <p className="text-xs font-bold text-[#092653] truncate">
                      {currentUser.nombre_completo}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    {activeRole !== 'cliente' && (
                      <div className="mt-2">{getRoleBadge(activeRole)}</div>
                    )}
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('perfil');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-[#15243B] hover:bg-[#FAFAF7] flex items-center gap-2.5 cursor-pointer"
                    >
                      <User className="w-4 h-4 text-[#155EEF]" />
                      <span>Mi perfil y cuenta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('mis-proyectos');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-[#15243B] hover:bg-[#FAFAF7] flex items-center gap-2.5 cursor-pointer"
                    >
                      <FolderGit2 className="w-4 h-4 text-[#08B6CC]" />
                      <span>Mis proyectos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onOpenAuthModal();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-[#15243B] hover:bg-[#FAFAF7] flex items-center gap-2.5 cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-[#092653]" />
                      <span>Iniciar sesión / Registro</span>
                    </button>
                  </div>

                  {/* Selector de Rol conservado para validación multi-rol */}
                  <div className="px-4 py-2.5 border-t border-[#E7EAF0] bg-[#FAFAF7]">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
                      Modo de vista por rol
                    </span>
                    <div className="grid grid-cols-2 gap-1">
                      {(['cliente', 'tecnico', 'comercial', 'operaciones', 'administrador'] as UserRole[]).map(
                        (role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => handleRoleChange(role)}
                            className={`px-2 py-1 rounded-lg text-[11px] capitalize text-left transition-colors cursor-pointer ${
                              activeRole === role
                                ? 'bg-[#092653] text-white font-semibold'
                                : 'text-slate-600 hover:bg-[#E7EAF0]'
                            }`}
                          >
                            {role}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {activeRole === 'administrador' && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenSupabaseModal();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-[#FAFAF7] border-t border-[#E7EAF0] cursor-pointer"
                    >
                      Estado de conexión Supabase
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      authService.signOut();
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-[#E7EAF0] cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Controles compactos en móvil / tablet */}
          <div className="flex lg:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (onExploreColors) onExploreColors({ onlyFavorites: true });
                else onNavigate('inicio');
              }}
              aria-label="Ver colores favoritos"
              className="relative p-2 text-[#092653] hover:bg-[#FAFAF7] rounded-xl cursor-pointer"
            >
              <Heart
                className={`w-5 h-5 ${
                  favoriteCount > 0 ? 'fill-rose-500 text-rose-500' : 'text-[#092653]'
                }`}
              />
              {favoriteCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 px-1 min-w-[16px] h-4 rounded-full bg-[#FFE34D] text-[#092653] text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                  {favoriteCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('crear-proyecto')}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#08B6CC] text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Proyecto</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Abrir menú de navegación"
              className="p-2 text-[#092653] hover:bg-[#FAFAF7] rounded-xl cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* NIVEL 3: Barra de navegación comercial                              */}
      {/* =================================================================== */}
      <nav
        aria-label="Navegación principal de categorías"
        className="hidden lg:block bg-[#FAFAF7] border-b border-[#E7EAF0]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-between gap-3">
          <div className="flex items-center gap-0.5 xl:gap-1.5 overflow-x-auto no-scrollbar">
            {STOREFRONT_NAV_ITEMS.map((item) => {
              const isActive =
                (item.id === 'INICIO' && currentView === 'inicio') ||
                (currentView === 'soluciones' && selectedCategory === item.id);
              const isHighlightColor = item.id === 'ENCUENTRA_COLOR';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleStorefrontNavClick(item.id)}
                  className={`px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                    isHighlightColor
                      ? 'text-[#092653] bg-[#FFE34D]/55 hover:bg-[#FFE34D] font-bold'
                      : isActive
                      ? 'bg-white text-[#155EEF] shadow-2xs border border-[#E7EAF0]'
                      : 'text-[#15243B] hover:text-[#155EEF] hover:bg-white'
                  }`}
                >
                  {isHighlightColor && <Palette className="w-3.5 h-3.5 text-[#092653]" />}
                  {item.id === 'INSPIRACION' && <Lightbulb className="w-3.5 h-3.5 text-[#08B6CC]" />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              if (onOpenAssistant) onOpenAssistant();
              else onNavigate('colorlink-ia');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-[#092653] hover:text-[#155EEF] hover:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#08B6CC]" />
            <span>COLORLINK IA</span>
          </button>
        </div>
      </nav>

      {/* =================================================================== */}
      {/* FRANJA DE MÓDULOS INTERNOS (Exclusiva para roles != cliente)        */}
      {/* =================================================================== */}
      {activeRole !== 'cliente' && internalNavItems.length > 0 && (
        <div className="hidden lg:block bg-[#092653] text-slate-200 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#FFE34D] mr-2 whitespace-nowrap">
                Panel {activeRole}:
              </span>
              {internalNavItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#08B6CC] text-white font-semibold'
                        : 'text-slate-200 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => handleRoleChange('cliente')}
              className="text-[11px] text-slate-300 hover:text-[#FFE34D] whitespace-nowrap cursor-pointer"
            >
              Volver a tienda cliente
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MENÚ MÓVIL COMPACTO, LIMPIO Y ADAPTABLE                             */}
      {/* =================================================================== */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-[#E7EAF0] px-4 pt-3 pb-6 space-y-4 shadow-xl">
          {/* Buscador móvil */}
          <form onSubmit={handleSearch} className="relative flex items-center">
            <Search className="w-4 h-4 text-[#15243B]/50 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="¿Qué quieres transformar hoy?"
              aria-label="¿Qué quieres transformar hoy?"
              className="w-full bg-[#FAFAF7] border border-[#E7EAF0] rounded-full pl-10 pr-20 py-2.5 text-sm text-[#15243B] placeholder-[#15243B]/55 focus:outline-none focus:border-[#155EEF]"
            />
            <button
              type="submit"
              className="absolute right-1.5 px-3.5 py-1.5 rounded-full bg-[#155EEF] text-white text-xs font-semibold"
            >
              Buscar
            </button>
          </form>

          {/* Navegación comercial completa */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 block">
              Navegación
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {STOREFRONT_NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleStorefrontNavClick(item.id)}
                  className="text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-[#15243B] hover:bg-[#FAFAF7] flex items-center justify-between"
                >
                  <span>{item.label}</span>
                  {item.id === 'ENCUENTRA_COLOR' && (
                    <span className="px-2 py-0.5 rounded-md bg-[#FFE34D] text-[#092653] text-[10px] font-extrabold">
                      Color
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Accesos rápidos del cliente */}
          <div className="pt-3 border-t border-[#E7EAF0] grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (onExploreColors) onExploreColors({ onlyFavorites: true });
                else onNavigate('inicio');
              }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FAFAF7] border border-[#E7EAF0] text-xs font-bold text-[#092653]"
            >
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <span>Favoritos ({favoriteCount})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onNavigate('mis-proyectos');
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FAFAF7] border border-[#E7EAF0] text-xs font-bold text-[#092653]"
            >
              <FolderGit2 className="w-4 h-4 text-[#155EEF]" />
              <span>Mis proyectos</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onNavigate('como-funciona');
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FAFAF7] border border-[#E7EAF0] text-xs font-bold text-[#092653]"
            >
              <HelpCircle className="w-4 h-4 text-[#08B6CC]" />
              <span>Ayuda</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenAssistant) onOpenAssistant();
                else onNavigate('colorlink-ia');
              }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#092653] text-xs font-bold text-white"
            >
              <Sparkles className="w-4 h-4 text-[#08B6CC]" />
              <span>COLORLINK IA</span>
            </button>
          </div>

          {/* Módulos internos sólo si el rol activo NO es cliente */}
          {activeRole !== 'cliente' && internalNavItems.length > 0 && (
            <div className="pt-3 border-t border-[#E7EAF0] space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-2 block">
                Panel interno ({activeRole})
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {internalNavItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#092653] text-white text-xs font-medium"
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pie de menú móvil: Perfil o iniciar sesión */}
          <div className="pt-3 border-t border-[#E7EAF0] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                onNavigate('perfil');
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 text-xs font-semibold text-[#092653]"
            >
              <div className="w-8 h-8 rounded-full bg-[#092653] text-white flex items-center justify-center font-bold">
                {currentUser.nombre_completo.charAt(0)}
              </div>
              <div className="text-left">
                <span className="block truncate max-w-[150px]">{currentUser.nombre_completo}</span>
                <span className="text-[11px] text-slate-500 font-normal">Mi perfil</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenAuthModal();
                setMobileMenuOpen(false);
              }}
              className="px-3.5 py-2 rounded-xl border border-[#E7EAF0] hover:border-[#155EEF] text-xs font-bold text-[#155EEF]"
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
