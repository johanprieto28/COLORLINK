import { Router, type Request } from 'express';
import type {
  CapaSistema,
  Cotizacion,
  ItemCotizacion,
  PermisosProyecto,
  ProjectStatus,
  Proyecto,
  ProyectoResumen,
  SeverityLevel,
  UserProfile,
  UserRole,
} from '../../src/types';
import { PROJECT_STATUS_LABELS } from '../../src/types';
import { diagnose } from '../ai';
import { evaluateRuleEngine } from '../diagnostico';
import { evidenciasParaIA, leerImagenBase64 } from '../archivos';
import { currentUser, isStaff, requireAuth, requireRole } from '../auth';
import { emails } from '../email';
import {
  bool,
  email,
  handler,
  HttpError,
  isoDate,
  num,
  oneOf,
  optionalText,
  phone,
  text,
  uuid,
} from '../http';
import { normalizar } from '../../src/data/reglasRegistro';
import { describirColores } from '../../src/data/colores';
import { generarCotizacionPdf, type ColorPdf } from '../cotizacionPdf';
import { ciudad } from '../ciudades';
import { validarColoresProyecto } from './colores';
import { db, EVIDENCIAS_BUCKET, must, signedUrls } from '../supabase';
import { resumenErrores, validarSolicitud } from '../validacion';

export const proyectosRouter = Router();

const ESTADOS: ProjectStatus[] = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[];
const ESTADOS_FINALES: ProjectStatus[] = ['CERRADO', 'CANCELADO'];
const SEVERIDADES: SeverityLevel[] = ['LEVE', 'MODERADO', 'SEVERO', 'CRITICO'];
/** El cliente puede cancelar mientras no haya aprobado la cotización */
const CANCELABLE_POR_CLIENTE: ProjectStatus[] = [
  'BORRADOR',
  'RECIBIDO',
  'EN_ANALISIS',
  'VALIDACION_TECNICA',
  'SOLUCION_GENERADA',
  'COTIZACION',
];

/**
 * Transiciones manuales. Las demás ocurren automáticamente con cada acción:
 * guardar solución → SOLUCION_GENERADA, enviar cotización → COTIZACION,
 * aprobarla → APROBADO, programar servicio → SERVICIO_PROGRAMADO,
 * inspección aprobada → CERRADO.
 */
const TRANSICIONES_MANUALES: Partial<Record<ProjectStatus, Array<{ a: ProjectStatus; roles: UserRole[] }>>> = {
  RECIBIDO: [{ a: 'EN_ANALISIS', roles: ['tecnico'] }],
  EN_ANALISIS: [{ a: 'VALIDACION_TECNICA', roles: ['tecnico'] }],
  APROBADO: [{ a: 'ABASTECIMIENTO', roles: ['operaciones'] }],
  SERVICIO_PROGRAMADO: [{ a: 'EN_EJECUCION', roles: ['operaciones'] }],
  EN_EJECUCION: [{ a: 'CALIDAD', roles: ['operaciones', 'tecnico'] }],
};

const SELECT_RESUMEN = `id, codigo, nombre, estado, prioridad, ciudad, tipo_proyecto, fecha_requerida, created_at, updated_at,
  cliente:clientes!proyectos_cliente_id_fkey(nombre, empresa),
  tecnico:perfiles!proyectos_tecnico_id_fkey(nombre_completo),
  comercial:perfiles!proyectos_comercial_id_fkey(nombre_completo),
  areas:areas_proyecto!areas_proyecto_proyecto_id_fkey(area_m2, tipo_superficie)`;

const SELECT_DETALLE = `*,
  cliente:clientes!proyectos_cliente_id_fkey(*),
  tecnico:perfiles!proyectos_tecnico_id_fkey(nombre_completo),
  comercial:perfiles!proyectos_comercial_id_fkey(nombre_completo),
  areas:areas_proyecto!areas_proyecto_proyecto_id_fkey(*),
  evidencias!evidencias_proyecto_id_fkey(*),
  diagnostico:diagnosticos!diagnosticos_proyecto_id_fkey(*, validador:perfiles!diagnosticos_validado_por_fkey(nombre_completo)),
  solucion:soluciones_tecnicas!soluciones_tecnicas_proyecto_id_fkey(*),
  cotizaciones!cotizaciones_proyecto_id_fkey(*, items:cotizacion_items(*)),
  servicios!servicios_proyecto_id_fkey(*),
  inspecciones:inspecciones_calidad!inspecciones_calidad_proyecto_id_fkey(*),
  consentimiento:consentimientos!consentimientos_proyecto_id_fkey(*),
  actividades!actividades_proyecto_id_fkey(*)`;

const one = <T>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

