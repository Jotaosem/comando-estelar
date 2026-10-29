/**
 * _shared/avisos.ts
 * Generación determinística de avisos preparados para el responsable de comunicar.
 */

import type { AvisoTipo, CalculoResultado, ProyectoN } from './tipos.ts';

export function formatearFechaDDMM(fechaIso?: string | null): string {
  if (!fechaIso) return 's/f';
  const partes = fechaIso.split('-');
  if (partes.length >= 3) {
    return `${partes[2]}/${partes[1]}`;
  }
  return fechaIso;
}

export function construirMensajeAviso(params: {
  proyecto: ProyectoN;
  calculo: CalculoResultado;
  resumenCambio: string;
  urlApp: string;
}): string {
  const { proyecto, calculo, resumenCambio, urlApp } = params;

  const emojiSemaforo: Record<string, string> = {
    verde: '🟢',
    amarillo: '🟡',
    rojo: '🔴',
    gris: '⚪',
  };

  const emoji = emojiSemaforo[calculo.semaforo] || '⚪';
  const motivoTexto = calculo.motivos_semaforo[0] || 'Al día';
  const fechaEst = formatearFechaDDMM(calculo.fecha_reproyectada);
  const fechaComp = formatearFechaDDMM(proyecto.fecha_comprometida);
  const signoAtraso = calculo.atraso_dh > 0 ? `+${calculo.atraso_dh}` : `${calculo.atraso_dh}`;
  const detalleBloqueos = calculo.bloqueos_abiertos > 0
    ? `(${calculo.desglose.bloqueos[0]?.motivo || 'pendiente'})`
    : '';

  const idProyecto = proyecto.id || proyecto.notion_id;
  const linkDetalle = `${urlApp.replace(/\/$/, '')}/proyectos/${idProyecto}`;

  return [
    `📌 *${proyecto.nombre}* — ${resumenCambio}`,
    `Etapa actual: ${calculo.etapa_actual_nombre || 'En curso'} (${calculo.avance_pct}%) · Semáforo: ${emoji} ${motivoTexto}`,
    `Fecha estimada: ${fechaEst} (comprometida ${fechaComp}, ${signoAtraso} días hábiles)`,
    `Bloqueos abiertos: ${calculo.bloqueos_abiertos} ${detalleBloqueos}`.trim(),
    `Detalle: ${linkDetalle}`,
  ].join('\n');
}

export function determinarCambioRelevante(eventos: Array<{ tipo: string; entidad: string; campo: string }>): {
  esRelevante: boolean;
  tipoAviso: AvisoTipo;
  resumen: string;
} {
  const retroceso = eventos.find((e) => e.tipo === 'retroceso');
  if (retroceso) {
    return {
      esRelevante: true,
      tipoAviso: 'retroceso',
      resumen: 'Retroceso de etapa detectado',
    };
  }

  const bloqueoNuevo = eventos.find((e) => e.entidad === 'bloqueo' && e.tipo === 'creado');
  if (bloqueoNuevo) {
    return {
      esRelevante: true,
      tipoAviso: 'bloqueo_nuevo',
      resumen: 'Nuevo bloqueo registrado',
    };
  }

  const cambioEtapa = eventos.find((e) => e.entidad === 'etapa' && e.campo === 'estado');
  if (cambioEtapa) {
    return {
      esRelevante: true,
      tipoAviso: 'cambio_etapa',
      resumen: 'Cambio de estado de etapa',
    };
  }

  return {
    esRelevante: false,
    tipoAviso: 'cambio_etapa',
    resumen: 'Actualización general',
  };
}
