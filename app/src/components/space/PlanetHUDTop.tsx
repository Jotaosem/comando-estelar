import React, { useState } from 'react';
import type { ProyectoResumenUI } from '../../lib/proyectosData';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  ShieldAlert,
} from 'lucide-react';

interface PlanetHUDTopProps {
  proyecto: ProyectoResumenUI;
  selectedEtapaId?: string | null;
  onSelectEtapa?: (etapa: any) => void;
}

export const PlanetHUDTop: React.FC<PlanetHUDTopProps> = ({
  proyecto,
  selectedEtapaId,
  onSelectEtapa,
}) => {
  const [desplegarFormula, setDesplegarFormula] = useState(false);

  const isCritico = proyecto.semaforo === 'rojo';
  const isAlerta = proyecto.semaforo === 'amarillo';
  const isCerrado = proyecto.cerrado;

  const healthColor = isCritico
    ? 'text-rose-400 border-rose-500/50 bg-rose-500/15'
    : isAlerta
    ? 'text-amber-300 border-amber-500/50 bg-amber-500/15'
    : isCerrado
    ? 'text-yellow-300 border-yellow-500/50 bg-yellow-500/15'
    : 'text-cyan-300 border-cyan-500/50 bg-cyan-500/15';

  const healthText = isCritico
    ? 'Crítico'
    : isAlerta
    ? 'Alerta'
    : isCerrado
    ? 'Cerrado'
    : 'En curso';

  return (
    <div className="absolute top-16 left-0 right-0 z-20 px-4 max-w-6xl mx-auto pointer-events-auto">
      <div className="hud-glass rounded-2xl p-4 sm:p-5 border border-cyan-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        
        {/* Cabecera Principal de Misión: 4 Indicadores Clave */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-cyan-500/20">
          {/* 1. Salud */}
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Salud Operativa
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 ${healthColor}`}>
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                <span>{healthText}</span>
              </span>
              <span className="text-xs font-mono text-slate-300 font-bold">
                {proyecto.avance_pct}% avance
              </span>
            </div>
          </div>

          {/* 2. Fechas */}
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Fecha Estimada vs Compromiso
            </span>
            <div className="text-sm font-mono font-bold text-white mt-1">
              {proyecto.fecha_reproyectada || 'N/A'}{' '}
              <span className="text-slate-400 font-normal text-xs">/ {proyecto.fecha_comprometida || 'Sin fecha'}</span>
            </div>
          </div>

          {/* 3. Atraso */}
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Desviación Proyectada
            </span>
            <div className="mt-1">
              <span
                className={`text-sm font-mono font-bold ${
                  proyecto.atraso_dh > 0
                    ? 'text-rose-400'
                    : proyecto.atraso_dh < 0
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }`}
              >
                {proyecto.atraso_dh > 0 ? `+${proyecto.atraso_dh} días hábiles` : `${proyecto.atraso_dh} días hábiles`}
              </span>
            </div>
          </div>

          {/* 4. Responsable de comunicar */}
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Responsable de Comunicación
            </span>
            <div className="text-sm font-sans font-semibold text-slate-200 mt-1 flex items-center gap-1.5 truncate">
              <User className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="truncate">{proyecto.responsable_comunicar_nombre}</span>
            </div>
          </div>
        </div>

        {/* LÍNEA DE TIEMPO INTERACTIVA DE LAS 7 ETAPAS */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>Línea de Tiempo del Proyecto (Haz clic en una etapa para abrir su detalle completo)</span>
            </span>
            <button
              onClick={() => setDesplegarFormula(!desplegarFormula)}
              className="flex items-center gap-1 text-[11px] font-mono text-cyan-300 hover:text-white transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{desplegarFormula ? 'Ocultar cálculo' : '¿Cómo se calculó?'}</span>
              {desplegarFormula ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Stepper Horizontal Interactivo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {proyecto.etapas.map((etapa, idx) => {
              const isSelected = selectedEtapaId === etapa.id;
              const isCompletada = etapa.estado === 'Completada';
              const isActual = etapa.nombre === proyecto.etapa_actual_nombre;
              const isBloqueada = etapa.estado === 'Bloqueada';
              const isReabierta = !!etapa.reabiertaEn;

              let cardBg = 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:border-slate-500';
              if (isSelected) {
                cardBg = 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,242,254,0.3)] ring-1 ring-cyan-400';
              } else if (isBloqueada) {
                cardBg = 'bg-rose-950/60 border-rose-500/60 text-rose-200 hover:border-rose-400';
              } else if (isActual) {
                cardBg = 'bg-cyan-950/70 border-cyan-500/60 text-cyan-200 hover:border-cyan-400';
              } else if (isCompletada) {
                cardBg = 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200 hover:border-emerald-400';
              }

              return (
                <button
                  key={etapa.id || idx}
                  onClick={() => onSelectEtapa && onSelectEtapa(etapa)}
                  className={`p-2.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between group relative overflow-hidden ${cardBg}`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-mono text-[10px] font-bold opacity-80">
                      ETAPA {idx + 1}
                    </span>
                    {isCompletada && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {isBloqueada && <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />}
                  </div>

                  <div className="font-display font-bold text-xs leading-snug line-clamp-1 text-slate-100 group-hover:text-cyan-300">
                    {etapa.nombre}
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono">
                    <span className="truncate opacity-75">{etapa.estado}</span>
                    {isActual && (
                      <span className="px-1 py-0.2 rounded bg-cyan-400 text-slate-950 font-black text-[9px]">
                        AQUÍ
                      </span>
                    )}
                    {isReabierta && (
                      <span className="text-amber-300 font-bold text-[9px]">
                        {etapa.reabiertaEn}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desglose de Cálculo si el usuario lo activa */}
        {desplegarFormula && (
          <div className="mt-4 p-4 rounded-xl bg-[#040817]/95 border border-cyan-500/30 text-xs font-mono text-slate-300 animate-in fade-in slide-in-from-top-2">
            <div className="text-cyan-400 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              Fórmula de Proyección en Días Hábiles (Auditoría Santiago/CL)
            </div>
            <p className="leading-relaxed text-slate-300">
              Hoy + días restantes de etapas en curso ({proyecto.desglose?.total_dh || 12} dh) + etapas pendientes + {proyecto.bloqueos_abiertos * 5} dh por bloqueos abiertos ={' '}
              <strong className="text-cyan-300 font-bold">
                {proyecto.fecha_reproyectada}
              </strong>
            </p>
            {proyecto.motivos_semaforo?.length > 0 && (
              <div className="mt-2 text-amber-300/90 text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{proyecto.motivos_semaforo.join(' · ')}</span>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