function mapResumen(row: any): ProyectoResumen {
  const area = one(row.areas) as any;
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    estado: row.estado,
    prioridad: row.prioridad,
    ciudad: row.ciudad,
    tipo_proyecto: row.tipo_proyecto,
    fecha_requerida: row.fecha_requerida,
    cliente_nombre: one<any>(row.cliente)?.nombre || '—',
    cliente_empresa: one<any>(row.cliente)?.empresa || null,
    tecnico_nombre: one<any>(row.tecnico)?.nombre_completo || null,
    comercial_nombre: one<any>(row.comercial)?.nombre_completo || null,
    area_m2: area ? Number(area.area_m2) : null,
    tipo_superficie: area?.tipo_superficie || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function esPropietario(row: any, user: UserProfile): boolean {
  const cliente = one<any>(row.cliente);
  return (
    row.creado_por === user.id ||
    cliente?.usuario_id === user.id ||
    (cliente?.correo || '').toLowerCase() === user.email.toLowerCase()
  );
}

function calcularPermisos(row: any, user: UserProfile): PermisosProyecto {
  const rol = user.rol;
  const admin = rol === 'administrador';
  const estado = row.estado as ProjectStatus;
  const propietario = esPropietario(row, user);
  const activo = !ESTADOS_FINALES.includes(estado);
  const cotizacionEnviada = (row.cotizaciones || []).some((c: any) => c.estado === 'ENVIADA');

  const transiciones = (TRANSICIONES_MANUALES[estado] || [])
    .filter((t) => admin || t.roles.includes(rol))
    .map((t) => t.a);

  return {
    esPropietario: propietario,
    puedeSubirEvidencias: activo && (propietario || isStaff(user)),
    puedeTomarComoTecnico: activo && (rol === 'tecnico' || admin) && row.tecnico_id !== user.id,
    puedeDiagnosticar: activo && (rol === 'tecnico' || admin),
    puedeEditarSolucion:
      (rol === 'tecnico' || admin) &&
      ['RECIBIDO', 'EN_ANALISIS', 'VALIDACION_TECNICA', 'SOLUCION_GENERADA'].includes(estado),
    puedeCotizar: (rol === 'comercial' || admin) && ['SOLUCION_GENERADA', 'COTIZACION'].includes(estado),
    puedeResponderCotizacion: propietario && estado === 'COTIZACION' && cotizacionEnviada,
    puedeProgramarServicio:
      (rol === 'operaciones' || admin) && ['APROBADO', 'ABASTECIMIENTO', 'SERVICIO_PROGRAMADO', 'EN_EJECUCION'].includes(estado),
    puedeRegistrarCalidad: (rol === 'operaciones' || rol === 'tecnico' || admin) && ['EN_EJECUCION', 'CALIDAD'].includes(estado),
    puedeCancelar: activo && (admin || (propietario && CANCELABLE_POR_CLIENTE.includes(estado))),
    transicionesPermitidas: transiciones,
  };
}

/** PDF de una cotización del proyecto, con las muestras de los colores elegidos */
async function pdfDeCotizacion(proyecto: Proyecto, cotizacionId: string) {
  const cot = proyecto.cotizaciones.find((c) => c.id === cotizacionId);
  if (!cot) return null;
  const ids = proyecto.areas[0]?.colores || [];
  let colores: ColorPdf[] = [];
  if (ids.length) {
    const { data } = await db().from('colores').select('id, nombre, hex').in('id', ids);
    colores = ids.map((id) => (data || []).find((c: any) => c.id === id)).filter(Boolean) as ColorPdf[];
  }
  return { cot, pdf: await generarCotizacionPdf(proyecto, cot, colores) };
}

async function cargarProyecto(id: string, user: UserProfile): Promise<Proyecto> {
  const row = must(
    await db().from('proyectos').select(SELECT_DETALLE).eq('id', id).maybeSingle(),
    'consultar el proyecto'
  ) as any;
  if (!row || (!isStaff(user) && !esPropietario(row, user))) {
    throw new HttpError(404, 'Proyecto no encontrado.');
  }

  const evidencias = (row.evidencias || []) as any[];
  const urls = await signedUrls(evidencias.map((e) => e.storage_path));
  const diagnostico = one<any>(row.diagnostico);
  const cotizaciones = ((row.cotizaciones || []) as any[])
    .map((c) => ({
      ...c,
      items: ((c.items || []) as any[]).sort((a, b) => a.orden - b.orden).map(numericItem),
      subtotal: Number(c.subtotal),
      descuento_porcentaje: Number(c.descuento_porcentaje),
      descuento_valor: Number(c.descuento_valor),
      impuesto_porcentaje: Number(c.impuesto_porcentaje),
      impuesto_valor: Number(c.impuesto_valor),
      total: Number(c.total),
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  // El cliente solo ve cotizaciones que ya le fueron enviadas
  const cotizacionesVisibles = isStaff(user) ? cotizaciones : cotizaciones.filter((c) => c.estado !== 'BORRADOR');

  return {
    ...mapResumen(row),
    cliente_id: row.cliente_id,
    cliente: one(row.cliente),
    direccion: row.direccion,
    tecnico_id: row.tecnico_id,
    comercial_id: row.comercial_id,
    areas: (row.areas || []).map((a: any) => ({ ...a, area_m2: Number(a.area_m2) })),
    evidencias: evidencias
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((e) => ({ ...e, url: urls.get(e.storage_path) || null })),
    diagnostico: diagnostico
      ? { ...diagnostico, validado_por_nombre: one<any>(diagnostico.validador)?.nombre_completo || null }
      : null,
    solucion_tecnica: one(row.solucion),
    cotizaciones: cotizacionesVisibles,
    servicios: (row.servicios || []).sort((a: any, b: any) => b.created_at.localeCompare(a.created_at)),
    inspecciones: (row.inspecciones || []).sort((a: any, b: any) => b.created_at.localeCompare(a.created_at)),
    consentimiento: one(row.consentimiento),
    validacion: row.validacion || null,
    actividades: (row.actividades || []).sort((a: any, b: any) => b.created_at.localeCompare(a.created_at)),
    permisos: calcularPermisos({ ...row, cotizaciones }, user),
  } as Proyecto;
}

function numericItem(it: any): ItemCotizacion {
  return {
    ...it,
    cantidad: Number(it.cantidad),
    precio_unitario: Number(it.precio_unitario),
    subtotal: Number(it.subtotal),
  };
}

async function registrarActividad(
  proyectoId: string,
  user: UserProfile | null,
  datos: { tipo: string; titulo: string; descripcion?: string; anterior?: ProjectStatus; nuevo?: ProjectStatus }
) {
  const { error } = await db().from('actividades').insert({
    proyecto_id: proyectoId,
    usuario_id: user?.id || null,
    usuario_nombre: user?.nombre_completo || 'COLORLINK',
    usuario_rol: user?.rol || 'sistema',
    tipo_actividad: datos.tipo,
    titulo: datos.titulo,
    descripcion: datos.descripcion || null,
    estado_anterior: datos.anterior || null,
    estado_nuevo: datos.nuevo || null,
  });
  if (error) console.warn('[proyectos] No se pudo registrar la actividad:', error.message);
}

/**
 * Cambia el estado de forma optimista (solo si sigue en el estado esperado),
 * registra la actividad y avisa al cliente por correo.
 */
async function cambiarEstado(
  proyecto: Proyecto,
  nuevo: ProjectStatus,
  user: UserProfile,
  motivo: string
): Promise<void> {
  if (proyecto.estado === nuevo) return;
  const actualizado = must(
    await db()
      .from('proyectos')
      .update({ estado: nuevo })
      .eq('id', proyecto.id)
      .eq('estado', proyecto.estado)
      .select('id'),
    'actualizar el estado del proyecto'
  ) as any[];
  if (!actualizado.length) {
    throw new HttpError(409, 'El proyecto cambió mientras trabajabas. Recarga la página e inténtalo de nuevo.');
  }

  await registrarActividad(proyecto.id, user, {
    tipo: 'CAMBIO_ESTADO',
    titulo: `${PROJECT_STATUS_LABELS[proyecto.estado]} → ${PROJECT_STATUS_LABELS[nuevo]}`,
    descripcion: motivo,
    anterior: proyecto.estado,
    nuevo,
  });

  if (proyecto.cliente?.correo) {
    void emails.estadoProyecto(proyecto.cliente.correo, proyecto.cliente.nombre, proyecto.codigo, proyecto.id, nuevo, motivo);
  }
}

function getProyectoId(req: Request) {
  return uuid(req.params.id, 'proyecto');
}

// ==============================================================================
// Archivos de evidencia
// ==============================================================================

// POST /api/archivos/evidencias → sube una foto antes de crear el proyecto (queda "pendiente")
proyectosRouter.post(
  '/archivos/evidencias',
  requireAuth,
  handler(async (req, res) => {
    const user = currentUser(req);
    const archivo = leerImagenBase64(req.body);
    const path = `pendientes/${user.id}/${archivo.nombreSeguro}`;
    must(
      await db().storage.from(EVIDENCIAS_BUCKET).upload(path, archivo.buffer, { contentType: archivo.mime }),
      'subir la imagen'
    );
    const urls = await signedUrls([path]);
    res.status(201).json({
      storage_path: path,
      preview_url: urls.get(path) || null,
      nombre_archivo: archivo.nombre,
      tamano_bytes: archivo.buffer.length,
      mime_type: archivo.mime,
    });
  })
);

// ==============================================================================
// Listado y creación
// ==============================================================================

// GET /api/proyectos?estado=&q= → cliente: los suyos · personal interno: todos
proyectosRouter.get(
  '/proyectos',
  requireAuth,
  handler(async (req, res) => {
    const user = currentUser(req);
    let query = db().from('proyectos').select(SELECT_RESUMEN).order('updated_at', { ascending: false }).limit(300);

    if (!isStaff(user)) {
      const misClientes = must(
        await db().from('clientes').select('id').or(`usuario_id.eq.${user.id},correo.eq."${user.email}"`),
        'consultar tus proyectos'
      ) as Array<{ id: string }>;
      const ids = misClientes.map((c) => c.id);
      query = ids.length
        ? query.or(`creado_por.eq.${user.id},cliente_id.in.(${ids.join(',')})`)
        : query.eq('creado_por', user.id);
    } else if (req.query.asignados === '1') {
      query = query.or(`tecnico_id.eq.${user.id},comercial_id.eq.${user.id}`);
    }

    const estados = String(req.query.estado || '')
      .split(',')
      .map((e) => e.trim().toUpperCase())
      .filter((e): e is ProjectStatus => ESTADOS.includes(e as ProjectStatus));
    if (estados.length) query = query.in('estado', estados);

    const q = String(req.query.q || '').trim().replace(/[%_,()]/g, ' ').slice(0, 80);
    if (q) query = query.or(`nombre.ilike.%${q}%,codigo.ilike.%${q}%,ciudad.ilike.%${q}%`);

    const rows = must(await query, 'consultar proyectos') as any[];
    res.json(rows.map(mapResumen));
  })
);

/**
 * Un cliente registra proyectos a su propio nombre: su identificación sale de su perfil
 * (la capturó y verificó al registrarse) y no de lo que envíe el formulario. Solo se usa lo
 * enviado para los datos que su perfil todavía no tenga (cuentas antiguas).
 */
async function completarClienteDesdePerfil(f: Record<string, any>, user: UserProfile) {
  if (isStaff(user)) return;
  const { data: ficha } = await db()
    .from('clientes')
    .select('tipo_cliente')
    .eq('usuario_id', user.id)
    .order('created_at')
    .limit(1)
    .maybeSingle();
  const tipo = ficha?.tipo_cliente || (user.empresa ? 'EMPRESA' : f.clienteTipo || 'PERSONA_NATURAL');
  f.clienteTipo = tipo;
  f.clienteNombre = user.nombre_completo || f.clienteNombre;
  f.clienteTelefono = user.telefono || f.clienteTelefono;
  f.clienteEmpresa = user.empresa || f.clienteEmpresa;
  if (user.documento) {
    f.clienteDocumento = user.documento;
    f.clienteTipoDocumento = user.tipo_documento || (tipo === 'PERSONA_NATURAL' ? 'CC' : 'NIT');
  }
}

// POST /api/proyectos/validar → reporte de validación automática sin registrar nada
proyectosRouter.post(
  '/proyectos/validar',
  requireAuth,
  handler(async (req, res) => {
    const user = currentUser(req);
    const f = req.body || {};
    await completarClienteDesdePerfil(f, user);
    res.json(await validarSolicitud(f, { user, staff: isStaff(user), ip: req.ip || null }));
  })
);

// POST /api/proyectos → registro completo desde el asistente de 5 pasos
proyectosRouter.post(
  '/proyectos',
  requireAuth,
  handler(async (req, res) => {
    const user = currentUser(req);
    const f = req.body || {};
    // Solo ciudades del catálogo, guardadas con su nombre oficial
    f.ciudad = (await ciudad(f.ciudad)) ?? '';
    await completarClienteDesdePerfil(f, user);
    // Colores del catálogo (máximo 2): el texto del proyecto se arma con sus nombres
    const coloresElegidos = await validarColoresProyecto(f.colores);
    f.colorRequerido = coloresElegidos.length ? describirColores(coloresElegidos.map((c) => c.nombre)) : '';

    // Antes de automatizar, el dato debe ser confiable: los errores bloquean el registro
    const validacion = await validarSolicitud(f, { user, staff: isStaff(user), ip: req.ip || null });
    if (validacion.estado === 'RECHAZADA') throw new HttpError(422, resumenErrores(validacion));

    if (!bool(f.autorizacionDatos)) {
      throw new HttpError(400, 'Debes autorizar el tratamiento de datos personales para registrar el proyecto.');
    }
    if (!bool(f.autorizacionUsoTecnico)) {
      throw new HttpError(400, 'Debes autorizar el uso técnico de la información y las fotografías.');
    }

    // Un cliente siempre registra proyectos a su propio nombre; el personal puede hacerlo por un cliente
    const staff = isStaff(user);
    const correoCliente = staff ? email(f.clienteCorreo, 'correo del cliente') : user.email;
    let usuarioCliente: string | null = staff ? null : user.id;
    if (staff) {
      const vinculado = must(
        await db().from('perfiles').select('id').eq('email', correoCliente).maybeSingle(),
        'consultar el cliente'
      ) as { id: string } | null;
      usuarioCliente = vinculado?.id || null;
    }

    const evidencias = Array.isArray(f.evidencias) ? f.evidencias.slice(0, 12) : [];
    const prefijoPermitido = `pendientes/${user.id}/`;
    for (const ev of evidencias) {
      if (typeof ev?.storage_path !== 'string' || !ev.storage_path.startsWith(prefijoPermitido)) {
        throw new HttpError(400, 'Una de las fotografías no es válida. Vuelve a subirla.');
      }
    }

    const area = {
      tipo_superficie: text(f.tipoSuperficie, 'tipo de superficie', { required: true, max: 60 }),
      area_m2: num(f.areaAproximada, 'área aproximada', { min: 0.5, max: 1_000_000 }),
      ubicacion: oneOf(f.ubicacion, ['INTERIOR', 'EXTERIOR', 'MIXTO'] as const, 'ubicación', 'INTERIOR'),
      humedad: oneOf(f.humedad, ['BAJA', 'MEDIA', 'ALTA'] as const, 'humedad', 'BAJA'),
      fisuras: bool(f.fisuras),
      desgaste: oneOf(f.desgaste, ['NINGUNO', 'LEVE', 'MODERADO', 'AVANZADO'] as const, 'desgaste', 'LEVE'),
      desprendimiento: bool(f.desprendimiento),
      descripcion_problema: text(f.descripcionProblema, 'descripción de la necesidad', { required: true, max: 2000, min: 10 }),
    };
    const ambiente = text(f.ambiente, 'ambiente', { max: 40 }) || 'RESIDENCIAL';

    const entradaDiagnostico = {
      tipoSuperficie: area.tipo_superficie,
      areaAproximada: area.area_m2,
      ambiente,
      ubicacion: area.ubicacion,
      humedad: area.humedad,
      fisuras: area.fisuras,
      desgaste: area.desgaste,
      desprendimiento: area.desprendimiento,
      descripcionProblema: area.descripcion_problema,
      tieneFotos: evidencias.length > 0,
    };
    const diag = await diagnose(entradaDiagnostico, await evidenciasParaIA(evidencias).catch(() => []));
    // La prioridad operativa no depende solo del modelo: se toma la severidad más alta entre IA y reglas
    const severidad = [diag.severidad, evaluateRuleEngine(entradaDiagnostico).severidad].sort(
      (a, b) => SEVERIDADES.indexOf(b) - SEVERIDADES.indexOf(a)
    )[0];

    const tipoDocumentoCliente =
      f.clienteTipo && f.clienteTipo !== 'PERSONA_NATURAL' ? 'NIT' : String(f.clienteTipoDocumento || 'CC').toUpperCase();

    const payload = {
      creado_por: user.id,
      creado_por_nombre: user.nombre_completo,
      creado_por_rol: user.rol,
      validacion,
      cliente: {
        usuario_id: usuarioCliente,
        tipo_cliente: oneOf(f.clienteTipo, ['PERSONA_NATURAL', 'EMPRESA', 'COPROPIEDAD', 'ENTIDAD'] as const, 'tipo de cliente', 'PERSONA_NATURAL'),
        nombre: normalizar.texto(f.clienteNombre),
        empresa: normalizar.texto(f.clienteEmpresa) || null,
        documento: normalizar.documento(f.clienteDocumento, tipoDocumentoCliente) || null,
        telefono: normalizar.telefono(f.clienteTelefono),
        correo: correoCliente,
        ciudad: optionalText(f.ciudad, 'ciudad', 80),
        canal_entrada: staff
          ? oneOf(f.clienteCanal, ['WEB', 'WHATSAPP', 'REFERIDO', 'COMERCIAL', 'FERIA'] as const, 'canal', 'COMERCIAL')
          : 'WEB',
      },
      proyecto: {
        nombre: text(f.proyectoNombre, 'nombre del proyecto', { required: true, max: 160, min: 3 }),
        ciudad: text(f.ciudad, 'ciudad', { required: true, max: 80 }),
        direccion: optionalText(f.direccion, 'dirección', 200),
        tipo_proyecto: oneOf(
          f.tipoProyecto,
          ['RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL', 'INFRAESTRUCTURA', 'HOSPITALARIO'] as const,
          'tipo de proyecto',
          'RESIDENCIAL'
        ),
        fecha_requerida: isoDate(f.fechaRequerida, 'fecha requerida', true),
        prioridad: severidad === 'CRITICO' ? 'URGENTE' : severidad === 'SEVERO' ? 'ALTA' : 'NORMAL',
      },
      area: {
        ...area,
        nombre: `Superficie principal (${area.tipo_superficie})`,
        unidad_medida: 'm2',
        ambiente,
        color_actual: optionalText(f.colorActual, 'color actual', 120),
        color_requerido: f.colorRequerido || null,
        tipo_fisura: area.fisuras ? optionalText(f.tipoFisura, 'tipo de fisura', 40) : null,
        estado_general: optionalText(f.estadoSuperficie, 'estado de la superficie', 500),
      },
      consentimiento: {
        autorizacion_datos: true,
        autorizacion_uso_tecnico: true,
        origen_canal: staff ? 'PANEL_INTERNO' : 'PORTAL_WEB',
        ip_registro: req.ip,
        user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
        declaracion_texto:
          'Autorizo a COLORLINK el tratamiento de mis datos personales para gestionar este proyecto y el uso técnico de la información y fotografías aportadas para su diagnóstico, cotización y ejecución.',
      },
      evidencias: evidencias.map((ev: any) => ({
        storage_path: ev.storage_path,
        nombre_archivo: String(ev.nombre_archivo || 'foto.jpg').slice(0, 180),
        tamano_bytes: Number(ev.tamano_bytes) || null,
        mime_type: String(ev.mime_type || 'image/jpeg').slice(0, 60),
        descripcion: String(ev.descripcion || '').slice(0, 300) || null,
      })),
      diagnostico: {
        complejidad: diag.nivelComplejidad,
        severidad: diag.severidad,
        patologias: diag.patologiasDetectadas,
        validacion_tecnica_requerida: diag.validacionTecnicaRequerida,
        recomendacion_preliminar: diag.recomendacionPreliminar,
        preparacion_superficie_recomendada: diag.preparacionSuperficieSugerida,
        sistema_sugerido: diag.sistemaSugerido,
        clasificacion: diag.clasificacion,
        origen_motor: diag.motorUtilizado,
      },
    };

    const proyectoId = must(
      await db().rpc('crear_proyecto_completo', { p: payload }),
      'registrar el proyecto'
    ) as string;

    // La función SQL no conoce los colores elegidos: se guardan en la superficie recién creada
    if (coloresElegidos.length) {
      must(
        await db().from('areas_proyecto').update({ colores: coloresElegidos.map((c) => c.id) }).eq('proyecto_id', proyectoId),
        'guardar los colores del proyecto'
      );
    }

    // La función SQL no conoce el tipo de documento: se completa en la ficha del cliente
    if (payload.cliente.documento) {
      await db().from('clientes').update({ tipo_documento: tipoDocumentoCliente }).eq('correo', correoCliente);
    }
    // Las cuentas antiguas sin identificación completa la toman de este primer proyecto
    if (!staff && (!user.telefono || !user.documento || (!user.empresa && payload.cliente.empresa))) {
      await db()
        .from('perfiles')
        .update({
          telefono: user.telefono || payload.cliente.telefono,
          empresa: user.empresa || payload.cliente.empresa,
          documento: user.documento || payload.cliente.documento,
          tipo_documento: user.documento ? user.tipo_documento : payload.cliente.documento ? tipoDocumentoCliente : null,
        })
        .eq('id', user.id);
    }

    const proyecto = await cargarProyecto(proyectoId, user);
    void emails.proyectoRecibido(proyecto.cliente.correo, proyecto.cliente.nombre, proyecto.codigo, proyecto.id, proyecto.nombre);
    void emails.avisoInternoProyecto(proyecto.codigo, proyecto.id, proyecto.nombre, proyecto.ciudad);
    res.status(201).json(proyecto);
  })
);

// ==============================================================================
// Detalle y acciones
// ==============================================================================

proyectosRouter.get(
  '/proyectos/:id',
  requireAuth,
  handler(async (req, res) => {
    res.json(await cargarProyecto(getProyectoId(req), currentUser(req)));
  })
);

// POST /api/proyectos/:id/estado { estado, motivo } → transiciones manuales y cancelación
proyectosRouter.post(
  '/proyectos/:id/estado',
  requireAuth,
  handler(async (req, res) => {
    const user = currentUser(req);
    const proyecto = await cargarProyecto(getProyectoId(req), user);
    const nuevo = oneOf(req.body?.estado, ESTADOS, 'estado');
    const motivo = optionalText(req.body?.motivo, 'motivo', 500);

    if (nuevo === 'CANCELADO') {
      if (!proyecto.permisos.puedeCancelar) throw new HttpError(403, 'No puedes cancelar este proyecto en su estado actual.');
      await cambiarEstado(proyecto, 'CANCELADO', user, motivo || 'Proyecto cancelado.');
    } else {
      if (!proyecto.permisos.transicionesPermitidas.includes(nuevo)) {
        throw new HttpError(403, `No puedes pasar el proyecto a "${PROJECT_STATUS_LABELS[nuevo]}".`);
      }
      await cambiarEstado(proyecto, nuevo, user, motivo || `Avance registrado por ${user.nombre_completo}.`);
    }
    res.json(await cargarProyecto(proyecto.id, user));
  })
);

// POST /api/proyectos/:id/asignarme → técnico o comercial toma el proyecto
proyectosRouter.post(
  '/proyectos/:id/asignarme',
  requireRole('tecnico', 'comercial'),
  handler(async (req, res) => {
    const user = currentUser(req);
    const proyecto = await cargarProyecto(getProyectoId(req), user);
    const campo = user.rol === 'comercial' ? 'comercial_id' : 'tecnico_id';
    must(await db().from('proyectos').update({ [campo]: user.id }).eq('id', proyecto.id), 'asignar el proyecto');
    await registrarActividad(proyecto.id, user, {
      tipo: 'ASIGNACION',
      titulo: `${user.rol === 'comercial' ? 'Comercial' : 'Técnico'} asignado`,
      descripcion: `${user.nombre_completo} tomó el proyecto.`,
    });
    res.json(await cargarProyecto(proyecto.id, user));
  })
);

// POST /api/proyectos/:id/evidencias { nombre, mime, base64, descripcion }
proyectosRouter.post(
  '/proyectos/:id/evidencias',
  requireAuth,
  handler(async (req, res) => {
    const user = currentUser(req);
    const proyecto = await cargarProyecto(getProyectoId(req), user);
    if (!proyecto.permisos.puedeSubirEvidencias) throw new HttpError(403, 'No puedes agregar evidencias a este proyecto.');

    const archivo = leerImagenBase64(req.body);
    const path = `proyectos/${proyecto.id}/${archivo.nombreSeguro}`;
    must(
      await db().storage.from(EVIDENCIAS_BUCKET).upload(path, archivo.buffer, { contentType: archivo.mime }),
      'subir la imagen'
    );
    must(
      await db().from('evidencias').insert({
        proyecto_id: proyecto.id,
        area_id: proyecto.areas[0]?.id || null,
        storage_path: path,
        nombre_archivo: archivo.nombre,
        tamano_bytes: archivo.buffer.length,
        mime_type: archivo.mime,
        descripcion: optionalText(req.body?.descripcion, 'descripción', 300),
        subido_por: user.id,
      }),
      'registrar la evidencia'
    );
    await registrarActividad(proyecto.id, user, {
      tipo: 'CARGA_EVIDENCIA',
      titulo: archivo.mime === 'application/pdf' ? 'Nuevo documento agregado' : 'Nueva fotografía agregada',
      descripcion: archivo.nombre,
    });
    res.status(201).json(await cargarProyecto(proyecto.id, user));
  })
);

// POST /api/proyectos/:id/diagnostico → (re)genera la orientación con IA o motor de reglas
proyectosRouter.post(
  '/proyectos/:id/diagnostico',
  requireRole('tecnico'),
  handler(async (req, res) => {
    const user = currentUser(req);
    const proyecto = await cargarProyecto(getProyectoId(req), user);
    if (!proyecto.permisos.puedeDiagnosticar) throw new HttpError(403, 'El proyecto ya no admite diagnóstico.');
    const area = proyecto.areas[0];
    if (!area) throw new HttpError(409, 'El proyecto no tiene una superficie registrada.');

    const diag = await diagnose(
      {
        tipoSuperficie: area.tipo_superficie,
        areaAproximada: area.area_m2,
        ambiente: area.ambiente,
        ubicacion: area.ubicacion,
        humedad: area.humedad,
        fisuras: area.fisuras,
        desgaste: area.desgaste,
        desprendimiento: area.desprendimiento,
        descripcionProblema: area.descripcion_problema || '',
        tieneFotos: proyecto.evidencias.length > 0,
      },
      await evidenciasParaIA(proyecto.evidencias).catch(() => [])
    );

    must(
      await db()
        .from('diagnosticos')
        .upsert(
          {
            proyecto_id: proyecto.id,
            complejidad: diag.nivelComplejidad,
            severidad: diag.severidad,
            patologias: diag.patologiasDetectadas,
            validacion_tecnica_requerida: diag.validacionTecnicaRequerida,
            recomendacion_preliminar: diag.recomendacionPreliminar,
            preparacion_superficie_recomendada: diag.preparacionSuperficieSugerida,
            sistema_sugerido: diag.sistemaSugerido,
            clasificacion: diag.clasificacion,
            origen_motor: diag.motorUtilizado,
            generado_por: user.id,
            validado_por: null,
            fecha_validacion: null,
          },
          { onConflict: 'proyecto_id' }
        ),
      'guardar el diagnóstico'
    );
    await registrarActividad(proyecto.id, user, {
      tipo: 'DIAGNOSTICO_GENERADO',
      titulo: 'Clasificación y orientación técnica regeneradas',
      descripcion: `Categoría ${diag.clasificacion.categoria} (confianza ${Math.round(diag.clasificacion.confianza * 100)} %) · severidad ${diag.severidad} · complejidad ${diag.nivelComplejidad} (${diag.motorUtilizado === 'GEMINI' ? `Gemini, ${diag.clasificacion.archivosAnalizados} archivo(s) analizados` : 'motor de reglas'}).`,
    });
    if (proyecto.estado === 'RECIBIDO') {
      await cambiarEstado(proyecto, 'EN_ANALISIS', user, 'El equipo técnico inició el análisis del proyecto.');
    }
    res.json(await cargarProyecto(proyecto.id, user));
  })
);

// PATCH /api/proyectos/:id/diagnostico → el técnico valida/ajusta el diagnóstico
proyectosRouter.patch(
  '/proyectos/:id/diagnostico',
  requireRole('tecnico'),
  handler(async (req, res) => {
    const user = currentUser(req);
    const proyecto = await cargarProyecto(getProyectoId(req), user);
    if (!proyecto.diagnostico) throw new HttpError(409, 'Primero genera la orientación preliminar.');
    const b = req.body || {};

    const patologias = Array.isArray(b.patologias)
      ? b.patologias.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 15)
      : proyecto.diagnostico.patologias;

    must(
      await db()
        .from('diagnosticos')
        .update({
          severidad: oneOf(b.severidad, ['LEVE', 'MODERADO', 'SEVERO', 'CRITICO'] as const, 'severidad', proyecto.diagnostico.severidad),
          complejidad: oneOf(b.complejidad, ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'] as const, 'complejidad', proyecto.diagnostico.complejidad),
          patologias,
          recomendacion_preliminar: text(b.recomendacion_preliminar ?? proyecto.diagnostico.recomendacion_preliminar, 'recomendación', { required: true, max: 3000 }),
          preparacion_superficie_recomendada: text(
            b.preparacion_superficie_recomendada ?? proyecto.diagnostico.preparacion_superficie_recomendada,
            'preparación',
            { required: true, max: 1500 }
          ),
          observaciones_tecnicas: optionalText(b.observaciones_tecnicas, 'observaciones', 3000),
          norma_aplicable: optionalText(b.norma_aplicable, 'norma', 120),
          validado_por: user.id,
          fecha_validacion: new Date().toISOString(),
          origen_motor: 'TECNICO',
        })
        .eq('proyecto_id', proyecto.id),
      'validar el diagnóstico'
    );
    await registrarActividad(proyecto.id, user, {
      tipo: 'DIAGNOSTICO_VALIDADO',
      titulo: 'Diagnóstico validado por el técnico',
      descripcion: `Validado por ${user.nombre_completo}.`,
    });
    if (proyecto.estado === 'RECIBIDO' || proyecto.estado === 'EN_ANALISIS') {
      await cambiarEstado(proyecto, 'VALIDACION_TECNICA', user, 'Diagnóstico validado por el especialista técnico.');
    }
    res.json(await cargarProyecto(proyecto.id, user));
  })
);

function leerCapas(raw: unknown): CapaSistema[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 6) {
    throw new HttpError(400, 'La solución debe tener entre 1 y 6 capas.');
  }
  return raw.map((c: any, i) => ({
    tipo: oneOf(c?.tipo, ['IMPRIMANTE', 'INTERMEDIO', 'ACABADO'] as const, `tipo de la capa ${i + 1}`),
    producto: text(c?.producto, `producto de la capa ${i + 1}`, { required: true, max: 160 }),
    espesor_micrones: num(c?.espesor_micrones, `espesor de la capa ${i + 1}`, { min: 1, max: 5000 }),
    manos: num(c?.manos, `manos de la capa ${i + 1}`, { min: 1, max: 6, integer: true }),
    funcion: text(c?.funcion, `función de la capa ${i + 1}`, { max: 300 }),
  }));
}

// PUT /api/proyectos/:id/solucion → el técnico define o edita el sistema de aplicación
proyectosRouter.put(
  '/proyectos/:id/solucion',
  requireRole('tecnico'),
  handler(async (req, res) => {
    const user = currentUser(req);
    const proyecto = await cargarProyecto(getProyectoId(req), user);
    if (!proyecto.permisos.puedeEditarSolucion) throw new HttpError(403, 'La solución ya no se puede editar en este estado.');
    const b = req.body || {};

    must(
      await db()
        .from('soluciones_tecnicas')
        .upsert(
          {
            proyecto_id: proyecto.id,
            tecnico_id: user.id,
            nombre_sistema: text(b.nombre_sistema, 'nombre del sistema', { required: true, max: 200 }),
            descripcion_sistema: optionalText(b.descripcion_sistema, 'descripción', 1500),
            preparacion_superficie: text(b.preparacion_superficie, 'preparación de superficie', { required: true, max: 1500 }),
            metodo_aplicacion: oneOf(
              b.metodo_aplicacion,
              ['BROCHA_RODILLO', 'AIRLESS', 'ASPERSION_CONVENCIONAL', 'LLANA'] as const,
              'método de aplicación',
              'BROCHA_RODILLO'
            ),
            capas: leerCapas(b.capas),
            garantia_anos: num(b.garantia_anos, 'garantía', { min: 0, max: 25, integer: true }),
            observaciones: optionalText(b.observaciones, 'observaciones', 1500),
          },
          { onConflict: 'proyecto_id' }
        ),
      'guardar la solución técnica'
    );
    if (!proyecto.tecnico_id) {
      await db().from('proyectos').update({ tecnico_id: user.id }).eq('id', proyecto.id);
    }
    await registrarActividad(proyecto.id, user, {
      tipo: 'SOLUCION_TECNICA',
      titulo: proyecto.solucion_tecnica ? 'Solución técnica actualizada' : 'Solución técnica propuesta',
      descripcion: String(b.nombre_sistema || ''),
    });
    if (proyecto.estado !== 'SOLUCION_GENERADA') {
      await cambiarEstado(proyecto, 'SOLUCION_GENERADA', user, 'El especialista definió la solución técnica. El equipo comercial preparará la cotización.');
    }
    res.json(await cargarProyecto(proyecto.id, user));
  })
);

// ------------------------------------------------------------------------------
// Cotizaciones (valores en COP, IVA 19 %)
// ------------------------------------------------------------------------------
const PRECIO_GALON: Record<CapaSistema['tipo'], number> = { IMPRIMANTE: 95000, INTERMEDIO: 120000, ACABADO: 135000 };
/** Rendimiento de referencia: m² por galón a 50 µm de película seca */
const RENDIMIENTO_BASE_M2_GAL = 35;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function itemsSugeridos(area: number, capas: CapaSistema[], prep: string): ItemCotizacion[] {
  const items: ItemCotizacion[] = [
    {
      categoria: 'PREPARACION',
      descripcion: `Preparación de superficie: ${prep.slice(0, 140)}`,
      unidad: 'M2',
      cantidad: area,
      precio_unitario: 9500,
      subtotal: 0,
    },
  ];
  for (const capa of capas) {
    const galones = Math.max(1, Math.ceil(((area * capa.manos * capa.espesor_micrones) / (RENDIMIENTO_BASE_M2_GAL * 50)) * 1.1));
    items.push({
      categoria: 'MATERIAL',
      descripcion: `${capa.producto} (${capa.tipo.toLowerCase()}, ${capa.manos} mano(s), ${capa.espesor_micrones} µm)`,
      unidad: 'GALON',
      cantidad: galones,
      precio_unitario: PRECIO_GALON[capa.tipo],
      subtotal: 0,
    });
  }
  items.push(
    {
      categoria: 'MANO_OBRA',
      descripcion: 'Aplicación por personal calificado COLORLINK',
      unidad: 'M2',
      cantidad: area,
      precio_unitario: 16000,
      subtotal: 0,
    },
    {
      categoria: 'EQUIPO',
      descripcion: area > 200 ? 'Equipo airless, andamios y medición de espesores' : 'Herramientas, protección de áreas y andamio liviano',
      unidad: 'GLOBAL',
      cantidad: 1,
      precio_unitario: area > 200 ? 450000 : 180000,
      subtotal: 0,
    },
    {
      categoria: 'LOGISTICA',
      descripcion: 'Transporte de materiales y personal',
      unidad: 'GLOBAL',
      cantidad: 1,
      precio_unitario: 120000,
      subtotal: 0,
    }
  );
  return items.map((it, i) => ({ ...it, orden: i, subtotal: round2(it.cantidad * it.precio_unitario) }));
}

function totales(items: ItemCotizacion[], descuentoPct: number, ivaPct: number) {
  const subtotal = round2(items.reduce((acc, it) => acc + it.cantidad * it.precio_unitario, 0));
  const descuento_valor = round2((subtotal * descuentoPct) / 100);
  const impuesto_valor = round2(((subtotal - descuento_valor) * ivaPct) / 100);
  return { subtotal, descuento_valor, impuesto_valor, total: round2(subtotal - descuento_valor + impuesto_valor) };
}

async function guardarItems(cotizacionId: string, items: ItemCotizacion[]) {
  must(await db().from('cotizacion_items').delete().eq('cotizacion_id', cotizacionId), 'actualizar la cotización');
  must(
    await db()
      .from('cotizacion_items')
      .insert(
        items.map((it, i) => ({
          cotizacion_id: cotizacionId,
          orden: i,
          categoria: it.categoria,
          descripcion: it.descripcion,
          unidad: it.unidad,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
          subtotal: round2(it.cantidad * it.precio_unitario),
        }))
      ),
    'guardar los ítems de la cotización'
  );
}

// POST /api/proyectos/:id/cotizaciones → crea un borrador a partir de la solución técnica
proyectosRouter.post(
  '/proyectos/:id/cotizaciones',
  requireRole('comercial'),
  handler(async (req, res) => {
    const user = currentUser(req);
    const proyecto = await cargarProyecto(getProyectoId(req), user);
    if (!proyecto.permisos.puedeCotizar) throw new HttpError(403, 'El proyecto no está listo para cotizar.');
    if (!proyecto.solucion_tecnica) throw new HttpError(409, 'El proyecto aún no tiene solución técnica.');
    if (proyecto.cotizaciones.some((c) => c.estado === 'BORRADOR')) {
      throw new HttpError(409, 'Ya hay una cotización en borrador. Edítala o envíala.');
    }

    const items = itemsSugeridos(
      proyecto.areas[0]?.area_m2 || 1,
      proyecto.solucion_tecnica.capas,
      proyecto.solucion_tecnica.preparacion_superficie
    );
    const t = totales(items, 0, 19);

    const cot = must(
      await db()
        .from('cotizaciones')
        .insert({
          proyecto_id: proyecto.id,
          comercial_id: user.id,
          ...t,
          descuento_porcentaje: 0,
          impuesto_porcentaje: 19,
          moneda: 'COP',
          validez_dias: 30,
          tiempo_entrega_dias: 15,
          condiciones_pago: '50 % de anticipo para programar el servicio y 50 % contra entrega con acta de calidad aprobada.',
          observaciones: `Garantía técnica de ${proyecto.solucion_tecnica.garantia_anos} año(s) sujeta al mantenimiento recomendado.`,
          estado: 'BORRADOR',
        })
        .select('id, codigo')
        .single(),
      'crear la cotización'
    ) as { id: string; codigo: string };
    await guardarItems(cot.id, items);

    if (!proyecto.comercial_id) {
      await db().from('proyectos').update({ comercial_id: user.id }).eq('id', proyecto.id);
    }
    await registrarActividad(proyecto.id, user, {
      tipo: 'COTIZACION',
      titulo: `Cotización ${cot.codigo} en borrador`,
      descripcion: 'Borrador generado a partir de la solución técnica.',
    });
    res.status(201).json(await cargarProyecto(proyecto.id, user));
  })
);

// PATCH /api/proyectos/:id/cotizaciones/:cid { items?, descuento_porcentaje?, ..., enviar? }
proyectosRouter.patch(
  '/proyectos/:id/cotizaciones/:cid',
  requireRole('comercial'),
  handler(async (req, res) => {
    const user = currentUser(req);
    const proyecto = await cargarProyecto(getProyectoId(req), user);
    const cot = proyecto.cotizaciones.find((c) => c.id === req.params.cid) as Cotizacion | undefined;
    if (!cot) throw new HttpError(404, 'Cotización no encontrada.');
    if (cot.estado !== 'BORRADOR') throw new HttpError(409, 'Solo se pueden editar cotizaciones en borrador.');
    const b = req.body || {};

    let items = cot.items;
    if (Array.isArray(b.items)) {
      if (b.items.length === 0 || b.items.length > 40) throw new HttpError(400, 'La cotización debe tener entre 1 y 40 ítems.');
      items = b.items.map((it: any, i: number) => ({
        categoria: oneOf(it?.categoria, ['MATERIAL', 'MANO_OBRA', 'EQUIPO', 'LOGISTICA', 'PREPARACION'] as const, `categoría del ítem ${i + 1}`),
        descripcion: text(it?.descripcion, `descripción del ítem ${i + 1}`, { required: true, max: 300 }),
        unidad: text(it?.unidad, `unidad del ítem ${i + 1}`, { required: true, max: 20 }),
        cantidad: num(it?.cantidad, `cantidad del ítem ${i + 1}`, { min: 0, max: 1_000_000 }),
        precio_unitario: num(it?.precio_unitario, `precio del ítem ${i + 1}`, { min: 0, max: 1_000_000_000 }),
        subtotal: 0,
      }));
      await guardarItems(cot.id, items);
    }

    const descuento = b.descuento_porcentaje !== undefined ? num(b.descuento_porcentaje, 'descuento', { min: 0, max: 50 }) : cot.descuento_porcentaje;
    const t = totales(items, descuento, cot.impuesto_porcentaje);
    const enviar = bool(b.enviar);

    must(
      await db()
        .from('cotizaciones')
        .update({
          ...t,
          descuento_porcentaje: descuento,
          validez_dias: b.validez_dias !== undefined ? num(b.validez_dias, 'validez', { min: 1, max: 180, integer: true }) : cot.validez_dias,
          tiempo_entrega_dias:
            b.tiempo_entrega_dias !== undefined
              ? num(b.tiempo_entrega_dias, 'tiempo de entrega', { min: 1, max: 365, integer: true })
              : cot.tiempo_entrega_dias,
          condiciones_pago: b.condiciones_pago !== undefined ? optionalText(b.condiciones_pago, 'condiciones de pago', 800) : cot.condiciones_pago,
          observaciones: b.observaciones !== undefined ? optionalText(b.observaciones, 'observaciones', 1500) : cot.observaciones,
          estado: enviar ? 'ENVIADA' : 'BORRADOR',
        })
        .eq('id', cot.id),
      'actualizar la cotización'
    );

    if (enviar) {
      await registrarActividad(proyecto.id, user, {
        tipo: 'COTIZACION',
        titulo: `Cotización ${cot.codigo} enviada al cliente`,
        descripcion: `Total ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(t.total)}.`,
      });
      await cambiarEstado(proyecto, 'COTIZACION', user, 'Te enviamos la cotización del proyecto. Puedes aprobarla o rechazarla desde tu cuenta.');
      // El correo lleva la cotización completa en PDF; si el PDF falla, el correo sale igual sin adjunto
      void (async () => {
        let pdf: Buffer | null = null;
        try {
          pdf = (await pdfDeCotizacion(await cargarProyecto(proyecto.id, user), cot.id))?.pdf ?? null;
        } catch (err: any) {
          console.error('[cotizacion] No se pudo generar el PDF:', err?.message || err);
        }
        await emails.cotizacionEnviada(proyecto.cliente.correo, proyecto.cliente.nombre, cot.codigo, proyecto.id, t.total, cot.validez_dias, pdf);
      })();
    }
    res.json(await cargarProyecto(proyecto.id, user));
  })
);

// GET /api/proyectos/:id/cotizaciones/:cid/pdf → descarga la cotización en PDF
// El cliente solo ve las cotizaciones enviadas de sus proyectos; el equipo, también los borradores.
proyectosRouter.get(
  '/proyectos/:id/cotizaciones/:cid/pdf',
  requireAuth,
  handler(async (req, res) => {
    const user = currentUser(req);
    const proyecto = await cargarProyecto(getProyectoId(req), user);
    const generado = await pdfDeCotizacion(proyecto, String(req.params.cid));
    if (!generado) throw new HttpError(404, 'Cotización no encontrada.');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Cotizacion-${generado.cot.codigo}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(generado.pdf);
  })
);

// POST /api/proyectos/:id/cotizaciones/:cid/responder { decision: 'APROBADA'|'RECHAZADA', comentario }
proyectosRouter.post(
  '/proyectos/:id/cotizaciones/:cid/responder',
  requireAuth,
  handler(async (req, res) => {
    const user = currentUser(req);
    const proyecto = await cargarProyecto(getProyectoId(req), user);
    if (!proyecto.permisos.puedeResponderCotizacion) throw new HttpError(403, 'No puedes responder esta cotización.');
    const cot = proyecto.cotizaciones.find((c) => c.id === req.params.cid);
    if (!cot || cot.estado !== 'ENVIADA') throw new HttpError(409, 'La cotización no está pendiente de respuesta.');

    const decision = oneOf(req.body?.decision, ['APROBADA', 'RECHAZADA'] as const, 'decisión');
    const comentario = optionalText(req.body?.comentario, 'comentario', 1000);
    must(
      await db()
        .from('cotizaciones')
        .update({ estado: decision, respuesta_cliente: comentario, fecha_respuesta: new Date().toISOString() })
        .eq('id', cot.id)
        .eq('estado', 'ENVIADA'),
      'registrar tu respuesta'
    );
    await registrarActividad(proyecto.id, user, {
      tipo: 'RESPUESTA_COTIZACION',
      titulo: `Cotización ${cot.codigo} ${decision === 'APROBADA' ? 'aprobada' : 'rechazada'} por el cliente`,
      descripcion: comentario || undefined,
    });
    // Al aprobarse, los galones estimados de cada color salen del inventario
    if (decision === 'APROBADA') {
      const { data: consumo, error: errConsumo } = await db().rpc('consumir_colores_proyecto', {
        p_proyecto: proyecto.id,
        p_usuario: user.id,
      });
      if (errConsumo) {
        console.warn('[colores] No se pudo descontar el stock de colores:', errConsumo.message);
      } else if (Array.isArray(consumo) && consumo.length) {
        const faltantes = consumo.filter((c: any) => Number(c.faltantes) > 0);
        await registrarActividad(proyecto.id, user, {
          tipo: 'INVENTARIO',
          titulo: faltantes.length ? 'Colores reservados con faltantes por abastecer' : 'Colores reservados del inventario',
          descripcion: consumo
            .map((c: any) => `${c.color}: ${c.descontados} de ${c.requeridos} gal${Number(c.faltantes) > 0 ? ` (faltan ${c.faltantes})` : ''}`)
            .join(' · '),
        });
      }
    }
    await cambiarEstado(
      proyecto,
      decision === 'APROBADA' ? 'APROBADO' : 'SOLUCION_GENERADA',
      user,
      decision === 'APROBADA'
        ? 'Cotización aprobada. Operaciones programará el servicio.'
        : 'Cotización rechazada. El equipo comercial preparará una nueva propuesta.'
    );
    res.json(await cargarProyecto(proyecto.id, user));
  })
);

// ------------------------------------------------------------------------------
// Servicio en campo y control de calidad
// ------------------------------------------------------------------------------

// POST /api/proyectos/:id/servicios → programa la ejecución
proyectosRouter.post(
  '/proyectos/:id/servicios',
  requireRole('operaciones'),
  handler(async (req, res) => {
    const user = currentUser(req);
    const proyecto = await cargarProyecto(getProyectoId(req), user);
    if (!proyecto.permisos.puedeProgramarServicio) throw new HttpError(403, 'El proyecto no está listo para programar el servicio.');
    const b = req.body || {};
    const inicio = isoDate(b.fecha_inicio, 'fecha de inicio', true)!;
    const fin = isoDate(b.fecha_fin_estimada, 'fecha de finalización', true)!;
    if (fin < inicio) throw new HttpError(400, 'La fecha de finalización no puede ser anterior al inicio.');

    must(
      await db().from('servicios').insert({
        proyecto_id: proyecto.id,
        cuadrilla: text(b.cuadrilla, 'cuadrilla', { required: true, max: 120 }),
        lider: text(b.lider, 'líder', { required: true, max: 120 }),
        fecha_inicio: inicio,
        fecha_fin_estimada: fin,
        direccion: optionalText(b.direccion, 'dirección', 200) || proyecto.direccion,
        novedades: optionalText(b.novedades, 'novedades', 1000),
        creado_por: user.id,
      }),
      'programar el servicio'
    );
    await registrarActividad(proyecto.id, user, {
      tipo: 'PROGRAMACION_SERVICIO',
      titulo: 'Servicio programado',
      descripcion: `Del ${inicio} al ${fin}.`,
    });
    if (['APROBADO', 'ABASTECIMIENTO'].includes(proyecto.estado)) {
      await cambiarEstado(proyecto, 'SERVICIO_PROGRAMADO', user, `Tu servicio quedó programado del ${inicio} al ${fin}.`);
    }
    res.status(201).json(await cargarProyecto(proyecto.id, user));
  })
);

// PATCH /api/proyectos/:id/servicios/:sid { estado?, avance?, novedades? }
proyectosRouter.patch(
  '/proyectos/:id/servicios/:sid',
  requireRole('operaciones'),
  handler(async (req, res) => {
    const user = currentUser(req);
    const proyecto = await cargarProyecto(getProyectoId(req), user);
    const servicio = proyecto.servicios.find((s) => s.id === req.params.sid);
    if (!servicio) throw new HttpError(404, 'Servicio no encontrado.');
    const b = req.body || {};

    const estado = oneOf(b.estado, ['PROGRAMADO', 'EN_EJECUCION', 'DETENIDO', 'FINALIZADO'] as const, 'estado', servicio.estado);
    const avance = b.avance !== undefined ? num(b.avance, 'avance', { min: 0, max: 100, integer: true }) : servicio.avance;
    must(
      await db()
        .from('servicios')
        .update({
          estado,
          avance: estado === 'FINALIZADO' ? 100 : avance,
          novedades: b.novedades !== undefined ? optionalText(b.novedades, 'novedades', 1000) : servicio.novedades,
          fecha_fin_real: estado === 'FINALIZADO' ? new Date().toISOString().slice(0, 10) : null,
        })
        .eq('id', servicio.id),
      'actualizar el servicio'
    );
    await registrarActividad(proyecto.id, user, {
      tipo: 'AVANCE_SERVICIO',
      titulo: `Servicio: ${estado.replace('_', ' ').toLowerCase()} (${estado === 'FINALIZADO' ? 100 : avance} %)`,
      descripcion: b.novedades ? String(b.novedades).slice(0, 300) : undefined,
    });

    if (estado === 'EN_EJECUCION' && proyecto.estado === 'SERVICIO_PROGRAMADO') {
      await cambiarEstado(proyecto, 'EN_EJECUCION', user, 'El equipo inició los trabajos en tu espacio.');
    } else if (estado === 'FINALIZADO' && proyecto.estado === 'EN_EJECUCION') {
      await cambiarEstado(proyecto, 'CALIDAD', user, 'Terminamos la aplicación. Ahora realizamos el control de calidad.');
    }
    res.json(await cargarProyecto(proyecto.id, user));
  })
);

// POST /api/proyectos/:id/calidad → registra la inspección; si aprueba, cierra el proyecto
proyectosRouter.post(
  '/proyectos/:id/calidad',
  requireRole('operaciones', 'tecnico'),
  handler(async (req, res) => {
    const user = currentUser(req);
    const proyecto = await cargarProyecto(getProyectoId(req), user);
    if (!proyecto.permisos.puedeRegistrarCalidad) throw new HttpError(403, 'El proyecto no está en etapa de control de calidad.');
    const b = req.body || {};

    const adherencia = bool(b.adherencia_ok);
    const espesor = bool(b.espesor_ok);
    const curado = bool(b.curado_ok);
    const acabado = oneOf(b.acabado_visual, ['EXCELENTE', 'BUENO', 'CON_OBSERVACIONES', 'RECHAZADO'] as const, 'acabado visual');
    const aprobado = adherencia && espesor && curado && (acabado === 'EXCELENTE' || acabado === 'BUENO');

    must(
      await db().from('inspecciones_calidad').insert({
        proyecto_id: proyecto.id,
        servicio_id: proyecto.servicios[0]?.id || null,
        inspector_id: user.id,
        inspector_nombre: user.nombre_completo,
        adherencia_ok: adherencia,
        espesor_ok: espesor,
        espesor_promedio_micrones: b.espesor_promedio_micrones ? num(b.espesor_promedio_micrones, 'espesor promedio', { min: 0, max: 10000, integer: true }) : null,
        acabado_visual: acabado,
        curado_ok: curado,
        observaciones: optionalText(b.observaciones, 'observaciones', 1500),
        resultado: aprobado ? 'APROBADO' : 'REQUIERE_REPARACION',
      }),
      'registrar la inspección'
    );
    await registrarActividad(proyecto.id, user, {
      tipo: 'INSPECCION_CALIDAD',
      titulo: aprobado ? 'Inspección de calidad aprobada' : 'Inspección con observaciones',
      descripcion: optionalText(b.observaciones, 'observaciones', 300) || undefined,
    });

    if (proyecto.estado === 'EN_EJECUCION') {
      await cambiarEstado(proyecto, 'CALIDAD', user, 'Inició el control de calidad.');
      proyecto.estado = 'CALIDAD';
    }
    await cambiarEstado(
      proyecto,
      aprobado ? 'CERRADO' : 'EN_EJECUCION',
      user,
      aprobado
        ? '¡Tu proyecto fue entregado y aprobado en control de calidad! Gracias por confiar en COLORLINK.'
        : 'La inspección encontró detalles por corregir; el equipo realizará los ajustes.'
    );
    res.status(201).json(await cargarProyecto(proyecto.id, user));
  })
);
