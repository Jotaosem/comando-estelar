# Arquitectura de datos transversal — Comando Estelar

> Implementación: `supabase/migrations/20261117000000` → `20261117000400` (base, modelo canónico, ingesta Notion, acceso por perfil, cálculo provisorio). Adaptador n8n: `n8n/n8n_adaptador_notion.js`.

> Ubicación sugerida en el repo: `docs/ARQUITECTURA_DATOS.md`. Es la referencia obligatoria para cualquier cambio de modelo de datos, sincronización o integración.

## 1. Objetivo y alcance

Comando Estelar es la **capa de consulta transversal** del avance de proyectos de todas las áreas de la empresa.

- **No es fuente de verdad.** Cada área sigue editando donde ya trabaja: Notion (varias bases, distintas áreas), WWP Gestor de Proyectos (Innovación) y, a futuro, otras fuentes.
- **Funciona de forma independiente**, con su propio Supabase, login y vistas.
- **Se integra con el Gestor** en dos sentidos: lee sus datos (solo lectura) y se puede abrir desde el Gestor con un enlace directo a cada proyecto.
- **Sincronización:** n8n trae los datos 3 veces al día, los normaliza y los entrega a Supabase. La app consume solo Supabase.

```
 Notion (N bases, varias áreas) ─┐
 WWP Gestor (vistas solo lectura) ┼─► n8n (3×/día) ─► ingesta_cruda + RPC SQL ──► Supabase (modelo canónico)
 Futuras fuentes ────────────────┘        adaptadores por fuente                       │
                                                                                         ▼
                                                     Comando Estelar (galaxia, tarjetas, tabla, copiloto, avisos)
                                                                                         ▲
                                                     WWP Gestor ── botón "Ver en Comando Estelar" (deep link)
```

## 2. Principios de diseño

1. **Modelo canónico único.** Todas las fuentes se traducen al mismo modelo. La UI y las reglas de cálculo nunca leen estructuras propias de una fuente.
2. **Adaptadores, no código por área.** Cada fuente es una fila en `fuente` con su mapeo de campos en JSON. Sumar un área nueva en Notion = agregar una fila y su mapeo, sin tocar código.
3. **Trazabilidad de origen.** Cada registro sabe de qué fuente viene (`fuente_id`, `id_origen`, `url_origen`) y la UI siempre ofrece "Abrir en la fuente".
4. **Niveles de detalle.** No todas las fuentes traen lo mismo. Cada proyecto tiene un `nivel_detalle` y la UI se adapta sin romperse.
5. **Solo lectura hacia las fuentes.** Comando Estelar nunca escribe en Notion ni en el Gestor.
6. **Sin fusiones automáticas.** Si un mismo proyecto existe en dos fuentes, se vincula de forma explícita (código o acción del admin), nunca por similitud de nombre.
7. **Historial propio.** Cada sincronización compara contra la anterior y registra los cambios en `evento_cambio`. Funciona igual para todas las fuentes.

## 3. Niveles de detalle

| Nivel | Qué trae la fuente | Fuente típica | Qué muestra la UI |
|---|---|---|---|
| **N1 Básico** | Proyecto, área, estado, responsable, fechas sueltas, riesgos en texto | Notion (seguimiento) | Órbita con etapas derivadas del estado. Semáforo provisorio. Sin tareas. Badge "Detalle básico". |
| **N2 Intermedio** | N1 + etapas con fechas o tareas | Notion con base de tareas relacionada | Órbita real si hay etapas; tareas en lista. |
| **N3 Completo** | Fases con fechas, tareas, bloqueos con responsable, historial de estados | WWP Gestor | Todo: fecha re-proyectada, semáforo calculado, retrocesos, bloqueos. Badge "Detalle completo". |

Regla de UI: cuando un dato no existe por el nivel, se muestra "No disponible en la fuente" (no un error ni un cero). El nivel aparece como badge en el HUD, las tarjetas y la tabla.

## 4. Modelo canónico (Supabase)

Las tablas actuales del prototipo se **extienden** (migración aditiva). Las vistas que consume el front mantienen sus columnas actuales y suman las nuevas.

### 4.1 Catálogos y fuentes

