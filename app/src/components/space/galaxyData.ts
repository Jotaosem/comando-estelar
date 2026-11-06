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
  Compliance: '#7a5c6b',  // --mauve
  Seguridad: '#ee8f88',   // --health-red
  Comercial: '#4f6b78',   // --slate
  'BI & Analítica': '#9c6b3c', // --ochre
};

// REQUERIMIENTO 2: Layout de sistemas según el aspect ratio:
// cols = clamp(round(sqrt(n × aspect)), 1, n). En vertical (<768px) usa 1–2 columnas.
export function obtenerSectorSystems(aspectRatio: number = 1.6, isMobile: boolean = false): SectorSystem[] {
  const n = SECTOR_NAMES.length;
  let cols: number;
  if (isMobile || aspectRatio < 0.9) {
    cols = Math.min(2, Math.max(1, Math.round(Math.sqrt(n * Math.min(aspectRatio, 0.8)))));
  } else {
    cols = Math.min(n, Math.max(1, Math.round(Math.sqrt(n * aspectRatio))));
  }

  const SECTOR_SPACING_X = 32;
  const SECTOR_SPACING_Z = 30;

  return SECTOR_NAMES.map((name, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const x = (col - (cols - 1) / 2) * SECTOR_SPACING_X;
    const z = (row - Math.floor((n - 1) / cols) / 2) * SECTOR_SPACING_Z;
    return {
      id: name,
      name: `Sector ${name}`,
      position: [x, 0, z],
      color: SECTOR_COLORS[name] || '#00f2fe',
      starSize: 2.4,
    };
  });
}

export const SECTOR_SYSTEMS: SectorSystem[] = obtenerSectorSystems(1.6, false);

// Proyectos orbitan en radios seguros no solapados (7.5 a 11.5 unidades)
export function calcularPosicionPlaneta(
  area: string,
  indexInArea: number,
  totalInArea: number,
  systems: SectorSystem[] = SECTOR_SYSTEMS
): [number, number, number] {
  const system = systems.find((s) => s.id === area) || systems[0];
  const radius = 7.5 + (indexInArea % 3) * 2.6;
  const angle = (indexInArea / Math.max(1, totalInArea)) * Math.PI * 2 + (indexInArea * 0.5);
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
  // 15% de margen
  const size = new THREE.Vector3();
  box.getSize(size);
  box.expandByVector(size.clone().multiplyScalar(0.15));
  return box;
}
