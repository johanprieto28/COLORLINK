import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Droplets,
  FileText,
  Home,
  Layers,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { CATALOG_IMAGES } from '../../assets/images/catalogImages';
import { navigate } from '../../lib/router';
import { authStore } from '../../stores/auth';
import { Button } from '../ui';

/** Presentación del servicio de proyectos para quien aún no ha iniciado sesión */

const PASOS = [
  { icon: <Camera className="w-5 h-5" />, titulo: 'Cuéntanos de tu espacio', texto: 'En 5 pasos registras la superficie, el área aproximada, lo que ves (humedad, fisuras, desgaste) y unas fotos.' },
  { icon: <Sparkles className="w-5 h-5" />, titulo: 'Orientación al instante', texto: 'COLORLINK IA analiza tus datos y te da una primera recomendación de preparación y sistema de pintura.' },
  { icon: <ClipboardCheck className="w-5 h-5" />, titulo: 'Un técnico lo valida', texto: 'Un especialista revisa tus fotos, ajusta el diagnóstico y define la solución con productos y número de manos.' },
  { icon: <FileText className="w-5 h-5" />, titulo: 'Recibes tu cotización', texto: 'Te llega por correo y en tu cuenta, detallada por materiales, mano de obra y equipos. Tú decides si la apruebas.' },
  { icon: <Wrench className="w-5 h-5" />, titulo: 'Ejecutamos y entregamos', texto: 'Programamos el servicio, sigues el avance en línea y cerramos con un control de calidad documentado.' },
];

const IDEAL_PARA = [
  { icon: <Droplets className="w-5 h-5" />, texto: 'Humedad, filtraciones o salitre' },
  { icon: <Layers className="w-5 h-5" />, texto: 'Fisuras o pintura que se descascara' },
  { icon: <Building2 className="w-5 h-5" />, texto: 'Fachadas y trabajos en altura' },
  { icon: <Home className="w-5 h-5" />, texto: 'Apartamentos o casas completas' },
];

const FAQ = [
  { p: '¿Cuánto cuesta registrar mi proyecto?', r: 'Nada. Crear el proyecto, recibir la orientación y la cotización es gratis. Solo pagas si apruebas la cotización.' },
  { p: '¿Necesito saber de pintura?', r: 'No. El formulario usa preguntas sencillas y las fotos ayudan al técnico a entender el estado real de tus superficies.' },
  { p: '¿Cuándo recibo respuesta?', r: 'La orientación de COLORLINK IA es inmediata. Después, un técnico valida el proyecto y te avisamos por correo en cada avance.' },
  { p: '¿Puedo comprar los productos y pintar yo mismo?', r: 'Claro. Con la solución técnica puedes comprar los productos en la tienda, o pedirnos el servicio completo de aplicación.' },
  { p: '¿Qué pasa con mis datos y fotos?', r: 'Solo se usan para diagnosticar y gestionar tu proyecto, con tu autorización expresa. Puedes consultarlos en tu cuenta.' },
];

export const ProjectsIntro: React.FC = () => {
  const [abierta, setAbierta] = useState<number | null>(0);
  const empezar = () => authStore.requestLogin('Crea tu cuenta gratis o ingresa para registrar tu proyecto y seguirlo en línea.', 'register');
  const ingresar = () => authStore.requestLogin('Ingresa para ver o crear tus proyectos.');

  return (
    <div className="space-y-16 sm:space-y-20 pb-16">
      {/* Portada */}
      <section className="bg-[#092653] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#FFE34D]">
              <ShieldCheck className="w-4 h-4" /> Acompañamiento técnico de principio a fin
            </span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Tu proyecto de pintura, sin adivinar
            </h1>
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-xl">
              Cuéntanos qué quieres transformar y te decimos cómo preparar la superficie, qué productos usar y cuánto cuesta.
              Recibes la cotización y sigues todo el proceso desde tu cuenta.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button size="lg" variant="accent" onClick={empezar}>
                Crear mi proyecto gratis <ArrowRight className="w-5 h-5" />
              </Button>
              <button type="button" onClick={ingresar} className="px-5 py-3 rounded-xl border border-white/30 text-white font-semibold hover:bg-white/10 cursor-pointer">
                Ya tengo cuenta
              </button>
            </div>
            <p className="text-sm text-slate-300">Sin costo por registrar · Respuesta inicial inmediata · Sin compromiso</p>
          </div>
          <div className="relative">
            <img src={CATALOG_IMAGES.heroLivingRoom} alt="Sala renovada con pintura COLORLINK" className="w-full aspect-[4/3] object-cover rounded-3xl shadow-2xl" />
            <div className="absolute -bottom-5 left-4 right-4 sm:left-auto sm:right-6 sm:w-72 bg-white text-[#092653] rounded-2xl shadow-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500">Seguimiento de tu proyecto</p>
              {['Recibido', 'Validación técnica', 'Cotización enviada'].map((e, i) => (
                <p key={e} className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className={`w-4 h-4 ${i < 2 ? 'text-emerald-600' : 'text-[#08B6CC]'}`} />
                  {e}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#155EEF]">Cómo funciona</span>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#092653]">Cinco pasos, todo en línea</h2>
        </div>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="bg-white border border-[#E7EAF0] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-[#155EEF]/10 text-[#155EEF] flex items-center justify-center">{p.icon}</span>
                <span className="font-display text-2xl font-extrabold text-[#E7EAF0]">{i + 1}</span>
              </div>
              <h3 className="font-display font-bold text-[#092653]">{p.titulo}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Ideal para */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-[#E7EAF0] rounded-3xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8 items-center">
          <div className="space-y-3">
            <h2 className="font-display text-2xl font-extrabold text-[#092653]">¿Cuándo conviene crear un proyecto?</h2>
            <p className="text-slate-600">
              Si solo vas a renovar el color de un muro en buen estado, la tienda es suficiente. Cuando hay problemas en la
              superficie o un área grande, un diagnóstico evita repintar en pocos meses.
            </p>
            <button type="button" onClick={() => navigate('tienda')} className="text-sm font-semibold text-[#155EEF] hover:underline cursor-pointer">
              Prefiero ir directo a la tienda →
            </button>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {IDEAL_PARA.map((x) => (
              <li key={x.texto} className="flex items-center gap-3 p-4 rounded-2xl bg-[#FAFAF7] border border-[#E7EAF0] text-sm font-semibold text-[#092653]">
                <span className="text-[#08B6CC]">{x.icon}</span>
                {x.texto}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <h2 className="font-display text-2xl font-extrabold text-[#092653] text-center">Preguntas frecuentes</h2>
        <div className="space-y-2">
          {FAQ.map((f, i) => (
            <div key={f.p} className="bg-white border border-[#E7EAF0] rounded-2xl">
              <button
                type="button"
                onClick={() => setAbierta(abierta === i ? null : i)}
                aria-expanded={abierta === i}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left font-semibold text-[#092653] cursor-pointer"
              >
                {f.p}
                <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${abierta === i ? 'rotate-180' : ''}`} />
              </button>
              {abierta === i && <p className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{f.r}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Llamado final */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-[#155EEF] to-[#08B6CC] text-white p-8 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl font-extrabold">Empieza hoy, toma menos de 5 minutos</h2>
            <p className="text-white/85 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> ¿Tienes dudas? Pregúntale a COLORLINK IA en la esquina de la pantalla.
            </p>
          </div>
          <Button size="lg" variant="secondary" onClick={empezar} className="shrink-0">
            Crear mi proyecto <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>
    </div>
  );
};
