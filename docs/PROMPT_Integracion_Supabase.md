# Tarea: integrar Comando Estelar con el modelo canónico multi-fuente

Lee primero `AGENTS.md` y `docs/ARQUITECTURA_DATOS.md`. Estas reglas siguen vigentes: no romper lo que funciona, `npm run test:e2e` en verde antes de cerrar, tokens de marca WWP, RLS en todas las tablas, nunca `service_role` en el front ni en el asistente, Notion y el Gestor son solo lectura, cero datos reales en el repo.

## Contexto (ya hecho, no lo rehagas)
La base ya tiene aplicadas cinco migraciones que están en `supabase/migrations/`:
- `20261117000000_base_prototipo.sql`: modelo base de AGENTS.md §5 (tablas, enums, `app_email`, `app_rol`, RLS). La tabla antigua `proyectos` (plural) ya no se usa: migra el front y luego elimínala con una migración.
- `20261117000100_modelo_canonico.sql`: tablas `area`, `area_alias`, `fuente`, `persona`, `mapeo_estado`, `mapeo_motivo`, `proyecto_fuente`, `sync_ejecucion`; enum `fase_macro`; columnas nuevas en `proyecto`, `etapa`, `tarea`, `bloqueo`, `evento_cambio` y `proyecto_calculo`; vistas `v_proyecto_canonico` y `v_fuente_estado`.
- `20261117000200_ingesta_notion.sql`: tabla `ingesta_cruda`, RPC `procesar_ingesta_n1(run_id, fuente, completo)` (solo `service_role`) y `generar_etapas_derivadas`.
- `20261117000300_acceso_por_perfil.sql`: perfil nuevo `Gerente de área`, tablas `usuario_area` (varias áreas por usuario) y `usuario_proyecto`, `proyecto_visible()` reescrita, funciones `galaxia_resumen()` y `ultima_sincronizacion()`, `persona` sin correos por API, `fuente.config` oculta, y perfil Ejecutor automático para responsables que llegan de Notion.

**Perfiles** (ya aplicados en la base, la UI debe reflejarlos):
| Perfil | Ve |
|---|---|
| Admin | Todo + administración |
| Gerencia (mostrar como "Gerencia general") | Todos los proyectos |
| Gerente de área | Proyectos donde su área es la solicitante o la sponsor |
| Solicitante | Proyectos de sus áreas (solicitante o sponsor) + asignados |
| Ejecutor | Proyectos donde participa + asignados |
| Sin perfil | Solo la galaxia con resúmenes |
Dentro de un proyecto visible se ve todo, incluidos riesgos y decisiones (transparencia). La profundidad por perfil es solo de experiencia: Gerencia, Gerente de área y Solicitante abren con el detalle colapsado; Ejecutor y Admin, abierto. Nunca mostrar correos de personas, solo nombres.

- `20261117000400_calculo_provisorio.sql`: `recalcular_provisorio(uuid[])` calcula en SQL avance, fecha, atraso y semáforo de los proyectos N1 (regla provisoria).

n8n carga Notion → `ingesta_cruda` → RPC `procesar_ingesta_n1` → RPC `recalcular_provisorio` con `proyectos_afectados`. Los datos reales ya están cargados. Los proyectos de Notion son nivel **N1** (sin etapas reales; se generan etapas derivadas de la fase macro, con `origen='estado_derivado'`).

## Qué hacer (en este orden, un commit por punto)
1. **Tipos**: `supabase gen types typescript` y actualiza `src/types`. No edites las migraciones existentes; si algo falta, crea una migración nueva.
2. **Lectura**: las consultas de proyectos usan `v_proyecto_canonico` (área, fase_macro, nivel_detalle, fuente_principal, url_principal). Las vistas existentes no cambian de forma visible, solo la fuente de datos.
3. **Autenticación (prioridad 1, sin esto la app no muestra nada)**: toda lectura usa el JWT del usuario con su correo (`auth.jwt()->>'email'`). Para el piloto inmediato usa Supabase Auth con enlace mágico al correo corporativo (restringe el dominio a `@prontopaga.com`); el puente con Cloudflare Access de AGENTS.md queda para después. Nunca uses `service_role` en el front.
   - Edge Function `recalcular` para N2/N3: más adelante. N1 ya se calcula en SQL; no la dupliques.
