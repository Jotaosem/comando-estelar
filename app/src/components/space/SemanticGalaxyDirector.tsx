import React, { useState, useEffect, useMemo, Suspense, lazy, useRef } from 'react';
import {
  ChevronRight,
  ArrowLeft,
  List,
  Compass,
  Crosshair,
} from 'lucide-react';
import * as THREE from 'three';
import type { ProyectoResumenUI } from '../../lib/proyectosData';
import { calcularPosicionPlaneta, calcularGalaxiaBox } from './galaxyData';
import { PlanetHUDCard } from './PlanetHUDCard';
import { StageGlassPanel } from './StageGlassPanel';
import { GalaxySearchBar } from './GalaxySearchBar';
import { GalaxyMinimap } from './GalaxyMinimap';
import { StageScreenTooltip, type StageTooltipData } from './StageScreenTooltip';
import { useNavigationStore } from './navigationStore';

const GalaxyCanvas3D = lazy(() => import('./GalaxyCanvas3D'));

interface SemanticGalaxyDirectorProps {
  proyectos: ProyectoResumenUI[];
  onToggleLista: () => void;
  esVistaLista: boolean;
}

export const SemanticGalaxyDirector: React.FC<SemanticGalaxyDirectorProps> = ({
  proyectos,
  onToggleLista,
  esVistaLista,
}) => {
  // REQUERIMIENTO 6: Estado de navegación 100% derivado del Store Único
  const {
    nivel,
    areaId,
    proyecto: selectedProyecto,
    etapa: selectedEtapa,
    irAGalaxia,
    seleccionarProyecto,
    seleccionarEtapa,
    volverUnNivel,
  } = useNavigationStore();

  const [hoverStageData, setHoverStageData] = useState<StageTooltipData | null>(null);
  const tooltipTimeout = useRef<any>(null);

  const [panOffset, setPanOffset] = useState<[number, number]>([0, 0]);
  const [currentCamera, setCurrentCamera] = useState<THREE.Camera | null>(null);
  const [targetFocusPos, setTargetFocusPos] = useState<[number, number, number] | null>(null);

  const [matchingIds, setMatchingIds] = useState<Set<string> | null>(null);
  const [healthFilter, setHealthFilter] = useState<string | null>(null);

  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // REQUERIMIENTO 4 (BUG FIX): Medir altura real del header
  const [headerRealHeight, setHeaderRealHeight] = useState<number>(64);

  useEffect(() => {
    const updateHeaderHeight = () => {
      const headerElement = document.querySelector('header');
      if (headerElement) {
        setHeaderRealHeight(headerElement.offsetHeight);
      }
    };
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, []);

  useEffect(() => {
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mqMotion.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mqMotion.addEventListener('change', handler);

    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      mqMotion.removeEventListener('change', handler);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const proyectosPorSector = useMemo(() => {
    const map = new Map<string, ProyectoResumenUI[]>();
    proyectos.forEach((p) => {
      const arr = map.get(p.area_solicitante) || [];
      arr.push(p);
      map.set(p.area_solicitante, arr);
    });
    return map;
  }, [proyectos]);

  const cameraTargetPos = useMemo<[number, number, number]>(() => {
    if (nivel === 'galaxia') return [panOffset[0], 0, panOffset[1]];
    if (selectedProyecto) {
      const sectorList = proyectosPorSector.get(selectedProyecto.area_solicitante) || [selectedProyecto];
      const idx = sectorList.findIndex((p) => p.id === selectedProyecto.id);
      return calcularPosicionPlaneta(selectedProyecto.area_solicitante, Math.max(0, idx), sectorList.length);
    }
    return [0, 0, 0];
  }, [nivel, selectedProyecto, proyectosPorSector, panOffset]);

  const galaxyBox = useMemo(() => {
    const list = proyectos.map((p) => {
      const sectorList = proyectosPorSector.get(p.area_solicitante) || [p];
      const sIdx = sectorList.findIndex((it) => it.id === p.id);
      return { position: calcularPosicionPlaneta(p.area_solicitante, Math.max(0, sIdx), sectorList.length) };
    });
    return calcularGalaxiaBox(list);
  }, [proyectos, proyectosPorSector]);

  const handleHoverStage = (data: StageTooltipData | null) => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    if (!data) {
      setHoverStageData(null);
    } else {
      tooltipTimeout.current = setTimeout(() => {
        setHoverStageData(data);
      }, 80);
    }
  };

  const handleSelectFromSearch = (p: ProyectoResumenUI) => {
    const sectorList = proyectosPorSector.get(p.area_solicitante) || [p];
    const sIdx = sectorList.findIndex((it) => it.id === p.id);
    const pos = calcularPosicionPlaneta(p.area_solicitante, Math.max(0, sIdx), sectorList.length);
    setTargetFocusPos(pos);
    seleccionarProyecto(p);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        volverUnNivel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volverUnNivel]);

  return (
    <div
      style={{
        marginTop: `${headerRealHeight > 64 ? 8 : 4}px`,
      }}
      className="relative w-full h-[85vh] min-h-[580px] rounded-3xl overflow-hidden hud-glass border border-cyan-500/30 bg-[#020510] shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col select-none"
    >
      {/* 1. TOP BAR HUD FIJA: 48px con pointer-events-auto */}
      <div className="absolute top-0 left-0 right-0 h-12 z-40 px-3 sm:px-4 bg-[#020510]/95 backdrop-blur-xl border-b border-cyan-500/20 flex items-center justify-between gap-3 pointer-events-auto">
        
        {/* REQUERIMIENTO 6: Breadcrumb derivado SOLO del store de navegación
            En nivel 'galaxia' muestra estrictamente solo 'Galaxia' */}
        <div className="flex items-center gap-1 sm:gap-2 text-xs font-mono shrink-0">
          <button
            onClick={irAGalaxia}
            className={`flex items-center gap-1.5 transition-colors ${
              nivel === 'galaxia' ? 'text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>GALAXIA</span>
          </button>

          {nivel !== 'galaxia' && areaId && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-slate-300">
                {areaId}
              </span>
            </>
          )}

          {nivel !== 'galaxia' && selectedProyecto && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <button
                onClick={() => seleccionarProyecto(selectedProyecto)}
                className={`transition-colors ${
                  nivel === 'planeta' ? 'text-cyan-300 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {selectedProyecto.callsign || selectedProyecto.nombre.split('(')[0].trim()}
              </button>
            </>
          )}

          {nivel === 'etapa' && selectedEtapa && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-cyan-400 font-bold truncate max-w-[110px] sm:max-w-none">
                {selectedEtapa.orden}. {selectedEtapa.nombre}
              </span>
            </>
          )}
        </div>

        {/* Buscador Difuso fuse.js con atajo Ctrl+K */}
        <div className="flex-1 max-w-sm hidden md:block">
          <GalaxySearchBar
            proyectos={proyectos}
            onSelectProyecto={handleSelectFromSearch}
            onFilterChange={(_q, ids) => setMatchingIds(ids)}
          />
        </div>

        {/* Controles de la Top Bar */}
        <div className="flex items-center gap-2 shrink-0">
          {nivel === 'galaxia' && (
            <button
              onClick={() => {
                setPanOffset([0, 0]);
                setTargetFocusPos(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-xs font-mono transition-all flex items-center gap-1 shadow-sm"
              title="Centrar galaxia (fit-to-view)"
            >
              <Crosshair className="w-3 h-3" />
              <span className="hidden sm:inline">CENTRAR</span>
            </button>
          )}

          {nivel !== 'galaxia' && (
            <button
              onClick={volverUnNivel}
              className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 text-xs font-mono transition-all flex items-center gap-1.5"
              title="Volver un nivel (Esc)"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>VOLVER (ESC)</span>
            </button>
          )}

          <button
            onClick={onToggleLista}
            className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
              esVistaLista
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">VISTA LISTA</span>
          </button>
        </div>
      </div>

      {/* 2. Capa de oscurecimiento: pointer-events: none garantizado */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none z-10" />

      {/* 3. HUD compacto de 320px arriba a la izquierda en niveles planeta/etapa */}
      {nivel !== 'galaxia' && selectedProyecto && (
        <div className="absolute top-16 left-4 z-30 animate-in fade-in slide-in-from-left-2 pointer-events-auto">
          <PlanetHUDCard proyecto={selectedProyecto} />
        </div>
      )}

      {/* 4. Tooltip en capa DOM proyectado */}
      <StageScreenTooltip data={hoverStageData} />

      {/* 5. Escena 3D WebGL con Controles 2.5D desacoplados */}
      <div className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
        <Suspense
          fallback={
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-[#020510]">
              <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <span className="font-mono text-xs text-cyan-400 uppercase tracking-widest animate-pulse">
                INICIALIZANDO MOTOR GRAVITACIONAL...
              </span>
            </div>
          }
        >
          <GalaxyCanvas3D
            nivel={nivel}
            proyectos={proyectos}
            selectedProyecto={selectedProyecto}
            selectedEtapa={selectedEtapa}
            cameraTargetPos={cameraTargetPos}
            onSelectProyecto={seleccionarProyecto}
            onSelectEtapa={seleccionarEtapa}
            reducedMotion={reducedMotion}
            onHoverStage={handleHoverStage}
            hoverStageData={hoverStageData}
            panOffset={panOffset}
            matchingIds={matchingIds}
            healthFilter={healthFilter}
            onCameraUpdate={(cam) => setCurrentCamera(cam)}
            targetFocusPos={targetFocusPos}
          />
        </Suspense>
      </div>

      {/* 6. Minimapa con Box3 real y rectángulo de cámara (Nivel Galaxia) */}
      <GalaxyMinimap
        galaxyBox={galaxyBox}
        camera={currentCamera}
        onPanTo={(x, z) => {
          setPanOffset([x, z]);
          setTargetFocusPos(null);
        }}
        visible={nivel === 'galaxia'}
      />

      {/* 7. Panel Lateral de 380px (Solo en nivel etapa) */}
      {nivel === 'etapa' && selectedEtapa && selectedProyecto && (
        <StageGlassPanel
          etapa={selectedEtapa}
          proyecto={selectedProyecto}
          onClose={() => {
            seleccionarProyecto(selectedProyecto);
          }}
          isMobile={isMobile}
        />
      )}

      {/* 8. Leyenda inferior con filtros toggle de salud */}
      <div className="absolute bottom-0 left-0 right-0 h-8 z-30 px-4 bg-[#020510]/90 backdrop-blur-md border-t border-cyan-500/15 flex items-center justify-between text-[11px] font-mono text-slate-400 pointer-events-auto">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[10px] uppercase text-slate-500 hidden sm:inline">Filtro:</span>
          
          <button
            onClick={() => setHealthFilter(healthFilter === 'rojo' ? null : 'rojo')}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
              healthFilter === 'rojo' ? 'bg-rose-950 border border-rose-500 text-rose-200' : 'hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#ff3366]" />
            <span>Crítico</span>
          </button>

          <button
            onClick={() => setHealthFilter(healthFilter === 'amarillo' ? null : 'amarillo')}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
              healthFilter === 'amarillo' ? 'bg-amber-950 border border-amber-500 text-amber-200' : 'hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
            <span>Alerta</span>
          </button>

          <button
            onClick={() => setHealthFilter(healthFilter === 'verde' ? null : 'verde')}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
              healthFilter === 'verde' ? 'bg-cyan-950 border border-cyan-500 text-cyan-200' : 'hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#00f2fe]" />
            <span>En curso</span>
          </button>

          <button
            onClick={() => setHealthFilter(healthFilter === 'gris' ? null : 'gris')}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
              healthFilter === 'gris' ? 'bg-yellow-950 border border-yellow-500 text-yellow-200' : 'hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#eab308]" />
            <span>Cerrado</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-slate-500">
          <span>NIVEL: <strong className="text-cyan-400 uppercase">{nivel}</strong></span>
          <span>·</span>
          <span>ESC: VOLVER</span>
        </div>
      </div>
    </div>
  );
};
