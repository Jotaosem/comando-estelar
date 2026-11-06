# PROMPT MAESTRO — Prototipo "Comunicación de Avances de Proyectos"

> Uso: guarda este archivo en el repo como `AGENTS.md` (o `CLAUDE.md` si usas Claude Code). En cada sesión dile al agente: **"Lee AGENTS.md y docs/PROGRESO.md. Ejecuta la Fase N."** Una fase por sesión.

---

## 0. Rol y forma de trabajo

Eres un ingeniero full stack senior. Construyes un **prototipo 100% funcional** (no maqueta) que se pilotea sobre 1–2 proyectos reales. El líder técnico (José Miguel) revisa y prueba; tú implementas.

Reglas de trabajo (obligatorias, ahorran tokens):
1. Al iniciar: lee solo `AGENTS.md` y `docs/PROGRESO.md`. Abre otros archivos solo si la fase lo requiere.
2. Ejecuta **solo la fase pedida**. Al terminarla: corre sus pruebas, actualiza `docs/PROGRESO.md` (checklist + decisiones), haz commit `feat(fN): ...`, y detente.
3. No pegues archivos completos en el chat. Reporta: archivos creados/modificados, comandos para probar, resultado de pruebas, bloqueos. Máximo 15 líneas.
4. Si algo no está definido aquí: elige la opción más simple que cumpla los criterios, regístrala en `docs/DECISIONES.md` y sigue. Pregunta solo si estás bloqueado (credencial faltante, decisión irreversible).
5. Código completo: sin `TODO`, sin stubs, sin datos inventados fuera del seed. Tipado estricto (TS `strict: true`).
6. No agregues dependencias fuera de la sección 3 sin registrarlo en `DECISIONES.md` con motivo.
7. Nunca escribas secretos en el repo. Usa `.env.example` con nombres de variables y valores vacíos.
8. Notion es **solo lectura**. La app **no edita** proyectos, etapas, bloqueos ni tareas.
9. Antes de reportar cualquier fix, corre npm run test:e2e. Si algo falla, no entregues.

---

## 1. Contexto del producto (resumen del Discovery)

Problema: no existe una fuente única para consultar el estado de un proyecto; el % de avance no es auditable; las fechas no son confiables porque QA, Infraestructura o Seguridad pueden hacer retroceder un proyecto; nadie tiene la tarea explícita de comunicar; cada audiencia necesita distinta profundidad. Analogía repetida en las 8 entrevistas: **"seguimiento de un envío"**.

Objetivo: cualquier involucrado consulta en un solo lugar, sin preguntarle a nadie: en qué etapa va, fecha estimada, responsable y qué lo bloquea.

Hipótesis que el prototipo debe permitir medir:
| ID | Hipótesis | Piezas que la prueban |
|---|---|---|
| H1 | Consulta autónoma | Vista resumen, detalle, asistente IA |
| H2 | Fechas confiables | Bloqueos visibles, fecha re-proyectada con explicación, historial |
| H3 | Responsable de comunicar | Gobierno mínimo, aviso asistido a Slack |
| H4 | Profundidad según rol | Resumen (gerencia) vs detalle con tareas (operación), eventos de uso por rol |

**Fuera de alcance (no implementar):** Omnicanal (alertas/escalamiento automático a todos), predicción con modelo, generación automática de recursos (PPT/minutas/video), edición de proyectos desde la app, paso a producción.

---

## 2. Arquitectura

```
Ejecutores → Notion (solo lectura)
                │ API Notion, sync completo cada 5 min
                ▼
              n8n ──────────────► Slack (DM al responsable de comunicar / canal piloto)
                │ POST normalizado
                ▼
   Supabase: Postgres + RLS + Edge Functions (Deno/TS) ◄──► Claude API (asistente)
                ▲ supabase-js con JWT del usuario
                │
   App React (Vite) en Cloudflare Pages + Pages Function /api/session
                ▲ Cloudflare Access (correo corporativo)
   Gerencia / Solicitantes / Ejecutores / Admin
```

