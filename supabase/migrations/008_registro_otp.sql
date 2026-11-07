-- ==============================================================================
-- COLORLINK · Registro con código de verificación (OTP) por correo
--
-- Antes de mostrar el formulario de registro, el backend envía un código de
-- 6 dígitos al correo. Solo se guarda el hash del código; al verificarlo se
-- emite un token de registro (también guardado como hash) que permite crear la
-- cuenta durante 30 minutos. Solo el backend (service_role) accede a la tabla.
-- Idempotente.
-- ==============================================================================

create table if not exists public.registro_otp (
  email text primary key,
  codigo_hash text not null,
  expira_at timestamptz not null,
  intentos int not null default 0,
  enviado_at timestamptz not null default now(),
  verificado_at timestamptz,
  token_hash text
);

-- Sin políticas: el navegador no puede leer ni escribir; el backend usa service_role
alter table public.registro_otp enable row level security;
