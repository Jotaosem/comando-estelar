import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { ProyectoResumenUI } from '../../lib/proyectosData';
import { SECTOR_SYSTEMS, calcularPosicionPlaneta, calcularGalaxiaBox } from './galaxyData';
import { SystemStar } from './SystemStar';
import { Planet } from './Planet';
import { OrbitStationsRing } from './OrbitStation';
import { SpaceBackground } from './SpaceBackground';
import { CameraDirector } from './CameraDirector';
import { Galaxy25DControls } from './Galaxy25DControls';
import { TooltipProjector, type StageTooltipData } from './StageScreenTooltip';
import type { NivelNavegacion } from './navigationStore';

interface GalaxyCanvas3DProps {
  nivel: NivelNavegacion;
  proyectos: ProyectoResumenUI[];
  selectedProyecto: ProyectoResumenUI | null;
  selectedEtapa: any | null;
  cameraTargetPos: [number, number, number];
  onSelectProyecto: (p: ProyectoResumenUI) => void;
  onSelectEtapa: (e: any) => void;
  reducedMotion?: boolean;
  onHoverStage: (data: StageTooltipData | null) => void;
  hoverStageData: StageTooltipData | null;
  panOffset?: [number, number];
  matchingIds?: Set<string> | null;
  healthFilter?: string | null;
  onCameraUpdate?: (cam: THREE.Camera) => void;
  targetFocusPos?: [number, number, number] | null;
  centrarTrigger?: number;
}

