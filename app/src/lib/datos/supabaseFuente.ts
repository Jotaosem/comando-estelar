import { supabase } from '../supabase';
import { mapProyecto, type ProyectoView } from '../../data/proyectoView';

export async function obtenerProyectosReales(_usuarioActual?: { email: string; rol: string; area?: string | null }): Promise<ProyectoView[]> {
  // 1. Llamar rpc('galaxia_resumen')
  const { data: resGalaxia, error: errGalaxia } = await supabase.rpc('galaxia_resumen');

  if (errGalaxia) {
    console.error('Error al llamar rpc(galaxia_resumen) en Supabase:', errGalaxia);
    throw new Error(`Error en Supabase (galaxia_resumen): ${errGalaxia.message || errGalaxia.code || 'Permiso denegado'}`);
  }

  if (!resGalaxia || resGalaxia.length === 0) {
    return [];
  }

  // 2. Para los proyectos con puede_ver_detalle, consultar v_proyecto_canonico + calculo + etapas
  const idsConDetalle = resGalaxia.filter((p: any) => p.puede_ver_detalle).map((p: any) => p.id);

  let canonicosMap = new Map<string, any>();
  let calculosMap = new Map<string, any>();
  let etapasMap = new Map<string, any[]>();
  let bloqueosMap = new Map<string, any[]>();
  let tareasMap = new Map<string, any[]>();
  let eventosMap = new Map<string, any[]>();

  if (idsConDetalle.length > 0) {
    const [resCanonicos, resCalculos, resEtapas, resBloqueos, resTareas, resEventos] = await Promise.all([
      supabase.from('v_proyecto_canonico').select('*').in('id', idsConDetalle),
      supabase.from('proyecto_calculo').select('*').in('proyecto_id', idsConDetalle),
      supabase.from('etapa').select('*').in('proyecto_id', idsConDetalle).order('orden', { ascending: true }),
      supabase.from('bloqueo').select('*').in('proyecto_id', idsConDetalle),
      supabase.from('tarea').select('*').in('proyecto_id', idsConDetalle),
      supabase.from('evento_cambio').select('*').in('proyecto_id', idsConDetalle).order('detectado_en', { ascending: false }).limit(60),
    ]);

    if (resCanonicos.data) {
      resCanonicos.data.forEach((c) => canonicosMap.set(c.id, c));
    }
    if (resCalculos.data) {
      resCalculos.data.forEach((calc) => calculosMap.set(calc.proyecto_id, calc));
    }
    if (resEtapas.data) {
      resEtapas.data.forEach((e) => {
        const arr = etapasMap.get(e.proyecto_id) || [];
        arr.push(e);
        etapasMap.set(e.proyecto_id, arr);
      });
    }
    if (resBloqueos.data) {
      resBloqueos.data.forEach((b) => {
        const arr = bloqueosMap.get(b.proyecto_id) || [];
        arr.push(b);
        bloqueosMap.set(b.proyecto_id, arr);
      });
    }
    if (resTareas.data) {
      resTareas.data.forEach((t) => {
        const arr = tareasMap.get(t.proyecto_id) || [];
        arr.push(t);
        tareasMap.set(t.proyecto_id, arr);
      });
    }
    if (resEventos.data) {
      resEventos.data.forEach((ev) => {
        const arr = eventosMap.get(ev.proyecto_id) || [];
        arr.push(ev);
        eventosMap.set(ev.proyecto_id, arr);
      });
    }
  }

  // 3. Mapear cada fila con mapProyecto combinando datos de la RPC y complementarios
  return resGalaxia.map((g: any) => {
    const canonico = canonicosMap.get(g.id);
    const calculo = calculosMap.get(g.id);
    const etapas = etapasMap.get(g.id) || [];
    const bloqueos = bloqueosMap.get(g.id) || [];
    const tareas = tareasMap.get(g.id) || [];
    const historial = eventosMap.get(g.id) || [];

    const filaCombinada = {
      ...canonico,
      ...calculo,
      ...g,
      id: g.id,
      nombre: g.nombre || canonico?.nombre,
      codigo: canonico?.codigo_visible || g.codigo || null,
      fase_macro: g.fase_macro || canonico?.fase_macro,
      etapa_actual: g.etapa_actual || g.etapa_actual_nombre || calculo?.etapa_actual_nombre || '',
      cancelado: Boolean(g.cancelado || g.fase_macro === 'Cancelado'),
      cerrado: Boolean(g.cerrado || calculo?.cerrado || g.fase_macro === 'Cerrado'),
      semaforo: g.semaforo || calculo?.semaforo || 'gris',
      motivos_semaforo: g.motivos_semaforo || calculo?.motivos_semaforo,
      avance_pct: g.avance_pct ?? calculo?.avance_pct ?? 0,
      fecha_comprometida: g.fecha_comprometida || canonico?.fecha_comprometida || null,
      fecha_estimada: g.fecha_estimada || calculo?.fecha_reproyectada || canonico?.fecha_comprometida || null,
      atraso_dh: g.atraso_dh !== undefined ? g.atraso_dh : calculo?.atraso_dh,
      area_nombre: g.area_nombre || canonico?.area_nombre || 'Sin clasificar',
      responsable_nombre: g.responsable_nombre || canonico?.responsable_nombre || 'Sin asignar',
      objetivo: g.objetivo || canonico?.objetivo || null,
      prioridad: g.prioridad || canonico?.prioridad || null,
      impacto: g.impacto || canonico?.impacto || null,
      alcance: g.alcance || canonico?.alcance || null,
      salud_declarada: g.salud_declarada || canonico?.salud_declarada || null,
      ultima_actualizacion: g.ultima_actualizacion || canonico?.actualizado_origen_en || calculo?.ultima_actualizacion || null,
      nivel_detalle: g.nivel_detalle || canonico?.nivel_detalle || 'N1',
      alertas_gobierno: g.alertas_gobierno || calculo?.alertas_gobierno || [],
      url_origen: g.url_origen || canonico?.url_principal || g.url_principal || null,
      puede_ver_detalle: g.puede_ver_detalle !== false,
      etapas,
      bloqueos,
      tareas,
      historial,
    };

    return mapProyecto(filaCombinada);
  });
}
