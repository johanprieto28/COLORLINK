-- ==============================================================================
-- COLORLINK · Seguimiento de pedidos
--
-- 1. Datos de envío en el pedido: transportadora, número de guía y fechas de
--    envío y entrega (se piden al marcar el pedido como ENVIADO).
-- 2. public.pedido_eventos: historial de cada pedido (cambios de estado, pagos,
--    envío y notas internas del equipo) con quién y cuándo lo hizo.
--    Solo el backend (service_role) lee y escribe: las notas internas nunca
--    llegan al navegador del cliente.
-- 3. Índice para buscar pedidos por fecha.
-- Idempotente.
-- ==============================================================================

alter table public.pedidos add column if not exists transportadora text;
alter table public.pedidos add column if not exists numero_guia text;
alter table public.pedidos add column if not exists enviado_at timestamptz;
alter table public.pedidos add column if not exists entregado_at timestamptz;

create index if not exists pedidos_created_idx on public.pedidos (created_at desc);

create table if not exists public.pedido_eventos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  tipo text not null check (tipo in ('ESTADO', 'PAGO', 'ENVIO', 'NOTA')),
  estado_anterior text,
  estado_nuevo text,
  nota text,
  usuario_id uuid references public.perfiles(id) on delete set null,
  usuario_nombre text,
  usuario_rol text,
  created_at timestamptz not null default now()
);
create index if not exists pedido_eventos_pedido_idx on public.pedido_eventos (pedido_id, created_at);

-- Sin políticas: el navegador no puede leer ni escribir; el backend usa service_role
alter table public.pedido_eventos enable row level security;

-- Los pedidos que ya existían arrancan su historial con el evento de creación
insert into public.pedido_eventos (pedido_id, tipo, estado_nuevo, nota, usuario_id, usuario_rol, created_at)
select p.id, 'ESTADO', 'PENDIENTE', 'Pedido creado desde la tienda', p.usuario_id, 'cliente', p.created_at
  from public.pedidos p
 where not exists (select 1 from public.pedido_eventos e where e.pedido_id = p.id);

-- Para que la API de Supabase vea la tabla y columnas nuevas de inmediato
notify pgrst, 'reload schema';
