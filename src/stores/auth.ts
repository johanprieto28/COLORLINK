import { useSyncExternalStore } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClientChannel, UserProfile } from '../types';
import { api, errorMessage } from '../lib/api';
import { getSupabase } from '../lib/supabase';

/**
 * Estado de sesión. El perfil (y su rol) siempre se lee del backend (/api/cuenta),
 * que lo toma de public.perfiles: el navegador no puede elegir su propio rol.
 */
interface AuthState {
  status: 'cargando' | 'anonimo' | 'autenticado';
  user: UserProfile | null;
  /** false si el servidor no tiene configurado Supabase Auth */
  authDisponible: boolean;
  /** Se pidió iniciar sesión (abre el modal) con un mensaje opcional */
  loginRequest: { motivo?: string; modo: 'login' | 'register' } | null;
}

/** Datos de identificación del formulario de registro (formulario mínimo viable) */
export type TipoPersona = 'NATURAL' | 'JURIDICA';

export interface DatosRegistro {
  email: string;
  token: string;
  tipoPersona: TipoPersona;
  /** Persona natural: el titular. Persona jurídica: la persona de contacto */
  nombres: string;
  apellidos: string;
  /** CC, CE, PPT, PA, TI o NIT */
  tipoDocumento: string;
  documento: string;
  razonSocial?: string;
  cargo?: string;
  /** Nombre oficial del catálogo de ciudades */
  ciudad: string;
  direccion: string;
  telefono: string;
  canal: ClientChannel;
  password: string;
  aceptaDatos: boolean;
}

let state: AuthState ={ status: 'cargando', user: null, authDisponible: true, loginRequest: null };
const listeners = new Set<() => void>();
type AuthChangeCallback = (user: UserProfile | null) => void;
const authChangeCallbacks = new Set<AuthChangeCallback>();

function setState(patch: Partial<AuthState>) {
  const prevUserId = state.user?.id ?? null;
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
  if ((state.user?.id ?? null) !== prevUserId) {
    authChangeCallbacks.forEach((cb) => cb(state.user));
  }
}

async function loadProfile() {
  try {
    const user = await api.get<UserProfile>('/cuenta');
    setState({ status: 'autenticado', user });
  } catch (err) {
    console.warn('[auth] No se pudo cargar el perfil:', errorMessage(err));
    setState({ status: 'anonimo', user: null });
  }
}

getSupabase().then(async (supabase) => {
  if (!supabase) {
    setState({ status: 'anonimo', authDisponible: false });
    return;
  }
  const { data } = await supabase.auth.getSession();
  if (data.session) await loadProfile();
  else setState({ status: 'anonimo' });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      setState({ status: 'anonimo', user: null });
    } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
      // Diferido para no llamar a Supabase dentro del callback de auth
      setTimeout(loadProfile, 0);
    }
  });
});

async function requireClient(): Promise<SupabaseClient> {
  const supabase = await getSupabase();
  if (!supabase) {
    throw new Error('El inicio de sesión no está disponible: falta configurar Supabase en el servidor.');
  }
  return supabase;
}

function traducirErrorAuth(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Correo o contraseña incorrectos.';
  if (/email not confirmed/i.test(message)) return 'Debes confirmar tu correo antes de ingresar. Revisa tu bandeja de entrada.';
  if (/already registered|already been registered/i.test(message)) return 'Ya existe una cuenta con ese correo. Inicia sesión.';
  if (/password should be at least/i.test(message)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/rate limit/i.test(message)) return 'Demasiados intentos. Espera unos minutos.';
  return message;
}

export const authStore = {
  getState: () => state,

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Se ejecuta cuando cambia el usuario (login, logout o cambio de cuenta) */
  onUserChange(cb: AuthChangeCallback) {
    authChangeCallbacks.add(cb);
    return () => authChangeCallbacks.delete(cb);
  },

  requestLogin(motivo?: string, modo: 'login' | 'register' = 'login') {
    setState({ loginRequest: { motivo, modo } });
  },

  closeLogin() {
    setState({ loginRequest: null });
  },

  async signIn(email: string, password: string) {
    const { error } = await (await requireClient()).auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(traducirErrorAuth(error.message));
    await loadProfile();
  },

  /** Registro paso 1: envía al correo un código de 6 dígitos. Devuelve los minutos de vigencia. */
  async enviarCodigoRegistro(email: string) {
    const res = await api.post<{ minutos: number }>('/registro/codigo', { email: email.trim() });
    return res.minutos;
  },

  /** Registro paso 2: comprueba el código y devuelve el token que autoriza crear la cuenta */
  async verificarCodigoRegistro(email: string, codigo: string) {
    const res = await api.post<{ token: string }>('/registro/verificar', { email: email.trim(), codigo });
    return res.token;
  },

  /** Registro paso 3: crea la cuenta (correo ya verificado) e inicia sesión */
  async signUp(data: DatosRegistro) {
    await api.post('/registro', { ...data, email: data.email.trim() });
    await authStore.signIn(data.email, data.password);
  },

  async resetPassword(email: string) {
    const { error } = await (await requireClient()).auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/#/cuenta/seguridad`,
    });
    if (error) throw new Error(traducirErrorAuth(error.message));
  },

  async updatePassword(password: string) {
    const { error } = await (await requireClient()).auth.updateUser({ password });
    if (error) throw new Error(traducirErrorAuth(error.message));
  },

  async signOut() {
    await (await getSupabase())?.auth.signOut();
    setState({ status: 'anonimo', user: null });
  },

  setUser(user: UserProfile) {
    setState({ user });
  },
};

export function useAuth() {
  return useSyncExternalStore(authStore.subscribe, authStore.getState);
}

export function isStaffRole(user: UserProfile | null): boolean {
  return Boolean(user && user.rol !== 'cliente');
}
