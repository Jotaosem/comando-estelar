import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useRegistrarVista } from '../hooks/useRegistrarVista';
import { obtenerProyectosSeed, type ProyectoResumenUI } from '../lib/proyectosData';
import type { UsuarioPrueba } from '../components/DevUserSelector';
import { SemanticGalaxyDirector } from '../components/space/SemanticGalaxyDirector';
import { GalaxySearchBar } from '../components/space/GalaxySearchBar';
import { useNavigationStore } from '../components/space/navigationStore';
import { SceneLayout } from '../layouts/SceneLayout';
import { PageLayout } from '../layouts/PageLayout';
import { ProyectosTabla } from '../components/ProyectosTabla';
import { MisionesErrorBoundary } from '../components/MisionesErrorBoundary';
import { isEditableElement } from '../lib/keyboardUtils';
import {
  ShieldAlert,
  User,
  Filter,
  ChevronRight,
  Crosshair,
  Layers,
  LayoutGrid,
  Table,
} from 'lucide-react';

interface ResumenPageProps {
  usuarioActual?: UsuarioPrueba;
  onCambiarUsuario?: (u: UsuarioPrueba) => void;
  vistaInicialLista?: boolean;
}

export const ResumenPage: React.FC<ResumenPageProps> = ({
  usuarioActual,
  onCambiarUsuario,
  vistaInicialLista = false,
}) => {
  useRegistrarVista('resumen');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const triggerCentrar = useNavigationStore((s) => s.triggerCentrar);
  const seleccionarProyecto = useNavigationStore((s) => s.seleccionarProyecto);

  const [filtroSemaforo, setFiltroSemaforo] = useState<string>('todos');
  const [filtroArea, setFiltroArea] = useState<string>('todas');
  const [focoIndex, setFocoIndex] = useState<number>(0);

  // Toggle de vistas: 'galaxia' | 'tarjetas' | 'tabla', persistido en URL y localStorage
  const [vista, setVista] = useState<'galaxia' | 'tarjetas' | 'tabla'>(() => {
    const urlVista = searchParams.get('vista');
    if (urlVista === 'galaxia' || urlVista === 'tarjetas' || urlVista === 'tabla') return urlVista;
    if (urlVista === 'lista') return 'tarjetas';
    try {
      const saved = localStorage.getItem('vista_proyectos');
      if (saved === 'galaxia' || saved === 'tarjetas' || saved === 'tabla') return saved;
    } catch {
      // ignore
    }
    return vistaInicialLista ? 'tarjetas' : 'galaxia';
  });

  const cambiarVista = (nuevaVista: 'galaxia' | 'tarjetas' | 'tabla') => {
    setVista(nuevaVista);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('vista', nuevaVista);
    setSearchParams(nextParams, { replace: true });
    try {
      localStorage.setItem('vista_proyectos', nuevaVista);
    } catch {
      // ignore
    }
  };

  const [matchingIds, setMatchingIds] = useState<Set<string> | null>(null);
  const [mostrarFiltrosMobile, setMostrarFiltrosMobile] = useState<boolean>(false);

  const proyectos = obtenerProyectosSeed(usuarioActual);

  const semaforoScore: Record<string, number> = {
    rojo: 1,
    amarillo: 2,
    gris: 3,
    verde: 4,
  };

  const esModoListaOTabla = vista === 'tarjetas' || vista === 'tabla';

  const proyectosFiltrados = proyectos
    .filter((p) => (filtroSemaforo === 'todos' ? true : p.semaforo === filtroSemaforo))
    .filter((p) => (filtroArea === 'todas' ? true : p.area_solicitante === filtroArea))
    .filter((p) => (esModoListaOTabla && matchingIds ? matchingIds.has(p.id) : true))
    .sort((a, b) => (semaforoScore[a.semaforo] || 5) - (semaforoScore[b.semaforo] || 5));

  // Manejo de teclado estilo consola (flechas para navegar misiones, Enter para ingresar)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditableElement(e.target)) return;
    if (e.key === 'Escape') {
      useNavigationStore.getState().volverUnNivel();
      return;
    }
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

  // REQUERIMIENTO 1: Seleccionar proyecto en el buscador según la vista
  const handleSelectBuscador = (p: ProyectoResumenUI) => {
    if (vista === 'galaxia') {
      seleccionarProyecto(p);
    } else {
      navigate(`/proyectos/${p.id}`);
    }
  };

  if (proyectos.length === 0) {
    return (
      <PageLayout usuarioActual={usuarioActual!} onCambiarUsuario={onCambiarUsuario || (() => {})}>
        <div className="panel p-12 text-center max-w-lg mx-auto border border-health-red/30 my-16 bg-card">
          <ShieldAlert className="w-16 h-16 text-health-red mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground uppercase tracking-tight">
            Acceso No Autorizado
          </h2>
          <p className="text-sm font-mono text-muted-foreground mt-2">
            El usuario activo ({usuarioActual?.email}) no cuenta con credenciales tácticas asignadas para consultar las misiones en curso.
          </p>
        </div>
      </PageLayout>
    );
  }

  const renderToolbar = () => (
    <header className="h-14 min-h-[56px] w-full px-3 sm:px-4 bg-surface/90 backdrop-blur-md border-b border-border flex items-center justify-between gap-2 sm:gap-3 z-30 shrink-0 select-none text-foreground">
      {/* Izquierda: Badge de misiones activas */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-border text-foreground font-mono text-xs shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-terracotta" />
          <span className="font-bold">Misiones</span>
          <span className="text-muted-foreground">·</span>
          <span>{proyectosFiltrados.length} activas</span>
        </div>
      </div>

      {/* Centro: Buscador unificado con Fuse y Dropdown en Portal */}
      <div className="flex-1 max-w-xs sm:max-w-md mx-1">
        <GalaxySearchBar
          proyectos={proyectos}
          onSelectProyecto={handleSelectBuscador}
          onFilterChange={(_q, ids) => setMatchingIds(ids)}
          placeholder="Buscar proyecto…"
        />
      </div>

      {/* Derecha: Filtros tácticos, Toggle Segmentado y Botón Centrar */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 font-mono text-xs">
        {/* Botón Filtros en Mobile */}
        <button
          onClick={() => setMostrarFiltrosMobile(!mostrarFiltrosMobile)}
          className="sm:hidden px-2.5 py-1 rounded-full bg-card border border-border text-foreground text-xs flex items-center gap-1 shadow-sm"
        >
          <Filter className="w-3.5 h-3.5 text-terracotta" />
          <span>Filtros</span>
        </button>

        {/* Filtro Estado */}
        <div className="hidden sm:flex items-center bg-card border border-border rounded-full px-3 py-1 shadow-sm">
          <select
            className="bg-transparent border-0 focus:ring-0 text-foreground text-xs pr-2 cursor-pointer outline-none font-mono appearance-none"
            value={filtroSemaforo}
            onChange={(e) => setFiltroSemaforo(e.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="todos" className="bg-card text-foreground">Estado ▾</option>
            <option value="rojo" className="bg-card text-health-red">🔴 Crítico</option>
            <option value="amarillo" className="bg-card text-health-amber">🟡 Alerta</option>
            <option value="verde" className="bg-card text-health-green">🟢 Nominal</option>
          </select>
        </div>

        {/* Filtro Área */}
        <div className="hidden sm:flex items-center bg-card border border-border rounded-full px-3 py-1 shadow-sm">
          <select
            className="bg-transparent border-0 focus:ring-0 text-foreground text-xs pr-2 cursor-pointer outline-none font-mono appearance-none"
            value={filtroArea}
            onChange={(e) => setFiltroArea(e.target.value)}
            aria-label="Filtrar por área"
          >
            <option value="todas" className="bg-card text-foreground">Área ▾</option>
            <option value="Operaciones" className="bg-card text-foreground">Operaciones</option>
            <option value="Comercial" className="bg-card text-foreground">Comercial</option>
            <option value="Compliance" className="bg-card text-foreground">Compliance</option>
            <option value="Seguridad" className="bg-card text-foreground">Seguridad</option>
            <option value="BI & Analítica" className="bg-card text-foreground">BI & Analítica</option>
          </select>
        </div>

        {/* Toggle Segmentado de 3 vistas */}
        <div className="flex items-center p-0.5 rounded-full bg-surface border border-border">
          <button
            type="button"
            onClick={() => cambiarVista('galaxia')}
            className={`px-3 py-1 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 ${
              vista === 'galaxia'
                ? 'bg-terracotta text-white font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Vista Galaxia 3D"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Galaxia</span>
          </button>
          <button
            type="button"
            onClick={() => cambiarVista('tarjetas')}
            className={`px-3 py-1 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 ${
              vista === 'tarjetas'
                ? 'bg-terracotta text-white font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Vista Lista"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Tarjetas</span>
          </button>
          <button
            type="button"
            onClick={() => cambiarVista('tabla')}
            className={`px-3 py-1 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 ${
              vista === 'tabla'
                ? 'bg-terracotta text-white font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Vista Tabla"
          >
            <Table className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Tabla</span>
          </button>
        </div>

        {/* Botón Centrar */}
        {vista === 'galaxia' && (
          <button
            type="button"
            onClick={() => triggerCentrar()}
            className="px-3 py-1 rounded-full bg-card border border-border text-foreground hover:border-terracotta text-xs font-mono transition-colors flex items-center gap-1.5 shadow-sm"
            title="Centrar galaxia (ajustar vista)"
          >
            <Crosshair className="w-3.5 h-3.5 text-terracotta" />
            <span className="hidden sm:inline">Centrar</span>
          </button>
        )}
      </div>
    </header>
  );

  const renderFiltrosMobile = () => (
    mostrarFiltrosMobile && (
      <div className="sm:hidden p-3 rounded-2xl bg-card border border-border flex flex-col gap-2 font-mono text-xs z-20 shrink-0 shadow-panel">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Estado:</span>
          <select
            className="bg-surface border border-border rounded-lg px-2 py-1 text-foreground text-xs"
            value={filtroSemaforo}
            onChange={(e) => setFiltroSemaforo(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="rojo">🔴 Crítico</option>
            <option value="amarillo">🟡 Alerta</option>
            <option value="verde">🟢 Nominal</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Área:</span>
          <select
            className="bg-surface border border-border rounded-lg px-2 py-1 text-foreground text-xs"
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
    )
  );

  if (vista === 'galaxia') {
    return (
      <SceneLayout usuarioActual={usuarioActual!} onCambiarUsuario={onCambiarUsuario || (() => {})}>
        <MisionesErrorBoundary fallbackTitle="Error al cargar la escena 3D">
          <div
            onKeyDown={handleKeyDown}
            tabIndex={0}
            className="outline-none w-full h-full flex flex-col flex-1 min-h-0 overflow-hidden"
          >
            {renderToolbar()}
            {renderFiltrosMobile()}

            {/* Vista Principal: Mapa Galáctico 3D */}
            <div className="flex-1 w-full min-h-0 overflow-hidden flex flex-col">
              <SemanticGalaxyDirector
                proyectos={proyectosFiltrados}
                matchingIds={matchingIds}
              />
            </div>
          </div>
        </MisionesErrorBoundary>
      </SceneLayout>
    );
  }

  // Vistas 2D en PageLayout (tarjetas o tabla)
  return (
    <PageLayout usuarioActual={usuarioActual!} onCambiarUsuario={onCambiarUsuario || (() => {})}>
      <MisionesErrorBoundary fallbackTitle="Error al cargar la lista de proyectos">
        <div onKeyDown={handleKeyDown} tabIndex={0} className="outline-none w-full space-y-6">
          {renderToolbar()}
          {renderFiltrosMobile()}

          {vista === 'tabla' ? (
            <ProyectosTabla
              proyectos={proyectosFiltrados}
              onSelectProyecto={(p) => navigate(`/proyectos/${p.id}`)}
              onLimpiarFiltros={() => {
                setFiltroSemaforo('todos');
                setFiltroArea('todas');
                setMatchingIds(null);
              }}
            />
          ) : (
            /* Vista de Tarjetas de Grilla */
            proyectosFiltrados.length === 0 ? (
              <div className="panel p-8 text-center space-y-4 border border-border my-6 bg-card">
                <p className="font-mono text-sm text-muted-foreground">
                  No hay proyectos con estos filtros
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFiltroSemaforo('todos');
                    setFiltroArea('todas');
                    setMatchingIds(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-mono bg-surface text-foreground border border-border hover:bg-muted transition-colors shadow-sm"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {proyectosFiltrados.map((p, idx) => {
                  const isFocused = idx === focoIndex;

                  let semBadge = {
                    label: 'NOMINAL',
                    color: 'text-health-green',
                    border: 'border-health-green/40',
                    bg: 'bg-health-green-soft',
                  };

                  if (p.semaforo === 'rojo') {
                    semBadge = {
                      label: 'CRÍTICO // BLOQUEADO',
                      color: 'text-health-red',
                      border: 'border-health-red/40',
                      bg: 'bg-health-red-soft',
                    };
                  } else if (p.semaforo === 'amarillo') {
                    semBadge = {
                      label: 'ALERTA // REABIERTA',
                      color: 'text-health-amber',
                      border: 'border-health-amber/40',
                      bg: 'bg-health-amber-soft',
                    };
                  }

                  const radius = 28;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDashoffset = circumference - (p.avance_pct / 100) * circumference;

                  const fmtCorto = (f?: string | null) => {
                    if (!f) return 'S/D';
                    const m = f.match(/(\d{4})-(\d{2})-(\d{2})/);
                    return m ? `${m[3]}/${m[2]}` : f;
                  };

                  return (
                    <motion.div
                      key={p.id}
                      tabIndex={0}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.03 }}
                      onClick={() => {
                        setFocoIndex(idx);
                        navigate(`/proyectos/${p.id}`);
                      }}
                      onMouseEnter={() => setFocoIndex(idx)}
                      className={`relative group cursor-pointer rounded-3xl p-6 transition-all duration-200 flex flex-col justify-between overflow-hidden bg-card border ${
                        isFocused
                          ? 'border-terracotta ring-2 ring-terracotta/20 shadow-panel scale-[1.01]'
                          : 'border-border hover:border-border-strong shadow-panel'
                      }`}
                    >
                      <div>
                        {/* Sector y Callsign */}
                        <div className="flex items-center justify-between gap-2 mb-3 font-mono text-[11px]">
                          <span className="px-2.5 py-0.5 rounded-full bg-surface border border-border text-foreground uppercase tracking-wider font-semibold">
                            {p.area_solicitante}
                          </span>
                          <span className="text-terracotta font-semibold tracking-wider">
                            {p.callsign || `MIS-${idx + 1}`}
                          </span>
                        </div>

                        {/* Título de Proyecto */}
                        <h3 className="text-lg font-bold text-foreground tracking-tight group-hover:text-terracotta-text transition-colors line-clamp-1 mb-1">
                          {p.nombre}
                        </h3>

                        {/* Descripción (máx. 2 líneas) */}
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed" title={p.descripcion || 'Sin descripción'}>
                          {p.descripcion || <span className="italic opacity-60">Sin descripción</span>}
                        </p>

                        {/* Estado y Salud */}
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold tracking-wide uppercase border ${semBadge.bg} ${semBadge.border} ${semBadge.color}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            <span>{semBadge.label}</span>
                          </div>
                          {p.atraso_dh > 0 && (
                            <span className="text-[11px] font-mono text-health-red font-semibold">
                              +{p.atraso_dh}d hábiles
                            </span>
                          )}
                        </div>

                        {/* Motivo Semáforo */}
                        {p.motivos_semaforo.length > 0 && (
                          <p className="text-xs text-muted-foreground font-sans mb-3 line-clamp-2 bg-surface p-2 rounded-xl border border-border">
                            {p.motivos_semaforo[0]}
                          </p>
                        )}
                      </div>

                      {/* REQUERIMIENTO 4: Anillo de progreso y debajo fila de fechas completa con wrap sin cortes */}
                      <div className="pt-3 border-t border-border space-y-3">
                        <div className="flex items-center gap-3">
                          {/* Anillo de progreso */}
                          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                            <svg className="w-14 h-14 transform -rotate-90">
                              <circle
                                cx="28"
                                cy="28"
                                r={radius}
                                stroke="var(--muted)"
                                strokeWidth="4.5"
                                fill="transparent"
                              />
                              <circle
                                cx="28"
                                cy="28"
                                r={radius}
                                stroke="var(--viz-average)"
                                strokeWidth="4.5"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                fill="transparent"
                                className="transition-all duration-500 ease-out"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-xs font-mono font-bold text-foreground leading-none">
                                {p.avance_pct}%
                              </span>
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-mono text-muted-foreground uppercase block">
                              Nodo Actual
                            </span>
                            <span className="text-xs font-semibold text-foreground truncate block">
                              {p.etapa_actual_nombre}
                            </span>
                          </div>
                        </div>

                        {/* Fila de fechas propia, ancho completo, con wrap y sin desbordarse */}
                        <div className="w-full flex items-center justify-between text-[11px] font-mono text-muted-foreground bg-surface p-2 rounded-xl border border-border flex-wrap gap-1">
                          <span className="truncate">
                            Estimada <strong className="text-foreground font-bold">{fmtCorto(p.fecha_reproyectada)}</strong>
                          </span>
                          <span className="text-border-strong">·</span>
                          <span className="truncate">
                            Compromiso <strong className="text-foreground">{fmtCorto(p.fecha_comprometida)}</strong>
                          </span>
                        </div>

                        {/* Fila inferior: Sprints y Responsable con overflow seguro */}
                        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground pt-1">
                          <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                            <User className="w-3.5 h-3.5 text-terracotta shrink-0" />
                            <span className="truncate text-foreground font-medium">{p.responsable_comunicar_nombre}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] uppercase text-muted-foreground">
                              {p.sprint_ingreso || 'Sprint 1'}
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-terracotta transition-colors" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </MisionesErrorBoundary>
    </PageLayout>
  );
};
