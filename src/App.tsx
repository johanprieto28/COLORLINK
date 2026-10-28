/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, ActiveView, SolutionCategoryKey } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingView } from './components/views/LandingView';
import { HowItWorksView } from './components/views/HowItWorksView';
import { SolutionsCatalogView } from './components/views/SolutionsCatalogView';
import { NewProjectWizard } from './components/views/NewProjectWizard';
import { ProjectsListView } from './components/views/ProjectsListView';
import { ProjectDetailView } from './components/views/ProjectDetailView';
import { ColorlinkAIView } from './components/views/ColorlinkAIView';
import { TechnicalPanelView } from './components/views/TechnicalPanelView';
import { CommercialPanelView } from './components/views/CommercialPanelView';
import { OperationsPanelView } from './components/views/OperationsPanelView';
import { AdminDashboardView } from './components/views/AdminDashboardView';
import { UserProfileView } from './components/views/UserProfileView';
import { AuthView } from './components/views/AuthView';
import { SupabaseStatusModal } from './components/common/SupabaseStatusModal';
import { DevSupabaseDiagnostic } from './components/common/DevSupabaseDiagnostic';
import { FloatingAssistantWidget } from './components/common/FloatingAssistantWidget';
import { authService } from './services/auth/authService';
import { projectService } from './services/projects/projectService';
import { ColorExplorerFilterRequest } from './data/colorExplorerData';
import { UserRole, UserProfile, HumidityLevel, WearLevel } from './types';

