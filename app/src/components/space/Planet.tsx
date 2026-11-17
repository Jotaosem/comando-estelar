import React, { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ProyectoView } from '../../data/proyectoView';
import { EarthPlanetMesh } from './EarthPlanetMesh';
import { useNavigationStore } from './navigationStore';
import { Z_LAYERS } from '../../constants/zLayers';

interface PlanetProps {
  proyecto: ProyectoView;
  position: [number, number, number];
  onSelect: (p: ProyectoView) => void;
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
  const { isSearchDropdownOpen, nivel } = useNavigationStore();

  const isCritico = proyecto.semaforo === 'rojo';
  const isAlerta = proyecto.semaforo === 'amarillo';
  const isCerrado = proyecto.cerrado;
  const isCancelado = proyecto.cancelado;
  const isAtenuado = isCerrado || isCancelado;

  // Etapa actual o última si está cerrado
  const etapaActual =
    proyecto.etapas.find((e: any) => e.nombre === proyecto.etapa_actual_nombre) ||
    (isCerrado ? proyecto.etapas[proyecto.etapas.length - 1] : proyecto.etapas[0]);

  // Colores WWP de marca
  const baseColor = isCritico
    ? '#ee8f88' // dark --health-red
    : isAlerta
    ? '#e3b25f' // dark --health-amber
    : isCancelado
    ? '#8c827a' // gris
    : isCerrado
    ? '#d9d0c0' // --sand
    : '#6fbf98'; // dark --health-green

  // Color de avance según marca WWP: viz-*
  const vizRingColor = '#e08c6c'; // --terracotta-text / viz-average

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

  // Nombre (máx. 24 caracteres con "…", completo en el HUD/tooltip)
  const nombreDisplay =
    proyecto.nombre.length > 24 ? proyecto.nombre.slice(0, 23) + '…' : proyecto.nombre;

  const semaforoBadgeClass =
    proyecto.estado_display === 'Crítico'
      ? 'bg-health-red-soft text-health-red border-health-red/40'
      : proyecto.estado_display === 'Alerta'
      ? 'bg-health-amber-soft text-health-amber border-health-amber/40'
      : proyecto.estado_display === 'Nominal'
      ? 'bg-health-green-soft text-health-green border-health-green/40'
      : proyecto.estado_display === 'Cancelado'
      ? 'bg-surface text-muted-foreground/60 border-border'
      : proyecto.estado_display === 'Cerrado'
      ? 'bg-surface text-muted-foreground/80 border-border'
      : 'bg-surface text-muted-foreground border-border';

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
        scale={isAtenuado ? 0.88 : 1}
      >
        <EarthPlanetMesh
          area={proyecto.area_solicitante}
          projectIndex={projectIndex}
          healthColor={baseColor}
          isCritico={isCritico}
        />
      </group>

      <pointLight color={baseColor} intensity={isAtenuado ? 0.3 : 0.8} distance={10} />

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

      {/* Etiqueta del planeta: nombre (máx. 24 caracteres con "…") y debajo la fase + chip del semáforo */}
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
            }}
            className={`cursor-pointer transition-transform duration-150 hover:scale-105 ${
              isAtenuado ? 'opacity-70 hover:opacity-100' : 'opacity-100'
            }`}
            style={{ pointerEvents: isSearchDropdownOpen ? 'none' : 'auto' }}
          >
            <div className="relative px-3 py-2 rounded-2xl bg-card/95 border border-border-strong backdrop-blur-md shadow-panel min-w-[170px] max-w-[240px]">
              <div className="flex items-center gap-2.5">
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

                {/* Nombre (máx. 24 caracteres con "…") y debajo Fase + Chip Semáforo */}
                <div className="flex-1 min-w-0">
                  <div
                    className="font-sans font-bold text-xs text-foreground truncate tracking-tight"
                    title={proyecto.nombre}
                  >
                    {nombreDisplay}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[90px]">
                      {proyecto.fase_macro}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-semibold border ${semaforoBadgeClass}`}
                    >
                      <span className="w-1 h-1 rounded-full bg-current" />
                      <span>{proyecto.estado_display}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hover Tooltip con fechas completas */}
            {hovered && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-3 py-1.5 rounded-xl bg-card/95 border border-border shadow-panel text-center whitespace-nowrap z-50 font-mono text-[10px] space-y-0.5">
                <div className="text-foreground font-bold">{proyecto.nombre}</div>
                <div className="text-muted-foreground">
                  Est: <span className="text-foreground">{proyecto.fecha_estimada || '—'}</span> · Comp: <span className="text-foreground">{proyecto.fecha_comprometida || '—'}</span>
                </div>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
