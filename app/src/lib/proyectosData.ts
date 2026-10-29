import { calcularProyecto } from '../../../supabase/functions/_shared/reglas';
import type { ParametrosCalculo } from '../../../supabase/functions/_shared/tipos';

const params: ParametrosCalculo = {
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
  atraso_dh: number;
  semaforo: 'verde' | 'amarillo' | 'rojo' | 'gris';
  motivos_semaforo: string[];
  bloqueos_abiertos: number;
  ultima_actualizacion: string;
  sin_actualizar: boolean;
  alertas_gobierno: string[];
  desglose: any;
  cerrado: boolean;
  etapas: any[];
  bloqueos: any[];
  tareas: any[];
  // Mission Control extra attributes
  callsign?: string;
  threat_level?: 'ALPHA' | 'BETA' | 'CRITICAL' | 'STABLE';
}

// 7 Etapas canónicas de la directiva Mission Control
const ETAPAS_CANONICAS = [
  'Levantamiento',
  'Diseño',
  'Desarrollo',
  'QA',
  'Aprobación Seguridad/Infra',
  'Despliegue',
  'Cierre',
];

// Mock enricher para asegurar que tengamos 6 misiones con las 7 etapas canónicas requeridas
const MOCK_EXTENDED_PROYECTOS = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    notion_id: 'notion-proj-a',
    nombre: 'Portal Proveedores (Proyecto A)',
    area_solicitante: 'Operaciones',
    solicitante_nombre: 'Valeria Soto',
    solicitante_email: 'valeria.soto@empresa.cl',
    responsable_comunicar_nombre: 'Jose Miguel',
    responsable_comunicar_email: 'jose.miguel@empresa.cl',
    fecha_comprometida: '2026-11-06',
    notion_url: 'https://notion.so/empresa/proj-a',
    callsign: 'OP-ORION-01',
    threat_level: 'CRITICAL',
    bloqueo_destacado: {
      tipo: 'Aprobación QA',
      motivo: 'Aprobación QA',
      area_destraba: 'QA Lead',
      descripcion: 'Bloqueo crítico: Pendiente firma de matriz UAT de seguridad y regresión.',
      dias_abierto: 6,
      fecha_apertura: '2026-10-13',
    },
    etapa_actual_idx: 3, // QA
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    notion_id: 'notion-proj-b',
    nombre: 'Integración ERP Galáctico (Proyecto B)',
    area_solicitante: 'Comercial',
    solicitante_nombre: 'Esteban Lagos',
    solicitante_email: 'esteban.lagos@empresa.cl',
    responsable_comunicar_nombre: 'Jose Miguel',
    responsable_comunicar_email: 'jose.miguel@empresa.cl',
    fecha_comprometida: '2026-12-15',
    notion_url: 'https://notion.so/empresa/proj-b',
    callsign: 'COM-NEXUS-02',
    threat_level: 'STABLE',
    etapa_actual_idx: 2, // Desarrollo
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    notion_id: 'notion-proj-c',
    nombre: 'Automatización Compliance (Proyecto C)',
    area_solicitante: 'Compliance',
    solicitante_nombre: 'Camila Rivas',
    solicitante_email: 'camila.rivas@empresa.cl',
    responsable_comunicar_nombre: 'Jose Miguel',
    responsable_comunicar_email: 'jose.miguel@empresa.cl',
    fecha_comprometida: '2026-11-10',
    notion_url: 'https://notion.so/empresa/proj-c',
    callsign: 'SEC-AEGIS-03',
    threat_level: 'BETA',
    reabierta: {
      etapa: 'Desarrollo',
      fecha: '18/10',
      motivo: 'Fallo en auditoría de tokens de acceso',
    },
    etapa_actual_idx: 2, // Desarrollo reabierto
  },
  {
    id: 'd0000000-0000-0000-0000-000000000004',
    notion_id: 'notion-proj-d',
    nombre: 'Migración Cloud Core (Proyecto D)',
    area_solicitante: 'Operaciones',
    solicitante_nombre: 'Valeria Soto',
    solicitante_email: 'valeria.soto@empresa.cl',
    responsable_comunicar_nombre: 'Jose Miguel',
    responsable_comunicar_email: 'jose.miguel@empresa.cl',
    fecha_comprometida: '2026-10-15',
    notion_url: 'https://notion.so/empresa/proj-d',
    callsign: 'INFRA-TITAN-04',
    threat_level: 'STABLE',
    cerrado: true,
    etapa_actual_idx: 6, // Cierre
  },
  {
    id: 'e0000000-0000-0000-0000-000000000005',
    notion_id: 'notion-proj-e',
    nombre: 'Sentinel Zero Trust (Proyecto E)',
    area_solicitante: 'Seguridad',
    solicitante_nombre: 'Rodrigo Paz',
    solicitante_email: 'rodrigo.paz@empresa.cl',
    responsable_comunicar_nombre: 'Jose Miguel',
    responsable_comunicar_email: 'jose.miguel@empresa.cl',
    fecha_comprometida: '2026-11-20',
    notion_url: 'https://notion.so/empresa/proj-e',
    callsign: 'SEC-VALKYRIE-05',
    threat_level: 'CRITICAL',
    bloqueo_destacado: {
      tipo: 'Infraestructura',
      motivo: 'Infraestructura',
      area_destraba: 'Cloud Ops',
      descripcion: 'Falta aprovisionamiento de clúster Kubernetes en zona secundaria.',
      dias_abierto: 7,
      fecha_apertura: '2026-10-11',
    },
    etapa_actual_idx: 4, // Aprobación Seguridad/Infra
  },
  {
    id: 'f0000000-0000-0000-0000-000000000006',
    notion_id: 'notion-proj-f',
    nombre: 'Telemetry Data Engine (Proyecto F)',
    area_solicitante: 'BI & Analítica',
    solicitante_nombre: 'Marcela Vega',
    solicitante_email: 'marcela.vega@empresa.cl',
    responsable_comunicar_nombre: 'Jose Miguel',
    responsable_comunicar_email: 'jose.miguel@empresa.cl',
    fecha_comprometida: '2026-12-01',
    notion_url: 'https://notion.so/empresa/proj-f',
    callsign: 'BI-PULSAR-06',
    threat_level: 'STABLE',
    etapa_actual_idx: 1, // Diseño
  },
];

