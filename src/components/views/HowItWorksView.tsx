import React from 'react';
import {
  FileText,
  Camera,
  Sparkles,
  Wrench,
  DollarSign,
  Package,
  CalendarCheck,
  FileCheck,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { ActiveView } from '../layout/Navbar';

interface HowItWorksViewProps {
  onNavigate: (view: ActiveView) => void;
}

export const HowItWorksView: React.FC<HowItWorksViewProps> = ({ onNavigate }) => {
  const steps = [
    {
      num: '01',
      title: 'Identificación y contacto',
      role: 'Cliente',
      desc: 'Registras tus datos de contacto y el canal por el que deseas recibir acompañamiento durante el proyecto.',
      icon: <FileText className="w-5 h-5 text-[#1D4ED8]" />,
    },
    {
      num: '02',
      title: 'Descripción de tu espacio y color deseado',
      role: 'Cliente',
      desc: 'Indicas el tipo de superficie, ubicación interior o exterior, área aproximada, color deseado y condiciones observadas.',
      icon: <FileCheck className="w-5 h-5 text-[#0891B2]" />,
    },
    {
      num: '03',
      title: 'Carga centralizada de evidencias',
      role: 'Cliente / Técnico',
      desc: 'Adjuntas fotografías del estado actual de tus paredes, cubiertas o pisos junto con notas descriptivas.',
      icon: <Camera className="w-5 h-5 text-[#1D4ED8]" />,
    },
    {
      num: '04',
      title: 'Orientación preliminar COLORLINK IA',
      role: 'Asistente Inteligente',
      desc: 'El asistente estructura una lectura inicial de humedad, fisuras y desgaste para orientar la preparación requerida.',
      icon: <Sparkles className="w-5 h-5 text-[#0891B2]" />,
    },
    {
      num: '05',
      title: 'Validación técnica especializada',
      role: 'Especialista Técnico',
      desc: 'Un profesional revisa las evidencias y valida el diagnóstico definitivo junto con la preparación de superficie adecuada.',
      icon: <ShieldCheck className="w-5 h-5 text-[#1D4ED8]" />,
    },
    {
      num: '06',
      title: 'Propuesta de solución y cotización',
      role: 'Equipo Técnico y Comercial',
      desc: 'Se define el esquema de recubrimiento aplicable al proyecto y se estructura la propuesta económica correspondiente.',
      icon: <Wrench className="w-5 h-5 text-[#0891B2]" />,
    },
    {
      num: '07',
      title: 'Aprobación y programación',
      role: 'Cliente / Operaciones',
      desc: 'Una vez aprobada la propuesta, se organiza la disponibilidad de materiales y el cronograma de intervención.',
      icon: <DollarSign className="w-5 h-5 text-[#1D4ED8]" />,
    },
    {
      num: '08',
      title: 'Ejecución, seguimiento y cierre',
      role: 'Operaciones y Calidad',
      desc: 'Puedes consultar el estado de avance en todo momento hasta la revisión final de acabado y cierre del expediente.',
      icon: <CalendarCheck className="w-5 h-5 text-[#0891B2]" />,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="max-w-3xl space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#0891B2]">
          Ayuda y asesoría · Cómo funciona
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B1F3A] tracking-tight">
          Un proceso claro desde tu idea hasta el acabado final
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          En COLORLINK acompañamos la transformación de tus espacios organizando la información,
          las fotografías y las recomendaciones técnicas en un solo lugar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {steps.map((step) => (
          <div
            key={step.num}
            className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-shadow flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FAF9F6] border border-slate-200 flex items-center justify-center shrink-0">
              {step.icon}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono font-bold text-[#0891B2] tabular-nums">
                   Etapa {step.num}
                </span>
                <span className="text-slate-300">·</span>
                <span className="font-semibold text-slate-500">{step.role}</span>
              </div>
              <h2 className="text-base font-bold text-[#0B1F3A]">{step.title}</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 bg-[#0B1F3A] text-white rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
        <div className="space-y-1.5 text-center sm:text-left">
          <h3 className="text-xl font-extrabold">¿Listo para comenzar tu proyecto?</h3>
          <p className="text-xs sm:text-sm text-slate-300">
            Registra los datos de tu espacio en 5 pasos y lleva el seguimiento organizado en línea.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('crear-proyecto')}
          className="px-6 py-3.5 bg-[#0891B2] hover:bg-[#0E7490] text-white font-semibold rounded-xl text-sm inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>Crear mi proyecto</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
