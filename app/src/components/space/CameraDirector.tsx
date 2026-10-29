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
}

export const CameraDirector: React.FC<CameraDirectorProps> = ({
  nivel,
  targetPosition,
  reducedMotion = false,
  panOffset = [0, 0],
  onCameraUpdate,
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
      cameraTargetPos.current.set(
        targetPosition[0],
        targetPosition[1] + 3.0,
        targetPosition[2] + 9.8
      );
      targetVec.current.set(targetPosition[0], targetPosition[1], targetPosition[2]);
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
