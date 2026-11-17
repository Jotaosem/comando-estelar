-- Comando Estelar · Base del prototipo (modelo de datos de AGENTS.md §5 y RLS §5)
-- Primera migración. Crea lo que las migraciones 0100–0300 esperan encontrar. Idempotente.
-- No toca la tabla existente "proyectos" (plural): queda como estaba hasta que el front migre.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- 1. Enums
-- ─────────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_type where typname = 'etapa_estado' and typnamespace = 'public'::regnamespace) then
    create type public.etapa_estado as enum ('Pendiente','En curso','Bloqueada','Completada');
  end if;
  if not exists (select 1 from pg_type where typname = 'bloqueo_motivo' and typnamespace = 'public'::regnamespace) then
    create type public.bloqueo_motivo as enum ('Aprobación QA','Infraestructura','Seguridad','Dependencia','Otro');
  end if;
  if not exists (select 1 from pg_type where typname = 'rol' and typnamespace = 'public'::regnamespace) then
    create type public.rol as enum ('Gerencia','Solicitante','Ejecutor','Admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'semaforo' and typnamespace = 'public'::regnamespace) then
    create type public.semaforo as enum ('verde','amarillo','rojo','gris');
  end if;
  if not exists (select 1 from pg_type where typname = 'aviso_tipo' and typnamespace = 'public'::regnamespace) then
    create type public.aviso_tipo as enum ('cambio_etapa','bloqueo_nuevo','bloqueo_cerrado','atraso','retroceso','sin_actualizar');
  end if;
  if not exists (select 1 from pg_type where typname = 'aviso_estado' and typnamespace = 'public'::regnamespace) then
    create type public.aviso_estado as enum ('preparado','publicado','descartado');
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 2. Tablas de proyecto (copias de la fuente; solo escribe la ingesta con service_role)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.proyecto (
  id                           uuid primary key default gen_random_uuid(),
  notion_id                    text unique,
  nombre                       text not null,
  area_solicitante             text,
  solicitante_nombre           text,
  solicitante_email            text,
  responsable_comunicar_nombre text,
  responsable_comunicar_email  text,
  fecha_comprometida           date,
  notion_url                   text,
  notion_editado_en            timestamptz,
  eliminado                    boolean not null default false,
  creado_en                    timestamptz not null default now()
);

create table if not exists public.etapa (
  id                 uuid primary key default gen_random_uuid(),
  proyecto_id        uuid not null references public.proyecto(id) on delete cascade,
  notion_id          text unique,
  nombre             text not null,
  orden              int  not null,
  responsable_nombre text,
  responsable_email  text,
  estado             public.etapa_estado not null default 'Pendiente',
  inicio_plan        date,
  fin_plan           date,
  inicio_real        date,
  fin_real           date,
  duracion_dh        int,
  notion_editado_en  timestamptz,
  eliminado          boolean not null default false
);
create index if not exists etapa_proyecto_idx on public.etapa (proyecto_id);

create table if not exists public.tarea (
  id                 uuid primary key default gen_random_uuid(),
  etapa_id           uuid references public.etapa(id) on delete cascade,
  proyecto_id        uuid not null references public.proyecto(id) on delete cascade,
  notion_id          text unique,
  nombre             text not null,
  responsable_nombre text,
  responsable_email  text,
  estado             text,
  notion_editado_en  timestamptz,
  eliminado          boolean not null default false
);
create index if not exists tarea_proyecto_idx on public.tarea (proyecto_id);

create table if not exists public.bloqueo (
  id                uuid primary key default gen_random_uuid(),
  etapa_id          uuid references public.etapa(id) on delete cascade,
  proyecto_id       uuid not null references public.proyecto(id) on delete cascade,
  notion_id         text unique,
  descripcion       text,
  motivo            public.bloqueo_motivo not null default 'Otro',
  area_destraba     text,
  fecha_apertura    date not null default current_date,
  fecha_cierre      date,
  notion_editado_en timestamptz,
  eliminado         boolean not null default false
);
create index if not exists bloqueo_proyecto_idx on public.bloqueo (proyecto_id);

create table if not exists public.evento_cambio (
  id                bigserial primary key,
  proyecto_id       uuid not null references public.proyecto(id) on delete cascade,
  entidad           text not null,
  entidad_id        uuid,
  campo             text,
  valor_anterior    jsonb,
  valor_nuevo       jsonb,
  tipo              text not null check (tipo in ('creado','actualizado','eliminado','retroceso')),
  detectado_en      timestamptz not null default now(),
  notion_editado_en timestamptz
);
create index if not exists evento_cambio_proyecto_idx on public.evento_cambio (proyecto_id, detectado_en desc);

-- Solo inserción
create or replace function public.evento_cambio_inmutable() returns trigger
language plpgsql as $$
begin
  -- Permite el borrado en cascada cuando se elimina físicamente un proyecto
  if tg_op = 'DELETE' and not exists (select 1 from public.proyecto where id = old.proyecto_id) then
    return old;
  end if;
  raise exception 'evento_cambio es solo de inserción';
end $$;
drop trigger if exists evento_cambio_inmutable on public.evento_cambio;
create trigger evento_cambio_inmutable before update or delete on public.evento_cambio
  for each row execute function public.evento_cambio_inmutable();

create table if not exists public.proyecto_calculo (
  proyecto_id          uuid primary key references public.proyecto(id) on delete cascade,
  etapa_actual_id      uuid references public.etapa(id) on delete set null,
  avance_pct           numeric(5,2),
  etapas_completadas   int,
  etapas_total         int,
  fecha_reproyectada   date,
  atraso_dh            int,
  semaforo             public.semaforo not null default 'gris',
  motivos_semaforo     text[] not null default '{}',
  bloqueos_abiertos    int not null default 0,
  ultima_actualizacion timestamptz,
  sin_actualizar       boolean not null default false,
  alertas_gobierno     text[] not null default '{}',
  desglose             jsonb,
  cerrado              boolean not null default false,
  calculado_en         timestamptz not null default now()
);

create table if not exists public.proyeccion_snapshot (
  id                 uuid primary key default gen_random_uuid(),
  proyecto_id        uuid not null references public.proyecto(id) on delete cascade,
  fecha              date not null,
  fecha_reproyectada date,
  atraso_dh          int,
  semaforo           public.semaforo,
  unique (proyecto_id, fecha)
);

create table if not exists public.aviso (
  id                uuid primary key default gen_random_uuid(),
  proyecto_id       uuid not null references public.proyecto(id) on delete cascade,
  tipo              public.aviso_tipo not null,
  evento_ids        bigint[] not null default '{}',
  mensaje           text not null,
  responsable_email text,
  estado            public.aviso_estado not null default 'preparado',
  preparado_en      timestamptz not null default now(),
  publicado_en      timestamptz,
  publicado_por     text,
  slack_ts          text,
  canal             text
);

-- ─────────────────────────────────────────────────────────────
-- 3. Usuarios, uso y métricas
-- ─────────────────────────────────────────────────────────────
create table if not exists public.usuario_rol (
  email  text primary key check (email = lower(email)),
  nombre text,
  rol    public.rol not null,
  area   text,                      -- heredado; las áreas reales van en usuario_area (migración 0300)
  activo boolean not null default true
);

create table if not exists public.usuario_proyecto (
  email       text not null,
  proyecto_id uuid not null references public.proyecto(id) on delete cascade,
  primary key (email, proyecto_id)
);

create table if not exists public.evento_uso (
  id          bigserial primary key,
  email       text not null,
  rol         text,
  vista       text not null check (vista in ('resumen','detalle','asistente','avisos','encuesta','admin')),
  proyecto_id uuid references public.proyecto(id) on delete set null,
  meta        jsonb,
  creado_en   timestamptz not null default now()
);

create table if not exists public.consulta_asistente (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  rol             text,
  proyecto_id     uuid references public.proyecto(id) on delete set null,
  pregunta        text not null,
  respuesta       text,
  funciones_usadas jsonb,
  respondio       boolean,
  valoracion      smallint check (valoracion in (-1, 1)),
  latencia_ms     int,
  tokens_in       int,
  tokens_out      int,
  creado_en       timestamptz not null default now()
);

create table if not exists public.encuesta_respuesta (
  id                        uuid primary key default gen_random_uuid(),
  email                     text not null,
  rol                       text,
  momento                   text not null check (momento in ('Línea base','Semana 1','Semana 2','Semana 3')),
  encontro_sin_preguntar    text check (encontro_sin_preguntar in ('Sí','Parcialmente','No')),
  tiempo                    text check (tiempo in ('<1 min','1-5 min','>5 min')),
  confianza_fecha           smallint check (confianza_fecha between 1 and 5),
  preguntas_slack_correo    int,
  como_se_entero            text check (como_se_entero in ('Aviso del responsable','Revisando la app','Preguntando')),
  vista_mas_usada           text check (vista_mas_usada in ('Resumen','Detalle','Asistente')),
  minutos_actualizar_notion int,
  creado_en                 timestamptz not null default now(),
  unique (email, momento)
);

create table if not exists public.sync_estado (
  base        text primary key,
  ultima_sync timestamptz,
  resultado   text check (resultado in ('ok','error')),
  detalle     text,
  registros   int
);

create table if not exists public.parametro (
  clave       text primary key,
  valor       jsonb not null,
  descripcion text
);

create table if not exists public.feriado (
  fecha  date primary key,
  nombre text not null
);

insert into public.parametro (clave, valor, descripcion) values
  ('dias_por_bloqueo',       '5',    'Días hábiles que suma cada bloqueo abierto'),
  ('umbral_atraso_rojo_dh',  '5',    'Atraso en días hábiles para semáforo rojo'),
  ('umbral_bloqueo_rojo_dh', '5',    'Días hábiles de un bloqueo abierto para semáforo rojo'),
  ('dias_frescura',          '7',    'Días calendario sin cambios para marcar "Sin actualizar"'),
  ('duracion_default_dh',    '5',    'Duración por defecto de una etapa sin plan'),
  ('canal_slack_piloto',     '""',   'Canal de Slack del piloto'),
  ('url_app',                '""',   'URL pública de Comando Estelar'),
  ('inicio_piloto',          'null', 'Fecha de inicio del piloto (YYYY-MM-DD)')
on conflict (clave) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 4. Funciones de acceso (proyecto_visible se amplía en la migración 0300)
-- ─────────────────────────────────────────────────────────────
create or replace function public.app_email() returns text
language sql stable security definer set search_path = public as $$
  select lower(nullif(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.app_rol() returns public.rol
language sql stable security definer set search_path = public as $$
  select rol from public.usuario_rol where email = public.app_email() and activo
$$;

create or replace function public.proyecto_visible(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_rol()::text in ('Admin', 'Gerencia'), false)
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. Vista de resumen
-- ─────────────────────────────────────────────────────────────
create or replace view public.v_proyecto_resumen with (security_invoker = true) as
select p.id, p.nombre, p.area_solicitante, p.responsable_comunicar_nombre, p.fecha_comprometida, p.notion_url,
       c.avance_pct, c.etapas_completadas, c.etapas_total, c.fecha_reproyectada, c.atraso_dh, c.semaforo,
       c.motivos_semaforo, c.bloqueos_abiertos, c.ultima_actualizacion, c.sin_actualizar, c.cerrado,
       e.nombre as etapa_actual
from public.proyecto p
left join public.proyecto_calculo c on c.proyecto_id = p.id
left join public.etapa e            on e.id = c.etapa_actual_id
where not p.eliminado;

-- ─────────────────────────────────────────────────────────────
-- 6. RLS
-- ─────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  -- Datos de proyecto: lectura según visibilidad; escritura solo service_role (sin políticas de escritura)
  foreach t in array array['proyecto','etapa','tarea','bloqueo','evento_cambio','proyecto_calculo',
                           'proyeccion_snapshot','aviso'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_leer', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.proyecto_visible(%s))',
                   t || '_leer', t, case when t = 'proyecto' then 'id' else 'proyecto_id' end);
  end loop;

  -- Registros propios
  foreach t in array array['evento_uso','consulta_asistente','encuesta_respuesta'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_insertar', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (email = public.app_email())',
                   t || '_insertar', t);
    execute format('drop policy if exists %I on public.%I', t || '_leer', t);
    execute format('create policy %I on public.%I for select to authenticated
                    using (email = public.app_email() or public.app_rol()::text = ''Admin'')', t || '_leer', t);
  end loop;

  -- Catálogos: lectura autenticados, escritura Admin
  foreach t in array array['parametro','sync_estado','feriado'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_leer', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_leer', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for all to authenticated
                    using (public.app_rol()::text = ''Admin'') with check (public.app_rol()::text = ''Admin'')',
                   t || '_admin', t);
  end loop;
end $$;

-- Valoración propia del asistente
drop policy if exists consulta_asistente_valorar on public.consulta_asistente;
create policy consulta_asistente_valorar on public.consulta_asistente for update to authenticated
  using (email = public.app_email()) with check (email = public.app_email());

-- usuario_rol: cada uno ve el suyo; Admin administra
alter table public.usuario_rol enable row level security;
drop policy if exists usuario_rol_leer on public.usuario_rol;
create policy usuario_rol_leer on public.usuario_rol for select to authenticated
  using (email = public.app_email() or public.app_rol()::text = 'Admin');
drop policy if exists usuario_rol_admin on public.usuario_rol;
create policy usuario_rol_admin on public.usuario_rol for all to authenticated
  using (public.app_rol()::text = 'Admin') with check (public.app_rol()::text = 'Admin');

-- usuario_proyecto: las políticas las agrega la migración 0300
alter table public.usuario_proyecto enable row level security;