Principios:
- **Toda la lógica de negocio vive en `supabase/functions/_shared/`** como funciones puras testeables. n8n solo transporta (lee Notion, llama endpoints, envía Slack).
- El frontend lee datos **directo de Postgres vía supabase-js con RLS** (vistas `security_invoker`). Edge Functions solo para: ingesta, recálculo, publicar aviso, asistente.
- Los cálculos se **persisten** en `proyecto_calculo` tras cada sync y diariamente → la vista resumen es 1 query (<2 s).
- Fuente de datos intercambiable: `sync-ingest` recibe un payload normalizado; puede venir de n8n (Notion real) o del script local con fixtures. Así todo funciona en local sin Notion ni n8n.

---

## 3. Stack (decidido, no re-evaluar)

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + TypeScript, Tailwind, shadcn/ui, React Router, TanStack Query, date-fns, lucide-react (compatible con Lovable) |
| Auth | Cloudflare Access → Pages Function `/api/session` verifica `Cf-Access-Jwt-Assertion` (lib `jose`) y emite JWT de Supabase |
| BD | Supabase Postgres, migraciones SQL en `supabase/migrations`, RLS en todas las tablas |
| Backend | Supabase Edge Functions (Deno, TS) |
| IA | Claude vía Anthropic Messages API con tool use. Modelo por env `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`) |
| Integración | n8n (workflows exportados en JSON en `n8n/`) |
| Notificaciones | Slack Bot (`chat.postMessage`, `users.lookupByEmail`, interactividad) |
| Hosting | Cloudflare Pages (SPA, `_redirects`: `/* /index.html 200`) |
| Tests | `deno test` (reglas y ingesta), Vitest (utilidades front), scripts TS para RLS y eval del asistente |

Identidad visual: docs/marca/MARCA.html es la referencia obligatoria. Colores, tipografía, radios y sombras salen de sus tokens (src/styles.css). Prohibido usar colores hardcodeados fuera de los tokens.

---

## 4. Estructura del repo

```
/
├─ AGENTS.md                      # este archivo
├─ docs/PROGRESO.md  docs/DECISIONES.md  docs/RUNBOOK.md
├─ .env.example
├─ app/                           # frontend Vite
│  ├─ functions/api/session.ts    # Cloudflare Pages Function
│  └─ src/{lib,hooks,components,pages,types}
├─ supabase/
│  ├─ migrations/*.sql
│  ├─ seed.sql                    # generado por scripts/seed.ts
│  └─ functions/
│     ├─ _shared/{fechas.ts,reglas.ts,diff.ts,avisos.ts,db.ts,auth.ts,tipos.ts}
│     ├─ _shared/__tests__/*.test.ts
│     ├─ sync-ingest/  recalcular/  aviso-publicar/  asistente/
├─ n8n/{wf_sync.json,wf_slack_interactivo.json,wf_diario.json,wf_semanal.json}
├─ config/notion-map.json         # mapeo nombre propiedad Notion → campo
├─ fixtures/notion/*.json         # datos de prueba en formato normalizado
├─ evals/asistente-20.json
└─ scripts/{seed.ts,feriados.ts,sync-local.ts,simular-cambio.ts,dev-token.ts,test-rls.ts,eval-asistente.ts,check-aceptacion.ts}
```

---

## 5. Modelo de datos (Supabase)

Enums: `etapa_estado ('Pendiente','En curso','Bloqueada','Completada')`, `bloqueo_motivo ('Aprobación QA','Infraestructura','Seguridad','Dependencia','Otro')`, `rol ('Gerencia','Solicitante','Ejecutor','Admin')`, `semaforo ('verde','amarillo','rojo','gris')`, `aviso_tipo ('cambio_etapa','bloqueo_nuevo','bloqueo_cerrado','atraso','retroceso','sin_actualizar')`, `aviso_estado ('preparado','publicado','descartado')`.

Tablas (todas con `id uuid default gen_random_uuid()` salvo indicación; copias de Notion con `notion_id text unique`, `notion_editado_en timestamptz`, `eliminado bool default false`):

