import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRegistrarVista } from '../hooks/useRegistrarVista';
import { obtenerProyectosSeed } from '../lib/proyectosData';
import type { UsuarioPrueba } from '../components/DevUserSelector';
import {
  ArrowLeft,
  ShieldAlert,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertOctagon,
  User,
  RotateCcw,
  ListTodo,
  History,
} from 'lucide-react';

interface DetallePageProps {
  usuarioActual?: UsuarioPrueba;
}

export const DetallePage: React.FC<DetallePageProps> = ({ usuarioActual }) => {
  const { id } = useParams<{ id: string }>();
  useRegistrarVista('detalle', id);

  const proyectos = obtenerProyectosSeed(usuarioActual);
  const proyecto = proyectos.find((p) => p.id === id);

  // Nodo seleccionado en la ruta holográfica
  const [nodoSeleccionadoIndex, setNodoSeleccionadoIndex] = useState<number>(0);
  const [mostrarCalculo, setMostrarCalculo] = useState<boolean>(false);
  const [tabBitacora, setTabBitacora] = useState<'mapa' | 'bitacora'>('mapa');

  // Inicializar en el nodo actual del proyecto
  useEffect(() => {
    if (proyecto) {
      const idxActual = proyecto.etapas.findIndex((e) => e.estado === 'En curso' || e.estado === 'Bloqueada');
      setNodoSeleccionadoIndex(idxActual !== -1 ? idxActual : 0);
    }
  }, [proyecto]);

  // Soporte de teclado (flechas izquierda/derecha entre nodos)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!proyecto) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setNodoSeleccionadoIndex((prev) => Math.min(proyecto.etapas.length - 1, prev + 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setNodoSeleccionadoIndex((prev) => Math.max(0, prev - 1));
    }
  };

  if (!proyecto) {
    return (
      <div className="hud-glass rounded-2xl p-12 text-center max-w-lg mx-auto border border-red-500/30 my-16 shadow-[0_0_40px_rgba(255,51,102,0.15)]">
        <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4 animate-pulse" />
        <h2 className="text-xl font-display font-bold text-white tracking-wider uppercase">
          Misión No Encontrada o Bloqueada
        </h2>
        <p className="text-sm font-mono text-slate-400 mt-2 mb-6">
          No tienes credenciales de visualización para este sector con el usuario actual ({usuarioActual?.email}).
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-mono font-bold px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Director de Misiones
        </Link>
      </div>
    );
  }

  const nodoActivo = proyecto.etapas[nodoSeleccionadoIndex] || proyecto.etapas[0];

  return (
    <div
      className="space-y-6 outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Mapa de Misión Galáctica y HUD táctico"
    >
      {/* Navegación y Switch de Modo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Selección de Misiones</span>
        </Link>

        {/* Tabs: Mapa Táctico vs Bitácora de Misión */}
        <div className="flex items-center bg-slate-900/90 border border-cyan-500/30 rounded-xl p-1 font-mono text-xs">
          <button
            onClick={() => setTabBitacora('mapa')}
            className={`px-4 py-1.5 rounded-lg font-bold tracking-wider uppercase transition-all ${
              tabBitacora === 'mapa'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,242,254,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ruta Holográfica 3D
          </button>
          <button
            onClick={() => setTabBitacora('bitacora')}
            className={`px-4 py-1.5 rounded-lg font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
              tabBitacora === 'bitacora'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,242,254,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Bitácora de Eventos
          </button>
        </div>
      </div>

      {/* Cabecera HUD de Misión */}
      <div className="hud-glass p-6 rounded-2xl border border-cyan-500/30 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 font-mono text-xs text-cyan-400 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f2fe]" />
              <span>SECTOR: {proyecto.area_solicitante} // CALLSIGN: {proyecto.callsign}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-wider uppercase">
              {proyecto.nombre}
            </h1>

            <div className="flex flex-wrap items-center gap-4 mt-2 font-mono text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                Oficial de Enlace: <strong className="text-cyan-200">{proyecto.responsable_comunicar_nombre}</strong> ({proyecto.responsable_comunicar_email})
              </span>
              <span>•</span>
              <span>Solicitante: {proyecto.solicitante_nombre}</span>
            </div>
          </div>

          {/* Stats Bar (Fecha estimada, Atraso, Semáforo) */}
          <div className="flex flex-wrap items-center gap-3 font-mono">
            {/* Semáforo HUD */}
            <div
              className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs uppercase tracking-wider ${
                proyecto.semaforo === 'rojo'
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 shadow-[0_0_20px_rgba(255,51,102,0.25)]'
                  : proyecto.semaforo === 'amarillo'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                  : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-[0_0_20px_rgba(16,227,150,0.2)]'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-current animate-pulse" />
              <span>SALUD: {proyecto.semaforo.toUpperCase()}</span>
            </div>

            {/* Fecha Estimada */}
            <div className="bg-slate-900/90 border border-slate-700/80 px-4 py-2 rounded-xl text-center">
              <div className="text-[10px] text-slate-400 uppercase">Fecha Estimada</div>
              <div className="text-sm font-bold text-cyan-300">{proyecto.fecha_reproyectada}</div>
            </div>

            {/* Fecha Comprometida */}
            <div className="bg-slate-900/90 border border-slate-700/80 px-4 py-2 rounded-xl text-center">
              <div className="text-[10px] text-slate-400 uppercase">Compromiso</div>
              <div className="text-sm font-bold text-slate-300">{proyecto.fecha_comprometida}</div>
            </div>

            {/* Atraso en Días Hábiles */}
            <div className="bg-slate-900/90 border border-slate-700/80 px-4 py-2 rounded-xl text-center">
              <div className="text-[10px] text-slate-400 uppercase">Desfase Hábiles</div>
              <div
                className={`text-sm font-bold ${
                  proyecto.atraso_dh > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {proyecto.atraso_dh > 0 ? `+${proyecto.atraso_dh} dh` : '0 dh'}
              </div>
            </div>
          </div>
        </div>

        {/* Motivos Semáforo y Alertas */}
        {proyecto.motivos_semaforo.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 font-mono text-xs text-rose-300">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{proyecto.motivos_semaforo.join(' · ')}</span>
          </div>
        )}
      </div>

      {tabBitacora === 'bitacora' ? (
        /* BITÁCORA DE MISIÓN */
        <div className="hud-glass p-6 rounded-2xl border border-cyan-500/20 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-lg font-display font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-400" />
              Registro Histórico de la Misión // Telemetría
            </h2>
            <span className="text-xs font-mono text-slate-500">Última lectura: 21/10 09:00</span>
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-rose-500/30 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 font-bold text-rose-400">
                  <span>BLOQUEO CRÍTICO DECLARADO</span>
                  <span className="text-[10px] text-slate-500">• 13/10/2026</span>
                </div>
                <p className="text-slate-300 mt-1">
                  Se abrió bloqueo en la etapa QA: "Pendiente firma de matriz UAT de regresión". Destraba: QA Lead.
                </p>
              </div>
            </div>

            {proyecto.etapas.some((e) => e.reabiertaEn) && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/30 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <span>RETROCESO // NODO REABIERTO</span>
                    <span className="text-[10px] text-slate-500">• 18/10/2026</span>
                  </div>
                  <p className="text-slate-300 mt-1">
                    La etapa Desarrollo fue reabierta por no conformidad en auditoría de seguridad. El avance del proyecto descendió un 14%.
                  </p>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 font-bold text-emerald-400">
                  <span>NODO 1 LEVANTAMIENTO COMPLETADO</span>
                  <span className="text-[10px] text-slate-500">• 05/10/2026</span>
                </div>
                <p className="text-slate-300 mt-1">
                  Cierre de requerimientos y firma técnica sin observaciones por Valeria Soto.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MAPA DE MISIÓN: RUTA HOLOGRÁFICA 3D + HUD DE VIDRIO */
        <div className="space-y-6">
          {/* Instrucción de teclado */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>
              Usa las flechas <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">→</kbd> o haz clic en cualquier nodo para fijar la cámara táctica.
            </span>
            <span className="text-cyan-400 font-bold">
              NODO ACTIVO: {nodoActivo.orden} / {proyecto.etapas.length} [{nodoActivo.nombre}]
            </span>
          </div>

          {/* VISTA DEL MAPA HOLOGRÁFICO CON PARALLAX (Desktop horizontal / Mobile vertical) */}
          <div className="hud-glass p-6 md:p-8 rounded-2xl border border-cyan-500/30 relative overflow-hidden">
            {/* Grid de fondo y radar */}
            <div className="absolute inset-0 hud-grid-pattern opacity-40 pointer-events-none" />
            <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full border border-cyan-500/10 pointer-events-none animate-radar" />

            {/* Contenedor de la Ruta: flex vertical en móvil, horizontal en desktop */}
            <div className="relative z-10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 md:gap-3 py-6">
              {/* Línea conectora holográfica en desktop */}
              <div className="hidden md:block absolute top-1/2 left-8 right-8 h-1 bg-gradient-to-r from-emerald-500/40 via-cyan-500/40 to-slate-800 -translate-y-1/2 z-0" />

              {proyecto.etapas.map((etapa, idx) => {
                const isSelected = idx === nodoSeleccionadoIndex;
                const isCompleted = etapa.estado === 'Completada';
                const isInProgress = etapa.estado === 'En curso';
                const isBlocked = etapa.estado === 'Bloqueada';

                return (
                  <motion.div
                    key={etapa.id}
                    onClick={() => setNodoSeleccionadoIndex(idx)}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative z-10 flex md:flex-col items-center gap-4 md:gap-3 cursor-pointer group flex-1"
                  >
                    {/* Conector vertical para mobile */}
                    {idx < proyecto.etapas.length - 1 && (
                      <div className="md:hidden absolute left-5 top-11 w-0.5 h-10 bg-slate-700 -z-0" />
                    )}

                    {/* Nodo Holográfico */}
                    <div
                      className={`relative w-11 h-11 rounded-full flex items-center justify-center font-mono font-bold text-sm transition-all duration-300 ${
                        isSelected
                          ? 'ring-4 ring-cyan-400 ring-offset-4 ring-offset-[#070b18] scale-110'
                          : ''
                      } ${
                        isCompleted
                          ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,227,150,0.6)]'
                          : isInProgress
                          ? 'bg-cyan-500 text-slate-950 shadow-[0_0_25px_rgba(0,242,254,0.8)] animate-pulse'
                          : isBlocked
                          ? 'bg-rose-500 text-white shadow-[0_0_30px_rgba(255,51,102,0.9)] animate-pulse'
                          : 'bg-slate-900 border border-slate-700/80 text-slate-500 hover:border-cyan-500/50'
                      }`}
                    >
                      {/* Marcador "Estás aquí" / Pulso de energía */}
                      {(isInProgress || isBlocked) && (
                        <span className="absolute -top-7 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400 text-cyan-300 text-[9px] font-mono tracking-widest whitespace-nowrap shadow-[0_0_10px_rgba(0,242,254,0.4)]">
                          ESTÁS AQUÍ
                        </span>
                      )}

                      {/* Ícono de estado en el nodo */}
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 stroke-[2.5]" />
                      ) : isBlocked ? (
                        <AlertOctagon className="w-5 h-5 stroke-[2.5]" />
                      ) : (
                        <span>{etapa.orden}</span>
                      )}

                      {/* Distintivo de Reabierta */}
                      {etapa.reabiertaEn && (
                        <span className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[9px] font-bold shadow-[0_0_8px_#fbbf24]">
                          ↺
                        </span>
                      )}
                    </div>

                    {/* Info del Nodo */}
                    <div className="text-left md:text-center">
                      <p
                        className={`text-xs font-display font-bold uppercase tracking-wider transition-colors ${
                          isSelected ? 'text-cyan-300' : 'text-slate-300 group-hover:text-cyan-400'
                        }`}
                      >
                        {etapa.nombre}
                      </p>
                      <div className="flex md:justify-center items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[10px] font-mono uppercase ${
                            isCompleted
                              ? 'text-emerald-400'
                              : isInProgress
                              ? 'text-cyan-400 font-semibold'
                              : isBlocked
                              ? 'text-rose-400 font-semibold'
                              : 'text-slate-500'
                          }`}
                        >
                          {etapa.estado}
                        </span>
                      </div>
                      {etapa.reabiertaEn && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-mono text-amber-300">
                          Reabierta {etapa.reabiertaEn}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* PANEL HUD DE VIDRIO TRANSLÚCIDO (Cámara cinematográfica hacia el nodo seleccionado) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={nodoActivo.id}
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="hud-glass p-6 md:p-8 rounded-2xl border-2 border-cyan-400/50 shadow-[0_0_50px_rgba(0,242,254,0.15)] relative"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs text-cyan-400 mb-1">
                    <span>DETALLES TELEMÉTRICOS DEL NODO 0{nodoActivo.orden}</span>
                    <span>•</span>
                    <span className="uppercase text-slate-300">{nodoActivo.estado}</span>
                  </div>
                  <h3 className="text-2xl font-display font-bold text-white uppercase tracking-wider flex items-center gap-3">
                    <span>{nodoActivo.nombre}</span>
                    {nodoActivo.reabiertaEn && (
                      <span className="text-xs font-mono px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Reabierta el {nodoActivo.reabiertaEn}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Responsable de ejecución: <strong className="text-cyan-300">{nodoActivo.responsable_nombre}</strong> ({nodoActivo.responsable_email})
                  </p>
                </div>

                {/* Fechas Plan vs Real del Nodo */}
                <div className="flex items-center gap-3 font-mono">
                  <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 uppercase block">Inicio Plan / Real</span>
                    <span className="text-xs font-bold text-slate-200">
                      {nodoActivo.inicio_plan} / <strong className="text-cyan-400">{nodoActivo.inicio_real || 'En espera'}</strong>
                    </span>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 uppercase block">Fin Plan / Real</span>
                    <span className="text-xs font-bold text-slate-200">
                      {nodoActivo.fin_plan} / <strong className="text-emerald-400">{nodoActivo.fin_real || 'En espera'}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Si el nodo tiene bloqueo activo (Escudo Rojo con Motivo QA/Seguridad/Infra) */}
              {nodoActivo.estado === 'Bloqueada' && proyecto.bloqueos.length > 0 && (
                <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border-2 border-rose-500/60 shadow-[0_0_25px_rgba(255,51,102,0.25)] flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/20 border border-rose-500/60 flex items-center justify-center text-rose-400 shrink-0">
                    <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div className="flex-1 font-mono text-xs">
                    <div className="flex items-center justify-between text-rose-400 font-bold mb-1">
                      <span>ESCUDO DE BLOQUEO TÁCTICO: {proyecto.bloqueos[0].motivo}</span>
                      <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40">
                        Destraba: {proyecto.bloqueos[0].area_destraba}
                      </span>
                    </div>
                    <p className="text-slate-200 text-xs font-sans">
                      {proyecto.bloqueos[0].descripcion}
                    </p>
                    <div className="text-[10px] text-slate-400 mt-2">
                      Abierto desde: {proyecto.bloqueos[0].fecha_apertura} (Impacto en proyección: +5 días hábiles automáticos)
                    </div>
                  </div>
                </div>
              )}

              {/* Tareas asociadas al nodo */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-display font-bold text-sm text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-cyan-400" />
                    Protocolos Operativos del Nodo ({proyecto.tareas.length})
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {proyecto.tareas.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between font-mono text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{t.nombre}</div>
                        <div className="text-[10px] text-slate-400">Operador: {t.responsable_nombre}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.estado === 'Completada'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : t.estado === 'Bloqueada'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {t.estado}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* BOTÓN DESPLEGABLE: "¿CÓMO SE CALCULÓ LA FECHA?" (Panel de Stats de Juego AAA) */}
          <div className="hud-glass rounded-2xl border border-cyan-500/25 overflow-hidden">
            <button
              onClick={() => setMostrarCalculo(!mostrarCalculo)}
              className="w-full flex items-center justify-between p-4 px-6 text-left hover:bg-slate-900/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <span className="text-sm font-display font-bold text-white uppercase tracking-wider">
                  ¿Cómo se calculó la fecha estimada? (Panel de Estadísticas Tácticas)
                </span>
              </div>
              {mostrarCalculo ? (
                <ChevronUp className="w-5 h-5 text-cyan-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-cyan-400" />
              )}
            </button>

            {mostrarCalculo && (
              <div className="p-6 pt-0 border-t border-slate-800/80 font-mono text-xs text-slate-300 space-y-4">
                <p className="text-slate-400 text-xs font-sans">
                  El motor de proyección auditable calcula en base a días hábiles oficiales de Chile (excluyendo fines de semana y feriados) + penalización paramétrica de 5 dh por cada bloqueo crítico no resuelto:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-cyan-500/20">
                    <span className="text-[10px] text-slate-400 uppercase block">1. Vector Base</span>
                    <span className="text-sm font-bold text-white">{proyecto.desglose?.base || '2026-10-21'}</span>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-cyan-500/20">
                    <span className="text-[10px] text-slate-400 uppercase block">2. Nodos Pendientes</span>
                    <span className="text-sm font-bold text-cyan-300">
                      +{proyecto.desglose?.etapas?.reduce((acc: number, e: any) => acc + (e.dias || 0), 0) || 10} dh
                    </span>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-cyan-500/20">
                    <span className="text-[10px] text-slate-400 uppercase block">3. Penalización Bloqueos</span>
                    <span className="text-sm font-bold text-rose-400">
                      +{proyecto.bloqueos.length * 5} dh
                    </span>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-emerald-500/40">
                    <span className="text-[10px] text-emerald-400 uppercase block">Proyección Final</span>
                    <span className="text-sm font-bold text-emerald-300">{proyecto.fecha_reproyectada}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 font-mono text-[11px] text-slate-400">
                  FÓRMULA AUDITABLE: <span className="text-cyan-300">fecha = sumarDiasHabiles(base, Σrestante + Σpendientes + Σbloqueos×5)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
