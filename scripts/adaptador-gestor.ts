/**
 * Adaptador de Datos: WWP Gestor de Proyectos / Gestor Documental -> Comando Estelar
 * 
 * Basado en el esquema canónico del Atlas de Datos (PostgreSQL / Supabase):
 * - public.projects
 * - public.project_phases
 * - public.project_tasks
 * - public.blockers
 * - public.profiles
 * - public.sponsor_areas
 */

export interface GestorRawPayload {
  projects: any[];
  phases: any[];
  tasks: any[];
  blockers: any[];
  profiles: any[];
  areas?: any[];
}

export interface CanonicoProyecto {
  id_origen: string;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  objetivo: string | null;
  fase_macro: string;
  estado_origen: string;
  fecha_inicio: string | null;
  fecha_comprometida: string | null;
  fecha_fin_real: string | null;
  area_solicitante: string;
  area_sponsor: string | null;
  responsable_nombre: string;
  responsable_email: string;
  sponsor_nombre: string | null;
  sponsor_email: string | null;
  url_origen: string | null;
  nivel_detalle: 'N3';
}

export interface CanonicoEtapa {
  id_origen: string;
  proyecto_id_origen: string;
  codigo: string | null;
  nombre: string;
  orden: number;
  estado: 'Pendiente' | 'En curso' | 'Bloqueada' | 'Completada';
  inicio_plan: string | null;
  fin_plan: string | null;
  inicio_real: string | null;
  fin_real: string | null;
  duracion_dh?: number;
}

export interface CanonicoTarea {
  id_origen: string;
  proyecto_id_origen: string;
  etapa_id_origen: string;
  codigo: string | null;
  nombre: string;
  estado: string;
  prioridad: string | null;
  responsable_nombre: string | null;
  responsable_email: string | null;
  inicio_plan: string | null;
  fin_plan: string | null;
}

export interface CanonicoBloqueo {
  id_origen: string;
  proyecto_id_origen: string;
  etapa_id_origen: string | null;
  tarea_id_origen: string | null;
  descripcion: string;
  motivo: string;
  area_destraba: string | null;
  responsable_nombre: string | null;
  responsable_email: string | null;
  fecha_apertura: string;
  fecha_cierre: string | null;
  estado: 'abierto' | 'resuelto';
}

export interface CanonicoPerfil {
  email: string;
  nombre: string;
  rol: 'Admin' | 'Gerencia' | 'Gerente de área' | 'Solicitante' | 'Ejecutor';
  area: string | null;
  activo: boolean;
}

export interface PayloadCanonicoGestor {
  fuente: 'gestor_wwp';
  leido_en: string;
  proyectos: CanonicoProyecto[];
  etapas: CanonicoEtapa[];
  tareas: CanonicoTarea[];
  bloqueos: CanonicoBloqueo[];
  perfiles: CanonicoPerfil[];
}

function mapearFaseMacroGestor(status: string): string {
  const s = (status || '').toUpperCase().trim();
  switch (s) {
    case 'IDEA':
    case 'BACKLOG':
      return 'Idea';
    case 'DISCOVERY':
      return 'Discovery';
    case 'DISENO':
    case 'DISEÑO':
      return 'Diseño';
    case 'EN_CURSO':
    case 'EN_DESARROLLO':
    case 'EJECUCION':
    case 'EJECUCIÓN':
      return 'Ejecución';
    case 'SEGUIMIENTO':
    case 'QA':
    case 'TESTING':
      return 'Seguimiento';
    case 'COMPLETADO':
    case 'FINALIZADO':
    case 'CERRADO':
      return 'Cerrado';
    case 'PAUSADO':
      return 'Pausado';
    case 'CANCELADO':
      return 'Cancelado';
    default:
      return 'Ejecución';
  }
}

function mapearEstadoEtapa(status: string): 'Pendiente' | 'En curso' | 'Bloqueada' | 'Completada' {
  const s = (status || '').toUpperCase().trim();
  if (s === 'FINALIZADA' || s === 'COMPLETADA' || s === 'CERRADA') return 'Completada';
  if (s === 'BLOQUEADA') return 'Bloqueada';
  if (s === 'EN_CURSO' || s === 'EN_PROGRESO' || s === 'IN_PROGRESS') return 'En curso';
  return 'Pendiente';
}

function mapearRolPerfil(role: string): 'Admin' | 'Gerencia' | 'Gerente de área' | 'Solicitante' | 'Ejecutor' {
  const r = (role || '').toUpperCase().trim();
  if (r === 'ADMIN' || r === 'ADMINISTRADOR') return 'Admin';
  if (r === 'GERENTE' || r === 'GERENCIA' || r === 'DIRECTOR') return 'Gerencia';
  if (r === 'SPONSOR' || r === 'GERENTE_AREA') return 'Gerente de área';
  if (r === 'SOLICITANTE' || r === 'CLIENTE') return 'Solicitante';
  return 'Ejecutor'; // LIDER, COLABORADOR, DEV, etc.
}