- `proyecto`: nombre, area_solicitante, solicitante_nombre, solicitante_email, responsable_comunicar_nombre, responsable_comunicar_email, fecha_comprometida date, notion_url.
- `etapa`: proyecto_id, nombre, orden int, responsable_nombre, responsable_email, estado, inicio_plan, fin_plan, inicio_real (lo fija la ingesta la 1ª vez que pasa a En curso), fin_real, duracion_dh int.
- `bloqueo`: etapa_id, proyecto_id, descripcion, motivo, area_destraba, fecha_apertura, fecha_cierre null.
- `tarea`: etapa_id, proyecto_id, nombre, responsable_nombre, responsable_email, estado text.
- `evento_cambio` (bigserial, **solo inserción**: trigger que lanza excepción en UPDATE/DELETE): proyecto_id, entidad, entidad_id, campo, valor_anterior jsonb, valor_nuevo jsonb, tipo ('creado','actualizado','eliminado','retroceso'), detectado_en default now(), notion_editado_en.
- `proyecto_calculo` (pk proyecto_id): etapa_actual_id, avance_pct, etapas_completadas, etapas_total, fecha_reproyectada, atraso_dh int, semaforo, motivos_semaforo text[], bloqueos_abiertos int, ultima_actualizacion timestamptz, sin_actualizar bool, alertas_gobierno text[], desglose jsonb, cerrado bool, calculado_en.
- `proyeccion_snapshot`: proyecto_id, fecha date, fecha_reproyectada, atraso_dh, semaforo, unique(proyecto_id, fecha). (Base para H2 y futura predicción.)
- `aviso`: proyecto_id, tipo, evento_ids bigint[], mensaje text, responsable_email, estado, preparado_en, publicado_en, publicado_por, slack_ts, canal.
- `usuario_rol` (pk email): nombre, rol, area (para Solicitante), activo.
- `usuario_proyecto`: email, proyecto_id (asociación explícita opcional, suma a la derivada).
- `evento_uso` (bigserial): email, rol, vista ('resumen','detalle','asistente','avisos','encuesta','admin'), proyecto_id null, meta jsonb, creado_en.
- `consulta_asistente`: email, rol, proyecto_id null, pregunta, respuesta, funciones_usadas jsonb, respondio bool, valoracion smallint null (−1/1), latencia_ms, tokens_in, tokens_out, creado_en.
- `encuesta_respuesta`: email, rol, momento ('Línea base','Semana 1','Semana 2','Semana 3'), encontro_sin_preguntar ('Sí','Parcialmente','No'), tiempo ('<1 min','1-5 min','>5 min'), confianza_fecha 1–5, preguntas_slack_correo int, como_se_entero ('Aviso del responsable','Revisando la app','Preguntando'), vista_mas_usada ('Resumen','Detalle','Asistente'), minutos_actualizar_notion int null, creado_en; unique(email, momento).
- `sync_estado` (pk base): ultima_sync, resultado ('ok','error'), detalle, registros int.
- `parametro` (pk clave): valor jsonb, descripcion. Seed: `dias_por_bloqueo=5`, `umbral_atraso_rojo_dh=5`, `umbral_bloqueo_rojo_dh=5`, `dias_frescura=7` (calendario), `duracion_default_dh=5`, `canal_slack_piloto`, `url_app`, `inicio_piloto` (fecha).
- `feriado` (pk fecha): nombre.

Vistas (`with (security_invoker = true)`): `v_proyecto_resumen` (proyecto + proyecto_calculo + nombre etapa actual), `v_metrica_h1..h4` (sección 11).

### RLS
Funciones helper `security definer stable`: `app_email()` = `lower(auth.jwt()->>'email')`; `app_rol()` desde `usuario_rol` activo; `proyecto_visible(pid uuid) returns bool`:
- Admin, Gerencia → true.
- Solicitante → `proyecto.area_solicitante = usuario_rol.area` o asociación en `usuario_proyecto`.
- Ejecutor → tiene etapa o tarea con su email en el proyecto, o es responsable de comunicar, o asociación explícita.

Políticas:
- SELECT en proyecto/etapa/bloqueo/tarea/proyecto_calculo/proyeccion_snapshot/evento_cambio/aviso → `proyecto_visible(proyecto_id)`.
- Ninguna escritura de usuarios en datos de Notion ni cálculos (solo `service_role`).
- `aviso`: UPDATE vía Edge Function solamente.
- `evento_uso`, `consulta_asistente`, `encuesta_respuesta`: INSERT con `email = app_email()`; SELECT propio; Admin ve todo. `consulta_asistente.valoracion` UPDATE propio.
- `usuario_rol`: SELECT propio; Admin todo. `parametro`, `sync_estado`, `feriado`: SELECT autenticados; escritura Admin.
- Usuario sin fila activa en `usuario_rol` → no ve nada; la UI muestra "Sin acceso, contacta a <admin>".

