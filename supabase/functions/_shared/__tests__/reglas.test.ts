import { assertEquals } from "jsr:@std/assert";
import {
  esHabil,
  siguienteHabil,
  diasHabilesEntre,
  sumarDiasHabiles,
} from "../fechas.ts";
import { calcularProyecto } from "../reglas.ts";
import type { ProyectoN, EtapaN, BloqueoN, ParametrosCalculo } from "../tipos.ts";

const feriadosTest = new Set<string>([
  "2026-05-01", // Día del Trabajador
  "2026-05-21", // Glorias Navales
  "2026-09-18", // Fiestas Patrias
]);

const defaultParams: ParametrosCalculo = {
  dias_por_bloqueo: 5,
  umbral_atraso_rojo_dh: 5,
  umbral_bloqueo_rojo_dh: 5,
  dias_frescura: 7,
  duracion_default_dh: 5,
};

Deno.test("fechas - esHabil y fin de semana", () => {
  // Lunes habil
  assertEquals(esHabil("2026-05-04", feriadosTest), true);
  // Sábado
  assertEquals(esHabil("2026-05-02", feriadosTest), false);
  // Domingo
  assertEquals(esHabil("2026-05-03", feriadosTest), false);
  // Feriado
  assertEquals(esHabil("2026-05-01", feriadosTest), false);
});

Deno.test("fechas - siguienteHabil", () => {
  // Viernes 2026-05-01 es feriado, sab 2, dom 3 -> siguiente habil es lunes 2026-05-04
  assertEquals(siguienteHabil("2026-05-01", feriadosTest), "2026-05-04");
  // Lunes habil retorna el mismo día
  assertEquals(siguienteHabil("2026-05-04", feriadosTest), "2026-05-04");
});

Deno.test("fechas - diasHabilesEntre y sumarDiasHabiles con feriados", () => {
  // Entre 2026-04-30 (jueves) y 2026-05-05 (martes):
  // 05-01 feriado, 05-02 sab, 05-03 dom, 05-04 lun (1 dh), 05-05 mar (2 dh)
  assertEquals(diasHabilesEntre("2026-04-30", "2026-05-05", feriadosTest), 2);
  assertEquals(sumarDiasHabiles("2026-04-30", 2, feriadosTest), "2026-05-05");
});

Deno.test("reglas - proyecto sin atraso (verde)", () => {
  const hoy = "2026-06-01"; // Lunes
  const proyecto: ProyectoN = {
    notion_id: "p1",
    nombre: "Proyecto Alpha",
    area_solicitante: "Operaciones",
    solicitante_nombre: "Juan Perez",
    solicitante_email: "juan@empresa.cl",
    responsable_comunicar_nombre: "Maria Gomez",
    responsable_comunicar_email: "maria@empresa.cl",
    fecha_comprometida: "2026-06-15",
  };
  const etapas: EtapaN[] = [
    {
      notion_id: "e1",
      nombre: "Desarrollo",
      orden: 1,
      responsable_nombre: "Dev 1",
      responsable_email: "dev1@empresa.cl",
      estado: "En curso",
      inicio_real: "2026-06-01",
      duracion_dh: 5,
    },
  ];
  const bloqueos: BloqueoN[] = [];

  const res = calcularProyecto(proyecto, etapas, bloqueos, null, hoy, feriadosTest, defaultParams);
  assertEquals(res.semaforo, "verde");
  assertEquals(res.atraso_dh <= 0, true);
  assertEquals(res.cerrado, false);
});

Deno.test("reglas - atraso 3 dias (amarillo)", () => {
  const hoy = "2026-06-01"; // Lunes
  // base = 06-01 + 8 dh = 06-11
  // fecha comprometida = 06-08 (atraso 3 dh)
  const proyecto: ProyectoN = {
    notion_id: "p2",
    nombre: "Proyecto Beta",
    area_solicitante: "Comercial",
    solicitante_nombre: "Carlos Sol",
    solicitante_email: "carlos@empresa.cl",
    responsable_comunicar_nombre: "Maria Gomez",
    responsable_comunicar_email: "maria@empresa.cl",
    fecha_comprometida: "2026-06-08",
  };
  const etapas: EtapaN[] = [
    {
      notion_id: "e1",
      nombre: "Desarrollo",
      orden: 1,
      responsable_nombre: "Dev 1",
      responsable_email: "dev1@empresa.cl",
      estado: "En curso",
      inicio_real: "2026-06-01",
      duracion_dh: 8,
    },
  ];
  const res = calcularProyecto(proyecto, etapas, [], null, hoy, feriadosTest, defaultParams);
  assertEquals(res.semaforo, "amarillo");
  assertEquals(res.atraso_dh, 3);
});

