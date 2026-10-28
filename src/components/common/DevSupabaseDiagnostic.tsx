import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import {
  testSupabaseConnection,
  SupabaseDiagnosticResult,
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL_NORMALIZED,
} from '../../services/supabase';

interface DevSupabaseDiagnosticProps {
  onDataLoaded?: () => void;
  onOpenAuthModal?: () => void;
}

function getMaskedKeySummary(key: string): string {
  if (!key) return 'No configurada en entorno';
  if (key.length <= 12) return `*** (${key.length} caracteres)`;
  return `${key.slice(0, 14)}...*** (${key.length} caracteres)`;
}

export const DevSupabaseDiagnostic: React.FC<DevSupabaseDiagnosticProps> = ({
  onDataLoaded,
  onOpenAuthModal,
}) => {
  const [result, setResult] = useState<SupabaseDiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const res = await testSupabaseConnection();
      setResult(res);
      if (onDataLoaded) {
        onDataLoaded();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Clean up any legacy browser override key so strictly env variables are used
    try {
      localStorage.removeItem('override_supabase_key');
    } catch {
      // ignore storage errors
    }
    runTest();
  }, []);

  if (!import.meta.env.DEV) {
    return null;
  }

  const isConnected = result?.connected === true;
  const isGatewayOk = result?.connectionStatus === 'OK';
  const isClienteOk = result?.clienteStatus === 'OK';
  const isProyectoOk = result?.proyectoStatus === 'OK';
  const hasAnyError =
    Boolean(result?.connectionError) ||
    Boolean(result?.clienteError) ||
    Boolean(result?.proyectoError);

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 text-xs font-mono shadow-md z-30 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Main separate indicators */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-5">
            <div className="flex items-center gap-2 text-slate-400">
              <Database className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-slate-300">DIAGNÓSTICO SUPABASE:</span>
            </div>

            {/* 1. Estado Supabase (solo CONECTADO si Gateway + cliente + proyecto son exitosos) */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Estado Supabase:</span>
              {loading ? (
                <span className="text-cyan-400 animate-pulse flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Consultando...
                </span>
              ) : isConnected ? (
                <span className="px-2 py-0.5 rounded font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> CONECTADO
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded font-bold bg-rose-950 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> ERROR
                </span>
              )}
            </div>

            {/* 2. Tabla public.cliente */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Tabla cliente:</span>
              {loading ? (
                <span className="text-slate-400">...</span>
              ) : isClienteOk ? (
                <span className="px-2 py-0.5 rounded font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  OK ({result?.clienteCount ?? 0})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded font-bold bg-rose-950/80 text-rose-400 border border-rose-500/30">
                  ERROR
                </span>
              )}
            </div>

            {/* 3. Tabla public.proyecto */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Tabla proyecto:</span>
              {loading ? (
                <span className="text-slate-400">...</span>
              ) : isProyectoOk ? (
                <span className="px-2 py-0.5 rounded font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  OK ({result?.proyectoCount ?? 0})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded font-bold bg-rose-950/80 text-rose-400 border border-rose-500/30">
                  ERROR
                </span>
              )}
            </div>

            {/* 4. Sesión Auth */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Sesión:</span>
              {loading ? (
                <span className="text-slate-400">...</span>
              ) : result?.authStatus === 'AUTENTICADO' ? (
                <span className="px-2 py-0.5 rounded font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> {result.authEmail}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  <span>SIN SESIÓN (anon)</span>
                  {onOpenAuthModal && (
                    <button
                      type="button"
                      onClick={onOpenAuthModal}
                      className="underline text-cyan-400 hover:text-cyan-300 ml-1 cursor-pointer"
                    >
                      Autenticar
                    </button>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={runTest}
              disabled={loading}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Volver a validar conexión, public.cliente y public.proyecto"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Reintentar</span>
            </button>

            <button
              onClick={() => setExpanded(!expanded)}
              className="px-2 py-1 text-slate-400 hover:text-white rounded-lg flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
            >
              <span>{expanded ? 'Ocultar Detalle' : 'Detalles'}</span>
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Always-visible real Supabase errors (never hidden behind generic ERROR) */}
        {!loading && hasAnyError && (
          <div className="mt-2 p-2.5 bg-rose-950/40 border border-rose-500/30 rounded-lg text-[11px] text-rose-200 space-y-1">
            {result?.connectionError && (
              <div className="break-words">
                <strong className="text-rose-300">Conexión / API Gateway:</strong>{' '}
                {result.connectionError}
              </div>
            )}
            {result?.clienteError && (
              <div className="break-words">
                <strong className="text-rose-300">Consulta public.cliente:</strong>{' '}
                {result.clienteError}
              </div>
            )}
            {result?.proyectoError && (
              <div className="break-words">
                <strong className="text-rose-300">Consulta public.proyecto:</strong>{' '}
                {result.proyectoError}
              </div>
            )}
          </div>
        )}

        {/* Notice if VITE_SUPABASE_PUBLISHABLE_KEY in browser has format/translation warning while server persistence works */}
        {!loading && result?.frontendKeyWarning && (
          <div className="mt-2 p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-lg text-[11px] text-amber-200 break-words">
            <strong className="text-amber-300">Aviso Clave Pública Frontend:</strong>{' '}
            {result.frontendKeyWarning}
          </div>
        )}

        {/* Expanded Diagnostics Drawer */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-800 space-y-3 animate-in fade-in duration-150 text-[11px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Endpoint Details */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-semibold">
                  Variables de Entorno y Canal Activo:
                </span>
                <div className="text-slate-300">
                  <span className="text-slate-400">Canal de Persistencia: </span>
                  <span className="text-cyan-400">
                    {result?.channelMode === 'SERVER_API'
                      ? 'Backend Express (/api/supabase/*)'
                      : result?.channelMode === 'BROWSER_DIRECT'
                      ? 'Cliente Navegador Directo'
                      : 'Con errores'}
                  </span>
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-400">URL Resuelta: </span>
                  <span className="text-cyan-400">{SUPABASE_URL || 'No configurada'}</span>
                </div>
                {SUPABASE_URL_NORMALIZED && result?.rawEnvUrl && (
                  <div className="text-slate-400 text-[10px]">
                    <span>VITE_SUPABASE_URL en entorno: </span>
                    <span className="text-amber-300">{result.rawEnvUrl}</span>{' '}
                    <span>(normalizada a HTTPS desde Project ID)</span>
                  </div>
                )}
                <div className="text-slate-300 truncate">
                  <span className="text-slate-400">VITE_SUPABASE_PUBLISHABLE_KEY: </span>
                  <span className="text-slate-300 font-mono">
                    {getMaskedKeySummary(SUPABASE_PUBLISHABLE_KEY)}
                  </span>
                </div>
                <div className="text-slate-400 text-[10px]">
                  Probado a las: {result?.testedAt?.replace('T', ' ').slice(0, 19)} UTC
                </div>
              </div>

              {/* Status / Summary */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-semibold">Detalle por Operación:</span>
                <div className={isGatewayOk ? 'text-emerald-400' : 'text-rose-400'}>
                  • Gateway Auth/REST:{' '}
                  {isGatewayOk ? 'OK (HTTP 200)' : result?.connectionError || 'Sin respuesta'}
                </div>
                <div className={isClienteOk ? 'text-emerald-400' : 'text-rose-400'}>
                  • SELECT public.cliente:{' '}
                  {isClienteOk
                    ? `OK (${result?.clienteCount ?? 0} registros)`
                    : result?.clienteError}
                </div>
                <div className={isProyectoOk ? 'text-emerald-400' : 'text-rose-400'}>
                  • SELECT public.proyecto:{' '}
                  {isProyectoOk
                    ? `OK (${result?.proyectoCount ?? 0} registros)`
                    : result?.proyectoError}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
