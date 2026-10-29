/**
 * _shared/diff.ts
 * Compara el estado anterior y el nuevo payload de sincronización para
 * detectar cambios granulares, retrocesos de etapa y creación/eliminación de entidades.
 */

import type { ProyectoN, EtapaN, BloqueoN, TareaN, EventoTipo } from './tipos.ts';

export interface EventoCambioDetectado {
  proyecto_id?: string;
  proyecto_notion_id: string;
  entidad: 'proyecto' | 'etapa' | 'bloqueo' | 'tarea';
  entidad_id: string;
  campo: string;
  valor_anterior: any;
  valor_nuevo: any;
  tipo: EventoTipo;
  notion_editado_en?: string;
}

export function detectarCambiosProyecto(
  anterior: ProyectoN | null,
  actual: ProyectoN
): EventoCambioDetectado[] {
  const eventos: EventoCambioDetectado[] = [];
  if (!anterior) {
    eventos.push({
      proyecto_notion_id: actual.notion_id,
      entidad: 'proyecto',
      entidad_id: actual.notion_id,
      campo: '*',
      valor_anterior: null,
      valor_nuevo: actual,
      tipo: 'creado',
      notion_editado_en: actual.notion_editado_en,
    });
    return eventos;
  }

  const campos: (keyof ProyectoN)[] = [
    'nombre',
    'area_solicitante',
    'solicitante_email',
    'responsable_comunicar_email',
    'fecha_comprometida',
  ];

  for (const c of campos) {
    if (anterior[c] !== actual[c]) {
      eventos.push({
        proyecto_notion_id: actual.notion_id,
        entidad: 'proyecto',
        entidad_id: actual.notion_id,
        campo: c,
        valor_anterior: anterior[c],
        valor_nuevo: actual[c],
        tipo: 'actualizado',
        notion_editado_en: actual.notion_editado_en,
      });
    }
  }

  return eventos;
}

export function detectarCambiosEtapa(
  anterior: EtapaN | null,
  actual: EtapaN,
  proyectoNotionId: string
): EventoCambioDetectado[] {
  const eventos: EventoCambioDetectado[] = [];
  if (!anterior) {
    eventos.push({
      proyecto_notion_id: proyectoNotionId,
      entidad: 'etapa',
      entidad_id: actual.notion_id,
      campo: '*',
      valor_anterior: null,
      valor_nuevo: actual,
      tipo: 'creado',
      notion_editado_en: actual.notion_editado_en,
    });
    return eventos;
  }

  // Detectar retroceso: si estaba Completada y ahora pasa a otro estado
  if (anterior.estado === 'Completada' && actual.estado !== 'Completada') {
    eventos.push({
      proyecto_notion_id: proyectoNotionId,
      entidad: 'etapa',
      entidad_id: actual.notion_id,
      campo: 'estado',
      valor_anterior: anterior.estado,
      valor_nuevo: actual.estado,
      tipo: 'retroceso',
      notion_editado_en: actual.notion_editado_en,
    });
  } else if (anterior.estado !== actual.estado) {
    eventos.push({
      proyecto_notion_id: proyectoNotionId,
      entidad: 'etapa',
      entidad_id: actual.notion_id,
      campo: 'estado',
      valor_anterior: anterior.estado,
      valor_nuevo: actual.estado,
      tipo: 'actualizado',
      notion_editado_en: actual.notion_editado_en,
    });
  }

  const otrosCampos: (keyof EtapaN)[] = ['nombre', 'orden', 'responsable_email', 'duracion_dh', 'fin_real'];
  for (const c of otrosCampos) {
    if (anterior[c] !== actual[c]) {
      eventos.push({
        proyecto_notion_id: proyectoNotionId,
        entidad: 'etapa',
        entidad_id: actual.notion_id,
        campo: c,
        valor_anterior: anterior[c],
        valor_nuevo: actual[c],
        tipo: 'actualizado',
        notion_editado_en: actual.notion_editado_en,
      });
    }
  }

  return eventos;
}

export function detectarCambiosBloqueo(
  anterior: BloqueoN | null,
  actual: BloqueoN,
  proyectoNotionId: string
): EventoCambioDetectado[] {
  const eventos: EventoCambioDetectado[] = [];
  if (!anterior) {
    eventos.push({
      proyecto_notion_id: proyectoNotionId,
      entidad: 'bloqueo',
      entidad_id: actual.notion_id,
      campo: '*',
      valor_anterior: null,
      valor_nuevo: actual,
      tipo: 'creado',
      notion_editado_en: actual.notion_editado_en,
    });
    return eventos;
  }

  if (anterior.fecha_cierre !== actual.fecha_cierre) {
    eventos.push({
      proyecto_notion_id: proyectoNotionId,
      entidad: 'bloqueo',
      entidad_id: actual.notion_id,
      campo: 'fecha_cierre',
      valor_anterior: anterior.fecha_cierre,
      valor_nuevo: actual.fecha_cierre,
      tipo: 'actualizado',
      notion_editado_en: actual.notion_editado_en,
    });
  }

  return eventos;
}
