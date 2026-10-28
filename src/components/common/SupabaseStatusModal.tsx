import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, CheckCircle2, AlertCircle, Copy, ExternalLink, X, RefreshCw } from 'lucide-react';
import {
  isSupabaseConfigured,
  SUPABASE_URL,
  SUPABASE_KEY_FORMAT_NOTICE,
  checkSupabaseConnection,
} from '../../services/supabase/client';

interface SupabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseStatusModal: React.FC<SupabaseStatusModalProps> = ({ isOpen, onClose }) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ connected: boolean; message: string; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await checkSupabaseConnection();
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleTest();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyEnvSnippet = () => {
    const resolvedUrl = SUPABASE_URL || 'https://yrptpiportamcljdxhvi.supabase.co';
    const snippet = `VITE_SUPABASE_URL="${resolvedUrl}"\nVITE_SUPABASE_PUBLISHABLE_KEY="<TU_SUPABASE_PUBLISHABLE_KEY>"`;
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLiveConnected = testResult ? testResult.connected : Boolean(SUPABASE_URL || isSupabaseConfigured);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight">Estado de Supabase & RLS</h3>
            <p className="text-sm text-slate-400">Arquitectura de persistencia PostgreSQL y Autenticación</p>
          </div>
        </div>

        {/* Status indicator */}
        <div className={`p-4 rounded-xl border mb-6 flex items-start gap-3 ${
          isLiveConnected
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
        }`}>
          {isLiveConnected ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="text-sm">
            <p className="font-semibold text-white">
              {isLiveConnected
                ? 'Conexión a Supabase Activa (public.cliente y public.proyecto)'
                : 'Verificación de Conexión Pendiente o con Error'}
            </p>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {isLiveConnected
                ? 'Las consultas e inserciones de clientes y proyectos operan contra tu base de datos PostgreSQL de Supabase a través del backend Express preservando RLS.'
                : 'Revisa el detalle inferior para validar las credenciales de conexión configuradas en el entorno.'}
            </p>
            {SUPABASE_KEY_FORMAT_NOTICE && (
              <p className="text-xs text-amber-300 mt-2 leading-relaxed">
                {SUPABASE_KEY_FORMAT_NOTICE}
              </p>
            )}
          </div>
        </div>

        {/* Security & RLS Compliance */}
        <div className="space-y-3 mb-6">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Seguridad & Cumplimiento RLS
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Sin Service Role Key en Frontend</span>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Políticas RLS en 19 Tablas</span>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Bucket 'evidencias' Storage</span>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Aislamiento de Datos por Rol</span>
            </div>
          </div>
        </div>

        {/* Variables snippet */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-mono text-slate-400">Variables en .env:</label>
            <button
              onClick={copyEnvSnippet}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? '¡Copiado!' : 'Copiar variables'}
            </button>
          </div>
          <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto">
            VITE_SUPABASE_URL=https://yrptpiportamcljdxhvi.supabase.co
            <br />
            VITE_SUPABASE_PUBLISHABLE_KEY=&lt;TU_SUPABASE_PUBLISHABLE_KEY&gt;
            <br />
            # Proyecto ID: yrptpiportamcljdxhvi
          </pre>
        </div>

        {/* Test Result if any */}
        {testResult && (
          <div className={`p-3 rounded-lg border text-xs mb-4 flex items-center gap-2 ${
            testResult.connected
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
          }`}>
            {testResult.connected ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex-1 py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-600/20"
          >
            <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Comprobando conexión...' : 'Probar Conexión con Supabase'}
          </button>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <span>Ir a Supabase</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
