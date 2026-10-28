import React from 'react';
import { Shield, LogOut } from 'lucide-react';
import { UserProfile, UserRole } from '../../types';
import { authService } from '../../services/auth/authService';
import { getRoleBadge } from '../common/Badge';

interface UserProfileViewProps {
  currentUser: UserProfile;
  activeRole: UserRole;
  onRoleSwitch: (role: UserRole) => void;
  onOpenSupabaseModal: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  currentUser,
  activeRole,
  onRoleSwitch,
  onOpenSupabaseModal,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-[#0891B2]">
          Mi cuenta
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] tracking-tight">
          Perfil del usuario
        </h1>
        <p className="text-sm text-slate-600">
          Consulta tu información de contacto y gestiona las preferencias de tu sesión en COLORLINK.
        </p>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0B1F3A] flex items-center justify-center text-white text-2xl font-bold shadow-sm">
              {currentUser.nombre_completo.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#0B1F3A]">
                {currentUser.nombre_completo}
              </h2>
              <p className="text-xs text-slate-500">{currentUser.email}</p>
              <div className="mt-2">{getRoleBadge(activeRole)}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => authService.signOut()}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold inline-flex items-center gap-2 self-start sm:self-center transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-[#FAF9F6] rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-slate-500 text-[11px] block">Empresa u organización</span>
            <span className="text-[#0B1F3A] font-bold text-sm">
              {currentUser.empresa || 'Proyecto personal / Residencial'}
            </span>
          </div>

          <div className="p-4 bg-[#FAF9F6] rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-slate-500 text-[11px] block">Actividad o cargo</span>
            <span className="text-[#1D4ED8] font-bold text-sm">
              {currentUser.cargo || 'Usuario registrado'}
            </span>
          </div>

          <div className="p-4 bg-[#FAF9F6] rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-slate-500 text-[11px] block">Teléfono de contacto</span>
            <span className="text-[#0B1F3A] font-semibold text-sm tabular-nums">
              {currentUser.telefono || 'Sin registrar'}
            </span>
          </div>

          <div className="p-4 bg-[#FAF9F6] rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-slate-500 text-[11px] block">Documento / NIT</span>
            <span className="text-[#0B1F3A] font-semibold text-sm tabular-nums">
              {currentUser.documento_nit || 'Sin registrar'}
            </span>
          </div>
        </div>

        {/* Selector de perspectiva multi-rol conservado para validación funcional de permisos */}
        <div className="pt-5 border-t border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Perspectiva de rol activa
            </span>
            <span className="text-xs text-slate-500">
              Las herramientas internas solo se habilitan en roles autorizados
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
            {(['cliente', 'tecnico', 'comercial', 'operaciones', 'administrador'] as UserRole[]).map(
              (role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => onRoleSwitch(role)}
                  className={`p-3 rounded-xl border text-center transition-colors cursor-pointer capitalize font-semibold ${
                    activeRole === role
                      ? 'bg-[#0B1F3A] border-[#0B1F3A] text-white shadow-xs'
                      : 'bg-[#FAF9F6] border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{role}</span>
                  {activeRole === role && (
                    <span className="text-[10px] block text-cyan-300 font-normal mt-0.5">
                      Activo
                    </span>
                  )}
                </button>
              )
            )}
          </div>
        </div>

        <div className="p-4 bg-[#FAF9F6] rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-[#0B1F3A] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#0891B2]" />
              <span>Seguridad y control de acceso por rol</span>
            </span>
            {activeRole === 'administrador' && (
              <button
                type="button"
                onClick={onOpenSupabaseModal}
                className="text-[#1D4ED8] hover:underline font-semibold text-xs cursor-pointer"
              >
                Configuración Supabase
              </button>
            )}
          </div>
          <p className="text-slate-600 leading-relaxed">
            Tus permisos de consulta y registro operan bajo las políticas de seguridad de tu rol
            activo ({activeRole}).
          </p>
        </div>
      </div>
    </div>
  );
};
