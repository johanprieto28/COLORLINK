import nodemailer, { type Transporter } from 'nodemailer';
import { config } from './config';
import { isDbConfigured, db } from './supabase';
import type { EstadoPedido, Pedido, ProjectStatus } from '../src/types';
import { ESTADO_PEDIDO_LABELS, PROJECT_STATUS_LABELS, METODO_PAGO_LABELS } from '../src/types';

/**
 * Servicio de correo de COLORLINK.
 *
 * Proveedor configurable por variables de entorno:
 *   EMAIL_PROVIDER=gmail   + GMAIL_USER + GMAIL_APP_PASSWORD (Gmail o Google Workspace)
 *   EMAIL_PROVIDER=resend  + RESEND_API_KEY + EMAIL_FROM
 * Sin proveedor configurado, los correos no se envían pero quedan registrados
 * en public.correos_enviados con estado OMITIDO (útil en desarrollo).
 *
 * Para usar otro proveedor (SendGrid, SES, SMTP...) basta con agregar un caso
 * en `deliver()`; el resto de la app no cambia.
 */

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  plantilla: string;
  referencia?: string;
  adjuntos?: Array<{ nombre: string; contenido: Buffer; tipo: string }>;
}

type DeliveryResult = { estado: 'ENVIADO' | 'FALLIDO' | 'OMITIDO'; error?: string };

let gmailTransport: Transporter | null = null;

function getGmailTransport(): Transporter {
  gmailTransport ??= nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: config.gmailUser, pass: config.gmailAppPassword },
  });
  return gmailTransport;
}

async function deliver(msg: EmailMessage): Promise<DeliveryResult> {
  switch (config.emailProvider) {
    case 'gmail': {
      if (!config.gmailUser || !config.gmailAppPassword) {
        return { estado: 'OMITIDO', error: 'GMAIL_USER o GMAIL_APP_PASSWORD no configurados' };
      }
      await getGmailTransport().sendMail({
        from: config.emailFrom,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        attachments: msg.adjuntos?.map((a) => ({ filename: a.nombre, content: a.contenido, contentType: a.tipo })),
      });
      return { estado: 'ENVIADO' };
    }
    case 'resend': {
      if (!config.resendApiKey) return { estado: 'OMITIDO', error: 'RESEND_API_KEY no configurada' };
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: config.emailFrom,
          to: [msg.to],
          subject: msg.subject,
          html: msg.html,
          attachments: msg.adjuntos?.map((a) => ({ filename: a.nombre, content: a.contenido.toString('base64') })),
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return { estado: 'ENVIADO' };
      const body = await res.text().catch(() => '');
      return { estado: 'FALLIDO', error: `HTTP ${res.status} ${body.slice(0, 200)}` };
    }
    default:
      return { estado: 'OMITIDO', error: 'Sin proveedor de correo configurado' };
  }
}

/** Fallos pasajeros del proveedor (Gmail responde 4xx "try again later", cortes de red) */
const ERROR_TEMPORAL = /\b4\d\d\b|temporar|try again|ETIMEDOUT|ECONNRESET|ESOCKET|ECONNECTION/i;

async function intentar(msg: EmailMessage): Promise<DeliveryResult> {
  try {
    return await deliver(msg);
  } catch (err: any) {
    return { estado: 'FALLIDO', error: String(err?.message || err).slice(0, 240) };
  }
}

/** Envía y registra. Nunca lanza: un fallo de correo no debe romper la operación principal. */
export async function sendEmail(msg: EmailMessage): Promise<DeliveryResult> {
  let result = await intentar(msg);
  // Un error temporal se reintenta dos veces con una pausa corta antes de darlo por fallido
  for (let i = 1; i <= 2 && result.estado === 'FALLIDO' && ERROR_TEMPORAL.test(result.error || ''); i++) {
    await new Promise((r) => setTimeout(r, 1500 * i));
    gmailTransport = null; // fuerza una conexión nueva
    result = await intentar(msg);
  }

  if (result.estado === 'FALLIDO') {
    console.warn(`[email] Falló "${msg.plantilla}" a ${msg.to}: ${result.error}`);
  }

  if (isDbConfigured()) {
    const { error } = await db().from('correos_enviados').insert({
      destinatario: msg.to,
      asunto: msg.subject,
      plantilla: msg.plantilla,
      estado: result.estado,
      proveedor: config.emailProvider || 'ninguno',
      referencia: msg.referencia || null,
      error: result.error || null,
    });
    if (error) console.warn('[email] No se pudo registrar el envío:', error.message);
  }
  return result;
}