---

## 6. Reglas de cálculo (`_shared/fechas.ts`, `_shared/reglas.ts`)

Funciones puras; `hoy`, `feriados` y `parametros` siempre inyectados (nunca `new Date()` dentro de la regla). Fechas como `YYYY-MM-DD` en zona `America/Santiago`.

`fechas.ts`:
- `esHabil(f)`: no sábado/domingo y no en feriados.
- `siguienteHabil(f)`: f si es hábil, si no el próximo hábil.
- `diasHabilesEntre(a, b)`: cantidad de días hábiles en (a, b]; 0 si b ≤ a.
- `sumarDiasHabiles(f, n)`: avanza n días hábiles desde f (n=0 → f).

`reglas.ts` → `calcularProyecto(proyecto, etapas, bloqueos, ultimoCambio, hoy, feriados, params): Calculo`:
1. **Etapa actual**: menor `orden` con estado ≠ Completada. Si todas Completada → proyecto cerrado.
2. **Avance**: completadas / total (redondeo entero). Retrocesos no se ocultan: quedan en historial y bajan el avance.
3. **Duración de etapa**: `duracion_dh` ?? `diasHabilesEntre(inicio_plan, fin_plan)` ?? `duracion_default_dh` (+ alerta gobierno "Etapa X sin duración estimada").
4. **Fecha re-proyectada** (no cerrado):
   - `base = siguienteHabil(hoy)`
   - Por cada etapa En curso o Bloqueada: `restante = max(0, dur − diasHabilesEntre(inicio_real ?? inicio_plan ?? hoy, hoy))`
   - `pendientes = Σ dur` de etapas Pendiente
   - `bloq = dias_por_bloqueo × bloqueos abiertos` (de etapas no completadas)
   - `fecha = sumarDiasHabiles(base, Σrestante + pendientes + bloq)`
   - `desglose` = `{ base, etapas:[{nombre,estado,dias}], bloqueos:[{descripcion,motivo,dias}], total_dh, fecha }`
   - Cerrado: `fecha = max(fin_real)`, bloqueos = 0.
5. **Atraso (con signo)**: si fecha > comprometida → `+diasHabilesEntre(comprometida, fecha)`; si no → `−diasHabilesEntre(fecha, comprometida)`.
6. **Semáforo** (en este orden):
   - sin `fecha_comprometida` → `gris` + alerta gobierno
   - `rojo` si atraso > `umbral_atraso_rojo_dh` **o** algún bloqueo abierto con `diasHabilesEntre(apertura, hoy) ≥ umbral_bloqueo_rojo_dh`
   - `amarillo` si atraso entre 1 y 5 **o** ≥1 bloqueo abierto
   - `verde` en otro caso
   - `motivos_semaforo`: textos legibles ("Atraso de 7 días hábiles", "Bloqueo de QA abierto hace 6 días hábiles").
7. **Frescura**: `ultima_actualizacion` = max(`evento_cambio.detectado_en` del proyecto, `notion_editado_en` de sus entidades). `sin_actualizar` si > `dias_frescura` días calendario → etiqueta "Sin actualizar desde dd/mm".
8. **Gobierno**: alertas si falta responsable de comunicar, falta responsable en alguna etapa, falta fecha comprometida, etapa sin duración.

Tests obligatorios (`deno test`), con `hoy` y feriados fijos de fixture: sin atraso (verde), atraso 3 (amarillo), atraso 8 (rojo), bloqueo abierto 2 días (amarillo), bloqueo abierto 5+ días (rojo), retroceso de etapa (avance baja y evento tipo retroceso), feriado entre medio (fecha corre 1 día), fin de semana como "hoy", proyecto cerrado, etapa sin duración, sin fecha comprometida, varias etapas en curso, desglose cuadra con la fecha.

