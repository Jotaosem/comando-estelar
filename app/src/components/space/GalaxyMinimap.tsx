import React from 'react';
import * as THREE from 'three';
import { SECTOR_SYSTEMS } from './galaxyData';

interface GalaxyMinimapProps {
  galaxyBox: THREE.Box3;
  camera: THREE.Camera | null;
  onPanTo: (x: number, z: number) => void;
  visible: boolean;
}

export const GalaxyMinimap: React.FC<GalaxyMinimapProps> = ({
  galaxyBox,
  camera,
  onPanTo,
  visible,
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

  // Frustum de la cámara
  const camPos = camera ? camera.position : new THREE.Vector3(0, 30, 40);
  const camCoords = toMapCoords(camPos.x, camPos.z);

  return (
    <div
      onClick={handleMinimapPointer}
      onPointerDown={handleMinimapPointer}
      className="absolute bottom-11 right-4 w-40 h-[100px] rounded-xl hud-glass border border-cyan-500/30 bg-[#020510]/95 backdrop-blur-xl p-1 shadow-2xl cursor-crosshair z-30 pointer-events-auto overflow-hidden animate-in fade-in select-none"
      title="Minimapa Galáctico: haz clic o arrastra para moverte"
    >
      <div className="relative w-full h-full">
        {/* Sistemas Estelares (estrellas del área) */}
        {SECTOR_SYSTEMS.map((sys) => {
          const pt = toMapCoords(sys.position[0], sys.position[2]);
          return (
            <div
              key={sys.id}
              style={{ left: `${pt.x}px`, top: `${pt.y}px` }}
              className="absolute w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            >
              <span
                className="w-full h-full block rounded-full shadow-[0_0_6px_currentColor]"
                style={{ backgroundColor: sys.color, color: sys.color }}
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
          className="absolute -translate-x-1/2 -translate-y-1/2 border border-cyan-400 bg-cyan-500/15 rounded pointer-events-none shadow-[0_0_8px_rgba(0,242,254,0.4)] transition-all duration-75"
        />

        <div className="absolute top-1 left-1.5 text-[8px] font-mono text-cyan-400 font-bold tracking-widest uppercase">
          RADAR 2.5D
        </div>
      </div>
    </div>
  );
};
