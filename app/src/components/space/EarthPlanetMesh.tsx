import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface EarthPlanetMeshProps {
  area: string;
  projectIndex?: number;
  healthColor: string;
  isCritico?: boolean;
}

// Rotación en Y para centrar el continente correspondiente por área:
// Operaciones = América (~ -1.6 rad)
// Compliance = Europa (~ 0.2 rad)
// Seguridad = Asia (~ 1.8 rad)
// Comercial = África (~ 0.6 rad)
// BI = Oceanía (~ 2.6 rad)
const CONTINENT_ROTATION_Y: Record<string, number> = {
  Operaciones: -1.6,
  Compliance: 0.2,
  Seguridad: 1.8,
  Comercial: 0.6,
  'BI & Analítica': 2.6,
};

export const EarthPlanetMesh: React.FC<EarthPlanetMeshProps> = ({
  area,
  projectIndex = 0,
  healthColor,
  isCritico = false,
}) => {
  const planetRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);

  // Desfase de ±15° (0.26 rad) para proyectos de la misma área
  const baseRotationY = (CONTINENT_ROTATION_Y[area] ?? 0) + (projectIndex % 2 === 0 ? 0.2 : -0.2);

  // Generador procedural de texturas de alta resolución (Canvas 1024x512)
  // Crea continentes, relieve, océanos profundos y luces de ciudades nocturnas
  const [dayTexture, nightTexture, cloudsTexture] = useMemo(() => {
    // 1. Textura diurna
    const canvasDay = document.createElement('canvas');
    canvasDay.width = 1024;
    canvasDay.height = 512;
    const ctxDay = canvasDay.getContext('2d')!;

    // Océano azul profundo
    ctxDay.fillStyle = '#061a38';
    ctxDay.fillRect(0, 0, 1024, 512);

    // Gradientes oceánicos / plataforma continental
    const oceanGrad = ctxDay.createRadialGradient(512, 256, 50, 512, 256, 500);
    oceanGrad.addColorStop(0, '#092d62');
    oceanGrad.addColorStop(1, '#041026');
    ctxDay.fillStyle = oceanGrad;
    ctxDay.fillRect(0, 0, 1024, 512);

    // Continentes simplificados estilizados mediante formas orgánicas de ruido
    ctxDay.fillStyle = '#1c492c'; // Verde tierra / vegetación

    // Función auxiliar para dibujar masas de tierra
    const drawLandmass = (cx: number, cy: number, rx: number, ry: number, roughness: number) => {
      ctxDay.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.15) {
        const noise = 1 + Math.sin(a * 4 + cx) * 0.25 * roughness + Math.cos(a * 7) * 0.15;
        const x = cx + Math.cos(a) * rx * noise;
        const y = cy + Math.sin(a) * ry * noise;
        if (a === 0) ctxDay.moveTo(x, y);
        else ctxDay.lineTo(x, y);
      }
      ctxDay.closePath();
      ctxDay.fill();
    };

    // América (Norte y Sur) ~ x: 260
    ctxDay.fillStyle = '#265934';
    drawLandmass(240, 160, 110, 80, 1.2); // Norteamérica
    ctxDay.fillStyle = '#1e4828';
    drawLandmass(310, 340, 75, 120, 1.1); // Sudamérica

    // Europa y África ~ x: 520
    ctxDay.fillStyle = '#2e6b3b';
    drawLandmass(520, 150, 80, 60, 1.4); // Europa
    ctxDay.fillStyle = '#655734'; // Desierto del Sahara
    drawLandmass(525, 270, 95, 110, 1.2); // África

    // Asia ~ x: 740
    ctxDay.fillStyle = '#295b35';
    drawLandmass(730, 170, 150, 95, 1.3); // Eurasia

    // Oceanía ~ x: 860
    ctxDay.fillStyle = '#83653b';
    drawLandmass(860, 360, 65, 45, 1.1); // Australia

    // Cordilleras / relieve suave
    ctxDay.strokeStyle = '#4e4130';
    ctxDay.lineWidth = 4;
    ctxDay.beginPath();
    ctxDay.moveTo(170, 120);
    ctxDay.lineTo(210, 220);
    ctxDay.stroke();

    // 2. Textura nocturna (luces de ciudades doradas/blancas)
    const canvasNight = document.createElement('canvas');
    canvasNight.width = 512;
    canvasNight.height = 256;
    const ctxNight = canvasNight.getContext('2d')!;
    ctxNight.fillStyle = '#01040a';
    ctxNight.fillRect(0, 0, 512, 256);

    ctxNight.fillStyle = '#ffdf88';
    for (let i = 0; i < 400; i++) {
      const lx = 60 + Math.random() * 400;
      const ly = 50 + Math.random() * 160;
      const sz = Math.random() < 0.2 ? 2 : 1;
      ctxNight.beginPath();
      ctxNight.arc(lx, ly, sz, 0, Math.PI * 2);
      ctxNight.fill();
    }

    // 3. Capa de nubes dinámicas
    const canvasClouds = document.createElement('canvas');
    canvasClouds.width = 1024;
    canvasClouds.height = 512;
    const ctxClouds = canvasClouds.getContext('2d')!;
    ctxClouds.clearRect(0, 0, 1024, 512);

    ctxClouds.fillStyle = isCritico ? 'rgba(210, 190, 200, 0.65)' : 'rgba(255, 255, 255, 0.55)';
    for (let i = 0; i < 75; i++) {
      const cx = Math.random() * 1024;
      const cy = 70 + Math.random() * 370;
      const cr = 25 + Math.random() * 55;
      ctxClouds.beginPath();
      ctxClouds.ellipse(cx, cy, cr * 1.8, cr * 0.7, (Math.random() - 0.5) * 0.5, 0, Math.PI * 2);
      ctxClouds.fill();
    }

    const tDay = new THREE.CanvasTexture(canvasDay);
    const tNight = new THREE.CanvasTexture(canvasNight);
    const tClouds = new THREE.CanvasTexture(canvasClouds);

    return [tDay, tNight, tClouds];
  }, [area, isCritico]);

  // Rotaciones controladas: planeta quieto o rotación lentísima, nubes rotando suavemente
  useFrame((_, delta) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.035;
    }
  });

  const planetRadius = 1.42;

  return (
    <group rotation={[0.1, baseRotationY, 0]}>
      {/* 1. Esfera de la Tierra: Alta resolución, relieve y luces nocturnas tenues */}
      <mesh ref={planetRef}>
        <sphereGeometry args={[planetRadius, 64, 64]} />
        <meshStandardMaterial
          map={dayTexture}
          roughness={0.65}
          metalness={0.15}
          emissiveMap={nightTexture}
          emissive={new THREE.Color('#ffdd88')}
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* 2. Capa de Nubes Semitransparente */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[planetRadius * 1.018, 48, 48]} />
        <meshStandardMaterial
          map={cloudsTexture}
          transparent
          opacity={0.65}
          blending={THREE.NormalBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Atmósfera con brillo Fresnel en el color de salud de la misión */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[planetRadius * 1.15, 32, 32]} />
        <meshBasicMaterial
          color={healthColor}
          transparent
          opacity={isCritico ? 0.38 : 0.22}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Luz Direccional tipo Sol que proyecta día y noche */}
      <directionalLight position={[14, 8, 12]} intensity={2.2} />
      <ambientLight intensity={0.28} />
    </group>
  );
};
