import React, { useRef, useEffect, useState } from 'react';
import {
  User,
  ShieldAlert,
  CheckCircle2,
  Clock,
  PlayCircle,
  AlertCircle,
  History,
  MessageSquareQuote,
  X,
  ChevronDown,
} from 'lucide-react';
import { useNavigationStore } from './space/navigationStore';

interface EtapaDetalleProps {
  etapa: any;
  proyecto: any;
  onClose?: () => void;
  isModal?: boolean;
}

export const EtapaDetalle: React.FC<EtapaDetalleProps> = ({
  etapa,
  proyecto,
  onClose,
  isModal = false,
}) => {
  const [mostrarTodasTareas, setMostrarTodasTareas] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const { abrirChatConProyecto } = useNavigationStore();

  useEffect(() => {
    setMostrarTodasTareas(false);
  }, [etapa?.id]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [etapa?.id]);

  if (!etapa) return null;

  const bloqueosDeEtapa = (proyecto.bloqueos || []).filter(
    (b: any) => b.etapa_id === etapa.id || (!b.etapa_id && etapa.estado === 'Bloqueada')
  );

  const tareasDeEtapa = (proyecto.tareas || []).filter(
    (t: any) => !t.etapa_id || t.etapa_id === etapa.id
  );

  // Orden requerido: Bloqueada → En curso → Pendiente → Completada
  const estadoPrioridad: Record<string, number> = {
    'Bloqueada': 1,
    'En curso': 2,
    'Pendiente': 3,
    'Completada': 4,
  };

  const tareasOrdenadas = [...tareasDeEtapa].sort((a: any, b: any) => {
    const pA = estadoPrioridad[a.estado] || 3;
    const pB = estadoPrioridad[b.estado] || 3;
    return pA - pB;
  });

  const totalTareas = tareasOrdenadas.length;
  const pendientesTareas = tareasOrdenadas.filter((t: any) => t.estado !== 'Completada').length;
  const tareasVisibles = mostrarTodasTareas ? tareasOrdenadas : tareasOrdenadas.slice(0, 6);

  const eventosDeEtapa = (proyecto.eventos_recientes || []).filter(
    (e: any) => !e.etapa_id || e.etapa_id === etapa.id
  );

  const isBloqueada = etapa.estado === 'Bloqueada' || bloqueosDeEtapa.length > 0;
  const isCompletada = etapa.estado === 'Completada';
  const isEnCurso = etapa.estado === 'En curso';

  let statusBadge = {
    bg: 'bg-taupe-soft',
    text: 'text-taupe',
    border: 'border-taupe/40',
    label: etapa.estado,
  };

  if (isBloqueada) {
    statusBadge = {
      bg: 'bg-health-red-soft',
      text: 'text-health-red',
      border: 'border-health-red/40',
      label: 'Bloqueada',
    };
  } else if (isCompletada) {
    statusBadge = {
      bg: 'bg-health-green-soft',
      text: 'text-health-green',
      border: 'border-health-green/40',
      label: 'Completada',
    };
  } else if (isEnCurso) {
    statusBadge = {
      bg: 'bg-taupe-soft',
      text: 'text-taupe',
      border: 'border-taupe/40',
      label: 'En curso',
    };
  }

  let fraseResumen = `Etapa en estado ${etapa.estado}`;
  if (bloqueosDeEtapa.length > 0) {
    const bloq = bloqueosDeEtapa[0];
    fraseResumen = `Bloqueada por ${bloq.motivo || 'QA'} hace ${bloq.dias_abierto || 6} días hábiles`;
  } else if (isCompletada) {
    fraseResumen = 'Etapa completada y validada en su totalidad';
  } else if (etapa.reabiertaEn) {
    fraseResumen = `Etapa reabierta el ${etapa.reabiertaEn} por auditoría técnica`;
  } else if (isEnCurso) {
    fraseResumen = 'En curso activo según el cronograma planificado';
  }

  return (
    <div
      ref={containerRef}
      className={`bg-card text-foreground border border-border p-5 rounded-2xl shadow-panel space-y-5 transition-all ${
        isModal ? '' : 'w-full'
      }`}
    >
      {/* Cabecera de Etapa */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase">
            <span>Etapa 0{etapa.orden} de {proyecto.etapas?.length || 5}</span>
            <span>·</span>
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text}`}>
              {statusBadge.label}
            </span>
            {etapa.reabiertaEn && (
              <span className="px-2 py-0.5 rounded-full bg-health-amber-soft border border-health-amber/40 text-health-amber text-[10px] font-semibold">
                Reabierta {etapa.reabiertaEn}
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold tracking-tight mt-1 text-foreground">
            {etapa.orden}. {etapa.nombre}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 font-mono">
            <User className="w-3.5 h-3.5 text-terracotta" />
            <span>Responsable: <strong className="text-foreground">{etapa.responsable_nombre || 'Sin asignar'}</strong></span>
            {etapa.responsable_email && (
              <span className="text-muted-foreground/70">({etapa.responsable_email})</span>
            )}
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-surface hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Cerrar detalle"
            aria-label="Cerrar detalle de etapa"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Frase Resumen */}
      <div
        className={`p-3 rounded-xl font-mono text-xs font-semibold flex items-center gap-2.5 border ${
          isBloqueada
            ? 'bg-health-red-soft border-health-red/30 text-health-red'
            : isCompletada
            ? 'bg-health-green-soft border-health-green/30 text-health-green'
            : 'bg-surface border-border text-foreground'
        }`}
      >
        {isBloqueada ? (
          <ShieldAlert className="w-4 h-4 shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 shrink-0" />
        )}
        <span>{fraseResumen}</span>
      </div>

      {/* Fechas Plan vs Real */}
      <div className="grid grid-cols-2 gap-3 font-mono text-xs">
        <div className="bg-surface p-3 rounded-xl border border-border">
          <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Inicio Plan / Real</span>
          <span className="font-bold text-foreground">
            {etapa.inicio_plan || '—'} / <strong className="text-terracotta-text">{etapa.inicio_real || 'En espera'}</strong>
          </span>
        </div>
        <div className="bg-surface p-3 rounded-xl border border-border">
          <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Fin Plan / Real</span>
          <span className="font-bold text-foreground">
            {etapa.fin_plan || '—'} / <strong className="text-health-green">{etapa.fin_real || 'En espera'}</strong>
          </span>
        </div>
      </div>

      {/* Bloqueos de la Etapa (abiertos y cerrados) */}
      {bloqueosDeEtapa.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider font-semibold text-health-red flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Bloqueos ({bloqueosDeEtapa.length})</span>
          </div>
          <div className="space-y-2">
            {bloqueosDeEtapa.map((b: any, bIdx: number) => {
              const bCerrado = !!b.fecha_cierre;
              return (
                <div
                  key={b.id || bIdx}
                  className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                    bCerrado
                      ? 'bg-surface border-border text-muted-foreground'
                      : 'bg-health-red-soft border-health-red/40 text-health-red'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>{b.motivo || 'QA / Dependencia'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-current">
                      {bCerrado ? 'Cerrado' : `Destraba: ${b.area_destraba || 'Externa'}`}
                    </span>
                  </div>
                  <p className="font-sans text-xs text-foreground/90">{b.descripcion}</p>
                  <div className="text-[10px] text-muted-foreground">
                    Apertura: {b.fecha_apertura} {b.fecha_cierre ? `· Cierre: ${b.fecha_cierre}` : '· +5 dh en proyección'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tareas de la Etapa */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-terracotta" />
            <span>
              Tareas · {pendientesTareas} pendientes de {totalTareas}
            </span>
          </div>
          {totalTareas > 6 && (
            <span className="text-[10px] text-muted-foreground font-normal lowercase">
              {mostrarTodasTareas ? `mostrando ${totalTareas}` : 'mostrando 6'}
            </span>
          )}
        </div>

        {totalTareas === 0 ? (
          <div className="p-3 rounded-xl bg-surface text-muted-foreground text-xs font-mono italic border border-border">
            Sin tareas desglosadas en esta etapa.
          </div>
        ) : (
          <div className="space-y-1.5">
            {tareasVisibles.map((t: any) => {
              const isTaskCompletada = t.estado === 'Completada';
              const isTaskBloqueada = t.estado === 'Bloqueada';
              const isTaskEnCurso = t.estado === 'En curso';

              const icono = isTaskBloqueada ? (
                <AlertCircle className="w-4 h-4 text-health-red shrink-0 mt-0.5" />
              ) : isTaskEnCurso ? (
                <PlayCircle className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
              ) : isTaskCompletada ? (
                <CheckCircle2 className="w-4 h-4 text-health-green shrink-0 mt-0.5" />
              ) : (
                <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              );

              const chipColor = isTaskBloqueada
                ? 'bg-health-red-soft text-health-red border-health-red/30'
                : isTaskEnCurso
                ? 'bg-terracotta/10 text-terracotta-text border-terracotta/30'
                : isTaskCompletada
                ? 'bg-health-green-soft text-health-green border-health-green/30'
                : 'bg-muted text-muted-foreground border-border';

              return (
                <div
                  key={t.id}
                  className={`p-2.5 rounded-xl border border-border bg-surface transition-colors flex items-start gap-2.5 text-xs ${
                    isTaskCompletada ? 'opacity-65' : ''
                  }`}
                >
                  {icono}
                  <div className="min-w-0 flex-1">
                    <div
                      className={`font-medium leading-snug line-clamp-2 ${
                        isTaskCompletada
                          ? 'text-muted-foreground line-through decoration-muted-foreground/50'
                          : 'text-foreground'
                      }`}
                      title={t.nombre}
                    >
                      {t.nombre}
                    </div>
                    <div className="flex items-center gap-2 mt-1 font-mono text-[11px] text-muted-foreground">
                      <span className="truncate max-w-[180px]">
                        {t.responsable_nombre || 'Sin asignar'}
                      </span>
                      <span>·</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${chipColor}`}>
                        {t.estado || 'Pendiente'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {totalTareas > 6 && !mostrarTodasTareas && (
              <button
                type="button"
                onClick={() => setMostrarTodasTareas(true)}
                className="w-full py-2 px-3 rounded-xl border border-border bg-surface hover:bg-muted text-xs font-mono font-semibold text-foreground flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Ver todas las tareas ({totalTareas})</span>
                <ChevronDown className="w-3.5 h-3.5 text-terracotta" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Historial de la Etapa */}
      {eventosDeEtapa.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          <div className="text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-terracotta" />
            <span>Historial del Nodo ({eventosDeEtapa.length})</span>
          </div>
          <div className="space-y-1.5">
            {eventosDeEtapa.map((ev: any, evIdx: number) => (
              <div
                key={ev.id || evIdx}
                className="text-[11px] font-mono p-2 rounded-lg bg-surface border border-border flex items-center justify-between text-muted-foreground"
              >
                <span>{ev.descripcion || `Cambio en nodo: ${ev.tipo || 'actualizado'}`}</span>
                <span className="text-[10px] text-border-strong">{ev.fecha || 'Reciente'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón Consultar al Copiloto sobre esta etapa */}
      <div className="pt-2 border-t border-border">
        <button
          onClick={() => abrirChatConProyecto(proyecto.id)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-surface hover:bg-muted border border-border text-foreground font-sans text-xs font-semibold transition-colors"
        >
          <MessageSquareQuote className="w-3.5 h-3.5 text-terracotta" />
          <span>Consultar al copiloto sobre esta etapa</span>
        </button>
      </div>
    </div>
  );
};