| Tabla | Columnas clave | Notas |
|---|---|---|
| `fuente` | id, codigo (único, ej. `notion_innovacion`, `gestor_wwp`), tipo (`notion` \| `gestor` \| `otro`), nombre, area_defecto_id, nivel_detalle, prioridad (int), config jsonb (mapeo de campos), activa, url_base | Una fila por base de Notion y una por el Gestor. `prioridad` decide qué fuente manda si un proyecto está vinculado a dos. |
| `area` | id, codigo (único), nombre, activa | Catálogo transversal normalizado (Compliance, Comercial, Operaciones, Customer Support, Marketing, Innovación, etc.). |
| `area_alias` | area_id, alias_normalizado (único) | Traduce textos libres de las fuentes ("Comercial Argentina (Patricio…)", "Área Comercial") a un área. Si no hay alias → área "Sin clasificar" + alerta de gobierno. |
| `persona` | id, email (único, minúsculas), nombre, area_id | Se crea/actualiza desde las fuentes. Clave de cruce con `usuario_rol`. |
| `mapeo_estado` | fuente_id, valor_origen, fase_macro, orden | Traduce estados de cada fuente a la fase macro canónica. |

**Fase macro canónica** (enum `fase_macro`): `Idea`, `Discovery`, `Diseño`, `Ejecución`, `Seguimiento`, `Cerrado`, `Pausado`, `Cancelado`. Sirve para filtrar y comparar proyectos de distintas áreas aunque cada una tenga su propio ciclo.

### 4.2 Proyectos y su origen

| Tabla | Columnas clave | Notas |
|---|---|---|
| `proyecto` | id (uuid canónico), codigo_visible, nombre, descripcion, objetivo, area_id, area_sponsor_id, fase_macro, estado_origen, prioridad, impacto, alcance, responsable_id → persona, responsable_comunicar_id → persona, sponsor_id → persona, fecha_inicio, fecha_comprometida, fecha_objetivo_origen, fecha_fin_real, proximo_paso, decisiones_pendientes, riesgos_texto, avance_declarado, salud_declarada, nivel_detalle, fuente_principal_id, url_principal, eliminado, actualizado_origen_en, sincronizado_en | `responsable_comunicar_id` por defecto = responsable (Notion) o líder (Gestor); editable por Admin en Comando Estelar. |
| `proyecto_fuente` | proyecto_id, fuente_id, id_origen, url_origen, codigo_origen, vinculado_por (`auto_codigo` \| `admin`), vinculado_en; único (fuente_id, id_origen) | Un proyecto canónico puede tener registros en varias fuentes. |

**Vinculación entre fuentes** (ej. "Auto Onboarding" en Notion y en el Gestor):
- Automática solo si la fila de Notion tiene la propiedad "Código Gestor" con un código existente (ej. `WWP-012` o `INN-…`).
- Si no, el Admin la vincula desde Administración → "Proyectos duplicados" (lista de candidatos por nombre normalizado, sin fusionar solo).
- Con vínculo, cada campo se toma de la fuente de mayor `prioridad` que lo tenga (Gestor > Notion). Los datos exclusivos de Notion (próximo paso, decisiones pendientes) se conservan.

### 4.3 Etapas, tareas, bloqueos

| Tabla | Columnas clave | Notas |
|---|---|---|
| `etapa` | id, proyecto_id, fuente_id, id_origen, origen (`fase` \| `estado_derivado`), nombre, orden, estado (Pendiente/En curso/Bloqueada/Completada), responsable_id, inicio_plan, fin_plan, inicio_real, fin_real, duracion_dh, gate_estado | N3: una etapa por fase del Gestor. N1: etapas generadas desde la secuencia de `mapeo_estado` de su fuente. |
| `tarea` | id, proyecto_id, etapa_id, fuente_id, id_origen, codigo, nombre, estado, prioridad, responsable_id, inicio_plan, fin_plan, inicio_real, fin_real | Solo N2/N3. |
| `bloqueo` | id, proyecto_id, etapa_id, tarea_id, fuente_id, id_origen, descripcion, motivo (enum, ver abajo), area_destraba_id, responsable_id, abierto_en, cerrado_en | N1: el texto de "Riesgos/Bloqueos" se guarda en `proyecto.riesgos_texto`, no como bloqueo. |
| `riesgo`, `decision` | opcionales, solo desde Gestor | Para el HUD y el copiloto. |

