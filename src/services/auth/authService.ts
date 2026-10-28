import { supabase, isSupabaseConfigured } from '../supabase/client';
import { UserProfile, UserRole } from '../../types';

// Default mock profiles for each role in academic demo mode
export const DEMO_USERS: Record<UserRole, UserProfile> = {
  cliente: {
    id: 'usr-client-001',
    email: 'cliente.proyectos@constructora-andina.com',
    nombre_completo: 'Carlos Eduardo Mendoza',
    empresa: 'Constructora Andina S.A.S.',
    documento_nit: '900.548.120-4',
    telefono: '+57 312 458 9901',
    rol: 'cliente',
    cargo: 'Director de Mantenimiento e Infraestructura',
    created_at: '2026-01-15T10:00:00Z',
  },
  tecnico: {
    id: 'usr-tech-002',
    email: 'ing.patologia@colorlink.tech',
    nombre_completo: 'Ing. Laura Marcela Gómez',
    empresa: 'COLORLINK Ingeniería Técnica',
    documento_nit: '1.020.450.889',
    telefono: '+57 320 890 1234',
    rol: 'tecnico',
    cargo: 'Especialista NACE Coating Inspector Nivel 2',
    created_at: '2026-01-10T08:30:00Z',
  },
  comercial: {
    id: 'usr-com-003',
    email: 'soluciones.comercial@colorlink.tech',
    nombre_completo: 'Alejandro Restrepo V.',
    empresa: 'COLORLINK Comercial',
    documento_nit: '71.340.912',
    telefono: '+57 315 776 5432',
    rol: 'comercial',
    cargo: 'Key Account Manager Recubrimientos Industriales',
    created_at: '2026-01-12T09:00:00Z',
  },
  operaciones: {
    id: 'usr-ops-004',
    email: 'logistica.operaciones@colorlink.tech',
    nombre_completo: 'Jorge Eliécer Cárdenas',
    empresa: 'COLORLINK Operaciones y Logística',
    documento_nit: '79.820.114',
    telefono: '+57 301 223 9988',
    rol: 'operaciones',
    cargo: 'Coordinador de Abastecimiento y Aplicación en Campo',
    created_at: '2026-01-08T07:45:00Z',
  },
  administrador: {
    id: 'usr-adm-005',
    email: 'admin.sistema@colorlink.tech',
    nombre_completo: 'Dra. Valentina Morales P.',
    empresa: 'COLORLINK Corporativo',
    documento_nit: '1.018.665.432',
    telefono: '+57 318 900 4455',
    rol: 'administrador',
    cargo: 'Directora General de Operaciones y Tecnología',
    created_at: '2026-01-01T08:00:00Z',
  },
};

const STORAGE_KEY_CURRENT_ROLE = 'colorlink_active_role';
const STORAGE_KEY_AUTH_USER = 'colorlink_auth_user';

class AuthService {
  private activeRole: UserRole = 'cliente';
  private currentUser: UserProfile | null = null;
  private listeners: Array<(user: UserProfile | null) => void> = [];

  constructor() {
    this.init();
  }

