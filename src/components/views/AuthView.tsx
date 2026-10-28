import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Building,
  Phone,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  X,
} from 'lucide-react';
import { UserRole } from '../../types';
import { authService, DEMO_USERS } from '../../services/auth/authService';

interface AuthViewProps {
  onSuccess: () => void;
  onClose?: () => void;
  initialMode?: 'login' | 'register' | 'forgot';
}

export const AuthView: React.FC<AuthViewProps> = ({
  onSuccess,
  onClose,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [telefono, setTelefono] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('cliente');

  const handleQuickLogin = (role: UserRole) => {
    const demo = DEMO_USERS[role];
    setEmail(demo.email);
    setPassword('Demo123456*');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'login') {
        const res = await authService.signIn(email, password);
        if (res.success) {
          onSuccess();
        } else {
          setErrorMsg(res.error || 'Credenciales inválidas');
        }
      } else if (mode === 'register') {
        const res = await authService.signUp({
          email,
          password,
          nombreCompleto,
          empresa,
          telefono,
          rol: selectedRole,
        });
        if (res.success) {
          setSuccessMsg('Registro completado. Bienvenido a COLORLINK.');
          setTimeout(() => onSuccess(), 900);
        } else {
          setErrorMsg(res.error || 'Error al registrar usuario');
        }
      } else if (mode === 'forgot') {
        const res = await authService.resetPassword(email);
        if (res.success) {
          setSuccessMsg('Se ha enviado un enlace de recuperación a tu correo electrónico.');
        } else {
          setErrorMsg(res.error || 'Error al solicitar recuperación');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-900 relative">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ventana"
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0B1F3A] text-cyan-400 mb-3">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-extrabold text-[#0B1F3A] tracking-tight">
          {mode === 'login' && 'Ingresa a tu cuenta'}
          {mode === 'register' && 'Crear cuenta en COLORLINK'}
          {mode === 'forgot' && 'Recuperar contraseña'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {mode === 'login' && 'Accede a tus proyectos, colores guardados y seguimiento en línea'}
          {mode === 'register' && 'Regístrate para crear y dar seguimiento a tus proyectos'}
          {mode === 'forgot' && 'Ingresa tu correo electrónico para restablecer tu acceso'}
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="break-words">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {mode === 'login' && (
        <div className="mb-5 p-3 bg-[#FAF9F6] border border-slate-200 rounded-2xl space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Autocompletar perfil de prueba:
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            {(['cliente', 'tecnico', 'comercial', 'operaciones', 'administrador'] as UserRole[]).map(
              (r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleQuickLogin(r)}
                  className="py-1.5 px-2 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 font-medium capitalize transition-colors cursor-pointer"
                >
                  {r}
                </button>
              )
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nombre completo *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="Ej. Laura Gómez"
                  className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Empresa</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Teléfono</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+57 300 000 0000"
                    className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Tipo de perfil *
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
              >
                <option value="cliente">Cliente (Proyectos y seguimiento)</option>
                <option value="tecnico">Técnico especialista</option>
                <option value="comercial">Asesor comercial</option>
                <option value="operaciones">Operaciones</option>
                <option value="administrador">Administrador</option>
              </select>
            </div>
          </>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Correo electrónico *
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@correo.com"
              className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
            />
          </div>
        </div>

        {mode !== 'forgot' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Contraseña *</label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
                >
                  ¿Olvidaste tu clave?
                </button>
              )}
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-[#0891B2] hover:bg-[#0E7490] text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
        >
          <span>
            {loading
              ? 'Procesando...'
              : mode === 'login'
              ? 'Iniciar sesión'
              : mode === 'register'
              ? 'Crear cuenta'
              : 'Enviar enlace'}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
        {mode === 'login' ? (
          <div>
            ¿Aún no tienes cuenta?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-[#1D4ED8] hover:underline font-bold cursor-pointer"
            >
              Regístrate aquí
            </button>
          </div>
        ) : (
          <div>
            ¿Ya tienes cuenta?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-[#1D4ED8] hover:underline font-bold cursor-pointer"
            >
              Inicia sesión
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5 text-[#0891B2]" />
        <span>Autenticación gestionada con Supabase Auth</span>
      </div>
    </div>
  );
};