const GalaxyCanvas3D: React.FC<GalaxyCanvas3DProps> = ({
  nivel,
  proyectos,
  selectedProyecto,
  selectedEtapa,
  cameraTargetPos,
  onSelectProyecto,
  onSelectEtapa,
  reducedMotion = false,
  onHoverStage,
  hoverStageData,
  panOffset = [0, 0],
  matchingIds = null,
  healthFilter = null,
  onCameraUpdate,
  targetFocusPos = null,
  centrarTrigger = 0,
}) => {
  const proyectosConPosicion = useMemo(() => {
    const sectorCountMap = new Map<string, number>();
    proyectos.forEach((p) => {
      sectorCountMap.set(p.area_solicitante, (sectorCountMap.get(p.area_solicitante) || 0) + 1);
    });

    const sectorCurrentIndexMap = new Map<string, number>();
    return proyectos.map((p, pIdx) => {
      const totalInSector = sectorCountMap.get(p.area_solicitante) || 1;
      const curIndex = sectorCurrentIndexMap.get(p.area_solicitante) || 0;
      sectorCurrentIndexMap.set(p.area_solicitante, curIndex + 1);

      const pos = calcularPosicionPlaneta(p.area_solicitante, curIndex, totalInSector);
      return { proyecto: p, position: pos, projectIndex: pIdx };
    });
  }, [proyectos]);

  // Bounding Box con 15% de margen
  const galaxyBox = useMemo(() => {
    return calcularGalaxiaBox(proyectosConPosicion);
  }, [proyectosConPosicion]);

  // Detección de colisión de chips de planetas en galaxia:
  // Si colisionan en 3D (distancia < 5.5 unidades), se oculta el de menor riesgo
  const ocultarChipIds = useMemo(() => {
    const ocultos = new Set<string>();
    const riesgoScore: Record<string, number> = { rojo: 4, amarillo: 3, gris: 2, verde: 1 };

    for (let i = 0; i < proyectosConPosicion.length; i++) {
      for (let j = i + 1; j < proyectosConPosicion.length; j++) {
        const p1 = proyectosConPosicion[i];
        const p2 = proyectosConPosicion[j];
        const v1 = new THREE.Vector3(...p1.position);
        const v2 = new THREE.Vector3(...p2.position);
        if (v1.distanceTo(v2) < 5.5) {
          const r1 = riesgoScore[p1.proyecto.semaforo] || 1;
          const r2 = riesgoScore[p2.proyecto.semaforo] || 1;
          // Se muestra el de mayor riesgo; el otro se oculta (se muestra al hacer hover)
          if (r1 >= r2) {
            ocultos.add(p2.proyecto.id);
          } else {
            ocultos.add(p1.proyecto.id);
          }
        }
      }
    }
    return ocultos;
  }, [proyectosConPosicion]);

  return (
    <Canvas
      camera={{ position: [0, 32, 45], fov: 45 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      className="w-full h-full"
    >
      <color attach="background" args={['#020510']} />

      {/* Proyector 3D -> 2D para tooltip en capa DOM */}
      <TooltipProjector data={hoverStageData} />

      {/* CONTROLES SEPARADOS POR NIVEL (Nunca activos a la vez):
          - En nivel 'galaxia': Galaxy25DControls (MapControls 2.5D, pan libre, zoom al cursor, sin rotación)
          - En nivel 'planeta' o 'etapa': CameraDirector interpolado */}
      {nivel === 'galaxia' ? (
        <Galaxy25DControls
          enabled={true}
          galaxyBox={galaxyBox}
          panOffset={panOffset}
          onCameraChange={onCameraUpdate}
          targetFocusPos={targetFocusPos}
          centrarTrigger={centrarTrigger}
        />
      ) : (
        <CameraDirector
          nivel={nivel}
          targetPosition={cameraTargetPos}
          reducedMotion={reducedMotion}
        />
      )}

      <SpaceBackground />

      {/* Sistemas Estelares (Sectores en Grilla limpia) */}
      {nivel === 'galaxia' &&
        SECTOR_SYSTEMS.map((system) => {
          return (
            <group key={system.id}>
              <SystemStar
                system={system}
                onSelect={() => {}}
                active={selectedProyecto?.area_solicitante === system.id}
                visible={true}
              />
            </group>
          );
        })}

      {/* Planetas */}
      {proyectosConPosicion.map(({ proyecto, position, projectIndex }) => {
        const isSelected = selectedProyecto?.id === proyecto.id;

        // En niveles planeta/etapa solo renderizar el planeta activo
        if (nivel !== 'galaxia' && !isSelected) {
          return null;
        }

        const isFilteredOutByHealth = healthFilter ? proyecto.semaforo !== healthFilter : false;
        const isFilteredOutBySearch = matchingIds ? !matchingIds.has(proyecto.id) : false;
        const isDimmed = isFilteredOutByHealth || isFilteredOutBySearch;

        return (
          <group
            key={proyecto.id}
            scale={isDimmed ? 0.75 : 1}
          >
            <group position={isDimmed ? [position[0], position[1] - 4, position[2]] : position}>
              <Planet
                proyecto={proyecto}
                position={[0, 0, 0]}
                onSelect={onSelectProyecto}
                showOverlay={nivel === 'galaxia' && !isDimmed}
                projectIndex={projectIndex}
                ocultarChipPorColision={ocultarChipIds.has(proyecto.id)}
              />
            </group>

            {/* En Nivel Planeta o Etapa: Órbita con esfera de hit y rotación */}
            {nivel !== 'galaxia' && isSelected && (
              <group position={position}>
                <OrbitStationsRing
                  etapas={proyecto.etapas}
                  etapaActualIdx={
                    proyecto.etapas.findIndex(
                      (e: any) => e.nombre === proyecto.etapa_actual_nombre
                    ) !== -1
                      ? proyecto.etapas.findIndex(
                          (e: any) => e.nombre === proyecto.etapa_actual_nombre
                        )
                      : 2
                  }
                  onSelectEtapa={onSelectEtapa}
                  selectedEtapaId={selectedEtapa?.id || null}
                  onHoverStage={onHoverStage}
                  worldPos={position}
                  radius={5.2}
                  nivel={nivel}
                />
              </group>
            )}
          </group>
        );
      })}
    </Canvas>
  );
};

export default GalaxyCanvas3D;
