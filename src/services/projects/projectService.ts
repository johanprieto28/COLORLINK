import {
  Proyecto,
  ProjectStatus,
  ProjectFormData,
  ActividadProyecto,
  UserRole,
  Diagnostico,
  SolucionTecnica,
  Cotizacion,
  Evidencia,
} from '../../types';
import {
  supabase,
  fetchClientesFromSupabase,
  fetchProyectosFromSupabase,
  insertProyectoYClienteInSupabase,
} from '../supabase';
import { evaluateRuleEngine } from '../diagnostics/diagnosticService';
import { quoteService } from '../quotes/quoteService';

export const INITIAL_PROJECTS: Proyecto[] = [
  {
    id: 'proj-001',
    codigo: 'CLK-2026-0001',
    nombre: 'Recubrimiento Epóxico Piso Almacén Logístico',
    cliente_id: 'cli-001',
    cliente: {
      id: 'cli-001',
      usuario_id: 'usr-client-001',
      nombre: 'Carlos Eduardo Mendoza',
      empresa: 'Constructora Andina S.A.S.',
      documento_nit: '900.548.120-4',
      telefono: '+57 312 458 9901',
      correo: 'cliente.proyectos@constructora-andina.com',
      canal_entrada: 'WEB',
      created_at: '2026-01-15T10:00:00Z',
    },
    tecnico_asignado_id: 'usr-tech-002',
    tecnico_nombre: 'Ing. Laura Marcela Gómez',
    comercial_asignado_id: 'usr-com-003',
    comercial_nombre: 'Alejandro Restrepo V.',
    ciudad: 'Bogotá D.C.',
    direccion: 'Zona Industrial Montevideo, Calle 19 # 68-45',
    tipo_proyecto: 'INDUSTRIAL',
    fecha_requerida: '2026-10-15',
    estado: 'SOLUCION_GENERADA',
    prioridad: 'ALTA',
    areas: [
      {
        id: 'area-001',
        proyecto_id: 'proj-001',
        nombre: 'Área de Bodega y Pasillo Montacargas',
        tipo_superficie: 'CONCRETO',
        area_m2: 850,
        unidad_medida: 'm2',
        ambiente: 'INDUSTRIAL',
        ubicacion: 'INTERIOR',
        color_actual: 'Gris Cemento Opaco',
        color_requerido: 'Gris Niebla RAL 7035 con demarcación de seguridad Amarillo Tráfico RAL 1023',
        humedad: 'MEDIA',
        fisuras: true,
        tipo_fisura: 'SUPERFICIAL',
        desgaste: 'MODERADO',
        desprendimiento: false,
        estado_general: 'Concreto pulido con desprendimiento de polvo y manchas de hidrocarburos.',
        descripcion_problema: 'Se requiere detener la pulverización superficial del concreto e impermeabilizar contra derrames de aceites con alta resistencia al rodamiento continuo de montacargas de 3 toneladas.',
        created_at: '2026-01-15T10:30:00Z',
      },
    ],
    evidencias: [
      {
        id: 'ev-001',
        proyecto_id: 'proj-001',
        archivo_url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1000&q=80',
        storage_path: 'proyectos/proj-001/evidencia_1.jpg',
        nombre_archivo: 'inspeccion_piso_area1.jpg',
        tamano_bytes: 2450000,
        mime_type: 'image/jpeg',
        descripcion: 'Detalle de microfisuración superficial por retracción plástica y manchas de aceite de montacargas.',
        etiqueta_patologia: 'Microfisuras y Contaminación',
        severidad_visual: 'MODERADO',
        fecha_captura: '2026-01-15T10:15:00Z',
        created_at: '2026-01-15T10:30:00Z',
      },
      {
        id: 'ev-002',
        proyecto_id: 'proj-001',
        archivo_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=80',
        storage_path: 'proyectos/proj-001/evidencia_2.jpg',
        nombre_archivo: 'juntas_dilatacion.jpg',
        tamano_bytes: 1890000,
        mime_type: 'image/jpeg',
        descripcion: 'Desportillamiento en bordes de juntas de dilatación transversal.',
        etiqueta_patologia: 'Desgaste en Juntas',
        severidad_visual: 'MODERADO',
        fecha_captura: '2026-01-15T10:20:00Z',
        created_at: '2026-01-15T10:30:00Z',
      },
    ],
    diagnostico: {
      id: 'diag-001',
      proyecto_id: 'proj-001',
      tecnico_id: 'usr-tech-002',
      complejidad: 'MEDIA',
      severidad: 'MODERADO',
      humedad_detectada: 'MEDIA',
      fisuras_presentes: true,
      desgaste_detectado: 'MODERADO',
      desprendimiento_presente: false,
      patologias: [
        'Pulverulencia superficial por debilidad de capa de fraguado',
        'Fisuras superficiales por retracción térmica',
        'Contaminación con aceites minerales en zonas de carga',
      ],
      validacion_tecnica_requerida: true,
      recomendacion_preliminar: 'Requiere desbastado mecánico con escarificadora de diamante (ICRI CSP 3) y desengrasado profundo con emulsión tensoactiva antes de aplicar barrera epóxica.',
      observaciones_tecnicas: 'Sustrato de concreto con resistencia calculada a compresión de 250 kg/cm². Compatible con imprimante epóxico 100% sólidos penetrante.',
      preparacion_superficie_recomendada: 'SSPC-SP 13 / NACE No. 6: Tratamiento superficial de concreto con diamantado mecánico y aspirado HEPA.',
      norma_aplicable: 'SSPC-SP 13 / NACE 6 & ASTM D4263',
      origen_motor: 'COLORLINK_IA',
      validado_por: 'usr-tech-002',
      fecha_validacion: '2026-01-16T14:00:00Z',
      created_at: '2026-01-15T11:00:00Z',
    },
    solucion_tecnica: {
      id: 'sol-001',
      proyecto_id: 'proj-001',
      diagnostico_id: 'diag-001',
      tecnico_id: 'usr-tech-002',
      nombre_sistema: 'Sistema Epóxico Autonivelante de Alto Desempeño + Acabado Poliuretano Alifático',
      descripcion_sistema: 'Sistema multicapa monolítico diseñado específicamente para tráfico pesado de ruedas de poliuretano y caucho, alta resistencia al impacto y no acumulación de polvos.',
      preparacion_superficie: 'Diamantado mecánico ICRI CSP 3, aspirado industrial, sellado de fisuras con mortero epóxico tixotrópico y desengrase de manchas.',
      metodo_aplicacion: 'LLANA',
      garantia_anos: 5,
      resistencia_quimica: 'Excelente a aceites, combustibles, ácidos diluidos y solventes alifáticos.',
      resistencia_uv: 'Alta (Capa superior de acabado alifático no amarilleante).',
      resistencia_abrasion: 'ASTM D4060 Rueda CS-17 1000 ciclos < 45 mg de pérdida.',
      capas: [
        {
          tipo: 'IMPRIMANTE',
          producto: 'COLORLINK Primer Epóxico 100% Sólidos Penetrante',
          espesor_dft_micrones: 100,
          numero_manos: 1,
          intervalo_repintado_horas: '8 - 24 horas',
          funcion_tecnica: 'Consolidación del sustrato y promotor de adhesión química superior',
        },
        {
          tipo: 'INTERMEDIO',
          producto: 'COLORLINK Mortero Autonivelante Epóxico Alto Sólidos',
          espesor_dft_micrones: 1500,
          numero_manos: 1,
          intervalo_repintado_horas: '12 - 24 horas',
          funcion_tecnica: 'Nivelación de perfil superficial, disipación de cargas dinámicas y cuerpo monolítico',
        },
        {
          tipo: 'ACABADO',
          producto: 'COLORLINK Topcoat Poliuretano Alifático Satinado RAL 7035',
          espesor_dft_micrones: 60,
          numero_manos: 2,
          intervalo_repintado_horas: '6 - 12 horas',
          funcion_tecnica: 'Capa de sacrificio resistente a rayos UV, rayaduras y productos de aseo industrial',
        },
      ],
      aprobado_cliente: true,
      fecha_aprobacion: '2026-01-17T09:30:00Z',
      created_at: '2026-01-16T15:00:00Z',
    },
    consentimiento: {
      id: 'cons-001',
      proyecto_id: 'proj-001',
      cliente_id: 'cli-001',
      autorizacion_tratamiento_datos: true,
      autorizacion_uso_tecnico_fotos: true,
      origen_canal: 'PORTAL_CLIENTE_WEB',
      ip_registro: '190.157.24.11',
      fecha_aceptacion: '2026-01-15T10:30:00Z',
      declaracion_texto: 'Acepto expresamente el tratamiento de mis datos de contacto conforme a la Ley de Protección de Datos Personales y autorizo el levantamiento técnico fotográfico para el dimensionamiento del sistema.',
      created_at: '2026-01-15T10:30:00Z',
    },
    actividades: [
      {
        id: 'act-001',
        proyecto_id: 'proj-001',
        usuario_nombre: 'Carlos Eduardo Mendoza',
        usuario_rol: 'cliente',
        tipo_actividad: 'CREACION',
        titulo: 'Proyecto Registrado por el Cliente',
        descripcion: 'El cliente completó los 6 pasos del formulario e ingresó 850 m² de piso industrial con evidencias fotográficas.',
        estado_nuevo: 'RECIBIDO',
        created_at: '2026-01-15T10:30:00Z',
      },
      {
        id: 'act-002',
        proyecto_id: 'proj-001',
        usuario_nombre: 'COLORLINK IA',
        usuario_rol: 'administrador',
        tipo_actividad: 'DIAGNOSTICO_GENERADO',
        titulo: 'Diagnóstico Preliminar IA Generado',
        descripcion: 'Patologías identificadas: Microfisuración y polvo en concreto. Severidad moderada.',
        estado_anterior: 'RECIBIDO',
        estado_nuevo: 'EN_ANALISIS',
        created_at: '2026-01-15T11:00:00Z',
      },
      {
        id: 'act-003',
        proyecto_id: 'proj-001',
        usuario_nombre: 'Ing. Laura Marcela Gómez',
        usuario_rol: 'tecnico',
        tipo_actividad: 'SOLUCION_APROBADA',
        titulo: 'Solución Técnica Aprobada por Ingeniería',
        descripcion: 'Especificación emitida: Sistema Epóxico Autonivelante + Topcoat Poliuretano 1660µm DFT total.',
        estado_anterior: 'VALIDACION_TECNICA',
        estado_nuevo: 'SOLUCION_GENERADA',
        created_at: '2026-01-16T15:00:00Z',
      },
    ],
    created_at: '2026-01-15T10:30:00Z',
  },
  {
    id: 'proj-002',
    codigo: 'CLK-2026-0002',
    nombre: 'Protección Anticorrosiva Tanques de Almacenamiento C5',
    cliente_id: 'cli-002',
    cliente: {
      id: 'cli-002',
      nombre: 'Ing. Fernando Valderrama',
      empresa: 'Petroquímica del Caribe S.A.',
      documento_nit: '860.034.901-2',
      telefono: '+57 310 998 4421',
      correo: 'mantenimiento@petroquimicadelcaribe.com',
      canal_entrada: 'COMERCIAL',
      created_at: '2026-01-18T08:00:00Z',
    },
    tecnico_asignado_id: 'usr-tech-002',
    tecnico_nombre: 'Ing. Laura Marcela Gómez',
    comercial_asignado_id: 'usr-com-003',
    comercial_nombre: 'Alejandro Restrepo V.',
    ciudad: 'Cartagena de Indias',
    direccion: 'Zona Industrial Mamonal Km 7',
    tipo_proyecto: 'INDUSTRIAL',
    fecha_requerida: '2026-11-01',
    estado: 'COTIZACION',
    prioridad: 'URGENTE',
    areas: [
      {
        id: 'area-002',
        proyecto_id: 'proj-002',
        nombre: 'Cuerpo Exterior y Techo Flotante Tanque TK-104',
        tipo_superficie: 'ACERO_CARBONO',
        area_m2: 1450,
        unidad_medida: 'm2',
        ambiente: 'MARINO',
        ubicacion: 'EXTERIOR',
        color_actual: 'Blanco envejecido con picaduras de herrumbre',
        color_requerido: 'Blanco Térmico Reflexivo C5-M',
        humedad: 'ALTA',
        fisuras: false,
        desgaste: 'AVANZADO',
        desprendimiento: true,
        estado_general: 'Corrosión localizada Grado Ri 4 (ISO 4628-3) con desprendimiento de película vieja.',
        descripcion_problema: 'Ambiente marino severo C5-M de alta salinidad y condensación. El recubrimiento anterior falló por ampolamiento.',
        created_at: '2026-01-18T08:30:00Z',
      },
    ],
    evidencias: [
      {
        id: 'ev-003',
        proyecto_id: 'proj-002',
        archivo_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80',
        storage_path: 'proyectos/proj-002/tanque_corrosion.jpg',
        nombre_archivo: 'corrosion_lamina_acero.jpg',
        tamano_bytes: 3100000,
        mime_type: 'image/jpeg',
        descripcion: 'Pérdida de espesor por corrosión galvánica y salinidad en faldón inferior.',
        etiqueta_patologia: 'Corrosión Grado Ri 4',
        severidad_visual: 'SEVERO',
        fecha_captura: '2026-01-18T08:15:00Z',
        created_at: '2026-01-18T08:30:00Z',
      },
    ],
    created_at: '2026-01-18T08:30:00Z',
  },
  {
    id: 'proj-003',
    codigo: 'CLK-2026-0003',
    nombre: 'Impermeabilización Cubierta y Losas Centro Médico',
    cliente_id: 'cli-003',
    cliente: {
      id: 'cli-003',
      nombre: 'Dra. Patricia Salamanca',
      empresa: 'Clínica San Jerónimo',
      documento_nit: '901.123.456-7',
      telefono: '+57 317 400 1199',
      correo: 'infraestructura@clinicasanjeronimo.com.co',
      canal_entrada: 'WHATSAPP',
      created_at: '2026-01-20T11:00:00Z',
    },
    tecnico_asignado_id: 'usr-tech-002',
    tecnico_nombre: 'Ing. Laura Marcela Gómez',
    comercial_asignado_id: 'usr-com-003',
    comercial_nombre: 'Alejandro Restrepo V.',
    ciudad: 'Medellín',
    direccion: 'Carrera 43A # 18-90, El Poblado',
    tipo_proyecto: 'HOSPITALARIO',
    fecha_requerida: '2026-10-30',
    estado: 'APROBADO',
    prioridad: 'NORMAL',
    areas: [
      {
        id: 'area-003',
        proyecto_id: 'proj-003',
        nombre: 'Cubierta Losas Quirófanos Piso 5',
        tipo_superficie: 'CONCRETO',
        area_m2: 520,
        unidad_medida: 'm2',
        ambiente: 'HOSPITALARIO',
        ubicacion: 'EXTERIOR',
        color_actual: 'Manto asfáltico deteriorado',
        color_requerido: 'Blanco Reflectivo Cool Roof SRI > 105',
        humedad: 'ALTA',
        fisuras: true,
        desgaste: 'AVANZADO',
        desprendimiento: true,
        estado_general: 'Filtraciones hacia áreas estériles inferiores.',
        descripcion_problema: 'Se requiere membrana de poliuretano líquido continuo sin uniones con alta elasticidad > 400%.',
        created_at: '2026-01-20T11:20:00Z',
      },
    ],
    evidencias: [
      {
        id: 'ev-004',
        proyecto_id: 'proj-003',
        archivo_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861564?auto=format&fit=crop&w=1000&q=80',
        storage_path: 'proyectos/proj-003/cubierta_clinica.jpg',
        nombre_archivo: 'manto_deteriorado.jpg',
        tamano_bytes: 2750000,
        mime_type: 'image/jpeg',
        descripcion: 'Agrietamiento de manto asfáltico envejecido con empozamientos de agua lluvia.',
        etiqueta_patologia: 'Filtración y Ampollamiento',
        severidad_visual: 'SEVERO',
        fecha_captura: '2026-01-20T11:10:00Z',
        created_at: '2026-01-20T11:20:00Z',
      },
    ],
    created_at: '2026-01-20T11:20:00Z',
  },
  {
    id: 'proj-004',
    codigo: 'CLK-2026-0004',
    nombre: 'Pintura Fachada e Interiores Sede Corporativa',
    cliente_id: 'cli-001',
    cliente: {
      id: 'cli-001',
      usuario_id: 'usr-client-001',
      nombre: 'Carlos Eduardo Mendoza',
      empresa: 'Constructora Andina S.A.S.',
      documento_nit: '900.548.120-4',
      telefono: '+57 312 458 9901',
      correo: 'cliente.proyectos@constructora-andina.com',
      canal_entrada: 'WEB',
      created_at: '2026-01-15T10:00:00Z',
    },
    ciudad: 'Cali',
    direccion: 'Avenida Colombia # 4-20',
    tipo_proyecto: 'COMERCIAL',
    fecha_requerida: '2026-11-20',
    estado: 'RECIBIDO',
    prioridad: 'NORMAL',
    areas: [
      {
        id: 'area-004',
        proyecto_id: 'proj-004',
        nombre: 'Fachada Principal en Mampostería a la Vista',
        tipo_superficie: 'MAMPOSTERIA',
        area_m2: 620,
        unidad_medida: 'm2',
        ambiente: 'COMERCIAL',
        ubicacion: 'EXTERIOR',
        color_actual: 'Ladrillo limpio con eflorescencias',
        color_requerido: 'Hidrófugo transparente mate base silano-siloxano',
        humedad: 'MEDIA',
        fisuras: false,
        desgaste: 'LEVE',
        desprendimiento: false,
        estado_general: 'Aparición de manchas blancas de sales alcalinas por lluvia.',
        descripcion_problema: 'Proteger el ladrillo sin alterar el tono arquitectónico original.',
        created_at: '2026-01-22T14:00:00Z',
      },
    ],
    evidencias: [],
    created_at: '2026-01-22T14:00:00Z',
  },
  {
    id: 'proj-005',
    codigo: 'CLK-2026-0005',
    nombre: 'Mantenimiento Preventivo Silos de Granos en Puerto',
    cliente_id: 'cli-004',
    cliente: {
      id: 'cli-004',
      nombre: 'Martín Silva',
      empresa: 'Operadora Portuaria del Pacífico',
      documento_nit: '800.198.334-1',
      telefono: '+57 314 555 7711',
      correo: 'operaciones@puertopacifico.com',
      canal_entrada: 'REFERIDO',
      created_at: '2026-01-05T09:00:00Z',
    },
    ciudad: 'Buenaventura',
    direccion: 'Terminal Marítimo Muelle 2',
    tipo_proyecto: 'INFRAESTRUCTURA',
    fecha_requerida: '2026-12-01',
    estado: 'CERRADO',
    prioridad: 'NORMAL',
    areas: [
      {
        id: 'area-005',
        proyecto_id: 'proj-005',
        nombre: 'Silo No. 3 Acero Galvanizado',
        tipo_superficie: 'ACERO_CARBONO',
        area_m2: 2100,
        unidad_medida: 'm2',
        ambiente: 'MARINO',
        ubicacion: 'EXTERIOR',
        color_actual: 'Gris metálico opaco',
        color_requerido: 'Aluminio reflectivo anticorrosivo',
        humedad: 'ALTA',
        fisuras: false,
        desgaste: 'MODERADO',
        desprendimiento: false,
        estado_general: 'Completado a satisfacción con certificación de calidad.',
        descripcion_problema: 'Servicio finalizado exitosamente con 7 años de garantía.',
        created_at: '2026-01-05T09:15:00Z',
      },
    ],
    evidencias: [],
    created_at: '2026-01-05T09:15:00Z',
  },
];

