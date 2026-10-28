import {
  MaterialInventario,
  Abastecimiento,
  ServicioProgramado,
  ControlCalidad,
} from '../../types';
import { supabase, isSupabaseConfigured } from '../supabase/client';

export const INITIAL_INVENTORY: MaterialInventario[] = [
  {
    id: 'mat-001',
    codigo_sku: 'EPX-PRIM-750',
    nombre: 'Primer Epóxico Tolerante a Humedad 100% Sólidos',
    categoria: 'IMPRIMANTE',
    unidad: 'GALÓN',
    stock_actual: 45,
    stock_minimo: 15,
    costo_unitario: 48,
    precio_venta: 72,
    ubicacion_bodega: 'Bodega Central - Estante A-02',
    lote: 'LT-2026-03B',
    created_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'mat-002',
    codigo_sku: 'EPX-INTER-850',
    nombre: 'Epóxico Alto Sólidos Poliamida MIO Reforzado',
    categoria: 'EPÓXICO',
    unidad: 'GALÓN',
    stock_actual: 32,
    stock_minimo: 20,
    costo_unitario: 56,
    precio_venta: 85,
    ubicacion_bodega: 'Bodega Central - Estante B-01',
    lote: 'LT-2026-04A',
    created_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'mat-003',
    codigo_sku: 'PUR-TOP-920',
    nombre: 'Poliuretano Alifático Acrílico Alto Brillo Resistencia UV',
    categoria: 'POLIURETANO',
    unidad: 'GALÓN',
    stock_actual: 18,
    stock_minimo: 25, // low stock trigger
    costo_unitario: 65,
    precio_venta: 98,
    ubicacion_bodega: 'Bodega Central - Estante C-03',
    lote: 'LT-2026-02F',
    created_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'mat-004',
    codigo_sku: 'SOLV-THIN-100',
    nombre: 'Diluyente Epóxico Grado Profesional Reductor de Viscosidad',
    categoria: 'DILUYENTE',
    unidad: 'GALÓN',
    stock_actual: 60,
    stock_minimo: 20,
    costo_unitario: 14,
    precio_venta: 24,
    ubicacion_bodega: 'Bodega Químicos - Zona Ventilada V-1',
    lote: 'LT-2026-01A',
    created_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'mat-005',
    codigo_sku: 'ABR-GRAN-200',
    nombre: 'Abrasivo Granalla de Escoria de Cobre Mesh 20/40',
    categoria: 'ABRASIVO',
    unidad: 'BULTO',
    stock_actual: 80,
    stock_minimo: 30,
    costo_unitario: 18,
    precio_venta: 30,
    ubicacion_bodega: 'Patio Granallado - Pallet 4',
    lote: 'GR-2026-88',
    created_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'mat-006',
    codigo_sku: 'ACR-EXT-400',
    nombre: 'Recubrimiento Acrílico Elastómerico Impermeabilizante',
    categoria: 'ACRÍLICO',
    unidad: 'CUÑETE',
    stock_actual: 12,
    stock_minimo: 10,
    costo_unitario: 95,
    precio_venta: 145,
    ubicacion_bodega: 'Bodega Central - Estante D-02',
    lote: 'EL-2026-11C',
    created_at: '2026-01-10T00:00:00Z',
  },
];

class InventoryService {
  private inventory: MaterialInventario[] = [...INITIAL_INVENTORY];
  private abastecimientos: Abastecimiento[] = [];
  private servicios: ServicioProgramado[] = [];
  private inspecciones: ControlCalidad[] = [];

  constructor() {
    this.init();
  }

  private init() {
    const savedInv = localStorage.getItem('colorlink_inventory');
    if (savedInv) {
      try {
        this.inventory = JSON.parse(savedInv);
      } catch {
        this.inventory = [...INITIAL_INVENTORY];
      }
    }
  }

  public getInventory(): MaterialInventario[] {
    return this.inventory;
  }

  public updateStock(id: string, delta: number) {
    this.inventory = this.inventory.map((item) =>
      item.id === id ? { ...item, stock_actual: Math.max(0, item.stock_actual + delta) } : item
    );
    localStorage.setItem('colorlink_inventory', JSON.stringify(this.inventory));
  }