**Motivo del bloqueo** (enum): `Aprobación QA`, `Infraestructura`, `Seguridad`, `Dependencia`, `Decisión pendiente`, `Proveedor`, `Otro`. En el Gestor no existe la categoría: se infiere del área del responsable del bloqueo con una tabla `mapeo_motivo (fuente_id, area_id → motivo)`, y si no calza queda `Otro`. `area_destraba_id` = área del responsable.

### 4.4 Sincronización, historial y cálculo

| Tabla | Contenido |
|---|---|
| `sync_ejecucion` | id, fuente_id, inicio, fin, estado (`ok` \| `parcial` \| `error`), registros_leidos, creados, actualizados, eliminados, errores jsonb, run_id (idempotencia) |
| `evento_cambio` | (ya existe) + fuente_id. Solo inserción. |
| `proyecto_calculo` | (ya existe) + nivel_detalle, regla_aplicada (`completa` \| `provisoria`), confianza (`alta` \| `media` \| `baja`) |
| `proyeccion_snapshot` | (ya existe) |
| `feriado`, `sprint`, `parametro`, `aviso`, `usuario_rol`, `evento_uso`, `consulta_asistente`, `encuesta_respuesta` | Sin cambios de fondo. `usuario_rol` se cruza con `persona` por email. |

### 4.5 Reglas de cálculo según nivel

- **N3 (regla completa):** la del alcance técnico (días hábiles, etapas pendientes, +5 por bloqueo abierto, semáforo por atraso y antigüedad del bloqueo). Etapas = fases; duración = días hábiles entre `inicio_plan` y `fin_plan`; avance = criterio del Gestor (tareas finalizadas ponderadas) o etapas completadas.
- **N1 (regla provisoria, implementada en SQL: `recalcular_provisorio()`):**
  - Semáforo: Cancelado → gris; Cerrado → verde; salud declarada "Bloqueado/En riesgo/Atrasado" o atraso > `umbral_atraso_rojo_dh` → rojo; salud "Atención" o atraso > 0 → amarillo; "En control" → verde; "Sin evaluar" o vacío → gris.
  - Atraso: días hábiles desde la fecha objetivo, solo en Idea, Discovery, Diseño y Ejecución (Seguimiento ya está entregado).
  - Avance: el declarado en Notion (acepta 0–1 o 0–100); si no hay, etapas derivadas completadas / total; Cerrado = 100.
  - `motivos_semaforo` explica cada color; `alertas_gobierno`: sin_fecha, sin_responsable, sin_area. Guarda un `proyeccion_snapshot` diario.
- `regla_aplicada` y `confianza` se muestran en el popover "¿Cómo se calculó?".

### 4.6 Perfiles y acceso (RLS)

| Perfil (enum `rol`) | Proyectos con detalle |
|---|---|
| Admin | Todos + administración |
| Gerencia (UI: "Gerencia general") | Todos |
| Gerente de área | Donde alguna de sus áreas es la solicitante o la sponsor |
| Solicitante | Sus áreas (solicitante o sponsor) + asignados |
| Ejecutor | Donde participa (responsable, comunica, sponsor, etapa, tarea) + asignados |
| Sin perfil | Ninguno; solo la galaxia con resúmenes |

- Cualquier perfil ve además los proyectos donde participa o está asignado (`usuario_proyecto`).
- Áreas por usuario en `usuario_area` (varias). Perfiles los asigna el Admin; los responsables que llegan de Notion se crean como **Ejecutor** automáticamente (trigger en `persona`), sin pisar un perfil ya asignado.
- **Transparencia:** dentro de un proyecto visible se ve todo (riesgos, decisiones, bloqueos, tareas, historial). La profundidad por perfil es solo de experiencia (detalle colapsado para Gerencia, Gerente de área y Solicitante).
- `galaxia_resumen()` (security definer): resumen de todos los proyectos para todo usuario autenticado, con `puede_ver_detalle`. Parámetro `galaxia_resumen_global` (true por defecto).
- `persona`: solo nombres, de proyectos visibles; **el correo no se expone por la API**. `fuente.config` oculta. `sync_ejecucion` solo Admin; la hora de datos sale de `ultima_sincronizacion()`.
- `ingesta_cruda`, `procesar_ingesta_n1` y `recalcular_provisorio` solo con `service_role` (n8n).

