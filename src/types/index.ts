/**
 * COLORLINK Type Definitions
 * Complete domain models matching PostgreSQL/Supabase database schema
 */

export type UserRole = 'cliente' | 'tecnico' | 'comercial' | 'operaciones' | 'administrador';

export type ProjectStatus =
  | 'BORRADOR'
  | 'RECIBIDO'
  | 'EN_ANALISIS'
  | 'VALIDACION_TECNICA'
  | 'SOLUCION_GENERADA'
  | 'COTIZACION'
  | 'APROBADO'
  | 'ABASTECIMIENTO'
  | 'SERVICIO_PROGRAMADO'
  | 'EN_EJECUCION'
  | 'CALIDAD'
  | 'CERRADO'
  | 'CANCELADO';

export type HumidityLevel = 'BAJA' | 'MEDIA' | 'ALTA';
export type WearLevel = 'NINGUNO' | 'LEVE' | 'MODERADO' | 'AVANZADO';
export type SeverityLevel = 'LEVE' | 'MODERADO' | 'SEVERO' | 'CRITICO';
export type ComplexityLevel = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export interface UserProfile {
  id: string;
  email: string;
  nombre_completo: string;
  telefono?: string;
  empresa?: string;
  documento_nit?: string;
  rol: UserRole;
  cargo?: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

export type ClientType = 'PERSONA_NATURAL' | 'EMPRESA' | 'COPROPIEDAD' | 'ENTIDAD';

export interface Cliente {
  id: string;
  usuario_id?: string;
  tipo_cliente?: ClientType | string;
  nombre: string;
  empresa?: string;
  documento_nit?: string;
  telefono: string;
  correo: string;
  canal_entrada: 'WEB' | 'WHATSAPP' | 'REFERIDO' | 'COMERCIAL' | 'FERIA';
  created_at: string;
  updated_at?: string;
}

export interface AreaProyecto {
  id: string;
  proyecto_id: string;
  nombre: string;
  tipo_superficie: string; // 'CONCRETO', 'ACERO_CARBONO', 'MAMPOSTERIA', 'DRYWALL', 'MADERA', 'PISO_INDUSTRIAL'
  area_m2: number;
  unidad_medida: string; // 'm2', 'm lineal'
  ambiente: 'INDUSTRIAL' | 'COMERCIAL' | 'RESIDENCIAL' | 'HOSPITALARIO' | 'MARINO';
  ubicacion: 'INTERIOR' | 'EXTERIOR' | 'MIXTO';
  color_actual: string;
  color_requerido: string;
  humedad: HumidityLevel;
  fisuras: boolean;
  tipo_fisura?: 'SUPERFICIAL' | 'ESTRUCTURAL' | 'NINGUNA';
  desgaste: WearLevel;
  desprendimiento: boolean;
  estado_general: string;
  descripcion_problema: string;
  created_at: string;
}

export interface Evidencia {
  id: string;
  proyecto_id: string;
  area_id?: string;
  archivo_url: string;
  storage_path: string;
  nombre_archivo: string;
  tamano_bytes?: number;
  mime_type: string;
  descripcion?: string;
  etiqueta_patologia?: string; // 'Fisuras', 'Humedad', 'Ampollamiento', 'Corrosión'
  severidad_visual?: SeverityLevel;
  fecha_captura: string;
  creado_por?: string;
  created_at: string;
}

export interface Diagnostico {
  id: string;
  proyecto_id: string;
  tecnico_id?: string;
  complejidad: ComplexityLevel;
  severidad: SeverityLevel;
  humedad_detectada: HumidityLevel;
  fisuras_presentes: boolean;
  desgaste_detectado: WearLevel;
  desprendimiento_presente: boolean;
  patologias: string[];
  validacion_tecnica_requerida: boolean;
  recomendacion_preliminar: string;
  observaciones_tecnicas?: string;
  preparacion_superficie_recomendada: string;
  norma_aplicable?: string; // ej: SSPC-SP 13 / NACE 6, SSPC-SP 10
  origen_motor: 'COLORLINK_IA' | 'TECNICO_HUMANO' | 'HIBRIDO';
  validado_por?: string;
  fecha_validacion?: string;
  created_at: string;
  updated_at?: string;
}

export interface CapaRecubrimiento {
  id?: string;
  tipo: 'IMPRIMANTE' | 'INTERMEDIO' | 'ACABADO' | 'SEMI_ACABADO';
  producto: string;
  codigo_producto?: string;
  espesor_dft_micrones: number;
  numero_manos: number;
  intervalo_repintado_horas: string;
  rendimiento_teorico_m2_gal?: number;
  solidos_volumen?: number;
  funcion_tecnica: string;
}

export interface SolucionTecnica {
  id: string;
  proyecto_id: string;
  diagnostico_id?: string;
  tecnico_id: string;
  nombre_sistema: string;
  descripcion_sistema: string;
  preparacion_superficie: string;
  metodo_aplicacion: 'BROCHA_RODILLO' | 'AIRLESS' | 'ASPERSIÓN_CONVENCIONAL' | 'LLANA';
  capas: CapaRecubrimiento[];
  garantia_anos: number;
  resistencia_quimica?: string;
  resistencia_uv?: string;
  resistencia_abrasion?: string;
  observaciones?: string;
  aprobado_cliente: boolean;
  fecha_aprobacion?: string;
  created_at: string;
  updated_at?: string;
}

export interface ItemCotizacion {
  id: string;
  cotizacion_id?: string;
  categoria: 'MATERIAL' | 'MANO_OBRA' | 'EQUIPO' | 'LOGISTICA' | 'PREPARACION';
  descripcion: string;
  unidad: 'GALÓN' | 'CUÑETE' | 'M2' | 'GLOBAL' | 'DÍA' | 'HORA';
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Cotizacion {
  id: string;
  codigo: string;
  proyecto_id: string;
  comercial_id: string;
  solucion_tecnica_id?: string;
  items: ItemCotizacion[];
  subtotal: number;
  descuento_porcentaje: number;
  descuento_valor: number;
  impuesto_porcentaje: number; // e.g. 19%
  impuesto_valor: number;
  total: number;
  moneda: 'USD' | 'COP';
  validez_dias: number;
  condiciones_pago: string;
  tiempo_entrega_dias: number;
  estado: 'BORRADOR' | 'ENVIADA' | 'APROBADA' | 'RECHAZADA';
  observaciones_comerciales?: string;
  created_at: string;
  updated_at?: string;
}

export interface MaterialInventario {
  id: string;
  codigo_sku: string;
  nombre: string;
  categoria: 'IMPRIMANTE' | 'EPÓXICO' | 'POLIURETANO' | 'ACRÍLICO' | 'DILUYENTE' | 'ABRASIVO';
  unidad: 'GALÓN' | 'CUÑETE' | 'LITRO' | 'BULTO';
  stock_actual: number;
  stock_minimo: number;
  costo_unitario: number;
  precio_venta: number;
  ubicacion_bodega: string;
  lote?: string;
  fecha_vencimiento?: string;
  created_at: string;
  updated_at?: string;
}

export interface Abastecimiento {
  id: string;
  codigo_orden: string;
  proyecto_id: string;
  material_id: string;
  material_nombre: string;
  cantidad_requerida: number;
  unidad: string;
  proveedor: string;
  fecha_solicitud: string;
  fecha_estimada_llegada: string;
  estado: 'PENDIENTE' | 'ORDENADO' | 'EN_TRANSITO' | 'RECIBIDO';
  costo_total: number;
  recibido_por?: string;
  created_at: string;
}

export interface ServicioProgramado {
  id: string;
  proyecto_id: string;
  cuadrilla_asignada: string;
  lider_tecnico: string;
  fecha_inicio: string;
  fecha_fin_estimada: string;
  fecha_fin_real?: string;
  estado: 'PROGRAMADO' | 'EN_EJECUCION' | 'DETENIDO' | 'FINALIZADO';
  direccion_ejecucion: string;
  novedades_campo?: string;
  avance_porcentaje: number;
  created_at: string;
}

export interface ControlCalidad {
  id: string;
  proyecto_id: string;
  servicio_id?: string;
  inspector: string;
  fecha_inspeccion: string;
  prueba_adherencia_cruzada: boolean; // ASTM D3359
  medicion_espesor_dft_ok: boolean; // SSPC-PA 2
  espesor_promedio_micrones: number;
  inspeccion_visual_acabado: 'EXCELENTE' | 'BUENO' | 'CON_OBSERVACIONES' | 'RECHAZADO';
  curado_adecuado: boolean;
  observaciones: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'REQUIERE_REPARACION';
  firma_inspector?: string;
  created_at: string;
}

export interface Consentimiento {
  id: string;
  proyecto_id: string;
  cliente_id?: string;
  autorizacion_tratamiento_datos: boolean;
  autorizacion_uso_tecnico_fotos: boolean;
  origen_canal: string;
  ip_registro?: string;
  fecha_aceptacion: string;
  declaracion_texto: string;
  created_at: string;
}

export interface ActividadProyecto {
  id: string;
  proyecto_id: string;
  usuario_id?: string;
  usuario_nombre: string;
  usuario_rol: UserRole;
  tipo_actividad:
    | 'CREACION'
    | 'CAMBIO_ESTADO'
    | 'CARGA_EVIDENCIA'
    | 'DIAGNOSTICO_GENERADO'
    | 'SOLUCION_APROBADA'
    | 'COTIZACION_EMITIDA'
    | 'PROGRAMACION_SERVICIO'
    | 'INSPECCION_CALIDAD'
    | 'OBSERVACION';
  titulo: string;
  descripcion: string;
  estado_anterior?: ProjectStatus;
  estado_nuevo?: ProjectStatus;
  created_at: string;
}

export interface Auditoria {
  id: string;
  tabla_afectada: string;
  registro_id: string;
  accion: 'INSERT' | 'UPDATE' | 'DELETE';
  usuario_id?: string;
  usuario_email?: string;
  detalles: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface Proyecto {
  id: string;
  codigo: string; // ej: CLK-2026-0042
  nombre: string;
  cliente_id: string;
  cliente?: Cliente;
  tecnico_asignado_id?: string;
  tecnico_nombre?: string;
  comercial_asignado_id?: string;
  comercial_nombre?: string;
  ciudad: string;
  direccion: string;
  tipo_proyecto: 'INDUSTRIAL' | 'COMERCIAL' | 'INFRAESTRUCTURA' | 'RESIDENCIAL' | 'HOSPITALARIO';
  fecha_requerida: string;
  estado: ProjectStatus;
  prioridad: 'NORMAL' | 'ALTA' | 'URGENTE';
  
  // Relations & Details
  areas: AreaProyecto[];
  evidencias: Evidencia[];
  diagnostico?: Diagnostico;
  solucion_tecnica?: SolucionTecnica;
  cotizaciones?: Cotizacion[];
  servicios?: ServicioProgramado[];
  calidad?: ControlCalidad[];
  consentimiento?: Consentimiento;
  actividades?: ActividadProyecto[];
  
  created_at: string;
  updated_at?: string;
}

export interface ProjectFormData {
  // Step 1: Cliente
  clienteTipo: ClientType;
  clienteNombre: string;
  clienteEmpresa: string;
  clienteDocumento: string;
  clienteTelefono: string;
  clienteCorreo: string;
  clienteCanal: 'WEB' | 'WHATSAPP' | 'REFERIDO' | 'COMERCIAL' | 'FERIA';

  // Step 2: Info Proyecto
  proyectoNombre: string;
  ciudad: string;
  direccion: string;
  tipoProyecto: 'INDUSTRIAL' | 'COMERCIAL' | 'INFRAESTRUCTURA' | 'RESIDENCIAL' | 'HOSPITALARIO';
  fechaRequerida: string;

  // Step 3: Superficie
  tipoSuperficie: string;
  areaAproximada: number;
  unidadMedida: string;
  ambiente: 'INDUSTRIAL' | 'COMERCIAL' | 'RESIDENCIAL' | 'HOSPITALARIO' | 'MARINO';
  ubicacion: 'INTERIOR' | 'EXTERIOR' | 'MIXTO';
  colorActual: string;
  colorRequerido: string;

  // Step 4: Condición
  humedad: HumidityLevel;
  fisuras: boolean;
  tipoFisura?: 'SUPERFICIAL' | 'ESTRUCTURAL' | 'NINGUNA';
  desgaste: WearLevel;
  desprendimiento: boolean;
  estadoSuperficie: string;
  descripcionProblema: string;

  // Step 5: Evidencias
  evidencias: Array<{
    id: string;
    archivo_url: string;
    nombre_archivo: string;
    descripcion: string;
    fecha_captura: string;
    tamano_bytes?: number;
    mime_type?: string;
  }>;

  // Step 6: Consentimiento
  autorizacionDatos: boolean;
  autorizacionUsoTecnico: boolean;
  origenCanal: string;
}