  public getLowStockItems(): MaterialInventario[] {
    return this.inventory.filter((item) => item.stock_actual <= item.stock_minimo);
  }

  public createAbastecimiento(order: Partial<Abastecimiento>): Abastecimiento {
    const newOrder: Abastecimiento = {
      id: `ord-${Date.now()}`,
      codigo_orden: `ORD-${Date.now().toString().slice(-6)}`,
      proyecto_id: order.proyecto_id || 'general',
      material_id: order.material_id || 'mat-001',
      material_nombre: order.material_nombre || 'Material de recubrimiento',
      cantidad_requerida: order.cantidad_requerida || 10,
      unidad: order.unidad || 'GALÓN',
      proveedor: order.proveedor || 'Químicos y Recubrimientos Industriales S.A.',
      fecha_solicitud: new Date().toISOString().split('T')[0],
      fecha_estimada_llegada: order.fecha_estimada_llegada || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      estado: 'PENDIENTE',
      costo_total: order.costo_total || 500,
      created_at: new Date().toISOString(),
    };

    this.abastecimientos.unshift(newOrder);
    return newOrder;
  }

  public getAbastecimientos(proyectoId?: string): Abastecimiento[] {
    if (proyectoId) {
      return this.abastecimientos.filter((a) => a.proyecto_id === proyectoId);
    }
    return this.abastecimientos;
  }

  public updateAbastecimientoStatus(id: string, estado: Abastecimiento['estado']) {
    this.abastecimientos = this.abastecimientos.map((a) =>
      a.id === id ? { ...a, estado } : a
    );
  }

  public scheduleService(servicio: Partial<ServicioProgramado>): ServicioProgramado {
    const record: ServicioProgramado = {
      id: `srv-${Date.now()}`,
      proyecto_id: servicio.proyecto_id!,
      cuadrilla_asignada: servicio.cuadrilla_asignada || 'Cuadrilla Alfa - Especialistas Airless',
      lider_tecnico: servicio.lider_tecnico || 'Téc. Marco Aurelio Vargas',
      fecha_inicio: servicio.fecha_inicio || new Date().toISOString().split('T')[0],
      fecha_fin_estimada: servicio.fecha_fin_estimada || new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
      estado: servicio.estado || 'PROGRAMADO',
      direccion_ejecucion: servicio.direccion_ejecucion || 'Planta Principal',
      avance_porcentaje: servicio.avance_porcentaje || 0,
      novedades_campo: servicio.novedades_campo || 'Sin novedades climáticas o mecánicas reportadas.',
      created_at: new Date().toISOString(),
    };
    this.servicios.unshift(record);
    return record;
  }

  public getServices(proyectoId?: string): ServicioProgramado[] {
    if (proyectoId) {
      return this.servicios.filter((s) => s.proyecto_id === proyectoId);
    }
    return this.servicios;
  }

  public recordQualityCheck(check: Partial<ControlCalidad>): ControlCalidad {
    const record: ControlCalidad = {
      id: `qc-${Date.now()}`,
      proyecto_id: check.proyecto_id!,
      inspector: check.inspector || 'Ing. Laura Marcela Gómez (NACE Inspector #4218)',
      fecha_inspeccion: check.fecha_inspeccion || new Date().toISOString().split('T')[0],
      prueba_adherencia_cruzada: check.prueba_adherencia_cruzada ?? true,
      medicion_espesor_dft_ok: check.medicion_espesor_dft_ok ?? true,
      espesor_promedio_micrones: check.espesor_promedio_micrones || 250,
      inspeccion_visual_acabado: check.inspeccion_visual_acabado || 'EXCELENTE',
      curado_adecuado: check.curado_adecuado ?? true,
      observaciones: check.observaciones || 'Acabado uniforme libre de chorreaduras, poros (pinholes) u ojos de pescado.',
      estado: check.estado || 'APROBADO',
      created_at: new Date().toISOString(),
    };
    this.inspecciones.unshift(record);
    return record;
  }

  public getQualityChecks(proyectoId?: string): ControlCalidad[] {
    if (proyectoId) {
      return this.inspecciones.filter((q) => q.proyecto_id === proyectoId);
    }
    return this.inspecciones;
  }
}

export const inventoryService = new InventoryService();
