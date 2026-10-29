/**
 * scripts/seed.ts
 * Genera supabase/seed.sql y fixtures/notion/datos.json con datos ficticios
 * Proyecto A (rojo por bloqueo QA > 5 dh), Proyecto B (verde),
 * Proyecto C (amarillo por retroceso y atraso 3), Proyecto D (cerrado).
 */

import { formatFechaISO, sumarDiasHabiles, diasHabilesEntre } from "../supabase/functions/_shared/fechas.ts";
import { calcularProyecto } from "../supabase/functions/_shared/reglas.ts";
import type { SyncPayload, ProyectoN, EtapaN, BloqueoN, TareaN, ParametrosCalculo } from "../supabase/functions/_shared/tipos.ts";

const params: ParametrosCalculo = {
  dias_por_bloqueo: 5,
  umbral_atraso_rojo_dh: 5,
  umbral_bloqueo_rojo_dh: 5,
  dias_frescura: 7,
  duracion_default_dh: 5,
};

// Cargar feriados
let feriadosSet = new Set<string>();
try {
  const fRaw = await Deno.readTextFile("supabase/feriados.json");
  const fList = JSON.parse(fRaw);
  feriadosSet = new Set(fList.map((f: any) => f.fecha));
} catch {
  console.warn("No se encontró supabase/feriados.json, usando conjunto básico");
}

const hoy = "2026-10-21";

// 1. Proyectos
const proyectos: ProyectoN[] = [
  {
    id: "a0000000-0000-0000-0000-000000000001",
    notion_id: "notion-proj-a",
    nombre: "Portal Proveedores (Proyecto A)",
    area_solicitante: "Operaciones",
    solicitante_nombre: "Valeria Soto",
    solicitante_email: "valeria.soto@empresa.cl",
    responsable_comunicar_nombre: "Jose Miguel",
    responsable_comunicar_email: "jose.miguel@empresa.cl",
    fecha_comprometida: "2026-11-06",
    notion_url: "https://notion.so/empresa/proj-a",
  },
  {
    id: "b0000000-0000-0000-0000-000000000002",
    notion_id: "notion-proj-b",
    nombre: "Integración ERP (Proyecto B)",
    area_solicitante: "Comercial",
    solicitante_nombre: "Esteban Lagos",
    solicitante_email: "esteban.lagos@empresa.cl",
    responsable_comunicar_nombre: "Jose Miguel",
    responsable_comunicar_email: "jose.miguel@empresa.cl",
    fecha_comprometida: "2026-12-15",
    notion_url: "https://notion.so/empresa/proj-b",
  },
  {
    id: "c0000000-0000-0000-0000-000000000003",
    notion_id: "notion-proj-c",
    nombre: "Automatización Compliance (Proyecto C)",
    area_solicitante: "Compliance",
    solicitante_nombre: "Camila Rivas",
    solicitante_email: "camila.rivas@empresa.cl",
    responsable_comunicar_nombre: "Jose Miguel",
    responsable_comunicar_email: "jose.miguel@empresa.cl",
    fecha_comprometida: "2026-11-10",
    notion_url: "https://notion.so/empresa/proj-c",
  },
  {
    id: "d0000000-0000-0000-0000-000000000004",
    notion_id: "notion-proj-d",
    nombre: "Migración Cloud Core (Proyecto D)",
    area_solicitante: "Operaciones",
    solicitante_nombre: "Valeria Soto",
    solicitante_email: "valeria.soto@empresa.cl",
    responsable_comunicar_nombre: "Jose Miguel",
    responsable_comunicar_email: "jose.miguel@empresa.cl",
    fecha_comprometida: "2026-10-15",
    notion_url: "https://notion.so/empresa/proj-d",
  },
];