  private init() {
    // Restore saved role or user from localStorage
    const savedRole = localStorage.getItem(STORAGE_KEY_CURRENT_ROLE) as UserRole | null;
    const savedUserJson = localStorage.getItem(STORAGE_KEY_AUTH_USER);

    if (savedUserJson) {
      try {
        this.currentUser = JSON.parse(savedUserJson);
        this.activeRole = this.currentUser?.rol || 'cliente';
      } catch {
        this.activeRole = savedRole && DEMO_USERS[savedRole] ? savedRole : 'cliente';
        this.currentUser = DEMO_USERS[this.activeRole];
      }
    } else {
      this.activeRole = savedRole && DEMO_USERS[savedRole] ? savedRole : 'cliente';
      this.currentUser = DEMO_USERS[this.activeRole];
    }

    // If Supabase is active, check existing session and listen to auth state changes
    if (isSupabaseConfigured) {
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (data?.session?.user) {
            this.loadUserProfileFromSupabase(data.session.user);
          }
        })
        .catch(() => {
          // Session check handled in diagnostics
        });

      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          await this.loadUserProfileFromSupabase(session.user);
        }
      });
    }
  }

  public subscribe(callback: (user: UserProfile | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((callback) => callback(this.currentUser));
  }

  public getCurrentUser(): UserProfile {
    return this.currentUser || DEMO_USERS.cliente;
  }

  public getActiveRole(): UserRole {
    return this.currentUser?.rol || this.activeRole;
  }

  /**
   * Switch demo role (for demonstration and academic verification of the 5 role workflows)
   */
  public switchRole(role: UserRole) {
    this.activeRole = role;
    this.currentUser = { ...DEMO_USERS[role] };
    localStorage.setItem(STORAGE_KEY_CURRENT_ROLE, role);
    localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(this.currentUser));
    this.notify();
  }

  /**
   * Supabase Auth: Sign In
   */
  public async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          await this.loadUserProfileFromSupabase(data.user);
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // Demo mode login
    const matchingRole = (Object.keys(DEMO_USERS) as UserRole[]).find(
      (r) => DEMO_USERS[r].email.toLowerCase() === email.toLowerCase()
    );

    if (matchingRole) {
      this.switchRole(matchingRole);
      return { success: true };
    }

    // If new email in demo mode, authenticate as custom client
    this.currentUser = {
      id: `usr-${Date.now()}`,
      email,
      nombre_completo: email.split('@')[0],
      rol: 'cliente',
      created_at: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(this.currentUser));
    this.notify();
    return { success: true };
  }

  /**
   * Supabase Auth: Sign Up
   */
  public async signUp(
    data: {
      email: string;
      password: string;
      nombreCompleto: string;
      empresa?: string;
      telefono?: string;
      rol: UserRole;
    }
  ): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured) {
      try {
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              nombre_completo: data.nombreCompleto,
              rol: data.rol,
              empresa: data.empresa || '',
              telefono: data.telefono || '',
            },
          },
        });

        if (error) return { success: false, error: error.message };

        if (authData.user) {
          await this.loadUserProfileFromSupabase(authData.user);
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // Demo mode registration
    this.currentUser = {
      id: `usr-new-${Date.now()}`,
      email: data.email,
      nombre_completo: data.nombreCompleto,
      empresa: data.empresa,
      telefono: data.telefono,
      rol: data.rol,
      created_at: new Date().toISOString(),
    };
    this.activeRole = data.rol;
    localStorage.setItem(STORAGE_KEY_CURRENT_ROLE, data.rol);
    localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(this.currentUser));
    this.notify();
    return { success: true };
  }

  /**
   * Supabase Auth: Password Reset Request
   */
  public async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) return { success: false, error: error.message };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return { success: true };
  }

  /**
   * Supabase Auth: Sign Out
   */
  public async signOut(): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signout notice:', err);
      }
    }
    this.switchRole('cliente');
  }

  private async loadUserProfileFromSupabase(user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, any>;
  }) {
    try {
      const email = user.email || '';
      const meta = user.user_metadata || {};
      const validRoles: UserRole[] = [
        'cliente',
        'tecnico',
        'comercial',
        'operaciones',
        'administrador',
      ];
      const metaRole = validRoles.includes(meta.rol) ? (meta.rol as UserRole) : 'cliente';

      let clientMatch: any = null;
      if (email) {
        const { data, error } = await supabase
          .from('cliente')
          .select('*')
          .eq('correo_electrónico', email)
          .limit(1);
        if (!error && data && data.length > 0) {
          clientMatch = data[0];
        }
      }

      this.activeRole = metaRole;
      this.currentUser = {
        id: user.id,
        email,
        nombre_completo:
          clientMatch?.nombre_completo || meta.nombre_completo || email.split('@')[0] || 'Usuario',
        empresa: clientMatch?.nombre_empresa || meta.empresa || '',
        documento_nit: clientMatch?.numero_documento || '',
        telefono: clientMatch?.telefono || meta.telefono || '',
        rol: metaRole,
        created_at: clientMatch?.created_at || new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY_CURRENT_ROLE, this.activeRole);
      localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(this.currentUser));
      this.notify();
    } catch (e) {
      console.warn('Error reading user profile from Supabase:', e);
    }
  }
}

export const authService = new AuthService();