## 5. Mapeo por fuente

### 5.1 Notion — base de seguimiento (N1)

`fuente.config` de ejemplo para la base actual:

```json
{
  "database_id": "<NOTION_DB_SEGUIMIENTO>",
  "nivel_detalle": "N1",
  "campos": {
    "nombre": "Proyecto",
    "area": "Sponsor/Área",
    "estado": "Estado",
    "responsable_email": "Responsable",
    "fecha_inicio": "Inicio",
    "fecha_comprometida": "Fecha objetivo",
    "objetivo": "Objetivo",
    "descripcion": "Objetivo",
    "prioridad": "Prioridad",
    "impacto": "Impacto",
    "alcance": "Alcance",
    "proximo_paso": "Próximo paso",
    "decisiones_pendientes": "Decisiones pendientes",
    "riesgos_texto": "Riesgos/Bloqueos",
    "avance_declarado": "Avance",
    "salud_declarada": "Salud",
    "actualizado_origen_en": "Última actualización",
    "codigo_gestor": "Código Gestor",
    "tareas_relacion": "Tareas semanales"
  },
  "limpieza": { "quitar_emojis": ["salud_declarada"] }
}
```

`mapeo_estado` para esta fuente:

| valor_origen | fase_macro | orden |
|---|---|---|
| Idea / Backlog | Idea | 1 |
| Discovery | Discovery | 2 |
| Diseño | Diseño | 3 |
| Implementación | Ejecución | 4 |
| Ejecución | Ejecución | 4 |
| Seguimiento | Seguimiento | 5 |
| Cerrado | Cerrado | 6 |
| Cancelado | Cancelado | — |

Notas:
- Los nombres exactos de las propiedades de Notion se confirman con el `id` de propiedad (no con el nombre visible) para que renombrar una columna en Notion no rompa la sync.
- Si una base tiene "Tareas semanales" relacionadas, el adaptador las lee y la fuente sube a N2.
- Otras áreas con otras bases = otra fila en `fuente` con su propio `config` y `mapeo_estado`.

### 5.2 WWP Gestor (N3)

| Canónico | Gestor (vistas `ce_export`) |
|---|---|
| proyecto | `v_proyectos` (projects + áreas + líder + sponsor) |
| codigo_visible | `code` |
| descripcion / objetivo | `short_description` / `objective` |
| area_id | `area_solicitante` (requesting_area) → `area_alias`; si es null, `area_sponsor` |
| fase_macro | `status`: POR_INICIAR→Idea, ACTIVO→Ejecución, FINALIZADO→Cerrado, EN_PAUSA→Pausado, CANCELADO→Cancelado |
| fecha_comprometida | `committed_target_date` |
| fecha_objetivo_origen | `target_date` |
| responsable / comunicar | `lider_*` |
| etapa | `v_fases` (estado derivado de sus tareas) |
| tarea | `v_tareas` |
| bloqueo | `v_bloqueos` |
| retrocesos | `v_retrocesos` (tarea FINALIZADA → otro estado; cierre REABIERTO) |

Lo que **no** se trae: métricas de valor, comité, OKR, canvas, documentos, comentarios, descripciones de tareas y adjuntos.

## 6. Flujo n8n (3 veces al día)

**Horario sugerido:** `CRON_TZ=America/Santiago 0 8,13,18 * * 1-5` (8:00, 13:00 y 18:00, lunes a viernes). Más un disparo manual desde Administración ("Sincronizar ahora", solo Admin).

**Workflow `wf_sync_transversal`:**
1. **Cron** → genera `run_id`.
2. **Leer fuentes activas** desde Supabase (`fuente` + `mapeo_estado`) con la service key guardada en credenciales de n8n.
3. **Split por fuente** (una rama por tipo):
   - `notion`: Query database con paginación (`has_more`/`start_cursor`), respetando ~3 req/s. Si hay relación de tareas, consulta la base de tareas.
   - `gestor`: nodo Postgres con el usuario `ce_reader`, `select * from ce_export.v_*`.
4. **Code node "adaptador"** por tipo: aplica `config.campos`, limpia textos/emojis, normaliza emails y fechas (ISO, zona America/Santiago) y arma el **payload canónico**:
   ```ts
   { run_id, fuente_codigo, leido_en, completo: true,
     proyectos: [...], etapas: [...], tareas: [...], bloqueos: [...], retrocesos: [...] }
   ```
