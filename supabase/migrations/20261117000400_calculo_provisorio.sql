-- Comando Estelar · Cálculo provisorio en SQL para proyectos N1 (Notion)
-- Permite tener fecha, avance y semáforo sin esperar la Edge Function "recalcular".
-- Cuando exista la Edge Function, esta sigue sirviendo para N1; N2/N3 usan la regla completa.

-- Días hábiles entre dos fechas (excluye sábados, domingos y la tabla feriado). Positivo si hasta > desde.
create or replace function public.dias_habiles(desde date, hasta date) returns int
language sql stable set search_path = public as $$
  select case when desde is null or hasta is null then null
              when hasta >= desde then (
                select count(*)::int from generate_series(desde + 1, hasta, interval '1 day') g(d)
                where extract(isodow from g.d) < 6 and not exists (select 1 from feriado f where f.fecha = g.d::date))
              else -(
                select count(*)::int from generate_series(hasta + 1, desde, interval '1 day') g(d)
                where extract(isodow from g.d) < 6 and not exists (select 1 from feriado f where f.fecha = g.d::date))
         end
$$;

create or replace function public.recalcular_provisorio(p_proyectos uuid[] default null) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_umbral_rojo int := coalesce((select (valor #>> '{}')::int from parametro where clave = 'umbral_atraso_rojo_dh'), 5);
  v_frescura    int := coalesce((select (valor #>> '{}')::int from parametro where clave = 'dias_frescura'), 7);
  v_hoy         date := (now() at time zone 'America/Santiago')::date;
  v_n           int := 0;
  p             record;
  v_total int; v_comp int; v_actual uuid; v_avance numeric; v_atraso int;
  v_sem semaforo; v_motivos text[]; v_alertas text[]; v_ult timestamptz; v_salud text;
begin
  for p in
    select pr.* from proyecto pr
    where not pr.eliminado
      and coalesce(pr.nivel_detalle, 'N1') = 'N1'
      and (p_proyectos is null or pr.id = any (p_proyectos))
  loop
    select count(*), count(*) filter (where estado = 'Completada'),
           (array_agg(id order by orden) filter (where estado = 'En curso'))[1]
      into v_total, v_comp, v_actual
    from etapa where proyecto_id = p.id and not eliminado;

    -- Avance: el declarado en Notion (acepta 0–1 o 0–100); si no hay, por etapas
    v_avance := case
      when p.fase_macro = 'Cerrado' then 100
      when coalesce(p.avance_declarado, 0) > 0 then
        least(100, case when p.avance_declarado <= 1 then p.avance_declarado * 100 else p.avance_declarado end)
      when v_total > 0 then round(v_comp * 100.0 / v_total, 2)
      else 0 end;

    -- Atraso solo mientras no se ha entregado (Seguimiento = ya entregado, en monitoreo)
    v_atraso := case when p.fecha_comprometida is not null
                      and p.fase_macro in ('Idea','Discovery','Diseño','Ejecución')
                     then greatest(0, dias_habiles(p.fecha_comprometida, v_hoy)) end;

    v_salud   := lower(public.normalizar_texto(coalesce(p.salud_declarada, '')));
    v_motivos := '{}';
    if p.salud_declarada is not null then
      v_motivos := v_motivos || ('Salud declarada en Notion: ' || p.salud_declarada);
    end if;

    v_sem := case
      when p.fase_macro = 'Cancelado' then 'gris'
      when p.fase_macro = 'Cerrado'   then 'verde'
      when v_salud in ('bloqueado','critico','enriesgo','atrasado','rojo') then 'rojo'
      when coalesce(v_atraso, 0) > v_umbral_rojo then 'rojo'
      when v_salud in ('atencion','amarillo') or coalesce(v_atraso, 0) > 0 then 'amarillo'
      when v_salud in ('encontrol','verde') then 'verde'
      else 'gris' end;

    if coalesce(v_atraso, 0) > 0 then
      v_motivos := v_motivos || ('Fecha objetivo vencida hace ' || v_atraso || ' días hábiles');
    end if;
    if p.fecha_comprometida is null and p.fase_macro in ('Idea','Discovery','Diseño','Ejecución') then
      v_motivos := v_motivos || 'Sin fecha objetivo en Notion'::text;
    end if;

    v_alertas := array_remove(array[
      case when p.fecha_comprometida is null and p.fase_macro in ('Discovery','Diseño','Ejecución') then 'sin_fecha' end,
      case when p.responsable_id is null then 'sin_responsable' end,
      case when p.area_id is null or p.area_id = (select id from area where codigo = 'sin-clasificar') then 'sin_area' end
    ], null);

    select greatest(p.actualizado_origen_en, max(e.detectado_en)) into v_ult
    from evento_cambio e where e.proyecto_id = p.id;

    insert into proyecto_calculo as c (
      proyecto_id, etapa_actual_id, avance_pct, etapas_completadas, etapas_total, fecha_reproyectada,
      atraso_dh, semaforo, motivos_semaforo, bloqueos_abiertos, ultima_actualizacion, sin_actualizar,
      alertas_gobierno, desglose, cerrado, calculado_en, nivel_detalle, regla_aplicada, confianza)
    values (
      p.id, v_actual, v_avance, v_comp, v_total, p.fecha_comprometida,
      v_atraso, v_sem, v_motivos,
      (select count(*) from bloqueo b where b.proyecto_id = p.id and b.fecha_cierre is null and not b.eliminado),
      v_ult, v_ult is not null and v_ult < now() - make_interval(days => v_frescura),
      v_alertas,
      jsonb_build_object('regla', 'provisoria', 'salud_declarada', p.salud_declarada,
                         'avance_declarado', p.avance_declarado, 'fase_macro', p.fase_macro),
      p.fase_macro in ('Cerrado','Cancelado'), now(), 'N1', 'provisoria', 'baja')
    on conflict (proyecto_id) do update set
      etapa_actual_id = excluded.etapa_actual_id, avance_pct = excluded.avance_pct,
      etapas_completadas = excluded.etapas_completadas, etapas_total = excluded.etapas_total,
      fecha_reproyectada = excluded.fecha_reproyectada, atraso_dh = excluded.atraso_dh,
      semaforo = excluded.semaforo, motivos_semaforo = excluded.motivos_semaforo,
      bloqueos_abiertos = excluded.bloqueos_abiertos, ultima_actualizacion = excluded.ultima_actualizacion,
      sin_actualizar = excluded.sin_actualizar, alertas_gobierno = excluded.alertas_gobierno,
      desglose = excluded.desglose, cerrado = excluded.cerrado, calculado_en = excluded.calculado_en,
      nivel_detalle = excluded.nivel_detalle, regla_aplicada = excluded.regla_aplicada, confianza = excluded.confianza;

    insert into proyeccion_snapshot (proyecto_id, fecha, fecha_reproyectada, atraso_dh, semaforo)
    values (p.id, v_hoy, p.fecha_comprometida, v_atraso, v_sem)
    on conflict (proyecto_id, fecha) do update set
      fecha_reproyectada = excluded.fecha_reproyectada, atraso_dh = excluded.atraso_dh, semaforo = excluded.semaforo;

    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

revoke all on function public.recalcular_provisorio(uuid[]) from public, anon, authenticated;
grant execute on function public.recalcular_provisorio(uuid[]) to service_role;
