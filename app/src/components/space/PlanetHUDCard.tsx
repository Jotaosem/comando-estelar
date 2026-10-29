import React, { useState } from 'react';
import type { ProyectoResumenUI } from '../../lib/proyectosData';
import { HelpCircle, AlertTriangle, User, X } from 'lucide-react';

interface PlanetHUDCardProps {
  proyecto: ProyectoResumenUI;
}

export const PlanetHUDCard: React.FC<PlanetHUDCardProps> = ({ proyecto }) => {
  const [mostrarPopover, setMostrarPopover] = useState(false);

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
    <div className="relative w-80 max-w-[320px] pointer-events-auto">
      {/* Tarjeta HUD compacta de 320px, máximo 5 filas, texto de 14-16px */}
      <div className="hud-glass rounded-2xl p-4 border border-cyan-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl space-y-2.5">
        {/* Fila 1: Nombre + Anillo % */}
        <div className="pb-2 border-b border-cyan-500/20">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">
                {proyecto.area_solicitante}
              </span>
              <h2 className="font-display font-black text-base text-white truncate uppercase tracking-wide">
                {proyecto.callsign || proyecto.nombre.split('(')[0].trim()}
              </h2>
            </div>

            <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="15"
                  className="text-slate-800"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="15"
                  stroke={isCritico ? '#ff3366' : isAlerta ? '#f59e0b' : '#00f2fe'}
                  strokeWidth="3"
                  strokeDasharray={94.2}
                  strokeDashoffset={94.2 - (94.2 * (proyecto.avance_pct || 0)) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <span className="absolute font-mono text-[11px] font-bold text-white">
                {proyecto.avance_pct}%
              </span>
            </div>
          </div>

          {/* Descripción bajo el nombre: máx 2 líneas, texto completo con hover */}
          <div className="mt-1 text-xs text-slate-300 font-sans line-clamp-2" title={proyecto.descripcion || 'Sin descripción'}>
            {proyecto.descripcion ? (
              <span>{proyecto.descripcion}</span>
            ) : (
              <span className="italic text-slate-500">Sin descripción</span>
            )}
          </div>
        </div>

        {/* Fila 2: Estado */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 uppercase">Salud:</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 ${healthColor}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span>{healthText}</span>
          </span>
        </div>

        {/* Fila 3: Estimada vs Comprometida */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-xs font-mono text-slate-400 uppercase">Fechas:</span>
          <span className="font-mono font-bold text-white text-sm">
            {proyecto.fecha_reproyectada || 'N/A'}{' '}
            <span className="text-slate-400 text-xs font-normal">/ {proyecto.fecha_comprometida || 'S/D'}</span>
          </span>
        </div>

        {/* Fila 4: Atraso en días hábiles */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-xs font-mono text-slate-400 uppercase">Atraso:</span>
          <span
            className={`font-mono font-bold text-sm ${
              proyecto.atraso_dh > 0
                ? 'text-rose-400'
                : proyecto.atraso_dh < 0
                ? 'text-emerald-400'
                : 'text-slate-300'
            }`}
          >
            {proyecto.atraso_dh > 0 ? `+${proyecto.atraso_dh} dh` : `${proyecto.atraso_dh} dh`}
          </span>
        </div>

        {/* Fila 5: Responsable de comunicar + Botón Popover */}
        <div className="pt-2 border-t border-cyan-500/15 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 truncate max-w-[190px]">
            <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate font-sans font-medium">{proyecto.responsable_comunicar_nombre}</span>
          </div>

          <button
            onClick={() => setMostrarPopover(!mostrarPopover)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900/90 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] transition-all"
            title="Ver cálculo de fecha"
          >
            <HelpCircle className="w-3 h-3" />
            <span>Fórmula</span>
          </button>
        </div>
      </div>

      {/* Popover flotante encima de la tarjeta */}
      {mostrarPopover && (
        <div className="absolute bottom-full left-0 mb-2 w-80 rounded-xl bg-[#030919]/95 border border-cyan-400/50 p-3.5 shadow-2xl backdrop-blur-xl z-50 text-xs font-mono text-slate-300 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/20 text-cyan-400 font-bold">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              Proyección Auditada (dh)
            </span>
            <button
              onClick={() => setMostrarPopover(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="leading-relaxed text-[11px] text-slate-200">
            Hoy + restantes en curso ({proyecto.desglose?.total_dh || 12} dh) + pendientes + {proyecto.bloqueos_abiertos * 5} dh por bloqueos ={' '}
            <strong className="text-cyan-300">{proyecto.fecha_reproyectada}</strong>
          </p>
          {proyecto.motivos_semaforo?.length > 0 && (
            <div className="mt-2 text-amber-300/90 text-[10px] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span className="truncate">{proyecto.motivos_semaforo[0]}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
