// app/src/data/proyectoView.ts
// Adaptador canónico único de datos para Comando Estelar
// Transforma filas de rpc('galaxia_resumen') y vistas canónicas hacia ProyectoView

export type FaseMacro =
  | 'Idea'
  | 'Discovery'
  | 'Diseño'
  | 'Ejecución'
  | 'Seguimiento'
  | 'Cerrado'
  | 'Pausado'
  | 'Cancelado';

export type SemaforoCanonico = 'verde' | 'amarillo' | 'rojo' | 'gris';

export type EstadoDisplay = 'Nominal' | 'Alerta' | 'Crítico' | 'Sin evaluar' | 'Cerrado' | 'Cancelado';

export interface ProyectoView {
  id: string;
  nombre: string;
  codigo: string | null;
  fase_macro: FaseMacro;
  etapa_actual: string;
  cancelado: boolean;
  cerrado: boolean;
  semaforo: SemaforoCanonico;
  estado_display: EstadoDisplay;
  motivos_semaforo: string[];
  avance_pct: number;
  fecha_comprometida: string | null;
  fecha_estimada: string | null;
  atraso_dh: number | null;
  atraso_display: string;
  area_nombre: string;
  responsable_nombre: string;
  prioridad: string | null;
  impacto: string | null;
  alcance: string | null;
  salud_declarada: string | null;
  ultima_actualizacion: string | null;
  nivel_detalle: string; // N1 "Seguimiento general"
  alertas_gobierno: string[];
  url_origen: string | null;
  puede_ver_detalle: boolean;

  // Propiedades de compatibilidad con UI existente
  solicitante_nombre: string;
  solicitante_email: string;
  responsable_comunicar_email: string;
  area_solicitante: string;
  responsable_comunicar_nombre: string;
  etapa_actual_nombre: string;
  fecha_reproyectada: string | null;
  notion_url: string | null;
  url_principal: string | null;
  callsign?: string;
  descripcion?: string;
  sprint_ingreso?: string;
  sprint_comprometido?: string;
  fecha_produccion?: string;
  sprint_estimado?: string;
  bloqueos_abiertos: number;
  etapas_completadas: number;
  etapas_total: number;
  sin_actualizar: boolean;
  desglose: any;
  etapas: any[];
  bloqueos: any[];
  tareas: any[];
  historial: any[];
  proximo_paso?: string | null;
  decisiones_pendientes?: string | null;
  riesgos_texto?: string | null;
}

export const MAPEO_ALERTAS_GOBIERNO: Record<string, string> = {
  sin_fecha: 'Falta fecha objetivo',
  sin_responsable: 'Falta responsable',
  sin_area: 'Falta área',
  etapa_sin_duracion: 'Etapa sin duración estimada',
};

export function normalizarAlertasGobierno(alertas: any): string[] {
  if (!alertas || !Array.isArray(alertas)) return [];
  return alertas.map((a) => {
    if (typeof a === 'string') {
      return MAPEO_ALERTAS_GOBIERNO[a] || a;
    }
    return String(a);
  });
}