// 2. Etapas
const etapas: EtapaN[] = [
  // Proyecto A: en QA con bloqueo abierto hace 6 dh -> ROJO
  {
    id: "e0000000-0000-0000-0000-0000000000a1",
    notion_id: "notion-etapa-a1",
    proyecto_id: proyectos[0].id,
    proyecto_notion_id: proyectos[0].notion_id,
    nombre: "Levantamiento",
    orden: 1,
    responsable_nombre: "Carlos Dev",
    responsable_email: "carlos.dev@empresa.cl",
    estado: "Completada",
    fin_real: "2026-10-05",
    duracion_dh: 5,
  },
  {
    id: "e0000000-0000-0000-0000-0000000000a2",
    notion_id: "notion-etapa-a2",
    proyecto_id: proyectos[0].id,
    proyecto_notion_id: proyectos[0].notion_id,
    nombre: "Desarrollo",
    orden: 2,
    responsable_nombre: "Carlos Dev",
    responsable_email: "carlos.dev@empresa.cl",
    estado: "Completada",
    fin_real: "2026-10-12",
    duracion_dh: 5,
  },
  {
    id: "e0000000-0000-0000-0000-0000000000a3",
    notion_id: "notion-etapa-a3",
    proyecto_id: proyectos[0].id,
    proyecto_notion_id: proyectos[0].notion_id,
    nombre: "QA",
    orden: 3,
    responsable_nombre: "Paula QA",
    responsable_email: "paula.qa@empresa.cl",
    estado: "En curso",
    inicio_real: "2026-10-13",
    duracion_dh: 5,
  },
  {
    id: "e0000000-0000-0000-0000-0000000000a4",
    notion_id: "notion-etapa-a4",
    proyecto_id: proyectos[0].id,
    proyecto_notion_id: proyectos[0].notion_id,
    nombre: "Despliegue",
    orden: 4,
    responsable_nombre: "Carlos Dev",
    responsable_email: "carlos.dev@empresa.cl",
    estado: "Pendiente",
    duracion_dh: 2,
  },

  // Proyecto B: en Desarrollo, al día -> VERDE
  {
    id: "e0000000-0000-0000-0000-0000000000b1",
    notion_id: "notion-etapa-b1",
    proyecto_id: proyectos[1].id,
    proyecto_notion_id: proyectos[1].notion_id,
    nombre: "Levantamiento",
    orden: 1,
    responsable_nombre: "Carlos Dev",
    responsable_email: "carlos.dev@empresa.cl",
    estado: "Completada",
    fin_real: "2026-10-10",
    duracion_dh: 4,
  },
  {
    id: "e0000000-0000-0000-0000-0000000000b2",
    notion_id: "notion-etapa-b2",
    proyecto_id: proyectos[1].id,
    proyecto_notion_id: proyectos[1].notion_id,
    nombre: "Desarrollo",
    orden: 2,
    responsable_nombre: "Carlos Dev",
    responsable_email: "carlos.dev@empresa.cl",
    estado: "En curso",
    inicio_real: "2026-10-14",
    duracion_dh: 15,
  },
  {
    id: "e0000000-0000-0000-0000-0000000000b3",
    notion_id: "notion-etapa-b3",
    proyecto_id: proyectos[1].id,
    proyecto_notion_id: proyectos[1].notion_id,
    nombre: "QA",
    orden: 3,
    responsable_nombre: "Paula QA",
    responsable_email: "paula.qa@empresa.cl",
    estado: "Pendiente",
    duracion_dh: 5,
  },

  // Proyecto C: retroceso de QA a Desarrollo, atraso 3 -> AMARILLO, etapa 3 sin responsable
  {
    id: "e0000000-0000-0000-0000-0000000000c1",
    notion_id: "notion-etapa-c1",
    proyecto_id: proyectos[2].id,
    proyecto_notion_id: proyectos[2].notion_id,
    nombre: "Levantamiento",
    orden: 1,
    responsable_nombre: "Carlos Dev",
    responsable_email: "carlos.dev@empresa.cl",
    estado: "Completada",
    fin_real: "2026-10-05",
    duracion_dh: 4,
  },
  {
    id: "e0000000-0000-0000-0000-0000000000c2",
    notion_id: "notion-etapa-c2",
    proyecto_id: proyectos[2].id,
    proyecto_notion_id: proyectos[2].notion_id,
    nombre: "Desarrollo",
    orden: 2,
    responsable_nombre: "Carlos Dev",
    responsable_email: "carlos.dev@empresa.cl",
    estado: "En curso", // reabierta
    inicio_real: "2026-10-16",
    duracion_dh: 10,
  },
  {
    id: "e0000000-0000-0000-0000-0000000000c3",
    notion_id: "notion-etapa-c3",
    proyecto_id: proyectos[2].id,
    proyecto_notion_id: proyectos[2].notion_id,
    nombre: "Aprobación Seguridad",
    orden: 3,
    responsable_nombre: null,
    responsable_email: null, // Genera alerta de gobierno
    estado: "Pendiente",
    duracion_dh: 5,
  },

  // Proyecto D: Cerrado
  {
    id: "e0000000-0000-0000-0000-0000000000d1",
    notion_id: "notion-etapa-d1",
    proyecto_id: proyectos[3].id,
    proyecto_notion_id: proyectos[3].notion_id,
    nombre: "Ejecución y Cierre",
    orden: 1,
    responsable_nombre: "Carlos Dev",
    responsable_email: "carlos.dev@empresa.cl",
    estado: "Completada",
    fin_real: "2026-10-14",
    duracion_dh: 10,
  },
];