**Feriados**: `scripts/feriados.ts <año>` los carga desde `https://apis.digital.gob.cl/fl/feriados/<año>` con respaldo `https://date.nager.at/api/v3/PublicHolidays/<año>/CL`. Prohibido escribir feriados de memoria. Cargar año actual y siguiente.

---

## 7. Ingesta, historial y avisos

### Payload normalizado (contrato único, `_shared/tipos.ts`)
```ts
type SyncPayload = {
  fuente: 'notion' | 'fixture';
  leido_en: string; // ISO
  proyectos: ProyectoN[]; etapas: EtapaN[]; bloqueos: BloqueoN[]; tareas: TareaN[];
} // cada entidad trae notion_id, notion_editado_en y FKs por notion_id
```

### `sync-ingest` (Edge Function, auth header `x-sync-secret` = env `SYNC_SECRET`)
1. Validar payload (zod). Registrar `sync_estado` por base.
2. **Sync completo**: upsert por `notion_id`; entidades ausentes → `eliminado=true` + evento `eliminado`.
3. `diff.ts`: por cada campo cambiado inserta `evento_cambio`. Detectar **retroceso** (Completada → otro estado, o la etapa actual baja de orden) → evento tipo `retroceso`. Fijar `inicio_real` al pasar a En curso por primera vez; `fin_real` si Notion no lo trae y pasa a Completada (registrar en DECISIONES).
4. Llamar `recalcular` para proyectos afectados.
5. `avisos.ts` → **cambios relevantes**: cambio de estado de etapa, bloqueo nuevo, bloqueo cerrado, retroceso, semáforo empeora o atraso pasa de ≤0 a >0. Agrupar en **un aviso `preparado` por proyecto por sync** con mensaje determinístico:
   ```
   📌 *{proyecto}* — {resumen del cambio}
   Etapa actual: {etapa} ({avance}%) · Semáforo: {emoji} {motivo}
   Fecha estimada: {dd/mm} (comprometida {dd/mm}, {±n} días hábiles)
   Bloqueos abiertos: {n} {detalle breve}
   Detalle: {url_app}/proyectos/{id}
   ```
   Si ya hay un aviso `preparado` sin publicar del mismo proyecto, se actualiza (se agregan evento_ids y se regenera el mensaje) en vez de crear otro.
6. Responder `{ cambios: n, avisos_preparados: [{aviso_id, proyecto, responsable_email, mensaje}] }` → n8n hace el DM.
7. Idempotente: el mismo payload dos veces no genera eventos ni avisos nuevos (test).

### `recalcular` (service): recalcula `proyecto_calculo` (todos o lista). Con `?snapshot=true` además upsert de `proyeccion_snapshot` del día.

### `aviso-publicar` (JWT del usuario)
Input `{aviso_id, mensaje?}`. Valida que `app_email()` = responsable de comunicar del proyecto o Admin (o header `x-sync-secret` + `publicado_por` cuando viene del botón de Slack vía n8n). Publica en `canal_slack_piloto` con `chat.postMessage`, guarda `publicado_en`, `publicado_por`, `slack_ts`, estado `publicado`. También acción `descartar`.

### Scripts locales (sin Notion ni n8n)
- `sync-local.ts`: si hay `NOTION_TOKEN`, lee Notion usando `config/notion-map.json` y normaliza; si no, usa `fixtures/notion/`. Hace POST a `sync-ingest`. Flag `--watch` repite cada 5 min.
- `simular-cambio.ts <escenario>`: modifica fixtures (`avanzar-etapa`, `abrir-bloqueo`, `cerrar-bloqueo`, `retroceso`, `atraso`) y ejecuta sync-local. Sirve para la demo y para criterios de aceptación.

### n8n (`n8n/*.json`, importables; credenciales por nombre, sin valores)
- `wf_sync`: Cron 5 min → Notion "Query database" ×4 con paginación → Code node que normaliza con el mismo mapeo de `notion-map.json` → HTTP POST `sync-ingest` → por cada aviso preparado: `users.lookupByEmail` → DM con el mensaje + botones **Publicar** / **Editar en la app** (link) / **Descartar**. Error → `sync_estado` y DM al Admin.
- `wf_slack_interactivo`: Webhook interactividad Slack → verificar firma (`SLACK_SIGNING_SECRET`) → llamar `aviso-publicar` con `x-sync-secret` y email del usuario Slack → actualizar el DM ("Publicado ✅").
- `wf_diario`: 07:00 hábiles → `recalcular?snapshot=true` → avisos `atraso` si corresponde.
- `wf_semanal`: lunes 09:00 → DM a responsables de etapas sin cambios en `dias_frescura` (mitiga "ejecutores no actualizan Notion").

