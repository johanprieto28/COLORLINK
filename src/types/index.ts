/**
 * COLORLINK · Modelos de dominio
 * Reflejan 1:1 las tablas de supabase/migrations/001_esquema_colorlink.sql
 * y son compartidos por el frontend (src/) y el backend (server/).
 */

export type UserRole = 'cliente' | 'tecnico' | 'comercial' | 'operaciones' | 'administrador';
export type StaffRole = Exclude<UserRole, 'cliente'>;

export const ROLE_LABELS: Record<UserRole, string> = {
  cliente: 'Cliente',
  tecnico: 'Técnico',
  comercial: 'Comercial',
  operaciones: 'Operaciones',
  administrador: 'Administrador',
};

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

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  BORRADOR: 'Borrador',
  RECIBIDO: 'Recibido',
  EN_ANALISIS: 'En análisis',
  VALIDACION_TECNICA: 'En validación técnica',
  SOLUCION_GENERADA: 'Solución propuesta',
  COTIZACION: 'Cotización enviada',
  APROBADO: 'Aprobado',
  ABASTECIMIENTO: 'Abastecimiento',
  SERVICIO_PROGRAMADO: 'Servicio programado',
  EN_EJECUCION: 'En ejecución',
  CALIDAD: 'Control de calidad',
  CERRADO: 'Cerrado',
  CANCELADO: 'Cancelado',
};

export type HumidityLevel = 'BAJA' | 'MEDIA' | 'ALTA';
export type WearLevel = 'NINGUNO' | 'LEVE' | 'MODERADO' | 'AVANZADO';
export type SeverityLevel = 'LEVE' | 'MODERADO' | 'SEVERO' | 'CRITICO';
export type ComplexityLevel = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type ClientType = 'PERSONA_NATURAL' | 'EMPRESA' | 'COPROPIEDAD' | 'ENTIDAD';
export type ClientChannel = 'WEB' | 'WHATSAPP' | 'REFERIDO' | 'COMERCIAL' | 'FERIA';
export type ProjectType = 'RESIDENCIAL' | 'COMERCIAL' | 'INDUSTRIAL' | 'INFRAESTRUCTURA' | 'HOSPITALARIO';
export type SurfaceLocation = 'INTERIOR' | 'EXTERIOR' | 'MIXTO';

