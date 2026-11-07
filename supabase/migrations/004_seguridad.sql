-- ==============================================================================
-- COLORLINK · Cierre de accesos públicos
--
-- 1. productos: la política pública dejaba ver costo, stock mínimo y ubicación en
--    bodega con la clave anon. El catálogo se sirve desde el backend.
-- 2. Tablas de la versión anterior (cliente, proyecto, welcome_email_events): eran
--    legibles con la clave pública, incluidos nombres, correos y teléfonos.
--    Se activa RLS sin políticas: solo el backend (service_role) puede leerlas,
--    así la migración 003 sigue funcionando.
-- Idempotente.
-- ==============================================================================

drop policy if exists productos_lectura_publica on public.productos;

do $$
declare
  t text;
  p record;
begin
  foreach t in array array['cliente', 'proyecto', 'welcome_email_events'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
        execute format('drop policy if exists %I on public.%I', p.policyname, t);
      end loop;
      execute format('revoke all on public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;
