/**
 * _shared/reglas.ts
 * Reglas puras de cálculo de avance, fecha reproyectada, atraso, semáforo y gobierno.
 */

import {
  siguienteHabil,
  diasHabilesEntre,
  sumarDiasHabiles,
} from './fechas.ts';
import type {
  ProyectoN,
  EtapaN,
  BloqueoN,
  ParametrosCalculo,
  CalculoResultado,
  Semaforo,
  DesgloseCalculo,
} from './tipos.ts';

export function calcularProyecto(
  proyecto: ProyectoN,
  etapas: EtapaN[],
  bloqueos: BloqueoN[],
  ultimoCambioIso: string | null,
  hoy: string, // YYYY-MM-DD
  feriados: Set<string>,
  params: ParametrosCalculo
): CalculoResultado {
  const alertasGobierno: string[] = [];

  // 1. Validaciones de gobierno iniciales
  if (!proyecto.responsable_comunicar_email || proyecto.responsable_comunicar_email.trim() === '') {
    alertasGobierno.push('Falta responsable de comunicar en el proyecto');
  }
  if (!proyecto.fecha_comprometida) {
    alertasGobierno.push('Falta fecha comprometida en el proyecto');
  }

  // Ordenar etapas por orden ascendente
  const etapasOrdenadas = [...etapas].sort((a, b) => a.orden - b.orden);
  const etapasTotal = etapasOrdenadas.length;
  const etapasCompletadas = etapasOrdenadas.filter((e) => e.estado === 'Completada').length;

  for (const e of etapasOrdenadas) {
    if (!e.responsable_email || e.responsable_email.trim() === '') {
      alertasGobierno.push(`Etapa "${e.nombre}" sin responsable asignado`);
    }
  }

  // 2. Etapa actual: menor orden con estado != Completada
  const etapaActual = etapasOrdenadas.find((e) => e.estado !== 'Completada') || null;
  const cerrado = etapasTotal > 0 && etapasCompletadas === etapasTotal;

  // 3. Avance %
  const avancePct = etapasTotal > 0 ? Math.round((etapasCompletadas / etapasTotal) * 100) : 0;

  // 4. Duración de cada etapa y cálculo de fecha re-proyectada
  const etapasDesglose: Array<{ nombre: string; estado: string; dias: number }> = [];
  let sumaDiasRestantes = 0;

  for (const e of etapasOrdenadas) {
    let dur = e.duracion_dh;
    if (dur === undefined || dur === null) {
      if (e.inicio_plan && e.fin_plan) {
        dur = diasHabilesEntre(e.inicio_plan, e.fin_plan, feriados);
      } else {
        dur = params.duracion_default_dh;
        alertasGobierno.push(`Etapa "${e.nombre}" sin duración estimada (usando default ${params.duracion_default_dh} dh)`);
      }
    }

    if (e.estado === 'Completada') {
      etapasDesglose.push({ nombre: e.nombre, estado: e.estado, dias: 0 });
    } else if (e.estado === 'En curso' || e.estado === 'Bloqueada') {
      const inicioReferencia = e.inicio_real || e.inicio_plan || hoy;
      const transcurridos = diasHabilesEntre(inicioReferencia, hoy, feriados);
      const restante = Math.max(0, dur - transcurridos);
      sumaDiasRestantes += restante;
      etapasDesglose.push({ nombre: e.nombre, estado: e.estado, dias: restante });
    } else {
      // Pendiente
      sumaDiasRestantes += dur;
      etapasDesglose.push({ nombre: e.nombre, estado: e.estado, dias: dur });
    }
  }

  // Bloqueos abiertos (de etapas no completadas)
  const etapasNoCompletadasIds = new Set(
    etapasOrdenadas.filter((e) => e.estado !== 'Completada').map((e) => e.notion_id || e.id)
  );

  const bloqueosAbiertos = bloqueos.filter((b) => {
    const estaAbierto = !b.fecha_cierre;
    const etapaId = b.etapa_notion_id || b.etapa_id;
    return estaAbierto && (!etapaId || etapasNoCompletadasIds.has(etapaId));
  });

  const bloqueosDesglose = bloqueosAbiertos.map((b) => ({
    descripcion: b.descripcion,
    motivo: b.motivo,
    dias: params.dias_por_bloqueo,
  }));

  const diasPorBloqueos = bloqueosAbiertos.length * params.dias_por_bloqueo;
  const baseFecha = siguienteHabil(hoy, feriados);

  let fechaReproyectada: string | null = null;
  let totalDh = 0;

  if (cerrado) {
    // Si cerrado, fecha es el máximo de fin_real
    const fines = etapasOrdenadas.map((e) => e.fin_real).filter(Boolean) as string[];
    fechaReproyectada = fines.length > 0 ? fines.sort().reverse()[0] : hoy;
    totalDh = 0;
  } else {
    totalDh = sumaDiasRestantes + diasPorBloqueos;
    fechaReproyectada = sumarDiasHabiles(baseFecha, totalDh, feriados);
  }

  const desglose: DesgloseCalculo = {
    base: baseFecha,
    etapas: etapasDesglose,
    bloqueos: bloqueosDesglose,
    total_dh: totalDh,
    fecha: fechaReproyectada,
  };

  // 5. Atraso con signo
  let atrasoDh = 0;
  if (proyecto.fecha_comprometida && fechaReproyectada) {
    if (fechaReproyectada > proyecto.fecha_comprometida) {
      atrasoDh = diasHabilesEntre(proyecto.fecha_comprometida, fechaReproyectada, feriados);
    } else {
      atrasoDh = -diasHabilesEntre(fechaReproyectada, proyecto.fecha_comprometida, feriados);
    }
  }

  // 6. Semáforo y motivos
  let semaforo: Semaforo = 'verde';
  const motivosSemaforo: string[] = [];

  // Antigüedad de bloqueos abiertos
  const bloqueosConAntiguedad = bloqueosAbiertos.map((b) => {
    const dhAbierto = diasHabilesEntre(b.fecha_apertura, hoy, feriados);
    return { ...b, dhAbierto };
  });

  const bloqueoCritico = bloqueosConAntiguedad.find((b) => b.dhAbierto >= params.umbral_bloqueo_rojo_dh);

  if (!proyecto.fecha_comprometida) {
    semaforo = 'gris';
    motivosSemaforo.push('Proyecto sin fecha comprometida');
  } else if (atrasoDh > params.umbral_atraso_rojo_dh || bloqueoCritico) {
    semaforo = 'rojo';
    if (atrasoDh > params.umbral_atraso_rojo_dh) {
      motivosSemaforo.push(`Atraso de ${atrasoDh} días hábiles (umbral rojo: >${params.umbral_atraso_rojo_dh} dh)`);
    }
    if (bloqueoCritico) {
      motivosSemaforo.push(`Bloqueo de ${bloqueoCritico.motivo} abierto hace ${bloqueoCritico.dhAbierto} días hábiles`);
    }
  } else if ((atrasoDh >= 1 && atrasoDh <= 5) || bloqueosAbiertos.length >= 1) {
    semaforo = 'amarillo';
    if (atrasoDh >= 1 && atrasoDh <= 5) {
      motivosSemaforo.push(`Atraso de ${atrasoDh} días hábiles`);
    }
    if (bloqueosAbiertos.length >= 1) {
      motivosSemaforo.push(`${bloqueosAbiertos.length} bloqueo(s) abierto(s)`);
    }
  } else {
    semaforo = 'verde';
    motivosSemaforo.push(atrasoDh <= 0 ? 'Proyecto al día según lo comprometido' : 'En cronograma');
  }

  // 7. Frescura
  const timestamps: number[] = [];
  if (ultimoCambioIso) {
    timestamps.push(new Date(ultimoCambioIso).getTime());
  }
  if (proyecto.notion_editado_en) {
    timestamps.push(new Date(proyecto.notion_editado_en).getTime());
  }
  for (const e of etapas) {
    if (e.notion_editado_en) timestamps.push(new Date(e.notion_editado_en).getTime());
  }
  for (const b of bloqueos) {
    if (b.notion_editado_en) timestamps.push(new Date(b.notion_editado_en).getTime());
  }

  const maxTs = timestamps.length > 0 ? Math.max(...timestamps) : new Date(hoy).getTime();
  const ultimaActualizacion = new Date(maxTs).toISOString();

  // Días calendario desde última actualización hasta hoy
  const hoyMs = new Date(hoy).getTime();
  const diasDesdeActualizacion = Math.floor((hoyMs - maxTs) / (1000 * 60 * 60 * 24));
  const sinActualizar = diasDesdeActualizacion > params.dias_frescura;

  return {
    etapa_actual_id: etapaActual?.id || null,
    etapa_actual_nombre: etapaActual?.nombre || undefined,
    avance_pct: avancePct,
    etapas_completadas: etapasCompletadas,
    etapas_total: etapasTotal,
    fecha_reproyectada: fechaReproyectada,
    atraso_dh: atrasoDh,
    semaforo,
    motivos_semaforo: motivosSemaforo,
    bloqueos_abiertos: bloqueosAbiertos.length,
    ultima_actualizacion: ultimaActualizacion,
    sin_actualizar: sinActualizar,
    alertas_gobierno: alertasGobierno,
    desglose,
    cerrado,
    calculado_en: new Date().toISOString(),
  };
}