4. **Acceso por perfil** (la RLS ya está hecha, no la reescribas):
   - La galaxia y la lista usan `rpc('galaxia_resumen')`. Los proyectos con `puede_ver_detalle = false` se muestran con su resumen, pero el detalle aparece bloqueado con el texto "Sin acceso al detalle. Pide acceso al administrador".
   - Usuario sin perfil: entra directo a la galaxia con resúmenes; sin detalle, sin asistente y sin Admin.
   - El asistente lee con el JWT del usuario: no responde sobre proyectos sin `puede_ver_detalle`.
   - El modo dev agrega un usuario de prueba por perfil (6, incluido "sin perfil").
5. **UI** (cambios mínimos, sin rediseñar):
   - Badge de nivel en card y detalle: N1 "Seguimiento general", N3 "Detalle completo". En N1, las etapas derivadas se muestran sin tareas y con el texto "Detalle por etapa no disponible en esta fuente".
   - "Datos al hh:mm" en la cabecera, desde `rpc('ultima_sincronizacion')`; aviso discreto si tiene más de 6 h en horario hábil.
   - Botón "Abrir en origen" con `url_principal` (nueva pestaña, `rel="noopener"`).
   - Mostrar `proximo_paso`, `decisiones_pendientes` y `riesgos_texto` en el detalle cuando existan.
   - Filtro por área usando la tabla `area` (no texto libre).
6. **Admin** (solo rol Admin): pestaña **Usuarios** (correo, nombre, perfil, una o varias áreas en `usuario_area`, proyectos asignados en `usuario_proyecto`, activo; los responsables de Notion aparecen como Ejecutor y el Admin puede cambiarlos) y pestañas **Fuentes** (`v_fuente_estado` + historial de `sync_ejecucion` con errores), **Áreas** (CRUD de `area` y `area_alias`, lista de proyectos en "Sin clasificar") y **Duplicados** (vincular manualmente un proyecto a otra fuente: insertar en `proyecto_fuente` con `vinculado_por='admin'`).
7. **Ruta `/ir/:fuente/:id`**: resuelve `proyecto_fuente` (por `id_origen`) o `proyecto.codigo_visible` y redirige al detalle; si no existe, muestra la pantalla vacía estándar. Es el deep link que usará el Gestor.
8. **`sync-ingest`**: si existe, déjala como envoltura que llama a la RPC (no dupliques la lógica). Documenta en `docs/DECISIONES.md`.
9. **Gestor (N3)**: todavía no. Deja `src/ingesta/adaptadores/gestor.ts` con la interfaz y un TODO; la fuente `gestor_wwp` está inactiva.

## Pruebas obligatorias
- Fixture de prueba (datos inventados, nunca reales) con 3 proyectos N1: uno con área por alias ("Innovation"), uno sin área (→ "Sin clasificar") y uno que retrocede de fase. Verifica eventos `retroceso` y `regla_aplicada='provisoria'`.
- `test-rls.ts` con los 6 perfiles: Admin y Gerencia ven todo; Gerente de área ve su área como solicitante y como sponsor; Solicitante, sus áreas; Ejecutor, solo donde participa; sin perfil, 0 detalles y todos los resúmenes. Nadie lee `persona.email` ni `fuente.config` por la API; `sync_ejecucion` solo Admin.
- E2E: badge N1, detalle bloqueado para proyectos sin acceso, "Datos al hh:mm", `/ir/notion_seguimiento/<id>` abre el detalle, un usuario no Admin no ve las pestañas de Admin.
- `npm run test:e2e` y `npm run lint:colores` en verde.

## Entrega
Resumen corto: archivos tocados, migraciones nuevas, decisiones en `docs/DECISIONES.md` y lo pendiente.
