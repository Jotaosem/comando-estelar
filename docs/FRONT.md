# Front-end — "Comando Estelar" (estado actual)

> Documento vivo del front en `app/`. Describe lo que **está implementado hoy** (commit `2f66a8c`), no lo que pide `AGENTS.md`. Donde ambos difieren, se indica en la sección 9.
>
> Written for: el líder técnico del proyecto y quien retome el front.

---

## 1. Resumen

| Ítem | Estado |
|---|---|
| Stack | React 19 + Vite 8 + TypeScript 6 (strict) + Tailwind CSS 3 + React Router 7 + Framer Motion + Three.js (R3F + drei) + Zustand + Fuse.js |
| Tipo de app | SPA con tema **oscuro** tipo HUD espacial, galaxia 2.5D/3D de proyectos |
| Fuente de datos | **Seed estático** (`src/lib/proyectosData.ts`). El front **no lee** Supabase para proyectos |
| Autenticación | **Selector de usuario de desarrollo** guardado en `localStorage`. `functions/api/session.ts` existe pero **no está conectado** |
| Escritura a BD | Solo `evento_uso` (insert, no bloqueante) en `useRegistrarVista` |
| Typecheck | `tsc -p tsconfig.app.json --noEmit` → sin errores |
| Lint | `oxlint src` → solo advertencias (react-hooks, purity, refs) |
| E2E | `e2e-galaxy.spec.ts` (Playwright). El último resultado guardado en `test-results/.last-run.json` es **failed** |

---

## 2. Stack y dependencias clave

| Área | Librería | Uso |
|---|---|---|
| UI base | Tailwind CSS 3.4, `clsx`, `tailwindcss-merge` | Utilidades y tokens de color |
| Iconos | `lucide-react` | Íconos de navegación, estados, acciones |
| Routing | `react-router-dom` 7 | `BrowserRouter` en `App.tsx` |
| Animación | `framer-motion` | Transiciones de tarjetas, paneles y timeline |
| 3D | `three`, `@react-three/fiber`, `@react-three/drei` | Galaxia, planetas, órbitas, fondo estelar |
| Estado global | `zustand` | `navigationStore.ts` (navegación de la galaxia, búsqueda) |
| Búsqueda | `fuse.js` | Buscador de proyectos (`GalaxySearchBar`) |
| Popovers | `@radix-ui/react-popover` | Compartir resumen |
| Fechas | `date-fns` | Formateo de fechas |
| Datos | `@tanstack/react-query` (instalado), `@supabase/supabase-js` | Cliente Supabase solo para `evento_uso` |
| JWT | `jose` | Solo en `functions/api/session.ts` (Pages Function) |

Dependencias instaladas pero **sin uso visible en `src/`**: `@tanstack/react-query`, `date-fns` (verificar antes de eliminar).

---

## 3. Rutas

Definidas en `app/src/App.tsx`:

| Ruta | Componente | Qué muestra | Visibilidad en la navegación |
|---|---|---|---|
| `/` | `ResumenPage` | Galaxia de proyectos (`SemanticGalaxyDirector`), buscador (`GalaxySearchBar`), filtros por semáforo y área, botón compartir | Todos ("Misiones") |
| `/proyectos/:id` | `DetallePage` | Detalle del proyecto: cabecera, etapas, bloqueos, cálculo de fecha, tareas, historial | Vía galaxia |
| `/proyectos/:id/imprimir` | `ImprimirPage` | Vista limpia para imprimir (`window.print()` automático). Parámetro `?bloqueos=true` | Desde `CompartirPopover` |
| `/avisos` | `AvisosPage` | Bandeja de avisos preparados, editor de mensaje, "Publicar en Slack" y "Descartar" | Admin y Ejecutor (solo en nav) |
| `/encuesta` | `EncuestaPage` | Encuesta de línea base / semanal | Todos |
| `/admin` | `AdminPage` | Métricas H1–H4 (fijas), exportar CSV | Solo Admin (solo en nav) |

**Importante:** la restricción por rol está solo en la navegación (`NavigationHeader`). Las rutas `/admin` y `/avisos` **no tienen guard**: cualquiera que escriba la URL entra.

---

## 4. Layout general

`App.tsx` compone:

