// n8n · Code node "Adaptador Notion → canónico"
// Modo: "Run Once for All Items". Entrada: salida del nodo Notion "Get Many" (Simplify activado),
// con propiedades property_* como en el JSON de seguimiento.
// Salida: un solo item { run_id, fuente, filas } para insertar en ingesta_cruda.

const FUENTE = 'notion_seguimiento';
const RUN_ID = `${FUENTE}-${$execution.id}-${new Date().toISOString()}`;

// Quita emojis (ej. "🟢 En control" → "En control")
const sinEmojis = (v) =>
  (v ?? '').toString()
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
    .trim();

// Fechas de Notion: { start, end } o texto
const fecha = (v) => (v && typeof v === 'object' ? v.start : v) || null;
const texto = (v) => (v ?? '').toString().trim();

const filas = $input.all().map(({ json: p }) => ({
  run_id: RUN_ID,
  fuente_codigo: FUENTE,
  entidad: 'proyecto',
  id_origen: p.id,
  payload: {
    nombre: texto(p.property_proyecto || p.name),
    url: p.url || null,
    area: texto(p.property_sponsor_rea),
    estado: texto(p.property_estado),
    responsable_email: (p.property_responsable || [])[0] || null,
    fecha_inicio: fecha(p.property_inicio),
    fecha_comprometida: fecha(p.property_fecha_objetivo),
    objetivo: texto(p.property_objetivo),
    prioridad: p.property_prioridad || null,
    impacto: p.property_impacto || null,
    alcance: p.property_alcance || null,
    proximo_paso: texto(p.property_pr_ximo_paso),
    decisiones_pendientes: texto(p.property_decisiones_pendientes),
    riesgos: texto(p.property_riesgos_bloqueos),
    avance: p.property_avance ?? null,
    salud: sinEmojis(p.property_salud),
    actualizado_en: p.property_ltima_actualizaci_n || null,
    // Agregar la propiedad "Código Gestor" en Notion para vincular con el Gestor automáticamente
    codigo_gestor: texto(p.property_c_digo_gestor) || null,
    tareas_ids: p.property_tareas_semanales || [],
  },
}));

return [{ json: { run_id: RUN_ID, fuente: FUENTE, total: filas.length, filas } }];
