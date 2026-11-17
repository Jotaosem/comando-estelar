-- Comando Estelar · Dominio corporativo
-- Requiere 20261117000000. Aditiva e idempotente.
--
-- app_email() devuelve null si el correo del JWT no es @prontopaga.com.
-- Como todas las políticas RLS, proyecto_visible(), app_rol() y galaxia_resumen()
-- dependen de app_email(), un correo externo autenticado no ve nada (ni la galaxia).

create or replace function public.app_email() returns text
language sql stable security definer set search_path = public as $$
  select case
           when e ~ '^[^@\s]+@prontopaga\.com$' then e
           else null
         end
  from (select lower(nullif(trim(auth.jwt() ->> 'email'), '')) as e) s
$$;
-- "create or replace" conserva los permisos actuales de la función (no se cambian aquí).
