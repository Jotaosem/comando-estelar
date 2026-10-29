import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SectorSystem } from './galaxyData';
import { Z_LAYERS } from '../../constants/zLayers';

interface SystemStarProps {
  system: SectorSystem;
  onSelect: (systemId: string) => void;
  active: boolean;
  visible?: boolean;
}

export const SystemStar: React.FC<SystemStarProps> = ({
  system,
  onSelect,
  active,
  visible = true,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
    }
    if (glowRef.current) {
      glowRef.current.rotation.z -= delta * 0.2;
    }
  });

  return (
    <group position={system.position}>
      {/* Halo Glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[system.starSize * 1.8, 16, 16]} />
        <meshBasicMaterial
          color={system.color}
          transparent
          opacity={active ? 0.25 : 0.12}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Core Star */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(system.id);
        }}
      >
        <sphereGeometry args={[system.starSize, 32, 32]} />
        <meshStandardMaterial
          color={system.color}
          emissive={system.color}
          emissiveIntensity={active ? 2.5 : 1.6}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Star Light */}
      <pointLight color={system.color} intensity={3.5} distance={25} />

      {/* Etiqueta 3D fija SOLO en nivel 'galaxia' para evitar superposición */}
      {visible && (
        <Html
          position={[0, system.starSize + 1.2, 0]}
          center
          occlude
          zIndexRange={Z_LAYERS.LABELS_3D}
          style={{ pointerEvents: 'none' }}
        >
          <div data-planet-chip="true" className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/85 border border-slate-700/80 backdrop-blur-md shadow-md whitespace-nowrap">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: system.color }}
            />
            <span className="font-display font-bold text-[11px] uppercase tracking-wider text-slate-200">
              {system.name}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
};
