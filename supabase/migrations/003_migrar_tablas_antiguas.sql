-- ==============================================================================
-- COLORLINK · Migración OPCIONAL de las tablas creadas por la versión anterior
-- (public.cliente y public.proyecto, con ids numéricos).
--
-- Ejecutar SOLO si esas tablas existen y tienen datos que quieres conservar.
-- Copia los registros al nuevo esquema sin borrar las tablas antiguas; cuando
-- verifiques la información puedes eliminarlas manualmente.
-- ==============================================================================

do $$
begin
  if to_regclass('public.cliente') is null then
    raise notice 'No existe public.cliente: nada que migrar.';
    return;
  end if;

  insert into public.clientes (tipo_cliente, nombre, empresa, documento, telefono, correo, ciudad, canal_entrada, created_at)
  select
    case when upper(coalesce(c.tipo_cliente, '')) in ('PERSONA_NATURAL', 'EMPRESA', 'COPROPIEDAD', 'ENTIDAD')
         then upper(c.tipo_cliente) else 'PERSONA_NATURAL' end,
    coalesce(nullif(c.nombre_completo, ''), 'Cliente sin nombre'),
    nullif(c.nombre_empresa, ''),
    nullif(c.numero_documento, ''),
    coalesce(nullif(c.telefono, ''), 'Sin teléfono'),
    lower(c."correo_electrónico"),
    nullif(c.ciudad, ''),
    'WEB',
    coalesce(c.created_at, now())
  from public.cliente c
  where coalesce(c."correo_electrónico", '') <> ''
  on conflict ((lower(correo))) do nothing;

  if to_regclass('public.proyecto') is null then
    return;
  end if;

  with origen as (
    select p.*, lower(c."correo_electrónico") as correo
      from public.proyecto p
      join public.cliente c on c.id = p.cliente_id
  ), nuevos as (
    insert into public.proyectos (nombre, cliente_id, ciudad, tipo_proyecto, fecha_requerida, estado, created_at)
    select
      coalesce(nullif(o.nombre_proyecto, ''), 'Proyecto migrado #' || o.idproyecto),
      cl.id,
      coalesce(nullif(o.ciudad, ''), 'Sin especificar'),
      case when upper(coalesce(o.tipo_obra, '')) in ('RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL', 'INFRAESTRUCTURA', 'HOSPITALARIO')
           then upper(o.tipo_obra) else 'RESIDENCIAL' end,
      o.fecha_requerida,
      case when upper(coalesce(o.estado, '')) in ('BORRADOR', 'RECIBIDO', 'EN_ANALISIS', 'VALIDACION_TECNICA',
             'SOLUCION_GENERADA', 'COTIZACION', 'APROBADO', 'ABASTECIMIENTO', 'SERVICIO_PROGRAMADO',
             'EN_EJECUCION', 'CALIDAD', 'CERRADO', 'CANCELADO')
           then upper(o.estado) else 'RECIBIDO' end,
      coalesce(o.created_at, now())
    from origen o
    join public.clientes cl on lower(cl.correo) = o.correo
    returning id, nombre, created_at
  )
  -- Se empareja por nombre Y fecha de creación: varios proyectos antiguos pueden compartir nombre
  insert into public.areas_proyecto (proyecto_id, nombre, tipo_superficie, area_m2, descripcion_problema)
  select n.id, 'Superficie principal', 'MAMPOSTERIA',
         greatest(coalesce(o.area_m2, 1), 1), o.descripcion
    from nuevos n
    join origen o
      on coalesce(nullif(o.nombre_proyecto, ''), 'Proyecto migrado #' || o.idproyecto) = n.nombre
     and coalesce(o.created_at, n.created_at) = n.created_at;
end $$;
