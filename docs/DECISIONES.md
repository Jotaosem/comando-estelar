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
