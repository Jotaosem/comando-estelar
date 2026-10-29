import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useRegistrarVista } from '../hooks/useRegistrarVista';
import { obtenerProyectosSeed, type ProyectoResumenUI } from '../lib/proyectosData';
import type { UsuarioPrueba } from '../components/DevUserSelector';
import { SemanticGalaxyDirector } from '../components/space/SemanticGalaxyDirector';
import { GalaxySearchBar } from '../components/space/GalaxySearchBar';
import { useNavigationStore } from '../components/space/navigationStore';
import {
  ShieldAlert,
  Compass,
  User,
  Filter,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface ResumenPageProps {
  usuarioActual?: UsuarioPrueba;
}

export const ResumenPage: React.FC<ResumenPageProps> = ({ usuarioActual }) => {
  useRegistrarVista('resumen');
  const navigate = useNavigate();

  const [filtroSemaforo, setFiltroSemaforo] = useState<string>('todos');
  const [filtroArea, setFiltroArea] = useState<string>('todas');
  const [focoIndex, setFocoIndex] = useState<number>(0);
  const [esVistaLista, setEsVistaLista] = useState<boolean>(false);
  const [matchingIds, setMatchingIds] = useState<Set<string> | null>(null);

  const { seleccionarProyecto } = useNavigationStore();

  const proyectos = obtenerProyectosSeed(usuarioActual);

  const semaforoScore: Record<string, number> = {
    rojo: 1,
    amarillo: 2,
    gris: 3,
    verde: 4,
  };

  const proyectosFiltrados = proyectos
    .filter((p) => (filtroSemaforo === 'todos' ? true : p.semaforo === filtroSemaforo))
    .filter((p) => (filtroArea === 'todas' ? true : p.area_solicitante === filtroArea))
    .filter((p) => (esVistaLista && matchingIds ? matchingIds.has(p.id) : true))
    .sort((a, b) => (semaforoScore[a.semaforo] || 5) - (semaforoScore[b.semaforo] || 5));

  // Manejo de teclado estilo consola (flechas para navegar misiones, Enter para ingresar)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (proyectosFiltrados.length === 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setFocoIndex((prev) => (prev + 1) % proyectosFiltrados.length);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setFocoIndex((prev) => (prev - 1 + proyectosFiltrados.length) % proyectosFiltrados.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const p = proyectosFiltrados[focoIndex];
      if (p) {
        navigate(`/proyectos/${p.id}`);
      }
    }
  };

  if (proyectos.length === 0) {
    return (
      <div className="hud-glass rounded-2xl p-12 text-center max-w-lg mx-auto border border-red-500/30 my-16 shadow-[0_0_40px_rgba(255,51,102,0.15)]">
        <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4 animate-pulse" />
        <h2 className="text-xl font-display font-bold text-white tracking-wider uppercase">
          Acceso No Autorizado
        </h2>
        <p className="text-sm font-mono text-slate-400 mt-2">
          El usuario activo ({usuarioActual?.email}) no cuenta con credenciales tácticas asignadas para consultar las misiones en curso.
        </p>
      </div>
    );
  }

  return (
    <div
      className="space-y-8 outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Director de Misiones - Navegación por teclado disponible con flechas y Enter"
    >
      {/* HUD Header Bar */}
      <div className="hud-glass p-6 rounded-2xl border border-cyan-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 font-mono text-[11px] text-cyan-400 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f2fe]" />
              <span>DIRECTOR GALÁCTICO DE MISIONES // SEGUIMIENTO EN TIEMPO REAL</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-black tracking-wider text-white uppercase flex items-center gap-3">
              <span>Comando Estelar</span>
              <span className="text-xs font-mono font-normal px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                {proyectosFiltrados.length} ACTIVAS
              </span>
            </h1>
            <p className="text-xs sm:text-sm font-sans text-slate-400 mt-1 max-w-2xl">
              Navega las misiones con mando/teclado (<kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-[10px]">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-[10px]">→</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-[10px]">ENTER</kbd>). Priorización por vector de riesgo y bloqueo.
            </p>
          </div>

          {/* Filtros Tácticos */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            {/* Buscador unificado presente en vista lista */}
            {esVistaLista && (
              <div className="w-56 sm:w-72">
                <GalaxySearchBar
                  proyectos={proyectos}
                  onSelectProyecto={(p) => navigate(`/proyectos/${p.id}`)}
                  onFilterChange={(_q, ids) => setMatchingIds(ids)}
                />
              </div>
            )}

            <div className="flex items-center bg-slate-900/90 border border-cyan-500/30 rounded-xl px-3 py-1.5 shadow-inner">
              <Filter className="w-3.5 h-3.5 text-cyan-400 mr-2" />
              <select
                className="bg-transparent border-0 focus:ring-0 text-slate-200 text-xs pr-4 cursor-pointer outline-none font-mono"
                value={filtroSemaforo}
                onChange={(e) => setFiltroSemaforo(e.target.value)}
              >
                <option value="todos" className="bg-slate-950 text-slate-200">TODOS LOS ESTADOS</option>
                <option value="rojo" className="bg-slate-950 text-red-400">🔴 ESTADO CRÍTICO (ROJO)</option>
                <option value="amarillo" className="bg-slate-950 text-amber-400">🟡 EN RIESGO (ÁMBAR)</option>
                <option value="verde" className="bg-slate-950 text-emerald-400">🟢 NOMINAL (VERDE)</option>
              </select>
            </div>

            <div className="flex items-center bg-slate-900/90 border border-cyan-500/30 rounded-xl px-3 py-1.5 shadow-inner">
              <Compass className="w-3.5 h-3.5 text-purple-400 mr-2" />
              <select
                className="bg-transparent border-0 focus:ring-0 text-slate-200 text-xs pr-4 cursor-pointer outline-none font-mono"
                value={filtroArea}
                onChange={(e) => setFiltroArea(e.target.value)}
              >
                <option value="todas" className="bg-slate-950 text-slate-200">TODOS LOS SECTORES</option>
                <option value="Operaciones" className="bg-slate-950 text-slate-200">Operaciones</option>
                <option value="Comercial" className="bg-slate-950 text-slate-200">Comercial</option>
                <option value="Compliance" className="bg-slate-950 text-slate-200">Compliance</option>
                <option value="Seguridad" className="bg-slate-950 text-slate-200">Seguridad</option>
                <option value="BI & Analítica" className="bg-slate-950 text-slate-200">BI & Analítica</option>
              </select>
            </div>

            {/* Toggle Navegación Espacial 3D vs Lista */}
            <button
              onClick={() => setEsVistaLista(!esVistaLista)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all flex items-center gap-2 shadow-inner ${
                !esVistaLista
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.3)]'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{esVistaLista ? 'ACTIVAR MAPA GALÁCTICO' : 'MAPA GALÁCTICO ACTIVO'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vista Principal: Mapa Galáctico 3D con Zoom Semántico */}
      {!esVistaLista ? (
        <SemanticGalaxyDirector
          proyectos={proyectosFiltrados}
          onToggleLista={() => setEsVistaLista(true)}
          esVistaLista={esVistaLista}
        />
      ) : (
        /* Grid de Misiones alternativo (Vista Lista) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {proyectosFiltrados.map((p, idx) => {
          const isFocused = idx === focoIndex;

          // Semáforo styling
          let semBadge = {
            label: 'NOMINAL',
            color: 'text-emerald-400',
            border: 'border-emerald-500/30',
            bg: 'bg-emerald-500/10',
            glow: 'rgba(16,227,150,0.2)',
          };

          if (p.semaforo === 'rojo') {
            semBadge = {
              label: 'CRÍTICO // BLOQUEADO',
              color: 'text-rose-400',
              border: 'border-rose-500/40',
              bg: 'bg-rose-500/10',
              glow: 'rgba(255,51,102,0.35)',
            };
          } else if (p.semaforo === 'amarillo') {
            semBadge = {
              label: 'ALERTA // REABIERTA',
              color: 'text-amber-300',
              border: 'border-amber-500/40',
              bg: 'bg-amber-500/10',
              glow: 'rgba(251,191,36,0.3)',
            };
          }

          // Círculo de progreso SVG
          const radius = 28;
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = circumference - (p.avance_pct / 100) * circumference;

          return (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
              onClick={() => {
                setFocoIndex(idx);
                navigate(`/proyectos/${p.id}`);
              }}
              onMouseEnter={() => setFocoIndex(idx)}
              className={`relative group cursor-pointer rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                isFocused
                  ? 'bg-gradient-to-br from-[#0c1630] via-[#091024] to-[#060a17] border-2 border-cyan-400 shadow-[0_0_35px_rgba(0,242,254,0.35)] scale-[1.02]'
                  : 'bg-gradient-to-br from-[#0a1020]/80 via-[#070b16]/90 to-[#040710] border border-slate-800/80 hover:border-cyan-500/40 shadow-lg'
              }`}
            >
              {/* Esquinas decorativas futuristas */}
              <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none" />
              <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 border-cyan-400/60 pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-cyan-400/60 pointer-events-none" />

              <div>
                {/* Sector y Callsign */}
                <div className="flex items-center justify-between gap-2 mb-3 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-slate-300 uppercase tracking-wider">
                    {p.area_solicitante}
                  </span>
                  <span className="text-cyan-400 font-bold tracking-widest">
                    {p.callsign || `MIS-${idx + 1}`}
                  </span>
                </div>

                {/* Título de Misión */}
                <h3 className="text-xl font-display font-bold text-white tracking-wide group-hover:text-cyan-300 transition-colors line-clamp-1 mb-1">
                  {p.nombre}
                </h3>

                {/* Columna / Campo Descripción truncada a 1 línea */}
                <p className="text-xs text-slate-300 font-sans truncate mb-3" title={p.descripcion || 'Sin descripción'}>
                  {p.descripcion ? (
                    <span>{p.descripcion}</span>
                  ) : (
                    <span className="italic text-slate-500">Sin descripción</span>
                  )}
                </p>

                {/* Estado y Salud */}
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold tracking-wider uppercase border ${semBadge.bg} ${semBadge.border} ${semBadge.color}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    <span>{semBadge.label}</span>
                  </div>
                  {p.atraso_dh > 0 && (
                    <span className="text-[11px] font-mono text-rose-400 font-semibold">
                      +{p.atraso_dh}d hábiles
                    </span>
                  )}
                </div>

                {/* Motivo Semáforo */}
                {p.motivos_semaforo.length > 0 && (
                  <p className="text-xs text-slate-300 font-sans mb-4 line-clamp-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                    {p.motivos_semaforo[0]}
                  </p>
                )}
              </div>

              {/* Métricas Visuales: Anillo de progreso y Telemetría */}
              <div className="pt-4 border-t border-slate-800/80">
                <div className="flex items-center justify-between gap-4">
                  {/* Anillo de progreso circular */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r={radius}
                          stroke="#1e293b"
                          strokeWidth="5"
                          fill="transparent"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r={radius}
                          stroke={p.semaforo === 'rojo' ? '#ff3366' : p.semaforo === 'amarillo' ? '#fbbf24' : '#00f2fe'}
                          strokeWidth="5"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          fill="transparent"
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-sm font-mono font-bold text-white leading-none">
                          {p.avance_pct}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Nodo Actual
                      </span>
                      <span className="text-xs font-mono font-bold text-cyan-300">
                        {p.etapa_actual_nombre}
                      </span>
                    </div>
                  </div>

                  {/* Fechas Clave (Comprometida vs Estimada) */}
                  <div className="text-right font-mono">
                    <div className="text-[10px] text-slate-400 uppercase">
                      Estimada: <span className="text-white font-bold">{p.fecha_reproyectada || 'S/D'}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase mt-0.5">
                      Compromiso: <span className="text-slate-300">{p.fecha_comprometida || 'S/D'}</span>
                    </div>
                  </div>
                </div>

                {/* Sprints en vista lista (3 columnas cortas: Ingreso · Compromiso · Producción) */}
                <div className="mt-3 pt-2.5 border-t border-slate-900 grid grid-cols-3 gap-2 font-mono text-[10px]">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Ingreso</span>
                    <span className="text-slate-300 font-bold">{p.sprint_ingreso || '—'}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-slate-500 block text-[9px] uppercase">Compromiso</span>
                    <span className="text-slate-300 font-bold">{p.sprint_comprometido || '—'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[9px] uppercase">Producción</span>
                    <span className="text-cyan-300 font-bold block truncate">
                      {p.fecha_produccion ? `${p.fecha_produccion} (${p.sprint_estimado || 'est.'})` : '—'}
                    </span>
                  </div>
                </div>

                {/* Footer de Tarjeta: Responsable & Frescura */}
                <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                    <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{p.responsable_comunicar_nombre}</span>
                  </div>

                  {p.sin_actualizar ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                      Sin actualizar
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      Sync Notion: 21/10
                    </span>
                  )}
                </div>
              </div>

              {/* Botón de acceso a mapa con foco de consola */}
              <div className="mt-4 pt-2 flex items-center justify-end">
                <div
                  className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-all ${
                    isFocused ? 'text-cyan-300' : 'text-slate-500 group-hover:text-cyan-400'
                  }`}
                >
                  <span>Ingresar al Mapa</span>
                  <ChevronRight className={`w-4 h-4 transform transition-transform ${isFocused ? 'translate-x-1 text-cyan-300' : ''}`} />
                </div>
              </div>
            </motion.div>
          );
        })}
        </div>
      )}
    </div>
  );
};
