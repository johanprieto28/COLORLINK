import React, { useState } from 'react';
import { CheckCircle2, Mail, MessageSquare, Search, XCircle } from 'lucide-react';
import type { EstadoSistema, UserProfile, UserRole } from '../../../types';
import { ROLE_LABELS } from '../../../types';
import { api, errorMessage } from '../../../lib/api';
import { useApi } from '../../../lib/useApi';
import { fecha, normalizar } from '../../../lib/format';
import { useAuth } from '../../../stores/auth';
import { Card, ErrorBox, Input, Select, Spinner, toast } from '../../ui';

export const UsuariosSection: React.FC = () => {
  const { user: yo } = useAuth();
  const { data: usuarios, setData, loading, error, reload } = useApi<UserProfile[]>('/panel/usuarios');
  const [filtro, setFiltro] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const actualizar = async (u: UserProfile, cambios: Partial<Pick<UserProfile, 'rol' | 'activo'>>) => {
    setBusy(u.id);
    try {
      const actualizado = await api.patch<UserProfile>(`/panel/usuarios/${u.id}`, cambios);
      setData((list) => list?.map((x) => (x.id === actualizado.id ? actualizado : x)) || null);
      toast(`${actualizado.nombre_completo} actualizado.`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const q = normalizar(filtro);
  const lista = (usuarios || []).filter((u) => !q || normalizar(`${u.nombre_completo} ${u.email}`).includes(q));

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Toda persona que se registra entra como <strong>cliente</strong>. Asigna aquí el rol del personal interno; el cambio aplica en su
        siguiente acción.
      </p>
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar por nombre o correo" className="pl-9" aria-label="Buscar usuarios" />
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-[#E7EAF0]">
              <th className="px-4 py-3 font-semibold">Usuario</th>
              <th className="px-4 py-3 font-semibold">Rol</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Registro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7EAF0]">
            {lista.map((u) => {
              const esYo = u.id === yo?.id;
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-[#092653]">{u.nombre_completo || '—'}</span>
                    {esYo && <span className="ml-2 text-[11px] text-[#155EEF]">(tú)</span>}
                    <span className="block text-xs text-slate-500">{u.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={u.rol}
                      disabled={esYo || busy === u.id}
                      onChange={(e) => actualizar(u, { rol: e.target.value as UserRole })}
                      className="!w-auto !py-1.5"
                      aria-label={`Rol de ${u.nombre_completo}`}
                    >
                      {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={esYo || busy === u.id}
                      onClick={() => actualizar(u, { activo: !u.activo })}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                        u.activo ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {u.activo ? 'Activo' : 'Desactivado'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fecha(u.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

interface SistemaData {
  estado: EstadoSistema;
  correos: Array<{ id: string; destinatario: string; asunto: string; estado: string; error?: string | null; created_at: string }>;
  conversaciones: Array<{ id: string; pregunta: string; respuesta: string; motor: string; vista?: string | null; created_at: string }>;
}

const Servicio: React.FC<{ nombre: string; ok: boolean; detalle: string }> = ({ nombre, ok, detalle }) => (
  <Card className="p-4 flex items-start gap-3">
    {ok ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
    <div>
      <p className="font-semibold text-[#092653]">{nombre}</p>
      <p className="text-xs text-slate-600">{detalle}</p>
    </div>
  </Card>
);

export const SistemaSection: React.FC = () => {
  const { data, loading, error, reload } = useApi<SistemaData>('/panel/sistema');
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error || 'Sin datos.'} onRetry={reload} />;
  const { estado } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Servicio nombre="Base de datos (Supabase)" ok={estado.supabase.ok} detalle={estado.supabase.detalle} />
        <Servicio nombre={`Asistente IA (${estado.gemini.modelo})`} ok={estado.gemini.ok} detalle={estado.gemini.detalle} />
        <Servicio nombre={`Correo (${estado.correo.proveedor})`} ok={estado.correo.ok} detalle={estado.correo.detalle} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <Card className="p-5 space-y-3">
          <h2 className="font-display font-bold text-[#092653] flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#155EEF]" /> Últimos correos
          </h2>
          {data.correos.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no se han enviado correos.</p>
          ) : (
            <ul className="divide-y divide-[#E7EAF0] text-sm">
              {data.correos.map((c) => (
                <li key={c.id} className="py-2.5">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-[#092653] truncate">{c.asunto}</span>
                    <span
                      className={`text-[11px] font-bold shrink-0 ${c.estado === 'ENVIADO' ? 'text-emerald-700' : c.estado === 'FALLIDO' ? 'text-rose-600' : 'text-slate-500'}`}
                    >
                      {c.estado.toLowerCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {c.destinatario} · {fecha(c.created_at, true)}
                  </p>
                  {c.error && c.estado === 'FALLIDO' && <p className="text-xs text-rose-600">{c.error}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-display font-bold text-[#092653] flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#08B6CC]" /> Consultas recientes al asistente
          </h2>
          {data.conversaciones.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no hay conversaciones.</p>
          ) : (
            <ul className="divide-y divide-[#E7EAF0] text-sm">
              {data.conversaciones.map((c) => (
                <li key={c.id} className="py-2.5 space-y-1">
                  <p className="font-medium text-[#092653]">“{c.pregunta}”</p>
                  <p className="text-xs text-slate-600 line-clamp-2">{c.respuesta}</p>
                  <p className="text-[11px] text-slate-400">
                    {c.motor === 'GEMINI' ? 'Gemini' : c.motor === 'BASICO' ? 'Respuesta básica' : c.motor} · {c.vista || '—'} · {fecha(c.created_at, true)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};
