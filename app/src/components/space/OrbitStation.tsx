import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { StageTooltipData } from './StageScreenTooltip';
import { Z_LAYERS } from '../../constants/zLayers';
import { isEditableElement } from '../../lib/keyboardUtils';

interface StageScreenData {
  index: number;
  screenX: number;
  screenY: number;
  depthZ: number;
  visible: boolean;
  opacity: number;
  fontSize: number;
  offsetX: number;
  offsetY: number;
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
    ? '#ee8f88' // dark --health-red
    : isActual
    ? '#e08c6c' // --terracotta-text
    : isCompletada
    ? '#6fbf98' // dark --health-green
    : isReabierta
    ? '#e3b25f' // dark --health-amber
    : '#afa39c'; // --taupe (Pendiente con borde visible)

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
        zIndexRange={Z_LAYERS.LABELS_3D}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: screenData ? (screenData.visible ? screenData.opacity : 0) : 1,
          transform: screenData
            ? `translate(calc(-50% + ${screenData.offsetX}px), calc(-50% + ${screenData.offsetY}px))`
            : 'translate(-50%, -50%)',
          transition: 'opacity 0.15s ease',
        }}
      >
        <div data-orbit-label="true" className="flex flex-col items-center pointer-events-none select-none">
          {isActual ? (
            <div className="h-7 px-3 rounded-full bg-card/95 border border-terracotta text-foreground text-xs font-sans font-bold shadow-panel flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-terracotta animate-ping shrink-0" />
              <span>{index + 1} · {nombreCorto} · Estás aquí</span>
            </div>
          ) : (
            <div
              style={{ fontSize: `${screenData ? screenData.fontSize : 11}px` }}
              className="px-2.5 py-1 rounded-full bg-card/85 border border-border text-foreground font-mono whitespace-nowrap shadow-panel flex items-center gap-1"
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
  planetRadius?: number;
  nivel?: string;
}> = ({
  etapas,
  etapaActualIdx,
  onSelectEtapa,
  selectedEtapaId,
  onHoverStage,
  worldPos,
  radius = 4.8,
  planetRadius = 1.42,
  nivel,
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
      if (isEditableElement(e.target)) return;
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
      const tiltX = (22 * Math.PI) / 180; // Inclinación de 22 grados

      // Proyectar el centro del planeta en pantalla
      const planetCenter3D = new THREE.Vector3(...worldPos);
      const planetCenterScreen = planetCenter3D.clone().project(camera);
      const planetCenterPx = {
        x: (planetCenterScreen.x * 0.5 + 0.5) * size.width,
        y: (-(planetCenterScreen.y * 0.5) + 0.5) * size.height,
      };

      // Radio del planeta en pantalla aproximado
      const planetEdge3D = new THREE.Vector3(worldPos[0] + planetRadius, worldPos[1], worldPos[2]);
      const planetEdgeScreen = planetEdge3D.project(camera);
      const planetEdgePx = {
        x: (planetEdgeScreen.x * 0.5 + 0.5) * size.width,
        y: (-(planetEdgeScreen.y * 0.5) + 0.5) * size.height,
      };
      const planetRadiusPx = Math.hypot(planetEdgePx.x - planetCenterPx.x, planetEdgePx.y - planetCenterPx.y);

      const rawItems: {
        index: number;
        screenX: number;
        screenY: number;
        depthZ: number;
        distanceToCamera: number;
        planetDistanceToCamera: number;
        offsetX: number;
        offsetY: number;
        distToPlanetCenterPx: number;
      }[] = [];

      const planetCamDist = camera.position.distanceTo(planetCenter3D);

      for (let i = 0; i < total; i++) {
        const localAngle = (i / total) * Math.PI * 2;
        const effectiveAngle = localAngle + rotY;

        // Posición con rotación orbital e inclinación elíptica de 22°
        const lx = Math.cos(effectiveAngle) * radius;
        const lz = Math.sin(effectiveAngle) * radius;
        const ly = -lz * Math.sin(tiltX);
        const lzTilted = lz * Math.cos(tiltX);

        const wx = worldPos[0] + lx;
        const wy = worldPos[1] + ly;
        const wz = worldPos[2] + lzTilted;

        const p3 = new THREE.Vector3(wx, wy, wz);
        const distToCam = camera.position.distanceTo(p3);
        p3.project(camera);

        const screenX = (p3.x * 0.5 + 0.5) * size.width;
        const screenY = (-(p3.y * 0.5) + 0.5) * size.height;

        // Dirección (posEstación - centroPlaneta) normalizada en pantalla
        const dxPx = screenX - planetCenterPx.x;
        const dyPx = screenY - planetCenterPx.y;
        const distPx = Math.hypot(dxPx, dyPx) || 1;
        const normX = dxPx / distPx;
        const normY = dyPx / distPx;

        // Offset en pantalla de 18px hacia afuera del planeta
        const offsetDist = 18;
        const offsetX = normX * offsetDist;
        const offsetY = normY * offsetDist;

        rawItems.push({
          index: i,
          screenX,
          screenY,
          depthZ: p3.z,
          distanceToCamera: distToCam,
          planetDistanceToCamera: planetCamDist,
          offsetX,
          offsetY,
          distToPlanetCenterPx: distPx,
        });
      }

      // Ordenar de más al frente a más atrás (menor depthZ = más al frente)
      const sortedByFront = [...rawItems].sort((a, b) => a.depthZ - b.depthZ);
      const minZ = sortedByFront[0]?.depthZ ?? 0;
      const maxZ = sortedByFront[sortedByFront.length - 1]?.depthZ ?? 1;
      const zRange = Math.max(0.001, maxZ - minZ);

      // Determinar permitidos en mobile
      let mobileAllowedSet = new Set<number>();
      if (isMobileDevice) {
        mobileAllowedSet.add(etapaActualIdx);
        let count = 0;
        for (const item of sortedByFront) {
          if (!mobileAllowedSet.has(item.index)) {
            mobileAllowedSet.add(item.index);
            count++;
            if (count >= 2) break;
          }
        }
      }

      const placedLabels: { x: number; y: number }[] = [];
      const newScreenData: Record<number, StageScreenData> = {};
      const minDistancePx = isMobileDevice ? 70 : 85;

      for (const item of sortedByFront) {
        const isActualStage = item.index === etapaActualIdx;

        if (nivel === 'etapa') {
          const isSelectedStage = selectedEtapaId
            ? etapas[item.index]?.id === selectedEtapaId
            : item.index === etapaActualIdx;

          if (!isSelectedStage) {
            newScreenData[item.index] = {
              index: item.index,
              screenX: item.screenX,
              screenY: item.screenY,
              depthZ: item.depthZ,
              visible: false,
              opacity: 0,
              fontSize: 10,
              offsetX: item.offsetX,
              offsetY: item.offsetY,
            };
            continue;
          }
        }

        if (isMobileDevice && !mobileAllowedSet.has(item.index)) {
          newScreenData[item.index] = {
            index: item.index,
            screenX: item.screenX,
            screenY: item.screenY,
            depthZ: item.depthZ,
            visible: false,
            opacity: 0,
            fontSize: 10,
            offsetX: item.offsetX,
            offsetY: item.offsetY,
          };
          continue;
        }

        // Ocultar si cae en el HUD
        let fallsInsideHUD = false;
        const hudEl = document.getElementById('planet-hud-card-container');
        if (hudEl) {
          const rect = hudEl.getBoundingClientRect();
          if (
            item.screenX >= rect.left - 10 &&
            item.screenX <= rect.right + 10 &&
            item.screenY >= rect.top - 10 &&
            item.screenY <= rect.bottom + 10
          ) {
            fallsInsideHUD = true;
          }
        }

        if (fallsInsideHUD) {
          newScreenData[item.index] = {
            index: item.index,
            screenX: item.screenX,
            screenY: item.screenY,
            depthZ: item.depthZ,
            visible: false,
            opacity: 0,
            fontSize: 10,
            offsetX: item.offsetX,
            offsetY: item.offsetY,
          };
          continue;
        }

        // REQUERIMIENTO 3: LABELS QUE NO TAPAN EL PLANETA
        // Si está detrás del planeta (distancia a la cámara > distancia del centro del planeta)
        const isBehindPlanet = item.distanceToCamera > item.planetDistanceToCamera + 0.1;
        const isOverlappingPlanetDisk = item.distToPlanetCenterPx <= planetRadiusPx + 12;

        if (isBehindPlanet && isOverlappingPlanetDisk && !isActualStage) {
          // Cae dentro del círculo del planeta en pantalla + 12px -> label oculto
          newScreenData[item.index] = {
            index: item.index,
            screenX: item.screenX,
            screenY: item.screenY,
            depthZ: item.depthZ,
            visible: false,
            opacity: 0,
            fontSize: 10,
            offsetX: item.offsetX,
            offsetY: item.offsetY,
          };
          continue;
        }

        // Prioridad de colisión: actual > bloqueada > reabierta > resto
        let collides = false;
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
            offsetX: item.offsetX,
            offsetY: item.offsetY,
          };
        } else {
          placedLabels.push({ x: item.screenX, y: item.screenY });
          const relZ = Math.max(0, Math.min(1, (item.depthZ - minZ) / zRange));
          let opacity = isActualStage ? 1 : 1 - relZ * 0.6;
          // Si está detrás del planeta pero fuera del círculo -> label al 40% de opacidad
          if (isBehindPlanet && !isActualStage) {
            opacity = 0.4;
          }
          const fontSize = isActualStage ? 12 : Math.round(12 - relZ * 2);

          newScreenData[item.index] = {
            index: item.index,
            screenX: item.screenX,
            screenY: item.screenY,
            depthZ: item.depthZ,
            visible: true,
            opacity,
            fontSize,
            offsetX: item.offsetX,
            offsetY: item.offsetY,
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
    <group ref={groupRef} rotation={[ (22 * Math.PI) / 180, 0, 0 ]}>
      <primitive object={new THREE.Line(fullGeometry, new THREE.LineBasicMaterial({ color: '#b7b0a9', transparent: true, opacity: 0.35 }))} />
      {curvePoints.length > 1 && (
        <primitive object={new THREE.Line(activeGeometry, new THREE.LineBasicMaterial({ color: '#e08c6c', linewidth: 3, transparent: true, opacity: 0.85 }))} />
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
