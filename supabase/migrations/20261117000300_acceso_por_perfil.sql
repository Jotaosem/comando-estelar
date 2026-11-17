-- Comando Estelar · Acceso por perfil
-- Requiere 20261117000100 y 20261117000200. Aditiva e idempotente.
--
-- Perfiles (enum rol):
--   Admin            → todo + administración
--   Gerencia         → todos los proyectos (en la UI se muestra como "Gerencia general")
--   Gerente de área  → proyectos donde alguna de sus áreas es la solicitante o la sponsor
--   Solicitante      → proyectos de sus áreas (solicitante o sponsor) + asignados
--   Ejecutor         → proyectos donde participa (responsable, comunica, sponsor, etapa, tarea) + asignados
--   Sin perfil       → solo la galaxia con resúmenes (galaxia_resumen)
-- Dentro de un proyecto visible se ve todo (transparencia). Directorio de personas: solo nombres;
-- los correos de persona no se exponen por la API.
-- Nota: el valor nuevo del enum se compara siempre como texto (app_rol()::text) para que esta
-- migración funcione dentro de una sola transacción.

-- ─────────────────────────────────────────────────────────────
-- 1. Perfil nuevo
-- ─────────────────────────────────────────────────────────────
do $$ begin
  if exists (select 1 from pg_type where typname = 'rol' and typnamespace = 'public'::regnamespace) then
    alter type public.rol add value if not exists 'Gerente de área';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 2. Áreas por usuario (varias) y asignación explícita a proyectos
-- ─────────────────────────────────────────────────────────────
create table if not exists public.usuario_area (
  email     text not null references public.usuario_rol(email) on delete cascade on update cascade,
  area_id   uuid not null references public.area(id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (email, area_id)
);
create index if not exists usuario_area_area_idx on public.usuario_area (area_id);

create table if not exists public.usuario_proyecto (
  email       text not null,
  proyecto_id uuid not null references public.proyecto(id) on delete cascade,
  primary key (email, proyecto_id)
);

-- Backfill: el área de texto que ya tenga usuario_rol pasa a usuario_area
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'usuario_rol' and column_name = 'area') then
    execute $q$
      insert into public.usuario_area (email, area_id)
      select ur.email, coalesce(aa.area_id, a.id)
      from public.usuario_rol ur
      left join public.area_alias aa on aa.alias_normalizado = public.normalizar_texto(ur.area::text)
      left join public.area a        on public.normalizar_texto(a.nombre) = public.normalizar_texto(ur.area::text)
      where nullif(trim(ur.area::text), '') is not null
        and coalesce(aa.area_id, a.id) is not null
      on conflict do nothing
    $q$;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Visibilidad por proyecto (reemplaza la del prototipo, misma firma)
-- ─────────────────────────────────────────────────────────────
do $$
declare v_arg text;
begin
  select coalesce(p.proargnames[1], 'p_proyecto') into v_arg
  from pg_proc p
  where p.proname = 'proyecto_visible' and p.pronamespace = 'public'::regnamespace and p.pronargs = 1
  limit 1;
  v_arg := coalesce(v_arg, 'p_proyecto');

  execute format($f$
    create or replace function public.proyecto_visible(%I uuid) returns boolean
    language plpgsql stable security definer set search_path = public as $body$
    declare
      v_rol     text := public.app_rol()::text;
      v_email   text := lower(public.app_email());
      v_persona uuid;
      p         record;
    begin
      if v_rol is null or v_email is null then return false; end if;
      if v_rol in ('Admin', 'Gerencia') then return true; end if;

      select pr.id, pr.area_id, pr.area_sponsor_id, pr.responsable_id, pr.responsable_comunicar_id,
             pr.sponsor_id, pr.responsable_comunicar_email
        into p
      from proyecto pr where pr.id = $1;
      if not found then return false; end if;

      -- Asignación explícita (cualquier perfil)
      if exists (select 1 from usuario_proyecto up where up.proyecto_id = $1 and lower(up.email) = v_email) then
        return true;
      end if;

      -- Participa en el proyecto (cualquier perfil)
      select pe.id into v_persona from persona pe where pe.email = v_email;
      if v_persona is not null
         and (p.responsable_id = v_persona or p.responsable_comunicar_id = v_persona or p.sponsor_id = v_persona) then
        return true;
      end if;
      if lower(p.responsable_comunicar_email) = v_email then return true; end if;
      if exists (select 1 from etapa e where e.proyecto_id = $1
                 and (lower(e.responsable_email) = v_email or (v_persona is not null and e.responsable_id = v_persona))) then
        return true;
      end if;
      if exists (select 1 from tarea t where t.proyecto_id = $1
                 and (lower(t.responsable_email) = v_email or (v_persona is not null and t.responsable_id = v_persona))) then
        return true;
      end if;

      -- Gerente de área y Solicitante: sus áreas, como solicitante o como sponsor
      if v_rol in ('Gerente de área', 'Solicitante') and exists (
           select 1 from usuario_area ua
           where lower(ua.email) = v_email and ua.area_id in (p.area_id, p.area_sponsor_id)) then
        return true;
      end if;

      return false;
    end $body$;
  $f$, v_arg);
