export type Rol = 'Gerencia' | 'Solicitante' | 'Ejecutor' | 'Admin';
export type Semaforo = 'verde' | 'amarillo' | 'rojo' | 'gris';
export type EtapaEstado = 'Pendiente' | 'En curso' | 'Bloqueada' | 'Completada';
export type BloqueoMotivo = 'Aprobación QA' | 'Infraestructura' | 'Seguridad' | 'Dependencia' | 'Otro';
export type AvisoTipo = 'cambio_etapa' | 'bloqueo_nuevo' | 'bloqueo_cerrado' | 'atraso' | 'retroceso' | 'sin_actualizar';
export type AvisoEstado = 'preparado' | 'publicado' | 'descartado';
export type EventoTipo = 'creado' | 'actualizado' | 'eliminado' | 'retroceso';

export interface ParametrosCalculo {
  dias_por_bloqueo: number; // default 5
  umbral_atraso_rojo_dh: number; // default 5
  umbral_bloqueo_rojo_dh: number; // default 5
  dias_frescura: number; // default 7
  duracion_default_dh: number; // default 5
  canal_slack_piloto?: string;
  url_app?: string;
  inicio_piloto?: string;
}

export interface ProyectoN {
  id?: string;
  notion_id: string;
  notion_editado_en?: string;
  nombre: string;
  area_solicitante: string;
  solicitante_nombre: string;
  solicitante_email: string;
  responsable_comunicar_nombre: string;
  responsable_comunicar_email: string;
  fecha_comprometida?: string | null; // YYYY-MM-DD
  notion_url?: string | null;
}

export interface EtapaN {
  id?: string;
  notion_id: string;
  notion_editado_en?: string;
  proyecto_id?: string;
  proyecto_notion_id?: string;
  nombre: string;
  orden: number;
  responsable_nombre?: string | null;
  responsable_email?: string | null;
  estado: EtapaEstado;
  inicio_plan?: string | null;
  fin_plan?: string | null;
  inicio_real?: string | null;
  fin_real?: string | null;
  duracion_dh?: number | null;
}

export interface BloqueoN {
  id?: string;
  notion_id: string;
  notion_editado_en?: string;
  proyecto_id?: string;
  proyecto_notion_id?: string;
  etapa_id?: string | null;
  etapa_notion_id?: string | null;
  descripcion: string;
  motivo: BloqueoMotivo;
  area_destraba: string;
  fecha_apertura: string; // YYYY-MM-DD
  fecha_cierre?: string | null; // YYYY-MM-DD
}

export interface TareaN {
  id?: string;
  notion_id: string;
  notion_editado_en?: string;
  proyecto_id?: string;
  proyecto_notion_id?: string;
  etapa_id?: string;
  etapa_notion_id?: string;
  nombre: string;
  responsable_nombre?: string | null;
  responsable_email?: string | null;
  estado: string;
}

export interface SyncPayload {
  fuente: 'notion' | 'fixture';
  leido_en: string; // ISO
  proyectos: ProyectoN[];
  etapas: EtapaN[];
  bloqueos: BloqueoN[];
  tareas: TareaN[];
}

export interface DesgloseCalculo {
  base: string;
  etapas: Array<{ nombre: string; estado: string; dias: number }>;
  bloqueos: Array<{ descripcion: string; motivo: string; dias: number }>;
  total_dh: number;
  fecha: string;
}

export interface CalculoResultado {
  proyecto_id?: string;
  etapa_actual_id?: string | null;
  etapa_actual_nombre?: string;
  avance_pct: number;
  etapas_completadas: number;
  etapas_total: number;
  fecha_reproyectada: string | null;
  atraso_dh: number;
  semaforo: Semaforo;
  motivos_semaforo: string[];
  bloqueos_abiertos: number;
  ultima_actualizacion: string;
  sin_actualizar: boolean;
  alertas_gobierno: string[];
  desglose: DesgloseCalculo;
  cerrado: boolean;
  calculado_en: string;
}
