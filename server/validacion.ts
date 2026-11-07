import type {
  DimensionValidacion,
  HallazgoValidacion,
  ProjectStatus,
  ProyectoSimilar,
  UserProfile,
  ValidacionReporte,
} from '../src/types';
import { normalizar as normalizarCampo, validarCampo } from '../src/data/reglasRegistro';
import { DIMENSION_VALIDACION_LABELS } from '../src/types';
import { db } from './supabase';

/**
 * Validación automática de una solicitud de proyecto (entregable 2 del MVP).
 * A diferencia de los validadores de http.ts, no lanza en el primer error: revisa
 * todo y devuelve un reporte con los hallazgos de completitud, formato, coherencia,
 * duplicidad y trazabilidad, para mostrarlo al usuario y guardarlo con el proyecto.
 */

export const SUPERFICIES = ['MAMPOSTERIA', 'DRYWALL', 'CONCRETO', 'MADERA', 'ACERO_CARBONO', 'ACERO_GALVANIZADO'] as const;
const TIPOS_PROYECTO = ['RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL', 'INFRAESTRUCTURA', 'HOSPITALARIO'] as const;
const CANALES = ['WEB', 'WHATSAPP', 'REFERIDO', 'COMERCIAL', 'FERIA'] as const;

/** Área máxima razonable por tipo de proyecto; por encima se pide confirmar la magnitud */
const AREA_MAXIMA_ESPERADA: Record<(typeof TIPOS_PROYECTO)[number], number> = {
  RESIDENCIAL: 3000,
  COMERCIAL: 20000,
  HOSPITALARIO: 30000,
  INDUSTRIAL: 100000,
  INFRAESTRUCTURA: 200000,
};

/** Rendimiento de referencia de una cuadrilla (m² por día) para estimar el plazo mínimo */
const M2_POR_DIA_CUADRILLA = 100;
/** Días de diagnóstico, cotización y abastecimiento antes de iniciar obra */
const DIAS_GESTION_PREVIA = 7;

interface ContextoValidacion {
  user: UserProfile;
  staff: boolean;
  ip: string | null;
}

const str = (v: unknown) => String(v ?? '').trim();

function hoyBogota(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);
}

function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const PALABRAS_VACIAS = new Set(['para', 'como', 'esta', 'este', 'tiene', 'con', 'del', 'los', 'las', 'una', 'que', 'por', 'muy', 'hay']);

function tokens(s: string): Set<string> {
  return new Set(
    normalizar(s)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3 && !PALABRAS_VACIAS.has(t))
  );
}

/** Índice de Jaccard entre dos textos (0 a 1) */
function similitudTexto(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let comunes = 0;
  for (const t of ta) if (tb.has(t)) comunes++;
  return comunes / (ta.size + tb.size - comunes);
}

const menciona = (texto: string, ...palabras: string[]) => palabras.some((p) => texto.includes(p));

