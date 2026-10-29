import React, { useState } from 'react';
import type { ProyectoResumenUI } from '../lib/proyectosData';
import { Share2, Download, Copy, Link as LinkIcon, X } from 'lucide-react';

interface CompartirPopoverProps {
  proyecto: ProyectoResumenUI;
  onToast: (msg: string) => void;
  className?: string;
}

export const CompartirPopover: React.FC<CompartirPopoverProps> = ({
  proyecto,
  onToast,
  className = '',
}) => {
  const [abierto, setAbierto] = useState(false);
  const [incluirBloqueos, setIncluirBloqueos] = useState(false);

  const isCritico = proyecto.semaforo === 'rojo';
  const isAlerta = proyecto.semaforo === 'amarillo';
  const estadoTexto = isCritico ? 'Crítico' : isAlerta ? 'Alerta' : proyecto.cerrado ? 'Cerrado' : 'Nominal';
  const motivoTexto = proyecto.motivos_semaforo?.[0] || 'Sin observaciones registradas';

  // Generador de texto plano (sin correos ni tareas)
  const generarTextoResumen = () => {
    let txt = `Comando Estelar · ${proyecto.nombre}\n`;
    txt += `${proyecto.descripcion || 'Sin descripción'}\n\n`;
    txt += `Área: ${proyecto.area_solicitante} | Etapa actual: ${proyecto.etapa_actual_nombre || '—'} | Avance: ${proyecto.avance_pct}%\n`;
    txt += `Estado: ${estadoTexto} · ${motivoTexto}\n\n`;
    txt += `Fechas: estimada ${proyecto.fecha_reproyectada || 'S/D'} / comprometida ${proyecto.fecha_comprometida || 'S/D'} / atraso ${proyecto.atraso_dh > 0 ? `+${proyecto.atraso_dh} dh` : `${proyecto.atraso_dh} dh`}\n`;
    txt += `Sprints: ingreso ${proyecto.sprint_ingreso || '—'} / comprometido ${proyecto.sprint_comprometido || '—'} / producción ${proyecto.fecha_produccion || '—'} (${proyecto.sprint_estimado || 'est.'})\n\n`;

    if (incluirBloqueos) {
      txt += `Bloqueos abiertos (${proyecto.bloqueos?.length || 0}):\n`;
      if (proyecto.bloqueos && proyecto.bloqueos.length > 0) {
        proyecto.bloqueos.forEach((b: any) => {
          txt += `- Motivo: ${b.motivo} · Área: ${b.area_destraba || '—'} · ${b.dias_abierto || b.dias || 5} días (${b.descripcion || ''})\n`;
        });
      } else {
        txt += `- Sin bloqueos activos\n`;
      }
      txt += `\n`;
    }

    txt += `Historial de Etapas (últimos 10):\n`;
    proyecto.etapas.slice(0, 10).forEach((e, idx) => {
      const estadoEtapa = e.reabiertaEn ? 'Reabierta' : e.estado;
      txt += `${idx + 1}. ${e.nombre} [${estadoEtapa}] (${e.fin_real || e.reabiertaEn || e.inicio_real || e.inicio_plan || 'S/F'})\n`;
    });
    txt += `\n`;

    txt += `Responsable de comunicar: ${proyecto.responsable_comunicar_nombre}\n`;
    txt += `Pie: Fuente Notion · actualizado 21/10 09:00 · generado por ${proyecto.responsable_comunicar_nombre}`;

    return txt;
  };

  const handleDescargarPDF = () => {
    const url = `/proyectos/${proyecto.id}/imprimir?bloqueos=${incluirBloqueos}`;
    window.open(url, '_blank');
    setAbierto(false);
  };

  const handleCopiarTexto = async () => {
    const texto = generarTextoResumen();
    try {
      await navigator.clipboard.writeText(texto);
      onToast('Copiado');
    } catch {
      // Fallback manual
      const textarea = document.createElement('textarea');
      textarea.value = texto;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      onToast('Copiado');
    }
    setAbierto(false);
  };

  const handleCopiarEnlace = async () => {
    const url = `${window.location.origin}/proyectos/${proyecto.id}`;
    try {
      await navigator.clipboard.writeText(url);
      onToast('Copiado');
    } catch {
      onToast('Copiado');
    }
    setAbierto(false);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setAbierto(!abierto);
        }}
        className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900/90 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] transition-all"
        title="Compartir resumen"
      >
        <Share2 className="w-3 h-3" />
        <span>Compartir</span>
      </button>

      {abierto && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 bottom-full mb-2 w-64 rounded-xl bg-[#030919]/95 border border-cyan-400/50 p-3 shadow-2xl backdrop-blur-xl z-50 text-xs font-mono text-slate-200 animate-in fade-in zoom-in-95"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/20 text-cyan-400 font-bold">
            <span className="text-[11px] uppercase tracking-wider">Compartir resumen</span>
            <button
              onClick={() => setAbierto(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5">
            <button
              onClick={handleDescargarPDF}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/20 hover:text-cyan-300 text-left transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Descargar PDF</span>
            </button>

            <button
              onClick={handleCopiarTexto}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/20 hover:text-cyan-300 text-left transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-cyan-400" />
              <span>Copiar resumen (texto)</span>
            </button>

            <button
              onClick={handleCopiarEnlace}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/20 hover:text-cyan-300 text-left transition-colors"
            >
              <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Copiar enlace</span>
            </button>
          </div>

          <div className="mt-3 pt-2.5 border-t border-cyan-500/20 flex items-center gap-2 text-[11px]">
            <input
              id={`inc-bloq-${proyecto.id}`}
              type="checkbox"
              checked={incluirBloqueos}
              onChange={(e) => setIncluirBloqueos(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 cursor-pointer"
            />
            <label htmlFor={`inc-bloq-${proyecto.id}`} className="text-slate-300 cursor-pointer select-none">
              Incluir detalle de bloqueos
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
