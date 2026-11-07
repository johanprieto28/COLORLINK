-- ==============================================================================
-- COLORLINK · Reparación de la migración 003 (ejecutar una sola vez)
--
-- La versión inicial de la 003 emparejaba las áreas solo por nombre de proyecto.
-- Dos proyectos antiguos con el mismo nombre ("Renovación y protección de
-- superficies") recibieron cada uno el área del otro (quedaron con 2 áreas).
-- Esto elimina el área que no corresponde: la que no coincide en fecha de
-- creación y m² con su proyecto de origen en public.proyecto.
-- Es idempotente: si no hay áreas duplicadas no borra nada.
-- ==============================================================================

delete from public.areas_proyecto a
using public.proyectos p
where a.proyecto_id = p.id
  and to_regclass('public.proyecto') is not null
  and (select count(*) from public.areas_proyecto x where x.proyecto_id = p.id) > 1
  and not exists (
    select 1
      from public.proyecto o
     where o.created_at = p.created_at
       and greatest(coalesce(o.area_m2, 1), 1) = a.area_m2
  );

-- Verificación: debe devolver 0 filas
select p.codigo, count(*) as areas
  from public.proyectos p
  join public.areas_proyecto a on a.proyecto_id = p.id
 group by p.codigo
having count(*) > 1;