const VALID_PROJECT_STATUSES: ProjectStatus[] = [
  'BORRADOR',
  'RECIBIDO',
  'EN_ANALISIS',
  'VALIDACION_TECNICA',
  'SOLUCION_GENERADA',
  'COTIZACION',
  'APROBADO',
  'ABASTECIMIENTO',
  'SERVICIO_PROGRAMADO',
  'EN_EJECUCION',
  'CALIDAD',
  'CERRADO',
];

class ProjectService {
  private projects: Proyecto[] = [];
  private supabaseClients: any[] = [];
  private syncErrors: { clienteError: string | null; proyectoError: string | null } = {
    clienteError: null,
    proyectoError: null,
  };
  private listeners: Array<() => void> = [];

  constructor() {
    this.init();
    this.syncFromSupabase();
  }

  private init() {
    const saved = localStorage.getItem('colorlink_projects');
    if (saved) {
      try {
        this.projects = JSON.parse(saved);
      } catch {
        this.projects = [...INITIAL_PROJECTS];
      }
    } else {
      this.projects = [...INITIAL_PROJECTS];
    }
  }

  public getSyncErrors() {
    return this.syncErrors;
  }

  public getSupabaseClients() {
    return this.supabaseClients;
  }

  /**
   * Real synchronization with Supabase public.cliente and public.proyecto tables
   * Joins public.proyecto.cliente_id -> public.cliente.id using exact DB column names.
   */
  public async syncFromSupabase(): Promise<boolean> {
    try {
      const [clientesRes, proyectosRes] = await Promise.all([
        fetchClientesFromSupabase(),
        fetchProyectosFromSupabase(),
      ]);

      this.syncErrors = {
        clienteError: clientesRes.errorMessage,
        proyectoError: proyectosRes.errorMessage,
      };

      if (!clientesRes.error && clientesRes.data) {
        this.supabaseClients = clientesRes.data;
      }

      if (!proyectosRes.error && proyectosRes.data) {
        const clientesById = new Map<number, any>();
        (clientesRes.data || []).forEach((c: any) => {
          if (c && c.id != null) {
            clientesById.set(Number(c.id), c);
          }
        });

        // Preserve rich local details (evidencias, diagnostico, cotizaciones) for already-created sp-* records
        const existingById = new Map<string, Proyecto>();
        this.projects.forEach((existing) => {
          if (existing.id.startsWith('sp-')) {
            existingById.set(existing.id, existing);
          }
        });

        const mappedProjects: Proyecto[] = proyectosRes.data.map((p: any) => {
          const projIdNum = p.idproyecto;
          const spId = `sp-${projIdNum}`;
          const prev = existingById.get(spId);
          const c = p.cliente_id != null ? clientesById.get(Number(p.cliente_id)) : undefined;
          const timestamp = p.created_at || c?.created_at || new Date().toISOString();
          const rawStatus = String(p.estado || 'BORRADOR').toUpperCase() as ProjectStatus;
          const normalizedStatus: ProjectStatus = VALID_PROJECT_STATUSES.includes(rawStatus)
            ? rawStatus
            : 'RECIBIDO';
          const parsedArea =
            p.area_m2 !== null && p.area_m2 !== undefined && !Number.isNaN(Number(p.area_m2))
              ? Number(p.area_m2)
              : prev?.areas?.[0]?.area_m2 ?? 0;

          return {
            id: spId,
            codigo: `CLK-SUPA-${String(projIdNum).padStart(4, '0')}`,
            nombre:
              p.nombre_proyecto ||
              prev?.nombre ||
              `${c?.nombre_empresa || c?.nombre_completo || 'Proyecto'} #${projIdNum}`,
            cliente_id: p.cliente_id != null ? `cli-${p.cliente_id}` : prev?.cliente_id || 'cli-supa',
            cliente: {
              id: p.cliente_id != null ? `cli-${p.cliente_id}` : 'cli-supa',
              tipo_cliente: c?.tipo_cliente ?? prev?.cliente?.tipo_cliente,
              nombre:
                c?.nombre_completo ||
                c?.nombre_empresa ||
                prev?.cliente?.nombre ||
                `Cliente ID #${p.cliente_id ?? 'N/A'}`,
              empresa: c?.nombre_empresa ?? prev?.cliente?.empresa ?? '',
              documento_nit: c?.numero_documento ?? prev?.cliente?.documento_nit ?? '',
              telefono: c?.telefono ?? prev?.cliente?.telefono ?? '',
              correo: c?.['correo_electrónico'] ?? prev?.cliente?.correo ?? '',
              canal_entrada: prev?.cliente?.canal_entrada || 'WEB',
              created_at: c?.created_at || timestamp,
            },
            tecnico_asignado_id: prev?.tecnico_asignado_id || 'usr-tech-002',
            tecnico_nombre: prev?.tecnico_nombre || 'Ing. Laura Marcela Gómez',
            comercial_asignado_id: prev?.comercial_asignado_id || 'usr-com-003',
            comercial_nombre: prev?.comercial_nombre || 'Alejandro Restrepo V.',
            ciudad: p.ciudad || c?.ciudad || prev?.ciudad || 'Sin especificar',
            direccion:
              prev?.direccion ||
              (p.ciudad || c?.ciudad
                ? `Ubicación registrada: ${p.ciudad || c?.ciudad}`
                : 'Dirección pendiente de detalle'),
            tipo_proyecto: (p.tipo_obra as any) || prev?.tipo_proyecto || 'INDUSTRIAL',
            fecha_requerida:
              p.fecha_requerida ||
              prev?.fecha_requerida ||
              new Date(timestamp).toISOString().split('T')[0],
            estado: normalizedStatus,
            prioridad: prev?.prioridad || 'NORMAL',
            areas: prev?.areas?.length
              ? prev.areas.map((a, idx) =>
                  idx === 0
                    ? {
                        ...a,
                        area_m2: parsedArea || a.area_m2,
                        descripcion_problema: p.descripcion || a.descripcion_problema,
                      }
                    : a
                )
              : [
                  {
                    id: `area-${projIdNum}`,
                    proyecto_id: spId,
                    nombre: `Superficie (${p.tipo_obra || c?.tipo_cliente || 'General'})`,
                    tipo_superficie: 'CONCRETO',
                    area_m2: parsedArea,
                    unidad_medida: 'm2',
                    ambiente: 'INDUSTRIAL',
                    ubicacion: 'INTERIOR',
                    color_actual: 'Por inspeccionar',
                    color_requerido: 'Por definir',
                    humedad: 'MEDIA',
                    fisuras: false,
                    tipo_fisura: 'NINGUNA',
                    desgaste: 'MODERADO',
                    desprendimiento: false,
                    estado_general: `Estado en BD: ${normalizedStatus}`,
                    descripcion_problema:
                      p.descripcion ||
                      `Proyecto idproyecto=${projIdNum} vinculado a cliente_id=${p.cliente_id} en Supabase.`,
                    created_at: timestamp,
                  },
                ],
            evidencias: prev?.evidencias || [],
            diagnostico: prev?.diagnostico,
            solucion_tecnica: prev?.solucion_tecnica,
            cotizaciones: prev?.cotizaciones,
            consentimiento: prev?.consentimiento,
            actividades: prev?.actividades?.length
              ? prev.actividades
              : [
                  {
                    id: `act-${projIdNum}`,
                    proyecto_id: spId,
                    usuario_nombre: c?.nombre_completo || 'Supabase PostgreSQL',
                    usuario_rol: 'cliente',
                    tipo_actividad: 'CREACION',
                    titulo: 'Proyecto leído desde public.proyecto (Supabase)',
                    descripcion: `idproyecto: ${projIdNum} | cliente_id: ${p.cliente_id} | estado: ${normalizedStatus}`,
                    estado_nuevo: normalizedStatus,
                    created_at: timestamp,
                  },
                ],
            created_at: timestamp,
          };
        });

        this.projects = [
          ...mappedProjects,
          ...this.projects.filter((p) => !p.id.startsWith('sp-')),
        ];
        this.saveLocal();
        return true;
      }

      this.notify();
    } catch (err: any) {
      this.syncErrors = {
        clienteError: err?.message || 'Error inesperado al sincronizar con Supabase',
        proyectoError: err?.message || 'Error inesperado al sincronizar con Supabase',
      };
      this.notify();
    }
    return false;
  }