5. **POST a `/rest/v1/ingesta_cruda?on_conflict=run_id,fuente_codigo,entidad,id_origen`** con `Prefer: resolution=merge-duplicates` (las `filas` del adaptador).
6. **RPC `procesar_ingesta_n1(p_run_id, p_fuente, p_completo)`** (implementada en SQL): resuelve áreas por alias, personas por email y vínculos por código; hace upsert; escribe `evento_cambio` (incluye `retroceso`); genera etapas derivadas en N1; marca eliminados **solo si** `completo=true`, hubo lectura y no hubo errores; registra `sync_ejecucion`; devuelve `proyectos_afectados`. Idempotente por `run_id + fuente`. "Actualizados" cuenta solo cambios reales.
6b. **RPC `recalcular_provisorio(p_proyectos)`** con `proyectos_afectados`. La Edge Function `recalcular` queda para N2/N3 (Gestor).
7. **Errores:** reintento ×3 con espera creciente por fuente. Si una fuente falla, las demás siguen; `sync_ejecucion.estado = parcial` y aviso por Slack al Admin. Nunca se borran datos por una lectura fallida.
8. **Avisos a Slack:** igual que hoy, pero el texto incluye el área y la fuente.

**Frescura con 3 sincronizaciones al día:**
- Cada vista muestra "Datos al dd/mm hh:mm (próxima actualización hh:mm)".
- El criterio del alcance técnico "cambio visible en ≤ 5 min" se reemplaza por "cambio visible en la siguiente sincronización (máx. ~5 h hábiles)". Hay que actualizarlo en el documento de alcance y en `AGENTS.md`, porque afecta H1.
- Si el piloto muestra que es poco, la mejora natural es que el Gestor avise a n8n por webhook cuando cambia un proyecto (sync bajo demanda solo de ese proyecto).

## 7. Integración con WWP Gestor

### 7.1 Gestor → Comando Estelar (lectura)
- En la base del Gestor se crea el esquema `ce_export` con vistas de solo lectura (SQL en el Anexo A) y un usuario `ce_reader` con permiso **solo** sobre esas vistas.
- `ce_export` **no** se expone en la API REST del Gestor. n8n se conecta por Postgres (pooler de Supabase) con credenciales guardadas en n8n.
- Lo crea el administrador del Gestor; requiere visto bueno de Ciberseguridad.

### 7.2 Comando Estelar dentro del Gestor (enlace)
- **Ruta resolvedora:** `https://<comando-estelar>/ir/{fuente_codigo}/{id_o_codigo_origen}` → busca en `proyecto_fuente` y redirige a `/proyectos/{id_canonico}` (o a la galaxia enfocada en ese planeta con `?vista=galaxia&p={id}`).
- En el Gestor: botón "Ver en Comando Estelar" en la ficha del proyecto que abre `…/ir/gestor_wwp/{code}` en una pestaña nueva.
- En Comando Estelar: botón "Abrir en Gestor" / "Abrir en Notion" con `url_origen`.
- **Embebido (fase posterior):** modo `?embed=1` (sin navbar, solo galaxia o detalle) para mostrarlo en un iframe del Gestor. Requiere `frame-ancestors` con el dominio del Gestor y validar que Cloudflare Access funcione dentro del iframe (las cookies de terceros suelen bloquearse). Se empieza con enlace, no con iframe.
- **Identidad:** ambos usan correo corporativo; el cruce de personas es por email en minúsculas.

## 8. Gobierno de datos (alertas)

Se muestran en Administración y como ícono en el HUD:
- Proyecto sin área reconocida (alias faltante).
- Sin responsable o sin responsable de comunicar.
- Sin fecha comprometida.
- Posible duplicado entre fuentes sin vincular.
- Fuente sin sincronizar en > 1 día hábil.
- N1: estado de origen sin mapeo en `mapeo_estado`.

## 9. Seguridad y privacidad