Deno.test("reglas - atraso 8 dias (rojo)", () => {
  const hoy = "2026-06-01";
  const proyecto: ProyectoN = {
    notion_id: "p3",
    nombre: "Proyecto Gamma",
    area_solicitante: "Comercial",
    solicitante_nombre: "Carlos Sol",
    solicitante_email: "carlos@empresa.cl",
    responsable_comunicar_nombre: "Maria Gomez",
    responsable_comunicar_email: "maria@empresa.cl",
    fecha_comprometida: "2026-06-05",
  };
  const etapas: EtapaN[] = [
    {
      notion_id: "e1",
      nombre: "Desarrollo",
      orden: 1,
      responsable_nombre: "Dev 1",
      responsable_email: "dev1@empresa.cl",
      estado: "En curso",
      inicio_real: "2026-06-01",
      duracion_dh: 12,
    },
  ];
  const res = calcularProyecto(proyecto, etapas, [], null, hoy, feriadosTest, defaultParams);
  assertEquals(res.semaforo, "rojo");
  assertEquals(res.atraso_dh > 5, true);
});

Deno.test("reglas - bloqueo abierto 2 dias (amarillo) vs bloqueo 6 dias (rojo)", () => {
  const hoy = "2026-06-10"; // Miércoles
  const proyecto: ProyectoN = {
    notion_id: "p4",
    nombre: "Proyecto Delta",
    area_solicitante: "Comercial",
    solicitante_nombre: "Carlos Sol",
    solicitante_email: "carlos@empresa.cl",
    responsable_comunicar_nombre: "Maria Gomez",
    responsable_comunicar_email: "maria@empresa.cl",
    fecha_comprometida: "2026-07-01",
  };
  const etapas: EtapaN[] = [
    {
      notion_id: "e1",
      nombre: "QA",
      orden: 1,
      responsable_nombre: "Dev 1",
      responsable_email: "dev1@empresa.cl",
      estado: "En curso",
      duracion_dh: 2,
    },
  ];

  // Bloqueo 2 días abierto (desde 2026-06-08) -> amarillo
  const bloqueo2dias: BloqueoN[] = [
    {
      notion_id: "b1",
      descripcion: "Espera de QA",
      motivo: "Aprobación QA",
      area_destraba: "QA",
      fecha_apertura: "2026-06-08",
    },
  ];
  const resAmarillo = calcularProyecto(proyecto, etapas, bloqueo2dias, null, hoy, feriadosTest, defaultParams);
  assertEquals(resAmarillo.semaforo, "amarillo");

  // Bloqueo abierto hace 6 días hábiles (desde 2026-06-02) -> rojo
  const bloqueo6dias: BloqueoN[] = [
    {
      notion_id: "b2",
      descripcion: "Espera de QA",
      motivo: "Aprobación QA",
      area_destraba: "QA",
      fecha_apertura: "2026-06-02",
    },
  ];
  const resRojo = calcularProyecto(proyecto, etapas, bloqueo6dias, null, hoy, feriadosTest, defaultParams);
  assertEquals(resRojo.semaforo, "rojo");
});

Deno.test("reglas - proyecto cerrado", () => {
  const hoy = "2026-06-10";
  const proyecto: ProyectoN = {
    notion_id: "p5",
    nombre: "Proyecto Finalizado",
    area_solicitante: "Compliance",
    solicitante_nombre: "Ana Lopez",
    solicitante_email: "ana@empresa.cl",
    responsable_comunicar_nombre: "Maria Gomez",
    responsable_comunicar_email: "maria@empresa.cl",
    fecha_comprometida: "2026-06-05",
  };
  const etapas: EtapaN[] = [
    {
      notion_id: "e1",
      nombre: "Levantamiento",
      orden: 1,
      responsable_nombre: "Dev",
      responsable_email: "dev@empresa.cl",
      estado: "Completada",
      fin_real: "2026-06-04",
      duracion_dh: 3,
    },
    {
      notion_id: "e2",
      nombre: "Cierre",
      orden: 2,
      responsable_nombre: "Dev",
      responsable_email: "dev@empresa.cl",
      estado: "Completada",
      fin_real: "2026-06-05",
      duracion_dh: 2,
    },
  ];
  const res = calcularProyecto(proyecto, etapas, [], null, hoy, feriadosTest, defaultParams);
  assertEquals(res.cerrado, true);
  assertEquals(res.avance_pct, 100);
  assertEquals(res.fecha_reproyectada, "2026-06-05");
});

Deno.test("reglas - sin fecha comprometida (gris)", () => {
  const hoy = "2026-06-10";
  const proyecto: ProyectoN = {
    notion_id: "p6",
    nombre: "Proyecto Sin Fecha",
    area_solicitante: "Compliance",
    solicitante_nombre: "Ana Lopez",
    solicitante_email: "ana@empresa.cl",
    responsable_comunicar_nombre: "Maria Gomez",
    responsable_comunicar_email: "maria@empresa.cl",
    fecha_comprometida: null,
  };
  const etapas: EtapaN[] = [
    {
      notion_id: "e1",
      nombre: "Desarrollo",
      orden: 1,
      responsable_nombre: "Dev",
      responsable_email: "dev@empresa.cl",
      estado: "En curso",
      duracion_dh: 3,
    },
  ];
  const res = calcularProyecto(proyecto, etapas, [], null, hoy, feriadosTest, defaultParams);
  assertEquals(res.semaforo, "gris");
  assertEquals(res.alertas_gobierno.some((a) => a.includes("fecha comprometida")), true);
});
