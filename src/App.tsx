/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Compass, Lock } from 'lucide-react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingView } from './components/views/LandingView';
import { HowItWorksView } from './components/views/HowItWorksView';
import { SolutionsCatalogView } from './components/views/SolutionsCatalogView';
import { StoreView } from './components/views/StoreView';
import { ProductDetailView } from './components/views/ProductDetailView';
import { CartView, CONTINUAR_A_PAGO_KEY } from './components/views/CartView';
import { CheckoutView } from './components/views/CheckoutView';
import { NewProjectWizard } from './components/views/NewProjectWizard';
import { ProjectsListView } from './components/views/ProjectsListView';
import { ProjectsIntro } from './components/views/ProjectsIntro';
import { ProjectDetailView } from './components/views/ProjectDetailView';
import { AccountView } from './components/views/AccountView';
import { PanelView } from './components/views/panel/PanelView';
import { AuthView } from './components/views/AuthView';
import { FloatingAssistantWidget } from './components/common/FloatingAssistantWidget';
import { CartDrawer } from './components/store/CartDrawer';
import { Button, Spinner, Toaster, usePresence } from './components/ui';
import { navigate, useRoute } from './lib/router';
import { normalizar } from './lib/format';
import { useScrollReveal } from './lib/useScrollReveal';
import { authStore, isStaffRole, useAuth } from './stores/auth';
import './stores/cart';
import './stores/favorites';
import { ColorExplorerFilterRequest } from './data/colorExplorerData';
import { HumidityLevel, WearLevel } from './types';

export interface WizardPrefill {
  colorRequerido?: string;
  /** Ids de colores del catálogo (máximo 2) */
  colores?: string[];
  tipoSuperficie?: string;
  ubicacion?: 'INTERIOR' | 'EXTERIOR' | 'MIXTO';
  descripcionProblema?: string;
  humedad?: HumidityLevel;
  fisuras?: boolean;
  desgaste?: WearLevel;
}

const COLOR_KEYWORDS = ['color', 'paleta', 'tono', 'salvia', 'marfil', 'terracota', 'combinacion'];

