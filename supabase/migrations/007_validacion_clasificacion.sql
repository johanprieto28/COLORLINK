-- ==============================================================================
-- COLORLINK · Validación automática y clasificación con IA (entregables 2 y 3 del MVP)
--
-- 1. proyectos.validacion: reporte de completitud, formato, coherencia, duplicidad
--    y trazabilidad calculado por el backend antes de registrar la solicitud.
-- 2. diagnosticos.clasificacion: JSON estructurado de Gemini (categoría, condición,
--    complejidad, nivel de confianza y texto extraído de fotos/documentos).
-- 3. crear_proyecto_completo guarda ambos en la misma transacción y deja la
--    validación en el historial.
-- Idempotente.
-- ==============================================================================

alter table public.proyectos add column if not exists validacion jsonb;
alter table public.diagnosticos add column if not exists clasificacion jsonb;

create index if not exists proyectos_created_idx on public.proyectos (created_at desc);

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
  v jsonb := p->'validacion';
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

  insert into proyectos (nombre, cliente_id, creado_por, ciudad, direccion, tipo_proyecto, fecha_requerida, prioridad, estado, validacion)
  values (
    pr->>'nombre', v_cliente, nullif(p->>'creado_por', '')::uuid,
    pr->>'ciudad', nullif(pr->>'direccion', ''),
    coalesce(pr->>'tipo_proyecto', 'RESIDENCIAL'),
    nullif(pr->>'fecha_requerida', '')::date,
    coalesce(pr->>'prioridad', 'NORMAL'),
    'RECIBIDO',
    v
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
                              clasificacion, origen_motor, generado_por)
    values (v_proyecto, d->>'complejidad', d->>'severidad', coalesce(d->'patologias', '[]'::jsonb),
            coalesce((d->>'validacion_tecnica_requerida')::boolean, true),
            d->>'recomendacion_preliminar', d->>'preparacion_superficie_recomendada',
            d->'sistema_sugerido', d->'clasificacion', coalesce(d->>'origen_motor', 'MOTOR_REGLAS'),
            nullif(p->>'creado_por', '')::uuid);
  end if;

  insert into actividades (proyecto_id, usuario_id, usuario_nombre, usuario_rol, tipo_actividad, titulo, descripcion, estado_nuevo)
  values (v_proyecto, nullif(p->>'creado_por', '')::uuid, coalesce(p->>'creado_por_nombre', c->>'nombre'),
          coalesce(p->>'creado_por_rol', 'cliente'), 'CREACION', 'Proyecto registrado',
          format('Registro de %s m² en %s.', a->>'area_m2', pr->>'ciudad'), 'RECIBIDO');

  if v is not null then
    insert into actividades (proyecto_id, usuario_nombre, usuario_rol, tipo_actividad, titulo, descripcion)
    values (v_proyecto, 'COLORLINK', 'sistema', 'VALIDACION_AUTOMATICA', 'Validación automática de la solicitud',
            format('Resultado %s · puntaje %s/100.', v->>'estado', v->>'puntaje'));
  end if;

  if d is not null then
    insert into actividades (proyecto_id, usuario_nombre, usuario_rol, tipo_actividad, titulo, descripcion)
    values (v_proyecto, 'COLORLINK IA', 'sistema', 'DIAGNOSTICO_GENERADO', 'Clasificación y orientación preliminar generadas',
            format('Categoría %s · confianza %s · severidad %s · complejidad %s. Pendiente de validación técnica.',
                   coalesce(d->'clasificacion'->>'categoria', 'sin clasificar'),
                   coalesce(d->'clasificacion'->>'confianza', '—'),
                   d->>'severidad', d->>'complejidad'));
  end if;

  return v_proyecto;
end $$;

revoke all on function public.crear_proyecto_completo(jsonb) from public, anon, authenticated;