export interface UserProfile {
  id: string;
  email: string;
  nombre_completo: string;
  telefono?: string | null;
  empresa?: string | null;
  tipo_documento?: string | null;
  documento?: string | null;
  ciudad?: string | null;
  direccion?: string | null;
  cargo?: string | null;
  rol: UserRole;
  activo: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Cliente {
  id: string;
  usuario_id?: string | null;
  tipo_cliente: ClientType;
  nombre: string;
  empresa?: string | null;
  tipo_documento?: string | null;
  documento?: string | null;
  telefono: string;
  correo: string;
  ciudad?: string | null;
  canal_entrada: ClientChannel;
  created_at: string;
  total_proyectos?: number;
}

export interface AreaProyecto {
  id: string;
  proyecto_id: string;
  nombre: string;
  tipo_superficie: string;
  area_m2: number;
  unidad_medida: string;
  ambiente: string;
  ubicacion: SurfaceLocation;
  color_actual?: string | null;
  color_requerido?: string | null;
  colores?: string[];
  humedad: HumidityLevel;
  fisuras: boolean;
  tipo_fisura?: string | null;
  desgaste: WearLevel;
  desprendimiento: boolean;
  estado_general?: string | null;
  descripcion_problema?: string | null;
  created_at: string;
}

export interface Evidencia {
  id: string;
  proyecto_id: string;
  storage_path: string;
  /** URL firmada temporal entregada por el backend */
  url: string | null;
  nombre_archivo: string;
  tamano_bytes?: number | null;
  mime_type?: string | null;
  descripcion?: string | null;
  etiqueta_patologia?: string | null;
  severidad_visual?: SeverityLevel | null;
  created_at: string;
}

export interface CapaSistema {
  tipo: 'IMPRIMANTE' | 'INTERMEDIO' | 'ACABADO';
  producto: string;
  espesor_micrones: number;
  manos: number;
  funcion: string;
}

export interface SistemaSugerido {
  nombreSistema: string;
  capas: CapaSistema[];
  garantiaEstimadaAnos: number;
}

export interface Diagnostico {
  id: string;
  proyecto_id: string;
  complejidad: ComplexityLevel;
  severidad: SeverityLevel;
  patologias: string[];
  validacion_tecnica_requerida: boolean;
  recomendacion_preliminar: string;
  preparacion_superficie_recomendada: string;
  observaciones_tecnicas?: string | null;
  norma_aplicable?: string | null;
  sistema_sugerido?: SistemaSugerido | null;
  clasificacion?: ClasificacionIA | null;
  origen_motor: 'GEMINI' | 'MOTOR_REGLAS' | 'TECNICO';
  validado_por?: string | null;
  validado_por_nombre?: string | null;
  fecha_validacion?: string | null;
  created_at: string;
  updated_at?: string;
}

export type MetodoAplicacion = 'BROCHA_RODILLO' | 'AIRLESS' | 'ASPERSION_CONVENCIONAL' | 'LLANA';

export interface SolucionTecnica {
  id: string;
  proyecto_id: string;
  tecnico_id?: string | null;
  nombre_sistema: string;
  descripcion_sistema?: string | null;
  preparacion_superficie: string;
  metodo_aplicacion: MetodoAplicacion;
  capas: CapaSistema[];
  garantia_anos: number;
  observaciones?: string | null;
  created_at: string;
  updated_at?: string;
}

export type CategoriaItemCotizacion = 'MATERIAL' | 'MANO_OBRA' | 'EQUIPO' | 'LOGISTICA' | 'PREPARACION';

export interface ItemCotizacion {
  id?: string;
  orden?: number;
  categoria: CategoriaItemCotizacion;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export type EstadoCotizacion = 'BORRADOR' | 'ENVIADA' | 'APROBADA' | 'RECHAZADA';

export interface Cotizacion {
  id: string;
  codigo: string;
  proyecto_id: string;
  comercial_id?: string | null;
  items: ItemCotizacion[];
  subtotal: number;
  descuento_porcentaje: number;
  descuento_valor: number;
  impuesto_porcentaje: number;
  impuesto_valor: number;
  total: number;
  moneda: string;
  validez_dias: number;
  condiciones_pago?: string | null;
  tiempo_entrega_dias: number;
  observaciones?: string | null;
  estado: EstadoCotizacion;
  respuesta_cliente?: string | null;
  fecha_respuesta?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ActividadProyecto {
  id: string;
  proyecto_id: string;
  usuario_nombre: string;
  usuario_rol: string;
  tipo_actividad: string;
  titulo: string;
  descripcion?: string | null;
  estado_anterior?: ProjectStatus | null;
  estado_nuevo?: ProjectStatus | null;
  created_at: string;
}

export interface Consentimiento {
  id: string;
  autorizacion_datos: boolean;
  autorizacion_uso_tecnico: boolean;
  origen_canal: string;
  declaracion_texto: string;
  created_at: string;
}

export interface ServicioCampo {
  id: string;
  proyecto_id: string;
  proyecto_codigo?: string;
  proyecto_nombre?: string;
  cuadrilla: string;
  lider: string;
  fecha_inicio: string;
  fecha_fin_estimada: string;
  fecha_fin_real?: string | null;
  estado: 'PROGRAMADO' | 'EN_EJECUCION' | 'DETENIDO' | 'FINALIZADO';
  direccion?: string | null;
  novedades?: string | null;
  avance: number;
  created_at: string;
}

export interface InspeccionCalidad {
  id: string;
  proyecto_id: string;
  proyecto_codigo?: string;
  proyecto_nombre?: string;
  servicio_id?: string | null;
  inspector_nombre: string;
  fecha: string;
  adherencia_ok: boolean;
  espesor_ok: boolean;
  espesor_promedio_micrones?: number | null;
  acabado_visual: 'EXCELENTE' | 'BUENO' | 'CON_OBSERVACIONES' | 'RECHAZADO';
  curado_ok: boolean;
  observaciones?: string | null;
  resultado: 'APROBADO' | 'REQUIERE_REPARACION';
  created_at: string;
}

/** Resumen usado en listados */
export interface ProyectoResumen {
  id: string;
  codigo: string;
  nombre: string;
  estado: ProjectStatus;
  prioridad: 'NORMAL' | 'ALTA' | 'URGENTE';
  ciudad: string;
  tipo_proyecto: ProjectType;
  fecha_requerida?: string | null;
  cliente_nombre: string;
  cliente_empresa?: string | null;
  tecnico_nombre?: string | null;
  comercial_nombre?: string | null;
  area_m2?: number | null;
  tipo_superficie?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Proyecto extends ProyectoResumen {
  cliente_id: string;
  cliente: Cliente;
  direccion?: string | null;
  tecnico_id?: string | null;
  comercial_id?: string | null;
  areas: AreaProyecto[];
  evidencias: Evidencia[];
  diagnostico?: Diagnostico | null;
  solucion_tecnica?: SolucionTecnica | null;
  cotizaciones: Cotizacion[];
  servicios: ServicioCampo[];
  inspecciones: InspeccionCalidad[];
  consentimiento?: Consentimiento | null;
  actividades: ActividadProyecto[];
  /** Resultado de la validación automática al registrar el proyecto */
  validacion?: ValidacionReporte | null;
  /** Acciones que el usuario actual puede ejecutar (calculadas en el servidor) */
  permisos: PermisosProyecto;
}

export interface PermisosProyecto {
  esPropietario: boolean;
  puedeSubirEvidencias: boolean;
  puedeTomarComoTecnico: boolean;
  puedeDiagnosticar: boolean;
  puedeEditarSolucion: boolean;
  puedeCotizar: boolean;
  puedeResponderCotizacion: boolean;
  puedeProgramarServicio: boolean;
  puedeRegistrarCalidad: boolean;
  puedeCancelar: boolean;
  transicionesPermitidas: ProjectStatus[];
}

export interface ProjectFormData {
  // Paso 1: Cliente
  clienteTipo: ClientType;
  clienteNombre: string;
  clienteEmpresa: string;
  /** CC, CE, PPT, PA, TI o NIT */
  clienteTipoDocumento: string;
  clienteDocumento: string;
  clienteTelefono: string;
  clienteCorreo: string;
  clienteCanal: ClientChannel;

