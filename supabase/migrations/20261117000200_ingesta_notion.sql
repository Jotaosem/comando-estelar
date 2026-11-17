-- Comando Estelar · Ingesta de Notion (nivel N1)
-- n8n escribe filas crudas en ingesta_cruda y luego llama a procesar_ingesta_n1().
-- La función normaliza al modelo canónico, registra cambios y deja el resumen en sync_ejecucion.
-- Requiere 20261117000100_modelo_canonico.sql.

create table if not exists public.ingesta_cruda (
  id            bigserial primary key,
  run_id        text not null,
  fuente_codigo text not null,
  entidad       text not null default 'proyecto',
  id_origen     text not null,
  payload       jsonb not null,
  recibido_en   timestamptz not null default now(),
  procesado_en  timestamptz,
  unique (run_id, fuente_codigo, entidad, id_origen)
);
create index if not exists ingesta_cruda_run_idx on public.ingesta_cruda (run_id, fuente_codigo);

-- Solo service_role (n8n). Sin políticas para usuarios.
alter table public.ingesta_cruda enable row level security;
revoke all on public.ingesta_cruda from anon, authenticated;

-- Etapas derivadas de la fase macro (proyectos N1 sin etapas propias)
create or replace function public.generar_etapas_derivadas(p_proyecto uuid, p_fuente uuid, p_fase public.fase_macro)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_actual int;
  s record;
begin
  select min(orden) into v_actual from mapeo_estado where fuente_id = p_fuente and fase_macro = p_fase;
  if v_actual is null then
    return;  -- Pausado / Cancelado / sin mapeo: se conservan las etapas como estaban
  end if;

  for s in
    select fase_macro, min(orden) as orden
    from mapeo_estado
    where fuente_id = p_fuente and orden is not null
    group by fase_macro
    order by 2
  loop
    insert into etapa (proyecto_id, nombre, orden, estado, fuente_id, id_origen, origen)
    values (
      p_proyecto, s.fase_macro::text, s.orden,
      (case when p_fase = 'Cerrado' or s.orden < v_actual then 'Completada'
            when s.orden = v_actual then 'En curso'
            else 'Pendiente' end)::etapa_estado,
      p_fuente, p_proyecto::text || ':' || s.fase_macro::text, 'estado_derivado'
    )
    on conflict (fuente_id, id_origen) where id_origen is not null
    do update set estado = excluded.estado, orden = excluded.orden;
  end loop;
end $$;

