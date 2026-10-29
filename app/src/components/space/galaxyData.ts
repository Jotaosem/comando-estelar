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
  Operaciones: '#00f2fe',
  Compliance: '#a855f7',
  Seguridad: '#ff3366',
  Comercial: '#38bdf8',
  'BI & Analítica': '#f59e0b',
};

// REQUERIMIENTO 3: Layout en grilla automática
// cols = ceil(sqrt(nÁreas)) = ceil(sqrt(5)) = 3 columnas, separación >= 3x el radio (>= 28 unidades)
const COLS = Math.ceil(Math.sqrt(SECTOR_NAMES.length)); // 3
const SECTOR_SPACING_X = 32;
const SECTOR_SPACING_Z = 30;

export const SECTOR_SYSTEMS: SectorSystem[] = SECTOR_NAMES.map((name, idx) => {
  const row = Math.floor(idx / COLS);
  const col = idx % COLS;
  // Centrar la grilla alrededor del origen
  const x = (col - (COLS - 1) / 2) * SECTOR_SPACING_X;
  const z = (row - 0.5) * SECTOR_SPACING_Z;
  return {
    id: name,
    name: `Sector ${name}`,
    position: [x, 0, z],
    color: SECTOR_COLORS[name] || '#00f2fe',
    starSize: 2.4,
  };
});

// Proyectos orbitan en radios seguros no solapados (7.5 a 11.5 unidades)
export function calcularPosicionPlaneta(
  area: string,
  indexInArea: number,
  totalInArea: number
): [number, number, number] {
  const system = SECTOR_SYSTEMS.find((s) => s.id === area) || SECTOR_SYSTEMS[0];
  const radius = 7.5 + (indexInArea % 3) * 2.6;
  const angle = (indexInArea / Math.max(1, totalInArea)) * Math.PI * 2 + (indexInArea * 0.5);
  const x = system.position[0] + Math.cos(angle) * radius;
  const y = system.position[1];
  const z = system.position[2] + Math.sin(angle) * radius;
  return [x, y, z];
}

// Calcular Bounding Box de la galaxia completa con 15% de margen
export function calcularGalaxiaBox(proyectosConPosicion: { position: [number, number, number] }[]): THREE.Box3 {
  const box = new THREE.Box3();
  SECTOR_SYSTEMS.forEach((s) => box.expandByPoint(new THREE.Vector3(...s.position)));
  proyectosConPosicion.forEach((p) => box.expandByPoint(new THREE.Vector3(...p.position)));
  // 15% de margen
  const size = new THREE.Vector3();
  box.getSize(size);
  box.expandByVector(size.clone().multiplyScalar(0.15));
  return box;
}