  // Paso 2: Proyecto
  proyectoNombre: string;
  ciudad: string;
  direccion: string;
  tipoProyecto: ProjectType;
  fechaRequerida: string;

  // Paso 3: Superficie y condición
  tipoSuperficie: string;
  areaAproximada: number;
  unidadMedida: string;
  ambiente: string;
  ubicacion: SurfaceLocation;
  colorActual: string;
  colorRequerido: string;
  /** Ids de public.colores (máximo 2): el primero es el principal */
  colores: string[];
  humedad: HumidityLevel;
  fisuras: boolean;
  tipoFisura?: string;
  desgaste: WearLevel;
  desprendimiento: boolean;
  estadoSuperficie: string;
  descripcionProblema: string;

  // Paso 4: Evidencias (ya subidas a Storage como pendientes)
  evidencias: Array<{
    storage_path: string;
    preview_url: string;
    nombre_archivo: string;
    descripcion: string;
    tamano_bytes?: number;
    mime_type?: string;
  }>;

  // Paso 5: Consentimiento
  autorizacionDatos: boolean;
  autorizacionUsoTecnico: boolean;
  /** El usuario confirma que no es la misma solicitud que un proyecto parecido ya registrado */
  confirmarDuplicado?: boolean;
}

// ------------------------------------------------------------------------------
// Validación automática de la captura (entregable 2 del MVP)
// ------------------------------------------------------------------------------
export type DimensionValidacion = 'COMPLETITUD' | 'FORMATO' | 'COHERENCIA' | 'DUPLICIDAD' | 'TRAZABILIDAD';
export type NivelHallazgo = 'ERROR' | 'ADVERTENCIA' | 'OK';

export const DIMENSION_VALIDACION_LABELS: Record<DimensionValidacion, string> = {
  COMPLETITUD: 'Completitud',
  FORMATO: 'Formato',
  COHERENCIA: 'Coherencia',
  DUPLICIDAD: 'Duplicidad',
  TRAZABILIDAD: 'Trazabilidad',
};

export interface HallazgoValidacion {
  dimension: DimensionValidacion;
  nivel: NivelHallazgo;
  campo?: string;
  mensaje: string;
}

export interface ProyectoSimilar {
  id: string;
  codigo: string;
  nombre: string;
  estado: ProjectStatus;
  ciudad: string;
  created_at: string;
  /** 0 a 1 */
  similitud: number;
}

export interface ValidacionReporte {
  estado: 'APROBADA' | 'CON_OBSERVACIONES' | 'RECHAZADA';
  /** 0 a 100 */
  puntaje: number;
  hallazgos: HallazgoValidacion[];
  duplicados: ProyectoSimilar[];
  trazabilidad: {
    usuario_id: string;
    usuario_nombre: string;
    usuario_rol: string;
    canal: string;
    origen: 'PORTAL_WEB' | 'PANEL_INTERNO';
    ip: string | null;
    fecha: string;
  };
}

// ------------------------------------------------------------------------------
// Tienda
// ------------------------------------------------------------------------------
export type CategoriaProducto =
  | 'INTERIOR'
  | 'EXTERIOR'
  | 'HUMEDAD'
  | 'FISURAS'
  | 'PREPARACION'
  | 'HERRAMIENTAS'
  | 'DECORATIVOS';

export const CATEGORIA_PRODUCTO_LABELS: Record<CategoriaProducto, string> = {
  INTERIOR: 'Pintura para interiores',
  EXTERIOR: 'Pintura para exteriores',
  HUMEDAD: 'Humedad e impermeabilización',
  FISURAS: 'Reparación de fisuras',
  PREPARACION: 'Preparación de superficies',
  HERRAMIENTAS: 'Herramientas y accesorios',
  DECORATIVOS: 'Acabados decorativos',
};

export interface Producto {
  id: string;
  sku: string;
  slug: string;
  nombre: string;
  descripcion: string;
  categoria: CategoriaProducto;
  presentacion: string;
  unidad: string;
  precio: number;
  precio_anterior?: number | null;
  stock: number;
  color_hex?: string | null;
  acabado?: string | null;
  rendimiento_m2?: number | null;
  imagen_url?: string | null;
  destacado: boolean;
  activo: boolean;
  ficha?: FichaProducto | null;
}

export interface FichaProducto {
  beneficios?: string[];
  usos?: string[];
  especificaciones?: Array<{ etiqueta: string; valor: string }>;
}

/** Campos internos visibles solo en el panel */
export interface ProductoInventario extends Producto {
  costo: number;
  stock_minimo: number;
  ubicacion_bodega?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CarritoItem {
  producto: Producto;
  cantidad: number;
}

export interface Carrito {
  items: CarritoItem[];
  subtotal: number;
  costo_envio: number;
  total: number;
  envio_gratis_desde: number;
}

export type EstadoPedido = 'PENDIENTE' | 'CONFIRMADO' | 'PREPARANDO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';
export type MetodoPago = 'CONTRA_ENTREGA' | 'TRANSFERENCIA' | 'PASARELA';

export const ESTADO_PEDIDO_LABELS: Record<EstadoPedido, string> = {
  PENDIENTE: 'Pendiente de confirmación',
  CONFIRMADO: 'Confirmado',
  PREPARANDO: 'En preparación',
  ENVIADO: 'Enviado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

export const METODO_PAGO_LABELS: Record<MetodoPago, string> = {
  CONTRA_ENTREGA: 'Pago contra entrega',
  TRANSFERENCIA: 'Transferencia bancaria',
  PASARELA: 'Pago en línea',
};

export interface PedidoItem {
  id: string;
  producto_id?: string | null;
  sku: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Pedido {
  id: string;
  codigo: string;
  usuario_id?: string | null;
  estado: EstadoPedido;
  metodo_pago: MetodoPago;
  estado_pago: 'PENDIENTE' | 'PAGADO' | 'REEMBOLSADO';
  subtotal: number;
  costo_envio: number;
  iva_incluido: number;
  total: number;
  nombre_contacto: string;
  telefono: string;
  correo: string;
  ciudad: string;
  direccion: string;
  notas?: string | null;
  transportadora?: string | null;
  numero_guia?: string | null;
  enviado_at?: string | null;
  entregado_at?: string | null;
  items: PedidoItem[];
  created_at: string;
  updated_at?: string;
}

/** Transportadoras que se pueden elegir al marcar un pedido como enviado */
export const TRANSPORTADORAS = [
  'Servientrega',
  'Coordinadora',
  'Interrapidísimo',
  'Envía',
  'TCC',
  'Deprisa',
  '4-72',
  'Entrega propia COLORLINK',
] as const;

export type TipoEventoPedido = 'ESTADO' | 'PAGO' | 'ENVIO' | 'NOTA';

export interface PedidoEvento {
  id: string;
  pedido_id: string;
  tipo: TipoEventoPedido;
  estado_anterior?: string | null;
  estado_nuevo?: string | null;
  nota?: string | null;
  usuario_nombre?: string | null;
  usuario_rol?: string | null;
  created_at: string;
}

export interface CheckoutData {
  nombre_contacto: string;
  telefono: string;
  correo: string;
  ciudad: string;
  direccion: string;
  notas?: string;
  metodo_pago: MetodoPago;
}

// ------------------------------------------------------------------------------
// Operaciones
// ------------------------------------------------------------------------------
export type EstadoAbastecimiento = 'PENDIENTE' | 'ORDENADO' | 'EN_TRANSITO' | 'RECIBIDO' | 'CANCELADO';

export interface Abastecimiento {
  id: string;
  codigo_orden: string;
  proyecto_id?: string | null;
  proyecto_codigo?: string | null;
  producto_id: string;
  producto_nombre: string;
  producto_sku: string;
  cantidad: number;
  proveedor: string;
  fecha_estimada_llegada?: string | null;
  estado: EstadoAbastecimiento;
  costo_total: number;
  fecha_recepcion?: string | null;
  created_at: string;
}

export interface MovimientoInventario {
  id: string;
  producto_id: string;
  producto_nombre?: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  cantidad: number;
  stock_resultante: number;
  motivo: string;
  referencia?: string | null;
  created_at: string;
}

// ------------------------------------------------------------------------------
// Asistente IA
// ------------------------------------------------------------------------------
export type AccionAsistente =
  | 'IR_TIENDA'
  | 'VER_PRODUCTO'
  | 'EXPLORAR_COLORES'
  | 'CREAR_PROYECTO'
  | 'VER_PROYECTOS'
  | 'VER_SOLUCIONES'
  | 'VER_CARRITO'
  | 'VER_PEDIDOS';

export interface AsistenteAccion {
  tipo: AccionAsistente;
  etiqueta: string;
  /** slug de producto, categoría o id de color según el tipo */
  valor?: string;
}

export interface AsistenteRespuesta {
  respuesta: string;
  acciones: AsistenteAccion[];
  motor: 'GEMINI' | 'BASICO';
}

export interface AIDiagnosisResult {
  nivelComplejidad: ComplexityLevel;
  severidad: SeverityLevel;
  patologiasDetectadas: string[];
  validacionTecnicaRequerida: boolean;
  recomendacionPreliminar: string;
  preparacionSuperficieSugerida: string;
  sistemaSugerido: SistemaSugerido;
  advertencias: string[];
  clasificacion: ClasificacionIA;
  motorUtilizado: 'GEMINI' | 'MOTOR_REGLAS';
}

// ------------------------------------------------------------------------------
// Clasificación con IA (entregable 3 del MVP)
// ------------------------------------------------------------------------------
export type CategoriaNecesidad =
  | 'PINTURA_DECORATIVA'
  | 'FACHADAS'
  | 'IMPERMEABILIZACION'
  | 'REPARACION_FISURAS'
  | 'PROTECCION_ANTICORROSIVA'
  | 'PISOS_INDUSTRIALES'
  | 'MANTENIMIENTO_GENERAL';

export const CATEGORIA_NECESIDAD_LABELS: Record<CategoriaNecesidad, string> = {
  PINTURA_DECORATIVA: 'Pintura decorativa',
  FACHADAS: 'Fachadas',
  IMPERMEABILIZACION: 'Impermeabilización y humedad',
  REPARACION_FISURAS: 'Reparación de fisuras',
  PROTECCION_ANTICORROSIVA: 'Protección anticorrosiva',
  PISOS_INDUSTRIALES: 'Pisos industriales',
  MANTENIMIENTO_GENERAL: 'Mantenimiento general',
};

/** JSON estructurado que resulta de interpretar texto, fotos y documentos del cliente */
export interface ClasificacionIA {
  categoria: CategoriaNecesidad;
  /** Resumen corto de la condición, p. ej. "humedad + fisuras" */
  condicion: string;
  complejidad: ComplexityLevel;
  /** 0 a 1 */
  confianza: number;
  /** Texto legible encontrado en fotos o documentos (fichas, etiquetas, planos) */
  textoExtraido: string;
  hallazgosVisuales: string[];
  archivosAnalizados: number;
  motor: 'GEMINI' | 'MOTOR_REGLAS';
}

/** Entrada de diagnóstico (formulario del asistente o del proyecto) */
export interface DiagnosisInput {
  tipoSuperficie?: string;
  areaAproximada?: number;
  ambiente?: string;
  ubicacion?: string;
  humedad?: HumidityLevel;
  fisuras?: boolean;
  desgaste?: WearLevel;
  desprendimiento?: boolean;
  descripcionProblema?: string;
  tieneFotos?: boolean;
}

// ------------------------------------------------------------------------------
// Panel
// ------------------------------------------------------------------------------
export interface MetricasPanel {
  proyectosPorEstado: Partial<Record<ProjectStatus, number>>;
  proyectosTotal: number;
  pedidosPorEstado: Partial<Record<EstadoPedido, number>>;
  ventasMes: number;
  ventasMesAnterior: number;
  productosBajoStock: number;
  clientesTotal: number;
  cotizacionesPendientes: number;
  serviciosActivos: number;
}

export interface EstadoSistema {
  supabase: { ok: boolean; detalle: string };
  gemini: { ok: boolean; detalle: string; modelo: string };
  correo: { ok: boolean; detalle: string; proveedor: string };
}

export interface Ciudad {
  nombre: string;
  departamento: string;
}