  private saveLocal() {
    localStorage.setItem('colorlink_projects', JSON.stringify(this.projects));
    this.notify();
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  /**
   * Retrieves projects filtered according to user role permissions while always keeping
   * real Supabase records (sp-*) visible when appropriate.
   */
  public getProjects(userRole: UserRole, userId?: string): Proyecto[] {
    switch (userRole) {
      case 'cliente':
        return this.projects.filter(
          (p) =>
            p.id.startsWith('sp-') ||
            p.cliente?.usuario_id === userId ||
            p.cliente_id === 'cli-001' ||
            p.cliente?.correo === 'cliente.proyectos@constructora-andina.com'
        );

      case 'tecnico':
        return this.projects.filter(
          (p) =>
            p.id.startsWith('sp-') ||
            p.tecnico_asignado_id === userId ||
            [
              'BORRADOR',
              'RECIBIDO',
              'EN_ANALISIS',
              'VALIDACION_TECNICA',
              'SOLUCION_GENERADA',
            ].includes(p.estado) ||
            p.tecnico_asignado_id === 'usr-tech-002'
        );

      case 'comercial':
        return this.projects.filter(
          (p) =>
            p.id.startsWith('sp-') ||
            [
              'SOLUCION_GENERADA',
              'COTIZACION',
              'APROBADO',
              'ABASTECIMIENTO',
              'EN_EJECUCION',
              'CERRADO',
            ].includes(p.estado)
        );

      case 'operaciones':
        return this.projects.filter((p) =>
          [
            'APROBADO',
            'ABASTECIMIENTO',
            'SERVICIO_PROGRAMADO',
            'EN_EJECUCION',
            'CALIDAD',
            'CERRADO',
          ].includes(p.estado)
        );

      case 'administrador':
      default:
        return this.projects;
    }
  }

  public getProjectById(id: string): Proyecto | undefined {
    return this.projects.find((p) => p.id === id);
  }

  /**
   * Creates a new project from the 6-step guided wizard
   */
  public async createProjectFromWizard(
    formData: ProjectFormData,
    userId: string = 'usr-client-001',
    idempotencyKey?: string
  ): Promise<Proyecto> {
    const timestamp = Date.now();
    const projectSequence = (this.projects.length + 1).toString().padStart(4, '0');
    const codigo = `CLK-${new Date().getFullYear()}-${projectSequence}`;
    const projectId = `proj-${timestamp}`;
    const clienteId = `cli-${timestamp}`;

    // 1. Evaluate COLORLINK IA rules for preliminary diagnosis
    const aiDiag = evaluateRuleEngine(formData);

    const resolvedTipoCliente =
      formData.clienteTipo ||
      (formData.clienteEmpresa && formData.clienteEmpresa.trim().length > 0
        ? 'EMPRESA'
        : 'PERSONA_NATURAL');

    const newProject: Proyecto = {
      id: projectId,
      codigo,
      nombre: formData.proyectoNombre,
      cliente_id: clienteId,
      cliente: {
        id: clienteId,
        usuario_id: userId,
        tipo_cliente: resolvedTipoCliente,
        nombre: formData.clienteNombre,
        empresa: formData.clienteEmpresa,
        documento_nit: formData.clienteDocumento,
        telefono: formData.clienteTelefono,
        correo: formData.clienteCorreo,
        canal_entrada: formData.clienteCanal || 'WEB',
        created_at: new Date().toISOString(),
      },
      tecnico_asignado_id: 'usr-tech-002',
      tecnico_nombre: 'Ing. Laura Marcela Gómez',
      comercial_asignado_id: 'usr-com-003',
      comercial_nombre: 'Alejandro Restrepo V.',
      ciudad: formData.ciudad,
      direccion: formData.direccion,
      tipo_proyecto: formData.tipoProyecto,
      fecha_requerida: formData.fechaRequerida,
      estado: 'RECIBIDO',
      prioridad: aiDiag.severidad === 'CRITICO' || aiDiag.severidad === 'SEVERO' ? 'ALTA' : 'NORMAL',
      areas: [
        {
          id: `area-${timestamp}`,
          proyecto_id: projectId,
          nombre: `Superficie Principal (${formData.tipoSuperficie})`,
          tipo_superficie: formData.tipoSuperficie,
          area_m2: Number(formData.areaAproximada),
          unidad_medida: formData.unidadMedida || 'm2',
          ambiente: formData.ambiente,
          ubicacion: formData.ubicacion,
          color_actual: formData.colorActual,
          color_requerido: formData.colorRequerido,
          humedad: formData.humedad,
          fisuras: Boolean(formData.fisuras),
          tipo_fisura: formData.tipoFisura || 'NINGUNA',
          desgaste: formData.desgaste,
          desprendimiento: Boolean(formData.desprendimiento),
          estado_general: formData.estadoSuperficie,
          descripcion_problema: formData.descripcionProblema,
          created_at: new Date().toISOString(),
        },
      ],
      evidencias: formData.evidencias.map((ev, i) => ({
        id: ev.id || `ev-${timestamp}-${i}`,
        proyecto_id: projectId,
        archivo_url: ev.archivo_url,
        storage_path: `proyectos/${projectId}/${ev.nombre_archivo}`,
        nombre_archivo: ev.nombre_archivo,
        tamano_bytes: ev.tamano_bytes || 1024000,
        mime_type: ev.mime_type || 'image/jpeg',
        descripcion: ev.descripcion || 'Fotografía de evidencia subida por el cliente',
        fecha_captura: ev.fecha_captura || new Date().toISOString(),
        etiqueta_patologia: aiDiag.patologiasDetectadas[0] || 'Inspección',
        severidad_visual: aiDiag.severidad,
        created_at: new Date().toISOString(),
      })),
      diagnostico: {
        id: `diag-${timestamp}`,
        proyecto_id: projectId,
        complejidad: aiDiag.nivelComplejidad,
        severidad: aiDiag.severidad,
        humedad_detectada: formData.humedad,
        fisuras_presentes: Boolean(formData.fisuras),
        desgaste_detectado: formData.desgaste,
        desprendimiento_presente: Boolean(formData.desprendimiento),
        patologias: aiDiag.patologiasDetectadas,
        validacion_tecnica_requerida: aiDiag.validacionTecnicaRequerida,
        recomendacion_preliminar: aiDiag.recomendacionPreliminar,
        preparacion_superficie_recomendada: aiDiag.preparacionSuperficieSugerida,
        norma_aplicable: 'SSPC-SP 13 / NACE 6 & ISO 12944',
        origen_motor: 'COLORLINK_IA',
        created_at: new Date().toISOString(),
      },
      consentimiento: {
        id: `cons-${timestamp}`,
        proyecto_id: projectId,
        cliente_id: clienteId,
        autorizacion_tratamiento_datos: formData.autorizacionDatos,
        autorizacion_uso_tecnico_fotos: formData.autorizacionUsoTecnico,
        origen_canal: formData.origenCanal || 'PORTAL_CLIENTE_WEB',
        fecha_aceptacion: new Date().toISOString(),
        declaracion_texto:
          'El cliente confirma y autoriza el tratamiento seguro de datos personales y el uso técnico de la información y fotos aportadas para el diseño del sistema de recubrimientos.',
        created_at: new Date().toISOString(),
      },
      actividades: [
        {
          id: `act-${timestamp}-1`,
          proyecto_id: projectId,
          usuario_nombre: formData.clienteNombre,
          usuario_rol: 'cliente',
          tipo_actividad: 'CREACION',
          titulo: 'Nuevo Proyecto Registrado en COLORLINK',
          descripcion: `Registro exitoso para ${formData.areaAproximada} m² de superficie en ${formData.ciudad}.`,
          estado_nuevo: 'RECIBIDO',
          created_at: new Date().toISOString(),
        },
        {
          id: `act-${timestamp}-2`,
          proyecto_id: projectId,
          usuario_nombre: 'COLORLINK IA',
          usuario_rol: 'administrador',
          tipo_actividad: 'DIAGNOSTICO_GENERADO',
          titulo: 'Evaluación Técnica Preliminar Generada',
          descripcion: `Severidad: ${aiDiag.severidad} | Complejidad: ${aiDiag.nivelComplejidad}. Sistema sugerido: ${aiDiag.sistemaSugerido.nombreSistema}.`,
          estado_anterior: 'RECIBIDO',
          estado_nuevo: 'EN_ANALISIS',
          created_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
    };

    // Persist real record in Supabase (public.cliente -> public.proyecto)
    // NEVER report creation as successful unless Supabase confirms idproyecto!
    const res = await insertProyectoYClienteInSupabase({
      tipo_cliente: resolvedTipoCliente,
      nombre_completo: formData.clienteNombre,
      nombre_empresa: formData.clienteEmpresa || '',
      numero_documento: formData.clienteDocumento || '',
      correo_electrónico: formData.clienteCorreo,
      telefono: formData.clienteTelefono,
      ciudad: formData.ciudad || '',
      nombre_proyecto: formData.proyectoNombre,
      tipo_obra: formData.tipoProyecto || 'INDUSTRIAL',
      area_m2: Number(formData.areaAproximada) || 0,
      fecha_requerida: formData.fechaRequerida,
      estado: 'RECIBIDO',
      descripcion: [
        formData.descripcionProblema,
        `Superficie: ${formData.tipoSuperficie} (${formData.ubicacion})`,
        `Humedad: ${formData.humedad} | Fisuras: ${formData.fisuras ? 'Sí' : 'No'} | Desgaste: ${formData.desgaste}`,
      ]
        .filter(Boolean)
        .join(' — '),
      idempotency_key: idempotencyKey,
    });

    if (!res.success || res.idproyecto == null) {
      throw new Error(
        res.error ||
          'Supabase no confirmó la creación del proyecto. Operación abortada sin guardar datos ficticios.'
      );
    }

    newProject.id = `sp-${res.idproyecto}`;
    newProject.codigo = `CLK-SUPA-${String(res.idproyecto).padStart(4, '0')}`;
    if (res.cliente_id != null) {
      newProject.cliente_id = `cli-${res.cliente_id}`;
      if (newProject.cliente) {
        newProject.cliente.id = `cli-${res.cliente_id}`;
      }
    }

    this.projects.unshift(newProject);
    this.saveLocal();
    await this.syncFromSupabase();
    return this.getProjectById(newProject.id) || newProject;
  }

  /**
   * Transition project status with full audit activity logging
   */
  public updateProjectStatus(
    projectId: string,
    nuevoEstado: ProjectStatus,
    usuarioNombre: string,
    usuarioRol: UserRole,
    motivo: string
  ): Proyecto | null {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return null;

    const estadoAnterior = project.estado;
    project.estado = nuevoEstado;
    project.updated_at = new Date().toISOString();

    const nuevaActividad: ActividadProyecto = {
      id: `act-${Date.now()}`,
      proyecto_id: projectId,
      usuario_nombre: usuarioNombre,
      usuario_rol: usuarioRol,
      tipo_actividad: 'CAMBIO_ESTADO',
      titulo: `Cambio de Estado: ${estadoAnterior} → ${nuevoEstado}`,
      descripcion: motivo,
      estado_anterior: estadoAnterior,
      estado_nuevo: nuevoEstado,
      created_at: new Date().toISOString(),
    };

    if (!project.actividades) project.actividades = [];
    project.actividades.unshift(nuevaActividad);

    this.saveLocal();
    return project;
  }

  /**
   * Add evidence photo to project
   */
  public addEvidence(projectId: string, evidencia: Evidencia) {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;

    if (!project.evidencias) project.evidencias = [];
    project.evidencias.push(evidencia);

    project.actividades?.unshift({
      id: `act-${Date.now()}`,
      proyecto_id: projectId,
      usuario_nombre: 'Usuario',
      usuario_rol: 'cliente',
      tipo_actividad: 'CARGA_EVIDENCIA',
      titulo: 'Nueva Evidencia Fotográfica Registrada',
      descripcion: `Archivo: ${evidencia.nombre_archivo} (${evidencia.descripcion || 'Sin descripción'}).`,
      created_at: new Date().toISOString(),
    });

    this.saveLocal();
  }

  /**
   * Save technical solution for a project (by Técnico)
   */
  public saveTechnicalSolution(
    projectId: string,
    solucion: SolucionTecnica,
    tecnicoNombre: string
  ) {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;

    project.solucion_tecnica = solucion;
    project.estado = 'SOLUCION_GENERADA';

    project.actividades?.unshift({
      id: `act-${Date.now()}`,
      proyecto_id: projectId,
      usuario_nombre: tecnicoNombre,
      usuario_rol: 'tecnico',
      tipo_actividad: 'SOLUCION_APROBADA',
      titulo: 'Solución Técnica Elaborada y Aprobada',
      descripcion: `Sistema: ${solucion.nombre_sistema} con ${solucion.capas.length} capas de recubrimiento (${solucion.garantia_anos} años de garantía).`,
      estado_anterior: 'VALIDACION_TECNICA',
      estado_nuevo: 'SOLUCION_GENERADA',
      created_at: new Date().toISOString(),
    });

    this.saveLocal();
  }

  /**
   * Attach or update quotation for a project (by Comercial)
   */
  public attachQuote(projectId: string, cotizacion: Cotizacion, comercialNombre: string) {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;

    if (!project.cotizaciones) project.cotizaciones = [];
    const existingIndex = project.cotizaciones.findIndex((c) => c.id === cotizacion.id);
    if (existingIndex >= 0) {
      project.cotizaciones[existingIndex] = cotizacion;
    } else {
      project.cotizaciones.unshift(cotizacion);
    }

    if (cotizacion.estado === 'ENVIADA') {
      project.estado = 'COTIZACION';
    } else if (cotizacion.estado === 'APROBADA') {
      project.estado = 'APROBADO';
    }

    project.actividades?.unshift({
      id: `act-${Date.now()}`,
      proyecto_id: projectId,
      usuario_nombre: comercialNombre,
      usuario_rol: 'comercial',
      tipo_actividad: 'COTIZACION_EMITIDA',
      titulo: `Cotización ${cotizacion.codigo} Actualizada (${cotizacion.estado})`,
      descripcion: `Monto total: $${cotizacion.total.toLocaleString()} ${cotizacion.moneda}. Validez: ${cotizacion.validez_dias} días.`,
      created_at: new Date().toISOString(),
    });

    this.saveLocal();
  }
}

export const projectService = new ProjectService();