create or replace function public.procesar_ingesta_n1(p_run_id text, p_fuente text, p_completo boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_fuente     fuente%rowtype;
  v_sync       uuid;
  r            record;
  v_area       uuid;
  v_area_nom   text;
  v_persona    uuid;
  v_pers_nom   text;
  v_email      text;
  v_map        mapeo_estado%rowtype;
  v_old        proyecto%rowtype;
  v_new        proyecto%rowtype;
  v_proy       uuid;
  v_vinculado  uuid;
  v_manda      boolean;
  v_ord_old    int;
  v_nombre     text;
  v_fcomp      date;
  v_sin_area   uuid;
  v_leidos     int := 0;
  v_creados    int := 0;
  v_act        int := 0;
  v_elim       int := 0;
  v_errores    jsonb := '[]'::jsonb;
  v_afectados  uuid[] := '{}';
  v_ids        text[] := '{}';
begin
  select * into v_fuente from fuente where codigo = p_fuente and activa;
  if not found then raise exception 'La fuente % no existe o está inactiva', p_fuente; end if;
  if v_fuente.tipo <> 'notion' then raise exception 'procesar_ingesta_n1 solo procesa fuentes Notion'; end if;
  select id into v_sin_area from area where codigo = 'sin-clasificar';

  insert into sync_ejecucion (fuente_id, run_id) values (v_fuente.id, p_run_id)
  on conflict (fuente_id, run_id) do update set inicio = now(), fin = null, estado = 'en_curso'
  returning id into v_sync;

  for r in
    select * from ingesta_cruda
    where run_id = p_run_id and fuente_codigo = p_fuente and entidad = 'proyecto'
    order by id
  loop
    begin
      v_leidos := v_leidos + 1;
      v_ids := v_ids || r.id_origen;
      v_nombre := coalesce(nullif(trim(r.payload->>'nombre'), ''), 'Sin nombre');
      v_fcomp := nullif(r.payload->>'fecha_comprometida', '')::date;

      -- Área por alias
      v_area := null;
      select aa.area_id into v_area from area_alias aa
      where aa.alias_normalizado = normalizar_texto(r.payload->>'area');
      v_area := coalesce(v_area, v_fuente.area_defecto_id, v_sin_area);
      select nombre into v_area_nom from area where id = v_area;

      -- Persona responsable por email
      v_persona := null; v_pers_nom := null;
      v_email := lower(nullif(trim(r.payload->>'responsable_email'), ''));
      if v_email is not null then
        insert into persona (email, nombre)
        values (v_email, coalesce(nullif(r.payload->>'responsable_nombre', ''),
                                  initcap(replace(split_part(v_email, '@', 1), '.', ' '))))
        on conflict (email) do update set actualizado_en = now()
        returning id, nombre into v_persona, v_pers_nom;
      end if;

      -- Estado → fase macro
      v_map := null;
      select * into v_map from mapeo_estado m
      where m.fuente_id = v_fuente.id and m.valor_normalizado = normalizar_texto(r.payload->>'estado');

      -- ¿Ya existe desde esta fuente?
      v_old := null; v_vinculado := null; v_manda := true;
      select p.* into v_old
      from proyecto p join proyecto_fuente pf on pf.proyecto_id = p.id
      where pf.fuente_id = v_fuente.id and pf.id_origen = r.id_origen;

      -- ¿Se vincula a otra fuente por código (ej. Código Gestor)?
      if v_old.id is null and nullif(r.payload->>'codigo_gestor', '') is not null then
        select pf.proyecto_id into v_vinculado from proyecto_fuente pf
        where pf.codigo_origen = r.payload->>'codigo_gestor' limit 1;
        if v_vinculado is not null then
          insert into proyecto_fuente (proyecto_id, fuente_id, id_origen, url_origen, vinculado_por)
          values (v_vinculado, v_fuente.id, r.id_origen, r.payload->>'url', 'auto_codigo')
          on conflict (fuente_id, id_origen) do nothing;
          select * into v_old from proyecto where id = v_vinculado;
        end if;
      end if;

      if v_old.id is null then
        -- Proyecto nuevo
        insert into proyecto (
          nombre, notion_id, area_solicitante, area_id, fase_macro, estado_origen, descripcion, objetivo,
          prioridad, impacto, alcance, responsable_id, responsable_comunicar_id,
          responsable_comunicar_email, responsable_comunicar_nombre,
          fecha_inicio, fecha_comprometida, proximo_paso, decisiones_pendientes, riesgos_texto,
          avance_declarado, salud_declarada, nivel_detalle, fuente_principal_id, url_principal,
          actualizado_origen_en, sincronizado_en, eliminado)
        values (
          v_nombre, r.id_origen, v_area_nom, v_area, v_map.fase_macro, r.payload->>'estado',
          nullif(r.payload->>'objetivo', ''), nullif(r.payload->>'objetivo', ''),
          nullif(r.payload->>'prioridad', ''), nullif(r.payload->>'impacto', ''), nullif(r.payload->>'alcance', ''),
          v_persona, v_persona, v_email, v_pers_nom,
          nullif(r.payload->>'fecha_inicio', '')::date, v_fcomp,
          nullif(r.payload->>'proximo_paso', ''), nullif(r.payload->>'decisiones_pendientes', ''),
          nullif(r.payload->>'riesgos', ''),
          nullif(r.payload->>'avance', '')::numeric, nullif(r.payload->>'salud', ''),
          v_fuente.nivel_detalle, v_fuente.id, r.payload->>'url',
          nullif(r.payload->>'actualizado_en', '')::timestamptz, now(), false)
        returning id into v_proy;

        insert into proyecto_fuente (proyecto_id, fuente_id, id_origen, url_origen, vinculado_por)
        values (v_proy, v_fuente.id, r.id_origen, r.payload->>'url', 'auto');

        insert into evento_cambio (proyecto_id, entidad, entidad_id, campo, valor_anterior, valor_nuevo, tipo, fuente_id)
        values (v_proy, 'proyecto', v_proy, 'proyecto', null, to_jsonb(v_nombre), 'creado', v_fuente.id);
        v_creados := v_creados + 1;

      else
        v_proy := v_old.id;
        -- Esta fuente manda si es la principal o tiene igual/mayor prioridad
        v_manda := v_old.fuente_principal_id is null
                   or v_old.fuente_principal_id = v_fuente.id
                   or v_fuente.prioridad >= (select prioridad from fuente where id = v_old.fuente_principal_id);

        if v_manda then
          if v_map.fase_macro is not null and v_old.fase_macro is distinct from v_map.fase_macro then
            select min(orden) into v_ord_old from mapeo_estado
            where fuente_id = v_fuente.id and fase_macro = v_old.fase_macro;
            insert into evento_cambio (proyecto_id, entidad, entidad_id, campo, valor_anterior, valor_nuevo, tipo, fuente_id)
            values (v_proy, 'proyecto', v_proy, 'fase_macro',
                    to_jsonb(v_old.fase_macro::text), to_jsonb(v_map.fase_macro::text),
                    case when v_ord_old is not null and v_map.orden is not null and v_map.orden < v_ord_old
                         then 'retroceso' else 'actualizado' end,
                    v_fuente.id);
          end if;
          if v_old.fecha_comprometida is distinct from v_fcomp then
            insert into evento_cambio (proyecto_id, entidad, entidad_id, campo, valor_anterior, valor_nuevo, tipo, fuente_id)
            values (v_proy, 'proyecto', v_proy, 'fecha_comprometida',
                    to_jsonb(v_old.fecha_comprometida), to_jsonb(v_fcomp), 'actualizado', v_fuente.id);
          end if;
          if v_old.responsable_id is distinct from v_persona then
            insert into evento_cambio (proyecto_id, entidad, entidad_id, campo, valor_anterior, valor_nuevo, tipo, fuente_id)
            values (v_proy, 'proyecto', v_proy, 'responsable',
                    to_jsonb((select email from persona where id = v_old.responsable_id)), to_jsonb(v_email),
                    'actualizado', v_fuente.id);
          end if;
          if v_old.nombre is distinct from v_nombre then
            insert into evento_cambio (proyecto_id, entidad, entidad_id, campo, valor_anterior, valor_nuevo, tipo, fuente_id)
            values (v_proy, 'proyecto', v_proy, 'nombre', to_jsonb(v_old.nombre), to_jsonb(v_nombre), 'actualizado', v_fuente.id);
          end if;

          update proyecto set
            nombre                       = v_nombre,
            area_id                      = v_area,
            area_solicitante             = v_area_nom,
            fase_macro                   = coalesce(v_map.fase_macro, fase_macro),
            estado_origen                = r.payload->>'estado',
            descripcion                  = coalesce(descripcion, nullif(r.payload->>'objetivo', '')),
            objetivo                     = nullif(r.payload->>'objetivo', ''),
            prioridad                    = nullif(r.payload->>'prioridad', ''),
            impacto                      = nullif(r.payload->>'impacto', ''),
            alcance                      = nullif(r.payload->>'alcance', ''),
            responsable_id               = v_persona,
            responsable_comunicar_id     = coalesce(responsable_comunicar_id, v_persona),
            responsable_comunicar_email  = coalesce(responsable_comunicar_email, v_email),
            responsable_comunicar_nombre = coalesce(responsable_comunicar_nombre, v_pers_nom),
            fecha_inicio                 = nullif(r.payload->>'fecha_inicio', '')::date,
            fecha_comprometida           = v_fcomp,
            avance_declarado             = nullif(r.payload->>'avance', '')::numeric,
            salud_declarada              = nullif(r.payload->>'salud', ''),
            url_principal                = r.payload->>'url',
            actualizado_origen_en        = nullif(r.payload->>'actualizado_en', '')::timestamptz,
            eliminado                    = false
          where id = v_proy;
        end if;

        -- Campos que solo trae Notion: se actualizan siempre
        update proyecto set
          proximo_paso          = nullif(r.payload->>'proximo_paso', ''),
          decisiones_pendientes = nullif(r.payload->>'decisiones_pendientes', ''),
          riesgos_texto         = nullif(r.payload->>'riesgos', ''),
          sincronizado_en       = now()
        where id = v_proy;
        -- Solo cuenta como actualizado si cambió algo además de la marca de sincronización
        select * into v_new from proyecto where id = v_proy;
        if (to_jsonb(v_old) - 'sincronizado_en') is distinct from (to_jsonb(v_new) - 'sincronizado_en') then
          v_act := v_act + 1;
        end if;
      end if;

      -- Etapas derivadas solo para proyectos sin detalle propio
      if v_manda and (select nivel_detalle from proyecto where id = v_proy) = 'N1' then
        perform generar_etapas_derivadas(v_proy, v_fuente.id,
                                         coalesce(v_map.fase_macro, (select fase_macro from proyecto where id = v_proy)));
      end if;

      v_afectados := v_afectados || v_proy;
      update ingesta_cruda set procesado_en = now() where id = r.id;

    exception when others then
      v_errores := v_errores || jsonb_build_object('id_origen', r.id_origen, 'error', sqlerrm);
    end;
  end loop;

  -- Bajas: solo con lectura completa, sin errores y con datos (una lectura vacía es sospechosa)
  if p_completo and v_leidos > 0 and jsonb_array_length(v_errores) = 0 then
    with borrados as (
      update proyecto p set eliminado = true, sincronizado_en = now()
      from proyecto_fuente pf
      where pf.proyecto_id = p.id
        and pf.fuente_id = v_fuente.id
        and p.fuente_principal_id = v_fuente.id
        and not (pf.id_origen = any (v_ids))
        and coalesce(p.eliminado, false) = false
      returning p.id
    )
    insert into evento_cambio (proyecto_id, entidad, entidad_id, campo, valor_anterior, valor_nuevo, tipo, fuente_id)
    select id, 'proyecto', id, 'proyecto', null, null, 'eliminado', v_fuente.id from borrados;
    get diagnostics v_elim = row_count;
  end if;

  update sync_ejecucion set
    fin          = now(),
    estado       = case when jsonb_array_length(v_errores) = 0 then 'ok'
                        when v_leidos > jsonb_array_length(v_errores) then 'parcial'
                        else 'error' end,
    leidos       = v_leidos,
    creados      = v_creados,
    actualizados = v_act,
    eliminados   = v_elim,
    errores      = v_errores
  where id = v_sync;

  return jsonb_build_object(
    'run_id', p_run_id, 'fuente', p_fuente,
    'leidos', v_leidos, 'creados', v_creados, 'actualizados', v_act, 'eliminados', v_elim,
    'errores', v_errores, 'proyectos_afectados', to_jsonb(v_afectados));
end $$;

-- proyectos_afectados incluye todos los leídos: el semáforo depende de la fecha de hoy y debe recalcularse en cada sync.

-- Solo n8n (service_role) puede ejecutar la ingesta
revoke all on function public.procesar_ingesta_n1(text, text, boolean) from public, anon, authenticated;
revoke all on function public.generar_etapas_derivadas(uuid, uuid, public.fase_macro) from public, anon, authenticated;
grant execute on function public.procesar_ingesta_n1(text, text, boolean) to service_role;
grant execute on function public.generar_etapas_derivadas(uuid, uuid, public.fase_macro) to service_role;

-- Limpieza sugerida (programar semanal): borrar ingestas procesadas de más de 30 días
-- delete from public.ingesta_cruda where procesado_en < now() - interval '30 days';
