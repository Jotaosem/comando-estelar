# Decisiones Arquitecturales y Técnicas

Documento de registro de decisiones de diseño e implementación del prototipo "Comunicación de Avances de Proyectos".

---

## D001: Instalación de Deno para ejecución de tests de reglas puras
- **Fecha**: 2026-10-20
- **Contexto**: `AGENTS.md` estipula que las reglas de cálculo en `_shared/fechas.ts` y `_shared/reglas.ts` deben ser testeables con `deno test`.
- **Decisión**: Se instaló Deno vía `winget` en el entorno local para permitir la ejecución autónoma de `deno test`.

## D002: Inicialización de Frontend Vite + React + TS en carpeta `app`
- **Fecha**: 2026-10-20
- **Contexto**: Fase 0 requiere app React (Vite) en `app/` con TypeScript, Tailwind CSS, Lucide React, TanStack Query y React Router.
- **Decisión**: Scaffolding directo con `npm create vite@latest app -- --template react-ts` y configuración de Tailwind CSS v3 con tokens para compatibilidad con componentes Shadcn.

## D003: Migraciones canónicas y legado
- **Fecha**: 2026-11-17
- **Contexto**: Las migraciones `20261117000000`→`20261117000400` se aplicaron a mano en Supabase. Dos archivos traían el sufijo " (1)" y la migración antigua `20261021000000_schema_inicial.sql` define el mismo modelo con otra forma (choca con `base_prototipo` en un `db reset`).
- **Decisión**: Se renombran los archivos sin cambiar su contenido y la migración antigua se mueve a `supabase/migrations_legacy/` (fuera de la cadena de la CLI). Se agrega `.gitignore` en la raíz para que `.env` nunca entre al repo.

## D004: Modo demo solo para desarrollo y pruebas E2E
- **Fecha**: 2026-11-17
- **Contexto**: La app pasa a leer Supabase con login por enlace mágico. Los E2E deben correr sin red ni cuentas reales.
- **Decisión**: `VITE_MODO_DEMO=true` activa datos ficticios y el selector de perfiles de prueba. Solo funciona si `import.meta.env.PROD` es falso; un build de producción lo ignora siempre. Playwright levanta su propio servidor en el puerto 5174 con ese modo.

## D005: Lectura de proyectos con `galaxia_resumen` + enriquecimiento con RLS (opción B)
- **Fecha**: 2026-11-17
- **Contexto**: `galaxia_resumen()` devuelve 10 columnas de resumen; la UI usa además código, fecha comprometida, atraso, etapa actual, motivos y etapas para la órbita.
- **Decisión**: Sin migración nueva. Se lee `rpc('galaxia_resumen')` para todos y, para los proyectos con `puede_ver_detalle`, se completan los datos con `v_proyecto_canonico`, `proyecto_calculo` y `etapa` (con el JWT del usuario y RLS). Los proyectos sin acceso muestran "—" y su órbita se deriva de `fase_macro` en el cliente. Los campos que no existen en el modelo canónico (sprints, palabras clave, solicitante) se muestran como "No disponible en la fuente".
