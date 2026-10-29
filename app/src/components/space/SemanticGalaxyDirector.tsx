import React, { useState, useEffect, useMemo, Suspense, lazy, useRef } from 'react';
import {
  ChevronRight,
  ArrowLeft,
  Compass,
} from 'lucide-react';
import * as THREE from 'three';
import type { ProyectoResumenUI } from '../../lib/proyectosData';
import { calcularPosicionPlaneta, calcularGalaxiaBox } from './galaxyData';
import { PlanetHUDCard } from './PlanetHUDCard';
import { StageGlassPanel } from './StageGlassPanel';
import { GalaxyMinimap } from './GalaxyMinimap';
import { StageScreenTooltip, type StageTooltipData } from './StageScreenTooltip';
import { useNavigationStore } from './navigationStore';

const GalaxyCanvas3D = lazy(() => import('./GalaxyCanvas3D'));

interface SemanticGalaxyDirectorProps {
  proyectos: ProyectoResumenUI[];
  matchingIds?: Set<string> | null;
}

export const SemanticGalaxyDirector: React.FC<SemanticGalaxyDirectorProps> = ({
  proyectos,
  matchingIds = null,
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
    centrarTrigger,
  } = useNavigationStore();

  const [hoverStageData, setHoverStageData] = useState<StageTooltipData | null>(null);
  const tooltipTimeout = useRef<any>(null);

  const [panOffset, setPanOffset] = useState<[number, number]>([0, 0]);
  const [currentCamera, setCurrentCamera] = useState<THREE.Camera | null>(null);
  const [targetFocusPos, setTargetFocusPos] = useState<[number, number, number] | null>(null);

  const [healthFilter, setHealthFilter] = useState<string | null>(null);

  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

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
        height: 'calc(100vh - 120px)',
      }}
      className="relative w-full min-h-[580px] rounded-2xl overflow-hidden hud-glass border border-cyan-500/30 bg-[#020510] shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col select-none"
    >
      {/* Breadcrumb en una fila de 32px bajo la toolbar, solo dentro de un planeta */}
      {nivel !== 'galaxia' && selectedProyecto && (
        <div className="h-8 px-4 bg-[#020510]/90 backdrop-blur-md border-b border-cyan-500/20 flex items-center gap-1.5 text-xs font-mono z-30 pointer-events-auto">
          <button
            onClick={irAGalaxia}
            className="text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Galaxia</span>
          </button>

          {areaId && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-slate-400">{areaId}</span>
            </>
          )}

          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="text-cyan-300 font-bold truncate">
            {selectedProyecto.callsign || selectedProyecto.nombre.split('(')[0].trim()}
          </span>

          {nivel === 'etapa' && selectedEtapa && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-cyan-400 font-bold truncate">
                {selectedEtapa.orden}. {selectedEtapa.nombre}
              </span>
            </>
          )}

          <div className="ml-auto">
            <button
              onClick={volverUnNivel}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white text-[10px] font-mono transition-all flex items-center gap-1"
              title="Volver (Esc)"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>VOLVER (ESC)</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Capa de oscurecimiento: pointer-events: none garantizado */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none z-10" />

      {/* 3. HUD compacto de 340px arriba a la izquierda en niveles planeta/etapa */}
      {nivel !== 'galaxia' && selectedProyecto && (
        <div className="absolute top-12 left-4 z-30 animate-in fade-in slide-in-from-left-2 pointer-events-auto">
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
            centrarTrigger={centrarTrigger}
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
