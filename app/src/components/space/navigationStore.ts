import { create } from 'zustand';
import type { ProyectoResumenUI } from '../../lib/proyectosData';

export type NivelNavegacion = 'galaxia' | 'planeta' | 'etapa';

interface NavigationState {
  nivel: NivelNavegacion;
  areaId: string | null;
  proyecto: ProyectoResumenUI | null;
  etapa: any | null;

  // Acciones puras de navegación
  irAGalaxia: () => void;
  seleccionarArea: (areaId: string) => void;
  seleccionarProyecto: (proyecto: ProyectoResumenUI) => void;
  seleccionarEtapa: (etapa: any) => void;
  volverUnNivel: () => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  nivel: 'galaxia',
  areaId: null,
  proyecto: null,
  etapa: null,

  irAGalaxia: () => {
    set({
      nivel: 'galaxia',
      areaId: null,
      proyecto: null,
      etapa: null,
    });
  },

  seleccionarArea: (areaId: string) => {
    set({
      nivel: 'galaxia',
      areaId,
    });
  },

  seleccionarProyecto: (proyecto: ProyectoResumenUI) => {
    set({
      nivel: 'planeta',
      areaId: proyecto.area_solicitante,
      proyecto,
      etapa: null,
    });
  },

  seleccionarEtapa: (etapa: any) => {
    set({
      nivel: 'etapa',
      etapa,
    });
  },

  volverUnNivel: () => {
    const { nivel } = get();
    if (nivel === 'etapa') {
      set({ nivel: 'planeta', etapa: null });
    } else if (nivel === 'planeta') {
      set({ nivel: 'galaxia', proyecto: null, etapa: null });
    }
  },
}));
