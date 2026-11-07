-- ==============================================================================
-- COLORLINK · Esquema de base de datos (Supabase / PostgreSQL)
--
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run.
-- Es idempotente: puede ejecutarse de nuevo sin duplicar objetos.
--
-- Modelo de seguridad:
--   * El navegador solo usa Supabase Auth (sesión) y lee el catálogo público.
--   * Toda escritura pasa por el backend (server.ts) con la service_role key,
--     que valida el rol del usuario antes de tocar la base de datos.
--   * RLS está activo en todas las tablas; sin políticas = sin acceso directo.
-- ==============================================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------------------
-- Utilidades
-- ------------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ------------------------------------------------------------------------------
-- PERFILES (1:1 con auth.users) · el rol solo lo cambia un administrador
-- ------------------------------------------------------------------------------
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nombre_completo text not null default '',
  telefono text,
  empresa text,
  documento text,
  ciudad text,
  direccion text,
  cargo text,
  rol text not null default 'cliente'
    check (rol in ('cliente', 'tecnico', 'comercial', 'operaciones', 'administrador')),
  activo boolean not null default true,
  bienvenida_enviada boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_perfiles_updated on public.perfiles;
create trigger trg_perfiles_updated before update on public.perfiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------------------
-- CLIENTES (CRM) · puede existir sin cuenta; se vincula al registrarse
-- ------------------------------------------------------------------------------
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.perfiles(id) on delete set null,
  tipo_cliente text not null default 'PERSONA_NATURAL'
    check (tipo_cliente in ('PERSONA_NATURAL', 'EMPRESA', 'COPROPIEDAD', 'ENTIDAD')),
  nombre text not null,
  empresa text,
  documento text,
  telefono text not null,
  correo text not null,
  ciudad text,
  canal_entrada text not null default 'WEB'
    check (canal_entrada in ('WEB', 'WHATSAPP', 'REFERIDO', 'COMERCIAL', 'FERIA')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists clientes_correo_unq on public.clientes (lower(correo));
create index if not exists clientes_usuario_idx on public.clientes (usuario_id);
drop trigger if exists trg_clientes_updated on public.clientes;
create trigger trg_clientes_updated before update on public.clientes
  for each row execute function public.set_updated_at();

-- Crea el perfil al registrarse y vincula el cliente existente con el mismo correo
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, email, nombre_completo, telefono, empresa)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'nombre_completo', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'telefono', ''),
    nullif(new.raw_user_meta_data->>'empresa', '')
  )
  on conflict (id) do nothing;

  update public.clientes
     set usuario_id = new.id
   where lower(correo) = lower(new.email) and usuario_id is null;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- PROYECTOS y su expediente
-- ------------------------------------------------------------------------------
create sequence if not exists public.proyectos_codigo_seq;

