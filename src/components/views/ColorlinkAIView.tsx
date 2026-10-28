import React, { useState } from 'react';
import {
  Sparkles,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import { HumidityLevel, WearLevel } from '../../types';
import { runColorlinkAIDiagnosis, AIDiagnosisResult } from '../../services/diagnostics/diagnosticService';
import { getSeverityBadge, getComplexityBadge } from '../common/Badge';

interface ColorlinkAIViewProps {
  onApplyToNewProject: (diagnosticoData: any) => void;
}

export const ColorlinkAIView: React.FC<ColorlinkAIViewProps> = ({ onApplyToNewProject }) => {
  const [surfaceType, setSurfaceType] = useState('MAMPOSTERIA');
  const [area, setArea] = useState<number>(80);
  const [humidity, setHumidity] = useState<HumidityLevel>('MEDIA');
  const [cracks, setCracks] = useState<boolean>(true);
  const [wear, setWear] = useState<WearLevel>('MODERADO');
  const [detachment, setDetachment] = useState<boolean>(false);
  const [environment, setEnvironment] = useState<
    'RESIDENCIAL' | 'COMERCIAL' | 'INDUSTRIAL' | 'MARINO' | 'HOSPITALARIO'
  >('RESIDENCIAL');
  const [locationType, setLocationType] = useState<'INTERIOR' | 'EXTERIOR' | 'MIXTO'>('INTERIOR');
  const [problemDescription, setProblemDescription] = useState(
    'Pared interior con manchas puntuales de humedad y fisuras superficiales en el estuco cerca de los marcos de ventana.'
  );

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIDiagnosisResult | null>(null);

  const handleEvaluate = async () => {
    setLoading(true);
    try {
      const diag = await runColorlinkAIDiagnosis({
        tipoSuperficie: surfaceType,
        areaAproximada: area,
        ambiente: environment,
        ubicacion: locationType,
        humedad: humidity,
        fisuras: cracks,
        desgaste: wear,
        desprendimiento: detachment,
        descripcionProblema: problemDescription,
      });
      setResult(diag);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Encabezado */}
      <div className="max-w-3xl space-y-2.5">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0891B2]">
          <Sparkles className="w-4 h-4" />
          <span>COLORLINK IA · Tu asistente de soluciones</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B1F3A] tracking-tight">
          Orientación inteligente para tus superficies
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Describe las condiciones que observas en tu pared, fachada o piso para obtener una
          orientación estructurada antes de registrar tu proyecto.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna izquierda: formulario claro */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5">
            <Sliders className="w-4 h-4 text-[#1D4ED8]" />
            <h2 className="text-sm font-bold text-[#0B1F3A]">
              Condiciones del espacio y la superficie
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-slate-700 font-semibold block mb-1.5">Tipo de superficie</label>
              <select
                value={surfaceType}
                onChange={(e) => setSurfaceType(e.target.value)}
                className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
              >
                <option value="MAMPOSTERIA">Mampostería / Estuco / Ladrillo</option>
                <option value="CONCRETO">Concreto / Losa</option>
                <option value="DRYWALL">Drywall / Yeso</option>
                <option value="MADERA">Madera</option>
                <option value="ACERO_CARBONO">Metal / Acero</option>
                <option value="ACERO_GALVANIZADO">Acero Galvanizado</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">
                  Área aproximada (m²)
                </label>
                <input
                  type="number"
                  min="1"
                  value={area}
                  onChange={(e) => setArea(Number(e.target.value))}
                  className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 tabular-nums focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Tipo de ambiente</label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as any)}
                  className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                >
                  <option value="RESIDENCIAL">Hogar / Residencial</option>
                  <option value="COMERCIAL">Comercial / Oficinas</option>
                  <option value="INDUSTRIAL">Industrial</option>
                  <option value="MARINO">Costero / Marino</option>
                  <option value="HOSPITALARIO">Institucional / Salud</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Ubicación</label>
                <select
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value as any)}
                  className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                >
                  <option value="INTERIOR">Interior</option>
                  <option value="EXTERIOR">Exterior / Fachada</option>
                  <option value="MIXTO">Mixto</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Humedad observada</label>
                <select
                  value={humidity}
                  onChange={(e) => setHumidity(e.target.value as HumidityLevel)}
                  className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                >
                  <option value="BAJA">Baja (Seco)</option>
                  <option value="MEDIA">Media (Manchas leves)</option>
                  <option value="ALTA">Alta (Filtración activa)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1.5">Desgaste visible</label>
              <select
                value={wear}
                onChange={(e) => setWear(e.target.value as WearLevel)}
                className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
              >
                <option value="LEVE">Leve</option>
                <option value="MODERADO">Moderado</option>
                <option value="AVANZADO">Avanzado</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="p-3 bg-[#FAF9F6] border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer">
                <span className="text-slate-700 font-semibold">¿Fisuras?</span>
                <input
                  type="checkbox"
                  checked={cracks}
                  onChange={(e) => setCracks(e.target.checked)}
                  className="w-4 h-4 accent-[#0891B2] rounded"
                />
              </label>

              <label className="p-3 bg-[#FAF9F6] border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer">
                <span className="text-slate-700 font-semibold">¿Desprendimiento?</span>
                <input
                  type="checkbox"
                  checked={detachment}
                  onChange={(e) => setDetachment(e.target.checked)}
                  className="w-4 h-4 accent-[#0891B2] rounded"
                />
              </label>
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1.5">
                Describe tu necesidad
              </label>
              <textarea
                rows={3}
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <button
              type="button"
              onClick={handleEvaluate}
              disabled={loading}
              className="w-full py-3.5 bg-[#0891B2] hover:bg-[#0E7490] text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Cpu className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>
                {loading ? 'Analizando condiciones...' : 'Generar orientación COLORLINK IA'}
              </span>
            </button>
          </div>
        </div>

        {/* Columna derecha: panel tecnológico oscuro reservado para el motor IA */}
        <div className="lg:col-span-7">
          {result ? (
            <div className="bg-[#0B1F3A] text-white border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider block">
                    Orientación preliminar asistida
                  </span>
                  <h2 className="text-xl font-extrabold text-white mt-0.5">
                    Análisis estructurado de tu superficie
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {getSeverityBadge(result.severidad)}
                  {getComplexityBadge(result.nivelComplejidad)}
                </div>
              </div>

              {/* Aviso de distinción entre sugerencia preliminar y validación técnica */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700 flex items-start gap-3 text-xs">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">
                    {result.validacionTecnicaRequerida
                      ? 'Se recomienda revisión por un técnico especialista antes de intervenir'
                      : 'Sugerencia preliminar sujeta a validación técnica'}
                  </span>
                  <span className="text-slate-300 leading-relaxed block">
                    Esta evaluación orientativa organiza tu requerimiento; el diagnóstico definitivo
                    es emitido por un profesional técnico al revisar el proyecto.
                  </span>
                </div>
              </div>

              {/* Recorrido en 5 puntos clave */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block">
                    1. Necesidad identificada
                  </span>
                  <p className="text-slate-200 leading-relaxed">{problemDescription}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block">
                    2. Condiciones de la superficie
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.patologiasDetectadas.map((pat, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-200"
                      >
                        {pat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2 text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block">
                  3. Recomendación técnica preliminar
                </span>
                <p className="text-slate-100 text-sm leading-relaxed">
                  {result.recomendacionPreliminar}
                </p>
                <p className="text-cyan-300 pt-1">
                  Preparación sugerida: {result.preparacionSuperficieSugerida}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block">
                  4. Alternativa comercial orientativa
                </span>
                <h3 className="text-sm font-bold text-white">
                  {result.sistemaSugerido.nombreSistema}
                </h3>
                <div className="space-y-2">
                  {result.sistemaSugerido.capas.map((capa, idx) => (
                    <div
                      key={idx}
                      className="px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="text-[10px] font-mono uppercase text-cyan-300 block">
                          {capa.tipo}
                        </span>
                        <span className="text-slate-200 font-medium">{capa.producto}</span>
                      </div>
                      <span className="text-slate-300 font-mono text-[11px] shrink-0 tabular-nums">
                        {capa.manos} mano(s)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block">
                    5. Próximos pasos del proyecto
                  </span>
                  <span className="text-slate-300">
                    Convierte esta orientación en un expediente formal para recibir seguimiento.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onApplyToNewProject(result)}
                  className="px-5 py-3 bg-[#06B6D4] hover:bg-[#0891B2] text-slate-950 font-bold rounded-xl text-xs inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Crear mi proyecto</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-10 sm:p-12 text-center bg-[#0B1F3A] text-white border border-slate-800 rounded-3xl space-y-5 shadow-lg">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto text-cyan-400">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="text-xl font-bold text-white">
                  Obtén orientación antes de iniciar tu obra
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Completa las características de tu superficie a la izquierda para conocer la
                  preparación sugerida, la familia de solución aplicable y los próximos pasos.
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleEvaluate}
                  className="px-5 py-3 bg-[#06B6D4] hover:bg-[#0891B2] text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Analizar ejemplo actual</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  Toda sugerencia preliminar se complementa con revisión técnica profesional.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