1. **Header sticky** (`h-16`, 64 px) con `hud-glass`, logo "Comando Estelar" (degradado cian→violeta), navegación con 4 enlaces y `DevUserSelector` a la derecha. En móvil la navegación se oculta (`hidden md:flex`), **no hay menú hamburguesa**.
2. **`<main>`** con `max-w-7xl`, padding `px-4 sm:px-6 lg:px-8 py-8`.
3. **`ChatAsistente`** flotante (panel lateral de 420 px en desktop, pantalla completa en móvil).
4. **Footer** monoespaciado con la leyenda: `COMANDO ESTELAR // FUENTE AUDITABLE: NOTION VÍA SYNC // OPERADOR: {rol} ({email})`.

Estado de usuario en `App.tsx`: se lee `user_email` de `localStorage` al inicio y se guardan `user_email`, `user_rol`, `user_area`.

---

## 5. Componentes

### 5.1 Páginas (`src/pages/`)

| Archivo | Líneas | Notas |
|---|---|---|
| `ResumenPage.tsx` | 484 | Lista de proyectos (`obtenerProyectosSeed`), filtros, anillo de avance (SVG) con stroke por semáforo, `motivos_semaforo` |
| `DetallePage.tsx` | 544 | Usa `framer-motion` (`AnimatePresence`), `useParams`, nodos de etapa con anillo de selección |
| `ImprimirPage.tsx` | 207 | Fondo blanco, texto `slate-900`, clases `print:` |
| `AvisosPage.tsx` | 220 | Estado en memoria (`AVISOS_INICIALES`), **no** persiste ni llama a `aviso-publicar` |
| `EncuestaPage.tsx` | 172 | Formulario; tarjetas en tema claro |
| `AdminPage.tsx` | 110 | Métricas H1–H4 **hardcodeadas**; exportar CSV con datos fijos |

### 5.2 Espacio 3D / galaxia (`src/components/space/`)

| Componente | Función |
|---|---|
| `GalaxyCanvas3D.tsx` | `<Canvas>` de R3F, fondo `#020510` |
| `SemanticGalaxyDirector.tsx` | Orquesta la galaxia: niveles, filtros de salud (rojo/amarillo/verde/cerrado), barra inferior |
| `SystemStar.tsx` | Estrella de cada sector (área) |
| `Planet.tsx` | Planeta por proyecto, color según semáforo |
| `OrbitStation.tsx` | Estaciones de etapa orbitando el planeta (estado por color) |
| `EarthPlanetMesh.tsx` | Textura de la Tierra generada en canvas 2D (colores fijos) |
| `SpaceBackground.tsx` | Campo estelar con 5 colores de partícula |
| `CameraDirector.tsx` | Movimiento de cámara entre niveles |
| `Galaxy25DControls.tsx` | Controles de vista 2.5D |
| `GalaxyMinimap.tsx` | Radar 2.5D (`RADAR 2.5D`) |
| `GalaxySearchBar.tsx` | Buscador con dropdown (portal, z 60) |
| `PlanetHUDTop.tsx` | HUD superior del planeta seleccionado (etapas, bloqueos) |
| `PlanetHUDCard.tsx` | Tarjeta HUD con resumen y acciones |
| `StageGlassPanel.tsx` | Panel de etapa (3 atajos) |
| `StageScreenTooltip.tsx` | Tooltip de etapa en pantalla |
| `navigationStore.ts` | Store Zustand: nivel de navegación, proyecto/etapa activos, búsqueda |
| `galaxyData.ts` | Sectores (áreas) y posiciones en grilla 3 columnas |

### 5.3 Componentes generales (`src/components/`)

| Componente | Función |
|---|---|
| `ChatAsistente.tsx` | Chat del asistente: sugerencias, valoración, pie obligatorio. Lee proyectos del seed |
| `CompartirPopover.tsx` | Compartir: imprimir/PDF, copiar texto sin correos, copiar enlace, toast |
| `DevUserSelector.tsx` | Selector de 6 usuarios de prueba (`USUARIOS_SEED`) |

### 5.4 Hooks, lib y constantes

| Archivo | Función |
|---|---|
| `hooks/useRegistrarVista.ts` | Inserta `evento_uso` al montar (sin bloquear) |
| `hooks/useHideLabelsUnderHud.ts` | Oculta etiquetas 3D que quedan bajo el HUD |
| `lib/proyectosData.ts` | Seed de proyectos (`obtenerProyectosSeed`, `esProyectoVisible`) |
| `lib/supabase.ts` | Cliente Supabase. Fallback a `127.0.0.1:54321` y anon key dummy |
| `constants/zLayers.ts` | Capas de z-index (ver sección 7.4) |

