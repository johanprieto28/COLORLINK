import { Cotizacion, ItemCotizacion, SolucionTecnica } from '../../types';

export class QuoteService {
  /**
   * Generates a realistic, itemized quotation from a technical solution and project area
   */
  public generateQuoteFromSolution(
    proyectoId: string,
    codigoProyecto: string,
    areaM2: number,
    solucion?: SolucionTecnica,
    comercialId: string = 'usr-com-003'
  ): Cotizacion {
    const quoteCode = `COT-${codigoProyecto.replace('CLK-', '')}-${Date.now().toString().slice(-4)}`;
    const items: ItemCotizacion[] = [];

    // 1. Surface Preparation Item
    const prepCostPerM2 = 4.5;
    items.push({
      id: `item-prep-${Date.now()}`,
      categoria: 'PREPARACION',
      descripcion: `Preparación de superficie según especificación técnica (${solucion?.preparacion_superficie.slice(0, 80) || 'Limpieza y acondicionamiento mecánico'}).`,
      unidad: 'M2',
      cantidad: areaM2,
      precio_unitario: prepCostPerM2,
      subtotal: Math.round(areaM2 * prepCostPerM2 * 100) / 100,
    });

    // 2. Coating Layers Materials
    if (solucion?.capas && solucion.capas.length > 0) {
      solucion.capas.forEach((capa, idx) => {
        // Approximate theoretical coverage: 1 gal covers ~30 m2 at 50 microns DFT
        const theoreticalGalPerM2 = capa.espesor_dft_micrones / 1500;
        const requiredGals = Math.ceil(areaM2 * theoreticalGalPerM2 * 1.2); // 20% loss factor
        const unitPrice = capa.tipo === 'IMPRIMANTE' ? 68 : capa.tipo === 'INTERMEDIO' ? 85 : 98;

        items.push({
          id: `item-mat-${idx}-${Date.now()}`,
          categoria: 'MATERIAL',
          descripcion: `Suministro de recubrimiento: ${capa.producto} (Capa ${capa.tipo} e=${capa.espesor_dft_micrones}µm).`,
          unidad: 'GALÓN',
          cantidad: requiredGals,
          precio_unitario: unitPrice,
          subtotal: requiredGals * unitPrice,
        });
      });
    } else {
      items.push({
        id: `item-mat-gen-${Date.now()}`,
        categoria: 'MATERIAL',
        descripcion: 'Sistema de recubrimiento industrial de alto desempeño (Imprimante + Acabado).',
        unidad: 'GLOBAL',
        cantidad: 1,
        precio_unitario: Math.round(areaM2 * 14 * 100) / 100,
        subtotal: Math.round(areaM2 * 14 * 100) / 100,
      });
    }

    // 3. Specialized Application Labor
    const laborPerM2 = 8.5;
    items.push({
      id: `item-labor-${Date.now()}`,
      categoria: 'MANO_OBRA',
      descripcion: 'Aplicación certificada de recubrimientos técnicos con aplicadores calificados NACE/SSPC.',
      unidad: 'M2',
      cantidad: areaM2,
      precio_unitario: laborPerM2,
      subtotal: Math.round(areaM2 * laborPerM2 * 100) / 100,
    });

    // 4. Equipment & Quality Assurance
    items.push({
      id: `item-eq-${Date.now()}`,
      categoria: 'EQUIPO',
      descripcion: 'Alquiler de equipo de aspersión Airless Graco, andamiaje certificado y kit de medición DFT.',
      unidad: 'GLOBAL',
      cantidad: 1,
      precio_unitario: 350,
      subtotal: 350,
    });

    const subtotal = items.reduce((acc, curr) => acc + curr.subtotal, 0);
    const taxRate = 19; // 19% IVA standard
    const taxValue = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = subtotal + taxValue;

    return {
      id: `quote-${Date.now()}`,
      codigo: quoteCode,
      proyecto_id: proyectoId,
      comercial_id: comercialId,
      solucion_tecnica_id: solucion?.id,
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      descuento_porcentaje: 0,
      descuento_valor: 0,
      impuesto_porcentaje: taxRate,
      impuesto_valor: taxValue,
      total: Math.round(total * 100) / 100,
      moneda: 'USD',
      validez_dias: 30,
      condiciones_pago: '50% anticipo a la orden, 50% contra entrega y certificado de calidad aprobado.',
      tiempo_entrega_dias: 12,
      estado: 'BORRADOR',
      observaciones_comerciales: 'Garantía técnica de 5 años sujeta a cumplimiento de programa de mantenimiento preventivo.',
      created_at: new Date().toISOString(),
    };
  }

  public recalculateTotals(quote: Cotizacion): Cotizacion {
    const subtotal = quote.items.reduce((acc, i) => acc + (i.cantidad * i.precio_unitario), 0);
    const discountVal = (subtotal * (quote.descuento_porcentaje || 0)) / 100;
    const taxableAmount = Math.max(0, subtotal - discountVal);
    const taxVal = (taxableAmount * (quote.impuesto_porcentaje || 0)) / 100;
    const total = taxableAmount + taxVal;

    return {
      ...quote,
      subtotal: Math.round(subtotal * 100) / 100,
      descuento_valor: Math.round(discountVal * 100) / 100,
      impuesto_valor: Math.round(taxVal * 100) / 100,
      total: Math.round(total * 100) / 100,
      updated_at: new Date().toISOString(),
    };
  }

  public async saveQuote(quote: Cotizacion): Promise<Cotizacion> {
    return quote;
  }
}

export const quoteService = new QuoteService();