create table if not exists public.proyectos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique
    default ('CLK-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.proyectos_codigo_seq')::text, 4, '0')),
  nombre text not null,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  creado_por uuid references public.perfiles(id) on delete set null,
  tecnico_id uuid references public.perfiles(id) on delete set null,
  comercial_id uuid references public.perfiles(id) on delete set null,
  ciudad text not null,
  direccion text,
  tipo_proyecto text not null default 'RESIDENCIAL'
    check (tipo_proyecto in ('RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL', 'INFRAESTRUCTURA', 'HOSPITALARIO')),
  fecha_requerida date,
  estado text not null default 'RECIBIDO'
    check (estado in ('BORRADOR', 'RECIBIDO', 'EN_ANALISIS', 'VALIDACION_TECNICA', 'SOLUCION_GENERADA',
                      'COTIZACION', 'APROBADO', 'ABASTECIMIENTO', 'SERVICIO_PROGRAMADO', 'EN_EJECUCION',
                      'CALIDAD', 'CERRADO', 'CANCELADO')),
  prioridad text not null default 'NORMAL' check (prioridad in ('NORMAL', 'ALTA', 'URGENTE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists proyectos_cliente_idx on public.proyectos (cliente_id);
create index if not exists proyectos_estado_idx on public.proyectos (estado);
drop trigger if exists trg_proyectos_updated on public.proyectos;
create trigger trg_proyectos_updated before update on public.proyectos
  for each row execute function public.set_updated_at();

create table if not exists public.areas_proyecto (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  nombre text not null,
  tipo_superficie text not null,
  area_m2 numeric(10, 2) not null check (area_m2 > 0),
  unidad_medida text not null default 'm2',
  ambiente text not null default 'RESIDENCIAL',
  ubicacion text not null default 'INTERIOR' check (ubicacion in ('INTERIOR', 'EXTERIOR', 'MIXTO')),
  color_actual text,
  color_requerido text,
  humedad text not null default 'BAJA' check (humedad in ('BAJA', 'MEDIA', 'ALTA')),
  fisuras boolean not null default false,
  tipo_fisura text,
  desgaste text not null default 'LEVE' check (desgaste in ('NINGUNO', 'LEVE', 'MODERADO', 'AVANZADO')),
  desprendimiento boolean not null default false,
  estado_general text,
  descripcion_problema text,
  created_at timestamptz not null default now()
);
create index if not exists areas_proyecto_idx on public.areas_proyecto (proyecto_id);

create table if not exists public.evidencias (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  area_id uuid references public.areas_proyecto(id) on delete set null,
  storage_path text not null,
  nombre_archivo text not null,
  tamano_bytes bigint,
  mime_type text,
  descripcion text,
  etiqueta_patologia text,
  severidad_visual text,
  subido_por uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists evidencias_proyecto_idx on public.evidencias (proyecto_id);

create table if not exists public.diagnosticos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null unique references public.proyectos(id) on delete cascade,
  complejidad text not null default 'MEDIA' check (complejidad in ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
  severidad text not null default 'MODERADO' check (severidad in ('LEVE', 'MODERADO', 'SEVERO', 'CRITICO')),
  patologias jsonb not null default '[]'::jsonb,
  validacion_tecnica_requerida boolean not null default true,
  recomendacion_preliminar text not null,
  preparacion_superficie_recomendada text not null,
  observaciones_tecnicas text,
  norma_aplicable text,
  sistema_sugerido jsonb,
  origen_motor text not null default 'MOTOR_REGLAS'
    check (origen_motor in ('GEMINI', 'MOTOR_REGLAS', 'TECNICO')),
  generado_por uuid references public.perfiles(id) on delete set null,
  validado_por uuid references public.perfiles(id) on delete set null,
  fecha_validacion timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_diagnosticos_updated on public.diagnosticos;
create trigger trg_diagnosticos_updated before update on public.diagnosticos
  for each row execute function public.set_updated_at();

create table if not exists public.soluciones_tecnicas (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null unique references public.proyectos(id) on delete cascade,
  tecnico_id uuid references public.perfiles(id) on delete set null,
  nombre_sistema text not null,
  descripcion_sistema text,
  preparacion_superficie text not null,
  metodo_aplicacion text not null default 'BROCHA_RODILLO'
    check (metodo_aplicacion in ('BROCHA_RODILLO', 'AIRLESS', 'ASPERSION_CONVENCIONAL', 'LLANA')),
  capas jsonb not null default '[]'::jsonb,
  garantia_anos int not null default 3 check (garantia_anos between 0 and 25),
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_soluciones_updated on public.soluciones_tecnicas;
create trigger trg_soluciones_updated before update on public.soluciones_tecnicas
  for each row execute function public.set_updated_at();

create sequence if not exists public.cotizaciones_codigo_seq;

create table if not exists public.cotizaciones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique
    default ('COT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.cotizaciones_codigo_seq')::text, 4, '0')),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  comercial_id uuid references public.perfiles(id) on delete set null,
  subtotal numeric(14, 2) not null default 0,
  descuento_porcentaje numeric(5, 2) not null default 0 check (descuento_porcentaje between 0 and 100),
  descuento_valor numeric(14, 2) not null default 0,
  impuesto_porcentaje numeric(5, 2) not null default 19,
  impuesto_valor numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  moneda text not null default 'COP',
  validez_dias int not null default 30,
  condiciones_pago text,
  tiempo_entrega_dias int not null default 15,
  observaciones text,
  estado text not null default 'BORRADOR' check (estado in ('BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA')),
  respuesta_cliente text,
  fecha_respuesta timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cotizaciones_proyecto_idx on public.cotizaciones (proyecto_id);
drop trigger if exists trg_cotizaciones_updated on public.cotizaciones;
create trigger trg_cotizaciones_updated before update on public.cotizaciones
  for each row execute function public.set_updated_at();

create table if not exists public.cotizacion_items (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references public.cotizaciones(id) on delete cascade,
  orden int not null default 0,
  categoria text not null check (categoria in ('MATERIAL', 'MANO_OBRA', 'EQUIPO', 'LOGISTICA', 'PREPARACION')),
  descripcion text not null,
  unidad text not null,
  cantidad numeric(12, 2) not null check (cantidad >= 0),
  precio_unitario numeric(14, 2) not null check (precio_unitario >= 0),
  subtotal numeric(14, 2) not null
);
create index if not exists cotizacion_items_idx on public.cotizacion_items (cotizacion_id);

create table if not exists public.consentimientos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  autorizacion_datos boolean not null,
  autorizacion_uso_tecnico boolean not null,
  origen_canal text not null default 'PORTAL_WEB',
  ip_registro text,
  user_agent text,
  declaracion_texto text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.actividades (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  usuario_id uuid references public.perfiles(id) on delete set null,
  usuario_nombre text not null,
  usuario_rol text not null,
  tipo_actividad text not null,
  titulo text not null,
  descripcion text,
  estado_anterior text,
  estado_nuevo text,
  created_at timestamptz not null default now()
);
create index if not exists actividades_proyecto_idx on public.actividades (proyecto_id, created_at desc);

-- ------------------------------------------------------------------------------
-- TIENDA: productos, carrito, pedidos, inventario, favoritos
-- ------------------------------------------------------------------------------
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  slug text not null unique,
  nombre text not null,
  descripcion text not null default '',
  categoria text not null
    check (categoria in ('INTERIOR', 'EXTERIOR', 'HUMEDAD', 'FISURAS', 'PREPARACION', 'HERRAMIENTAS', 'DECORATIVOS')),
  presentacion text not null default 'Galón (3,78 L)',
  unidad text not null default 'UNIDAD',
  precio numeric(14, 2) not null check (precio >= 0),
  precio_anterior numeric(14, 2),
  costo numeric(14, 2) not null default 0,
  stock numeric(12, 2) not null default 0 check (stock >= 0),
  stock_minimo numeric(12, 2) not null default 5,
  color_hex text,
  acabado text,
  rendimiento_m2 numeric(8, 2),
  imagen_url text,
  ubicacion_bodega text,
  activo boolean not null default true,
  destacado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists productos_categoria_idx on public.productos (categoria) where activo;
drop trigger if exists trg_productos_updated on public.productos;
create trigger trg_productos_updated before update on public.productos
  for each row execute function public.set_updated_at();

create table if not exists public.carrito_items (
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade,
  cantidad int not null check (cantidad between 1 and 999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (usuario_id, producto_id)
);
drop trigger if exists trg_carrito_updated on public.carrito_items;
create trigger trg_carrito_updated before update on public.carrito_items
  for each row execute function public.set_updated_at();

create sequence if not exists public.pedidos_codigo_seq;

create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique
    default ('PED-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.pedidos_codigo_seq')::text, 5, '0')),
  usuario_id uuid references public.perfiles(id) on delete set null,
  estado text not null default 'PENDIENTE'
    check (estado in ('PENDIENTE', 'CONFIRMADO', 'PREPARANDO', 'ENVIADO', 'ENTREGADO', 'CANCELADO')),
  metodo_pago text not null check (metodo_pago in ('CONTRA_ENTREGA', 'TRANSFERENCIA', 'PASARELA')),
  estado_pago text not null default 'PENDIENTE' check (estado_pago in ('PENDIENTE', 'PAGADO', 'REEMBOLSADO')),
  subtotal numeric(14, 2) not null,
  costo_envio numeric(14, 2) not null default 0,
  iva_incluido numeric(14, 2) not null default 0,
  total numeric(14, 2) not null,
  nombre_contacto text not null,
  telefono text not null,
  correo text not null,
  ciudad text not null,
  direccion text not null,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pedidos_usuario_idx on public.pedidos (usuario_id, created_at desc);
drop trigger if exists trg_pedidos_updated on public.pedidos;
create trigger trg_pedidos_updated before update on public.pedidos
  for each row execute function public.set_updated_at();

create table if not exists public.pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  sku text not null,
  nombre text not null,
  cantidad int not null check (cantidad > 0),
  precio_unitario numeric(14, 2) not null,
  subtotal numeric(14, 2) not null
);
create index if not exists pedido_items_idx on public.pedido_items (pedido_id);

create table if not exists public.movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete cascade,
  tipo text not null check (tipo in ('ENTRADA', 'SALIDA', 'AJUSTE')),
  cantidad numeric(12, 2) not null,
  stock_resultante numeric(12, 2) not null,
  motivo text not null,
  referencia text,
  usuario_id uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists movimientos_producto_idx on public.movimientos_inventario (producto_id, created_at desc);

create table if not exists public.favoritos_color (
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  color_id text not null,
  created_at timestamptz not null default now(),
  primary key (usuario_id, color_id)
);

-- ------------------------------------------------------------------------------
-- OPERACIONES: abastecimiento, servicios en campo, control de calidad
-- ------------------------------------------------------------------------------
create sequence if not exists public.abastecimientos_codigo_seq;

create table if not exists public.abastecimientos (
  id uuid primary key default gen_random_uuid(),
  codigo_orden text not null unique
    default ('OC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.abastecimientos_codigo_seq')::text, 4, '0')),
  proyecto_id uuid references public.proyectos(id) on delete set null,
  producto_id uuid not null references public.productos(id) on delete restrict,
  cantidad numeric(12, 2) not null check (cantidad > 0),
  proveedor text not null,
  fecha_estimada_llegada date,
  estado text not null default 'PENDIENTE'
    check (estado in ('PENDIENTE', 'ORDENADO', 'EN_TRANSITO', 'RECIBIDO', 'CANCELADO')),
  costo_total numeric(14, 2) not null default 0,
  creado_por uuid references public.perfiles(id) on delete set null,
  recibido_por uuid references public.perfiles(id) on delete set null,
  fecha_recepcion timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_abastecimientos_updated on public.abastecimientos;
