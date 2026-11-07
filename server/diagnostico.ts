import type {
  AIDiagnosisResult,
  CategoriaNecesidad,
  ClasificacionIA,
  ComplexityLevel,
  DiagnosisInput,
  SeverityLevel,
} from '../src/types';

/**
 * Motor de reglas determinístico de COLORLINK.
 * Se usa cuando Gemini no está configurado o falla, para que el diagnóstico nunca quede vacío.
 */
export function evaluateRuleEngine(formData: DiagnosisInput): AIDiagnosisResult {
  const humedad = formData.humedad || 'BAJA';
  const fisuras = Boolean(formData.fisuras);
  const desgaste = formData.desgaste || 'LEVE';
  const desprendimiento = Boolean(formData.desprendimiento);
  const ambiente = formData.ambiente || 'INDUSTRIAL';
  const superficie = (formData.tipoSuperficie || 'CONCRETO').toUpperCase();

  const patologias: string[] = [];
  let complejidad: ComplexityLevel = 'BAJA';
  let severidad: SeverityLevel = 'LEVE';
  let validacionRequerida = false;
  let preparacion = 'Limpieza con solvente y desengrasado SSPC-SP 1, seguido de lijado manual o mecánico SSPC-SP 2/3.';
  let sistemaNombre = 'Sistema Alquídico Modificado o Acrílico Industrial de Alta Adherencia';
  let garantia = 3;

  // Evaluate humidity
  if (humedad === 'ALTA') {
    patologias.push('Humedad freática o presión hidrostática residual');
    patologias.push('Riesgo crítico de ampollamiento (blistering) osmótico');
    complejidad = 'ALTA';
    severidad = 'SEVERO';
    validacionRequerida = true;
  } else if (humedad === 'MEDIA') {
    patologias.push('Humedad superficial moderada en sustrato');
    complejidad = 'MEDIA';
    severidad = 'MODERADO';
  }

  // Evaluate cracks
  if (fisuras) {
    patologias.push('Fisuramiento activo/pasivo en la superficie');
    patologias.push('Discontinuidad estructural del recubrimiento');
    validacionRequerida = true;
    if (complejidad === 'BAJA') complejidad = 'MEDIA';
    if (severidad === 'LEVE') severidad = 'MODERADO';
  }

  // Evaluate detachment
  if (desprendimiento) {
    patologias.push('Pérdida de adherencia interfacial (delaminación)');
    patologias.push('Falla adhesiva del sistema anterior');
    severidad = 'SEVERO';
    complejidad = 'ALTA';
    validacionRequerida = true;
  }

  // Evaluate wear
  if (desgaste === 'AVANZADO') {
    patologias.push('Erosión severa por tráfico o intemperismo abrasivo');
    complejidad = 'ALTA';
  }

  // Compound Rule: High humidity + Cracks
  if (humedad === 'ALTA' && fisuras) {
    complejidad = 'CRITICA';
    severidad = 'CRITICO';
    validacionRequerida = true;
    patologias.push('Filtración capilar profunda combinada con agrietamiento');
  }

  // Recommend surface prep & system based on surface and severity
  if (superficie.includes('CONCRETO') || superficie.includes('PISO')) {
    if (humedad === 'ALTA') {
      preparacion = 'Desbaste mecánico o granallado según ICRI CSP 3-4 (SSPC-SP 13/NACE 6). Secado forzado o barrera de vapor epóxica base agua.';
      sistemaNombre = 'Sistema Epóxico Barrera de Humedad 100% Sólidos + Acabado Poliuretano Alifático';
      garantia = 5;
    } else {
      preparacion = 'Lavado a presión con disco de pulido ICRI CSP 2 (SSPC-SP 13). Remoción de lechadas de fraguado.';
      sistemaNombre = 'Sistema Epóxico Auto-Nivelante o Epóxico Poliamida de Alto Tráfico';
      garantia = 5;
    }
  } else if (superficie.includes('ACERO') || superficie.includes('METAL')) {
    if (desgaste === 'AVANZADO' || ambiente === 'MARINO' || ambiente === 'INDUSTRIAL') {
      preparacion = 'Chorro abrasivo a metal casi blanco SSPC-SP 10 / NACE No. 2 con perfil de anclaje de 2.0 a 3.0 mils.';
      sistemaNombre = 'Sistema Anticorrosivo C5: Primer Rico en Zinc + Intermedio Epóxico MIO + Acabado Poliuretano';
      garantia = 7;
      severidad = 'SEVERO';
      complejidad = 'ALTA';
      validacionRequerida = true;
    } else {
      preparacion = 'Limpieza con herramienta motriz SSPC-SP 3 o chorro comercial SSPC-SP 6 / NACE 3.';
      sistemaNombre = 'Sistema Epóxico Poliamida Anticorrosivo con Poliuretano';
      garantia = 5;
    }
  }

  const capas = [
    {
      tipo: 'IMPRIMANTE' as const,
      producto: humedad === 'ALTA' ? 'Primer Epóxico Tolerante a Humedad 100% Sólidos' : 'Imprimante Epóxico de Penetración Profunda',
      espesor_micrones: 75,
      manos: 1,
      funcion: 'Promoción de adherencia y sellado de porosidad del sustrato',
    },
    {
      tipo: 'INTERMEDIO' as const,
      producto: 'Epóxico Alto Sólidos con Carga Reforzada de Cuarzo o MIO',
      espesor_micrones: 150,
      manos: 1,
      funcion: 'Espesor de película protectora, resistencia mecánica y dieléctrica',
    },
    {
      tipo: 'ACABADO' as const,
      producto: 'Poliuretano Alifático Acrílico de Alta Resistencia Química y UV',
      espesor_micrones: 50,
      manos: 2,
      funcion: 'Retención de brillo, resistencia a la intemperie y facilidad de lavado',
    },
  ];

  return {
    nivelComplejidad: complejidad,
    severidad,
    patologiasDetectadas: patologias.length > 0 ? patologias : ['Desgaste normal por servicio'],
    validacionTecnicaRequerida: validacionRequerida,
    recomendacionPreliminar: `Se detecta una condición de severidad ${severidad.toLowerCase()} con complejidad ${complejidad.toLowerCase()}. Se recomienda acondicionar el sustrato mediante ${preparacion} para posteriormente instalar el ${sistemaNombre}.`,
    preparacionSuperficieSugerida: preparacion,
    sistemaSugerido: {
      nombreSistema: sistemaNombre,
      capas,
      garantiaEstimadaAnos: garantia,
    },
    advertencias: [
      'Recomendación preliminar generada por COLORLINK IA sujeta a validación técnica por un profesional autorizado.',
      'Las mediciones de humedad deben ser verificadas en sitio con higrómetro o prueba de plástico ASTM D4263 antes de la aplicación.',
    ],
    clasificacion: clasificarPorReglas(formData, complejidad),
    motorUtilizado: 'MOTOR_REGLAS',
  };
}

