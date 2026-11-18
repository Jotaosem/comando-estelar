import type { ParametrosCalculo } from '../../../supabase/functions/_shared/tipos';
import proyectosSeed12 from '../data/proyectosSeed12.json';

export const params: ParametrosCalculo = {
  dias_por_bloqueo: 5,
  umbral_atraso_rojo_dh: 5,
  umbral_bloqueo_rojo_dh: 5,
  dias_frescura: 7,
  duracion_default_dh: 5,
};

export interface ProyectoResumenUI {
  id: string;
  nombre: string;
  area_solicitante: string;
  solicitante_nombre: string;
  solicitante_email: string;
  responsable_comunicar_nombre: string;
  responsable_comunicar_email: string;
  fecha_comprometida: string | null;
  notion_url: string | null;
  etapa_actual_nombre?: string;
  avance_pct: number;
  etapas_completadas: number;
  etapas_total: number;
  fecha_reproyectada: string | null;
  atraso_dh: number | null;
  semaforo: 'verde' | 'amarillo' | 'rojo' | 'gris';
  motivos_semaforo: string[];
  bloqueos_abiertos: number;
  ultima_actualizacion: string;
  sin_actualizar: boolean;
  alertas_gobierno: string[];
  desglose: any;
  cerrado: boolean;
  cancelado?: boolean;
  etapas: any[];
  bloqueos: any[];
  tareas: any[];
  // Atributos extra
  codigo_visible?: string;
  callsign?: string;
  threat_level?: 'ALPHA' | 'BETA' | 'CRITICAL' | 'STABLE';
  descripcion?: string;
  palabras_clave?: string[];
  sprint_ingreso?: string;
  sprint_comprometido?: string;
  fecha_produccion?: string;
  sprint_estimado?: string;
  puede_ver_detalle?: boolean;
  nivel_detalle?: 'N1' | 'N2' | 'N3';
  url_principal?: string | null;
  proximo_paso?: string | null;
  decisiones_pendientes?: string | null;
  riesgos_texto?: string | null;
  objetivo?: string | null;
  fase_macro?: string;
  prioridad?: string | null;
  impacto?: string | null;
  alcance?: string | null;
  salud_declarada?: string | null;
  historial?: any[];
}

export function esProyectoVisible(p: any, email: string, rol: string, area?: string | null): boolean {
  const normEmail = (email || '').toLowerCase();
  if (rol === 'Admin' || rol === 'Gerencia') {
    return true;
  }
  if (rol === 'Solicitante') {
    return p.area_solicitante === area || p.solicitante_email?.toLowerCase() === normEmail;
  }
  if (rol === 'Ejecutor') {
    const esRespComunicar = p.responsable_comunicar_email?.toLowerCase() === normEmail;
    const esSol = p.solicitante_email?.toLowerCase() === normEmail;
    return esRespComunicar || esSol || true;
  }
  return false;
}

export function obtenerProyectosSeed(usuarioActual?: { email: string; rol: string; area?: string | null }): any[] {
  const visibleProyectos = (proyectosSeed12 as any[]).filter((p) => {
    if (!usuarioActual) return true;
    return esProyectoVisible(
      { ...p, area_solicitante: p.area_nombre, solicitante_email: 'solicitante@empresa.cl', responsable_comunicar_email: 'responsable@empresa.cl' },
      usuarioActual.email,
      usuarioActual.rol,
      usuarioActual.area
    );
  });

  return visibleProyectos.map((p) => {
    return {
      ...p,
      area_solicitante: p.area_nombre || 'Sin clasificar',
      solicitante_nombre: 'ProntoPaga',
      solicitante_email: 'contacto@prontopaga.com',
      responsable_comunicar_nombre: p.responsable_nombre,
      responsable_comunicar_email: 'contacto@prontopaga.com',
      etapa_actual_nombre: p.etapa_actual,
      fecha_reproyectada: p.fecha_estimada,
      notion_url: p.url_origen,
      url_principal: p.url_origen,
      callsign: p.codigo || undefined,
      bloqueos_abiertos: (p.bloqueos || []).length,
      etapas_completadas: (p.etapas || []).filter((e: any) => e.estado === 'Completada').length,
      etapas_total: (p.etapas || []).length || 5,
      sin_actualizar: false,
      desglose: {
        base: '2026-10-21',
        etapas: (p.etapas || []).map((e: any) => ({ nombre: e.nombre, estado: e.estado, dias: 5 })),
        bloqueos: [],
        total_dh: 15,
        fecha: p.fecha_estimada,
      },
      tareas: [],
      bloqueos: [],
      historial: [],
    };
  });
}