export async function validarSolicitud(f: any, ctx: ContextoValidacion): Promise<ValidacionReporte> {
  const hallazgos: HallazgoValidacion[] = [];
  const add = (dimension: DimensionValidacion, nivel: HallazgoValidacion['nivel'], mensaje: string, campo?: string) =>
    hallazgos.push({ dimension, nivel, mensaje, ...(campo ? { campo } : {}) });

  const correo = ctx.staff ? str(f.clienteCorreo).toLowerCase() : ctx.user.email.toLowerCase();
  const area = Number(f.areaAproximada);
  const fecha = str(f.fechaRequerida);
  const descripcion = str(f.descripcionProblema);
  const superficie = str(f.tipoSuperficie).toUpperCase();
  const tipoProyecto = str(f.tipoProyecto).toUpperCase() || 'RESIDENCIAL';
  const ubicacion = str(f.ubicacion).toUpperCase() || 'INTERIOR';
  const evidencias = Array.isArray(f.evidencias) ? f.evidencias : [];

  // ---------------------------------------------------------------- Completitud
  const obligatorios: Array<[string, string, unknown]> = [
    ['clienteNombre', 'Nombre del cliente', f.clienteNombre],
    ['clienteTelefono', 'Teléfono', f.clienteTelefono],
    ['clienteCorreo', 'Correo', correo],
    ['proyectoNombre', 'Nombre del proyecto', f.proyectoNombre],
    ['ciudad', 'Ciudad', f.ciudad],
    ['tipoProyecto', 'Tipo de proyecto', f.tipoProyecto],
    ['fechaRequerida', 'Fecha requerida', f.fechaRequerida],
    ['tipoSuperficie', 'Superficie', f.tipoSuperficie],
    ['areaAproximada', 'Área', f.areaAproximada],
    ['ubicacion', 'Ambiente (interior/exterior)', f.ubicacion],
    ['descripcionProblema', 'Descripción de la necesidad', f.descripcionProblema],
  ];
  for (const [campo, label, valor] of obligatorios) {
    if (!str(valor) || (campo === 'areaAproximada' && !(area > 0))) {
      add('COMPLETITUD', 'ERROR', `Falta un campo obligatorio: ${label}.`, campo);
    }
  }
  if (!f.autorizacionDatos || !f.autorizacionUsoTecnico) {
    add('COMPLETITUD', 'ERROR', 'Falta el consentimiento de tratamiento de datos y de uso técnico.', 'autorizacionDatos');
  }
  if (!str(f.colorRequerido) && !(Array.isArray(f.colores) && f.colores.length)) {
    add('COMPLETITUD', 'ADVERTENCIA', 'No se eligió el color; quedará "por definir" y el asesor lo confirmará.', 'colores');
  }
  const condicionRiesgosa = f.humedad === 'ALTA' || f.fisuras === true || f.desprendimiento === true;
  if (evidencias.length === 0) {
    add(
      'COMPLETITUD',
      'ADVERTENCIA',
      condicionRiesgosa
        ? 'Se reportan humedad, fisuras o desprendimiento pero no hay fotografías: el técnico no podrá verificar la condición.'
        : 'No hay fotografías ni documentos del estado actual.',
      'evidencias'
    );
  }

  // ---------------------------------------------------------------- Formato
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
    add('FORMATO', 'ERROR', 'El correo no tiene un formato válido.', 'clienteCorreo');
  }
  // Identificación del cliente: mismas reglas que el registro (src/data/reglasRegistro.ts)
  const nombreCliente = normalizarCampo.texto(f.clienteNombre);
  const errorNombre = nombreCliente ? validarCampo.nombreCompleto(nombreCliente) : null;
  if (errorNombre) add('FORMATO', 'ERROR', errorNombre, 'clienteNombre');

  const telefono = normalizarCampo.telefono(f.clienteTelefono);
  const errorTelefono = telefono ? validarCampo.telefono(telefono) : null;
  if (errorTelefono) add('FORMATO', 'ERROR', errorTelefono, 'clienteTelefono');

  // Empresa, copropiedad o entidad = persona jurídica: razón social y NIT obligatorios
  const juridica = Boolean(str(f.clienteTipo)) && str(f.clienteTipo) !== 'PERSONA_NATURAL';
  const empresa = normalizarCampo.texto(f.clienteEmpresa);
  if (juridica && !empresa) {
    add('COMPLETITUD', 'ERROR', 'Falta la razón social de la empresa, copropiedad o entidad.', 'clienteEmpresa');
  } else if (empresa) {
    const errorEmpresa = validarCampo.razonSocial(empresa);
    if (errorEmpresa) add('FORMATO', 'ERROR', errorEmpresa, 'clienteEmpresa');
  }

  const tipoDocumento = juridica ? 'NIT' : str(f.clienteTipoDocumento).toUpperCase() || 'CC';
  const documento = normalizarCampo.documento(f.clienteDocumento, tipoDocumento);
  if (juridica && !documento) {
    add('COMPLETITUD', 'ERROR', 'Falta el NIT de la empresa, copropiedad o entidad.', 'clienteDocumento');
  } else if (documento) {
    const errorDocumento = validarCampo.documento(documento, tipoDocumento);
    if (errorDocumento) add('FORMATO', 'ERROR', errorDocumento, 'clienteDocumento');
  } else {
    add('COMPLETITUD', 'ADVERTENCIA', 'No se indicó el documento del cliente; se pedirá para la cotización.', 'clienteDocumento');
  }
  const ciudad = str(f.ciudad);
  if (ciudad && !/^[\p{L} .,'-]{2,80}$/u.test(ciudad)) {
    add('FORMATO', 'ERROR', 'La ciudad solo debe contener letras.', 'ciudad');
  }
  if (fecha && (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha)))) {
    add('FORMATO', 'ERROR', 'La fecha requerida debe tener el formato AAAA-MM-DD.', 'fechaRequerida');
  }
  if (str(f.areaAproximada) && !Number.isFinite(area)) {
    add('FORMATO', 'ERROR', 'El área debe ser numérica.', 'areaAproximada');
  }
  if (superficie && !(SUPERFICIES as readonly string[]).includes(superficie)) {
    add('FORMATO', 'ERROR', 'El tipo de superficie no es uno de los permitidos.', 'tipoSuperficie');
  }
  if (!(TIPOS_PROYECTO as readonly string[]).includes(tipoProyecto)) {
    add('FORMATO', 'ERROR', 'El tipo de proyecto no es uno de los permitidos.', 'tipoProyecto');
  }
  if (ctx.staff && str(f.clienteCanal) && !(CANALES as readonly string[]).includes(str(f.clienteCanal).toUpperCase())) {
    add('FORMATO', 'ERROR', 'El canal de entrada no es válido.', 'clienteCanal');
  }
  if (descripcion && (descripcion.length < 10 || descripcion.length > 2000)) {
    add('FORMATO', 'ERROR', 'La descripción debe tener entre 10 y 2.000 caracteres.', 'descripcionProblema');
  }

  // ---------------------------------------------------------------- Coherencia
  const unidad = str(f.unidadMedida) || 'm2';
  if (unidad !== 'm2') {
    add('COHERENCIA', 'ERROR', 'El área debe expresarse en metros cuadrados (m²) para calcular cantidades.', 'unidadMedida');
  }
  if (Number.isFinite(area) && area > 0) {
    if (area < 0.5) add('COHERENCIA', 'ERROR', 'El área es demasiado pequeña (mínimo 0,5 m²).', 'areaAproximada');
    else if (area > 1_000_000) add('COHERENCIA', 'ERROR', 'El área supera el máximo admitido (1.000.000 m²).', 'areaAproximada');
    else {
      const maximo = AREA_MAXIMA_ESPERADA[tipoProyecto as keyof typeof AREA_MAXIMA_ESPERADA];
      if (maximo && area > maximo) {
        add('COHERENCIA', 'ADVERTENCIA', `${area} m² es inusual para un proyecto ${tipoProyecto.toLowerCase()}; verifica la medida.`, 'areaAproximada');
      }
    }
  }

  if (fecha && !Number.isNaN(Date.parse(fecha))) {
    const dias = diasEntre(hoyBogota(), fecha);
    const plazoMinimo =
      DIAS_GESTION_PREVIA + Math.ceil((area > 0 ? area : 0) / M2_POR_DIA_CUADRILLA) + (condicionRiesgosa ? 5 : 0);
    if (dias < 0) {
      add('COHERENCIA', 'ERROR', 'La fecha requerida ya pasó.', 'fechaRequerida');
    } else if (dias > 730) {
      add('COHERENCIA', 'ADVERTENCIA', 'La fecha requerida está a más de dos años; confirma que sea correcta.', 'fechaRequerida');
    } else if (dias < plazoMinimo) {
      add(
        'COHERENCIA',
        'ADVERTENCIA',
        `La fecha requerida (en ${dias} día(s)) es exigente: este alcance necesita al menos ${plazoMinimo} días entre diagnóstico, cotización, abastecimiento y aplicación.`,
        'fechaRequerida'
      );
    }
  }

  if (superficie === 'DRYWALL' && ubicacion !== 'INTERIOR') {
    add('COHERENCIA', 'ADVERTENCIA', 'El drywall no es apto para exterior; revisa la superficie o el ambiente.', 'tipoSuperficie');
  }
  if (tipoProyecto === 'RESIDENCIAL' && superficie === 'ACERO_CARBONO' && area > 500) {
    add('COHERENCIA', 'ADVERTENCIA', 'Un área grande de acero estructural no es común en un proyecto residencial.', 'tipoProyecto');
  }

  // El texto libre no debe contradecir las condiciones marcadas
  const texto = normalizar(descripcion);
  if (menciona(texto, 'fisura', 'grieta', 'rajadura', 'agriet') && f.fisuras !== true) {
    add('COHERENCIA', 'ADVERTENCIA', 'La descripción menciona fisuras o grietas, pero no se marcó la casilla de fisuras.', 'fisuras');
  }
  if (menciona(texto, 'humedad', 'filtra', 'salitre', 'gotera', 'moho') && (f.humedad || 'BAJA') === 'BAJA') {
    add('COHERENCIA', 'ADVERTENCIA', 'La descripción menciona humedad o filtraciones, pero el nivel de humedad marcado es bajo.', 'humedad');
  }
  if (menciona(texto, 'descascar', 'ampolla', 'desprend', 'pelad') && f.desprendimiento !== true) {
    add('COHERENCIA', 'ADVERTENCIA', 'La descripción menciona pintura desprendida, pero no se marcó desprendimiento.', 'desprendimiento');
  }
  if (menciona(texto, 'fachada', 'exterior', 'terraza', 'cubierta') && ubicacion === 'INTERIOR') {
    add('COHERENCIA', 'ADVERTENCIA', 'La descripción habla de un espacio exterior, pero el ambiente marcado es interior.', 'ubicacion');
  }

  // ---------------------------------------------------------------- Duplicidad
  let duplicados: ProyectoSimilar[] = [];
  if (correo) {
    try {
      duplicados = await buscarSimilares(correo, ctx.user.id, {
        nombre: str(f.proyectoNombre),
        descripcion,
        ciudad,
        superficie,
        area,
        fecha,
      });
    } catch (err: any) {
      console.warn('[validacion] No se pudo revisar duplicados:', err?.message || err);
      add('DUPLICIDAD', 'ADVERTENCIA', 'No se pudo verificar si existe una solicitud similar.');
    }
  }
  const casiIgual = duplicados.find(
    (d) => d.similitud >= 0.85 && diasEntre(d.created_at.slice(0, 10), hoyBogota()) <= 30
  );
  if (casiIgual && f.confirmarDuplicado !== true) {
    add(
      'DUPLICIDAD',
      'ERROR',
      `Ya existe una solicitud casi idéntica: ${casiIgual.codigo} "${casiIgual.nombre}" (${Math.round(casiIgual.similitud * 100)} % de coincidencia). Confirma que se trata de una solicitud diferente.`,
      'confirmarDuplicado'
    );
  } else {
    for (const d of duplicados) {
      add(
        'DUPLICIDAD',
        'ADVERTENCIA',
        `Solicitud parecida: ${d.codigo} "${d.nombre}" (${Math.round(d.similitud * 100)} % de coincidencia).`
      );
    }
  }

  // ---------------------------------------------------------------- Trazabilidad
  const origen = ctx.staff ? 'PANEL_INTERNO' : 'PORTAL_WEB';
  const canal = ctx.staff ? str(f.clienteCanal).toUpperCase() || 'COMERCIAL' : 'WEB';
  const trazabilidad: ValidacionReporte['trazabilidad'] = {
    usuario_id: ctx.user.id,
    usuario_nombre: ctx.user.nombre_completo,
    usuario_rol: ctx.user.rol,
    canal,
    origen,
    ip: ctx.ip,
    fecha: new Date().toISOString(),
  };
  if (!ctx.ip) add('TRAZABILIDAD', 'ADVERTENCIA', 'No se pudo registrar la IP de origen.');

  // Una línea "OK" por dimensión sin hallazgos, para que el reporte sirva de checklist
  const resumenOk: Record<DimensionValidacion, string> = {
    COMPLETITUD: 'Campos obligatorios y consentimiento completos.',
    FORMATO: 'Correo, teléfono, fecha, área y catálogos con formato válido.',
    COHERENCIA: 'Fecha, área, superficie y condiciones coherentes entre sí.',
    DUPLICIDAD: 'No hay solicitudes similares del mismo cliente.',
    TRAZABILIDAD: `Registrado por ${ctx.user.nombre_completo} (${ctx.user.rol}) desde ${origen === 'PORTAL_WEB' ? 'el portal web' : 'el panel interno'}, canal ${canal}.`,
  };
  for (const dim of Object.keys(DIMENSION_VALIDACION_LABELS) as DimensionValidacion[]) {
    if (!hallazgos.some((h) => h.dimension === dim)) add(dim, 'OK', resumenOk[dim]);
  }

  const errores = hallazgos.filter((h) => h.nivel === 'ERROR').length;
  const advertencias = hallazgos.filter((h) => h.nivel === 'ADVERTENCIA').length;
  return {
    estado: errores ? 'RECHAZADA' : advertencias ? 'CON_OBSERVACIONES' : 'APROBADA',
    puntaje: Math.max(0, 100 - errores * 20 - advertencias * 5),
    hallazgos,
    duplicados,
    trazabilidad,
  };
}