- Credenciales (Notion token de solo lectura, `ce_reader`, service key, `SYNC_SECRET`) solo en n8n y Supabase secrets.
- Datos reales nunca en el repo ni como fixtures. Los fixtures se generan ficticios, replicando forma y casos borde de cada fuente.
- No se sincronizan montos, métricas de valor, evaluaciones de comité ni comentarios.
- El copiloto sigue respondiendo solo con datos del modelo canónico y con los permisos del usuario.

## Anexo A — Vistas de solo lectura en el Gestor (para el administrador del Gestor)

```sql
create schema if not exists ce_export;

create or replace view ce_export.v_proyectos as
select p.id, p.code, p.name, p.short_description, p.objective, p.status::text as status,
       p.start_date, p.target_date, p.committed_target_date, p.actual_end,
       ra.name as area_solicitante, sa.name as area_sponsor,
       l.full_name as lider_nombre, lower(l.email) as lider_email,
       s.full_name as sponsor_nombre, lower(s.email) as sponsor_email,
       p.closure_approved_at, p.updated_at
from public.projects p
left join public.sponsor_areas ra on ra.id = p.requesting_area_id
left join public.sponsor_areas sa on sa.id = p.sponsor_area_id
left join public.profiles l on l.id = p.leader_id
left join public.profiles s on s.id = p.sponsor_id;

create or replace view ce_export.v_fases as
select f.id, f.project_id, f.code, f.name, f.position, f.planned_start, f.planned_end, f.gate_status,
       case
         when count(t.id) filter (where t.status <> 'CANCELADA') = 0 then 'Pendiente'
         when bool_and(t.status in ('FINALIZADA','CANCELADA')) then 'Completada'
         when bool_or(t.status = 'BLOQUEADA') then 'Bloqueada'
         when bool_or(t.status in ('EN_CURSO','EN_REVISION','FINALIZADA')) then 'En curso'
         else 'Pendiente'
       end as estado,
       min(t.actual_start)::date as inicio_real,
       case when bool_and(t.status in ('FINALIZADA','CANCELADA')) then max(t.actual_end) end as fin_real,
       count(t.id) filter (where t.status <> 'CANCELADA') as tareas_total,
       count(t.id) filter (where t.status = 'FINALIZADA') as tareas_finalizadas,
       greatest(f.updated_at, max(t.updated_at)) as updated_at
from public.project_phases f
left join public.project_tasks t on t.phase_id = f.id
group by f.id;

create or replace view ce_export.v_tareas as
select t.id, t.project_id, t.phase_id, t.code, t.name, t.status::text as status, t.priority::text as priority,
       o.full_name as responsable_nombre, lower(o.email) as responsable_email,
       t.planned_start, t.planned_end, t.actual_start, t.actual_end, t.updated_at
from public.project_tasks t
left join public.profiles o on o.id = t.owner_id
where t.status <> 'CANCELADA';

create or replace view ce_export.v_bloqueos as
select b.id, b.project_id, b.task_id, t.phase_id, b.description,
       o.full_name as responsable_nombre, lower(o.email) as responsable_email, o.area as responsable_area,
       b.started_at, b.resolved_at, b.status::text as status, b.updated_at
from public.blockers b
left join public.project_tasks t on t.id = b.task_id
left join public.profiles o on o.id = b.owner_id;

create or replace view ce_export.v_retrocesos as
select h.id, h.project_id, t.phase_id, h.task_id, 'tarea_reabierta' as tipo, h.occurred_at
from public.task_state_history h
join public.project_tasks t on t.id = h.task_id
where h.from_status = 'FINALIZADA' and h.to_status <> 'FINALIZADA'
union all
select e.id, e.project_id, null, null, 'cierre_reabierto', e.created_at
from public.project_closure_events e
where e.kind = 'REABIERTO';

-- Usuario de solo lectura para n8n (contraseña en el gestor de secretos, nunca en el repo)
create role ce_reader login password '<definir>' nosuperuser nocreatedb nocreaterole noinherit;
grant usage on schema ce_export to ce_reader;
grant select on all tables in schema ce_export to ce_reader;
revoke all on schema public, private from ce_reader;
```

Notas:
- Las vistas se crean con el dueño `postgres`, así que leen todas las filas; por eso `ce_reader` solo puede ver `ce_export` y nada más.
- No agregar `ce_export` a los esquemas expuestos de la API del Gestor.
- Ajustar los nombres de enum/estado si el Gestor cambia sus migraciones (verificar con su atlas de datos).
