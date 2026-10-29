import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { StageTooltipData } from './StageScreenTooltip';

interface StageScreenData {
  index: number;
  screenX: number;
  screenY: number;
  depthZ: number;
  visible: boolean;
  opacity: number;
  fontSize: number;
}

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
  screenData?: StageScreenData;
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
  screenData,
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

  // Truncado a máx 14 caracteres con "…"
  const truncateNombre = (name: string, maxLen = 14) => {
    if (!name) return '';
    return name.length > maxLen ? `${name.slice(0, maxLen - 1)}…` : name;
  };

  const nombreCorto = truncateNombre(etapa.nombre);
  const statusIcon = isBloqueada ? ' 🔒' : isCompletada ? ' ✓' : isFutura ? ' 🔒' : '';

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

      {/* Geometría distintiva por forma */}
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

      {/* Chip informativo actual y etiqueta fija debajo de cada estación */}
      <Html
        position={[0, -0.65, 0]}
        center
        occlude={false}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: screenData ? (screenData.visible ? screenData.opacity : 0) : 1,
          transition: 'opacity 0.15s ease',
        }}
      >
        <div className="flex flex-col items-center pointer-events-none select-none">
          {isActual ? (
            <div className="h-7 px-3 rounded-full bg-[#030d22]/95 border border-cyan-400 text-cyan-200 text-xs font-display font-bold shadow-[0_0_15px_rgba(0,242,254,0.35)] flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
              <span>{index + 1} · {nombreCorto} · Estás aquí</span>
            </div>
          ) : (
            <div
              style={{ fontSize: `${screenData ? screenData.fontSize : 11}px` }}
              className="px-2 py-0.5 rounded-md bg-[#040817]/85 border border-slate-700/60 text-slate-200 font-mono whitespace-nowrap shadow-md flex items-center gap-1"
            >
              <span>{index + 1} · {nombreCorto}{statusIcon}</span>
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
  const { gl, camera, size } = useThree();

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

  // Datos calculados por frame para visibilidad, opacidad y anti-colisión de labels
  const [screenStages, setScreenStages] = useState<Record<number, StageScreenData>>({});

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

      // Calcular posiciones de pantalla para cada estación orbital
      const isMobileDevice = size.width < 768;
      const rotY = groupRef.current.rotation.y;

      const rawItems: {
        index: number;
        screenX: number;
        screenY: number;
        depthZ: number; // en coordenadas de cámara (más negativo = más al fondo)
        frontDist: number; // distancia al frente en ángulo
      }[] = [];

      for (let i = 0; i < total; i++) {
        const localAngle = (i / total) * Math.PI * 2;
        const effectiveAngle = localAngle + rotY;
        const wx = worldPos[0] + Math.cos(effectiveAngle) * radius;
        const wy = worldPos[1];
        const wz = worldPos[2] + Math.sin(effectiveAngle) * radius;

        const p3 = new THREE.Vector3(wx, wy, wz);
        p3.project(camera);

        const screenX = (p3.x * 0.5 + 0.5) * size.width;
        const screenY = (-(p3.y * 0.5) + 0.5) * size.height;

        // Frontalidad: wz respecto al observador o p3.z
        // En Three.js project, p3.z va de -1 (cerca) a +1 (lejos)
        rawItems.push({
          index: i,
          screenX,
          screenY,
          depthZ: p3.z,
          frontDist: p3.z, // menor = más al frente
        });
      }

      // Ordenar de más al frente a más atrás (menor p3.z = más al frente)
      const sortedByFront = [...rawItems].sort((a, b) => a.depthZ - b.depthZ);
      const minZ = sortedByFront[0]?.depthZ ?? 0;
      const maxZ = sortedByFront[sortedByFront.length - 1]?.depthZ ?? 1;
      const zRange = Math.max(0.001, maxZ - minZ);

      // Determinar permitidos en mobile (solo la actual y las 2 más cercanas al frente)
      let mobileAllowedSet = new Set<number>();
      if (isMobileDevice) {
        mobileAllowedSet.add(etapaActualIdx);
        // Las 2 más al frente
        let count = 0;
        for (const item of sortedByFront) {
          if (!mobileAllowedSet.has(item.index)) {
            mobileAllowedSet.add(item.index);
            count++;
            if (count >= 2) break;
          }
        }
      }

      // Chequeo de colisión en pantalla: procesamos de frente hacia atrás
      const placedLabels: { x: number; y: number }[] = [];
      const newScreenData: Record<number, StageScreenData> = {};
      const minDistancePx = isMobileDevice ? 70 : 85;

      for (const item of sortedByFront) {
        // En mobile verificar filtro
        if (isMobileDevice && !mobileAllowedSet.has(item.index)) {
          newScreenData[item.index] = {
            index: item.index,
            screenX: item.screenX,
            screenY: item.screenY,
            depthZ: item.depthZ,
            visible: false,
            opacity: 0,
            fontSize: 10,
          };
          continue;
        }

        // ¿Choca con un label ya colocado más al frente?
        let collides = false;
        // La estación actual siempre tiene prioridad absoluta
        const isActualStage = item.index === etapaActualIdx;

        if (!isActualStage) {
          for (const placed of placedLabels) {
            const dx = Math.abs(placed.x - item.screenX);
            const dy = Math.abs(placed.y - item.screenY);
            if (dx < minDistancePx && dy < 35) {
              collides = true;
              break;
            }
          }
        }

        if (collides) {
          newScreenData[item.index] = {
            index: item.index,
            screenX: item.screenX,
            screenY: item.screenY,
            depthZ: item.depthZ,
            visible: false,
            opacity: 0,
            fontSize: 10,
          };
        } else {
          placedLabels.push({ x: item.screenX, y: item.screenY });
          // Normalizar posición relativa de frente (0 = al frente, 1 = atrás)
          const relZ = Math.max(0, Math.min(1, (item.depthZ - minZ) / zRange));
          // Frente: 100% opacidad, 12px; Atrás: 40% opacidad, 10px
          const opacity = isActualStage ? 1 : 1 - relZ * 0.6; // 1.0 -> 0.4
          const fontSize = isActualStage ? 12 : Math.round(12 - relZ * 2); // 12 -> 10

          newScreenData[item.index] = {
            index: item.index,
            screenX: item.screenX,
            screenY: item.screenY,
            depthZ: item.depthZ,
            visible: true,
            opacity,
            fontSize,
          };
        }
      }

      setScreenStages(newScreenData);
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
          screenData={screenStages[idx]}
        />
      ))}
    </group>
  );
};