async function buscarSimilares(
  correo: string,
  userId: string,
  nuevo: { nombre: string; descripcion: string; ciudad: string; superficie: string; area: number; fecha: string }
): Promise<ProyectoSimilar[]> {
  const { data: clientes, error: errCli } = await db().from('clientes').select('id').eq('correo', correo);
  if (errCli) throw errCli;
  const ids = (clientes || []).map((c: any) => c.id as string);

  const desde = new Date(Date.now() - 180 * 86_400_000).toISOString();
  let query = db()
    .from('proyectos')
    .select(
      'id, codigo, nombre, estado, ciudad, fecha_requerida, created_at, areas:areas_proyecto!areas_proyecto_proyecto_id_fkey(tipo_superficie, area_m2, descripcion_problema)'
    )
    .neq('estado', 'CANCELADO')
    .gte('created_at', desde)
    .limit(50);
  query = ids.length ? query.or(`creado_por.eq.${userId},cliente_id.in.(${ids.join(',')})`) : query.eq('creado_por', userId);

  const { data, error } = await query;
  if (error) throw error;

  return ((data || []) as any[])
    .map((p) => {
      const a = (Array.isArray(p.areas) ? p.areas[0] : p.areas) || {};
      const areaPrevia = Number(a.area_m2) || 0;
      // Texto: 50 %, ciudad: 15 %, superficie: 15 %, área ±10 %: 10 %, misma fecha: 10 %
      const similitud =
        0.5 * similitudTexto(`${nuevo.nombre} ${nuevo.descripcion}`, `${p.nombre} ${a.descripcion_problema || ''}`) +
        (normalizar(p.ciudad || '') === normalizar(nuevo.ciudad) ? 0.15 : 0) +
        (a.tipo_superficie === nuevo.superficie ? 0.15 : 0) +
        (areaPrevia > 0 && nuevo.area > 0 && Math.abs(areaPrevia - nuevo.area) / nuevo.area <= 0.1 ? 0.1 : 0) +
        (nuevo.fecha && p.fecha_requerida === nuevo.fecha ? 0.1 : 0);
      return {
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        estado: p.estado as ProjectStatus,
        ciudad: p.ciudad,
        created_at: p.created_at,
        similitud: Math.round(similitud * 100) / 100,
      };
    })
    .filter((p) => p.similitud >= 0.6)
    .sort((a, b) => b.similitud - a.similitud)
    .slice(0, 3);
}

/** Mensaje corto con los errores bloqueantes, para la respuesta 422 */
export function resumenErrores(reporte: ValidacionReporte): string {
  const errores = reporte.hallazgos.filter((h) => h.nivel === 'ERROR').map((h) => h.mensaje);
  return `La solicitud no pasó la validación automática: ${errores.join(' ')}`;
}
