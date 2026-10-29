import React, { useState } from 'react';
import type { ProyectoResumenUI } from '../../lib/proyectosData';
import { HelpCircle, User, X, ChevronDown, ChevronUp, MessageSquareQuote } from 'lucide-react';
import { CompartirPopover } from '../CompartirPopover';
import { useNavigationStore } from './navigationStore';
import { Z_LAYERS } from '../../constants/zLayers';

interface PlanetHUDCardProps {
  proyecto: ProyectoResumenUI;
}

// Helper para formatear fecha a dd/mm/aaaa
function formatearFecha(fStr?: string | null): string {
  if (!fStr) return '—';
  // Si viene en formato yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(fStr)) {
    const [yyyy, mm, dd] = fStr.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }
  return fStr;
}

export const PlanetHUDCard: React.FC<PlanetHUDCardProps> = ({ proyecto }) => {
  const [mostrarPopover, setMostrarPopover] = useState(false);
  const [menuCopilotoAbierto, setMenuCopilotoAbierto] = useState(false);
  const { abrirChatConProyecto } = useNavigationStore();

  const isCritico = proyecto.semaforo === 'rojo';
  const isAlerta = proyecto.semaforo === 'amarillo';

  const estadoBadge = isCritico
    ? { dot: 'bg-rose-500', text: 'text-rose-400', label: 'Crítico' }
    : isAlerta
    ? { dot: 'bg-amber-400', text: 'text-amber-400', label: 'Alerta' }
    : proyecto.cerrado
    ? { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Cerrado' }
    : { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Nominal' };

  // Calcular desfase de sprints si estimado > comprometido
  const estNum = proyecto.sprint_estimado ? parseInt(proyecto.sprint_estimado.replace(/\D/g, ''), 10) : NaN;
  const compNum = proyecto.sprint_comprometido ? parseInt(proyecto.sprint_comprometido.replace(/\D/g, ''), 10) : NaN;
  const sprintDiff = !isNaN(estNum) && !isNaN(compNum) ? estNum - compNum : 0;

  return (
    <div
      id="planet-hud-card-container"
      style={{ zIndex: Z_LAYERS.HUD }}
      className="relative w-[340px] max-w-[340px] pointer-events-auto select-none"
    >
      <div className="hud-glass rounded-2xl p-4 border border-cyan-500/30 shadow-[0_15px_45px_rgba(0,0,0,0.9)] backdrop-blur-2xl space-y-3 font-sans">
        
        {/* BLOQUE 1: CABECERA: Área (43%), Nombre/Código, Descripción (máx 2 líneas) */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-mono mb-0.5">
            <span className="text-cyan-400 uppercase tracking-widest font-bold">
              {proyecto.area_solicitante}
            </span>
            <span className="text-cyan-300 font-bold">
              ({proyecto.avance_pct}%)
            </span>
          </div>

          <h2 className="font-display font-black text-base text-white truncate uppercase tracking-wide">
            {proyecto.callsign || proyecto.nombre.split('(')[0].trim()}
          </h2>

          <div
            className="mt-1 text-xs text-slate-300 line-clamp-2 leading-relaxed"
            title={proyecto.descripcion || 'Sin descripción'}
          >
            {proyecto.descripcion ? (
              <span>{proyecto.descripcion}</span>
            ) : (
              <span className="italic text-slate-500">Sin descripción</span>
            )}
          </div>
        </div>

        {/* SEPARADOR */}
        <div className="border-t border-cyan-500/20 pt-2.5 space-y-2">
          {/* Fila: Estado + Atraso */}
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5 font-bold">
              <span className={`w-2 h-2 rounded-full ${estadoBadge.dot} animate-pulse`} />
              <span className={estadoBadge.text}>{estadoBadge.label}</span>
            </div>
            <span
              className={`font-bold ${
                proyecto.atraso_dh > 0
                  ? 'text-rose-400'
                  : proyecto.atraso_dh < 0
                  ? 'text-emerald-400'
                  : 'text-slate-300'
              }`}
            >
              Atraso {proyecto.atraso_dh > 0 ? `+${proyecto.atraso_dh}` : proyecto.atraso_dh} días hábiles
            </span>
          </div>

          {/* Fila: Fechas estimada y comprometida (formato dd/mm/aaaa) */}
          <div className="text-[11px] font-mono text-slate-300 flex items-center justify-between gap-1 flex-wrap">
            <span>
              Estimada <strong className="text-white">{formatearFecha(proyecto.fecha_reproyectada)}</strong>
            </span>
            <span className="text-slate-500">·</span>
            <span>
              Comprometida <strong className="text-slate-200">{formatearFecha(proyecto.fecha_comprometida)}</strong>
            </span>
          </div>
        </div>

        {/* BLOQUE SPRINTS: Ancho fijo con 3 columnas iguales, wrap, sin truncar */}
        <div className="border-t border-cyan-500/20 pt-2.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-2 font-bold">
            <span>Sprints</span>
            {sprintDiff > 0 && (
              <span className="text-amber-300 font-bold flex items-center gap-0.5 normal-case">
                ⚠ +{sprintDiff} {sprintDiff === 1 ? 'sprint' : 'sprints'}
              </span>
            )}
          </div>

          {/* Timeline de 3 nodos */}
          <div className="relative flex items-center justify-between px-2 mb-2">
            <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-[2px] bg-slate-700 -z-0" />
            <div className="relative z-10 w-3 h-3 rounded-full bg-slate-900 border-2 border-slate-400 flex items-center justify-center">
              <span className="w-1 h-1 rounded-full bg-slate-400" />
            </div>
            <div className="relative z-10 w-3 h-3 rounded-full bg-slate-900 border-2 border-cyan-400 flex items-center justify-center">
              <span className="w-1 h-1 rounded-full bg-cyan-400" />
            </div>
            <div className="relative z-10 w-3 h-3 rounded-full bg-cyan-400 border-2 border-white flex items-center justify-center shadow-[0_0_8px_rgba(0,242,254,0.6)]">
              <span className="w-1 h-1 rounded-full bg-white" />
            </div>
          </div>

          {/* Grilla 3 columnas iguales, texto con wrap */}
          <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono leading-tight">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">Ingreso</span>
              <span className="text-slate-200 font-bold block break-words">
                {proyecto.sprint_ingreso || '—'}
              </span>
            </div>
            <div className="text-center">
              <span className="text-slate-400 block text-[9px] uppercase">Compromiso</span>
              <span className="text-slate-200 font-bold block break-words">
                {proyecto.sprint_comprometido || '—'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[9px] uppercase">Producción</span>
              <span className="text-white font-bold block break-words">
                {proyecto.fecha_produccion || '—'}
              </span>
              {proyecto.sprint_estimado && (
                <span className="text-[9px] text-cyan-300 block break-words mt-0.5">
                  {proyecto.sprint_estimado}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* BLOQUE RESPONSABLE + BOTONES (Fórmula y Compartir) */}
        <div className="border-t border-cyan-500/20 pt-2.5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-300 truncate max-w-[130px]">
            <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate font-sans font-medium">{proyecto.responsable_comunicar_nombre}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setMostrarPopover(!mostrarPopover)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] transition-all"
              title="Ver fórmula auditada"
            >
              <HelpCircle className="w-3 h-3" />
              <span>ƒ Fórmula</span>
            </button>

            <CompartirPopover
              proyecto={proyecto}
              onToast={(msg) => {
                const el = document.createElement('div');
                el.innerText = msg;
                el.className = 'fixed bottom-6 right-6 z-50 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-mono font-bold text-xs shadow-2xl animate-in fade-in zoom-in-95';
                document.body.appendChild(el);
                setTimeout(() => el.remove(), 2200);
              }}
            />
          </div>
        </div>

        {/* BOTÓN PREGUNTAR AL COPILOTO CON MENÚ DESPLEGABLE ▾ */}
        <div className="pt-2 border-t border-cyan-500/20 relative">
          <div className="flex items-center rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-400/40 overflow-hidden">
            <button
              onClick={() => abrirChatConProyecto(proyecto.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-cyan-200 font-mono text-xs font-bold hover:bg-cyan-500/20 transition-all"
            >
              <MessageSquareQuote className="w-3.5 h-3.5 text-cyan-400" />
              <span>💬 Preguntar al copiloto</span>
            </button>
            <button
              onClick={() => setMenuCopilotoAbierto(!menuCopilotoAbierto)}
              className="px-2.5 py-1.5 border-l border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/30 transition-all flex items-center justify-center"
              title="Ver atajos del copiloto"
            >
              {menuCopilotoAbierto ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Menú desplegable con los 3 atajos */}
          {menuCopilotoAbierto && (
            <div
              style={{ zIndex: Z_LAYERS.POPOVER_DROPDOWN }}
              className="relative mt-1.5 p-1.5 rounded-xl bg-[#030919]/98 border border-cyan-500/40 shadow-xl space-y-1 animate-in fade-in zoom-in-95"
            >
              <button
                onClick={() => {
                  abrirChatConProyecto(proyecto.id, '¿Por qué está atrasado?');
                  setMenuCopilotoAbierto(false);
                }}
                className="w-full text-left text-[11px] font-mono px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/20 text-cyan-300 transition-colors"
              >
                ¿Por qué está atrasado?
              </button>
              <button
                onClick={() => {
                  abrirChatConProyecto(proyecto.id, 'Historial de bloqueos');
                  setMenuCopilotoAbierto(false);
                }}
                className="w-full text-left text-[11px] font-mono px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/20 text-cyan-300 transition-colors"
              >
                Historial de bloqueos
              </button>
              <button
                onClick={() => {
                  abrirChatConProyecto(proyecto.id, '¿Quién es responsable?');
                  setMenuCopilotoAbierto(false);
                }}
                className="w-full text-left text-[11px] font-mono px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/20 text-cyan-300 transition-colors"
              >
                ¿Quién es responsable?
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Popover flotante Fórmula */}
      {mostrarPopover && (
        <div
          style={{ zIndex: Z_LAYERS.POPOVER_DROPDOWN }}
          className="absolute bottom-full left-0 mb-2 w-80 rounded-xl bg-[#030919]/98 border border-cyan-400/50 p-3.5 shadow-2xl backdrop-blur-xl text-xs font-mono text-slate-300 animate-in fade-in zoom-in-95"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/20 text-cyan-400 font-bold">
            <span className="text-[11px] uppercase tracking-wider">Proyección Auditada (dh)</span>
            <button onClick={() => setMostrarPopover(false)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="leading-relaxed text-[11px] text-slate-200">
            Hoy + restantes en curso ({proyecto.desglose?.total_dh || 12} dh) + pendientes + {proyecto.bloqueos_abiertos * 5} dh por bloqueos ={' '}
            <strong className="text-cyan-300">{formatearFecha(proyecto.fecha_reproyectada)}</strong>
          </p>
        </div>
      )}
    </div>
  );
};
