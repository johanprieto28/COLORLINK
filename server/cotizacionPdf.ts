import PDFDocument from 'pdfkit';
import type { Cotizacion, Proyecto } from '../src/types';
import { config } from './config';

/**
 * PDF de la cotización que se adjunta al correo del cliente.
 * Usa las fuentes estándar de PDF (Helvetica), que incluyen tildes y la ñ.
 */

const C = {
  navy: '#092653',
  blue: '#155EEF',
  turquoise: '#08B6CC',
  yellow: '#FFE34D',
  bg: '#FAFAF7',
  surface: '#E7EAF0',
  text: '#15243B',
  muted: '#5B6475',
};

const CATEGORIA: Record<string, string> = {
  MATERIAL: 'Material',
  MANO_OBRA: 'Mano de obra',
  EQUIPO: 'Equipo',
  LOGISTICA: 'Logística',
  PREPARACION: 'Preparación',
};
const SUPERFICIE: Record<string, string> = {
  MAMPOSTERIA: 'Mampostería',
  CONCRETO: 'Concreto',
  DRYWALL: 'Drywall',
  METAL: 'Metal',
  MADERA: 'Madera',
  FIBROCEMENTO: 'Fibrocemento',
  CUBIERTA: 'Cubierta',
  PISO: 'Piso',
};
const METODO: Record<string, string> = {
  BROCHA_RODILLO: 'Brocha y rodillo',
  AIRLESS: 'Equipo airless',
  ASPERSION_CONVENCIONAL: 'Aspersión convencional',
  LLANA: 'Llana',
};

const UNIDAD: Record<string, string> = {
  M2: 'm²',
  GALON: 'gal',
  CUNETE: 'cuñete',
  UNIDAD: 'und',
  GLOBAL: 'global',
  KG: 'kg',
  LITRO: 'L',
  ML: 'm',
  DIA: 'día',
  HORA: 'h',
};

const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0);
const fecha = (d: Date | string) =>
  new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' }).format(new Date(d));
const capitalizar = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

export interface ColorPdf {
  nombre: string;
  hex: string;
}

