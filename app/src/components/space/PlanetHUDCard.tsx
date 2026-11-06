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
    ? { dot: 'bg-health-red', text: 'text-health-red', label: 'Crítico' }
    : isAlerta
    ? { dot: 'bg-health-amber', text: 'text-health-amber', label: 'Alerta' }
    : proyecto.cerrado
    ? { dot: 'bg-sand', text: 'text-sand', label: 'Cerrado' }
    : { dot: 'bg-health-green', text: 'text-health-green', label: 'Nominal' };

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
      <div className="bg-card/95 rounded-3xl p-3.5 sm:p-4 border border-border shadow-panel backdrop-blur-2xl space-y-2.5 sm:space-y-3 font-sans text-foreground">
        
        {/* EN MOBILE: Toggle botón colapsar/expandir */}
        {isMobile && (
          <button
            onClick={() => setExpandidoMobile(!expandidoMobile)}
            className="w-full flex items-center justify-between text-[11px] font-mono text-terracotta py-0.5 border-b border-border"
          >
            <span>{expandidoMobile ? 'COLAPSAR DETALLES' : 'EXPANDIR DETALLES'}</span>
            {expandidoMobile ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        )}

        {/* CABECERA RESUMIDA (Visible siempre) */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-mono mb-0.5">
            <span className="text-terracotta uppercase tracking-wider font-semibold">
              {proyecto.area_solicitante}
            </span>
            <span className="text-muted-foreground font-semibold">
              ({proyecto.avance_pct}%)
            </span>
          </div>

          <h2 className="font-sans font-bold text-sm sm:text-base text-foreground truncate uppercase tracking-tight">
            {proyecto.callsign || proyecto.nombre.split('(')[0].trim()}
          </h2>

          {/* Fila: Estado, Atraso y Fecha estimada (visible en móvil colapsado) */}
          <div className="flex items-center justify-between text-xs font-mono mt-1.5 pt-1.5 border-t border-border">
            <div className="flex items-center gap-1.5 font-bold">
              <span className={`w-2 h-2 rounded-full ${estadoBadge.dot}`} />
              <span className={estadoBadge.text}>{estadoBadge.label}</span>
            </div>
            <span
              className={`font-semibold text-[11px] ${
                proyecto.atraso_dh > 0
                  ? 'text-health-red'
                  : proyecto.atraso_dh < 0
                  ? 'text-health-green'
                  : 'text-muted-foreground'
              }`}
            >
              Atraso {proyecto.atraso_dh > 0 ? `+${proyecto.atraso_dh}` : proyecto.atraso_dh} dh
            </span>
            <span className="text-[11px] text-muted-foreground">
              Est: <strong className="text-foreground">{formatearFecha(proyecto.fecha_reproyectada)}</strong>
            </span>
          </div>
        </div>

        {/* CONTENIDO COMPLETO (Visible en Desktop o Mobile Expandido) */}
        {(!isMobile || expandidoMobile) && (
          <div className="space-y-2.5 sm:space-y-3 pt-1">
            <div
              className="text-xs text-muted-foreground line-clamp-2 leading-relaxed"
              title={proyecto.descripcion || 'Sin descripción'}
            >
              {proyecto.descripcion ? (
                <span>{proyecto.descripcion}</span>
              ) : (
                <span className="italic text-muted-foreground/60">Sin descripción</span>
              )}
            </div>

            {/* SEPARADOR FECHAS COMPLETAS */}
            <div className="border-t border-border pt-2 text-[11px] font-mono text-muted-foreground flex items-center justify-between gap-1 flex-wrap">
              <span>
                Estimada <strong className="text-foreground">{formatearFecha(proyecto.fecha_reproyectada)}</strong>
              </span>
              <span className="text-border-strong">·</span>
              <span>
                Comprometida <strong className="text-foreground">{formatearFecha(proyecto.fecha_comprometida)}</strong>
              </span>
            </div>

            {/* RESPONSABLE + BOTONES (Fórmula y Compartir) */}
            <div className="border-t border-border pt-2 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-muted-foreground truncate max-w-[130px]">
                <User className="w-3.5 h-3.5 text-terracotta shrink-0" />
                <span className="truncate font-sans font-medium text-foreground">{proyecto.responsable_comunicar_nombre}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Popover Fórmula con Radix Popover */}
                <Popover.Root>
                  <Popover.Trigger asChild>
                    <button
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface hover:bg-muted border border-border text-foreground font-mono text-[11px] transition-colors"
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
                      className="w-[280px] max-w-[300px] p-3 rounded-2xl bg-card border border-border shadow-panel backdrop-blur-xl text-[13px] font-mono text-foreground animate-in fade-in zoom-in-95"
                    >
                      <div className="space-y-1 leading-relaxed">
                        <div className="text-muted-foreground">{hoyStr}</div>
                        <div className="text-foreground">+ {diasRestantesQA} días restantes (QA)</div>
                        <div className="text-foreground">+ {diasPendientes} días etapas pendientes</div>
                        <div className="text-foreground">+ {diasBloqueo} días por {proyecto.bloqueos_abiertos || 1} bloqueo</div>
                        <div className="border-t border-border my-1 pt-1 font-bold text-foreground">
                          = {totalDh} días hábiles → {fechaDestino}
                        </div>
                      </div>
                      <Popover.Arrow className="fill-card stroke-border" />
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>

                <CompartirPopover
                  proyecto={proyecto}
                  onToast={(msg) => {
                    const el = document.createElement('div');
                    el.innerText = msg;
                    el.className = 'fixed bottom-6 right-6 z-50 px-4 py-2 rounded-full bg-foreground text-background font-mono font-bold text-xs shadow-panel animate-in fade-in zoom-in-95';
                    document.body.appendChild(el);
                    setTimeout(() => el.remove(), 2200);
                  }}
                />
              </div>
            </div>

            {/* BOTÓN PREGUNTAR AL COPILOTO */}
            <div className="pt-2 border-t border-border">
              <button
                onClick={() => abrirChatConProyecto(proyecto.id)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-surface hover:bg-muted border border-border text-foreground font-sans text-xs font-semibold transition-colors"
              >
                <MessageSquareQuote className="w-3.5 h-3.5 text-terracotta" />
                <span>Preguntar al copiloto</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
