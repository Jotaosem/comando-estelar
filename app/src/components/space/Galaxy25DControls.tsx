import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import * as THREE from 'three';
import type { MapControls as MapControlsImpl } from 'three-stdlib';

interface Galaxy25DControlsProps {
  enabled: boolean;
  galaxyBox: THREE.Box3;
  panOffset: [number, number];
  onCameraChange?: (cam: THREE.Camera) => void;
  targetFocusPos?: [number, number, number] | null;
  centrarTrigger?: number;
}

export const Galaxy25DControls: React.FC<Galaxy25DControlsProps> = ({
  enabled,
  galaxyBox,
  panOffset,
  onCameraChange,
  targetFocusPos,
  centrarTrigger = 0,
}) => {
  const { camera, size } = useThree();
  const controlsRef = useRef<MapControlsImpl>(null);

  const encuadrarGalaxia = React.useCallback(() => {
    if (!enabled) return;

    const center = new THREE.Vector3();
    const boxSize = new THREE.Vector3();
    galaxyBox.getCenter(center);
    galaxyBox.getSize(boxSize);

    const maxDim = Math.max(boxSize.x, boxSize.z);
    const aspect = size.width / Math.max(1, size.height);
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    let cameraZ = (maxDim / 2 / Math.tan(fov / 2)) * 1.15;
    if (aspect < 1) cameraZ /= aspect; // Adaptación vertical móvil

    camera.position.set(center.x + panOffset[0], cameraZ * 0.8, center.z + cameraZ * 0.7 + panOffset[1]);
    camera.lookAt(center.x + panOffset[0], 0, center.z + panOffset[1]);

    if (controlsRef.current) {
      controlsRef.current.target.set(center.x + panOffset[0], 0, center.z + panOffset[1]);
      controlsRef.current.update();
    }
  }, [enabled, galaxyBox, size.width, size.height, camera, panOffset]);

  // Centrar y encuadrar fit-to-view al inicio y en resize con debounce 150ms
  useEffect(() => {
    let timeout: any = null;
    const debouncedEncuadrar = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        encuadrarGalaxia();
      }, 150);
    };

    encuadrarGalaxia();

    window.addEventListener('resize', debouncedEncuadrar);
    window.addEventListener('orientationchange', debouncedEncuadrar);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', debouncedEncuadrar);
      window.removeEventListener('orientationchange', debouncedEncuadrar);
    };
  }, [encuadrarGalaxia]);

  // Ejecutar fitToBox cuando el usuario presiona "Centrar" desde cualquier parte
  useEffect(() => {
    if (centrarTrigger > 0) {
      encuadrarGalaxia();
    }
  }, [centrarTrigger, encuadrarGalaxia]);

  // Si hay un targetFocusPos (por búsqueda), volar cinematográficamente hacia él
  useEffect(() => {
    if (targetFocusPos && controlsRef.current) {
      controlsRef.current.target.set(targetFocusPos[0], 0, targetFocusPos[2]);
      camera.position.set(targetFocusPos[0], 18, targetFocusPos[2] + 20);
      controlsRef.current.update();
    }
  }, [targetFocusPos, camera]);

  useFrame(() => {
    if (!enabled || !controlsRef.current) return;

    // Limitar pan estrictamente al Bounding Box
    const target = controlsRef.current.target;
    target.x = THREE.MathUtils.clamp(target.x, galaxyBox.min.x, galaxyBox.max.x);
    target.z = THREE.MathUtils.clamp(target.z, galaxyBox.min.z, galaxyBox.max.z);

    if (onCameraChange) {
      onCameraChange(camera);
    }
  });

  if (!enabled) return null;

  return (
    <MapControls
      ref={controlsRef}
      enableRotate={false} /* 2.5D: rotación desactivada */
      enablePan={true} /* Pan con click izquierdo o 1 dedo */
      enableZoom={true} /* Zoom con rueda o pinch hacia el cursor */
      panSpeed={1.2}
      zoomSpeed={1.1}
      dampingFactor={0.08}
      minDistance={14} /* Ver 1 sistema */
      maxDistance={75} /* Ver todo */
      maxPolarAngle={Math.PI / 3}
    />
  );
};
