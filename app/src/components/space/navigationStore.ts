import { create } from 'zustand';
import type { ProyectoResumenUI } from '../../lib/proyectosData';

export type NivelNavegacion = 'galaxia' | 'planeta' | 'etapa';

interface NavigationState {
  nivel: NivelNavegacion;
  areaId: string | null;
  proyecto: ProyectoResumenUI | null;
  etapa: any | null;
  searchQuery: string;
  isSearchDropdownOpen: boolean;
  centrarTrigger: number;
  chatAbierto: boolean;
  chatProyectoId: string | null;
  chatPreguntaInicial?: string;

  // Acciones puras de navegación
  irAGalaxia: () => void;
  seleccionarArea: (areaId: string) => void;
  seleccionarProyecto: (proyecto: ProyectoResumenUI) => void;
  seleccionarEtapa: (etapa: any) => void;
  volverUnNivel: () => void;
  setSearchQuery: (query: string) => void;
  setIsSearchDropdownOpen: (open: boolean) => void;
  triggerCentrar: () => void;
  abrirChatConProyecto: (proyectoId: string, preguntaInicial?: string) => void;
  cerrarChat: () => void;
  setChatAbierto: (abierto: boolean) => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  nivel: 'galaxia',
  areaId: null,
  proyecto: null,
  etapa: null,
  searchQuery: '',
  isSearchDropdownOpen: false,
  centrarTrigger: 0,
  chatAbierto: false,
  chatProyectoId: null,
  chatPreguntaInicial: undefined,

  setIsSearchDropdownOpen: (open: boolean) => {
    set({ isSearchDropdownOpen: open });
  },

  triggerCentrar: () => {
    set((state) => ({ centrarTrigger: state.centrarTrigger + 1 }));
  },

  abrirChatConProyecto: (proyectoId: string, preguntaInicial?: string) => {
    set({
      chatAbierto: true,
      chatProyectoId: proyectoId,
      chatPreguntaInicial: preguntaInicial,
    });
  },

  cerrarChat: () => {
    set({ chatAbierto: false, chatPreguntaInicial: undefined });
  },

  setChatAbierto: (abierto: boolean) => {
    set({ chatAbierto: abierto });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

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
