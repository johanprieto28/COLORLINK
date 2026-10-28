-- ==============================================================================
-- COLORLINK - Ecosistema Inteligente de Pintura y Recubrimientos
-- Esquema DDL de Base de Datos PostgreSQL para Supabase
-- Incluye: 19 tablas, UUIDs, Foreign Keys, Triggers updated_at y Políticas RLS
-- ==============================================================================

-- 1. EXTENSIÓN PARA GENERACIÓN DE UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. FUNCIÓN PARA ACTUALIZACIÓN AUTOMÁTICA DE TIMESTAMP
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ------------------------------------------------------------------------------
-- TABLA 1: ROLES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.roles (id, nombre, descripcion) VALUES
('cliente', 'Cliente', 'Usuario final que registra necesidades y consulta proyectos'),
('tecnico', 'Técnico Especialista', 'Ingeniero o técnico evaluador de condiciones y soluciones'),
('comercial', 'Ejecutivo Comercial', 'Gestor de cotizaciones y propuestas económicas'),
('operaciones', 'Operaciones y Logística', 'Coordinador de abastecimiento, inventario y aplicación'),
('administrador', 'Administrador General', 'Control total de la plataforma y métricas')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- TABLA 2: USUARIOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    nombre_completo VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    empresa VARCHAR(255),
    documento_nit VARCHAR(50),
    rol VARCHAR(50) NOT NULL REFERENCES public.roles(id) DEFAULT 'cliente',
    cargo VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ------------------------------------------------------------------------------
-- TABLA 3: CLIENTES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    nombre VARCHAR(255) NOT NULL,
    empresa VARCHAR(255),
    documento_nit VARCHAR(50),
    telefono VARCHAR(50) NOT NULL,
    correo VARCHAR(255) NOT NULL,
    canal_entrada VARCHAR(50) DEFAULT 'WEB',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ------------------------------------------------------------------------------
-- TABLA 4: PROYECTOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.proyectos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
    tecnico_asignado_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    comercial_asignado_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    ciudad VARCHAR(100) NOT NULL,
    direccion TEXT NOT NULL,
    tipo_proyecto VARCHAR(50) NOT NULL DEFAULT 'INDUSTRIAL',
    fecha_requerida DATE NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'RECIBIDO',
    prioridad VARCHAR(20) DEFAULT 'NORMAL',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_estado CHECK (estado IN (
        'BORRADOR', 'RECIBIDO', 'EN_ANALISIS', 'VALIDACION_TECNICA',
        'SOLUCION_GENERADA', 'COTIZACION', 'APROBADO', 'ABASTECIMIENTO',
        'SERVICIO_PROGRAMADO', 'EN_EJECUCION', 'CALIDAD', 'CERRADO', 'CANCELADO'
    ))
);