end $$;

-- ─────────────────────────────────────────────────────────────
-- 4. Galaxia con resúmenes (para todos los autenticados, con o sin perfil)
-- ─────────────────────────────────────────────────────────────
insert into public.parametro (clave, valor)
values ('galaxia_resumen_global', 'true'::jsonb)   -- true: todo usuario ve el resumen de todos los proyectos
on conflict (clave) do nothing;

create or replace function public.galaxia_resumen()
returns table (
  id uuid, nombre text, area_nombre text, fase_macro text, semaforo text, avance_pct numeric,
  fecha_estimada date, nivel_detalle text, responsable_nombre text, puede_ver_detalle boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.nombre, a.nombre, p.fase_macro::text, c.semaforo::text, c.avance_pct::numeric,
         coalesce(c.fecha_reproyectada::date, p.fecha_comprometida), p.nivel_detalle,
         r.nombre, public.proyecto_visible(p.id)
  from proyecto p
  left join area a             on a.id = p.area_id
  left join proyecto_calculo c on c.proyecto_id = p.id
  left join persona r          on r.id = coalesce(p.responsable_comunicar_id, p.responsable_id)
  where coalesce(p.eliminado, false) = false
    and public.app_email() is not null
    and (
      public.app_rol() is null                                   -- sin perfil: solo resúmenes
      or coalesce((select valor from parametro where clave = 'galaxia_resumen_global'), 'true'::jsonb) = 'true'::jsonb
      or public.proyecto_visible(p.id)
    )
  order by p.nombre
$$;

-- Hora de la última sincronización correcta (para "Datos al hh:mm", sin exponer sync_ejecucion)
create or replace function public.ultima_sincronizacion() returns timestamptz
language sql stable security definer set search_path = public as $$
  select max(fin) from sync_ejecucion where estado in ('ok', 'parcial')
$$;

revoke all on function public.galaxia_resumen()       from public, anon;
revoke all on function public.ultima_sincronizacion() from public, anon;
grant execute on function public.galaxia_resumen()       to authenticated;
grant execute on function public.ultima_sincronizacion() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. Personas: nombres visibles solo de proyectos visibles; correos nunca por la API
-- ─────────────────────────────────────────────────────────────
revoke select on public.persona from anon, authenticated;
grant select (id, nombre, area_id) on public.persona to authenticated;

drop policy if exists persona_leer on public.persona;
create policy persona_leer on public.persona for select to authenticated using (
  public.app_rol()::text = 'Admin'
  or email = lower(public.app_email())
  or exists (
    select 1 from public.proyecto p
    where persona.id in (p.responsable_id, p.responsable_comunicar_id, p.sponsor_id)
      and public.proyecto_visible(p.id)
  )
);

-- ─────────────────────────────────────────────────────────────
-- 6. Fuentes: datos básicos visibles; config solo por SQL (rol de servicio)
-- ─────────────────────────────────────────────────────────────
revoke select on public.fuente from anon, authenticated;
grant select (id, codigo, tipo, nombre, nivel_detalle, prioridad, activa) on public.fuente to authenticated;

drop policy if exists fuente_leer on public.fuente;
create policy fuente_leer on public.fuente for select to authenticated using (true);

-- ─────────────────────────────────────────────────────────────
-- 7. Responsables que llegan desde Notion → perfil Ejecutor automático
--    (no pisa un perfil ya asignado por el Admin)
-- ─────────────────────────────────────────────────────────────
create or replace function public.persona_asegurar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into usuario_rol (email, nombre, rol, activo)
  values (new.email, new.nombre, 'Ejecutor', true)
  on conflict (email) do nothing;
  return new;
end $$;

drop trigger if exists persona_asegurar_perfil on public.persona;
create trigger persona_asegurar_perfil after insert on public.persona
  for each row execute function public.persona_asegurar_perfil();

insert into public.usuario_rol (email, nombre, rol, activo)
select email, nombre, 'Ejecutor', true from public.persona
on conflict (email) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 8. RLS de las tablas nuevas
-- ─────────────────────────────────────────────────────────────
alter table public.usuario_area     enable row level security;
alter table public.usuario_proyecto enable row level security;

drop policy if exists usuario_area_leer on public.usuario_area;
create policy usuario_area_leer on public.usuario_area for select to authenticated
  using (lower(email) = lower(public.app_email()) or public.app_rol()::text = 'Admin');
drop policy if exists usuario_area_admin on public.usuario_area;
create policy usuario_area_admin on public.usuario_area for all to authenticated
  using (public.app_rol()::text = 'Admin') with check (public.app_rol()::text = 'Admin');

drop policy if exists ce_usuario_proyecto_leer on public.usuario_proyecto;
create policy ce_usuario_proyecto_leer on public.usuario_proyecto for select to authenticated
  using (lower(email) = lower(public.app_email()) or public.app_rol()::text = 'Admin');
drop policy if exists ce_usuario_proyecto_admin on public.usuario_proyecto;
create policy ce_usuario_proyecto_admin on public.usuario_proyecto for all to authenticated
  using (public.app_rol()::text = 'Admin') with check (public.app_rol()::text = 'Admin');
