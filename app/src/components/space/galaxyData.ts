// app/src/components/space/galaxyData.ts
import * as THREE from 'three';

export interface SectorSystem {
  id: string;
  name: string;
  position: [number, number, number];
  color: string;
  starSize: number;
}

export const SECTOR_NAMES = [
  'Operaciones',
  'Compliance',
  'Seguridad',
  'Comercial',
  'BI & Analítica',
];

const SECTOR_COLORS: Record<string, string> = {
  Operaciones: '#a9533a', // --terracotta
  Compliance: '#7a5c6b', // --mauve
  Seguridad: '#ee8f88', // --health-red
  Comercial: '#4f6b78', // --slate
  'BI & Analítica': '#9c6b3c', // --ochre
  Tecnología: '#5c7a6e', // --sage
  Finanzas: '#c48d3f', // --amber
  Riesgo: '#d97768',
  'Sin clasificar': '#8c827a', // --muted
};

// Layout determinista de cúmulos de áreas según aspecto y lista de áreas reales
export function obtenerSectorSystems(
  areasDisponibles: string[] = SECTOR_NAMES,
  aspectRatio: number = 1.6,
  isMobile: boolean = false
): SectorSystem[] {
  const listaAreas = Array.from(new Set(areasDisponibles.length > 0 ? areasDisponibles : SECTOR_NAMES));
  const n = listaAreas.length;

  let cols: number;
  if (isMobile || aspectRatio < 0.9) {
    cols = Math.min(2, Math.max(1, Math.round(Math.sqrt(n * Math.min(aspectRatio, 0.8)))));
  } else {
    cols = Math.min(n, Math.max(1, Math.round(Math.sqrt(n * aspectRatio))));
  }

  const SECTOR_SPACING_X = 38;
  const SECTOR_SPACING_Z = 36;

  return listaAreas.map((name, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const x = (col - (cols - 1) / 2) * SECTOR_SPACING_X;
    const z = (row - Math.floor((n - 1) / cols) / 2) * SECTOR_SPACING_Z;
    return {
      id: name,
      name: `Sector ${name}`,
      position: [x, 0, z],
      color: SECTOR_COLORS[name] || '#a9533a',
      starSize: 2.4,
    };
  });
}

export const SECTOR_SYSTEMS: SectorSystem[] = obtenerSectorSystems(SECTOR_NAMES, 1.6, false);

// Hash determinista a partir de string para posición 100% estable entre recargas
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Proyectos orbitan en radios seguros no solapados y con separación garantizada
export function calcularPosicionPlaneta(
  area: string,
  indexInArea: number,
  totalInArea: number,
  systems: SectorSystem[] = SECTOR_SYSTEMS,
  proyectoId?: string
): [number, number, number] {
  const system = systems.find((s) => s.id === area) || systems[0] || {
    id: 'default',
    name: 'Sector General',
    position: [0, 0, 0],
    color: '#a9533a',
    starSize: 2.4,
  };

  const total = Math.max(1, totalInArea);

  let radius = 8.5;
  let angle = 0;

  if (total <= 4) {
    radius = 8.5;
    angle = (indexInArea / total) * Math.PI * 2;
  } else {
    // 2 órbitas concéntricas bien espaciadas para evitar colisión de mallas y etiquetas
    const esOrbitaExterna = indexInArea >= 4;
    if (esOrbitaExterna) {
      radius = 13.5;
      const indexExterno = indexInArea - 4;
      const totalExterno = total - 4;
      angle = (indexExterno / Math.max(1, totalExterno)) * Math.PI * 2 + Math.PI / 4;
    } else {
      radius = 8.0;
      angle = (indexInArea / 4) * Math.PI * 2;
    }
  }

  // Pequeño desplazamiento determinista si existe ID para evitar coincidencia exacta
  if (proyectoId) {
    const seed = hashString(proyectoId) % 100;
    const jitterAngle = ((seed - 50) / 100) * 0.08;
    angle += jitterAngle;
  }

  const x = system.position[0] + Math.cos(angle) * radius;
  const y = system.position[1];
  const z = system.position[2] + Math.sin(angle) * radius;

  return [x, y, z];
}

// Calcular Bounding Box de la galaxia completa con 15% de margen
export function calcularGalaxiaBox(
  proyectosConPosicion: { position: [number, number, number] }[],
  systems: SectorSystem[] = SECTOR_SYSTEMS
): THREE.Box3 {
  const box = new THREE.Box3();
  systems.forEach((s) => box.expandByPoint(new THREE.Vector3(...s.position)));
  proyectosConPosicion.forEach((p) => box.expandByPoint(new THREE.Vector3(...p.position)));

  // Margen de 15% para que encuadre perfecto
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.lengthSq() === 0) {
    box.setFromCenterAndSize(new THREE.Vector3(0, 0, 0), new THREE.Vector3(50, 20, 50));
  } else {
    box.expandByVector(size.clone().multiplyScalar(0.15));
  }
  return box;
}