// 3. Bloqueos
const bloqueos: BloqueoN[] = [
  // Bloqueo QA en Proyecto A: abierto hace 6 días hábiles (desde 2026-10-13)
  {
    id: "b0000000-0000-0000-0000-000000000001",
    notion_id: "notion-bloq-a1",
    proyecto_id: proyectos[0].id,
    proyecto_notion_id: proyectos[0].notion_id,
    etapa_id: etapas[2].id,
    etapa_notion_id: etapas[2].notion_id,
    descripcion: "Pendiente firma de matriz de pruebas UAT",
    motivo: "Aprobación QA",
    area_destraba: "QA",
    fecha_apertura: "2026-10-13",
  },
];

// 4. Tareas
const tareas: TareaN[] = [
  {
    id: "t0000000-0000-0000-0000-000000000001",
    notion_id: "notion-tar-1",
    proyecto_id: proyectos[0].id,
    proyecto_notion_id: proyectos[0].notion_id,
    etapa_id: etapas[2].id,
    etapa_notion_id: etapas[2].notion_id,
    nombre: "Revisar ambientes de staging",
    responsable_nombre: "Paula QA",
    responsable_email: "paula.qa@empresa.cl",
    estado: "En curso",
  },
];

// 5. Usuarios y Roles
const usuarios = [
  { email: "admin@empresa.cl", nombre: "Administrador General", rol: "Admin", area: null },
  { email: "gerencia@empresa.cl", nombre: "Gerente Operaciones y TI", rol: "Gerencia", area: null },
  { email: "valeria.soto@empresa.cl", nombre: "Valeria Soto", rol: "Solicitante", area: "Operaciones" },
  { email: "esteban.lagos@empresa.cl", nombre: "Esteban Lagos", rol: "Solicitante", area: "Comercial" },
  { email: "jose.miguel@empresa.cl", nombre: "José Miguel (Líder)", rol: "Ejecutor", area: "TI" },
  { email: "carlos.dev@empresa.cl", nombre: "Carlos Desarrollador", rol: "Ejecutor", area: "TI" },
];

// Guardar fixture JSON normalizado
const fixturePayload: SyncPayload = {
  fuente: "fixture",
  leido_en: new Date().toISOString(),
  proyectos,
  etapas,
  bloqueos,
  tareas,
};
await Deno.writeTextFile("fixtures/notion/datos.json", JSON.stringify(fixturePayload, null, 2));