---

## 6. Datos, roles y visibilidad

### 6.1 Usuarios de prueba (`DevUserSelector.tsx`)

| Email | Rol | Área |
|---|---|---|
| admin@empresa.cl | Admin | — |
| gerencia@empresa.cl | Gerencia | — |
| valeria.soto@empresa.cl | Solicitante | (área) |
| esteban.lagos@empresa.cl | Solicitante | (área) |
| carlos.dev@empresa.cl | Ejecutor | — |
| paula.qa@empresa.cl | Ejecutor | — |
| jose.miguel@empresa.cl | Ejecutor | — |

El selector se renderiza **siempre** en el header (no hay flag `DEV_AUTH`).

### 6.2 Visibilidad de proyectos

`esProyectoVisible(p, email, rol, area)` en `proyectosData.ts` aplica la misma lógica que la RLS de la especificación (Admin/Gerencia ven todo; Solicitante por área; Ejecutor por participación). Es **lógica duplicada en cliente**, no una barrera de seguridad.

### 6.3 Escritura

Única escritura real a Supabase: `evento_uso` desde `useRegistrarVista`. Los errores se ignoran en silencio.

---

## 7. Sistema visual

### 7.1 Tipografía

Cargada desde Google Fonts en `app/index.html`:

| Familia | Clase Tailwind | Uso |
|---|---|---|
| **Rajdhani** 500–800 | `font-display` | Títulos del logo y del HUD |
| **Inter** 300–700 | `font-sans` (por defecto en `body`) | Texto general |
| **JetBrains Mono** 400–700 | `font-mono` | Etiquetas HUD, header, footer, datos técnicos |

Tamaños típicos: `text-[10px]`, `text-[11px]`, `text-xs` para etiquetas HUD; `text-lg` para el logo; `text-2xl` para títulos de página.

### 7.2 Utilidades propias (`index.css`)

| Clase | Efecto |
|---|---|
| `.hud-glass` | Fondo `rgba(10,15,29,.75)`, blur 16 px, borde cian 15 % |
| `.hud-glass-card` | Degradado oscuro, hover con borde cian y elevación |
| `.hud-glow-cyan / -purple / -red` | Sombras de brillo |
| `.hud-grid-pattern` | Cuadrícula de 40 px con líneas blancas al 2.5 % |
| `.animate-pulse-glow`, `.animate-radar` | Animaciones de brillo y barrido |
| `body` | Fondo `#030712` + tres degradados radiales (cian, violeta, azul) fijos |
| Scrollbar | Track `#05070f`, thumb `#1e293b`, hover `#00f2fe` |

### 7.3 Breakpoints

Tailwind por defecto (`sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1400` por `container`). Navegación completa desde `md`. Tablas/tarjetas de Resumen cambian en `md`.

### 7.4 Capas z-index (`constants/zLayers.ts`)

| Capa | Valor |
|---|---|
| Canvas 3D | 0 |
| Etiquetas 3D | 0–20 |
| HUD | 40 |
| Popovers / dropdowns | 50 |
| Modales / toasts | 60 |

Header `z-30`, chat `z-50`, footer `z-10`. Hay valores `z-*` sueltos en componentes que no usan la constante.

---

## 8. Paleta de colores

La paleta **no está centralizada**. Conviven cuatro capas que deberían unificarse.

### 8.1 Capa 1 — Tokens semánticos (`index.css`, HSL)

Definidos en `:root`. Solo se usan a través de Tailwind (`bg-background`, `text-primary`, etc.).

| Token | Valor HSL | Aprox. hex | Uso previsto |
|---|---|---|---|
| `--background` | 224 71% 4% | `#030712` | Fondo de página |
| `--foreground` | 210 40% 98% | `#f8fafc` | Texto principal |
| `--card` | 224 71% 6% | `#060b17` | Tarjetas |
| `--card-foreground` | 210 40% 98% | `#f8fafc` | Texto en tarjetas |
| `--primary` | 187 100% 50% | `#00ffff` | Acción principal, anillos |
| `--primary-foreground` | 224 71% 4% | `#030712` | Texto sobre primario |
| `--secondary` | 265 89% 66% | `#a25bf5` | Secundario (violeta) |
| `--secondary-foreground` | 210 40% 98% | `#f8fafc` | |
| `--muted` | 223 47% 11% | `#0f1a2e` | Fondos atenuados |
| `--muted-foreground` | 215 20% 65% | `#94a3b8` | Texto atenuado |
| `--accent` | 187 100% 50% | `#00ffff` | Acento |
| `--accent-foreground` | 224 71% 4% | `#030712` | |
| `--destructive` | 346 100% 60% | `#ff3366` | Error / rojo |
| `--destructive-foreground` | 210 40% 98% | `#f8fafc` | |
| `--border` / `--input` | 224 40% 18% | `#1c2a40` | Bordes |
| `--ring` | 187 100% 50% | `#00ffff` | Foco |
| `--radius` | 0.75 rem | — | Radio base |

