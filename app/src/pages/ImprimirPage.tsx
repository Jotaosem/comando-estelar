import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { obtenerProyectosSeed, type ProyectoResumenUI } from '../lib/proyectosData';
import { USUARIOS_SEED } from '../components/DevUserSelector';

export const ImprimirPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const conBloqueos = searchParams.get('bloqueos') === 'true';

  const [proyecto, setProyecto] = useState<ProyectoResumenUI | null>(null);

  useEffect(() => {
    const proyectos = obtenerProyectosSeed();
    const p = proyectos.find((item) => item.id === id);
    if (p) {
      setProyecto(p);
    }
  }, [id]);

  useEffect(() => {
    if (proyecto) {
      // Esperar brevemente a que el render se estabilice antes de invocar impresión
      const timer = setTimeout(() => {
        window.print();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [proyecto]);

  if (!proyecto) {
    return <div className="p-8 font-mono text-sm text-slate-800">Cargando proyecto...</div>;
  }

  const isCritico = proyecto.semaforo === 'rojo';
  const isAlerta = proyecto.semaforo === 'amarillo';
  const estadoTexto = isCritico ? 'Crítico' : isAlerta ? 'Alerta' : proyecto.cerrado ? 'Cerrado' : 'Nominal';
  const motivoTexto = proyecto.motivos_semaforo?.[0] || 'Sin observaciones registradas';

  // Historial: cambios de etapa y retrocesos (últimos 10)
  const historialEventos = proyecto.etapas.slice(0, 10).map((e, idx) => {
    const tipo = e.reabiertaEn ? 'Retroceso / Reabierta' : e.estado === 'Completada' ? 'Completada' : e.estado === 'En curso' ? 'En curso' : 'Planificada';
    const fecha = e.fin_real || e.reabiertaEn || e.inicio_real || e.inicio_plan || 'S/F';
    return {
      texto: `Etapa ${idx + 1}: ${e.nombre} — ${tipo} (${fecha})`,
      fecha,
    };
  });

  const hoyFormatted = new Date().toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const horaFormatted = new Date().toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white text-slate-900 p-8 max-w-3xl mx-auto font-sans text-xs leading-relaxed print:p-0 print:max-w-none print:text-[11px]">
      <style orientation="print">{`
        @page {
          size: A4 portrait;
          margin: 1.5cm;
        }
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, footer, nav, button {
            display: none !important;
          }
        }
      `}</style>

      {/* Cabecera */}
      <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-start justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
            Comando Estelar · Resumen Ejecutivo
          </span>
          <h1 className="text-xl font-bold text-slate-950 mt-0.5">
            {proyecto.nombre} {proyecto.callsign ? `(${proyecto.callsign})` : ''}
          </h1>
          <p className="text-slate-600 mt-1 italic">
            {proyecto.descripcion || 'Sin descripción'}
          </p>
        </div>
      </div>

      {/* Grid de Estado Clave */}
      <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded mb-4 text-[11px]">
        <div>
          <span className="text-slate-500 uppercase text-[9px] block">Área</span>
          <span className="font-semibold text-slate-900">{proyecto.area_solicitante}</span>
        </div>
        <div>
          <span className="text-slate-500 uppercase text-[9px] block">Etapa actual</span>
          <span className="font-semibold text-slate-900">{proyecto.etapa_actual_nombre || '—'}</span>
        </div>
        <div>
          <span className="text-slate-500 uppercase text-[9px] block">Avance</span>
          <span className="font-semibold text-slate-900">{proyecto.avance_pct}%</span>
        </div>
        <div>
          <span className="text-slate-500 uppercase text-[9px] block">Estado</span>
          <span className="font-semibold text-slate-900">{estadoTexto} · {motivoTexto}</span>
        </div>
      </div>

      {/* Fechas */}
      <div className="border border-slate-200 rounded p-3 mb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-2">
          Fechas y Proyección
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="text-slate-500 text-[9px] uppercase block">Fecha Estimada</span>
            <span className="font-semibold">{proyecto.fecha_reproyectada || 'S/D'}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] uppercase block">Fecha Comprometida</span>
            <span className="font-semibold">{proyecto.fecha_comprometida || 'S/D'}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] uppercase block">Atraso</span>
            <span className="font-semibold">
              {proyecto.atraso_dh > 0 ? `+${proyecto.atraso_dh} días hábiles` : `${proyecto.atraso_dh} días hábiles`}
            </span>
          </div>
        </div>
      </div>

      {/* Sprints */}
      <div className="border border-slate-200 rounded p-3 mb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-2">
          Sprints de Entrega
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="text-slate-500 text-[9px] uppercase block">Ingreso</span>
            <span className="font-semibold">{proyecto.sprint_ingreso || '—'}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] uppercase block">Comprometido</span>
            <span className="font-semibold">{proyecto.sprint_comprometido || '—'}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] uppercase block">Producción</span>
            <span className="font-semibold">
              {proyecto.fecha_produccion || '—'} {proyecto.sprint_estimado ? `· ${proyecto.sprint_estimado}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Bloqueos (Detalle solo si se marcó el check) */}
      {conBloqueos && (
        <div className="border border-slate-200 rounded p-3 mb-4 bg-rose-50/40">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-rose-900 mb-2">
            Detalle de Bloqueos ({proyecto.bloqueos?.length || 0})
          </h2>
          {proyecto.bloqueos && proyecto.bloqueos.length > 0 ? (
            <ul className="space-y-1.5">
              {proyecto.bloqueos.map((b: any, idx: number) => (
                <li key={idx} className="flex items-start justify-between text-[11px]">
                  <span>• <strong>{b.motivo}</strong>: {b.descripcion || 'Sin descripción'}</span>
                  <span className="text-slate-600 font-mono shrink-0 ml-2">
                    Área: {b.area_destraba || '—'} · {b.dias_abierto || b.dias || 5} días
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-600 italic">No existen bloqueos abiertos activos.</p>
          )}
        </div>
      )}

      {/* Historial: cambios de etapa y retrocesos (últimos 10) */}
      <div className="border border-slate-200 rounded p-3 mb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-2">
          Historial de Etapas (Últimos 10 eventos)
        </h2>
        <ul className="space-y-1">
          {historialEventos.map((ev, idx) => (
            <li key={idx} className="text-[10px] text-slate-700 flex justify-between">
              <span>{ev.texto}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Responsable de comunicar (solo nombre, NUNCA correo) */}
      <div className="pt-2 mb-6 text-[11px]">
        <strong>Responsable de comunicar:</strong> {proyecto.responsable_comunicar_nombre}
      </div>

      {/* Pie de página */}
      <div className="border-t border-slate-300 pt-3 text-[10px] text-slate-500 flex justify-between font-mono">
        <span>Fuente Notion · actualizado 21/10 09:00</span>
        <span>Generado por {proyecto.responsable_comunicar_nombre} · {hoyFormatted} {horaFormatted}</span>
      </div>
    </div>
  );
};
