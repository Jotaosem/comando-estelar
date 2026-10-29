import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
} from 'lucide-react';

interface StageGlassPanelProps {
  etapa: any;
  proyecto: any;
  onClose: () => void;
  isMobile?: boolean;
}

export const StageGlassPanel: React.FC<StageGlassPanelProps> = ({
  etapa,
  proyecto,
  onClose,
  isMobile = false,
}) => {
  if (!etapa) return null;

  const bloqueosDeEtapa = (proyecto.bloqueos || []).filter(
    (b: any) => b.etapa_id === etapa.id || (!b.etapa_id && etapa.estado === 'Bloqueada')
  );

  const tareasDeEtapa = proyecto.tareas || [];

  let fraseResumen = `Etapa en estado ${etapa.estado}`;
  if (bloqueosDeEtapa.length > 0) {
    const bloq = bloqueosDeEtapa[0];
    fraseResumen = `Bloqueada por ${bloq.motivo || 'QA'} hace ${bloq.dias_abierto || 6} días hábiles`;
  } else if (etapa.estado === 'Completada') {
    fraseResumen = 'Etapa completada y validada en su totalidad';
  } else if (etapa.reabiertaEn) {
    fraseResumen = `Etapa reabierta el ${etapa.reabiertaEn} por auditoría técnica`;
  } else if (etapa.estado === 'En curso') {
    fraseResumen = 'En curso activo según el cronograma planificado';
  }

  const isBloqueada = etapa.estado === 'Bloqueada' || bloqueosDeEtapa.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={isMobile ? { y: '100%' } : { x: '100%', opacity: 0 }}
        animate={isMobile ? { y: 0 } : { x: 0, opacity: 1 }}
        exit={isMobile ? { y: '100%' } : { x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className={`fixed z-50 hud-glass border-cyan-500/40 shadow-[0_0_50px_rgba(0,0,0,0.95)] backdrop-blur-2xl text-slate-100 overflow-y-auto ${
          isMobile
            ? 'bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl border-t p-5'
            : 'top-16 right-4 bottom-12 w-[380px] rounded-2xl border p-5'
        }`}
      >
        {/* Cabecera del Panel (Máximo 2 tamaños de texto) */}
        <div className="flex items-start justify-between pb-3 border-b border-cyan-500/20">
          <div>
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">
              ESTACIÓN {etapa.orden} DE {proyecto.etapas.length}
            </span>
            <h2 className="text-lg font-display font-black text-white tracking-wide uppercase mt-0.5">
              {etapa.orden}. {etapa.nombre}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-all shrink-0"
            aria-label="Cerrar panel de etapa"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Frase Resumen Clara */}
        <div
          className={`mt-3 p-2.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2.5 border ${
            isBloqueada
              ? 'bg-rose-950/70 border-rose-500 text-rose-200'
              : 'bg-cyan-950/70 border-cyan-400 text-cyan-200'
          }`}
        >
          {isBloqueada ? (
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          )}
          <span className="leading-snug">{fraseResumen}</span>
        </div>

        {/* Responsable */}
        <div className="mt-4 p-3 rounded-xl hud-glass border border-white/10">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">
            Responsable de la Etapa
          </span>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-display font-bold text-sm text-white truncate">
                {etapa.responsable_nombre || 'Sin asignar'}
              </div>
              <div className="font-mono text-xs text-slate-300 truncate">
                {etapa.responsable_email || 'contacto@empresa.cl'}
              </div>
            </div>
          </div>
        </div>

        {/* Fechas Plan vs Real */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2.5 rounded-xl hud-glass border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase block font-bold">Planificado</span>
            <div className="text-white font-bold mt-1">
              {etapa.inicio_plan} <br />
              <span className="text-slate-400 font-normal">al {etapa.fin_plan}</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl hud-glass border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase block font-bold">Real</span>
            <div className="text-white font-bold mt-1">
              {etapa.inicio_real || 'No iniciada'} <br />
              <span className="text-slate-400 font-normal">
                {etapa.fin_real ? `fin: ${etapa.fin_real}` : 'en curso'}
              </span>
            </div>
          </div>
        </div>

        {/* Bloqueos Críticos */}
        {bloqueosDeEtapa.length > 0 && (
          <div className="mt-4 space-y-2">
            <span className="text-xs font-mono text-rose-400 font-bold uppercase tracking-wider block">
              Bloqueo Activo ({bloqueosDeEtapa.length})
            </span>
            {bloqueosDeEtapa.map((bloq: any) => (
              <div
                key={bloq.id}
                className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/60 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-rose-900/80 border border-rose-400/50 font-mono text-[10px] text-rose-200 font-bold">
                    {bloq.motivo}
                  </span>
                  <span className="text-rose-300 font-mono text-[10px]">
                    {bloq.dias_abierto || 6} dh abierto
                  </span>
                </div>
                <p className="text-slate-100 font-sans leading-relaxed">{bloq.descripcion}</p>
                <div className="text-[11px] font-mono text-rose-200 pt-1 border-t border-rose-500/30">
                  Destraba: <strong className="text-white">{bloq.area_destraba}</strong>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tareas */}
        <div className="mt-4 space-y-2 pb-6">
          <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider block">
            Tareas ({tareasDeEtapa.length})
          </span>
          <div className="space-y-1.5">
            {tareasDeEtapa.map((t: any) => (
              <div
                key={t.id}
                className="p-2.5 rounded-xl hud-glass border border-white/10 flex items-start gap-2.5 text-xs"
              >
                <div className="mt-0.5 shrink-0">
                  {t.estado === 'Completada' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : t.estado === 'Bloqueada' ? (
                    <AlertOctagon className="w-4 h-4 text-rose-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-cyan-400/60" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-100 truncate">{t.nombre}</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {t.responsable_nombre} ·{' '}
                    <span className={t.estado === 'Completada' ? 'text-emerald-400 font-bold' : 'text-cyan-300'}>
                      {t.estado}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