---

## 8. Autenticación y roles

- **Producción del piloto**: Cloudflare Access protege todo el dominio de Pages. `app/functions/api/session.ts`:
  1. Lee `Cf-Access-Jwt-Assertion`, verifica con JWKS `https://<CF_TEAM_DOMAIN>/cdn-cgi/access/certs` y `aud = CF_ACCESS_AUD` (lib `jose`).
  2. Emite JWT HS256 firmado con `SUPABASE_JWT_SECRET` (secret de Pages): `{ sub: email, email, role: 'authenticated', aud: 'authenticated', exp: +1h }`.
  3. Devuelve `{ access_token, expires_at, email }`.
- Frontend: `createClient(url, anonKey, { accessToken: async () => tokenVigente() })`; renueva antes de expirar. Edge Functions reciben el mismo token en `Authorization` → RLS aplica también al asistente.
- **Dev** (`DEV_AUTH=true` solo en local): `session.ts` usa `DEV_AUTH_EMAIL` si no hay header de Access, y la UI muestra un selector de usuario de prueba (uno por rol del seed) para validar permisos. Imposible activarlo en build de producción (chequeo de `CF_PAGES_BRANCH`/env).
- Nota: el proyecto Supabase debe tener disponible el JWT secret HS256 (legacy). Verifícalo en la Fase 5; si no está disponible, registra la alternativa en DECISIONES antes de seguir y detente a consultar.

---

## 9. Asistente IA (`asistente`)

- Input `{ pregunta, proyecto_id?, historial?: últimos 6 turnos }`. Cliente Supabase con JWT del usuario (no service role).
- Tools de **solo lectura** (implementadas como queries; todas devuelven `ultima_actualizacion` y `fuente: "Notion vía sync"`):
  - `buscar_proyecto(texto)` → coincidencias por nombre (ilike + trigram si está disponible)
  - `estado_proyecto(proyecto_id)` → etapa actual, avance, semáforo + motivos, fechas, atraso, desglose, responsable de comunicar
  - `bloqueos_abiertos(proyecto_id?)` → motivo, área que destraba, días hábiles abierto
  - `etapas_y_tareas(proyecto_id)` → etapas con responsables y tareas
  - `historial(proyecto_id, desde?)` → últimos 30 eventos legibles
- System prompt (constante en `asistente/prompt.ts`, en español):
  - Responde solo con datos obtenidos por las herramientas; nunca inventes ni estimes.
  - Cada respuesta termina con `Fuente: Notion · actualizado {dd/mm hh:mm}`.
  - Si no hay dato o el usuario no tiene acceso: dilo y entrega el nombre y correo del responsable de comunicar (si es visible).
  - Breve: máximo 5 líneas para gerencia; detalle de tareas solo si se pide o el rol es Ejecutor.
  - No respondas temas ajenos a los proyectos.
- Loop de tool use máx. 5 iteraciones; timeout 25 s. Registrar en `consulta_asistente` (funciones usadas, `respondio`, tokens, latencia). Endpoint para valoración 👍/👎.
- Kill switch: `parametro.asistente_activo=false` oculta el chat sin afectar vistas.
- **Eval**: `evals/asistente-20.json` con 20 preguntas sobre el seed y respuesta esperada (hechos clave a verificar). `scripts/eval-asistente.ts` corre las 20 con un usuario Gerencia y uno Solicitante, verifica hechos por coincidencia normalizada y la presencia de "Fuente:". Meta ≥ 18/20. Incluir 3 preguntas de control de acceso (proyecto no visible para el Solicitante → debe negarse).

---

## 10. Frontend

Estética: tema oscuro de la marca WWP con galaxia 3D; acento único terracota; estados con colores health-*.

