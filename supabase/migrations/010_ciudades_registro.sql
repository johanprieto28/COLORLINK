-- ==============================================================================
-- COLORLINK · Ciudades y datos de registro
--
-- 1. public.ciudades: catálogo de ciudades de Colombia. Los formularios (registro,
--    cuenta, compra y proyectos) solo permiten elegir una de esta lista, así no
--    quedan nombres mal escritos ("Bogota", "medellin ").
--    Para agregar una ciudad:
--      insert into public.ciudades (nombre, departamento) values ('Nombre', 'Departamento');
--    Para ocultarla sin borrarla: update public.ciudades set activo = false where nombre = '...';
-- 2. Tipo de documento en perfiles y clientes (CC, CE, PPT, PA, NIT).
-- Idempotente.
-- ==============================================================================

create table if not exists public.ciudades (
  id serial primary key,
  nombre text not null unique,
  departamento text not null,
  activo boolean not null default true
);

-- Lectura pública (el catálogo no es sensible); solo el backend escribe
alter table public.ciudades enable row level security;
drop policy if exists ciudades_lectura on public.ciudades;
create policy ciudades_lectura on public.ciudades for select using (activo);

insert into public.ciudades (nombre, departamento) values
  ('Bogotá D.C.', 'Bogotá D.C.'),
  -- Antioquia
  ('Medellín', 'Antioquia'), ('Bello', 'Antioquia'), ('Itagüí', 'Antioquia'), ('Envigado', 'Antioquia'),
  ('Sabaneta', 'Antioquia'), ('La Estrella', 'Antioquia'), ('Copacabana', 'Antioquia'), ('Girardota', 'Antioquia'),
  ('Rionegro', 'Antioquia'), ('La Ceja', 'Antioquia'), ('Marinilla', 'Antioquia'), ('Apartadó', 'Antioquia'),
  ('Turbo', 'Antioquia'), ('Caucasia', 'Antioquia'),
  -- Atlántico
  ('Barranquilla', 'Atlántico'), ('Soledad', 'Atlántico'), ('Malambo', 'Atlántico'), ('Puerto Colombia', 'Atlántico'),
  -- Bolívar
  ('Cartagena', 'Bolívar'), ('Magangué', 'Bolívar'), ('Turbaco', 'Bolívar'),
  -- Boyacá
  ('Tunja', 'Boyacá'), ('Duitama', 'Boyacá'), ('Sogamoso', 'Boyacá'), ('Chiquinquirá', 'Boyacá'),
  -- Caldas
  ('Manizales', 'Caldas'), ('Villamaría', 'Caldas'), ('La Dorada', 'Caldas'),
  -- Cundinamarca
  ('Soacha', 'Cundinamarca'), ('Chía', 'Cundinamarca'), ('Zipaquirá', 'Cundinamarca'), ('Facatativá', 'Cundinamarca'),
  ('Fusagasugá', 'Cundinamarca'), ('Mosquera', 'Cundinamarca'), ('Madrid', 'Cundinamarca'), ('Funza', 'Cundinamarca'),
  ('Cajicá', 'Cundinamarca'), ('Girardot', 'Cundinamarca'), ('Cota', 'Cundinamarca'), ('La Calera', 'Cundinamarca'),
  ('Tocancipá', 'Cundinamarca'), ('Sopó', 'Cundinamarca'),
  -- Eje cafetero
  ('Armenia', 'Quindío'), ('Calarcá', 'Quindío'), ('Montenegro', 'Quindío'),
  ('Pereira', 'Risaralda'), ('Dosquebradas', 'Risaralda'), ('Santa Rosa de Cabal', 'Risaralda'),
  -- Santanderes
  ('Bucaramanga', 'Santander'), ('Floridablanca', 'Santander'), ('Girón', 'Santander'), ('Piedecuesta', 'Santander'),
  ('Barrancabermeja', 'Santander'), ('San Gil', 'Santander'),
  ('Cúcuta', 'Norte de Santander'), ('Villa del Rosario', 'Norte de Santander'), ('Los Patios', 'Norte de Santander'),
  ('Ocaña', 'Norte de Santander'), ('Pamplona', 'Norte de Santander'),
  -- Valle del Cauca
  ('Cali', 'Valle del Cauca'), ('Palmira', 'Valle del Cauca'), ('Jamundí', 'Valle del Cauca'), ('Yumbo', 'Valle del Cauca'),
  ('Buenaventura', 'Valle del Cauca'), ('Tuluá', 'Valle del Cauca'), ('Buga', 'Valle del Cauca'), ('Cartago', 'Valle del Cauca'),
  -- Tolima y Huila
  ('Ibagué', 'Tolima'), ('Espinal', 'Tolima'),
  ('Neiva', 'Huila'), ('Pitalito', 'Huila'), ('Garzón', 'Huila'),
  -- Costa Caribe
  ('Santa Marta', 'Magdalena'), ('Ciénaga', 'Magdalena'),
  ('Valledupar', 'Cesar'), ('Aguachica', 'Cesar'),
  ('Montería', 'Córdoba'), ('Cereté', 'Córdoba'), ('Lorica', 'Córdoba'), ('Sahagún', 'Córdoba'),
  ('Sincelejo', 'Sucre'), ('Corozal', 'Sucre'),
  ('Riohacha', 'La Guajira'), ('Maicao', 'La Guajira'),
  ('San Andrés', 'San Andrés y Providencia'),
  -- Pacífico y sur
  ('Popayán', 'Cauca'), ('Santander de Quilichao', 'Cauca'),
  ('Pasto', 'Nariño'), ('Ipiales', 'Nariño'), ('Tumaco', 'Nariño'),
  ('Quibdó', 'Chocó'),
  -- Llanos, Orinoquía y Amazonía
  ('Villavicencio', 'Meta'), ('Acacías', 'Meta'), ('Puerto López', 'Meta'),
  ('Yopal', 'Casanare'), ('Arauca', 'Arauca'), ('Florencia', 'Caquetá'), ('Mocoa', 'Putumayo'),
  ('Leticia', 'Amazonas'), ('Inírida', 'Guainía'), ('San José del Guaviare', 'Guaviare'), ('Mitú', 'Vaupés'),
  ('Puerto Carreño', 'Vichada')
on conflict (nombre) do nothing;

alter table public.perfiles add column if not exists tipo_documento text;
alter table public.clientes add column if not exists tipo_documento text;

-- Para que la API de Supabase vea la tabla y columnas nuevas de inmediato
notify pgrst, 'reload schema';