create trigger trg_abastecimientos_updated before update on public.abastecimientos
  for each row execute function public.set_updated_at();

create table if not exists public.servicios (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  cuadrilla text not null,
  lider text not null,
  fecha_inicio date not null,
  fecha_fin_estimada date not null,
  fecha_fin_real date,
  estado text not null default 'PROGRAMADO'
    check (estado in ('PROGRAMADO', 'EN_EJECUCION', 'DETENIDO', 'FINALIZADO')),
  direccion text,
  novedades text,
  avance int not null default 0 check (avance between 0 and 100),
  creado_por uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists servicios_proyecto_idx on public.servicios (proyecto_id);
drop trigger if exists trg_servicios_updated on public.servicios;
create trigger trg_servicios_updated before update on public.servicios
  for each row execute function public.set_updated_at();

create table if not exists public.inspecciones_calidad (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  servicio_id uuid references public.servicios(id) on delete set null,
  inspector_id uuid references public.perfiles(id) on delete set null,
  inspector_nombre text not null,
  fecha date not null default current_date,
  adherencia_ok boolean not null,
  espesor_ok boolean not null,
  espesor_promedio_micrones int,
  acabado_visual text not null check (acabado_visual in ('EXCELENTE', 'BUENO', 'CON_OBSERVACIONES', 'RECHAZADO')),
  curado_ok boolean not null,
  observaciones text,
  resultado text not null check (resultado in ('APROBADO', 'REQUIERE_REPARACION')),
  created_at timestamptz not null default now()
);
create index if not exists inspecciones_proyecto_idx on public.inspecciones_calidad (proyecto_id);

-- ------------------------------------------------------------------------------
-- ASISTENTE IA y CORREOS (trazabilidad)
-- ------------------------------------------------------------------------------
create table if not exists public.conversaciones_ia (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  usuario_id uuid references public.perfiles(id) on delete set null,
  vista text,
  pregunta text not null,
  respuesta text not null,
  motor text not null,
  created_at timestamptz not null default now()
);
create index if not exists conversaciones_session_idx on public.conversaciones_ia (session_id, created_at);

create table if not exists public.correos_enviados (
  id uuid primary key default gen_random_uuid(),
  destinatario text not null,
  asunto text not null,
  plantilla text not null,
  estado text not null check (estado in ('ENVIADO', 'FALLIDO', 'OMITIDO')),
  proveedor text not null,
  referencia text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists correos_created_idx on public.correos_enviados (created_at desc);

-- ==============================================================================
-- FUNCIONES TRANSACCIONALES (llamadas por el backend con service_role)
-- ==============================================================================

-- Crea un pedido desde el carrito del usuario: valida stock con bloqueo de fila,
-- descuenta inventario, registra movimientos y vacía el carrito. Todo o nada.
create or replace function public.crear_pedido_desde_carrito(
  p_usuario uuid,
  p_metodo_pago text,
  p_nombre text,
  p_telefono text,
  p_correo text,
  p_ciudad text,
  p_direccion text,
  p_notas text,
  p_costo_envio numeric
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_pedido uuid;
  v_subtotal numeric := 0;
  v_item record;
begin
  if not exists (select 1 from carrito_items where usuario_id = p_usuario) then
    raise exception 'CARRITO_VACIO';
  end if;

  for v_item in
    select c.producto_id, c.cantidad, p.nombre, p.sku, p.precio, p.stock, p.activo
      from carrito_items c
      join productos p on p.id = c.producto_id
     where c.usuario_id = p_usuario
     order by p.id
       for update of p
  loop
    if not v_item.activo then
      raise exception 'PRODUCTO_INACTIVO:%', v_item.nombre;
    end if;
    if v_item.stock < v_item.cantidad then
      raise exception 'STOCK_INSUFICIENTE:%', v_item.nombre;
    end if;
    v_subtotal := v_subtotal + v_item.precio * v_item.cantidad;
  end loop;

  insert into pedidos (usuario_id, metodo_pago, subtotal, costo_envio, iva_incluido, total,
                       nombre_contacto, telefono, correo, ciudad, direccion, notas)
  values (p_usuario, p_metodo_pago, v_subtotal, p_costo_envio,
          round((v_subtotal + p_costo_envio) - (v_subtotal + p_costo_envio) / 1.19, 2),
          v_subtotal + p_costo_envio,
          p_nombre, p_telefono, lower(p_correo), p_ciudad, p_direccion, nullif(p_notas, ''))
  returning id into v_pedido;

  for v_item in
    select c.producto_id, c.cantidad, p.nombre, p.sku, p.precio
      from carrito_items c join productos p on p.id = c.producto_id
     where c.usuario_id = p_usuario
  loop
    insert into pedido_items (pedido_id, producto_id, sku, nombre, cantidad, precio_unitario, subtotal)
    values (v_pedido, v_item.producto_id, v_item.sku, v_item.nombre, v_item.cantidad,
            v_item.precio, v_item.precio * v_item.cantidad);

    update productos set stock = stock - v_item.cantidad where id = v_item.producto_id;

    insert into movimientos_inventario (producto_id, tipo, cantidad, stock_resultante, motivo, referencia, usuario_id)
    select v_item.producto_id, 'SALIDA', v_item.cantidad, stock, 'Venta en tienda', v_pedido::text, p_usuario
      from productos where id = v_item.producto_id;
  end loop;

  delete from carrito_items where usuario_id = p_usuario;
  return v_pedido;
end $$;

-- Cancela un pedido y devuelve el stock (solo si no fue enviado)
create or replace function public.cancelar_pedido(p_pedido uuid, p_usuario uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_estado text;
  v_item record;
begin
  select estado into v_estado from pedidos where id = p_pedido for update;
  if v_estado is null then raise exception 'PEDIDO_NO_ENCONTRADO'; end if;
  if v_estado in ('ENVIADO', 'ENTREGADO', 'CANCELADO') then
    raise exception 'PEDIDO_NO_CANCELABLE:%', v_estado;
  end if;

  for v_item in select producto_id, cantidad from pedido_items where pedido_id = p_pedido and producto_id is not null loop
    update productos set stock = stock + v_item.cantidad where id = v_item.producto_id;
    insert into movimientos_inventario (producto_id, tipo, cantidad, stock_resultante, motivo, referencia, usuario_id)
    select v_item.producto_id, 'ENTRADA', v_item.cantidad, stock, 'Devolución por cancelación de pedido', p_pedido::text, p_usuario
      from productos where id = v_item.producto_id;
  end loop;

  update pedidos set estado = 'CANCELADO' where id = p_pedido;
end $$;

-- Ajuste manual de inventario (entrada, salida o ajuste) con trazabilidad
create or replace function public.ajustar_stock(
  p_producto uuid, p_tipo text, p_cantidad numeric, p_motivo text, p_referencia text, p_usuario uuid
) returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_nuevo numeric;
begin
  if p_tipo = 'ENTRADA' then
    update productos set stock = stock + p_cantidad where id = p_producto returning stock into v_nuevo;
  elsif p_tipo = 'SALIDA' then
    update productos set stock = stock - p_cantidad where id = p_producto and stock >= p_cantidad returning stock into v_nuevo;
    if v_nuevo is null then raise exception 'STOCK_INSUFICIENTE'; end if;
  elsif p_tipo = 'AJUSTE' then
    update productos set stock = p_cantidad where id = p_producto returning stock into v_nuevo;
  else
    raise exception 'TIPO_INVALIDO';
  end if;

  if v_nuevo is null then raise exception 'PRODUCTO_NO_ENCONTRADO'; end if;

  insert into movimientos_inventario (producto_id, tipo, cantidad, stock_resultante, motivo, referencia, usuario_id)
  values (p_producto, p_tipo, p_cantidad, v_nuevo, p_motivo, p_referencia, p_usuario);
  return v_nuevo;
end $$;

-- Recibe una orden de abastecimiento y suma el stock en una sola transacción
create or replace function public.recibir_abastecimiento(p_orden uuid, p_usuario uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_orden record;
begin
  select * into v_orden from abastecimientos where id = p_orden for update;
  if v_orden is null then raise exception 'ORDEN_NO_ENCONTRADA'; end if;
  if v_orden.estado in ('RECIBIDO', 'CANCELADO') then raise exception 'ORDEN_CERRADA:%', v_orden.estado; end if;

  perform ajustar_stock(v_orden.producto_id, 'ENTRADA', v_orden.cantidad,
                        'Recepción de orden de abastecimiento', v_orden.codigo_orden, p_usuario);

  update abastecimientos
     set estado = 'RECIBIDO', recibido_por = p_usuario, fecha_recepcion = now()
   where id = p_orden;
end $$;

-- Crea un proyecto completo (cliente, proyecto, área, consentimiento, evidencias,
-- diagnóstico preliminar y actividades) en una sola transacción.
create or replace function public.crear_proyecto_completo(p jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_cliente uuid;
  v_proyecto uuid;
  v_area uuid;
  v_ev jsonb;
  c jsonb := p->'cliente';
  pr jsonb := p->'proyecto';
  a jsonb := p->'area';
  d jsonb := p->'diagnostico';
begin
  insert into clientes (usuario_id, tipo_cliente, nombre, empresa, documento, telefono, correo, ciudad, canal_entrada)
  values (
    nullif(c->>'usuario_id', '')::uuid,
    coalesce(c->>'tipo_cliente', 'PERSONA_NATURAL'),
    c->>'nombre', nullif(c->>'empresa', ''), nullif(c->>'documento', ''),
    c->>'telefono', lower(c->>'correo'), nullif(c->>'ciudad', ''),
    coalesce(c->>'canal_entrada', 'WEB')
  )
  on conflict ((lower(correo))) do update set
    nombre = excluded.nombre,
    telefono = excluded.telefono,
    empresa = coalesce(excluded.empresa, clientes.empresa),
    documento = coalesce(excluded.documento, clientes.documento),
    ciudad = coalesce(excluded.ciudad, clientes.ciudad),
    tipo_cliente = excluded.tipo_cliente,
    usuario_id = coalesce(clientes.usuario_id, excluded.usuario_id)
  returning id into v_cliente;

  insert into proyectos (nombre, cliente_id, creado_por, ciudad, direccion, tipo_proyecto, fecha_requerida, prioridad, estado)
  values (
    pr->>'nombre', v_cliente, nullif(p->>'creado_por', '')::uuid,
    pr->>'ciudad', nullif(pr->>'direccion', ''),
    coalesce(pr->>'tipo_proyecto', 'RESIDENCIAL'),
    nullif(pr->>'fecha_requerida', '')::date,
    coalesce(pr->>'prioridad', 'NORMAL'),
    'RECIBIDO'
  )
  returning id into v_proyecto;

  insert into areas_proyecto (proyecto_id, nombre, tipo_superficie, area_m2, unidad_medida, ambiente, ubicacion,
                              color_actual, color_requerido, humedad, fisuras, tipo_fisura, desgaste,
                              desprendimiento, estado_general, descripcion_problema)
  values (
    v_proyecto, a->>'nombre', a->>'tipo_superficie', (a->>'area_m2')::numeric,
    coalesce(a->>'unidad_medida', 'm2'), coalesce(a->>'ambiente', 'RESIDENCIAL'),
    coalesce(a->>'ubicacion', 'INTERIOR'), nullif(a->>'color_actual', ''), nullif(a->>'color_requerido', ''),
    coalesce(a->>'humedad', 'BAJA'), coalesce((a->>'fisuras')::boolean, false), nullif(a->>'tipo_fisura', ''),
    coalesce(a->>'desgaste', 'LEVE'), coalesce((a->>'desprendimiento')::boolean, false),
    nullif(a->>'estado_general', ''), nullif(a->>'descripcion_problema', '')
  )
  returning id into v_area;

  insert into consentimientos (proyecto_id, cliente_id, autorizacion_datos, autorizacion_uso_tecnico,
                               origen_canal, ip_registro, user_agent, declaracion_texto)
  values (
    v_proyecto, v_cliente,
    (p->'consentimiento'->>'autorizacion_datos')::boolean,
    (p->'consentimiento'->>'autorizacion_uso_tecnico')::boolean,
    coalesce(p->'consentimiento'->>'origen_canal', 'PORTAL_WEB'),
    p->'consentimiento'->>'ip_registro', p->'consentimiento'->>'user_agent',
    p->'consentimiento'->>'declaracion_texto'
  );

  for v_ev in select * from jsonb_array_elements(coalesce(p->'evidencias', '[]'::jsonb)) loop
    insert into evidencias (proyecto_id, area_id, storage_path, nombre_archivo, tamano_bytes, mime_type, descripcion, subido_por)
    values (v_proyecto, v_area, v_ev->>'storage_path', v_ev->>'nombre_archivo',
            nullif(v_ev->>'tamano_bytes', '')::bigint, v_ev->>'mime_type', v_ev->>'descripcion',
            nullif(p->>'creado_por', '')::uuid);
  end loop;

  if d is not null then
    insert into diagnosticos (proyecto_id, complejidad, severidad, patologias, validacion_tecnica_requerida,
                              recomendacion_preliminar, preparacion_superficie_recomendada, sistema_sugerido,
                              origen_motor, generado_por)
    values (v_proyecto, d->>'complejidad', d->>'severidad', coalesce(d->'patologias', '[]'::jsonb),
            coalesce((d->>'validacion_tecnica_requerida')::boolean, true),
            d->>'recomendacion_preliminar', d->>'preparacion_superficie_recomendada',
            d->'sistema_sugerido', coalesce(d->>'origen_motor', 'MOTOR_REGLAS'), nullif(p->>'creado_por', '')::uuid);
  end if;

  insert into actividades (proyecto_id, usuario_id, usuario_nombre, usuario_rol, tipo_actividad, titulo, descripcion, estado_nuevo)
  values (v_proyecto, nullif(p->>'creado_por', '')::uuid, coalesce(p->>'creado_por_nombre', c->>'nombre'),
          coalesce(p->>'creado_por_rol', 'cliente'), 'CREACION', 'Proyecto registrado',
          format('Registro de %s m² en %s.', a->>'area_m2', pr->>'ciudad'), 'RECIBIDO');

  if d is not null then
    insert into actividades (proyecto_id, usuario_nombre, usuario_rol, tipo_actividad, titulo, descripcion)
    values (v_proyecto, 'COLORLINK IA', 'sistema', 'DIAGNOSTICO_GENERADO', 'Orientación preliminar generada',
            format('Severidad %s · complejidad %s. Pendiente de validación técnica.', d->>'severidad', d->>'complejidad'));
  end if;

  return v_proyecto;
end $$;

-- Solo el backend (service_role) puede ejecutar las funciones transaccionales
revoke all on function public.crear_pedido_desde_carrito(uuid, text, text, text, text, text, text, text, numeric) from public, anon, authenticated;
revoke all on function public.cancelar_pedido(uuid, uuid) from public, anon, authenticated;
revoke all on function public.ajustar_stock(uuid, text, numeric, text, text, uuid) from public, anon, authenticated;
revoke all on function public.recibir_abastecimiento(uuid, uuid) from public, anon, authenticated;
revoke all on function public.crear_proyecto_completo(jsonb) from public, anon, authenticated;

-- ==============================================================================
-- ROW LEVEL SECURITY
-- ==============================================================================
alter table public.perfiles enable row level security;
alter table public.clientes enable row level security;
alter table public.proyectos enable row level security;
alter table public.areas_proyecto enable row level security;
alter table public.evidencias enable row level security;
alter table public.diagnosticos enable row level security;
alter table public.soluciones_tecnicas enable row level security;
alter table public.cotizaciones enable row level security;
alter table public.cotizacion_items enable row level security;
alter table public.consentimientos enable row level security;
alter table public.actividades enable row level security;
alter table public.productos enable row level security;
alter table public.carrito_items enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_items enable row level security;
alter table public.movimientos_inventario enable row level security;
alter table public.favoritos_color enable row level security;
alter table public.abastecimientos enable row level security;
alter table public.servicios enable row level security;
alter table public.inspecciones_calidad enable row level security;
alter table public.conversaciones_ia enable row level security;
alter table public.correos_enviados enable row level security;

-- Lectura directa permitida solo para el propio perfil. El catálogo se sirve desde
-- el backend (/api/productos), que no expone costo ni ubicación en bodega.
drop policy if exists perfiles_lectura_propia on public.perfiles;
create policy perfiles_lectura_propia on public.perfiles
  for select to authenticated using (id = auth.uid());

-- ==============================================================================
-- STORAGE
-- ==============================================================================
-- evidencias: privado (el backend entrega URLs firmadas temporales)
-- productos: público (imágenes del catálogo)
insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', false), ('productos', 'productos', true)
on conflict (id) do nothing;