> Nota: `--primary` (`#00ffff`) **no coincide** con el cian real que usa la app (`#00f2fe`). La app usa `#00f2fe` en casi todo el código.

### 8.2 Capa 2 — Extensiones Tailwind (`tailwind.config.js`)

| Grupo | Clave | Valor |
|---|---|---|
| `hud` | `cyan` | `#00f2fe` |
| `hud` | `violet` | `#8a2be2` |
| `hud` | `purple` | `#a855f7` |
| `hud` | `blue` | `#3b82f6` |
| `hud` | `dark` | `#05070f` |
| `hud` | `surface` | `#0a0f1d` |
| `hud` | `card` | `rgba(12,19,36,.75)` |
| `semaforo` | `verde` | `#10e396` |
| `semaforo` | `amarillo` | `#fbbf24` |
| `semaforo` | `rojo` | `#ff3366` |
| `semaforo` | `gris` | `#64748b` |

**Problema:** `bg-semaforo-verde` y similares existen, pero el código casi nunca los usa. Las vistas usan hex directos o clases de Tailwind (`emerald-400`, `amber-400`, `rose-400`).

### 8.3 Capa 3 — Colores de marca y superficies (hex directos)

| Color | Hex | Dónde |
|---|---|---|
| Cian marca | `#00f2fe` | Anillos, bordes activos, sombras, planetas "normales", órbitas activas, scrollbar hover |
| Fondo app | `#030712` | `body`, contenedor raíz (`App.tsx`) |
| Fondo header | `#040711` (85 %) | `App.tsx` |
| Fondo footer | `#030610` (90 %) | `App.tsx` |
| Fondo logo | `#060a18` | Interior del logo |
| Fondo escena 3D | `#020510` | `GalaxyCanvas3D`, `SemanticGalaxyDirector`, minimapa |
| Panel de chat | `#070b18` (95 %) | `ChatAsistente` |
| Popovers / dropdowns | `#030919` (95–98 %), `#090e1c`, `#060a18` | `CompartirPopover`, `GalaxySearchBar`, `PlanetHUDCard`, `StageScreenTooltip`, `DevUserSelector` |
| Nodo de etapa / label | `#030d22`, `#040817` (85–95 %) | `OrbitStation`, `PlanetHUDTop` |
| Tarjeta de proyecto | `#0c1630` → `#091024` → `#060a17` (seleccionada); `#0a1020` → `#070b16` → `#040710` (normal) | `ResumenPage` |
| Trazo de anillo vacío | `#1e293b` | `ResumenPage` (SVG) |
| Degradado logo | `cyan-500` → `purple-600` | `App.tsx` |
| Violeta de marca | `#8a2be2`, `#a855f7`, `purple-600` | Fondo del body, sector Compliance, degradado logo |
| Azul de marca | `#3b82f6`, `blue-500/600/700` | Radial del body, `ring-blue-500` |
| Selección de texto | `bg-cyan-500` + `text-slate-950` | `App.tsx` |

### 8.4 Capa 4 — Colores de estado (semáforo y etapas)

El semáforo **no tiene un solo color por estado**. Cada componente elige el suyo:

| Estado | Token Tailwind (`semaforo`) | `Planet.tsx` | `ResumenPage` (anillo SVG) | `SemanticGalaxyDirector` (filtros/puntos) | `ResumenPage` (select) |
|---|---|---|---|---|---|
| **Rojo / Crítico** | `#ff3366` | `#ff3366` | `#ff3366` | `#ff3366`, `rose-950/500/200` | `red-400` |
| **Amarillo / En riesgo** | `#fbbf24` | `#f59e0b` | `#fbbf24` | `#f59e0b`, `amber-950/500/200` | `amber-400` |
| **Verde / Nominal** | `#10e396` | `#00f2fe` (cian) | `#00f2fe` (cian) | `#00f2fe`, `cyan-950/500/200` | `emerald-400` |
| **Cerrado** | — | `#eab308` | — | `#eab308` | — |
| **Gris** | `#64748b` | — | — | — | — |