// Generar cálculos para seed SQL
const calculosSql: string[] = [];
for (const p of proyectos) {
  const pEtapas = etapas.filter((e) => e.proyecto_id === p.id);
  const pBloqueos = bloqueos.filter((b) => b.proyecto_id === p.id);
  const calc = calcularProyecto(p, pEtapas, pBloqueos, null, hoy, feriadosSet, params);

  const motivosSql = `ARRAY[${calc.motivos_semaforo.map((m) => `'${m.replace(/'/g, "''")}'`).join(",")}]`;
  const alertasSql = `ARRAY[${calc.alertas_gobierno.map((a) => `'${a.replace(/'/g, "''")}'`).join(",")}]`;
  const desgloseJson = JSON.stringify(calc.desglose).replace(/'/g, "''");

  calculosSql.push(`
    INSERT INTO proyecto_calculo (
      proyecto_id, etapa_actual_id, avance_pct, etapas_completadas, etapas_total,
      fecha_reproyectada, atraso_dh, semaforo, motivos_semaforo, bloqueos_abiertos,
      ultima_actualizacion, sin_actualizar, alertas_gobierno, desglose, cerrado, calculado_en
    ) VALUES (
      '${p.id}', ${calc.etapa_actual_id ? `'${calc.etapa_actual_id}'` : "NULL"}, ${calc.avance_pct}, ${calc.etapas_completadas}, ${calc.etapas_total},
      ${calc.fecha_reproyectada ? `'${calc.fecha_reproyectada}'` : "NULL"}, ${calc.atraso_dh}, '${calc.semaforo}', ${motivosSql}, ${calc.bloqueos_abiertos},
      '${calc.ultima_actualizacion}', ${calc.sin_actualizar}, ${alertasSql}, '${desgloseJson}'::jsonb, ${calc.cerrado}, now()
    );
  `);
}

