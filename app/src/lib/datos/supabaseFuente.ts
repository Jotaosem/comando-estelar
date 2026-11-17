import { supabase } from '../supabase';
import type { ProyectoResumenUI } from '../proyectosData';
import { obtenerProyectosSeed } from '../proyectosData';

export async function obtenerProyectosReales(usuarioActual?: { email: string; rol: string; area?: string | null }): Promise<ProyectoResumenUI[]> {
  // 1. Llamar rpc('galaxia_resumen')
  const { data: resGalaxia, error: errGalaxia } = await supabase.rpc('galaxia_resumen');

  if (errGalaxia || !resGalaxia || resGalaxia.length === 0) {
    // Si falla o no hay datos remotos, recurrir al seed local con fallback seguro
    return obtenerProyectosSeed(usuarioActual);
  }

  // 2. Para los proyectos con puede_ver_detalle, consultar v_proyecto_canonico + calculo + etapas
  const idsConDetalle = resGalaxia.filter((p: any) => p.puede_ver_detalle).map((p: any) => p.id);

  let canonicosMap = new Map<string, any>();
  let calculosMap = new Map<string, any>();
  let etapasMap = new Map<string, any[]>();
  let bloqueosMap = new Map<string, any[]>();
  let tareasMap = new Map<string, any[]>();

  if (idsConDetalle.length > 0) {
    const [resCanonicos, resCalculos, resEtapas, resBloqueos, resTareas] = await Promise.all([
      supabase.from('v_proyecto_canonico').select('*').in('id', idsConDetalle),
      supabase.from('proyecto_calculo').select('*').in('proyecto_id', idsConDetalle),
      supabase.from('etapa').select('*').in('proyecto_id', idsConDetalle).order('orden', { ascending: true }),
      supabase.from('bloqueo').select('*').in('proyecto_id', idsConDetalle),
      supabase.from('tarea').select('*').in('proyecto_id', idsConDetalle),
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
  }

  // 3. Mapear al modelo canónico que consume el front (ProyectoResumenUI)
  return resGalaxia.map((g: any) => {
    const canonico = canonicosMap.get(g.id);
    const calculo = calculosMap.get(g.id);
    const etapas = etapasMap.get(g.id) || [];
    const bloqueos = bloqueosMap.get(g.id) || [];
    const tareas = tareasMap.get(g.id) || [];

    // Etapas default si es N1 derivado
    const etapasFinal = etapas.length > 0
      ? etapas
      : [
          { id: `${g.id}-e1`, nombre: 'Idea', orden: 1, estado: 'Completada' },
          { id: `${g.id}-e2`, nombre: 'Discovery', orden: 2, estado: 'Completada' },
          { id: `${g.id}-e3`, nombre: 'Diseño', orden: 3, estado: 'Completada' },
          { id: `${g.id}-e4`, nombre: 'Ejecución', orden: 4, estado: 'En curso' },
          { id: `${g.id}-e5`, nombre: 'Seguimiento', orden: 5, estado: 'Pendiente' },
        ];

    const etapaActual = etapasFinal.find((e: any) => e.estado === 'En curso' || e.estado === 'Bloqueada');

    return {
      id: g.id,
      nombre: g.nombre,
      area_solicitante: g.area_nombre || 'Sin clasificar',
      solicitante_nombre: 'ProntoPaga',
      solicitante_email: '',
      responsable_comunicar_nombre: g.responsable_nombre || 'Responsable no asignado',
      responsable_comunicar_email: '',
      fecha_comprometida: canonico?.fecha_comprometida || null,
      notion_url: canonico?.url_principal || null,
      etapa_actual_nombre: etapaActual?.nombre || g.fase_macro || 'Ejecución',
      avance_pct: Math.round(Number(g.avance_pct ?? calculo?.avance_pct ?? 0)),
      etapas_completadas: calculo?.etapas_completadas ?? (g.avance_pct ? Math.round((g.avance_pct / 100) * 5) : 2),
      etapas_total: calculo?.etapas_total ?? 5,
      fecha_reproyectada: g.fecha_estimada || calculo?.fecha_reproyectada || null,
      atraso_dh: calculo?.atraso_dh ?? 0,
      semaforo: (g.semaforo as any) || (calculo?.semaforo as any) || 'gris',
      motivos_semaforo: calculo?.motivos_semaforo || ['Actualizado provisorio vía sync'],
      bloqueos_abiertos: calculo?.bloqueos_abiertos ?? bloqueos.length,
      ultima_actualizacion: canonico?.actualizado_origen_en || new Date().toISOString(),
      sin_actualizar: calculo?.sin_actualizar ?? false,
      alertas_gobierno: calculo?.alertas_gobierno || [],
      desglose: calculo?.desglose || null,
      cerrado: calculo?.cerrado ?? (g.fase_macro === 'Cerrado'),
      etapas: etapasFinal,
      bloqueos,
      tareas,
      callsign: canonico?.codigo_visible || g.id.slice(0, 8).toUpperCase(),
      descripcion: canonico?.descripcion || canonico?.objetivo || 'Sin descripción táctica registrada en la fuente.',
      // Campos P3 añadidos al modelo
      puede_ver_detalle: g.puede_ver_detalle,
      nivel_detalle: (g.nivel_detalle || canonico?.nivel_detalle || 'N1') as 'N1' | 'N2' | 'N3',
      url_principal: canonico?.url_principal || null,
      proximo_paso: canonico?.proximo_paso || null,
      decisiones_pendientes: canonico?.decisiones_pendientes || null,
      riesgos_texto: canonico?.riesgos_texto || null,
    };
  });
}