Rutas:
- `/` **Resumen**: tarjetas (móvil) / tabla (≥md). Por proyecto: nombre, área, etapa actual + avance, fecha comprometida vs estimada, atraso ±, semáforo (color **+ texto**, nunca solo color), responsable de comunicar, "Actualizado hace X" o badge "Sin actualizar desde dd/mm", ícono de alerta de gobierno con tooltip. Filtros: semáforo, área; orden por riesgo (rojo primero). Una sola query a `v_proyecto_resumen`.
- `/proyectos/:id` **Detalle**:
  1. Cabecera: semáforo + motivos, fechas, atraso, responsable de comunicar (mailto / Slack).
  2. **Línea de etapas tipo seguimiento de envío** (horizontal en desktop, vertical en móvil): estado por etapa, responsable, fechas plan/real, marca "Reabierta dd/mm" en retrocesos.
  3. Bloqueos abiertos destacados: motivo, área que destraba, días abierto.
  4. **"¿Cómo se calculó la fecha?"** desplegable que renderiza `desglose` en lenguaje simple: "Hoy 20/10 + 3 días restantes de QA + 8 de etapas pendientes + 5 por 1 bloqueo = 16 días hábiles → 11/11".
  5. Tareas por etapa (colapsadas por defecto para Gerencia/Solicitante, abiertas para Ejecutor).
  6. Historial (timeline de `evento_cambio` en texto legible).
- **Asistente**: botón flotante → panel lateral (sheet) de chat; en detalle precarga `proyecto_id`. Sugerencias: "¿Cómo va el proyecto?", "¿Qué lo bloquea?", "¿Cuándo termina?". Valoración por respuesta.
- `/avisos`: visible a responsables de comunicar y Admin. Lista de avisos preparados, editor del mensaje, **Publicar en Slack** (1 clic), Descartar; historial de publicados.
- `/encuesta`: formulario del Anexo B (pregunta de minutos solo para Ejecutor), `momento` calculado desde `inicio_piloto`. Banner en resumen si no ha respondido la del momento vigente.
- `/admin` (Admin): parámetros editables, estado de sincronización, alertas de gobierno de todos los proyectos, CRUD `usuario_rol`/`usuario_proyecto`, métricas H1–H4 con exportar CSV.
- Estados vacíos/carga/error en todas las vistas. Registrar `evento_uso` al entrar a cada vista (hook `useRegistrarVista`, sin bloquear el render).

---

## 11. Medición (vistas SQL)

- `v_metrica_h1`: usuarios activos por rol, consultas al asistente, % respondidas, % 👍; encuesta: % "Sí" en encontró sin preguntar, distribución de tiempo, preguntas por Slack/correo por momento (vs línea base).
- `v_metrica_h2`: confianza promedio en la fecha por momento; diferencia en días hábiles entre `proyeccion_snapshot.fecha_reproyectada` y `fin_real` por etapa/proyecto cerrado.
- `v_metrica_h3`: % de cambios relevantes con aviso publicado dentro de 1 día hábil desde `detectado_en`; distribución "cómo te enteraste".
- `v_metrica_h4`: vistas usadas por rol (conteo y %).

---

## 12. Seed de prueba (`scripts/seed.ts`)

Datos ficticios (sin personas ni proyectos reales), fechas **relativas a hoy** al momento de sembrar. Etapas estándar por defecto (pendiente de validar con Procesos; configurables): Levantamiento, Diseño, Desarrollo, QA, Aprobación Seguridad/Infra, Despliegue, Cierre.
- Proyecto A: en QA con bloqueo "Aprobación QA" abierto hace 6 días hábiles → **rojo**.
- Proyecto B: en Desarrollo, a tiempo → **verde**.
- Proyecto C: retroceso de QA a Desarrollo, atraso 3 → **amarillo**, una etapa sin responsable → alerta de gobierno.
- Proyecto D: cerrado.
- Áreas: Compliance, Comercial, Operaciones. Usuarios: 1 Admin, 1 Gerencia, 2 Solicitantes (áreas distintas), 2 Ejecutores (uno responsable de comunicar).
- Genera `fixtures/notion/*.json` y `supabase/seed.sql` coherentes.

---

## 13. Plan de fases (una por sesión)