Estados de etapa (`OrbitStation.tsx`) y texto (`PlanetHUDTop`, `StageGlassPanel`):

| Estado de etapa | Color | Uso |
|---|---|---|
| Bloqueada | `#ff3366` (+ `ShieldAlert` rose-400 pulsando) | Estación |
| Actual | `#00f2fe` | Estación, texto `cyan-300` |
| Completada | `#10e396` (+ `CheckCircle2` emerald-400) | Estación, texto `emerald-400` |
| Reabierta (retroceso) | `#f59e0b` | Estación |
| Futura / pendiente | `#94a3b8` | Estación |
| Bloqueo activo (badge) | `amber-400` (`#fbbf24`) | `DetallePage` |

Otros estados:

| Uso | Color |
|---|---|
| Conexión OK / "en línea" | `emerald-400`, `#34d399` (sombra) — `ChatAsistente` |
| Éxito (toast, mensajes) | `emerald-50/200/800` (tema claro) |
| Advertencia | `amber-50/200/700` (tema claro), `amber-500/40` (bordes) |

### 8.5 Colores de sectores (áreas) — `galaxyData.ts`

| Área | Color | Observación |
|---|---|---|
| Operaciones | `#00f2fe` | Cian |
| Compliance | `#a855f7` | Violeta |
| Seguridad | `#ff3366` | **Mismo rojo que "crítico"** — riesgo de confusión semántica |
| Comercial | `#38bdf8` | Celeste |
| BI & Analítica | `#f59e0b` | **Mismo naranja que "amarillo"** |

### 8.6 Colores del espacio 3D

| Elemento | Colores |
|---|---|
| Campo de estrellas (`SpaceBackground`) | `#00f2fe`, `#a855f7`, `#ffffff`, `#38bdf8`, `#f59e0b` |
| Órbita inactiva | `#334155` (opacidad 0.3) |
| Órbita activa | `#00f2fe` (opacidad 0.9) |
| Tierra (textura canvas) | Océano `#092d62`→`#041026`; tierra `#1c492c`, `#265934`, `#1e4828`, `#2e6b3b`, `#295b35`; desierto `#655734`, `#83653b`; bordes `#4e4130`; noche `#01040a` con luces `#ffdf88` / `#ffdd88` |

### 8.7 Tema claro (áreas que no siguen el tema oscuro)

Se usan en `AdminPage`, `AvisosPage`, `EncuestaPage` e `ImprimirPage`:

| Uso | Clases |
|---|---|
| Tarjetas | `bg-white`, `border-slate-200`, `shadow-sm` |
| Paneles internos | `bg-slate-50`, `border-slate-100` |
| Texto | `text-slate-900` (títulos), `text-slate-700/800`, `text-slate-500` |
| Azul / verde / ámbar de acento | `text-blue-600`, `text-emerald-600`, `bg-emerald-50`, `bg-amber-50` |

El `AGENTS.md` pide "tema claro/oscuro con tokens CSS". **No hay toggle** ni `darkMode` activo: el resto de la app es oscura.

### 8.8 Escala de grises y textos (tema oscuro)

| Clase | Uso típico |
|---|---|
| `text-white` | Títulos |
| `text-slate-100/200` | Texto principal |
| `text-slate-300` | Texto secundario |
| `text-slate-400` | Metadatos y etiquetas |
| `text-slate-500` | Pie y leyendas (footer) |
| `border-slate-700/800` | Bordes de tarjetas |
| `bg-slate-900/950` | Fondos de selects y paneles |

### 8.9 Resumen de la paleta en una frase

Fondo casi negro azulado (`#030712`) · acento cian eléctrico (`#00f2fe`) · acento violeta/azul para áreas · rojo `#ff3366` / ámbar `#fbbf24` / verde `#10e396` para semáforo · grises `slate` para texto · cuatro estilos de cristal (`hud-glass`) con blur y borde cian al 15 %.

---

## 9. Hallazgos y discrepancias

### 9.1 Críticos