export function emailStatus() {
  if (config.emailProvider === 'gmail' && config.gmailUser && config.gmailAppPassword) {
    return { ok: true, proveedor: 'gmail', detalle: `Enviando desde ${config.gmailUser}` };
  }
  if (config.emailProvider === 'resend' && config.resendApiKey) {
    return { ok: true, proveedor: 'resend', detalle: `Enviando como ${config.emailFrom}` };
  }
  return {
    ok: false,
    proveedor: config.emailProvider || 'ninguno',
    detalle: 'Configura EMAIL_PROVIDER=gmail con GMAIL_USER y GMAIL_APP_PASSWORD para enviar correos.',
  };
}

// ------------------------------------------------------------------------------
// Plantillas
// ------------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

// Paleta y tipografía de la página (src/index.css). Los correos usan estilos en línea y tablas
// porque Gmail y Outlook ignoran <style> y flexbox; si las fuentes web no cargan, caen a Arial.
const C = {
  navy: '#092653',
  blue: '#155EEF',
  turquoise: '#08B6CC',
  yellow: '#FFE34D',
  bg: '#FAFAF7',
  surface: '#E7EAF0',
  text: '#15243B',
  muted: '#5B6475',
  pending: '#9AA3B2',
  danger: '#BE123C',
};
const FONT_BODY = `'DM Sans',Arial,Helvetica,sans-serif`;
const FONT_DISPLAY = `'Plus Jakarta Sans','DM Sans',Arial,Helvetica,sans-serif`;

/**
 * Isotipo de COLORLINK (igual al favicon) hecho con tablas: no depende de imágenes,
 * así se ve aunque el cliente de correo bloquee imágenes o la app corra en localhost.
 */
function isotipo(): string {
  const celda = (color: string) =>
    `<td width="11" height="11" style="width:11px;height:11px;background:${color};border-radius:2px;font-size:0;line-height:0">&nbsp;</td>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="background:${C.navy};border-radius:10px"><tr><td style="padding:8px">
    <table role="presentation" cellpadding="0" cellspacing="2"><tr>${celda(C.blue)}${celda(C.turquoise)}</tr><tr>${celda(C.yellow)}${celda(C.bg)}</tr></table>
  </td></tr></table>`;
}

function layout(titulo: string, cuerpo: string, cta?: { texto: string; ruta: string }): string {
  const boton = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px"><tr><td style="border-radius:12px;background:${C.navy}">
        <a href="${config.appUrl}/#${cta.ruta}" style="display:inline-block;padding:13px 24px;font-family:${FONT_BODY};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px">${escapeHtml(cta.texto)} &rarr;</a>
      </td></tr></table>`
    : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light only"><title>${escapeHtml(titulo)}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Plus+Jakarta+Sans:wght@700;800&display=swap" rel="stylesheet">
  </head><body style="margin:0;padding:0;background:${C.bg};font-family:${FONT_BODY};color:${C.text}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:28px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">
    <tr><td style="padding:0 4px 14px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td valign="middle" style="padding-right:10px">${isotipo()}</td>
        <td valign="middle" style="font-family:${FONT_DISPLAY};font-size:22px;font-weight:800;letter-spacing:-0.4px;color:${C.navy}">
          COLOR<span style="color:${C.turquoise}">LINK</span><span style="font-family:${FONT_BODY};font-size:12px;font-weight:500;color:${C.muted};letter-spacing:0">&nbsp;&nbsp;Pinturas y recubrimientos</span>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid ${C.surface};border-radius:20px;overflow:hidden">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="55%" style="height:6px;line-height:6px;font-size:0;background:${C.navy};border-top-left-radius:20px">&nbsp;</td>
        <td width="30%" style="height:6px;line-height:6px;font-size:0;background:${C.turquoise}">&nbsp;</td>
        <td width="15%" style="height:6px;line-height:6px;font-size:0;background:${C.yellow};border-top-right-radius:20px">&nbsp;</td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:30px 28px 28px">
        <h1 style="margin:0 0 16px;font-family:${FONT_DISPLAY};font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.5px;color:${C.navy}">${escapeHtml(titulo)}</h1>
        ${cuerpo}
        ${boton}
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:18px 8px 0;font-size:12px;line-height:1.6;color:${C.muted};text-align:center">
      Recibes este correo porque tienes actividad en COLORLINK. Si no reconoces esta acción, ignóralo.<br>
      <a href="${config.appUrl}" style="color:${C.blue};text-decoration:none;font-weight:600">${escapeHtml(config.appUrl.replace(/^https?:\/\//, ''))}</a>
    </td></tr>
  </table></td></tr></table></body></html>`;
}