| Fase | Entregable | Hecho cuando |
|---|---|---|
| F0 | Monorepo, `.env.example`, `docs/*`, Supabase local (`supabase start`), Vite app vacía con Tailwind+shadcn, scripts npm | `npm run dev` y `supabase start` levantan |
| F1 | Migraciones (tablas, enums, trigger solo-inserción, helpers, RLS, vistas), `seed.ts`, `feriados.ts` | `supabase db reset` siembra sin errores |
| F2 | `fechas.ts`, `reglas.ts` + todos los tests de §6 | `deno test` verde |
| F3 | `sync-ingest`, `diff.ts`, `recalcular`, `avisos.ts`, `sync-local.ts`, `simular-cambio.ts`, tests de idempotencia y retroceso | Escenario `abrir-bloqueo` crea eventos, recalcula y prepara aviso |
| F4 | Resumen y Detalle conectados con datos del seed; `evento_uso` | Ves A rojo, B verde, C amarillo, D cerrado; desglose visible |
| F5 | `/api/session`, modo dev con selector de usuario, `test-rls.ts` (cada rol ve solo lo suyo) | `test-rls.ts` pasa para los 4 roles |
| F6 | `aviso-publicar`, `/avisos`, workflows n8n `wf_sync` y `wf_slack_interactivo` | Aviso preparado se publica en Slack con 1 clic (app y botón) |
| F7 | `asistente`, chat UI, valoración, eval 20 preguntas, kill switch | `eval-asistente.ts` ≥ 18/20 |
| F8 | `/encuesta`, `/admin`, vistas de métricas, `wf_diario`, `wf_semanal` | Métricas H1–H4 muestran datos del seed + uso simulado |
| F9 | Deploy Cloudflare Pages + Access, deploy Edge Functions, `RUNBOOK.md`, `check-aceptacion.ts` | Criterios §14 verificados |

Prioridad si falta tiempo: F0–F6 son imprescindibles; F7 puede entrar en la primera semana del piloto.

---

## 14. Criterios de aceptación (`scripts/check-aceptacion.ts` verifica los automatizables)

1. Un cambio en Notion (o fixture) se ve en la app en ≤ 5 min y queda en `evento_cambio`.
2. Reglas pasan sus pruebas: sin atraso, con atraso, bloqueo > 5 días, retroceso, feriado de por medio, proyecto cerrado.
3. Cada rol ve solo lo que le corresponde (`test-rls.ts`).
4. Un cambio de etapa genera aviso preparado al responsable y se publica en Slack con un clic.
5. Asistente ≥ 18/20 en el eval.
6. Resumen carga en < 2 s (medir query + render con el seed ×10 proyectos) y es legible en 375 px.
7. La encuesta de línea base se puede responder y se ve en métricas.

---

## 15. Variables de entorno (`.env.example`)

```
# Supabase
SUPABASE_URL= SUPABASE_ANON_KEY= SUPABASE_SERVICE_ROLE_KEY= SUPABASE_JWT_SECRET=
# App
VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= DEV_AUTH=false DEV_AUTH_EMAIL=
# Cloudflare Access
CF_TEAM_DOMAIN= CF_ACCESS_AUD=
# Integración
SYNC_SECRET= NOTION_TOKEN= NOTION_DB_PROYECTOS= NOTION_DB_ETAPAS= NOTION_DB_BLOQUEOS= NOTION_DB_TAREAS=
SLACK_BOT_TOKEN= SLACK_SIGNING_SECRET=
# IA
ANTHROPIC_API_KEY= ANTHROPIC_MODEL=claude-sonnet-5-5
```

---

## 16. Seguridad (no negociable)

- Token Notion de solo lectura limitado a las bases del piloto. Ninguna llamada de escritura a Notion en el código.
- Secretos solo en gestores de Supabase, n8n y Cloudflare. `.env*` en `.gitignore`.
- Durante la construcción solo datos del seed. Datos reales llegan únicamente a Supabase y a la API de Claude.
- RLS habilitado en el 100% de las tablas (`test-rls.ts` falla si alguna tabla pública no tiene RLS).
- El asistente nunca usa `service_role`.
- Logs sin contenido sensible (no loguear payloads completos de Notion).
