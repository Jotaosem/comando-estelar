import React, { useState } from 'react';
import type { ProyectoResumenUI } from '../../lib/proyectosData';
import { HelpCircle, AlertTriangle, User, X, MessageSquareQuote } from 'lucide-react';
import { CompartirPopover } from '../CompartirPopover';
import { useNavigationStore } from './navigationStore';

interface PlanetHUDCardProps {
  proyecto: ProyectoResumenUI;
}

export const PlanetHUDCard: React.FC<PlanetHUDCardProps> = ({ proyecto }) => {
  const [mostrarPopover, setMostrarPopover] = useState(false);
  const { abrirChatConProyecto } = useNavigationStore();

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

        {/* Fila Sprints (bajo FECHAS) */}
        <div className="pt-2 pb-1 border-t border-cyan-500/15">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Sprints</span>
            {(() => {
              const estNum = proyecto.sprint_estimado ? parseInt(proyecto.sprint_estimado.replace(/\D/g, ''), 10) : NaN;
              const compNum = proyecto.sprint_comprometido ? parseInt(proyecto.sprint_comprometido.replace(/\D/g, ''), 10) : NaN;
              const diff = !isNaN(estNum) && !isNaN(compNum) ? estNum - compNum : 0;
              if (diff > 0) {
                return (
                  <span className="text-amber-300 font-mono text-[10px] font-bold flex items-center gap-0.5">
                    ⚠ +{diff} {diff === 1 ? 'sprint' : 'sprints'}
                  </span>
                );
              }
              return null;
            })()}
          </div>
          
          {/* Timeline de Sprints: ○───────────○───────────◉ */}
          <div className="px-1 py-1">
            <div className="relative flex items-center justify-between mb-1.5">
              <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-[2px] bg-slate-700 -z-0" />
              <div className="relative z-10 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-slate-400 flex items-center justify-center">
                <span className="w-1 h-1 rounded-full bg-slate-400" />
              </div>
              <div className="relative z-10 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-cyan-400 flex items-center justify-center">
                <span className="w-1 h-1 rounded-full bg-cyan-400" />
              </div>
              <div className="relative z-10 w-3.5 h-3.5 rounded-full bg-cyan-500 border-2 border-white flex items-center justify-center shadow-[0_0_8px_rgba(0,242,254,0.6)]">
                <span className="w-1 h-1 rounded-full bg-white" />
              </div>
            </div>

            <div className="grid grid-cols-3 text-[10px] font-mono">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Ingresó</span>
                <span className="text-slate-200 font-bold">{proyecto.sprint_ingreso || '—'}</span>
              </div>
              <div className="text-center">
                <span className="text-slate-400 block text-[9px] uppercase">Comprometido</span>
                <span className="text-slate-200 font-bold">{proyecto.sprint_comprometido || '—'}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[9px] uppercase">Producción</span>
                <span className="text-white font-bold block leading-tight">
                  {proyecto.fecha_produccion || '—'}
                </span>
                {proyecto.sprint_estimado && (
                  <span className="text-[9px] text-cyan-300/90 block leading-tight">
                    {proyecto.sprint_estimado}
                  </span>
                )}
              </div>
            </div>
          </div>
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
          <div className="flex items-center gap-1.5 text-slate-300 truncate max-w-[125px]">
            <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate font-sans font-medium">{proyecto.responsable_comunicar_nombre}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setMostrarPopover(!mostrarPopover)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900/90 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] transition-all"
              title="Ver cálculo de fecha"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Fórmula</span>
            </button>

            <CompartirPopover
              proyecto={proyecto}
              onToast={(msg) => {
                const el = document.createElement('div');
                el.innerText = msg;
                el.className = 'fixed bottom-6 right-6 z-50 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-mono font-bold text-xs shadow-2xl animate-in fade-in zoom-in-95';
                document.body.appendChild(el);
                setTimeout(() => {
                  el.remove();
                }, 2200);
              }}
            />
          </div>
        </div>

        {/* Fila 6: Botón Preguntar al copiloto y Atajos */}
        <div className="pt-2 border-t border-cyan-500/15 space-y-1.5">
          <button
            onClick={() => abrirChatConProyecto(proyecto.id)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 border border-cyan-400/40 text-cyan-200 font-mono text-xs font-bold transition-all shadow-[0_0_12px_rgba(0,242,254,0.15)]"
          >
            <MessageSquareQuote className="w-3.5 h-3.5 text-cyan-400" />
            <span>Preguntar al copiloto</span>
          </button>

          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => abrirChatConProyecto(proyecto.id, '¿Por qué está atrasado?')}
              className="text-[10px] font-mono p-1 rounded bg-slate-900/90 hover:bg-cyan-950/80 border border-slate-700/80 hover:border-cyan-400/50 text-cyan-300 truncate"
              title="¿Por qué está atrasado?"
            >
              ¿Atrasado?
            </button>
            <button
              onClick={() => abrirChatConProyecto(proyecto.id, 'Historial de bloqueos')}
              className="text-[10px] font-mono p-1 rounded bg-slate-900/90 hover:bg-cyan-950/80 border border-slate-700/80 hover:border-cyan-400/50 text-cyan-300 truncate"
              title="Historial de bloqueos"
            >
              Bloqueos
            </button>
            <button
              onClick={() => abrirChatConProyecto(proyecto.id, '¿Quién es responsable?')}
              className="text-[10px] font-mono p-1 rounded bg-slate-900/90 hover:bg-cyan-950/80 border border-slate-700/80 hover:border-cyan-400/50 text-cyan-300 truncate"
              title="¿Quién es responsable?"
            >
              Responsable
            </button>
          </div>
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
