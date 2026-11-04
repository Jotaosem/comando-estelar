import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type NivelNavegacion = 'galaxia' | 'planeta' | 'etapa';

interface CameraDirectorProps {
  nivel: NivelNavegacion;
  targetPosition: [number, number, number];
  reducedMotion?: boolean;
  panOffset?: [number, number];
  onCameraUpdate?: (pos: [number, number, number]) => void;
  zoomLevel?: number;
}

export const CameraDirector: React.FC<CameraDirectorProps> = ({
  nivel,
  targetPosition,
  reducedMotion = false,
  panOffset = [0, 0],
  onCameraUpdate,
  zoomLevel = 1,
}) => {
  const { camera, size } = useThree();
  const targetVec = useRef(new THREE.Vector3(0, 0, 0));
  const cameraTargetPos = useRef(new THREE.Vector3(0, 24, 40));

  // Fit-to-view automático en resize para abarcar todos los sistemas estelares con 10% margen
  useEffect(() => {
    if (nivel === 'galaxia') {
      const aspect = size.width / Math.max(1, size.height);
      const dist = aspect < 1 ? 48 : 38;
      cameraTargetPos.current.set(panOffset[0], dist * 0.65, dist + panOffset[1]);
      targetVec.current.set(panOffset[0], 0, panOffset[1]);
    }
  }, [size, nivel, panOffset]);

  useFrame((_, delta) => {
    if (nivel === 'galaxia') {
      const aspect = size.width / Math.max(1, size.height);
      const dist = aspect < 1 ? 48 : 38;
      cameraTargetPos.current.set(panOffset[0], dist * 0.65, dist + panOffset[1]);
      targetVec.current.set(panOffset[0], 0, panOffset[1]);
    } else if (nivel === 'planeta') {
      const isDesktop = size.width >= 1024;
      const isMobile = size.width < 768;
      const aspect = isDesktop
        ? (size.width - 340) / Math.max(1, size.height)
        : size.width / Math.max(1, isMobile ? size.height * 0.75 : size.height * 0.7);

      const fovRad = ((camera as THREE.PerspectiveCamera).fov || 45) * (Math.PI / 180);
      const radioOrbita = 4.8;
      // Encuadre inicial: planeta + órbita ocupan el 75% del alto del área libre
      // dist = (radioOrbita * 1.15) / tan(fov/2) / 0.75
      let baseDist = ((radioOrbita * 1.15) / Math.tan(fovRad / 2)) / 0.75;
      if (aspect < 1) baseDist /= aspect;

      // Zoom con límites: minDist (planeta llenando 60% alto) y maxDist (baseDist * 1.3)
      const radioPlaneta = 1.42;
      const minDist = ((radioPlaneta * 1.1) / Math.tan(fovRad / 2)) / 0.6;
      const maxDist = baseDist * 1.3;
      const currentDist = THREE.MathUtils.clamp(baseDist / zoomLevel, minDist, maxDist);

      const offsetX = isDesktop ? -((340 / size.width) * (currentDist * Math.tan(fovRad / 2) * aspect)) : 0;
      const offsetY = !isDesktop ? ((isMobile ? 120 : 180) / size.height) * (currentDist * Math.tan(fovRad / 2)) : 0;

      cameraTargetPos.current.set(
        targetPosition[0] - offsetX,
        targetPosition[1] + 2.0 - offsetY,
        targetPosition[2] + currentDist
      );
      targetVec.current.set(targetPosition[0] - offsetX, targetPosition[1] - offsetY, targetPosition[2]);
    } else {
      cameraTargetPos.current.set(
        targetPosition[0],
        targetPosition[1] + 1.2,
        targetPosition[2] + 4.5
      );
      targetVec.current.set(targetPosition[0], targetPosition[1], targetPosition[2]);
    }

    if (reducedMotion) {
      camera.position.copy(cameraTargetPos.current);
      camera.lookAt(targetVec.current);
      if (onCameraUpdate) onCameraUpdate([camera.position.x, camera.position.y, camera.position.z]);
      return;
    }

    const distance = camera.position.distanceTo(cameraTargetPos.current);
    if (distance > 0.02) {
      camera.position.lerp(cameraTargetPos.current, Math.min(1, delta * 3.8));
    } else {
      camera.position.copy(cameraTargetPos.current);
    }

    camera.lookAt(targetVec.current);

    if (onCameraUpdate) {
      onCameraUpdate([camera.position.x, camera.position.y, camera.position.z]);
    }
  });

  return null;
};
