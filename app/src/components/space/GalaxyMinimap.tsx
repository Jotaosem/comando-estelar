import React from 'react';
import * as THREE from 'three';
import type { SectorSystem } from './galaxyData';
import type { ProyectoView } from '../../data/proyectoView';

interface GalaxyMinimapProps {
  galaxyBox: THREE.Box3;
  camera: THREE.Camera | null;
  onPanTo: (x: number, z: number) => void;
  visible: boolean;
  systems?: SectorSystem[];
  proyectosConPosicion?: { proyecto: ProyectoView; position: [number, number, number] }[];
}

export const GalaxyMinimap: React.FC<GalaxyMinimapProps> = ({
  galaxyBox,
  camera,
  onPanTo,
  visible,
  systems = [],
  proyectosConPosicion = [],
}) => {
  if (!visible) return null;

  const mapWidth = 160;
  const mapHeight = 100;

  const minX = galaxyBox.min.x;
  const maxX = galaxyBox.max.x;
  const minZ = galaxyBox.min.z;
  const maxZ = galaxyBox.max.z;

  const spanX = Math.max(1, maxX - minX);
  const spanZ = Math.max(1, maxZ - minZ);

  const toMapCoords = (x: number, z: number) => {
    const mx = ((x - minX) / spanX) * mapWidth;
    const my = ((z - minZ) / spanZ) * mapHeight;
    return {
      x: Math.max(2, Math.min(mapWidth - 2, mx)),
      y: Math.max(2, Math.min(mapHeight - 2, my)),
    };
  };

  const handleMinimapPointer = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const target3DX = minX + (clickX / mapWidth) * spanX;
    const target3DZ = minZ + (clickY / mapHeight) * spanZ;
    onPanTo(target3DX, target3DZ);
  };

  const camPos = camera ? camera.position : new THREE.Vector3(0, 30, 40);
  const camCoords = toMapCoords(camPos.x, camPos.z);

  const getDotColor = (p: ProyectoView) => {
    if (p.cancelado || p.cerrado) return 'var(--muted)';
    if (p.semaforo === 'rojo') return '#ee8f88'; // health-red
    if (p.semaforo === 'amarillo') return '#e2a342'; // health-amber
    if (p.semaforo === 'verde') return '#6fbf98'; // health-green
    return '#8c827a'; // neutral/gris
  };

  return (
    <div
      onClick={handleMinimapPointer}
      onPointerDown={handleMinimapPointer}
      className="hidden md:block absolute bottom-[56px] left-4 w-40 h-[100px] rounded-2xl border border-border bg-card/90 backdrop-blur-xl p-1 shadow-panel cursor-crosshair z-30 pointer-events-auto overflow-hidden animate-in fade-in select-none"
      title="Minimapa Galáctico: haz clic o arrastra para moverte"
    >
      <div className="relative w-full h-full">
        {/* Sistemas Estelares (estrellas del área) */}
        {systems.map((sys) => {
          const pt = toMapCoords(sys.position[0], sys.position[2]);
          return (
            <div
              key={sys.id}
              style={{ left: `${pt.x}px`, top: `${pt.y}px` }}
              className="absolute w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none opacity-40"
            >
              <span
                className="w-full h-full block rounded-full"
                style={{ backgroundColor: sys.color }}
              />
            </div>
          );
        })}

        {/* Puntos de cada Planeta (el radar muestra el mismo número de puntos que planetas) */}
        {proyectosConPosicion.map((item) => {
          const pt = toMapCoords(item.position[0], item.position[2]);
          const dotColor = getDotColor(item.proyecto);
          const isAtenuado = item.proyecto.cerrado || item.proyecto.cancelado;

          return (
            <div
              key={item.proyecto.id}
              style={{ left: `${pt.x}px`, top: `${pt.y}px` }}
              className={`absolute w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none shadow-sm ${
                isAtenuado ? 'opacity-40' : 'opacity-100'
              }`}
            >
              <span
                className="w-full h-full block rounded-full"
                style={{ backgroundColor: dotColor }}
              />
            </div>
          );
        })}

        {/* Rectángulo del frustum / área visible de cámara */}
        <div
          style={{
            left: `${camCoords.x}px`,
            top: `${camCoords.y}px`,
            width: '36px',
            height: '24px',
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 border-2 border-terracotta bg-terracotta/20 rounded pointer-events-none shadow-sm transition-all duration-75"
        />

        <div className="absolute top-1 left-1.5 text-[8px] font-mono text-terracotta font-bold tracking-widest uppercase">
          RADAR 2.5D ({proyectosConPosicion.length})
        </div>
      </div>
    </div>
  );
};
