-- Comando Estelar · Modelo canónico transversal
-- Migración ADITIVA e idempotente sobre las tablas del prototipo. No borra ni renombra nada.
-- Referencia: docs/ARQUITECTURA_DATOS.md (secciones 4 y 5).
-- Ejecutar primero en local o en una rama de Supabase. Requiere verificar_prerrequisitos.sql en "ok".

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- 1. Tipos
-- ─────────────────────────────────────────────────────────────
do $$ begin
  create type public.fase_macro as enum
    ('Idea','Discovery','Diseño','Ejecución','Seguimiento','Cerrado','Pausado','Cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  if exists (select 1 from pg_type where typname = 'bloqueo_motivo') then
    alter type public.bloqueo_motivo add value if not exists 'Decisión pendiente';
    alter type public.bloqueo_motivo add value if not exists 'Proveedor';
  end if;
end $$;

-- Normaliza textos libres: quita lo que está entre paréntesis, tildes, espacios y símbolos.
-- "Comercial Argentina (Patricio Leopardo)" → "comercialargentina"
create or replace function public.normalizar_texto(t text) returns text
language sql immutable as $$
  select regexp_replace(
           lower(translate(trim(regexp_replace(coalesce(t, ''), '\(.*?\)', '', 'g')),
                           'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun')),
           '[^a-z0-9]', '', 'g')
$$;

-- ─────────────────────────────────────────────────────────────
-- 2. Catálogos y fuentes
-- ─────────────────────────────────────────────────────────────
create table if not exists public.area (
  id         uuid primary key default gen_random_uuid(),
  codigo     text not null unique,
  nombre     text not null unique,
  activa     boolean not null default true,
  creado_en  timestamptz not null default now()
);

create table if not exists public.area_alias (
  alias_normalizado text primary key,
  area_id           uuid not null references public.area(id) on delete cascade
);

create table if not exists public.fuente (
  id              uuid primary key default gen_random_uuid(),
  codigo          text not null unique,
  tipo            text not null check (tipo in ('notion','gestor','otro')),
  nombre          text not null,
  area_defecto_id uuid references public.area(id),
  nivel_detalle   text not null default 'N1' check (nivel_detalle in ('N1','N2','N3')),
  prioridad       int  not null default 10,
  config          jsonb not null default '{}'::jsonb,  -- mapeo de campos. NUNCA guardar tokens aquí.
  activa          boolean not null default true,
  url_base        text,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create table if not exists public.persona (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique check (email = lower(email)),
  nombre         text not null,
  area_id        uuid references public.area(id),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.mapeo_estado (
  fuente_id         uuid not null references public.fuente(id) on delete cascade,
  valor_normalizado text not null,
  valor_origen      text not null,
  fase_macro        public.fase_macro not null,
  orden             int,           -- null = fuera de la secuencia (Pausado, Cancelado)
  primary key (fuente_id, valor_normalizado)
);

create table if not exists public.mapeo_motivo (
  fuente_id uuid not null references public.fuente(id) on delete cascade,
  area_id   uuid not null references public.area(id) on delete cascade,
  motivo    text not null check (motivo in ('Aprobación QA','Infraestructura','Seguridad','Dependencia',
                                            'Decisión pendiente','Proveedor','Otro')),
  primary key (fuente_id, area_id)
);

create table if not exists public.proyecto_fuente (
  proyecto_id   uuid not null references public.proyecto(id) on delete cascade,
  fuente_id     uuid not null references public.fuente(id),
  id_origen     text not null,
  url_origen    text,
  codigo_origen text,
  vinculado_por text not null default 'auto' check (vinculado_por in ('auto','auto_codigo','admin')),
  vinculado_en  timestamptz not null default now(),
  primary key (fuente_id, id_origen)
);
create index if not exists proyecto_fuente_proyecto_idx on public.proyecto_fuente (proyecto_id);
create index if not exists proyecto_fuente_codigo_idx  on public.proyecto_fuente (codigo_origen) where codigo_origen is not null;

create table if not exists public.sync_ejecucion (
  id           uuid primary key default gen_random_uuid(),
  fuente_id    uuid not null references public.fuente(id),
  run_id       text not null,
  inicio       timestamptz not null default now(),
  fin          timestamptz,
  estado       text not null default 'en_curso' check (estado in ('en_curso','ok','parcial','error')),
  leidos       int not null default 0,
  creados      int not null default 0,
  actualizados int not null default 0,
  eliminados   int not null default 0,
  errores      jsonb not null default '[]'::jsonb,
  unique (fuente_id, run_id)
);

-- ─────────────────────────────────────────────────────────────
-- 3. Extensión de las tablas del prototipo
-- ─────────────────────────────────────────────────────────────
alter table public.proyecto
  add column if not exists codigo_visible           text,
  add column if not exists descripcion              text,
  add column if not exists objetivo                 text,
  add column if not exists area_id                  uuid references public.area(id),
  add column if not exists area_sponsor_id          uuid references public.area(id),
  add column if not exists fase_macro               public.fase_macro,
  add column if not exists estado_origen            text,
  add column if not exists prioridad                text,
  add column if not exists impacto                  text,
  add column if not exists alcance                  text,
  add column if not exists responsable_id           uuid references public.persona(id),
  add column if not exists responsable_comunicar_id uuid references public.persona(id),
  add column if not exists sponsor_id               uuid references public.persona(id),
  add column if not exists fecha_inicio             date,
  add column if not exists fecha_objetivo_origen    date,
  add column if not exists fecha_fin_real           date,
  add column if not exists proximo_paso             text,
  add column if not exists decisiones_pendientes    text,
  add column if not exists riesgos_texto            text,
  add column if not exists avance_declarado         numeric,
  add column if not exists salud_declarada          text,
  add column if not exists nivel_detalle            text not null default 'N1',
  add column if not exists fuente_principal_id      uuid references public.fuente(id),
  add column if not exists url_principal            text,
  add column if not exists actualizado_origen_en    timestamptz,
  add column if not exists sincronizado_en          timestamptz;

alter table public.etapa
  add column if not exists fuente_id      uuid references public.fuente(id),
  add column if not exists id_origen      text,
  add column if not exists origen         text not null default 'fase',
  add column if not exists responsable_id uuid references public.persona(id),
  add column if not exists gate_estado    text;

alter table public.tarea
  add column if not exists fuente_id      uuid references public.fuente(id),
  add column if not exists id_origen      text,
  add column if not exists codigo         text,
  add column if not exists prioridad      text,
  add column if not exists responsable_id uuid references public.persona(id),
  add column if not exists inicio_plan    date,
  add column if not exists fin_plan       date,
  add column if not exists inicio_real    date,
  add column if not exists fin_real       date;

alter table public.bloqueo
  add column if not exists fuente_id        uuid references public.fuente(id),
  add column if not exists id_origen        text,
  add column if not exists tarea_id         uuid references public.tarea(id),
  add column if not exists area_destraba_id uuid references public.area(id),
  add column if not exists responsable_id   uuid references public.persona(id);

alter table public.evento_cambio    add column if not exists fuente_id uuid references public.fuente(id);

alter table public.proyecto_calculo
  add column if not exists nivel_detalle  text,
  add column if not exists regla_aplicada text check (regla_aplicada in ('completa','provisoria')),
  add column if not exists confianza      text check (confianza in ('alta','media','baja'));

-- notion_id deja de ser obligatorio: los registros del Gestor no lo tienen.
do $$ declare t text; begin
  foreach t in array array['proyecto','etapa','bloqueo','tarea'] loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = t
                 and column_name = 'notion_id' and is_nullable = 'NO') then
      execute format('alter table public.%I alter column notion_id drop not null', t);
    end if;
  end loop;
end $$;

create unique index if not exists etapa_fuente_origen_uk   on public.etapa   (fuente_id, id_origen) where id_origen is not null;
create unique index if not exists tarea_fuente_origen_uk   on public.tarea   (fuente_id, id_origen) where id_origen is not null;
create unique index if not exists bloqueo_fuente_origen_uk on public.bloqueo (fuente_id, id_origen) where id_origen is not null;
create index if not exists proyecto_area_idx  on public.proyecto (area_id);
create index if not exists proyecto_fase_idx  on public.proyecto (fase_macro);

-- ─────────────────────────────────────────────────────────────
-- 4. Datos base (revisar y ajustar áreas/alias a la realidad de la empresa)
-- ─────────────────────────────────────────────────────────────
insert into public.area (codigo, nombre) values
  ('innovacion','Innovación'), ('customer-support','Customer Support'), ('comercial','Comercial'),
  ('marketing','Marketing'), ('market-research','Market Research'), ('legal','Legal'),
  ('operaciones','Operaciones'), ('compliance','Compliance'), ('seguridad','Seguridad'),
  ('tecnologia','Tecnología'), ('bi','BI & Analítica'), ('sin-clasificar','Sin clasificar')
on conflict (codigo) do nothing;

insert into public.area_alias (alias_normalizado, area_id)
select public.normalizar_texto(a.alias), ar.id
from (values
  ('Innovation','innovacion'), ('Innovación','innovacion'),
  ('Customer Support','customer-support'),
  ('Comercial','comercial'), ('Área Comercial','comercial'), ('Comercial Argentina','comercial'),
  ('Marketing','marketing'), ('Market research','market-research'),
  ('Legal','legal'), ('Legal-KAM','legal'),
  ('Operaciones','operaciones'), ('Compliance','compliance'), ('Seguridad','seguridad'),
  ('Tecnología','tecnologia'), ('Tecnología/DDI','tecnologia'),
  ('BI & Analítica','bi'), ('Sin clasificar','sin-clasificar')
) a(alias, codigo)
join public.area ar on ar.codigo = a.codigo
on conflict (alias_normalizado) do nothing;

-- Fuentes. El Gestor queda inactivo hasta tener sus vistas ce_export y credenciales.
insert into public.fuente (codigo, tipo, nombre, nivel_detalle, prioridad, activa, config) values
  ('notion_seguimiento', 'notion', 'Notion · Seguimiento de proyectos', 'N1', 10, true,
   '{"campos":{"nombre":"Proyecto","area":"Sponsor/Área","estado":"Estado","responsable_email":"Responsable",
     "fecha_inicio":"Inicio","fecha_comprometida":"Fecha objetivo","objetivo":"Objetivo","prioridad":"Prioridad",
     "impacto":"Impacto","alcance":"Alcance","proximo_paso":"Próximo paso",
     "decisiones_pendientes":"Decisiones pendientes","riesgos":"Riesgos/Bloqueos","avance":"Avance",
     "salud":"Salud","actualizado_en":"Última actualización","codigo_gestor":"Código Gestor"}}'::jsonb),
  ('gestor_wwp', 'gestor', 'WWP Gestor de Proyectos', 'N3', 100, false,
   '{"esquema":"ce_export"}'::jsonb)
on conflict (codigo) do nothing;

update public.fuente set area_defecto_id = (select id from public.area where codigo = 'innovacion')
where codigo = 'gestor_wwp' and area_defecto_id is null;

insert into public.mapeo_estado (fuente_id, valor_normalizado, valor_origen, fase_macro, orden)
select f.id, public.normalizar_texto(m.valor), m.valor, m.fase::public.fase_macro, m.orden
from (values
  ('notion_seguimiento','Idea / Backlog','Idea',1),
  ('notion_seguimiento','Discovery','Discovery',2),
  ('notion_seguimiento','Diseño','Diseño',3),
  ('notion_seguimiento','Implementación','Ejecución',4),
  ('notion_seguimiento','Ejecución','Ejecución',4),
  ('notion_seguimiento','Seguimiento','Seguimiento',5),
  ('notion_seguimiento','Cerrado','Cerrado',6),
  ('notion_seguimiento','Cancelado','Cancelado',null),
  ('gestor_wwp','POR_INICIAR','Idea',1),
  ('gestor_wwp','ACTIVO','Ejecución',4),
  ('gestor_wwp','FINALIZADO','Cerrado',6),
  ('gestor_wwp','EN_PAUSA','Pausado',null),
  ('gestor_wwp','CANCELADO','Cancelado',null)
) m(fuente, valor, fase, orden)
join public.fuente f on f.codigo = m.fuente
on conflict (fuente_id, valor_normalizado) do nothing;

insert into public.mapeo_motivo (fuente_id, area_id, motivo)
select f.id, a.id, m.motivo
from (values ('seguridad','Seguridad'), ('tecnologia','Infraestructura')) m(area, motivo)
join public.fuente f on f.codigo = 'gestor_wwp'
join public.area a on a.codigo = m.area
on conflict (fuente_id, area_id) do nothing;

insert into public.parametro (clave, valor) values
  ('sync_horarios', '["08:00","13:00","18:00"]'::jsonb),
  ('sync_dias', '"lunes a viernes"'::jsonb)
on conflict (clave) do nothing;

-- Backfill de los proyectos existentes del prototipo (vienen de Notion)
insert into public.proyecto_fuente (proyecto_id, fuente_id, id_origen, vinculado_por)
select p.id, f.id, p.notion_id, 'auto'
from public.proyecto p
join public.fuente f on f.codigo = 'notion_seguimiento'
where p.notion_id is not null
on conflict (fuente_id, id_origen) do nothing;

update public.proyecto p
set area_id = coalesce(p.area_id,
                       (select aa.area_id from public.area_alias aa
                        where aa.alias_normalizado = public.normalizar_texto(p.area_solicitante)),
                       (select id from public.area where codigo = 'sin-clasificar')),
    fuente_principal_id = coalesce(p.fuente_principal_id,
                                   (select id from public.fuente where codigo = 'notion_seguimiento')),
    nivel_detalle = case when exists (select 1 from public.etapa e where e.proyecto_id = p.id)
                         then 'N2' else p.nivel_detalle end
where p.area_id is null or p.fuente_principal_id is null;

-- ─────────────────────────────────────────────────────────────
-- 5. Vistas (nuevas; las existentes del front no se tocan)
-- ─────────────────────────────────────────────────────────────
create or replace view public.v_proyecto_canonico with (security_invoker = true) as
select p.id, p.codigo_visible, p.nombre, p.descripcion, p.objetivo,
       a.id as area_id, a.nombre as area_nombre, a.codigo as area_codigo,
       p.fase_macro, p.estado_origen, p.nivel_detalle,
       f.codigo as fuente_principal, f.tipo as fuente_tipo, p.url_principal,
       p.prioridad, p.impacto, p.alcance, p.proximo_paso, p.decisiones_pendientes, p.riesgos_texto,
       p.fecha_inicio, p.fecha_comprometida,
       r.nombre  as responsable_nombre,
       rc.nombre as responsable_comunicar_nombre,
       p.avance_declarado, p.salud_declarada, p.actualizado_origen_en, p.sincronizado_en,
       c.regla_aplicada, c.confianza
from public.proyecto p
left join public.area     a  on a.id  = p.area_id
left join public.fuente   f  on f.id  = p.fuente_principal_id
left join public.persona  r  on r.id  = p.responsable_id
left join public.persona  rc on rc.id = p.responsable_comunicar_id
left join public.proyecto_calculo c on c.proyecto_id = p.id
where coalesce(p.eliminado, false) = false;

create or replace view public.v_fuente_estado with (security_invoker = true) as
select f.codigo, f.nombre, f.tipo, f.nivel_detalle, f.activa,
       s.inicio as ultima_sync, s.fin, s.estado, s.leidos, s.creados, s.actualizados, s.eliminados, s.errores
from public.fuente f
left join lateral (
  select * from public.sync_ejecucion se where se.fuente_id = f.id order by se.inicio desc limit 1
) s on true;

-- ─────────────────────────────────────────────────────────────
-- 6. RLS de las tablas nuevas (las del prototipo no cambian)
-- ─────────────────────────────────────────────────────────────
alter table public.area            enable row level security;
alter table public.area_alias      enable row level security;
alter table public.fuente          enable row level security;
alter table public.persona         enable row level security;
alter table public.mapeo_estado    enable row level security;
alter table public.mapeo_motivo    enable row level security;
alter table public.proyecto_fuente enable row level security;
alter table public.sync_ejecucion  enable row level security;

do $$ declare t text; begin
  foreach t in array array['area','area_alias','fuente','persona','mapeo_estado','mapeo_motivo'] loop
    execute format('drop policy if exists %I on public.%I', t || '_leer', t);
    -- persona y fuente NO se leen libremente: su lectura la define 20261117000300_acceso_por_perfil.sql
    if t not in ('persona', 'fuente') then
      execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_leer', t);
    end if;
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for all to authenticated
                    using (public.app_rol()::text = ''Admin'') with check (public.app_rol()::text = ''Admin'')',
                   t || '_admin', t);
  end loop;
end $$;

drop policy if exists proyecto_fuente_leer on public.proyecto_fuente;
create policy proyecto_fuente_leer on public.proyecto_fuente
  for select to authenticated using (public.proyecto_visible(proyecto_id));

drop policy if exists proyecto_fuente_admin on public.proyecto_fuente;
create policy proyecto_fuente_admin on public.proyecto_fuente
  for all to authenticated
  using (public.app_rol()::text = 'Admin') with check (public.app_rol()::text = 'Admin');

drop policy if exists sync_ejecucion_admin on public.sync_ejecucion;
create policy sync_ejecucion_admin on public.sync_ejecucion
  for select to authenticated using (public.app_rol()::text = 'Admin');
