import React, { useState, useEffect, useMemo, Suspense, lazy, useRef } from 'react';
import {
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import * as THREE from 'three';
import type { ProyectoResumenUI } from '../../lib/proyectosData';
import { calcularPosicionPlaneta, calcularGalaxiaBox } from './galaxyData';
import { PlanetHUDCard } from './PlanetHUDCard';
import { StageGlassPanel } from './StageGlassPanel';
import { GalaxyMinimap } from './GalaxyMinimap';
import { StageScreenTooltip, type StageTooltipData } from './StageScreenTooltip';
import { useNavigationStore } from './navigationStore';
import { useHideLabelsUnderHud } from '../../hooks/useHideLabelsUnderHud';
import { Z_LAYERS } from '../../constants/zLayers';

const GalaxyCanvas3D = lazy(() => import('./GalaxyCanvas3D'));

interface SemanticGalaxyDirectorProps {
  proyectos: ProyectoResumenUI[];
  matchingIds?: Set<string> | null;
}

export const SemanticGalaxyDirector: React.FC<SemanticGalaxyDirectorProps> = ({
  proyectos,
  matchingIds = null,
}) => {
  const {
    nivel,
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
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Soporte rueda de mouse para zoom en nivel planeta sin romper drag
  useEffect(() => {
    if (nivel !== 'planeta') return;

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.closest('#planet-hud-card-container, #stage-glass-panel-container, .hud-glass, button')) {
        return;
      }

      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.12 : -0.12;
      setZoomLevel((prev) => Math.max(0.65, Math.min(2.0, prev + delta)));
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [nivel]);

  // Hook para ocultar labels 3D debajo de cualquier panel HUD visible
  useHideLabelsUnderHud(['planet-hud-card-container', 'stage-glass-panel-container'], nivel);

  useEffect(() => {
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mqMotion.matches);
    const motionHandler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mqMotion.addEventListener('change', motionHandler);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      mqMotion.removeEventListener('change', motionHandler);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleHoverStage = (data: StageTooltipData | null) => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    if (!data) {
      tooltipTimeout.current = setTimeout(() => {
        setHoverStageData(null);
      }, 100);
    } else {
      setHoverStageData(data);
    }
  };

  const cameraTargetPos = useMemo<[number, number, number]>(() => {
    if (nivel === 'galaxia' || !selectedProyecto) {
      return [0, 0, 0];
    }
    const sectorCountMap = new Map<string, number>();
    proyectos.forEach((p) => {
      sectorCountMap.set(p.area_solicitante, (sectorCountMap.get(p.area_solicitante) || 0) + 1);
    });

    const sectorIndices = new Map<string, number>();
    let targetP: [number, number, number] = [0, 0, 0];

    for (const p of proyectos) {
      const total = sectorCountMap.get(p.area_solicitante) || 1;
      const idx = sectorIndices.get(p.area_solicitante) || 0;
      sectorIndices.set(p.area_solicitante, idx + 1);

      if (p.id === selectedProyecto.id) {
        targetP = calcularPosicionPlaneta(p.area_solicitante, idx, total);
        break;
      }
    }
    return targetP;
  }, [nivel, selectedProyecto, proyectos]);

  const galaxyBox = useMemo(() => {
    const sectorCountMap = new Map<string, number>();
    proyectos.forEach((p) => {
      sectorCountMap.set(p.area_solicitante, (sectorCountMap.get(p.area_solicitante) || 0) + 1);
    });
    const sectorIndices = new Map<string, number>();
    const proyectosConPosicion = proyectos.map((p) => {
      const total = sectorCountMap.get(p.area_solicitante) || 1;
      const idx = sectorIndices.get(p.area_solicitante) || 0;
      sectorIndices.set(p.area_solicitante, idx + 1);
      return { position: calcularPosicionPlaneta(p.area_solicitante, idx, total) };
    });
    return calcularGalaxiaBox(proyectosConPosicion);
  }, [proyectos]);

  return (
    <div className="w-full h-full relative flex flex-col flex-1 min-h-0 overflow-hidden bg-background select-none">
      {/* 1. Breadcrumb Táctico (Incluido en el flex natural, sin romper 100dvh) */}
      {nivel !== 'galaxia' && selectedProyecto && (
        <div className="h-10 min-h-[40px] px-4 bg-surface/90 border-b border-border flex items-center gap-2 text-xs font-mono text-muted-foreground shrink-0 z-20">
          <button
            onClick={irAGalaxia}
            className="hover:text-foreground text-terracotta transition-colors flex items-center gap-1 font-semibold"
          >
            <span>MISIONES</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-border-strong" />
          <span className="uppercase text-muted-foreground">{selectedProyecto.area_solicitante}</span>
          <ChevronRight className="w-3.5 h-3.5 text-border-strong" />
          <span className="text-foreground font-semibold truncate max-w-[200px]">
            {selectedProyecto.callsign || selectedProyecto.nombre.split('(')[0].trim()}
          </span>

          {nivel === 'etapa' && selectedEtapa && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-border-strong" />
              <span className="text-terracotta font-semibold truncate">
                {selectedEtapa.orden}. {selectedEtapa.nombre}
              </span>
            </>
          )}

          <div className="ml-auto">
            <button
              onClick={volverUnNivel}
              className="px-2.5 py-1 rounded-full bg-card border border-border hover:border-terracotta text-foreground text-[10px] font-mono transition-all flex items-center gap-1 shadow-sm"
              title="Volver (Esc)"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>VOLVER (ESC)</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Capa ambiental sutil */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none z-10" />

      {/* 3. Escena 3D WebGL con Controles 2.5D desacoplados */}
      <div
        style={{ zIndex: Z_LAYERS.CANVAS }}
        className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing min-h-0"
      >
        <Suspense
          fallback={
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-background">
              <div className="w-10 h-10 rounded-full border-2 border-terracotta border-t-transparent animate-spin" />
              <span className="font-mono text-xs text-terracotta uppercase tracking-widest animate-pulse">
                INICIALIZANDO ESCENA...
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
            zoomLevel={zoomLevel}
          />
        </Suspense>
      </div>

      {/* 4. Contenedor Overlay Hermano del Canvas para los HUDs (z-index >= 40) */}
      <div
        style={{ zIndex: Z_LAYERS.HUD }}
        className="absolute inset-0 pointer-events-none"
      >
        {/* HUD compacto de 340px a la izquierda en desktop, bottom sheet en mobile/tablet */}
        {nivel !== 'galaxia' && selectedProyecto && (
          <div className="absolute top-12 left-4 pointer-events-auto animate-in fade-in slide-in-from-left-2">
            <PlanetHUDCard proyecto={selectedProyecto} isMobile={isMobile} />
          </div>
        )}

        {/* Panel Lateral de 390px (Solo en nivel etapa) con EtapaDetalle unificado */}
        {nivel === 'etapa' && selectedEtapa && selectedProyecto && (
          <div className="pointer-events-auto">
            <StageGlassPanel
              etapa={selectedEtapa}
              proyecto={selectedProyecto}
              onClose={() => {
                seleccionarProyecto(selectedProyecto);
              }}
              isMobile={isMobile}
            />
          </div>
        )}
      </div>

      {/* 5. Tooltip en capa DOM proyectado */}
      <StageScreenTooltip data={hoverStageData} />

      {/* REQUERIMIENTO 3: Botones de zoom [+] [-] [⟳ Encuadrar] en nivel planeta
          Movidos a la esquina inferior IZQUIERDA sobre la leyenda (donde en galaxia va el minimapa).
          En planeta no hay minimapa. */}
      {nivel === 'planeta' && (
        <div
          style={{ zIndex: Z_LAYERS.HUD }}
          className="absolute bottom-12 left-4 flex items-center gap-1.5 p-1 rounded-full bg-card/90 border border-border backdrop-blur-md shadow-panel text-xs font-mono select-none"
        >
          <button
            onClick={() => setZoomLevel((prev) => Math.min(2.0, prev + 0.2))}
            className="w-7 h-7 rounded-full bg-surface hover:bg-muted border border-border text-foreground font-bold flex items-center justify-center transition-colors"
            title="Acercar (+)"
            aria-label="Acercar zoom"
          >
            +
          </button>
          <button
            onClick={() => setZoomLevel((prev) => Math.max(0.65, prev - 0.2))}
            className="w-7 h-7 rounded-full bg-surface hover:bg-muted border border-border text-foreground font-bold flex items-center justify-center transition-colors"
            title="Alejar (-)"
            aria-label="Alejar zoom"
          >
            −
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="px-2.5 h-7 rounded-full bg-surface hover:bg-muted border border-border text-foreground flex items-center gap-1 transition-colors"
            title="Restablecer encuadre"
            aria-label="Restablecer encuadre"
          >
            <span>⟳</span>
            <span className="hidden sm:inline text-[11px]">Encuadrar</span>
          </button>
        </div>
      )}

      {/* 6. Minimapa con Box3 real y rectángulo de cámara (Solo en Nivel Galaxia, oculto en <768px) */}
      {!isMobile && (
        <GalaxyMinimap
          galaxyBox={galaxyBox}
          camera={currentCamera}
          onPanTo={(x, z) => {
            setPanOffset([x, z]);
            setTargetFocusPos(null);
          }}
          visible={nivel === 'galaxia'}
        />
      )}

      {/* 7. Barra Leyenda inferior (40px) con texto de fuente auditable a la derecha
          Visible y completa tanto en galaxia como en nivel planeta */}
      <div className="h-10 min-h-[40px] z-30 px-4 bg-surface/95 backdrop-blur-md border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground pointer-events-auto shrink-0 select-none">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[10px] uppercase text-muted-foreground hidden sm:inline">Filtro:</span>
          
          <button
            onClick={() => setHealthFilter(healthFilter === 'rojo' ? null : 'rojo')}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all ${
              healthFilter === 'rojo'
                ? 'bg-health-red-soft border-health-red text-health-red font-semibold'
                : 'border-transparent hover:text-foreground'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-health-red" />
            <span>Crítico</span>
          </button>

          <button
            onClick={() => setHealthFilter(healthFilter === 'amarillo' ? null : 'amarillo')}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all ${
              healthFilter === 'amarillo'
                ? 'bg-health-amber-soft border-health-amber text-health-amber font-semibold'
                : 'border-transparent hover:text-foreground'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-health-amber" />
            <span>Alerta</span>
          </button>

          <button
            onClick={() => setHealthFilter(healthFilter === 'verde' ? null : 'verde')}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all ${
              healthFilter === 'verde'
                ? 'bg-health-green-soft border-health-green text-health-green font-semibold'
                : 'border-transparent hover:text-foreground'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-health-green" />
            <span>Nominal</span>
          </button>

          <button
            onClick={() => setHealthFilter(healthFilter === 'gris' ? null : 'gris')}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all ${
              healthFilter === 'gris'
                ? 'bg-muted border-border-strong text-foreground font-semibold'
                : 'border-transparent hover:text-foreground'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sand" />
            <span>Cerrado</span>
          </button>
        </div>

        {/* Texto fuente auditable Notion a la derecha */}
        <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground text-[10px] truncate">
          <span className="hidden md:inline">Fuente auditable: Notion vía sync</span>
          <span className="hidden md:inline">·</span>
          <span>NIVEL: <strong className="text-terracotta uppercase">{nivel}</strong></span>
          <span>·</span>
          <span className="hidden sm:inline">ESC: VOLVER</span>
        </div>
      </div>
    </div>
  );
};
