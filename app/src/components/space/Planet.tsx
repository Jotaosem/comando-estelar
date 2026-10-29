import React, { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ProyectoResumenUI } from '../../lib/proyectosData';
import { AlertTriangle, Flame, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { EarthPlanetMesh } from './EarthPlanetMesh';

interface PlanetProps {
  proyecto: ProyectoResumenUI;
  position: [number, number, number];
  onSelect: (p: ProyectoResumenUI) => void;
  showOverlay?: boolean;
  projectIndex?: number;
  ocultarChipPorColision?: boolean;
}

export const Planet: React.FC<PlanetProps> = ({
  proyecto,
  position,
  onSelect,
  showOverlay = true,
  projectIndex = 0,
  ocultarChipPorColision = false,
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const isCritico = proyecto.semaforo === 'rojo';
  const isAlerta = proyecto.semaforo === 'amarillo';
  const isCerrado = proyecto.cerrado;

  const baseColor = isCritico
    ? '#ff3366'
    : isAlerta
    ? '#f59e0b'
    : isCerrado
    ? '#eab308'
    : '#00f2fe';

  const healthText = isCritico
    ? 'Crítico'
    : isAlerta
    ? 'Alerta'
    : isCerrado
    ? 'Cerrado'
    : 'En curso';

  const HealthIcon = isCritico
    ? Flame
    : isAlerta
    ? AlertTriangle
    : isCerrado
    ? CheckCircle2
    : ShieldCheck;

  const planetRadius = 1.42;

  // Si colisiona, se oculta salvo que tenga hover
  const chipVisible = showOverlay && (!ocultarChipPorColision || hovered);

  return (
    <group position={position}>
      {/* Contenedor interactivo del planeta */}
      <group
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(proyecto);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <EarthPlanetMesh
          area={proyecto.area_solicitante}
          projectIndex={projectIndex}
          healthColor={baseColor}
          isCritico={isCritico}
        />
      </group>

      <pointLight color={baseColor} intensity={1.2} distance={10} />

      {/* REQUERIMIENTO 4: Chip anclado arriba con tamaño fijo en px y pointer-events: none (salvo hover). Click equivale a click en planeta */}
      {chipVisible && (
        <Html
          position={[0, planetRadius + 1.25, 0]}
          center
          style={{
            pointerEvents: hovered ? 'auto' : 'none',
            userSelect: 'none',
          }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect(proyecto);
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="cursor-pointer transition-transform duration-150 hover:scale-105"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="relative px-3 py-1.5 rounded-xl hud-glass border border-cyan-500/40 backdrop-blur-md shadow-xl min-w-[190px] max-w-[240px]">
              <div className="flex items-center gap-2">
                {/* Anillo de avance */}
                <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="14"
                      cy="14"
                      r="10.5"
                      className="text-slate-800"
                      strokeWidth="2.5"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="14"
                      cy="14"
                      r="10.5"
                      stroke={baseColor}
                      strokeWidth="2.5"
                      strokeDasharray={66}
                      strokeDashoffset={66 - (66 * (proyecto.avance_pct || 0)) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <span className="absolute font-mono text-[9px] font-bold text-white">
                    {proyecto.avance_pct}%
                  </span>
                </div>

                {/* Nombre corto + Estado */}
                <div className="flex-1 min-w-0">
                  <div className="font-display font-black text-[11px] text-white truncate uppercase tracking-wide">
                    {proyecto.callsign || proyecto.nombre.split('(')[0].trim()}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <HealthIcon className="w-2.5 h-2.5 shrink-0" style={{ color: baseColor }} />
                    <span
                      className="font-mono text-[9px] font-bold tracking-wider uppercase truncate"
                      style={{ color: baseColor }}
                    >
                      {healthText}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1 línea extra de descripción (12px, gris claro) */}
              <div className="mt-1 pt-1 border-t border-cyan-500/15 text-[12px] leading-tight text-slate-300 truncate">
                {proyecto.descripcion ? (
                  <span>{proyecto.descripcion}</span>
                ) : (
                  <span className="italic text-slate-500">Sin descripción</span>
                )}
              </div>
            </div>

            {/* Hover Tooltip con fecha proyectada */}
            {hovered && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded bg-[#060a18]/95 border border-cyan-400/50 shadow-lg text-center whitespace-nowrap z-50">
                <div className="text-[9px] font-mono text-cyan-400">
                  ESTIMADA: <span className="text-white font-bold">{proyecto.fecha_reproyectada || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