1. **Sin integración de datos ni auth.** El front usa el seed estático (`proyectosData.ts`); no hay llamadas a Supabase para proyectos, etapas ni cálculos. `functions/api/session.ts` no se invoca. Esto contradice `AGENTS.md` §2 y §8.
2. **Rutas sin guard de rol.** `/admin` y `/avisos` se ocultan del menú pero se abren por URL. Un Solicitante puede llegar a `/admin`.
3. **Datos inventados en `AdminPage`.** Las métricas H1–H4 y el CSV son valores fijos (`88%`, `35%`, `2.8`, `4.2`…), contra la regla de no inventar datos fuera del seed.
4. **Selector de usuario siempre activo.** `DevUserSelector` se renderiza sin condición `DEV_AUTH`; cualquier visitante cambia de rol.

### 9.2 Importantes

5. **Título de `/admin` ilegible.** `h1` con `text-slate-900` sobre fondo `#030712`.
6. **Semáforo verde inconsistente.** Cuatro verdes distintos (`#10e396`, `#00f2fe`, `emerald-400`, cian de galaxia). El verde se ve cian en la mayoría de las vistas.
7. **Colores de sector reutilizan estados.** Seguridad = rojo crítico; BI = amarillo.
8. **Tema claro en 4 vistas, oscuro en el resto**, sin toggle.
9. **`AvisosPage` sin persistencia.** Edita y "publica" en memoria; no llama a `aviso-publicar`.
10. **Fallback de Supabase.** `supabase.ts` usa `http://127.0.0.1:54321` y una anon key dummy si no hay variables. Conviene fallar explícitamente en build de producción.
11. **Ruta `/` sin navegación móvil.** En `< md` el menú desaparece y no hay alternativa.

### 9.3 Limpieza

12. `src/App.css` es la plantilla de Vite (`.counter`, `.hero`, `#next-steps`) y **no está importado**. Eliminar.
13. Clases `z-*` sueltas que no usan `zLayers.ts`.
14. Dependencias sin uso visible: `@tanstack/react-query`, `date-fns` (verificar).
15. Assets de plantilla: `src/assets/react.svg`, `vite.svg`, `hero.png`, `public/icons.svg` (verificar uso).
16. Advertencias de lint: `Math.random` en render (`EarthPlanetMesh`), refs en render (`OrbitStation`), `setState` en efectos (`ChatAsistente`, `OrbitStation`), dependencias faltantes (`ChatAsistente`).
17. `test-results/.last-run.json` marca fallo del E2E; los screenshots del spec se escriben en la raíz de `app/`.

### 9.4 Diferencias con la especificación

| Especificación (`AGENTS.md`) | Estado actual |
|---|---|
| Lectura directa desde Supabase con RLS (`v_proyecto_resumen`) | Seed estático |
| Auth por Cloudflare Access + JWT de Supabase | Selector de usuario en `localStorage` |
| Tema claro/oscuro con tokens CSS | Oscuro, con tema claro en 4 vistas |
| Resumen en tarjetas (móvil) y tabla (≥md) | Galaxia 2.5D; no hay vista de tabla en `ResumenPage` |
| Asistente con tool use vía Edge Function | Chat local sobre el seed (`ChatAsistente` con `obtenerProyectosSeed`) |
| `/encuesta` con banner en resumen | Sin banner visible en `ResumenPage` |
| Métricas H1–H4 desde vistas SQL | Valores fijos |

---

## 10. Scripts y pruebas

Desde `app/`:

```bash
npm run dev       # Vite en http://localhost:5173
npm run build     # tsc -b && vite build
npm run lint      # oxlint
npm run preview   # sirve dist/
npx tsc -p tsconfig.app.json --noEmit   # typecheck sin emitir
npx playwright test                     # e2e-galaxy.spec.ts (requiere dev en :5173)
```

Desde la raíz del repo:

```bash
deno test --allow-read supabase/functions/_shared/__tests__/   # reglas y diff/avisos
```

---

## 11. Próximos pasos sugeridos

1. Conectar `ResumenPage` y `DetallePage` a `v_proyecto_resumen` vía supabase-js con el JWT de `/api/session`.
2. Añadir guard de rol en el router (`/admin`, `/avisos`) y ocultar `DevUserSelector` fuera de `DEV_AUTH`.
3. Reemplazar métricas fijas de `AdminPage` por `v_metrica_h1..h4`.
4. Centralizar la paleta en `tailwind.config.js` con tokens `semaforo.*`, `sector.*` y `estado.*`, y migrar los hex directos.
5. Resolver el conflicto de colores: Seguridad y BI con paleta propia distinta de rojo/ámbar.
6. Unificar el tema claro/oscuro con variables CSS y eliminar `App.css`.