// Armar seed.sql completo
let seedSql = `-- Seed generado automáticamente por scripts/seed.ts
-- Fecha base de simulación: ${hoy}

-- Parámetros iniciales
INSERT INTO parametro (clave, valor, descripcion) VALUES
  ('dias_por_bloqueo', '5'::jsonb, 'Días hábiles añadidos a la proyección por cada bloqueo abierto'),
  ('umbral_atraso_rojo_dh', '5'::jsonb, 'Días hábiles de atraso para pasar semáforo a rojo'),
  ('umbral_bloqueo_rojo_dh', '5'::jsonb, 'Antigüedad en días hábiles de un bloqueo para pasar semáforo a rojo'),
  ('dias_frescura', '7'::jsonb, 'Días calendario tolerados sin edición antes de marcar sin_actualizar'),
  ('duracion_default_dh', '5'::jsonb, 'Duración por defecto en días hábiles cuando una etapa no tiene estimación'),
  ('canal_slack_piloto', '"#piloto-proyectos"'::jsonb, 'Canal de Slack para publicar avisos'),
  ('url_app', '"http://localhost:5173"'::jsonb, 'URL de la aplicación frontend'),
  ('inicio_piloto', '"2026-10-20"'::jsonb, 'Fecha oficial de inicio de medición del piloto')
ON CONFLICT (clave) DO NOTHING;

-- Usuarios del seed
${usuarios
  .map(
    (u) =>
      `INSERT INTO usuario_rol (email, nombre, rol, area, activo) VALUES ('${u.email}', '${u.nombre}', '${u.rol}', ${u.area ? `'${u.area}'` : "NULL"}, true) ON CONFLICT (email) DO UPDATE SET rol=EXCLUDED.rol, area=EXCLUDED.area;`
  )
  .join("\n")}

-- Proyectos
${proyectos
  .map(
    (p) =>
      `INSERT INTO proyecto (id, notion_id, nombre, area_solicitante, solicitante_nombre, solicitante_email, responsable_comunicar_nombre, responsable_comunicar_email, fecha_comprometida, notion_url) VALUES ('${p.id}', '${p.notion_id}', '${p.nombre}', '${p.area_solicitante}', '${p.solicitante_nombre}', '${p.solicitante_email}', '${p.responsable_comunicar_nombre}', '${p.responsable_comunicar_email}', ${p.fecha_comprometida ? `'${p.fecha_comprometida}'` : "NULL"}, '${p.notion_url}') ON CONFLICT (id) DO NOTHING;`
  )
  .join("\n")}

-- Etapas
${etapas
  .map(
    (e) =>
      `INSERT INTO etapa (id, notion_id, proyecto_id, nombre, orden, responsable_nombre, responsable_email, estado, inicio_real, fin_real, duracion_dh) VALUES ('${e.id}', '${e.notion_id}', '${e.proyecto_id}', '${e.nombre}', ${e.orden}, ${e.responsable_nombre ? `'${e.responsable_nombre}'` : "NULL"}, ${e.responsable_email ? `'${e.responsable_email}'` : "NULL"}, '${e.estado}', ${e.inicio_real ? `'${e.inicio_real}'` : "NULL"}, ${e.fin_real ? `'${e.fin_real}'` : "NULL"}, ${e.duracion_dh}) ON CONFLICT (id) DO NOTHING;`
  )
  .join("\n")}

-- Bloqueos
${bloqueos
  .map(
    (b) =>
      `INSERT INTO bloqueo (id, notion_id, proyecto_id, etapa_id, descripcion, motivo, area_destraba, fecha_apertura) VALUES ('${b.id}', '${b.notion_id}', '${b.proyecto_id}', '${b.etapa_id}', '${b.descripcion}', '${b.motivo}', '${b.area_destraba}', '${b.fecha_apertura}') ON CONFLICT (id) DO NOTHING;`
  )
  .join("\n")}

-- Tareas
${tareas
  .map(
    (t) =>
      `INSERT INTO tarea (id, notion_id, proyecto_id, etapa_id, nombre, responsable_nombre, responsable_email, estado) VALUES ('${t.id}', '${t.notion_id}', '${t.proyecto_id}', '${t.etapa_id}', '${t.nombre}', '${t.responsable_nombre}', '${t.responsable_email}', '${t.estado}') ON CONFLICT (id) DO NOTHING;`
  )
  .join("\n")}

-- Cálculos persistidos
${calculosSql.join("\n")}

-- Snapshots iniciales de proyección
${proyectos
  .map(
    (p) =>
      `INSERT INTO proyeccion_snapshot (proyecto_id, fecha, fecha_reproyectada, atraso_dh, semaforo) SELECT proyecto_id, CURRENT_DATE, fecha_reproyectada, atraso_dh, semaforo FROM proyecto_calculo WHERE proyecto_id = '${p.id}' ON CONFLICT (proyecto_id, fecha) DO NOTHING;`
  )
  .join("\n")}

-- Eventos de cambio iniciales (historial)
INSERT INTO evento_cambio (proyecto_id, entidad, entidad_id, campo, valor_anterior, valor_nuevo, tipo, detectado_en) VALUES
  ('${proyectos[0].id}', 'etapa', '${etapas[2].id}', 'estado', '"Pendiente"', '"En curso"', 'actualizado', now() - interval '6 days'),
  ('${proyectos[0].id}', 'bloqueo', '${bloqueos[0].id}', '*', null, '{"descripcion":"Pendiente firma matriz UAT"}'::jsonb, 'creado', now() - interval '6 days'),
  ('${proyectos[2].id}', 'etapa', '${etapas[5].id}', 'estado', '"Completada"', '"En curso"', 'retroceso', now() - interval '2 days');
`;

await Deno.writeTextFile("supabase/seed.sql", seedSql);
console.log("Seed generado exitosamente en supabase/seed.sql y fixtures/notion/datos.json");