export function esProyectoVisible(p: any, email: string, rol: string, area?: string | null): boolean {
  const normEmail = email.toLowerCase();
  if (rol === 'Admin' || rol === 'Gerencia') {
    return true;
  }
  if (rol === 'Solicitante') {
    return p.area_solicitante === area || p.solicitante_email?.toLowerCase() === normEmail;
  }
  if (rol === 'Ejecutor') {
    const esRespComunicar = p.responsable_comunicar_email?.toLowerCase() === normEmail;
    const esSol = p.solicitante_email?.toLowerCase() === normEmail;
    return esRespComunicar || esSol || true; // Para demo permitir ver proyectos asignados
  }
  return false;
}

export function obtenerProyectosSeed(usuarioActual?: { email: string; rol: string; area?: string | null }): ProyectoResumenUI[] {
  const hoy = '2026-10-21';
  const feriadosSet = new Set<string>();

  const visibleProyectos = MOCK_EXTENDED_PROYECTOS.filter((p) => {
    if (!usuarioActual) return true;
    return esProyectoVisible(p, usuarioActual.email, usuarioActual.rol, usuarioActual.area);
  });

  return visibleProyectos.map((pConfig, pIndex) => {
    // Generar las 7 etapas canónicas con datos de simulación consistentes
    const etapasCompletas = ETAPAS_CANONICAS.map((nombreEtapa, idx) => {
      let estado: 'Pendiente' | 'En curso' | 'Bloqueada' | 'Completada' = 'Pendiente';
      let fin_real: string | null = null;
      let inicio_real: string | null = null;
      let reabiertaEn: string | null = null;

      if (pConfig.cerrado) {
        estado = 'Completada';
        fin_real = `2026-10-${10 + idx}`;
      } else if (idx < pConfig.etapa_actual_idx) {
        estado = 'Completada';
        fin_real = `2026-10-${Math.max(1, 5 + idx * 3)}`;
      } else if (idx === pConfig.etapa_actual_idx) {
        if (pConfig.bloqueo_destacado) {
          estado = 'Bloqueada';
        } else {
          estado = 'En curso';
        }
        inicio_real = '2026-10-15';
        if (pConfig.reabierta && pConfig.reabierta.etapa === nombreEtapa) {
          reabiertaEn = pConfig.reabierta.fecha;
        }
      } else {
        estado = 'Pendiente';
      }

      return {
        id: `etapa-${pConfig.id}-${idx + 1}`,
        proyecto_id: pConfig.id,
        nombre: nombreEtapa,
        orden: idx + 1,
        responsable_nombre: idx % 2 === 0 ? 'Carlos Dev' : idx === 3 ? 'Paula QA' : 'Rodrigo Paz',
        responsable_email: idx % 2 === 0 ? 'carlos.dev@empresa.cl' : idx === 3 ? 'paula.qa@empresa.cl' : 'rodrigo.paz@empresa.cl',
        estado,
        inicio_plan: `2026-10-${Math.max(1, 1 + idx * 4)}`,
        fin_plan: `2026-10-${5 + idx * 4}`,
        inicio_real,
        fin_real,
        duracion_dh: 5,
        reabiertaEn,
      };
    });

    // Bloqueos
    const bloqueos = pConfig.bloqueo_destacado
      ? [
          {
            id: `bloq-${pConfig.id}-1`,
            proyecto_id: pConfig.id,
            etapa_id: `etapa-${pConfig.id}-${pConfig.etapa_actual_idx + 1}`,
            descripcion: pConfig.bloqueo_destacado.descripcion,
            motivo: pConfig.bloqueo_destacado.motivo,
            area_destraba: pConfig.bloqueo_destacado.area_destraba,
            fecha_apertura: pConfig.bloqueo_destacado.fecha_apertura,
            fecha_cierre: null,
            dias_abierto: pConfig.bloqueo_destacado.dias_abierto,
          },
        ]
      : [];

    // Tareas
    const tareas = [
      {
        id: `tar-${pConfig.id}-1`,
        proyecto_id: pConfig.id,
        nombre: `Validación de arquitectura ${pConfig.callsign}`,
        responsable_nombre: 'Carlos Dev',
        responsable_email: 'carlos.dev@empresa.cl',
        estado: 'Completada',
      },
      {
        id: `tar-${pConfig.id}-2`,
        proyecto_id: pConfig.id,
        nombre: `Sincronización con nodos perimetrales`,
        responsable_nombre: 'Paula QA',
        responsable_email: 'paula.qa@empresa.cl',
        estado: pConfig.bloqueo_destacado ? 'Bloqueada' : 'En curso',
      },
      {
        id: `tar-${pConfig.id}-3`,
        proyecto_id: pConfig.id,
        nombre: `Auditoría y telemetría de producción`,
        responsable_nombre: 'Jose Miguel',
        responsable_email: 'jose.miguel@empresa.cl',
        estado: 'Pendiente',
      },
    ];

    const calc = calcularProyecto(
      pConfig as any,
      etapasCompletas as any,
      bloqueos as any,
      null,
      hoy,
      feriadosSet,
      params
    );

    // Ajustes específicos de semáforo por requisitos de simulación
    let semaforo: 'verde' | 'amarillo' | 'rojo' | 'gris' = calc.semaforo;
    let motivos_semaforo = calc.motivos_semaforo;

    if (pConfig.bloqueo_destacado) {
      semaforo = 'rojo';
      motivos_semaforo = [
        `Bloqueo de ${pConfig.bloqueo_destacado.motivo} abierto hace ${pConfig.bloqueo_destacado.dias_abierto} días hábiles`,
      ];
    } else if (pConfig.reabierta) {
      semaforo = 'amarillo';
      motivos_semaforo = [
        `Etapa ${pConfig.reabierta.etapa} reabierta el ${pConfig.reabierta.fecha} (${pConfig.reabierta.motivo})`,
      ];
    } else if (pConfig.cerrado) {
      semaforo = 'verde';
      motivos_semaforo = ['Misión completada y auditada con éxito'];
    }

    return {
      id: pConfig.id,
      nombre: pConfig.nombre,
      area_solicitante: pConfig.area_solicitante,
      solicitante_nombre: pConfig.solicitante_nombre,
      solicitante_email: pConfig.solicitante_email,
      responsable_comunicar_nombre: pConfig.responsable_comunicar_nombre,
      responsable_comunicar_email: pConfig.responsable_comunicar_email,
      fecha_comprometida: pConfig.fecha_comprometida,
      notion_url: pConfig.notion_url,
      etapa_actual_nombre: ETAPAS_CANONICAS[pConfig.etapa_actual_idx] || calc.etapa_actual_nombre,
      avance_pct: pConfig.cerrado
        ? 100
        : Math.round((pConfig.etapa_actual_idx / ETAPAS_CANONICAS.length) * 100),
      etapas_completadas: pConfig.cerrado ? ETAPAS_CANONICAS.length : pConfig.etapa_actual_idx,
      etapas_total: ETAPAS_CANONICAS.length,
      fecha_reproyectada: calc.fecha_reproyectada || '2026-11-15',
      atraso_dh: pConfig.bloqueo_destacado ? 7 : pConfig.reabierta ? 3 : 0,
      semaforo,
      motivos_semaforo,
      bloqueos_abiertos: bloqueos.length,
      ultima_actualizacion: pIndex === 4 ? '2026-10-02T10:00:00Z' : '2026-10-21T09:00:00Z',
      sin_actualizar: pIndex === 4, // Sentinel Zero Trust sin actualizar para probar badge
      alertas_gobierno: calc.alertas_gobierno,
      desglose: calc.desglose || {
        base: hoy,
        etapas: etapasCompletas.map((e) => ({ nombre: e.nombre, estado: e.estado, dias: e.duracion_dh })),
        bloqueos: bloqueos.map((b) => ({ descripcion: b.descripcion, motivo: b.motivo, dias: 5 })),
        total_dh: 15,
        fecha: calc.fecha_reproyectada,
      },
      cerrado: !!pConfig.cerrado,
      etapas: etapasCompletas,
      bloqueos,
      tareas,
      callsign: pConfig.callsign,
      threat_level: pConfig.threat_level as any,
    };
  });
}
