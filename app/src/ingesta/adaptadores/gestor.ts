/**
 * Adaptador de Ingesta para Gestor WWP (Nivel N3 - Detalle Completo)
 *
 * NOTA DE ARQUITECTURA:
 * La fuente `gestor_wwp` se encuentra actualmente inactiva.
 * Los datos vigentes para el piloto provienen de Notion a nivel N1 (fases macro y etapas derivadas).
 *
 * TODO (Fase posterior / Paso a producción):
 * - Implementar cliente de API para Gestor WWP.
 * - Sincronizar etapas reales (orden, fechas inicio/fin plan y real).
 * - Sincronizar tareas reales por etapa.
 * - Sincronizar bloqueos operativos con áreas de destrabe.
 */

export interface GestorProyectoN3 {
  id_gestor: string;
  codigo_visible: string;
  nombre: string;
  descripcion?: string;
  area_codigo: string;
  sponsor_email?: string;
  responsable_email?: string;
  fecha_inicio_plan?: string;
  fecha_fin_plan?: string;
  etapas: GestorEtapaN3[];
  bloqueos: GestorBloqueoN3[];
}

export interface GestorEtapaN3 {
  id_etapa: string;
  nombre: string;
  orden: number;
  estado: 'Pendiente' | 'En curso' | 'Bloqueada' | 'Completada';
  inicio_plan?: string;
  fin_plan?: string;
  inicio_real?: string;
  fin_real?: string;
  duracion_dh?: number;
  responsable_email?: string;
  tareas: GestorTareaN3[];
}

export interface GestorTareaN3 {
  id_tarea: string;
  nombre: string;
  estado: string;
  responsable_email?: string;
}

export interface GestorBloqueoN3 {
  id_bloqueo: string;
  etapa_id: string;
  descripcion: string;
  motivo: 'Aprobación QA' | 'Infraestructura' | 'Seguridad' | 'Dependencia' | 'Decisión pendiente' | 'Proveedor' | 'Otro';
  area_destraba?: string;
  fecha_apertura: string;
  fecha_cierre?: string;
}

export interface AdaptadorGestor {
  fuenteCodigo: 'gestor_wwp';
  estaActivo: boolean;
  obtenerProyectoCompleto(idOrigen: string): Promise<GestorProyectoN3 | null>;
  sincronizarTodos(): Promise<{ total: number; errores: string[] }>;
}

export const adaptadorGestorWWP: AdaptadorGestor = {
  fuenteCodigo: 'gestor_wwp',
  estaActivo: false,
  obtenerProyectoCompleto: async (_idOrigen: string) => {
    // TODO: Implementar cuando la fuente gestor_wwp esté activa
    return null;
  },
  sincronizarTodos: async () => {
    // TODO: Implementar pipeline N3
    return { total: 0, errores: ['Fuente gestor_wwp inactiva temporalmente'] };
  },
};
