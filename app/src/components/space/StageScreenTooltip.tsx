import React, { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface StageTooltipData {
  nombre: string;
  orden: number;
  estado: string;
  fechaTexto: string;
  isBloqueada: boolean;
  isCompletada: boolean;
  isActual: boolean;
  isFutura: boolean;
  pos3D: [number, number, number];
}

interface StageScreenTooltipProps {
  data: StageTooltipData | null;
}

export const StageScreenTooltip: React.FC<StageScreenTooltipProps> = ({ data }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  return (
    <div
      ref={tooltipRef}
      id="mission-stage-screen-tooltip"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: 'translate(-50%, -120%)',
        zIndex: 50,
        pointerEvents: 'none',
      }}
      className="animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-3.5 py-2 rounded-xl bg-[#030919]/95 border border-cyan-400/60 shadow-[0_8px_30px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-center whitespace-nowrap min-w-[210px]">
        <div className="text-xs font-display font-black text-white flex items-center gap-2 justify-center">
          <span>{data.orden} · {data.nombre}</span>
          <span
            className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${
              data.isBloqueada
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                : data.isCompletada
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                : data.isActual
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {data.estado}
          </span>
        </div>
        <div className="text-[10px] font-mono text-cyan-300/90 mt-1">
          {data.fechaTexto}
        </div>
        {data.isBloqueada && (
          <div className="text-[9px] font-mono text-rose-300 mt-0.5">
            ⚠ Requiere atención de destrabe
          </div>
        )}
      </div>
    </div>
  );
};

// Proyector que en cada frame actualiza la posición 2D en pantalla desde el vector 3D
export const TooltipProjector: React.FC<{
  data: StageTooltipData | null;
}> = ({ data }) => {
  const { camera, size } = useThree();

  useFrame(() => {
    if (!data) return;
    const el = document.getElementById('mission-stage-screen-tooltip');
    if (!el) return;

    const vec = new THREE.Vector3(data.pos3D[0], data.pos3D[1], data.pos3D[2]);
    vec.project(camera);

    // Si está detrás de la cámara, ocultar
    if (vec.z > 1) {
      el.style.opacity = '0';
      return;
    }

    // Convertir de [-1, 1] a píxeles
    let x = (vec.x * 0.5 + 0.5) * size.width;
    let y = (-(vec.y * 0.5) + 0.5) * size.height;

    // Reposicionamiento para no salirse de la pantalla
    const padding = 120;
    x = Math.max(padding, Math.min(size.width - padding, x));
    y = Math.max(60, Math.min(size.height - 40, y));

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.opacity = '1';
  });

  return null;
};