CREATE TRIGGER update_proyectos_updated_at BEFORE UPDATE ON public.proyectos
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ------------------------------------------------------------------------------
-- TABLA 5: AREAS_PROYECTO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.areas_proyecto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    tipo_superficie VARCHAR(100) NOT NULL,
    area_m2 NUMERIC(10, 2) NOT NULL,
    unidad_medida VARCHAR(20) DEFAULT 'm2',
    ambiente VARCHAR(50) NOT NULL,
    ubicacion VARCHAR(50) NOT NULL,
    color_actual VARCHAR(100),
    color_requerido VARCHAR(100),
    humedad VARCHAR(20) DEFAULT 'BAJA',
    fisuras BOOLEAN DEFAULT FALSE,
    tipo_fisura VARCHAR(50),
    desgaste VARCHAR(20) DEFAULT 'LEVE',
    desprendimiento BOOLEAN DEFAULT FALSE,
    estado_general TEXT,
    descripcion_problema TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLA 6: MATERIALES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.materiales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_sku VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    costo_unitario NUMERIC(12, 2) NOT NULL,
    precio_venta NUMERIC(12, 2) NOT NULL,
    solidos_volumen NUMERIC(5, 2),
    rendimiento_teorico NUMERIC(8, 2),
    ficha_tecnica_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLA 7: AREA_MATERIAL (Relación M:N)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.area_material (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id UUID NOT NULL REFERENCES public.areas_proyecto(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materiales(id) ON DELETE RESTRICT,
    cantidad_calculada NUMERIC(10, 2) NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLA 8: EVIDENCIAS (Metadatos de archivos en Supabase Storage)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evidencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
    area_id UUID REFERENCES public.areas_proyecto(id) ON DELETE SET NULL,
    archivo_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    tamano_bytes BIGINT,
    mime_type VARCHAR(100),
    descripcion TEXT,
    etiqueta_patologia VARCHAR(100),
    severidad_visual VARCHAR(20),
    fecha_captura TIMESTAMPTZ DEFAULT NOW(),
    creado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLA 9: DIAGNOSTICOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.diagnosticos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID NOT NULL UNIQUE REFERENCES public.proyectos(id) ON DELETE CASCADE,
    tecnico_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    complejidad VARCHAR(20) NOT NULL DEFAULT 'MEDIA',
    severidad VARCHAR(20) NOT NULL DEFAULT 'MODERADO',
    humedad_detectada VARCHAR(20),
    fisuras_presentes BOOLEAN DEFAULT FALSE,
    desgaste_detectado VARCHAR(20),
    desprendimiento_presente BOOLEAN DEFAULT FALSE,
    patologias JSONB DEFAULT '[]'::jsonb,
    validacion_tecnica_requerida BOOLEAN DEFAULT TRUE,
    recomendacion_preliminar TEXT NOT NULL,
    observaciones_tecnicas TEXT,
    preparacion_superficie_recomendada TEXT NOT NULL,
    norma_aplicable VARCHAR(100),
    origen_motor VARCHAR(50) DEFAULT 'COLORLINK_IA',
    validado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    fecha_validacion TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLA 10: SOLUCIONES_TECNICAS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.soluciones_tecnicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
    diagnostico_id UUID REFERENCES public.diagnosticos(id) ON DELETE SET NULL,
    tecnico_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    nombre_sistema VARCHAR(255) NOT NULL,
    descripcion_sistema TEXT NOT NULL,
    preparacion_superficie TEXT NOT NULL,
    metodo_aplicacion VARCHAR(50) DEFAULT 'AIRLESS',
    capas JSONB NOT NULL DEFAULT '[]'::jsonb,
    garantia_anos INT DEFAULT 5,
    resistencia_quimica VARCHAR(100),
    resistencia_uv VARCHAR(100),
    resistencia_abrasion VARCHAR(100),
    observaciones TEXT,
    aprobado_cliente BOOLEAN DEFAULT FALSE,
    fecha_aprobacion TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLA 11: COTIZACIONES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cotizaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
    comercial_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    solucion_tecnica_id UUID REFERENCES public.soluciones_tecnicas(id) ON DELETE SET NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    descuento_porcentaje NUMERIC(5, 2) DEFAULT 0,
    descuento_valor NUMERIC(12, 2) DEFAULT 0,
    impuesto_porcentaje NUMERIC(5, 2) DEFAULT 19,
    impuesto_valor NUMERIC(12, 2) DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    moneda VARCHAR(10) DEFAULT 'USD',
    validez_dias INT DEFAULT 30,
    condiciones_pago TEXT,
    tiempo_entrega_dias INT DEFAULT 15,
    estado VARCHAR(50) DEFAULT 'BORRADOR',
    observaciones_comerciales TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLA 12: DETALLE_COTIZACION
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.detalle_cotizacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotizacion_id UUID NOT NULL REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
    categoria VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    cantidad NUMERIC(10, 2) NOT NULL,
    precio_unitario NUMERIC(12, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLA 13: INVENTARIO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES public.materiales(id) ON DELETE CASCADE,
    codigo_sku VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    stock_actual NUMERIC(10, 2) NOT NULL DEFAULT 0,
    stock_minimo NUMERIC(10, 2) NOT NULL DEFAULT 5,
    costo_unitario NUMERIC(12, 2) NOT NULL,
    precio_venta NUMERIC(12, 2) NOT NULL,
    ubicacion_bodega VARCHAR(100),
    lote VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLA 14: ABASTECIMIENTOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.abastecimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_orden VARCHAR(50) NOT NULL UNIQUE,
    proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
    material_id UUID REFERENCES public.materiales(id) ON DELETE RESTRICT,
    material_nombre VARCHAR(255) NOT NULL,
    cantidad_requerida NUMERIC(10, 2) NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    proveedor VARCHAR(255) NOT NULL,
    fecha_solicitud DATE DEFAULT CURRENT_DATE,
    fecha_estimada_llegada DATE,
    estado VARCHAR(50) DEFAULT 'PENDIENTE',
    costo_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    recibido_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLA 15: SERVICIOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.servicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
    cuadrilla_asignada VARCHAR(100) NOT NULL,
    lider_tecnico VARCHAR(100) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin_estimada DATE NOT NULL,
    fecha_fin_real DATE,
    estado VARCHAR(50) DEFAULT 'PROGRAMADO',
    direccion_ejecucion TEXT NOT NULL,
    novedades_campo TEXT,
    avance_porcentaje INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLA 16: CALIDAD
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calidad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
    servicio_id UUID REFERENCES public.servicios(id) ON DELETE SET NULL,
    inspector VARCHAR(100) NOT NULL,
    fecha_inspeccion DATE DEFAULT CURRENT_DATE,
    prueba_adherencia_cruzada BOOLEAN DEFAULT TRUE,
    medicion_espesor_dft_ok BOOLEAN DEFAULT TRUE,
    espesor_promedio_micrones INT,
    inspeccion_visual_acabado VARCHAR(50) DEFAULT 'EXCELENTE',
    curado_adecuado BOOLEAN DEFAULT TRUE,
    observaciones TEXT,
    estado VARCHAR(50) DEFAULT 'APROBADO',
    firma_inspector TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLA 17: ACTIVIDADES (Línea de tiempo de seguimiento)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.actividades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    usuario_nombre VARCHAR(100) NOT NULL,
    usuario_rol VARCHAR(50) NOT NULL,
    tipo_actividad VARCHAR(50) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLA 18: CONSENTIMIENTOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consentimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    autorizacion_tratamiento_datos BOOLEAN NOT NULL DEFAULT TRUE,
    autorizacion_uso_tecnico_fotos BOOLEAN NOT NULL DEFAULT TRUE,
    origen_canal VARCHAR(50) NOT NULL,
    ip_registro VARCHAR(50),
    fecha_aceptacion TIMESTAMPTZ DEFAULT NOW(),
    declaracion_texto TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLA 19: AUDITORIA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabla_afectada VARCHAR(100) NOT NULL,
    registro_id UUID NOT NULL,
    accion VARCHAR(20) NOT NULL,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    usuario_email VARCHAR(255),
    detalles JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- POLÍTICAS DE SEGURIDAD A NIVEL DE FILA (ROW LEVEL SECURITY - RLS)
-- ==============================================================================

-- Habilitar RLS en todas las tablas clave
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas_proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosticos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soluciones_tecnicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_cotizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abastecimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consentimientos ENABLE ROW LEVEL SECURITY;

-- 1. Helper function para obtener el rol del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR AS $$
    SELECT rol FROM public.usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Políticas para PROYECTOS:
-- Administrador: Acceso total
CREATE POLICY "admin_all_proyectos" ON public.proyectos
    FOR ALL TO authenticated
    USING (get_user_role() = 'administrador');

-- Cliente: Solo puede ver sus propios proyectos
CREATE POLICY "cliente_own_proyectos" ON public.proyectos
    FOR SELECT TO authenticated
    USING (
        cliente_id IN (SELECT id FROM public.clientes WHERE usuario_id = auth.uid())
        OR get_user_role() = 'cliente'
    );

-- Técnico: Proyectos asignados o en análisis/validación
CREATE POLICY "tecnico_assigned_proyectos" ON public.proyectos
    FOR ALL TO authenticated
    USING (
        get_user_role() = 'tecnico'
        AND (tecnico_asignado_id = auth.uid() OR estado IN ('RECIBIDO', 'EN_ANALISIS', 'VALIDACION_TECNICA'))
    );

-- Comercial: Proyectos en fase de cotización o asignados
CREATE POLICY "comercial_proyectos" ON public.proyectos
    FOR ALL TO authenticated
    USING (
        get_user_role() = 'comercial'
        AND (comercial_asignado_id = auth.uid() OR estado IN ('SOLUCION_GENERADA', 'COTIZACION', 'APROBADO'))
    );

-- Operaciones: Proyectos aprobados para ejecución y servicio
CREATE POLICY "operaciones_proyectos" ON public.proyectos
    FOR ALL TO authenticated
    USING (
        get_user_role() = 'operaciones'
        AND estado IN ('APROBADO', 'ABASTECIMIENTO', 'SERVICIO_PROGRAMADO', 'EN_EJECUCION', 'CALIDAD', 'CERRADO')
    );

-- 3. Políticas para EVIDENCIAS:
CREATE POLICY "evidencias_select_policy" ON public.evidencias
    FOR SELECT TO authenticated
    USING (
        get_user_role() IN ('administrador', 'tecnico', 'comercial', 'operaciones')
        OR proyecto_id IN (
            SELECT p.id FROM public.proyectos p
            JOIN public.clientes c ON p.cliente_id = c.id
            WHERE c.usuario_id = auth.uid()
        )
    );

CREATE POLICY "evidencias_insert_policy" ON public.evidencias
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Políticas para DIAGNÓSTICOS y SOLUCIONES TÉCNICAS:
CREATE POLICY "diagnosticos_view_policy" ON public.diagnosticos
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "diagnosticos_modify_policy" ON public.diagnosticos
    FOR ALL TO authenticated
    USING (get_user_role() IN ('administrador', 'tecnico'));

-- 5. Políticas para COTIZACIONES:
CREATE POLICY "cotizaciones_view_policy" ON public.cotizaciones
    FOR SELECT TO authenticated
    USING (
        get_user_role() IN ('administrador', 'comercial')
        OR (get_user_role() = 'cliente' AND estado IN ('ENVIADA', 'APROBADA'))
    );

CREATE POLICY "cotizaciones_modify_policy" ON public.cotizaciones
    FOR ALL TO authenticated
    USING (get_user_role() IN ('administrador', 'comercial'));

-- 6. Configuración de Storage Bucket 'evidencias'
-- En Supabase Dashboard > Storage > Create bucket 'evidencias' (Public or Authenticated)
