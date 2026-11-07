-- ==============================================================================
-- COLORLINK · Stock de colores para proyectos
--
-- 1. public.colores: la paleta de 20 colores con su stock en galones. Los clientes
--    eligen el color del proyecto de esta lista (máximo 2), no escribiéndolo.
-- 2. public.movimientos_color: entradas, salidas y ajustes de cada color.
-- 3. areas_proyecto.colores: ids de los colores elegidos (principal, secundario).
-- 4. ajustar_stock_color(): ajuste atómico (como ajustar_stock de productos).
-- 5. consumir_colores_proyecto(): al aprobarse la cotización descuenta los galones
--    estimados (2 manos, 35 m² por galón y mano; 70 % / 30 % si hay dos colores).
--    No descuenta dos veces el mismo proyecto. Si no alcanza, descuenta lo que hay
--    y deja el faltante anotado para que operaciones lo abastezca.
-- Idempotente.
-- ==============================================================================

create table if not exists public.colores (
  id text primary key,
  nombre text not null unique,
  hex text not null check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  familia text not null check (familia in ('NEUTROS', 'CALIDOS', 'FRESCOS', 'NATURALES', 'ACENTOS')),
  stock_galones numeric(10, 2) not null default 0 check (stock_galones >= 0),
  stock_minimo numeric(10, 2) not null default 10 check (stock_minimo >= 0),
  activo boolean not null default true,
  orden int not null default 0,
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_colores_updated on public.colores;
create trigger trg_colores_updated before update on public.colores
  for each row execute function public.set_updated_at();

-- Lectura pública del catálogo; solo el backend escribe
alter table public.colores enable row level security;
drop policy if exists colores_lectura on public.colores;
create policy colores_lectura on public.colores for select using (activo);

insert into public.colores (id, nombre, hex, familia, stock_galones, orden) values
  ('clr-marfil-luz',        'Marfil Luz',        '#F4EFE6', 'NEUTROS',   60, 1),
  ('clr-blanco-algodon',    'Blanco Algodón',    '#FAF7F2', 'NEUTROS',   80, 2),
  ('clr-arena-dorada',      'Arena Dorada',      '#E3C9A8', 'CALIDOS',   35, 3),
  ('clr-verde-salvia',      'Verde Salvia',      '#96AD98', 'NATURALES', 40, 4),
  ('clr-azul-profundo',     'Azul Profundo',     '#1E3A5F', 'ACENTOS',   25, 5),
  ('clr-terracota',         'Terracota',         '#C66B53', 'CALIDOS',   30, 6),
  ('clr-piedra-serena',     'Piedra Serena',     '#D8D2C5', 'NEUTROS',   45, 7),
  ('clr-brisa-marina',      'Brisa Marina',      '#B8D4D8', 'FRESCOS',   20, 8),
  ('clr-verde-oliva',       'Verde Oliva',       '#738063', 'NATURALES', 18, 9),
  ('clr-coral-atardecer',   'Coral Atardecer',   '#D9725B', 'ACENTOS',    8, 10),
  ('clr-gris-niebla',       'Gris Niebla',       '#CBD2D9', 'NEUTROS',   50, 11),
  ('clr-mostaza-artesanal', 'Mostaza Artesanal', '#C9963B', 'CALIDOS',   12, 12),
  ('clr-azul-bruma',        'Azul Bruma',        '#738996', 'FRESCOS',   22, 13),
  ('clr-bruma-botanica',    'Bruma Botánica',    '#C7D3C6', 'NATURALES', 28, 14),
  ('clr-trigo-suave',       'Trigo Suave',       '#D9B382', 'CALIDOS',   26, 15),
  ('clr-verde-agua-claro',  'Agua de Manantial', '#9EC5BE', 'FRESCOS',   16, 16),
  ('clr-piedra-caliza',     'Piedra Caliza',     '#B8B2A6', 'NATURALES', 34, 17),
  ('clr-turquesa-calma',    'Turquesa Sereno',   '#2E7D8C', 'FRESCOS',    0, 18),
  ('clr-bosque-norte',      'Verde Bosque',      '#2F4F46', 'ACENTOS',    6, 19),
  ('clr-grafito-urbano',    'Grafito Urbano',    '#3A434D', 'ACENTOS',   15, 20)
on conflict (id) do nothing;

create table if not exists public.movimientos_color (
  id uuid primary key default gen_random_uuid(),
  color_id text not null references public.colores(id) on delete cascade,
  tipo text not null check (tipo in ('ENTRADA', 'SALIDA', 'AJUSTE')),
  cantidad numeric(10, 2) not null,
  stock_resultante numeric(10, 2) not null,
  motivo text,
  referencia text,
  usuario_id uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists movimientos_color_idx on public.movimientos_color (color_id, created_at desc);
alter table public.movimientos_color enable row level security;

alter table public.areas_proyecto add column if not exists colores text[] not null default '{}';

-- ------------------------------------------------------------------------------
-- Ajuste manual de stock (operaciones): ENTRADA suma, SALIDA resta, AJUSTE fija
-- ------------------------------------------------------------------------------
create or replace function public.ajustar_stock_color(
  p_color text, p_tipo text, p_cantidad numeric, p_motivo text, p_referencia text, p_usuario uuid
) returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_nuevo numeric;
begin
  if p_cantidad is null or p_cantidad < 0 then raise exception 'CANTIDAD_INVALIDA'; end if;
  if p_tipo = 'ENTRADA' then
    update colores set stock_galones = stock_galones + p_cantidad where id = p_color returning stock_galones into v_nuevo;
  elsif p_tipo = 'SALIDA' then
    update colores set stock_galones = stock_galones - p_cantidad
     where id = p_color and stock_galones >= p_cantidad returning stock_galones into v_nuevo;
    if v_nuevo is null and exists (select 1 from colores where id = p_color) then
      raise exception 'STOCK_INSUFICIENTE:%', (select nombre from colores where id = p_color);
    end if;
  elsif p_tipo = 'AJUSTE' then
    update colores set stock_galones = p_cantidad where id = p_color returning stock_galones into v_nuevo;
  else
    raise exception 'TIPO_INVALIDO';
  end if;
  if v_nuevo is null then raise exception 'COLOR_NO_ENCONTRADO'; end if;

  insert into movimientos_color (color_id, tipo, cantidad, stock_resultante, motivo, referencia, usuario_id)
  values (p_color, p_tipo, p_cantidad, v_nuevo, p_motivo, p_referencia, p_usuario);
  return v_nuevo;
end $$;

-- ------------------------------------------------------------------------------
-- Descuento automático al aprobarse la cotización
-- ------------------------------------------------------------------------------
create or replace function public.consumir_colores_proyecto(p_proyecto uuid, p_usuario uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_area record;
  v_codigo text;
  v_resultado jsonb := '[]'::jsonb;
  v_total int;
  v_i int;
  v_color colores%rowtype;
  v_req numeric;
  v_desc numeric;
begin
  -- Un proyecto se descuenta una sola vez
  if exists (select 1 from movimientos_color where referencia = p_proyecto::text and tipo = 'SALIDA') then
    return v_resultado;
  end if;
  select codigo into v_codigo from proyectos where id = p_proyecto;

  for v_area in select area_m2, colores from areas_proyecto where proyecto_id = p_proyecto and cardinality(colores) > 0 loop
    v_total := least(cardinality(v_area.colores), 2);
    for v_i in 1..v_total loop
      select * into v_color from colores where id = v_area.colores[v_i] for update;
      continue when not found;
      -- 2 manos · 35 m² por galón y mano · 70 % / 30 % si hay dos colores
      v_req := greatest(1, ceil(v_area.area_m2 * 2 / 35.0 * (case when v_total = 1 then 1 when v_i = 1 then 0.7 else 0.3 end)));
      v_desc := least(v_req, v_color.stock_galones);
      if v_desc > 0 then
        update colores set stock_galones = stock_galones - v_desc where id = v_color.id;
      end if;
      insert into movimientos_color (color_id, tipo, cantidad, stock_resultante, motivo, referencia, usuario_id)
      values (
        v_color.id, 'SALIDA', v_desc, v_color.stock_galones - v_desc,
        'Proyecto ' || coalesce(v_codigo, '') || ' aprobado'
          || case when v_req > v_desc then ' · faltan ' || trim_scale(v_req - v_desc) || ' gal por abastecer' else '' end,
        p_proyecto::text, p_usuario
      );
      v_resultado := v_resultado || jsonb_build_object(
        'color', v_color.nombre, 'requeridos', v_req, 'descontados', v_desc, 'faltantes', v_req - v_desc
      );
    end loop;
  end loop;
  return v_resultado;
end $$;

revoke all on function public.ajustar_stock_color(text, text, numeric, text, text, uuid) from public, anon, authenticated;
revoke all on function public.consumir_colores_proyecto(uuid, uuid) from public, anon, authenticated;

-- Para que la API de Supabase vea las tablas, columnas y funciones nuevas de inmediato
notify pgrst, 'reload schema';
