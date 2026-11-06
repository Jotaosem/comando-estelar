import React, { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ProyectoResumenUI } from '../../lib/proyectosData';
import { EarthPlanetMesh } from './EarthPlanetMesh';
import { useNavigationStore } from './navigationStore';
import { Z_LAYERS } from '../../constants/zLayers';

interface PlanetProps {
  proyecto: ProyectoResumenUI;
  position: [number, number, number];
  onSelect: (p: ProyectoResumenUI) => void;
  showOverlay?: boolean;
  projectIndex?: number;
  ocultarChipPorColision?: boolean;
  onOpenStage?: (etapa: any) => void;
}

export const Planet: React.FC<PlanetProps> = ({
  proyecto,
  position,
  onSelect,
  showOverlay = true,
  projectIndex = 0,
  ocultarChipPorColision = false,
  onOpenStage,
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [showStatusMobile, setShowStatusMobile] = useState(false);
  const { isSearchDropdownOpen, nivel } = useNavigationStore();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const isCritico = proyecto.semaforo === 'rojo';
  const isAlerta = proyecto.semaforo === 'amarillo';
  const isCerrado = proyecto.cerrado;

  // Etapa actual o última si está cerrado
  const etapaActual =
    proyecto.etapas.find((e: any) => e.nombre === proyecto.etapa_actual_nombre) ||
    (isCerrado ? proyecto.etapas[proyecto.etapas.length - 1] : proyecto.etapas[0]);

  // Colores WWP de marca: health-* y sand para cerrado
  const baseColor = isCritico
    ? '#ee8f88' // dark --health-red
    : isAlerta
    ? '#e3b25f' // dark --health-amber
    : isCerrado
    ? '#d9d0c0' // --sand
    : '#6fbf98'; // dark --health-green

  // Color de avance según marca WWP: viz-* (nunca health)
  const vizRingColor = '#e08c6c'; // --terracotta-text / viz-average

  const healthText = isCritico
    ? 'Crítico'
    : isAlerta
    ? 'Alerta'
    : isCerrado
    ? 'Cerrado'
    : 'En curso';

  const planetRadius = 1.42;

  // Si colisiona, se oculta salvo que tenga hover
  const chipVisible = showOverlay && (!ocultarChipPorColision || hovered);

  const handleClickPlaneta = (e: any) => {
    e.stopPropagation();
    if (nivel === 'planeta' && onOpenStage && etapaActual) {
      onOpenStage(etapaActual);
    } else {
      onSelect(proyecto);
    }
  };

  return (
    <group position={position}>
      {/* Contenedor interactivo del planeta */}
      <group
        ref={meshRef}
        onClick={handleClickPlaneta}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          if (nivel === 'planeta') {
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <EarthPlanetMesh
          area={proyecto.area_solicitante}
          projectIndex={projectIndex}
          healthColor={baseColor}
          isCritico={isCritico}
        />
      </group>

      <pointLight color={baseColor} intensity={0.8} distance={10} />

      {/* Tooltip en nivel planeta al hacer hover sobre el planeta */}
      {nivel === 'planeta' && hovered && etapaActual && (
        <Html
          position={[0, planetRadius + 1.2, 0]}
          center
          zIndexRange={Z_LAYERS.LABELS_3D}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div className="px-3 py-1.5 rounded-full bg-card/95 border border-border text-foreground text-xs font-mono font-medium shadow-panel whitespace-nowrap">
            Ver etapa actual: {etapaActual.orden} · {etapaActual.nombre}
          </div>
        </Html>
      )}

      {/* Chip anclado arriba sin descripción (solo anillo %, código y estado). pointer-events: none cuando dropdown está abierto */}
      {chipVisible && (
        <Html
          position={[0, planetRadius + 1.25, 0]}
          center
          zIndexRange={Z_LAYERS.LABELS_3D}
          style={{
            pointerEvents: isSearchDropdownOpen ? 'none' : 'auto',
            userSelect: 'none',
          }}
        >
          <div
            data-planet-chip="true"
            onClick={(e) => {
              if (isSearchDropdownOpen) return;
              e.stopPropagation();
              onSelect(proyecto);
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => {
              setHovered(false);
              setShowStatusMobile(false);
            }}
            className="cursor-pointer transition-transform duration-150 hover:scale-105"
            style={{ pointerEvents: isSearchDropdownOpen ? 'none' : 'auto' }}
          >
            <div className={`relative px-2.5 py-1.5 rounded-full bg-card/90 border border-border-strong backdrop-blur-md shadow-panel ${isMobile && !showStatusMobile ? 'min-w-[110px]' : 'min-w-[155px]'}`}>
              <div className="flex items-center gap-2">
                {/* Anillo de avance con token viz */}
                <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="14"
                      cy="14"
                      r="10.5"
                      stroke="var(--muted)"
                      strokeWidth="2.5"
                      fill="transparent"
                    />
                    <circle
                      cx="14"
                      cy="14"
                      r="10.5"
                      stroke={vizRingColor}
                      strokeWidth="2.5"
                      strokeDasharray={66}
                      strokeDashoffset={66 - (66 * (proyecto.avance_pct || 0)) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <span className="absolute font-mono text-[9px] font-bold text-foreground">
                    {proyecto.avance_pct}%
                  </span>
                </div>

                {/* Código / Nombre corto + Estado (en mobile oculto salvo tap) */}
                <div className="flex-1 min-w-0">
                  <div className="font-sans font-bold text-[11px] text-foreground truncate uppercase tracking-tight">
                    {proyecto.callsign || proyecto.nombre.split('(')[0].trim()}
                  </div>
                  {(!isMobile || showStatusMobile) && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: baseColor }} />
                      <span
                        className="font-mono text-[9px] font-semibold tracking-wide uppercase truncate"
                        style={{ color: baseColor }}
                      >
                        {healthText}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Hover Tooltip con fecha proyectada */}
            {hovered && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2.5 py-1 rounded-full bg-card/95 border border-border shadow-panel text-center whitespace-nowrap z-50">
                <div className="text-[10px] font-mono text-muted-foreground">
                  ESTIMADA: <span className="text-foreground font-bold">{proyecto.fecha_reproyectada || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
