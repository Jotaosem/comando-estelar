# RUNBOOK — Guía de Operación y Puesta en Marcha

## 1. Requisitos del Sistema
- Node.js >= 20.x
- Deno >= 2.x
- Docker Desktop (para levantar Supabase local si se requiere postgres nativo)
- Cloudflare Pages y Cloudflare Access configurados para producción

---

## 2. Desarrollo Local Autónomo (Sin dependencias externas)
1. **Instalar dependencias del frontend**:
   ```bash
   npm --prefix app install
   ```
2. **Ejecutar tests unitarios de reglas de negocio y cálculo de fechas**:
   ```bash
   deno test supabase/functions/_shared/__tests__/
   ```
3. **Validar políticas de Row Level Security (RLS)**:
   ```bash
   deno test --allow-read scripts/test-rls.ts
   ```
4. **Evaluar el Asistente IA (Dataset de 20 preguntas)**:
   ```bash
   deno run --allow-read scripts/eval-asistente.ts
   ```
5. **Simular escenarios de cambio (abrir/cerrar bloqueos, retrocesos)**:
   ```bash
   deno run --allow-read --allow-write scripts/simular-cambio.ts abrir-bloqueo
   ```
6. **Ejecutar suite completa de criterios de aceptación**:
   ```bash
   deno run --allow-read --allow-write scripts/check-aceptacion.ts
   ```
7. **Iniciar la aplicación en modo desarrollo**:
   ```bash
   npm run dev
   ```

---

## 3. Despliegue en Cloudflare Pages
1. Conectar el repositorio en Cloudflare Pages:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
   - **Root Directory**: `app`
2. Configurar variables de entorno en Cloudflare Pages:
   - `CF_TEAM_DOMAIN`: `<tu-equipo>.cloudflareaccess.com`
   - `CF_ACCESS_AUD`: `<access-aud-de-tu-aplicacion>`
   - `SUPABASE_URL`: `<url-de-tu-proyecto-supabase>`
   - `SUPABASE_ANON_KEY`: `<anon-key-de-supabase>`
   - `SUPABASE_JWT_SECRET`: `<secret-jwt-hs256-de-supabase>`
3. Cloudflare Access: Crear una aplicación que proteja el dominio de Pages con regla de correos corporativos autorizados.

---

## 4. Despliegue de Supabase Edge Functions
1. Instalar Supabase CLI y vincular proyecto:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-id>
   ```
2. Desplegar funciones de backend:
   ```bash
   npx supabase functions deploy sync-ingest --no-verify-jwt
   npx supabase functions deploy recalcular --no-verify-jwt
   npx supabase functions deploy aviso-publicar
   npx supabase functions deploy asistente
   ```
3. Configurar secretos en Supabase:
   ```bash
   npx supabase secrets set SYNC_SECRET=... SLACK_BOT_TOKEN=... ANTHROPIC_API_KEY=...
   ```

---

## 5. Integración con n8n y Slack
1. Importar los flujos JSON desde la carpeta `n8n/`:
   - `n8n/wf_sync.json`: Cron de sincronización cada 5 min.
   - `n8n/wf_slack_interactivo.json`: Endpoint interactivo para botones en Slack.
   - `n8n/wf_diario.json`: Recálculo diario a las 07:00 hábiles.
   - `n8n/wf_semanal.json`: Recordatorio de frescura los lunes a las 09:00.
2. Configurar credenciales nombradas en n8n para Notion API y Slack Bot.