export interface WizardPrefill {
  colorRequerido?: string;
  tipoSuperficie?: string;
  ubicacion?: 'INTERIOR' | 'EXTERIOR' | 'MIXTO';
  descripcionProblema?: string;
  humedad?: HumidityLevel;
  fisuras?: boolean;
  desgaste?: WearLevel;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => authService.getCurrentUser());
  const [activeRole, setActiveRole] = useState<UserRole>(() => authService.getActiveRole());
  const [currentView, setCurrentView] = useState<ActiveView>('inicio');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('proj-001');
  const [selectedCategory, setSelectedCategory] = useState<SolutionCategoryKey>('TODAS');
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>('');
  const [wizardPrefill, setWizardPrefill] = useState<WizardPrefill | undefined>(undefined);
  const [colorExplorerRequest, setColorExplorerRequest] = useState<
    ColorExplorerFilterRequest | undefined
  >(undefined);

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.subscribe((user) => {
      if (user) {
        setCurrentUser(user);
        setActiveRole(user.rol);
      }
    });
    return unsubscribe;
  }, []);

  const handleNavigate = (view: ActiveView, projectId?: string) => {
    if (projectId) {
      setSelectedProjectId(projectId);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Inicia o retoma el formulario de proyecto fusionando los datos preseleccionados
   * sin sobrescribir ni borrar los datos que el cliente ya haya ingresado previamente.
   */
  const handleStartProjectWithPrefill = (prefill?: WizardPrefill) => {
    if (prefill) {
      setWizardPrefill((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(prefill).filter(([, value]) => value !== undefined && value !== '')
        ),
      }));
    }
    setCurrentView('crear-proyecto');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSectionOnHome = (sectionId: string) => {
    if (currentView !== 'inicio') {
      setCurrentView('inicio');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 90);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleExploreColors = (filter?: Omit<ColorExplorerFilterRequest, 'timestamp'>) => {
    setColorExplorerRequest({
      ...(filter || {}),
      timestamp: Date.now(),
    });
    scrollToSectionOnHome('encuentra-tu-color');
  };

  const handleExploreInspiration = () => {
    scrollToSectionOnHome('inspiracion');
  };

  const handleSelectCategory = (category: SolutionCategoryKey) => {
    setSelectedCategory(category);
    setCatalogSearchQuery('');
  };

  const handleSearchSubmit = (query: string) => {
    const q = query
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (
      q.includes('color') ||
      q.includes('paleta') ||
      q.includes('tono') ||
      q.includes('salvia') ||
      q.includes('marfil') ||
      q.includes('terracota')
    ) {
      handleExploreColors();
      return;
    }
    if (q.includes('inspiracion') || q.includes('ambiente') || q.includes('idea')) {
      handleExploreInspiration();
      return;
    }
    if (q.includes('seguimiento') || q.includes('expediente') || q.includes('mis proyectos')) {
      handleNavigate('mis-proyectos');
      return;
    }
    if (q.includes('humedad') || q.includes('impermeab') || q.includes('filtrac') || q.includes('cubierta')) {
      setSelectedCategory('HUMEDAD');
    } else if (q.includes('fisura') || q.includes('grieta') || q.includes('rajadura')) {
      setSelectedCategory('FISURAS');
    } else if (q.includes('fachada') || q.includes('exterior')) {
      setSelectedCategory('EXTERIOR');
    } else if (q.includes('interior') || q.includes('sala') || q.includes('habitaci')) {
      setSelectedCategory('INTERIOR');
    } else if (q.includes('preparaci') || q.includes('estuco') || q.includes('lijado')) {
      setSelectedCategory('PREPARACION');
    } else if (q.includes('herramienta') || q.includes('rodillo') || q.includes('brocha')) {
      setSelectedCategory('HERRAMIENTAS');
    } else if (q.includes('decorativ') || q.includes('textura')) {
      setSelectedCategory('DECORATIVOS');
    } else {
      setSelectedCategory('TODAS');
    }
    setCatalogSearchQuery(query);
    handleNavigate('soluciones');
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentView('detalle-proyecto');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSwitchRole = (role: UserRole) => {
    authService.switchRole(role);
    setActiveRole(role);
  };

  const isInternalView =
    currentView.startsWith('tecnico-') ||
    currentView.startsWith('comercial-') ||
    currentView.startsWith('operaciones-') ||
    currentView.startsWith('admin-');

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#15243B] flex flex-col font-sans selection:bg-[#08B6CC] selection:text-white">
      {/* Diagnóstico técnico de Supabase reservado exclusivamente a administración interna */}
      {activeRole === 'administrador' && (
        <DevSupabaseDiagnostic
          onDataLoaded={() => {
            projectService.syncFromSupabase();
          }}
          onOpenAuthModal={() => setAuthModalOpen(true)}
        />
      )}

      {/* Encabezado comercial en 3 niveles */}
      <Navbar
        currentView={currentView}
        selectedCategory={selectedCategory}
        onNavigate={handleNavigate}
        onSelectCategory={handleSelectCategory}
        onSearchSubmit={handleSearchSubmit}
        onExploreColors={handleExploreColors}
        onExploreInspiration={handleExploreInspiration}
        onOpenAssistant={() => setAssistantOpen(true)}
        currentUser={currentUser}
        activeRole={activeRole}
        onOpenSupabaseModal={() => setSupabaseModalOpen(true)}
        onOpenAuthModal={() => setAuthModalOpen(true)}
      />

      {/* Área principal dinámica */}
      <main className="flex-1">
        {currentView === 'inicio' && (
          <LandingView
            onNavigate={handleNavigate}
            onSelectCategory={(cat) => {
              handleSelectCategory(cat);
              handleNavigate('soluciones');
            }}
            onExploreColors={handleExploreColors}
            onStartProjectWithPrefill={handleStartProjectWithPrefill}
            onOpenAssistant={() => setAssistantOpen(true)}
            onSwitchRole={handleSwitchRole}
            onOpenSupabaseModal={() => setSupabaseModalOpen(true)}
            activeRole={activeRole}
            colorExplorerRequest={colorExplorerRequest}
          />
        )}

        {currentView === 'como-funciona' && (
          <HowItWorksView onNavigate={handleNavigate} />
        )}

        {currentView === 'soluciones' && (
          <SolutionsCatalogView
            onNavigate={handleNavigate}
            onOpenAssistant={() => setAssistantOpen(true)}
            initialCategory={selectedCategory}
            searchQuery={catalogSearchQuery}
            onClearSearch={() => setCatalogSearchQuery('')}
            onStartProjectWithPrefill={handleStartProjectWithPrefill}
          />
        )}

        {currentView === 'crear-proyecto' && (
          <NewProjectWizard
            prefill={wizardPrefill}
            onSuccess={(id) => {
              setWizardPrefill(undefined);
              handleSelectProject(id);
            }}
            onCancel={() => {
              handleNavigate(activeRole === 'cliente' ? 'inicio' : 'mis-proyectos');
            }}
          />
        )}

        {currentView === 'mis-proyectos' && (
          <ProjectsListView
            onSelectProject={handleSelectProject}
            onCreateProject={() => handleStartProjectWithPrefill(undefined)}
          />
        )}

        {currentView === 'seguimiento' && (
          <ProjectsListView
            onSelectProject={handleSelectProject}
            onCreateProject={() => handleStartProjectWithPrefill(undefined)}
            title="Seguimiento de proyectos"
            subtitle="Consulta el estado actual, evidencias registradas, orientación técnica y próxima actividad de cada proyecto."
          />
        )}

        {currentView === 'detalle-proyecto' && (
          <ProjectDetailView
            projectId={selectedProjectId}
            onBack={() => {
              if (activeRole === 'tecnico') handleNavigate('tecnico-proyectos');
              else if (activeRole === 'comercial') handleNavigate('comercial-proyectos');
              else if (activeRole === 'operaciones') handleNavigate('operaciones-proyectos');
              else if (activeRole === 'administrador') handleNavigate('admin-dashboard');
              else handleNavigate('mis-proyectos');
            }}
          />
        )}

        {currentView === 'colorlink-ia' && (
          <ColorlinkAIView
            onApplyToNewProject={(data) => {
              handleStartProjectWithPrefill({
                descripcionProblema: data?.recomendacionPreliminar,
              });
            }}
          />
        )}

        {/* Módulos internos especializados reservados exclusivamente para roles autorizados */}
        {isInternalView && (
          <div className="bg-slate-950 text-slate-100 min-h-[75vh]">
            {currentView === 'tecnico-proyectos' && (
              <TechnicalPanelView onSelectProject={handleSelectProject} subview="proyectos" />
            )}
            {currentView === 'tecnico-diagnosticos' && (
              <TechnicalPanelView onSelectProject={handleSelectProject} subview="diagnosticos" />
            )}
            {currentView === 'tecnico-soluciones' && (
              <TechnicalPanelView onSelectProject={handleSelectProject} subview="soluciones" />
            )}
            {currentView === 'tecnico-evidencias' && (
              <TechnicalPanelView onSelectProject={handleSelectProject} subview="evidencias" />
            )}

            {currentView === 'comercial-clientes' && (
              <CommercialPanelView onSelectProject={handleSelectProject} subview="clientes" />
            )}
            {currentView === 'comercial-proyectos' && (
              <CommercialPanelView onSelectProject={handleSelectProject} subview="proyectos" />
            )}
            {currentView === 'comercial-cotizaciones' && (
              <CommercialPanelView onSelectProject={handleSelectProject} subview="cotizaciones" />
            )}

            {currentView === 'operaciones-proyectos' && (
              <OperationsPanelView onSelectProject={handleSelectProject} subview="proyectos" />
            )}
            {currentView === 'operaciones-inventario' && (
              <OperationsPanelView onSelectProject={handleSelectProject} subview="inventario" />
            )}
            {currentView === 'operaciones-abastecimiento' && (
              <OperationsPanelView onSelectProject={handleSelectProject} subview="abastecimiento" />
            )}
            {currentView === 'operaciones-servicios' && (
              <OperationsPanelView onSelectProject={handleSelectProject} subview="servicios" />
            )}
            {currentView === 'operaciones-calidad' && (
              <OperationsPanelView onSelectProject={handleSelectProject} subview="calidad" />
            )}

            {currentView === 'admin-dashboard' && (
              <AdminDashboardView onSelectProject={handleSelectProject} subview="dashboard" />
            )}
            {currentView === 'admin-proyectos' && (
              <div className="bg-[#FAFAF7] text-[#15243B]">
                <ProjectsListView
                  onSelectProject={handleSelectProject}
                  onCreateProject={() => handleStartProjectWithPrefill(undefined)}
                  title="Consola General de Proyectos"
                  subtitle="Supervisión integral de todos los expedientes registrados en la plataforma."
                />
              </div>
            )}
            {currentView === 'admin-clientes' && (
              <CommercialPanelView onSelectProject={handleSelectProject} subview="clientes" />
            )}
            {currentView === 'admin-inventario' && (
              <OperationsPanelView onSelectProject={handleSelectProject} subview="inventario" />
            )}
            {currentView === 'admin-abastecimiento' && (
              <OperationsPanelView onSelectProject={handleSelectProject} subview="abastecimiento" />
            )}
            {currentView === 'admin-servicios' && (
              <OperationsPanelView onSelectProject={handleSelectProject} subview="servicios" />
            )}
            {currentView === 'admin-calidad' && (
              <OperationsPanelView onSelectProject={handleSelectProject} subview="calidad" />
            )}
            {currentView === 'admin-usuarios' && (
              <AdminDashboardView onSelectProject={handleSelectProject} subview="usuarios" />
            )}
            {currentView === 'admin-reportes' && (
              <AdminDashboardView onSelectProject={handleSelectProject} subview="reportes" />
            )}
            {currentView === 'admin-configuracion' && (
              <AdminDashboardView onSelectProject={handleSelectProject} subview="configuracion" />
            )}
          </div>
        )}

        {/* Perfil de usuario */}
        {currentView === 'perfil' && (
          <UserProfileView
            currentUser={currentUser}
            activeRole={activeRole}
            onRoleSwitch={handleSwitchRole}
            onOpenSupabaseModal={() => setSupabaseModalOpen(true)}
          />
        )}
      </main>

      {/* Pie de página comercial */}
      <Footer
        onNavigate={handleNavigate}
        onSelectCategory={handleSelectCategory}
        onExploreColors={handleExploreColors}
        onExploreInspiration={handleExploreInspiration}
        onOpenAssistant={() => setAssistantOpen(true)}
        onOpenSupabaseModal={() => setSupabaseModalOpen(true)}
        onSwitchRole={handleSwitchRole}
        activeRole={activeRole}
      />

      {/* Agente flotante compacto COLORLINK IA */}
      <FloatingAssistantWidget
        isOpen={assistantOpen}
        onOpen={() => setAssistantOpen(true)}
        onClose={() => setAssistantOpen(false)}
        onNavigate={handleNavigate}
        onSelectCategory={handleSelectCategory}
        onExploreColors={handleExploreColors}
        onStartProjectWithPrefill={handleStartProjectWithPrefill}
      />

      {/* Modal de Estado de Conexión Supabase (Administración) */}
      <SupabaseStatusModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
      />

      {/* Modal de Autenticación */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <AuthView
            onSuccess={() => setAuthModalOpen(false)}
            onClose={() => setAuthModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