const p = (t: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${C.text}">${t}</p>`;

/** Recuadro claro, como las tarjetas de la página */
const caja = (contenido: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:${C.bg};border:1px solid ${C.surface};border-radius:14px"><tr><td style="padding:16px 18px">${contenido}</td></tr></table>`;

const etiqueta = (texto: string, fondo: string, color: string) =>
  `<span style="display:inline-block;padding:4px 10px;border-radius:8px;background:${fondo};color:${color};font-size:12px;font-weight:700">${escapeHtml(texto)}</span>`;

/**
 * Barra de progreso con pasos numerados, hecha con tablas para que se vea igual en Gmail, Outlook y móviles.
 * `actual` es el índice del paso en curso; los anteriores se marcan como completados.
 */
function barraProgreso(pasos: string[], actual: number): string {
  const total = pasos.length;
  const pct = Math.round((Math.max(0, actual) / (total - 1)) * 100);
  const celdas = pasos
    .map((label, i) => {
      const hecho = i < actual;
      const enCurso = i === actual;
      const fondo = enCurso ? C.turquoise : hecho ? C.navy : '#ffffff';
      const borde = enCurso || hecho ? fondo : C.surface;
      const color = enCurso || hecho ? '#ffffff' : C.pending;
      return `<td width="${Math.floor(100 / total)}%" align="center" valign="top" style="padding:0 2px">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" style="width:26px;height:26px;border-radius:15px;background:${fondo};border:2px solid ${borde};color:${color};font-size:12px;font-weight:700;line-height:26px">${hecho ? '&#10003;' : i + 1}</td></tr></table>
        <div style="margin-top:6px;font-size:11px;line-height:1.3;color:${enCurso ? C.navy : hecho ? C.text : C.pending};font-weight:${enCurso ? 700 : 500}">${escapeHtml(label)}</div>
      </td>`;
    })
    .join('');
  const relleno = pct > 0 ? `<td width="${pct}%" style="height:8px;line-height:8px;font-size:0;background:${C.turquoise};border-radius:6px">&nbsp;</td>` : '';
  const vacio = pct < 100 ? `<td style="height:8px;line-height:8px;font-size:0">&nbsp;</td>` : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 6px">
      <tr><td style="padding:0 0 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.surface};border-radius:6px"><tr>${relleno}${vacio}</tr></table></td></tr>
      <tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${celdas}</tr></table></td></tr>
    </table>`;
}

const PASOS_PEDIDO: EstadoPedido[] = ['PENDIENTE', 'CONFIRMADO', 'PREPARANDO', 'ENVIADO', 'ENTREGADO'];
const PASOS_PEDIDO_LABELS = ['Recibido', 'Confirmado', 'En preparación', 'Enviado', 'Entregado'];
const MENSAJE_PEDIDO: Record<EstadoPedido, string> = {
  PENDIENTE: 'Recibimos tu pedido y lo estamos revisando.',
  CONFIRMADO: 'Confirmamos tu pedido y reservamos los productos.',
  PREPARANDO: 'Estamos alistando y empacando tus productos.',
  ENVIADO: 'Tu pedido va en camino a la dirección de entrega.',
  ENTREGADO: '¡Tu pedido fue entregado! Gracias por comprar en COLORLINK.',
  CANCELADO: 'Tu pedido fue cancelado. Si ya habías pagado, te contactaremos para el reembolso.',
};

function progresoPedido(estado: EstadoPedido): string {
  if (estado === 'CANCELADO') {
    return caja(`${etiqueta('Cancelado', '#FFE4E6', C.danger)}<p style="margin:10px 0 0;font-size:14px;line-height:1.55">${MENSAJE_PEDIDO.CANCELADO}</p>`);
  }
  return (
    barraProgreso(PASOS_PEDIDO_LABELS, PASOS_PEDIDO.indexOf(estado)) +
    caja(`<p style="margin:0;font-size:14px;line-height:1.55"><strong style="color:${C.navy}">${ESTADO_PEDIDO_LABELS[estado]}:</strong> ${MENSAJE_PEDIDO[estado]}</p>`)
  );
}

/** Mismas etapas que la línea de avance del detalle del proyecto */
const ETAPAS_PROYECTO: Array<{ estados: ProjectStatus[]; label: string }> = [
  { estados: ['BORRADOR', 'RECIBIDO'], label: 'Recibido' },
  { estados: ['EN_ANALISIS', 'VALIDACION_TECNICA'], label: 'Análisis' },
  { estados: ['SOLUCION_GENERADA'], label: 'Solución' },
  { estados: ['COTIZACION'], label: 'Cotización' },
  { estados: ['APROBADO', 'ABASTECIMIENTO', 'SERVICIO_PROGRAMADO'], label: 'Aprobado' },
  { estados: ['EN_EJECUCION', 'CALIDAD'], label: 'Ejecución' },
  { estados: ['CERRADO'], label: 'Entregado' },
];

function progresoProyecto(estado: ProjectStatus): string {
  if (estado === 'CANCELADO') return caja(etiqueta('Proyecto cancelado', '#FFE4E6', C.danger));
  return barraProgreso(
    ETAPAS_PROYECTO.map((e) => e.label),
    ETAPAS_PROYECTO.findIndex((e) => e.estados.includes(estado))
  );
}

function tablaItems(pedido: Pedido): string {
  const filas = pedido.items
    .map(
      (it) =>
        `<tr><td style="padding:7px 0;font-size:14px;border-bottom:1px solid ${C.surface}">${escapeHtml(it.nombre)} <span style="color:${C.muted}">&times; ${it.cantidad}</span></td><td style="padding:7px 0;font-size:14px;text-align:right;border-bottom:1px solid ${C.surface}">${cop(it.subtotal)}</td></tr>`
    )
    .join('');
  return caja(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}
      <tr><td style="padding:8px 0 4px;font-size:14px;color:${C.muted}">Envío</td><td style="padding:8px 0 4px;font-size:14px;text-align:right">${pedido.costo_envio ? cop(pedido.costo_envio) : 'Gratis'}</td></tr>
      <tr><td style="padding:6px 0 0;font-family:${FONT_DISPLAY};font-size:17px;font-weight:800;color:${C.navy}">Total</td><td style="padding:6px 0 0;font-family:${FONT_DISPLAY};font-size:17px;font-weight:800;text-align:right;color:${C.navy}">${cop(pedido.total)}</td></tr>
    </table>`);
}

export const emails = {
  codigoRegistro(to: string, codigo: string, minutos: number) {
    return sendEmail({
      to,
      plantilla: 'codigo_registro',
      subject: `${codigo} es tu código de verificación de COLORLINK`,
      html: layout(
        'Verifica tu correo',
        p('Usa este código para continuar con la creación de tu cuenta en COLORLINK:') +
          caja(
            `<div style="text-align:center;font-family:${FONT_DISPLAY};font-size:34px;font-weight:800;letter-spacing:10px;color:${C.navy}">${escapeHtml(codigo)}</div>`
          ) +
          p(`El código vence en ${minutos} minutos. Si no fuiste tú, ignora este correo: nadie podrá crear una cuenta sin él.`)
      ),
    });
  },

  bienvenida(to: string, nombre: string) {
    return sendEmail({
      to,
      plantilla: 'bienvenida',
      subject: 'Bienvenido a COLORLINK',
      html: layout(
        `¡Hola, ${escapeHtml(nombre)}!`,
        p('Tu cuenta en COLORLINK está lista. Desde ahora puedes:') +
          `<ul style="margin:0 0 12px;padding-left:20px;font-size:15px;line-height:1.7">
            <li>Comprar pinturas, impermeabilizantes y herramientas.</li>
            <li>Guardar tus colores favoritos.</li>
            <li>Registrar proyectos y recibir orientación técnica y cotización.</li>
          </ul>`,
        { texto: 'Ir a la tienda', ruta: '/tienda' }
      ),
    });
  },

  proyectoRecibido(to: string, nombre: string, codigo: string, proyectoId: string, proyectoNombre: string) {
    return sendEmail({
      to,
      plantilla: 'proyecto_recibido',
      referencia: proyectoId,
      subject: `Recibimos tu proyecto ${codigo}`,
      html: layout(
        'Tu proyecto fue registrado',
        p(`Hola ${escapeHtml(nombre)}, registramos tu proyecto <strong>${escapeHtml(proyectoNombre)}</strong> con el código <strong>${codigo}</strong>.`) +
          progresoProyecto('RECIBIDO') +
          p('Un especialista revisará la información y las fotografías para validar la orientación técnica. Te avisaremos por este medio en cada avance.'),
        { texto: 'Ver mi proyecto', ruta: `/proyectos/${proyectoId}` }
      ),
    });
  },

  avisoInternoProyecto(codigo: string, proyectoId: string, proyectoNombre: string, ciudad: string) {
    if (!config.emailNotificacionesInternas) return Promise.resolve(null);
    return sendEmail({
      to: config.emailNotificacionesInternas,
      plantilla: 'aviso_interno_proyecto',
      referencia: proyectoId,
      subject: `Nuevo proyecto ${codigo} · ${ciudad}`,
      html: layout(
        'Nuevo proyecto por revisar',
        p(`Se registró <strong>${escapeHtml(proyectoNombre)}</strong> (${codigo}) en ${escapeHtml(ciudad)}.`),
        { texto: 'Abrir en el panel', ruta: `/proyectos/${proyectoId}` }
      ),
    });
  },

  estadoProyecto(to: string, nombre: string, codigo: string, proyectoId: string, estado: ProjectStatus, nota?: string) {
    return sendEmail({
      to,
      plantilla: 'estado_proyecto',
      referencia: proyectoId,
      subject: `Tu proyecto ${codigo}: ${PROJECT_STATUS_LABELS[estado]}`,
      html: layout(
        'Tu proyecto avanzó',
        p(`Hola ${escapeHtml(nombre)}, el proyecto <strong>${codigo}</strong> ahora está en estado <strong>${PROJECT_STATUS_LABELS[estado]}</strong>.`) +
          progresoProyecto(estado) +
          (nota ? caja(`<p style="margin:0;font-size:14px;line-height:1.55">${escapeHtml(nota)}</p>`) : ''),
        { texto: 'Ver seguimiento', ruta: `/proyectos/${proyectoId}` }
      ),
    });
  },

  cotizacionEnviada(
    to: string,
    nombre: string,
    codigoCot: string,
    proyectoId: string,
    total: number,
    validez: number,
    pdf?: Buffer | null
  ) {
    return sendEmail({
      to,
      plantilla: 'cotizacion_enviada',
      referencia: proyectoId,
      subject: `Tu cotización ${codigoCot} está lista`,
      html: layout(
        'Tienes una cotización nueva',
        p(`Hola ${escapeHtml(nombre)}, preparamos la cotización <strong>${codigoCot}</strong> para tu proyecto.`) +
          caja(`<span style="font-size:12px;color:${C.muted}">Valor total con IVA</span><div style="font-family:${FONT_DISPLAY};font-size:26px;font-weight:800;color:${C.navy}">${cop(total)}</div>`) +
          (pdf ? p('📎 Adjuntamos la cotización completa en PDF: detalle de materiales y mano de obra, solución técnica y condiciones.') : '') +
          p(`Es válida por ${validez} días. Puedes revisarla y aprobarla o rechazarla desde tu cuenta.`),
        { texto: 'Revisar y aprobar', ruta: `/proyectos/${proyectoId}` }
      ),
      adjuntos: pdf ? [{ nombre: `Cotizacion-${codigoCot}.pdf`, contenido: pdf, tipo: 'application/pdf' }] : undefined,
    });
  },

  pedidoConfirmado(pedido: Pedido) {
    return sendEmail({
      to: pedido.correo,
      plantilla: 'pedido_confirmado',
      referencia: pedido.id,
      subject: `Recibimos tu pedido ${pedido.codigo}`,
      html: layout(
        `Gracias por tu compra, ${escapeHtml(pedido.nombre_contacto)}`,
        p(`Tu pedido <strong>${pedido.codigo}</strong> fue registrado. Método de pago: ${METODO_PAGO_LABELS[pedido.metodo_pago]}.`) +
          progresoPedido(pedido.estado) +
          tablaItems(pedido) +
          p(`Entrega en: ${escapeHtml(pedido.direccion)}, ${escapeHtml(pedido.ciudad)}.`) +
          (pedido.metodo_pago === 'TRANSFERENCIA'
            ? p(`<strong>Datos para la transferencia:</strong> ${escapeHtml(config.datosTransferencia)} Usa el código ${pedido.codigo} como referencia.`)
            : ''),
        { texto: 'Ver mi pedido', ruta: '/cuenta/pedidos' }
      ),
    });
  },

  avisoInternoPedido(pedido: Pedido) {
    if (!config.emailNotificacionesInternas) return Promise.resolve(null);
    return sendEmail({
      to: config.emailNotificacionesInternas,
      plantilla: 'aviso_interno_pedido',
      referencia: pedido.id,
      subject: `Nuevo pedido ${pedido.codigo} · ${cop(pedido.total)}`,
      html: layout(
        'Nuevo pedido en la tienda',
        p(`${escapeHtml(pedido.nombre_contacto)} realizó el pedido <strong>${pedido.codigo}</strong> por ${cop(pedido.total)} (${METODO_PAGO_LABELS[pedido.metodo_pago]}).`),
        { texto: 'Gestionar pedidos', ruta: '/panel/pedidos' }
      ),
    });
  },

  estadoPedido(pedido: Pedido) {
    return sendEmail({
      to: pedido.correo,
      plantilla: 'estado_pedido',
      referencia: pedido.id,
      subject: `Tu pedido ${pedido.codigo}: ${ESTADO_PEDIDO_LABELS[pedido.estado]}`,
      html: layout(
        pedido.estado === 'ENVIADO' ? '¡Tu pedido va en camino!' : pedido.estado === 'ENTREGADO' ? 'Pedido entregado' : 'Actualizamos tu pedido',
        p(`Hola ${escapeHtml(pedido.nombre_contacto)}, tu pedido <strong>${pedido.codigo}</strong> ahora está: <strong>${ESTADO_PEDIDO_LABELS[pedido.estado]}</strong>.`) +
          progresoPedido(pedido.estado) +
          (pedido.estado === 'ENVIADO' && pedido.transportadora && pedido.numero_guia
            ? caja(
                `<div style="font-size:12px;color:${C.muted};margin-bottom:4px">Transportadora</div>` +
                  `<div style="font-size:15px;font-weight:700;color:${C.navy};margin-bottom:10px">${escapeHtml(pedido.transportadora)}</div>` +
                  `<div style="font-size:12px;color:${C.muted};margin-bottom:4px">Número de guía</div>` +
                  `<div style="font-family:${FONT_DISPLAY};font-size:20px;font-weight:800;letter-spacing:1px;color:${C.navy}">${escapeHtml(pedido.numero_guia)}</div>`
              ) + p('Con este número puedes rastrear tu pedido en la página de la transportadora.')
            : '') +
          (pedido.estado === 'PREPARANDO' || pedido.estado === 'ENVIADO'
            ? p(`Entrega en: ${escapeHtml(pedido.direccion)}, ${escapeHtml(pedido.ciudad)}.`)
            : '') +
          tablaItems(pedido),
        { texto: 'Ver mis pedidos', ruta: '/cuenta/pedidos' }
      ),
    });
  },
};