/**
 * Clasificación de respaldo a partir de los campos estructurados.
 * No interpreta texto ni imágenes, por eso declara una confianza baja.
 */
export function clasificarPorReglas(formData: DiagnosisInput, complejidad: ComplexityLevel): ClasificacionIA {
  const superficie = (formData.tipoSuperficie || '').toUpperCase();
  const condiciones: string[] = [];
  if (formData.humedad === 'ALTA' || formData.humedad === 'MEDIA') condiciones.push(`humedad ${formData.humedad.toLowerCase()}`);
  if (formData.fisuras) condiciones.push('fisuras');
  if (formData.desprendimiento) condiciones.push('desprendimiento');
  if (formData.desgaste === 'MODERADO' || formData.desgaste === 'AVANZADO') condiciones.push(`desgaste ${formData.desgaste.toLowerCase()}`);

  let categoria: CategoriaNecesidad;
  if (superficie.includes('ACERO') || superficie.includes('METAL')) categoria = 'PROTECCION_ANTICORROSIVA';
  else if (formData.humedad === 'ALTA') categoria = 'IMPERMEABILIZACION';
  else if (formData.fisuras || formData.desprendimiento) categoria = 'REPARACION_FISURAS';
  else if (superficie.includes('CONCRETO') && formData.ambiente === 'INDUSTRIAL' && formData.ubicacion === 'INTERIOR') categoria = 'PISOS_INDUSTRIALES';
  else if (formData.ubicacion === 'EXTERIOR' || formData.ubicacion === 'MIXTO') categoria = 'FACHADAS';
  else if (condiciones.length) categoria = 'MANTENIMIENTO_GENERAL';
  else categoria = 'PINTURA_DECORATIVA';

  return {
    categoria,
    condicion: condiciones.length ? condiciones.join(' + ') : 'sin patologías reportadas',
    complejidad,
    confianza: 0.55,
    textoExtraido: '',
    hallazgosVisuales: [],
    archivosAnalizados: 0,
    motor: 'MOTOR_REGLAS',
  };
}
