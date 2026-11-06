import React, { useState } from 'react';
import type { ProyectoResumenUI } from '../lib/proyectosData';
import { Share2, Download, Copy, Link as LinkIcon, Check, Eye } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';

interface CompartirPopoverProps {
  proyecto: ProyectoResumenUI;
  onToast: (msg: string) => void;
}

export const CompartirPopover: React.FC<CompartirPopoverProps> = ({ proyecto, onToast }) => {
  const [abierto, setAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [incluirDesglose, setIncluirDesglose] = useState(true);

  const urlProyecto = `${window.location.origin}/proyectos/${proyecto.id}`;

  const construirTextoTelegrama = () => {
    const semaforoEmoji =
      proyecto.semaforo === 'rojo'
        ? '🔴'
        : proyecto.semaforo === 'amarillo'
        ? '🟡'
        : '🟢';

    const lineas = [
      `📌 *${proyecto.nombre}* (${proyecto.area_solicitante})`,
      `Etapa actual: ${proyecto.etapa_actual_nombre} (${proyecto.avance_pct}%) · Semáforo: ${semaforoEmoji} ${proyecto.motivos_semaforo[0] || 'Nominal'}`,
      `Fecha estimada: ${proyecto.fecha_reproyectada || 'N/A'} (Compromiso: ${proyecto.fecha_comprometida || 'N/A'}, atraso: ${proyecto.atraso_dh > 0 ? `+${proyecto.atraso_dh}` : proyecto.atraso_dh} dh)`,
      `Bloqueos abiertos: ${proyecto.bloqueos_abiertos} ${
        proyecto.bloqueos_abiertos > 0
          ? `(${proyecto.bloqueos?.[0]?.motivo || 'QA'} - destraba: ${proyecto.bloqueos?.[0]?.area_destraba || 'QA'})`
          : ''
      }`,
    ];

    if (incluirDesglose && proyecto.desglose) {
      lineas.push(`Fórmula: Hoy + 3d QA + 8d pendientes + 5d bloqueo = 16d hábiles`);
    }

    lineas.push(`Detalle auditable: ${urlProyecto}`);
    return lineas.join('\n');
  };

  const copiarTexto = async () => {
    const texto = construirTextoTelegrama();
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    onToast('Resumen táctico copiado al portapapeles');
    setTimeout(() => {
      setCopiado(false);
      setAbierto(false);
    }, 1200);
  };

  const copiarEnlace = async () => {
    await navigator.clipboard.writeText(urlProyecto);
    onToast('Enlace de la misión copiado');
    setAbierto(false);
  };

  const descargarPNG = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#141312';
    ctx.fillRect(0, 0, 600, 360);

    ctx.strokeStyle = '#a9533a';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 580, 340);

    ctx.fillStyle = '#f5f5f3';
    ctx.font = 'bold 20px "Inter Tight", sans-serif';
    ctx.fillText(proyecto.nombre.toUpperCase(), 30, 50);

    ctx.fillStyle = '#e08c6c';
    ctx.font = '14px "IBM Plex Mono", monospace';
    ctx.fillText(`SECTOR: ${proyecto.area_solicitante} · CALLSIGN: ${proyecto.callsign || proyecto.id}`, 30, 80);

    ctx.fillStyle = '#f5f5f3';
    ctx.font = '15px "Inter Tight", sans-serif';
    ctx.fillText(`• Etapa actual: ${proyecto.etapa_actual_nombre} (${proyecto.avance_pct}%)`, 30, 120);
    ctx.fillText(`• Semáforo: ${proyecto.semaforo.toUpperCase()} (${proyecto.motivos_semaforo[0] || 'Nominal'})`, 30, 150);
    ctx.fillText(`• Fecha estimada: ${proyecto.fecha_reproyectada} (Atraso: ${proyecto.atraso_dh} dh)`, 30, 180);
    ctx.fillText(`• Bloqueos críticos: ${proyecto.bloqueos_abiertos}`, 30, 210);

    ctx.fillStyle = '#aaa19c';
    ctx.font = '12px "IBM Plex Mono", monospace';
    ctx.fillText(`Responsable: ${proyecto.responsable_comunicar_nombre}`, 30, 260);
    ctx.fillText(`Fuente auditable: Notion vía sync · ${new Date().toLocaleDateString()}`, 30, 300);

    const a = document.createElement('a');
    a.download = `mision_${proyecto.callsign || proyecto.id}_ficha.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    onToast('Ficha de telemetría exportada como PNG');
    setAbierto(false);
  };

  return (
    <Popover.Root open={abierto} onOpenChange={setAbierto}>
      <Popover.Trigger asChild>
        <button
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface hover:bg-muted border border-border text-foreground font-mono text-[11px] transition-colors"
          title="Compartir telemetría táctica"
        >
          <Share2 className="w-3 h-3 text-terracotta" />
          <span>Compartir</span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          align="end"
          className="w-64 rounded-2xl bg-card border border-border p-3 shadow-panel backdrop-blur-xl text-xs font-mono text-foreground animate-in fade-in zoom-in-95 z-50"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border text-terracotta font-bold">
            <span className="uppercase tracking-wider text-[10px]">Compartir Misión</span>
            <Eye className="w-3.5 h-3.5" />
          </div>

          <div className="space-y-1">
            <button
              onClick={descargarPNG}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-left transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-terracotta" />
              <span>Descargar ficha PNG</span>
            </button>

            <button
              onClick={copiarTexto}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-left transition-colors"
            >
              {copiado ? (
                <Check className="w-3.5 h-3.5 text-health-green" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-terracotta" />
              )}
              <span>Copiar para Slack / Teams</span>
            </button>

            <button
              onClick={copiarEnlace}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-left transition-colors"
            >
              <LinkIcon className="w-3.5 h-3.5 text-terracotta" />
              <span>Copiar enlace web</span>
            </button>
          </div>

          <div className="mt-3 pt-2.5 border-t border-border flex items-center gap-2 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              id="desglose"
              checked={incluirDesglose}
              onChange={(e) => setIncluirDesglose(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-border bg-surface text-terracotta focus:ring-0 cursor-pointer"
            />
            <label htmlFor="desglose" className="cursor-pointer select-none">
              Incluir desglose de fórmula
            </label>
          </div>
          <Popover.Arrow className="fill-card stroke-border" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
