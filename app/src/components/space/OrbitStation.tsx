import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { StageTooltipData } from './StageScreenTooltip';

interface OrbitStationProps {
  etapa: any;
  index: number;
  total: number;
  radius: number;
  isActual: boolean;
  onSelect: (etapa: any) => void;
  isSelected: boolean;
  isFrontSnapped: boolean;
  onHoverStage: (data: StageTooltipData | null) => void;
  worldPos: [number, number, number];
}

export const OrbitStation: React.FC<OrbitStationProps> = ({
  etapa,
  index,
  total,
  radius,
  isActual,
  onSelect,
  isSelected,
  onHoverStage,
  worldPos,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringPulseRef = useRef<THREE.Mesh>(null);

  const angle = (index / total) * Math.PI * 2;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  const isCompletada = etapa.estado === 'Completada';
  const isBloqueada = etapa.estado === 'Bloqueada';
  const isReabierta = !!etapa.reabiertaEn;
  const isFutura = etapa.estado === 'Pendiente' && !isActual;

  const stationColor = isBloqueada
    ? '#ff3366'
    : isActual
    ? '#00f2fe'
    : isCompletada
    ? '#10e396'
    : isReabierta
    ? '#f59e0b'
    : '#94a3b8'; // gris claro con borde visible

  const fechaTexto = isCompletada
    ? `Término real: ${etapa.fin_real || etapa.fin_plan}`
    : isFutura
    ? `Etapa futura · inicio est. ${etapa.inicio_plan}`
    : `Fin estimado: ${etapa.fin_plan}`;

  // Coordenada absoluta calculada para el Tooltip Projector
  const currentWorldPos: [number, number, number] = useMemo(
    () => [worldPos[0] + x, worldPos[1], worldPos[2] + z],
    [worldPos, x, z]
  );

  const triggerHover = () => {
    onHoverStage({
      nombre: etapa.nombre,
      orden: index + 1,
      estado: etapa.estado,
      fechaTexto,
      isBloqueada,
      isCompletada,
      isActual,
      isFutura,
      pos3D: currentWorldPos,
    });
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    triggerHover();
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    onHoverStage(null);
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (isFutura) return;
    onSelect(etapa);
  };

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.35;
    }
    if (ringPulseRef.current && (isActual || isBloqueada)) {
      const pulse = Math.sin(state.clock.getElapsedTime() * 3) * 0.15 + 1.15;
      ringPulseRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group position={[x, 0, z]}>
      {/* 1. ESFERA INVISIBLE DE HIT (Radio 2x el visual = 0.85) PARA HOVER 100% CONFIABLE */}
      <mesh
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        visible={false}
      >
        <sphereGeometry args={[0.9, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Halo pulsante */}
      {(isActual || isBloqueada) && (
        <mesh ref={ringPulseRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.75, 32]} />
          <meshBasicMaterial
            color={stationColor}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Geometría distintiva por forma:
          - Completada: hexágono (cilindro 6 caras)
          - Futura: candado gris con borde visible
          - Actual / Reabierta: octaedro / anillo pulsante */}
      <mesh ref={meshRef}>
        {isCompletada ? (
          <cylinderGeometry args={[0.42, 0.42, 0.22, 6]} />
        ) : isFutura ? (
          <boxGeometry args={[0.34, 0.38, 0.34]} />
        ) : (
          <octahedronGeometry args={[isActual || isSelected ? 0.52 : 0.4]} />
        )}

        <meshStandardMaterial
          color={stationColor}
          emissive={stationColor}
          emissiveIntensity={isFutura ? 0.15 : isActual || isSelected ? 2.0 : isCompletada ? 1.2 : 0.6}
          roughness={isFutura ? 0.6 : 0.2}
          metalness={isFutura ? 0.4 : 0.8}
          transparent={isFutura}
          opacity={isFutura ? 0.65 : 1}
        />
      </mesh>

      {/* Chip informativo con pointer-events: none (el hover lo maneja la esfera de hit) */}
      <Html
        position={[0, 0.7, 0]}
        center
        occlude
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div className="flex flex-col items-center">
          {isActual ? (
            <div className="h-7 px-3 rounded-full bg-[#030d22]/95 border border-cyan-400 text-cyan-200 text-xs font-display font-bold shadow-[0_0_15px_rgba(0,242,254,0.35)] flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
              <span>{index + 1} · {etapa.nombre} · Estás aquí</span>
            </div>
          ) : (
            <div
              className={`w-7 h-7 rounded-full backdrop-blur-md border text-xs font-mono font-bold shadow-md flex items-center justify-center ${
                isBloqueada
                  ? 'bg-rose-950/90 border-rose-500 text-rose-200'
                  : isCompletada
                  ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                  : isReabierta
                  ? 'bg-amber-950/90 border-amber-500 text-amber-200'
                  : 'bg-slate-900/90 border-slate-500 text-slate-200'
              }`}
            >
              {isCompletada ? '✓' : isFutura ? '🔒' : isBloqueada ? '!' : `${index + 1}`}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};

export const OrbitStationsRing: React.FC<{
  etapas: any[];
  etapaActualIdx: number;
  onSelectEtapa: (e: any) => void;
  selectedEtapaId: string | null;
  onHoverStage: (data: StageTooltipData | null) => void;
  worldPos: [number, number, number];
  radius?: number;
}> = ({
  etapas,
  etapaActualIdx,
  onSelectEtapa,
  selectedEtapaId,
  onHoverStage,
  worldPos,
  radius = 5.2,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { gl } = useThree();

  const total = etapas.length;
  const stepAngle = (Math.PI * 2) / Math.max(1, total);

  const targetRotation = useRef<number>(-(etapaActualIdx * stepAngle) + Math.PI / 2);
  const currentRotation = useRef<number>(targetRotation.current);

  const isPointerDown = useRef(false);
  const isDragging = useRef(false);
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const previousX = useRef(0);
  const velocity = useRef(0);
  const [frontIndex, setFrontIndex] = useState<number>(etapaActualIdx);

  useEffect(() => {
    targetRotation.current = -(etapaActualIdx * stepAngle) + Math.PI / 2;
    setFrontIndex(etapaActualIdx);
  }, [etapaActualIdx, stepAngle]);

  // Soporte de flechas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        targetRotation.current -= stepAngle;
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        targetRotation.current += stepAngle;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stepAngle]);

  // Distinguir hover de drag (>5px oculta tooltip y toma control de órbita)
  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      isPointerDown.current = true;
      isDragging.current = false;
      startPos.current = { x: e.clientX, y: e.clientY };
      previousX.current = e.clientX;
      velocity.current = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDown.current) return;
      const dx = Math.abs(e.clientX - startPos.current.x);
      const dy = Math.abs(e.clientY - startPos.current.y);

      // Si se mueve más de 5px, es DRAG: ocultar tooltip
      if (!isDragging.current && (dx > 5 || dy > 5)) {
        isDragging.current = true;
        onHoverStage(null);
      }

      if (isDragging.current) {
        const deltaX = e.clientX - previousX.current;
        previousX.current = e.clientX;
        const rotDelta = (deltaX / window.innerWidth) * Math.PI * 2.2;
        currentRotation.current += rotDelta;
        targetRotation.current += rotDelta;
        velocity.current = rotDelta;
      }
    };

    const onPointerUp = () => {
      isPointerDown.current = false;
      if (isDragging.current) {
        isDragging.current = false;
        targetRotation.current += velocity.current * 4;
        const offset = (targetRotation.current - Math.PI / 2) / -stepAngle;
        const snappedIdx = ((Math.round(offset) % total) + total) % total;
        targetRotation.current = -(snappedIdx * stepAngle) + Math.PI / 2;
        setFrontIndex(snappedIdx);
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [gl.domElement, onHoverStage, stepAngle, total]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      if (!isDragging.current) {
        currentRotation.current = THREE.MathUtils.lerp(
          currentRotation.current,
          targetRotation.current,
          Math.min(1, delta * 6)
        );
      }
      groupRef.current.rotation.y = currentRotation.current;
    }
  });

  const curvePoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const maxIdx = Math.max(0, etapaActualIdx);
    const steps = Math.max(10, maxIdx * 12);
    for (let i = 0; i <= steps; i++) {
      const theta = ((i / steps) * (maxIdx / total)) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
    }
    return points;
  }, [etapaActualIdx, radius, total]);

  const fullOrbitPoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const steps = 64;
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
    }
    return points;
  }, [radius]);

  const fullGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(fullOrbitPoints), [fullOrbitPoints]);
  const activeGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(curvePoints), [curvePoints]);

  return (
    <group ref={groupRef}>
      <primitive object={new THREE.Line(fullGeometry, new THREE.LineBasicMaterial({ color: '#334155', transparent: true, opacity: 0.3 }))} />
      {curvePoints.length > 1 && (
        <primitive object={new THREE.Line(activeGeometry, new THREE.LineBasicMaterial({ color: '#00f2fe', linewidth: 3, transparent: true, opacity: 0.9 }))} />
      )}
      {etapas.map((etapa, idx) => (
        <OrbitStation
          key={etapa.id || idx}
          etapa={etapa}
          index={idx}
          total={total}
          radius={radius}
          isActual={idx === etapaActualIdx}
          onSelect={onSelectEtapa}
          isSelected={selectedEtapaId === etapa.id}
          isFrontSnapped={idx === frontIndex}
          onHoverStage={onHoverStage}
          worldPos={worldPos}
        />
      ))}
    </group>
  );
};
