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
      <div className="px-3.5 py-2 rounded-2xl bg-card border border-border shadow-panel backdrop-blur-2xl text-center whitespace-nowrap min-w-[210px] text-foreground">
        <div className="text-xs font-bold text-foreground flex items-center gap-2 justify-center">
          <span>{data.orden} · {data.nombre}</span>
          <span
            className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
              data.isBloqueada
                ? 'bg-health-red-soft text-health-red border-health-red/40'
                : data.isCompletada
                ? 'bg-health-green-soft text-health-green border-health-green/40'
                : data.isActual
                ? 'bg-terracotta text-white border-terracotta'
                : 'bg-surface text-muted-foreground border-border'
            }`}
          >
            {data.estado}
          </span>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground mt-1">
          {data.fechaTexto}
        </div>
        {data.isBloqueada && (
          <div className="text-[9px] font-mono text-health-red font-bold mt-0.5">
            BLOQUEO ACTIVO · +5 DÍAS HÁBILES
          </div>
        )}
      </div>
    </div>
  );
};

export const TooltipProjector: React.FC<{ data: StageTooltipData | null }> = ({ data }) => {
  const { camera, size } = useThree();
  const v = useRef(new THREE.Vector3());

  useFrame(() => {
    const el = document.getElementById('mission-stage-screen-tooltip');
    if (!el || !data) return;

    v.current.set(...data.pos3D);
    v.current.project(camera);

    const isBehind = v.current.z > 1;
    if (isBehind) {
      el.style.display = 'none';
      return;
    }

    el.style.display = 'block';
    const x = ((v.current.x + 1) * size.width) / 2;
    const y = ((-v.current.y + 1) * size.height) / 2;

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  });

  return null;
};
