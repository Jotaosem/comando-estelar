import React, { useMemo } from 'react';
import * as THREE from 'three';

export const SpaceBackground: React.FC = () => {
  // Generar constelación de estrellas WWP: brand-white (#f5f5f3) a 30-60% opacidad, sin estrellas de colores
  const [starPositions, starColors] = useMemo(() => {
    const count = 1800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const white = new THREE.Color('#f5f5f3');

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Distribución esférica amplia
      const r = 40 + Math.random() * 80;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);

      // Variación sutil de intensidad entre 0.3 y 0.6
      const intensity = 0.3 + Math.random() * 0.3;
      colors[i3] = white.r * intensity;
      colors[i3 + 1] = white.g * intensity;
      colors[i3 + 2] = white.b * intensity;
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
          size={1.1}
          vertexColors
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>

      {/* Iluminación sobria WWP */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[10, 20, 15]} intensity={1.1} color="#f5f5f3" />
    </group>
  );
};
