import { assertEquals } from "jsr:@std/assert";
import { detectarCambiosEtapa, detectarCambiosBloqueo } from "../diff.ts";
import { construirMensajeAviso, determinarCambioRelevante } from "../avisos.ts";
import type { EtapaN, BloqueoN, ProyectoN, CalculoResultado } from "../tipos.ts";

Deno.test("diff - detecta retroceso de Completada a En curso", () => {
  const anterior: EtapaN = {
    notion_id: "e1",
    nombre: "QA",
    orden: 2,
    estado: "Completada",
  };
  const actual: EtapaN = {
    notion_id: "e1",
    nombre: "QA",
    orden: 2,
    estado: "En curso",
  };

  const eventos = detectarCambiosEtapa(anterior, actual, "p1");
  const retroceso = eventos.find((e) => e.tipo === "retroceso");
  assertEquals(retroceso !== undefined, true);
  assertEquals(retroceso?.valor_anterior, "Completada");
  assertEquals(retroceso?.valor_nuevo, "En curso");
});

Deno.test("diff - idempotencia si no hay cambios", () => {
  const etapa: EtapaN = {
    notion_id: "e1",
    nombre: "QA",
    orden: 2,
    estado: "En curso",
    responsable_email: "dev@empresa.cl",
  };
  const eventos = detectarCambiosEtapa({ ...etapa }, { ...etapa }, "p1");
  assertEquals(eventos.length, 0);
});

Deno.test("avisos - construir mensaje determinístico", () => {
  const proyecto: ProyectoN = {
    notion_id: "p1",
    nombre: "Portal Clientes",
    area_solicitante: "Operaciones",
    solicitante_nombre: "Juan Perez",
    solicitante_email: "juan@empresa.cl",
    responsable_comunicar_nombre: "Maria Gomez",
    responsable_comunicar_email: "maria@empresa.cl",
    fecha_comprometida: "2026-11-20",
  };

  const calculo: CalculoResultado = {
    etapa_actual_nombre: "QA",
    avance_pct: 60,
    etapas_completadas: 3,
    etapas_total: 5,
    fecha_reproyectada: "2026-11-25",
    atraso_dh: 3,
    semaforo: "amarillo",
    motivos_semaforo: ["Atraso de 3 días hábiles"],
    bloqueos_abiertos: 1,
    ultima_actualizacion: new Date().toISOString(),
    sin_actualizar: false,
    alertas_gobierno: [],
    desglose: {
      base: "2026-10-21",
      etapas: [],
      bloqueos: [{ descripcion: "Pendiente cert", motivo: "Seguridad", dias: 5 }],
      total_dh: 8,
      fecha: "2026-11-25",
    },
    cerrado: false,
    calculado_en: new Date().toISOString(),
  };

  const msg = construirMensajeAviso({
    proyecto,
    calculo,
    resumenCambio: "Nuevo bloqueo de Seguridad registrado",
    urlApp: "http://localhost:5173",
  });

  assertEquals(msg.includes("Portal Clientes"), true);
  assertEquals(msg.includes("🟡 Atraso de 3 días hábiles"), true);
  assertEquals(msg.includes("Bloqueos abiertos: 1 (Seguridad)"), true);
  assertEquals(msg.includes("http://localhost:5173/proyectos/p1"), true);
});
