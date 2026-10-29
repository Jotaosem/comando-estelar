import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useRegistrarVista } from '../hooks/useRegistrarVista';
import { obtenerProyectosSeed } from '../lib/proyectosData';
import type { UsuarioPrueba } from '../components/DevUserSelector';
import { SemanticGalaxyDirector } from '../components/space/SemanticGalaxyDirector';
import { GalaxySearchBar } from '../components/space/GalaxySearchBar';
import { CompartirPopover } from '../components/CompartirPopover';
import { useNavigationStore } from '../components/space/navigationStore';
import {
  ShieldAlert,
  User,
  Filter,
  ChevronRight,
  Crosshair,
  Layers,
  LayoutGrid,
} from 'lucide-react';

interface ResumenPageProps {
  usuarioActual?: UsuarioPrueba;
}

export const ResumenPage: React.FC<ResumenPageProps> = ({ usuarioActual }) => {
  useRegistrarVista('resumen');
  const navigate = useNavigate();
  const triggerCentrar = useNavigationStore((s) => s.triggerCentrar);

  const [filtroSemaforo, setFiltroSemaforo] = useState<string>('todos');
  const [filtroArea, setFiltroArea] = useState<string>('todas');
  const [focoIndex, setFocoIndex] = useState<number>(0);
  const [esVistaLista, setEsVistaLista] = useState<boolean>(false);
  const [matchingIds, setMatchingIds] = useState<Set<string> | null>(null);
  const [mostrarFiltrosMobile, setMostrarFiltrosMobile] = useState<boolean>(false);

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
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={`outline-none w-full flex flex-col ${
        !esVistaLista ? 'h-[calc(100vh-5rem)] overflow-hidden' : 'space-y-6'
      }`}
    >
      {/* TOOLBAR COMPACTA DE 56px (Única para Galaxia y Lista) */}
      <header className="h-14 min-h-[56px] w-full px-3 sm:px-4 rounded-xl bg-slate-950/80 backdrop-blur-md border border-cyan-500/25 flex items-center justify-between gap-2 sm:gap-3 z-30 shrink-0 select-none">
        {/* Izquierda: Badge de misiones activas */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-mono text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f2fe]" />
            <span className="font-bold">Misiones</span>
            <span className="text-slate-500">·</span>
            <span>{proyectosFiltrados.length} activas</span>
          </div>
        </div>

        {/* Centro: Buscador unificado con Fuse y Dropdown en Portal */}
        <div className="flex-1 max-w-xs sm:max-w-md mx-1">
          <GalaxySearchBar
            proyectos={proyectos}
            onSelectProyecto={(p) => navigate(`/proyectos/${p.id}`)}
            onFilterChange={(_q, ids) => setMatchingIds(ids)}
            placeholder="Buscar proyecto… ⌘K"
          />
        </div>

        {/* Derecha: Filtros tácticos, Toggle Segmentado y Botón Centrar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 font-mono text-xs">
          {/* Botón Filtros en Mobile */}
          <button
            onClick={() => setMostrarFiltrosMobile(!mostrarFiltrosMobile)}
            className="sm:hidden px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs flex items-center gap-1"
          >
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Filtros</span>
          </button>

          {/* Filtro Estado */}
          <div className="hidden sm:flex items-center bg-slate-900/90 border border-cyan-500/30 rounded-lg px-2 py-1 shadow-inner">
            <select
              className="bg-transparent border-0 focus:ring-0 text-slate-200 text-xs pr-3 cursor-pointer outline-none font-mono"
              value={filtroSemaforo}
              onChange={(e) => setFiltroSemaforo(e.target.value)}
              aria-label="Filtrar por estado"
            >
              <option value="todos" className="bg-slate-950 text-slate-200">Estado ▾</option>
              <option value="rojo" className="bg-slate-950 text-red-400">🔴 Crítico (Rojo)</option>
              <option value="amarillo" className="bg-slate-950 text-amber-400">🟡 En riesgo (Ámbar)</option>
              <option value="verde" className="bg-slate-950 text-emerald-400">🟢 Nominal (Verde)</option>
            </select>
          </div>

          {/* Filtro Área */}
          <div className="hidden sm:flex items-center bg-slate-900/90 border border-cyan-500/30 rounded-lg px-2 py-1 shadow-inner">
            <select
              className="bg-transparent border-0 focus:ring-0 text-slate-200 text-xs pr-3 cursor-pointer outline-none font-mono"
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value)}
              aria-label="Filtrar por área"
            >
              <option value="todas" className="bg-slate-950 text-slate-200">Área ▾</option>
              <option value="Operaciones" className="bg-slate-950 text-slate-200">Operaciones</option>
              <option value="Comercial" className="bg-slate-950 text-slate-200">Comercial</option>
              <option value="Compliance" className="bg-slate-950 text-slate-200">Compliance</option>
              <option value="Seguridad" className="bg-slate-950 text-slate-200">Seguridad</option>
              <option value="BI & Analítica" className="bg-slate-950 text-slate-200">BI & Analítica</option>
            </select>
          </div>

          {/* Toggle Segmentado: [◉ Galaxia | ☰ Lista] */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-700/80">
            <button
              type="button"
              onClick={() => setEsVistaLista(false)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
                !esVistaLista
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/40 shadow-[0_0_10px_rgba(0,242,254,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vista Galaxia 3D"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xs:inline">Galaxia</span>
            </button>
            <button
              type="button"
              onClick={() => setEsVistaLista(true)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
                esVistaLista
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/40 shadow-[0_0_10px_rgba(0,242,254,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vista Lista"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xs:inline">Lista</span>
            </button>
          </div>

          {/* Botón Centrar: solo visible en Galaxia */}
          {!esVistaLista && (
            <button
              type="button"
              onClick={() => triggerCentrar()}
              className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-slate-300 hover:text-cyan-300 hover:border-cyan-400 text-xs font-mono transition-all flex items-center gap-1.5 shadow-inner"
              title="Centrar galaxia (ajustar vista)"
            >
              <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Centrar</span>
            </button>
          )}
        </div>
      </header>

      {/* Menú desplegable de filtros en mobile */}
      {mostrarFiltrosMobile && (
        <div className="sm:hidden p-3 rounded-xl bg-slate-950 border border-cyan-500/30 flex flex-col gap-2 font-mono text-xs z-20 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Estado:</span>
            <select
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
              value={filtroSemaforo}
              onChange={(e) => setFiltroSemaforo(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="rojo">🔴 Crítico</option>
              <option value="amarillo">🟡 En riesgo</option>
              <option value="verde">🟢 Nominal</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Área:</span>
            <select
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value)}
            >
              <option value="todas">Todas</option>
              <option value="Operaciones">Operaciones</option>
              <option value="Comercial">Comercial</option>
              <option value="Compliance">Compliance</option>
              <option value="Seguridad">Seguridad</option>
              <option value="BI & Analítica">BI & Analítica</option>
            </select>
          </div>
        </div>
      )}

      {/* Vista Principal: Mapa Galáctico 3D o Grid de Lista */}
      {!esVistaLista ? (
        <div className="flex-1 w-full h-[calc(100vh-56px-64px)] min-h-[540px] overflow-hidden rounded-2xl">
          <SemanticGalaxyDirector
            proyectos={proyectosFiltrados}
            matchingIds={matchingIds}
          />
        </div>
      ) : (
        /* Grid de Misiones (Vista Lista) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
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

          // Formateo de fechas para punto 6: "Estimada 19/11 · Compromiso 06/11"
          const fmtCorto = (f?: string | null) => {
            if (!f) return 'S/D';
            const m = f.match(/(\d{4})-(\d{2})-(\d{2})/);
            return m ? `${m[3]}/${m[2]}` : f;
          };

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

                {/* Descripción (máx. 2 líneas) */}
                <p className="text-xs text-slate-300 font-sans line-clamp-2 mb-3" title={p.descripcion || 'Sin descripción'}>
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

                  {/* Fechas en una sola línea sin cortes: "Estimada 19/11 · Compromiso 06/11" */}
                  <div className="text-right font-mono">
                    <div className="text-[11px] text-slate-300 whitespace-nowrap">
                      Estimada <span className="text-white font-bold">{fmtCorto(p.fecha_reproyectada)}</span>
                      <span className="text-slate-500 mx-1">·</span>
                      Compromiso <span className="text-slate-300 font-semibold">{fmtCorto(p.fecha_comprometida)}</span>
                    </div>
                  </div>
                </div>

                {/* Sprints en vista lista (3 columnas iguales con wrap, sin "…") */}
                <div className="mt-3 pt-2.5 border-t border-slate-900 grid grid-cols-3 gap-2 font-mono text-[10px]">
                  <div className="min-w-0">
                    <span className="text-slate-500 block text-[9px] uppercase">Ingreso</span>
                    <span className="text-slate-300 font-bold block break-words">{p.sprint_ingreso || '—'}</span>
                  </div>
                  <div className="min-w-0 text-center">
                    <span className="text-slate-500 block text-[9px] uppercase">Compromiso</span>
                    <span className="text-slate-300 font-bold block break-words">{p.sprint_comprometido || '—'}</span>
                  </div>
                  <div className="min-w-0 text-right">
                    <span className="text-slate-500 block text-[9px] uppercase">Producción</span>
                    <span className="text-cyan-300 font-bold block break-words">
                      {p.fecha_produccion ? `${fmtCorto(p.fecha_produccion)}${p.sprint_estimado ? ` · ${p.sprint_estimado}` : ''}` : '—'}
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
              <div className="mt-4 pt-2 flex items-center justify-between">
                <CompartirPopover
                  proyecto={p}
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