export function mapProyecto(row: any): ProyectoView {
  if (!row) {
    throw new Error('Fila vacía recibida en mapProyecto');
  }

  const cancelado = Boolean(row.cancelado || row.fase_macro === 'Cancelado');
  const cerrado = Boolean(row.cerrado || row.fase_macro === 'Cerrado');

  // Mapeo semáforo -> Estado Display
  let semaforo: SemaforoCanonico = 'gris';
  if (['verde', 'amarillo', 'rojo', 'gris'].includes(row.semaforo)) {
    semaforo = row.semaforo as SemaforoCanonico;
  }

  let estado_display: EstadoDisplay;
  if (cancelado) {
    estado_display = 'Cancelado';
  } else if (cerrado) {
    estado_display = 'Cerrado';
  } else {
    switch (semaforo) {
      case 'verde':
        estado_display = 'Nominal';
        break;
      case 'amarillo':
        estado_display = 'Alerta';
        break;
      case 'rojo':
        estado_display = 'Crítico';
        break;
      default:
        estado_display = 'Sin evaluar';
        break;
    }
  }

  // Atraso en días hábiles (null si no existe, muestra '—')
  let atraso_dh: number | null = null;
  if (row.atraso_dh !== null && row.atraso_dh !== undefined && row.atraso_dh !== '') {
    const parsed = Number(row.atraso_dh);
    if (!Number.isNaN(parsed)) {
      atraso_dh = parsed;
    }
  }
  const atraso_display = atraso_dh !== null ? `${atraso_dh > 0 ? '+' : ''}${atraso_dh}` : '—';

  // Código: solo si no es null ni vacío (NUNCA derivar fragmentos de UUID)
  const codigo = row.codigo && String(row.codigo).trim() !== '' ? String(row.codigo).trim() : null;

  // Fase macro: sin inventar valores
  const fase_macro: FaseMacro = (row.fase_macro as FaseMacro) || (cancelado ? 'Cancelado' : cerrado ? 'Cerrado' : 'Discovery');

  // Etapa actual: NO usar default ficticio "Ejecución"
  const etapa_actual = row.etapa_actual ?? row.etapa_actual_nombre ?? '';

  const fecha_comprometida = row.fecha_comprometida || null;
  const fecha_estimada = row.fecha_estimada || row.fecha_reproyectada || null;
  const url_origen = row.url_origen || row.url_principal || row.notion_url || null;

  const alertas_gobierno = normalizarAlertasGobierno(row.alertas_gobierno);

  const area_nombre = row.area_nombre || row.area_solicitante || 'Sin clasificar';
  const responsable_nombre = row.responsable_nombre || row.responsable_comunicar_nombre || 'Sin asignar';

  const avance_pct = Math.round(Number(row.avance_pct ?? 0));

  // Motivos del semáforo
  let motivos_semaforo: string[] = [];
  if (Array.isArray(row.motivos_semaforo)) {
    motivos_semaforo = row.motivos_semaforo;
  } else if (typeof row.motivos_semaforo === 'string') {
    motivos_semaforo = [row.motivos_semaforo];
  } else if (cancelado) {
    motivos_semaforo = ['Proyecto cancelado'];
  } else if (cerrado) {
    motivos_semaforo = ['Proyecto completado y cerrado'];
  } else if (semaforo === 'verde') {
    motivos_semaforo = ['En cronograma'];
  } else if (atraso_dh !== null && atraso_dh > 0) {
    motivos_semaforo = [`Atraso de ${atraso_dh} días hábiles respecto al compromiso`];
  }

  const etapas = Array.isArray(row.etapas) ? row.etapas : [];
  const bloqueos = Array.isArray(row.bloqueos) ? row.bloqueos : [];
  const tareas = Array.isArray(row.tareas) ? row.tareas : [];
  const historial = Array.isArray(row.historial) ? row.historial : [];

  return {
    id: String(row.id),
    nombre: String(row.nombre || 'Sin título'),
    codigo,
    fase_macro,
    etapa_actual,
    cancelado,
    cerrado,
    semaforo,
    estado_display,
    motivos_semaforo,
    avance_pct,
    fecha_comprometida,
    fecha_estimada,
    atraso_dh,
    atraso_display,
    area_nombre,
    responsable_nombre,
    prioridad: row.prioridad || null,
    impacto: row.impacto || null,
    alcance: row.alcance || null,
    salud_declarada: row.salud_declarada || null,
    ultima_actualizacion: row.ultima_actualizacion || null,
    nivel_detalle: row.nivel_detalle || 'N1',
    alertas_gobierno,
    url_origen,
    puede_ver_detalle: row.puede_ver_detalle !== false,

    // Compatibilidad
    solicitante_nombre: row.solicitante_nombre || 'ProntoPaga',
    solicitante_email: '', // NUNCA exponer correos
    responsable_comunicar_email: '', // NUNCA exponer correos
    area_solicitante: area_nombre,
    responsable_comunicar_nombre: responsable_nombre,
    etapa_actual_nombre: etapa_actual,
    fecha_reproyectada: fecha_estimada,
    notion_url: url_origen,
    url_principal: url_origen,
    callsign: codigo || undefined,
    descripcion: row.descripcion || row.objetivo || undefined,
    sprint_ingreso: row.sprint_ingreso || undefined,
    sprint_comprometido: row.sprint_comprometido || undefined,
    fecha_produccion: row.fecha_produccion || undefined,
    sprint_estimado: row.sprint_estimado || undefined,
    bloqueos_abiertos: Number(row.bloqueos_abiertos ?? bloqueos.filter((b: any) => !b.fecha_cierre).length),
    etapas_completadas: Number(row.etapas_completadas ?? (avance_pct ? Math.round((avance_pct / 100) * 5) : 0)),
    etapas_total: Number(row.etapas_total ?? (etapas.length > 0 ? etapas.length : 5)),
    sin_actualizar: Boolean(row.sin_actualizar),
    desglose: row.desglose || null,
    etapas,
    bloqueos,
    tareas,
    historial,
    proximo_paso: row.proximo_paso || null,
    decisiones_pendientes: row.decisiones_pendientes || null,
    riesgos_texto: row.riesgos_texto || null,
  };
}
