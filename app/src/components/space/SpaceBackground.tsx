import React, { useMemo } from 'react';
import * as THREE from 'three';

export const SpaceBackground: React.FC = () => {
  // Generar constelación de estrellas para el fondo 3D con parallax
  const [starPositions, starColors] = useMemo(() => {
    const count = 1800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const baseTones = [
      new THREE.Color('#00f2fe'),
      new THREE.Color('#a855f7'),
      new THREE.Color('#ffffff'),
      new THREE.Color('#38bdf8'),
      new THREE.Color('#f59e0b'),
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Distribución esférica amplia
      const r = 40 + Math.random() * 80;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);

      const color = baseTones[Math.floor(Math.random() * baseTones.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    return [positions, colors];
  }, []);

  return (
    <group>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[starPositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[starColors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={1.2}
          vertexColors
          transparent
          opacity={0.8}
          sizeAttenuation
        />
      </points>

      {/* Nebulosas tenues ambientales */}
      <ambientLight intensity={0.25} />
      <directionalLight position={[10, 20, 15]} intensity={1.2} />
    </group>
  );
};
