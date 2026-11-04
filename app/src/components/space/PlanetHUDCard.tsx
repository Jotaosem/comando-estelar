import React, { useState } from 'react';
import type { ProyectoResumenUI } from '../../lib/proyectosData';
import { User, MessageSquareQuote, ChevronUp, ChevronDown } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { CompartirPopover } from '../CompartirPopover';
import { useNavigationStore } from './navigationStore';
import { Z_LAYERS } from '../../constants/zLayers';

interface PlanetHUDCardProps {
  proyecto: ProyectoResumenUI;
  isMobile?: boolean;
}

// Helper para formatear fecha a dd/mm/aaaa
function formatearFecha(fStr?: string | null): string {
  if (!fStr) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(fStr)) {
    const [yyyy, mm, dd] = fStr.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }
  return fStr;
}

export const PlanetHUDCard: React.FC<PlanetHUDCardProps> = ({ proyecto, isMobile = false }) => {
  const [expandidoMobile, setExpandidoMobile] = useState(false);
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

  // Cálculo para el desglose de fórmula
  const hoyStr = 'Hoy 29/10';
  const diasRestantesQA = 3;
  const diasPendientes = 8;
  const diasBloqueo = (proyecto.bloqueos_abiertos || 1) * 5;
  const totalDh = diasRestantesQA + diasPendientes + diasBloqueo;
  const fechaDestino = formatearFecha(proyecto.fecha_reproyectada) || '12/11/2026';

  return (
    <div
      id="planet-hud-card-container"
      style={{ zIndex: Z_LAYERS.HUD }}
      className={`pointer-events-auto select-none transition-all duration-300 ${
        isMobile
          ? 'fixed bottom-10 left-0 right-0 w-full max-w-full px-3'
          : 'relative w-[340px] max-w-[340px]'
      }`}
    >
      <div className="hud-glass rounded-2xl p-3.5 sm:p-4 border border-cyan-500/30 shadow-[0_15px_45px_rgba(0,0,0,0.9)] backdrop-blur-2xl space-y-2.5 sm:space-y-3 font-sans">
        
        {/* EN MOBILE: Toggle botón colapsar/expandir */}
        {isMobile && (
          <button
            onClick={() => setExpandidoMobile(!expandidoMobile)}
            className="w-full flex items-center justify-between text-[11px] font-mono text-cyan-400 py-0.5 border-b border-cyan-500/20"
          >
            <span>{expandidoMobile ? 'COLAPSAR DETALLES' : 'EXPANDIR DETALLES'}</span>
            {expandidoMobile ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        )}

        {/* CABECERA RESUMIDA (Visible siempre) */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-mono mb-0.5">
            <span className="text-cyan-400 uppercase tracking-widest font-bold">
              {proyecto.area_solicitante}
            </span>
            <span className="text-cyan-300 font-bold">
              ({proyecto.avance_pct}%)
            </span>
          </div>

          <h2 className="font-display font-black text-sm sm:text-base text-white truncate uppercase tracking-wide">
            {proyecto.callsign || proyecto.nombre.split('(')[0].trim()}
          </h2>

          {/* Fila: Estado, Atraso y Fecha estimada (visible en móvil colapsado) */}
          <div className="flex items-center justify-between text-xs font-mono mt-1.5 pt-1.5 border-t border-cyan-500/20">
            <div className="flex items-center gap-1.5 font-bold">
              <span className={`w-2 h-2 rounded-full ${estadoBadge.dot} animate-pulse`} />
              <span className={estadoBadge.text}>{estadoBadge.label}</span>
            </div>
            <span
              className={`font-bold text-[11px] ${
                proyecto.atraso_dh > 0
                  ? 'text-rose-400'
                  : proyecto.atraso_dh < 0
                  ? 'text-emerald-400'
                  : 'text-slate-300'
              }`}
            >
              Atraso {proyecto.atraso_dh > 0 ? `+${proyecto.atraso_dh}` : proyecto.atraso_dh} dh
            </span>
            <span className="text-[11px] text-slate-300">
              Est: <strong className="text-white">{formatearFecha(proyecto.fecha_reproyectada)}</strong>
            </span>
          </div>
        </div>

        {/* CONTENIDO COMPLETO (Visible en Desktop o Mobile Expandido) */}
        {(!isMobile || expandidoMobile) && (
          <div className="space-y-2.5 sm:space-y-3 pt-1">
            <div
              className="text-xs text-slate-300 line-clamp-2 leading-relaxed"
              title={proyecto.descripcion || 'Sin descripción'}
            >
              {proyecto.descripcion ? (
                <span>{proyecto.descripcion}</span>
              ) : (
                <span className="italic text-slate-500">Sin descripción</span>
              )}
            </div>

            {/* SEPARADOR FECHAS COMPLETAS */}
            <div className="border-t border-cyan-500/20 pt-2 text-[11px] font-mono text-slate-300 flex items-center justify-between gap-1 flex-wrap">
              <span>
                Estimada <strong className="text-white">{formatearFecha(proyecto.fecha_reproyectada)}</strong>
              </span>
              <span className="text-slate-500">·</span>
              <span>
                Comprometida <strong className="text-slate-200">{formatearFecha(proyecto.fecha_comprometida)}</strong>
              </span>
            </div>

            {/* BLOQUE SPRINTS */}
            <div className="border-t border-cyan-500/20 pt-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1.5 font-bold">
                <span>Sprints</span>
                {sprintDiff > 0 && (
                  <span className="text-amber-300 font-bold flex items-center gap-0.5 normal-case">
                    ⚠ +{sprintDiff} {sprintDiff === 1 ? 'sprint' : 'sprints'}
                  </span>
                )}
              </div>

              {/* Timeline de 3 nodos */}
              <div className="relative flex items-center justify-between px-2 mb-1.5">
                <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-[2px] bg-slate-700 -z-0" />
                <div className="relative z-10 w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-slate-400 flex items-center justify-center" />
                <div className="relative z-10 w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-cyan-400 flex items-center justify-center" />
                <div className="relative z-10 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-white flex items-center justify-center shadow-[0_0_8px_rgba(0,242,254,0.6)]" />
              </div>

              {/* Grilla 3 columnas iguales */}
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono leading-tight">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Ingreso</span>
                  <span className="text-slate-200 font-bold block truncate">
                    {proyecto.sprint_ingreso || '—'}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-slate-400 block text-[9px] uppercase">Compromiso</span>
                  <span className="text-slate-200 font-bold block truncate">
                    {proyecto.sprint_comprometido || '—'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[9px] uppercase">Producción</span>
                  <span className="text-white font-bold block truncate">
                    {proyecto.fecha_produccion || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* RESPONSABLE + BOTONES (Fórmula y Compartir) */}
            <div className="border-t border-cyan-500/20 pt-2 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-300 truncate max-w-[130px]">
                <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate font-sans font-medium">{proyecto.responsable_comunicar_nombre}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Popover Fórmula con Radix Popover */}
                <Popover.Root>
                  <Popover.Trigger asChild>
                    <button
                      className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] transition-all"
                      title="Ver fórmula auditada"
                    >
                      <span>ƒ Fórmula</span>
                    </button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      side={isMobile ? 'top' : 'right'}
                      align="start"
                      collisionPadding={16}
                      avoidCollisions={true}
                      style={{ zIndex: Z_LAYERS.POPOVER_DROPDOWN }}
                      className="w-[280px] max-w-[300px] p-3 rounded-xl bg-[#030919]/98 border border-cyan-400/50 shadow-2xl backdrop-blur-xl text-[13px] font-mono text-slate-200 animate-in fade-in zoom-in-95"
                    >
                      <div className="space-y-1 leading-relaxed">
                        <div className="text-slate-300">{hoyStr}</div>
                        <div className="text-cyan-300">+ {diasRestantesQA} días restantes (QA)</div>
                        <div className="text-cyan-300">+ {diasPendientes} días etapas pendientes</div>
                        <div className="text-cyan-300">+ {diasBloqueo} días por {proyecto.bloqueos_abiertos || 1} bloqueo</div>
                        <div className="border-t border-cyan-500/40 my-1 pt-1 font-bold text-white">
                          = {totalDh} días hábiles → {fechaDestino}
                        </div>
                      </div>
                      <Popover.Arrow className="fill-[#030919] stroke-cyan-400/50" />
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>

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

            {/* BOTÓN PREGUNTAR AL COPILOTO (Sin chevron ni atajos) */}
            <div className="pt-2 border-t border-cyan-500/20">
              <button
                onClick={() => abrirChatConProyecto(proyecto.id)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 border border-cyan-400/40 text-cyan-200 font-mono text-xs font-bold transition-all"
              >
                <MessageSquareQuote className="w-3.5 h-3.5 text-cyan-400" />
                <span>Preguntar al copiloto</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