export default function App() {
  const route = useRoute();
  const { status, user, loginRequest } = useAuth();
  const [wizardPrefill, setWizardPrefill] = useState<WizardPrefill | undefined>(undefined);
  const [colorExplorerRequest, setColorExplorerRequest] = useState<ColorExplorerFilterRequest | undefined>(undefined);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const pendingScroll = useRef<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  useScrollReveal(mainRef, route.view);

  // Si el visitante tocó "Ingresar y pagar" en el carrito, al iniciar sesión sigue al pago
  useEffect(() => {
    if (!user) return;
    try {
      if (window.sessionStorage.getItem(CONTINUAR_A_PAGO_KEY)) {
        window.sessionStorage.removeItem(CONTINUAR_A_PAGO_KEY);
        navigate('checkout');
      }
    } catch {
      // almacenamiento no disponible
    }
  }, [user]);

  // Al cambiar de página: subir al inicio o a la sección pendiente
  useEffect(() => {
    const target = pendingScroll.current;
    pendingScroll.current = null;
    if (target) {
      setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' }), 90);
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [route.path]);

  const scrollToHomeSection = (sectionId: string) => {
    if (route.view !== 'inicio') {
      pendingScroll.current = sectionId;
      navigate('inicio');
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleExploreColors = (filter?: Omit<ColorExplorerFilterRequest, 'timestamp'>) => {
    setColorExplorerRequest({ ...(filter || {}), timestamp: Date.now() });
    scrollToHomeSection('encuentra-tu-color');
  };

  const handleSearch = (query: string) => {
    if (query && COLOR_KEYWORDS.some((k) => normalizar(query).includes(k))) {
      handleExploreColors();
      return;
    }
    navigate('tienda', undefined, { q: query || undefined });
  };

  /** Abre el asistente de proyecto conservando lo que el cliente ya había escrito */
  const handleStartProjectWithPrefill = (prefill?: WizardPrefill) => {
    if (prefill) {
      setWizardPrefill((prev) => ({
        ...prev,
        ...Object.fromEntries(Object.entries(prefill).filter(([, v]) => v !== undefined && v !== '')),
      }));
    }
    navigate('crear-proyecto');
  };

  const requireLogin = (motivo: string, content: React.ReactNode) => {
    if (status === 'cargando') return <Spinner label="Verificando tu sesión…" />;
    if (!user) return <LoginGate motivo={motivo} />;
    return content;
  };

  const renderView = () => {
    switch (route.view) {
      case 'inicio':
        return (
          <LandingView
            onExploreColors={handleExploreColors}
            onStartProjectWithPrefill={handleStartProjectWithPrefill}
            onOpenAssistant={() => setAssistantOpen(true)}
            colorExplorerRequest={colorExplorerRequest}
          />
        );
      case 'tienda':
        return (
          <StoreView
            categoria={route.query.get('categoria') || undefined}
            q={route.query.get('q') || undefined}
            orden={route.query.get('orden') || undefined}
          />
        );
      case 'producto':
        return <ProductDetailView slug={route.param!} onStartProjectWithPrefill={handleStartProjectWithPrefill} />;
      case 'carrito':
        return <CartView />;
      case 'checkout':
        return requireLogin('Inicia sesión para finalizar tu compra.', <CheckoutView />);
      case 'soluciones':
        return (
          <SolutionsCatalogView
            initialCategory={(route.query.get('categoria') as any) || 'TODAS'}
            onOpenAssistant={() => setAssistantOpen(true)}
            onStartProjectWithPrefill={handleStartProjectWithPrefill}
          />
        );
      case 'como-funciona':
        return <HowItWorksView />;
      case 'mis-proyectos':
        if (status === 'cargando') return <Spinner />;
        return user ? <ProjectsListView /> : <ProjectsIntro />;
      case 'crear-proyecto':
        // Sin sesión se presenta el servicio en lugar de un aviso de "inicia sesión"
        if (status !== 'cargando' && !user) return <ProjectsIntro />;
        return requireLogin(
          'Inicia sesión o crea tu cuenta para registrar tu proyecto y darle seguimiento.',
          <NewProjectWizard
            prefill={wizardPrefill}
            onSuccess={(id) => {
              setWizardPrefill(undefined);
              navigate('detalle-proyecto', id);
            }}
            onCancel={() => navigate(isStaffRole(user) ? 'panel' : 'mis-proyectos')}
          />
        );
      case 'detalle-proyecto':
        return requireLogin('Inicia sesión para ver este proyecto.', <ProjectDetailView projectId={route.param!} />);
      case 'cuenta':
        return requireLogin('Inicia sesión para ver tu cuenta.', <AccountView tab={route.param || 'perfil'} />);
      case 'panel':
        return requireLogin(
          'Inicia sesión con tu cuenta de COLORLINK para acceder al panel.',
          isStaffRole(user) ? <PanelView section={route.param || 'resumen'} /> : <NoAccess />
        );
      default:
        return <NotFound />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#15243B] flex flex-col font-sans selection:bg-[#08B6CC] selection:text-white">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[80] focus:px-4 focus:py-2 focus:bg-white focus:rounded-xl focus:shadow"
      >
        Saltar al contenido
      </a>

      <Navbar route={route} onSearch={handleSearch} onExploreColors={handleExploreColors} />

      <main id="contenido" ref={mainRef} className="flex-1">
        {/* La clave por vista reinicia la animación de entrada al cambiar de página */}
        <div key={route.view} className="cl-view-enter">
          {renderView()}
        </div>
      </main>

      <Footer onExploreColors={handleExploreColors} onOpenAssistant={() => setAssistantOpen(true)} />

      <FloatingAssistantWidget
        isOpen={assistantOpen}
        currentView={route.view}
        onOpen={() => setAssistantOpen(true)}
        onClose={() => setAssistantOpen(false)}
        onExploreColors={handleExploreColors}
        onStartProjectWithPrefill={handleStartProjectWithPrefill}
      />

      <LoginModal request={loginRequest} />

      <CartDrawer />
      <Toaster />
    </div>
  );
}

/** Modal de inicio de sesión / registro con animación de entrada y salida */
const LoginModal: React.FC<{ request: ReturnType<typeof useAuth>['loginRequest'] }> = ({ request }) => {
  const { mounted, state } = usePresence(Boolean(request));
  // Conserva la última solicitud para seguir mostrándola mientras se anima el cierre
  const ultima = useRef(request);
  if (request) ultima.current = request;
  if (!mounted || !ultima.current) return null;
  return (
    <div
      data-state={state}
      className="cl-overlay fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#092653]/55 backdrop-blur-sm overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && authStore.closeLogin()}
    >
      <div className="cl-modal w-full flex justify-center my-auto">
        <AuthView
          initialMode={ultima.current.modo}
          motivo={ultima.current.motivo}
          onSuccess={() => authStore.closeLogin()}
          onClose={() => authStore.closeLogin()}
        />
      </div>
    </div>
  );
};

const LoginGate: React.FC<{ motivo: string }> = ({ motivo }) => (
  <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
    <div className="w-14 h-14 mx-auto rounded-2xl bg-[#092653] text-[#08B6CC] flex items-center justify-center">
      <Lock className="w-6 h-6" />
    </div>
    <h1 className="font-display text-2xl font-extrabold text-[#092653]">Necesitas iniciar sesión</h1>
    <p className="text-sm text-slate-600">{motivo}</p>
    <div className="flex flex-wrap justify-center gap-2 pt-2">
      <Button onClick={() => authStore.requestLogin(motivo)}>Ingresar</Button>
      <Button variant="secondary" onClick={() => authStore.requestLogin(motivo, 'register')}>
        Crear cuenta
      </Button>
    </div>
  </div>
);

const NoAccess: React.FC = () => (
  <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
    <h1 className="font-display text-2xl font-extrabold text-[#092653]">Esta sección es para el equipo COLORLINK</h1>
    <p className="text-sm text-slate-600">
      Tu cuenta no tiene permisos de gestión. Si trabajas en COLORLINK, pide a un administrador que te asigne tu rol.
    </p>
    <Button onClick={() => navigate('inicio')}>Volver al inicio</Button>
  </div>
);

const NotFound: React.FC = () => (
  <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
    <Compass className="w-10 h-10 mx-auto text-[#155EEF]" />
    <h1 className="font-display text-2xl font-extrabold text-[#092653]">No encontramos esta página</h1>
    <p className="text-sm text-slate-600">Puede que el enlace haya cambiado. Te llevamos a un lugar conocido.</p>
    <div className="flex justify-center gap-2">
      <Button onClick={() => navigate('inicio')}>Ir al inicio</Button>
      <Button variant="secondary" onClick={() => navigate('tienda')}>
        Ver la tienda
      </Button>
    </div>
  </div>
);
