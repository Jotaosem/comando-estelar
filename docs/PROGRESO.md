# Progreso del Prototipo "Comunicación de Avances de Proyectos"

Estado de avance por fases según especificación de `AGENTS.md`.

---

## Checklist de Fases

- [x] **Fase 0: Setup y Fundaciones**
  - [x] Estructura de carpetas creada (`docs/`, `supabase/`, `app/`, `n8n/`, `config/`, `fixtures/`, `evals/`, `scripts/`)
  - [x] `.env.example` y documentación inicial (`docs/PROGRESO.md`, `docs/DECISIONES.md`, `docs/RUNBOOK.md`)
  - [x] App React (Vite) + TS + Tailwind + dependencias base instaladas en `app/`
  - [x] Supabase inicializado con `supabase init` y config base
  - [x] Scripts npm en raíz configurados

- [x] **Fase 1: Modelo de Datos, Migraciones, Seed y Feriados**
  - [x] Migración SQL `supabase/migrations/20261021000000_schema_inicial.sql` con enums, tablas, triggers solo-inserción, RLS y vistas
  - [x] Script `scripts/feriados.ts` para feriados oficiales de Chile (34 feriados descargados en `supabase/feriados.json`)
  - [x] Script `scripts/seed.ts` y generación coherente de `supabase/seed.sql` + fixture `fixtures/notion/datos.json`

- [x] **Fase 2: Reglas de Negocio Puras (`fechas.ts`, `reglas.ts`)**
  - [x] `_shared/fechas.ts`: `esHabil`, `siguienteHabil`, `diasHabilesEntre`, `sumarDiasHabiles`
  - [x] `_shared/reglas.ts`: `calcularProyecto` con desglose, avance, atraso, semáforo, frescura y alertas de gobierno
  - [x] Suite de pruebas unitarias (`deno test supabase/functions/_shared/__tests__/reglas.test.ts` con 9/9 pasando)

- [x] **Fase 3: Ingesta, Historial y Avisos (`sync-ingest`, `recalcular`, etc.)**
  - [x] `_shared/tipos.ts` contrato normalizado
  - [x] `_shared/diff.ts` detector de cambios y retrocesos
  - [x] `_shared/avisos.ts` generador determinístico de mensajes
  - [x] Script `scripts/sync-local.ts` y `scripts/simular-cambio.ts`
  - [x] Pruebas unitarias de idempotencia y retrocesos (`diff_avisos.test.ts` con 3/3 pasando)

- [x] **Fase 4: Frontend Base - Resumen y Detalle**
  - [x] Conexión frontend a Supabase con cliente en `app/src/lib/supabase.ts`
  - [x] Ruta `/` Resumen con tarjetas en móvil y tabla en desktop, filtros por semáforo y área, orden por riesgo
  - [x] Ruta `/proyectos/:id` Detalle con cabecera, seguimiento de etapas tipo envío, bloqueos abiertos y desplegable de cálculo
  - [x] Hook `useRegistrarVista` registrando `evento_uso`
  - [x] Verificación de compilación limpia de Vite y TypeScript (`npm run build` exitoso)

- [x] **Fase 5: Autenticación, Roles y RLS**
  - [x] Cloudflare Pages Function `app/functions/api/session.ts` con validación de assertion o modo dev
  - [x] Selector interactivo de usuarios y roles del seed en UI (`DevUserSelector.tsx`)
  - [x] Filtrado reactivo de visibilidad según rol activo (Admin, Gerencia, Solicitantes por área, Ejecutores)
  - [x] Script de prueba automatizado `scripts/test-rls.ts` validado con `deno test` (5/5 tests pasando)

- [x] **Fase 6: Publicación de Avisos y Notificaciones a Slack**
  - [x] Edge Function `supabase/functions/aviso-publicar/index.ts` con soporte de `chat.postMessage`, acciones publicar/descartar y validación de permisos
  - [x] Vista interactiva `/avisos` con bandeja de avisos preparados, editor del mensaje y publicación en Slack con 1 clic
  - [x] Workflows exportables de n8n: `n8n/wf_sync.json` y `n8n/wf_slack_interactivo.json`

- [x] **Fase 7: Asistente IA (`asistente`) y Chat UI**
  - [x] Edge Function `supabase/functions/asistente/index.ts` y prompt con restricciones en `prompt.ts`
  - [x] Componente flotante `ChatAsistente.tsx` con sugerencias rápidas, valoración y pie de página obligatorio
  - [x] Dataset de 20 preguntas `evals/asistente-20.json` y script de evaluación `scripts/eval-asistente.ts` (18/20 aprobadas)

- [x] **Fase 8: Encuesta, Admin, Métricas y Cron Jobs**
  - [x] Vista de encuesta `/encuesta` (`EncuestaPage.tsx`) con preguntas de autonomía, confianza 1-5 y minutos Notion
  - [x] Vista de administración `/admin` (`AdminPage.tsx`) con métricas H1-H4, exportación CSV y parámetros
  - [x] Workflows n8n: `n8n/wf_diario.json` (recálculo 07:00 con snapshot) y `n8n/wf_semanal.json` (recordatorio lunes 09:00)

- [x] **Fase 9: Preparación para Despliegue y Aceptación Final**
  - [x] Configuración SPA en Cloudflare Pages (`app/public/_redirects`)
  - [x] Documento operativo completo `docs/RUNBOOK.md`
  - [x] Script de verificación integral `scripts/check-aceptacion.ts` ejecutado con éxito total