export function generarCotizacionPdf(proyecto: Proyecto, cot: Cotizacion, colores: ColorPdf[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 48, bottom: 56, left: 48, right: 48 },
      bufferPages: true,
      info: { Title: `Cotización ${cot.codigo}`, Author: 'COLORLINK', Subject: proyecto.nombre },
    });
    const partes: Buffer[] = [];
    doc.on('data', (b: Buffer) => partes.push(b));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    const izq = doc.page.margins.left;
    const ancho = doc.page.width - izq - doc.page.margins.right;
    const der = izq + ancho;
    const finPagina = () => doc.page.height - doc.page.margins.bottom;
    /** Salta de página si lo que sigue no cabe */
    const asegurar = (alto: number) => {
      if (doc.y + alto > finPagina()) doc.addPage();
    };

    // ------------------------------------------------------------- Encabezado
    const cy = doc.y;
    doc.roundedRect(izq, cy, 34, 34, 8).fill(C.navy);
    const celda = (x: number, y: number, color: string) => doc.roundedRect(izq + x, cy + y, 9, 9, 1.5).fill(color);
    celda(7, 7, C.blue);
    celda(18, 7, C.turquoise);
    celda(7, 18, C.yellow);
    celda(18, 18, C.bg);
    doc.font('Helvetica-Bold').fontSize(19).fillColor(C.navy).text('COLOR', izq + 44, cy + 3, { continued: true }).fillColor(C.turquoise).text('LINK');
    doc.font('Helvetica').fontSize(8.5).fillColor(C.muted).text('Pinturas y recubrimientos', izq + 44, cy + 24);

    doc.font('Helvetica-Bold').fontSize(16).fillColor(C.navy).text('COTIZACIÓN', izq, cy, { width: ancho, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.turquoise).text(cot.codigo, izq, cy + 20, { width: ancho, align: 'right' });
    doc.y = cy + 44;
    // Franja de marca
    doc.rect(izq, doc.y, ancho * 0.55, 3).fill(C.navy);
    doc.rect(izq + ancho * 0.55, doc.y, ancho * 0.3, 3).fill(C.turquoise);
    doc.rect(izq + ancho * 0.85, doc.y, ancho * 0.15, 3).fill(C.yellow);
    doc.y += 14;

    const emitida = new Date(cot.updated_at || cot.created_at);
    const vence = new Date(emitida.getTime() + cot.validez_dias * 86400e3);
    doc.font('Helvetica').fontSize(8.5).fillColor(C.muted);
    doc.text(`Fecha: ${fecha(emitida)}   ·   Válida hasta: ${fecha(vence)} (${cot.validez_dias} días)   ·   Proyecto: ${proyecto.codigo}`, izq, doc.y, {
      width: ancho,
    });
    doc.moveDown(1.2);

    // ------------------------------------------------------------- Cliente y proyecto
    const cliente = proyecto.cliente;
    const juridica = cliente.tipo_cliente !== 'PERSONA_NATURAL';
    const area = proyecto.areas[0];
    const bloqueY = doc.y;
    const col = (ancho - 14) / 2;

    const bloque = (x: number, titulo: string, lineas: Array<[string, string | null | undefined]>) => {
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.turquoise).text(titulo.toUpperCase(), x + 12, bloqueY + 10, { characterSpacing: 0.6 });
      let y = bloqueY + 24;
      for (const [etiqueta, valor] of lineas) {
        if (!valor) continue;
        doc.font('Helvetica').fontSize(7.5).fillColor(C.muted).text(etiqueta, x + 12, y, { width: col - 24 });
        y = doc.y;
        doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text).text(valor, x + 12, y, { width: col - 24 });
        y = doc.y + 4;
      }
      return y;
    };
    const altoCliente = bloque(izq, 'Cliente', [
      [juridica ? 'Razón social' : 'Nombre', juridica ? cliente.empresa || cliente.nombre : cliente.nombre],
      [juridica ? 'NIT' : cliente.tipo_documento || 'Documento', cliente.documento],
      ['Contacto', juridica ? cliente.nombre : null],
      ['Teléfono · correo', `${cliente.telefono} · ${cliente.correo}`],
    ]);
    const altoProyecto = bloque(izq + col + 14, 'Proyecto', [
      ['Nombre', proyecto.nombre],
      ['Ubicación', [proyecto.direccion, proyecto.ciudad].filter(Boolean).join(', ')],
      [
        'Superficie',
        area ? `${SUPERFICIE[area.tipo_superficie] || capitalizar(area.tipo_superficie)} · ${area.area_m2} m² · ${capitalizar(area.ubicacion)}` : null,
      ],
    ]);
    // Muestras de color dentro del bloque del proyecto
    let yColores = altoProyecto;
    if (colores.length) {
      doc.font('Helvetica').fontSize(7.5).fillColor(C.muted).text('Colores', izq + col + 26, yColores);
      yColores = doc.y + 2;
      colores.forEach((c, i) => {
        doc.roundedRect(izq + col + 26, yColores, 12, 12, 3).fillAndStroke(c.hex, '#D5D9E2');
        doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text).text(c.nombre, izq + col + 44, yColores + 1.5, { continued: true });
        doc.font('Helvetica').fontSize(8).fillColor(C.muted).text(`  ${i === 0 ? 'principal' : 'secundario'}`);
        yColores += 16;
      });
    }
    const altoBloques = Math.max(altoCliente, yColores) - bloqueY + 6;
    doc.roundedRect(izq, bloqueY, col, altoBloques, 8).lineWidth(0.8).stroke(C.surface);
    doc.roundedRect(izq + col + 14, bloqueY, col, altoBloques, 8).lineWidth(0.8).stroke(C.surface);
    doc.y = bloqueY + altoBloques + 18;

    // ------------------------------------------------------------- Ítems
    const cols = [
      { titulo: 'Descripción', w: ancho * 0.4, align: 'left' as const },
      { titulo: 'Categoría', w: ancho * 0.13, align: 'left' as const },
      { titulo: 'Cantidad', w: ancho * 0.15, align: 'right' as const },
      { titulo: 'Valor unitario', w: ancho * 0.16, align: 'right' as const },
      { titulo: 'Subtotal', w: ancho * 0.16, align: 'right' as const },
    ];
    const encabezadoTabla = () => {
      const y = doc.y;
      doc.rect(izq, y, ancho, 20).fill(C.navy);
      let x = izq;
      for (const c of cols) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF').text(c.titulo, x + 8, y + 6.5, { width: c.w - 16, align: c.align });
        x += c.w;
      }
      doc.y = y + 20;
    };
    encabezadoTabla();
    cot.items.forEach((it, i) => {
      const valores = [
        it.descripcion,
        CATEGORIA[it.categoria] || capitalizar(it.categoria),
        `${Number(it.cantidad).toLocaleString('es-CO')} ${UNIDAD[String(it.unidad).toUpperCase()] || String(it.unidad).toLowerCase()}`,
        cop(it.precio_unitario),
        cop(it.subtotal),
      ];
      doc.font('Helvetica').fontSize(8.5);
      const alto = Math.max(...valores.map((v, j) => doc.heightOfString(v, { width: cols[j].w - 16 }))) + 12;
      if (doc.y + alto > finPagina()) {
        doc.addPage();
        encabezadoTabla();
      }
      const y = doc.y;
      if (i % 2 === 1) doc.rect(izq, y, ancho, alto).fill(C.bg);
      let x = izq;
      valores.forEach((v, j) => {
        doc
          .font(j === 4 ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(8.5)
          .fillColor(j === 1 ? C.muted : C.text)
          .text(v, x + 8, y + 6, { width: cols[j].w - 16, align: cols[j].align });
        x += cols[j].w;
      });
      doc.y = y + alto;
    });
    doc.moveTo(izq, doc.y).lineTo(der, doc.y).lineWidth(0.8).stroke(C.surface);
    doc.y += 10;

    // ------------------------------------------------------------- Totales
    asegurar(100);
    const filasTotales: Array<[string, string]> = [['Subtotal', cop(cot.subtotal)]];
    if (Number(cot.descuento_valor) > 0) filasTotales.push([`Descuento (${cot.descuento_porcentaje}%)`, `- ${cop(cot.descuento_valor)}`]);
    filasTotales.push([`IVA (${cot.impuesto_porcentaje}%)`, cop(cot.impuesto_valor)]);
    const xTot = der - 220;
    for (const [k, v] of filasTotales) {
      const y = doc.y;
      doc.font('Helvetica').fontSize(9).fillColor(C.muted).text(k, xTot, y, { width: 110 });
      doc.font('Helvetica').fontSize(9).fillColor(C.text).text(v, xTot + 110, y, { width: 110, align: 'right' });
      doc.y = y + 15;
    }
    const yTotal = doc.y + 2;
    doc.roundedRect(xTot - 10, yTotal, 230, 30, 6).fill(C.navy);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF').text('TOTAL', xTot, yTotal + 10, { width: 100 });
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.yellow).text(cop(cot.total), xTot + 90, yTotal + 8.5, { width: 120, align: 'right' });
    doc.y = yTotal + 46;

    // ------------------------------------------------------------- Solución técnica
    const sol = proyecto.solucion_tecnica;
    const seccion = (titulo: string) => {
      asegurar(60);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.turquoise).text(titulo.toUpperCase(), izq, doc.y, { characterSpacing: 0.6 });
      doc.moveDown(0.4);
    };
    if (sol) {
      seccion('Solución técnica propuesta');
      doc.font('Helvetica-Bold').fontSize(10).fillColor(C.navy).text(sol.nombre_sistema, izq, doc.y, { width: ancho });
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(C.muted)
        .text(`Aplicación: ${METODO[sol.metodo_aplicacion] || sol.metodo_aplicacion}   ·   Garantía: ${sol.garantia_anos} ${sol.garantia_anos === 1 ? 'año' : 'años'}`);
      doc.moveDown(0.4);
      sol.capas.forEach((capa, i) => {
        asegurar(16);
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(C.text)
          .text(`${i + 1}. ${capitalizar(capa.tipo)}: `, izq + 6, doc.y, { continued: true, width: ancho - 6 })
          .font('Helvetica')
          .text(`${capa.producto} · ${capa.manos} ${capa.manos === 1 ? 'mano' : 'manos'} · ${capa.espesor_micrones} µm`);
      });
      if (sol.preparacion_superficie) {
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(8.5).fillColor(C.muted).text(`Preparación: ${sol.preparacion_superficie}`, izq + 6, doc.y, { width: ancho - 6 });
      }
      doc.moveDown(1);
    }

    // ------------------------------------------------------------- Condiciones
    seccion('Condiciones');
    const condiciones = [
      `Validez de la oferta: ${cot.validez_dias} días (hasta el ${fecha(vence)}).`,
      `Tiempo de entrega y ejecución estimado: ${cot.tiempo_entrega_dias} días a partir de la aprobación.`,
      cot.condiciones_pago ? `Forma de pago: ${cot.condiciones_pago}` : null,
      'Valores en pesos colombianos (COP) con IVA incluido en el total.',
      cot.observaciones ? `Observaciones: ${cot.observaciones}` : null,
    ].filter(Boolean) as string[];
    for (const linea of condiciones) {
      asegurar(14);
      doc.font('Helvetica').fontSize(8.5).fillColor(C.text).text(`•  ${linea}`, izq + 6, doc.y, { width: ancho - 6 });
      doc.moveDown(0.2);
    }

    // ------------------------------------------------------------- Cómo aprobar
    asegurar(52);
    doc.moveDown(0.8);
    const yAprobar = doc.y;
    doc.roundedRect(izq, yAprobar, ancho, 40, 8).fill('#E6F7FA');
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(C.navy)
      .text('¿Cómo aprobarla?', izq + 14, yAprobar + 8)
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(C.text)
      .text(`Ingresa a tu cuenta en ${config.appUrl.replace(/^https?:\/\//, '')} › Proyectos › ${proyecto.codigo} y pulsa "Aprobar".`, izq + 14, yAprobar + 21, {
        width: ancho - 28,
        link: `${config.appUrl}/#/proyectos/${proyecto.id}`,
      });

    // ------------------------------------------------------------- Pie de página
    const paginas = doc.bufferedPageRange();
    for (let i = 0; i < paginas.count; i++) {
      doc.switchToPage(paginas.start + i);
      // El pie va dentro del margen inferior: se libera el margen para que no cree otra página
      doc.page.margins.bottom = 0;
      const y = doc.page.height - 38;
      doc.moveTo(izq, y - 6).lineTo(der, y - 6).lineWidth(0.5).stroke(C.surface);
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(C.muted)
        .text(`COLORLINK · Cotización ${cot.codigo} · Proyecto ${proyecto.codigo}`, izq, y, { width: ancho / 2, lineBreak: false });
      doc.text(`Página ${i + 1} de ${paginas.count}`, izq + ancho / 2, y, { width: ancho / 2, align: 'right', lineBreak: false });
    }
    doc.end();
  });
}