export function adaptarDatosGestor(raw: GestorRawPayload, urlBaseGestor = 'https://gestor.wwp.cl'): PayloadCanonicoGestor {
  const profilesMap = new Map<string, any>();
  (raw.profiles || []).forEach((p) => {
    if (p.id) profilesMap.set(p.id, p);
    if (p.email) profilesMap.set(p.email.toLowerCase(), p);
  });

  const areasMap = new Map<string, string>();
  (raw.areas || []).forEach((a) => {
    if (a.id) areasMap.set(a.id, a.name || a.nombre);
  });

  const proyectos: CanonicoProyecto[] = (raw.projects || []).map((p) => {
    const leader = profilesMap.get(p.leader_id) || profilesMap.get(p.lider_id) || {};
    const sponsor = profilesMap.get(p.sponsor_id) || {};
    const areaSolicitante = areasMap.get(p.requesting_area_id) || p.area_solicitante || 'Sin clasificar';
    const areaSponsor = areasMap.get(p.sponsor_area_id) || p.area_sponsor || null;

    return {
      id_origen: String(p.id),
      codigo: p.code || null,
      nombre: p.name || p.nombre || 'Sin título',
      descripcion: p.short_description || p.descripcion || null,
      objetivo: p.objective || p.objetivo || null,
      fase_macro: mapearFaseMacroGestor(p.status || p.fase_macro),
      estado_origen: p.status || 'Activo',
      fecha_inicio: p.start_date || p.fecha_inicio || null,
      fecha_comprometida: p.committed_target_date || p.target_delivery_date || p.target_date || p.fecha_comprometida || null,
      fecha_fin_real: p.actual_end || p.closure_approved_at || null,
      area_solicitante: areaSolicitante,
      area_sponsor: areaSponsor,
      responsable_nombre: leader.full_name || leader.nombre || p.lider_nombre || 'Sin asignar',
      responsable_email: (leader.email || p.lider_email || '').toLowerCase(),
      sponsor_nombre: sponsor.full_name || sponsor.nombre || p.sponsor_nombre || null,
      sponsor_email: (sponsor.email || p.sponsor_email || '').toLowerCase() || null,
      url_origen: p.code ? `${urlBaseGestor}/projects/${p.code}` : `${urlBaseGestor}/projects/${p.id}`,
      nivel_detalle: 'N3',
    };
  });

  const etapas: CanonicoEtapa[] = (raw.phases || []).map((f, idx) => ({
    id_origen: String(f.id),
    proyecto_id_origen: String(f.project_id),
    codigo: f.code || null,
    nombre: f.name || f.nombre || `Fase ${idx + 1}`,
    orden: f.position ?? f.orden ?? idx + 1,
    estado: mapearEstadoEtapa(f.estado || f.status),
    inicio_plan: f.planned_start || f.inicio_plan || null,
    fin_plan: f.planned_end || f.fin_plan || null,
    inicio_real: f.actual_start || f.inicio_real || null,
    fin_real: f.actual_end || f.fin_real || null,
    duracion_dh: f.duracion_dh ? Number(f.duracion_dh) : undefined,
  }));

  const tareas: CanonicoTarea[] = (raw.tasks || []).map((t) => {
    const owner = profilesMap.get(t.owner_id) || {};
    return {
      id_origen: String(t.id),
      proyecto_id_origen: String(t.project_id),
      etapa_id_origen: String(t.phase_id),
      codigo: t.code || null,
      nombre: t.name || t.nombre || 'Tarea',
      estado: t.status || 'Pendiente',
      prioridad: t.priority || null,
      responsable_nombre: owner.full_name || owner.nombre || t.responsable_nombre || null,
      responsable_email: (owner.email || t.responsable_email || '').toLowerCase() || null,
      inicio_plan: t.planned_start || null,
      fin_plan: t.planned_end || null,
    };
  });

  const bloqueos: CanonicoBloqueo[] = (raw.blockers || []).map((b) => {
    const owner = profilesMap.get(b.owner_id) || {};
    return {
      id_origen: String(b.id),
      proyecto_id_origen: String(b.project_id),
      etapa_id_origen: b.phase_id ? String(b.phase_id) : null,
      tarea_id_origen: b.task_id ? String(b.task_id) : null,
      descripcion: b.description || b.descripcion || 'Bloqueo registrado',
      motivo: b.reason || b.motivo || 'Dependencia',
      area_destraba: b.unblocking_area || b.area_destraba || null,
      responsable_nombre: owner.full_name || b.responsable_nombre || null,
      responsable_email: (owner.email || b.responsable_email || '').toLowerCase() || null,
      fecha_apertura: b.started_at || b.created_at || new Date().toISOString(),
      fecha_cierre: b.resolved_at || null,
      estado: b.resolved_at ? 'resuelto' : 'abierto',
    };
  });

  const perfiles: CanonicoPerfil[] = (raw.profiles || [])
    .filter((p) => p.email && p.email.includes('@'))
    .map((p) => ({
      email: p.email.toLowerCase().trim(),
      nombre: p.full_name || p.nombre || p.email.split('@')[0],
      rol: mapearRolPerfil(p.role || p.rol),
      area: p.area || null,
      activo: p.active !== false && p.activo !== false,
    }));

  return {
    fuente: 'gestor_wwp',
    leido_en: new Date().toISOString(),
    proyectos,
    etapas,
    tareas,
    bloqueos,
    perfiles,
  };
}
