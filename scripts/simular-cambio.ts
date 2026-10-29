/**
 * scripts/simular-cambio.ts
 * Simula escenarios para demos y criterios de aceptación:
 * - abrir-bloqueo: agrega un nuevo bloqueo en el Proyecto B y corre sync
 * - retroceso: regresa una etapa completada a En curso en Proyecto B
 * - cerrar-bloqueo: cierra el bloqueo activo en Proyecto A
 */

import { sincronizarLocal } from "./sync-local.ts";
import type { SyncPayload } from "../supabase/functions/_shared/tipos.ts";

const escenario = Deno.args[0] || "abrir-bloqueo";
console.log(`Ejecutando simulación de escenario: "${escenario}"...`);

const raw = await Deno.readTextFile("fixtures/notion/datos.json");
const payload: SyncPayload = JSON.parse(raw);

if (escenario === "abrir-bloqueo") {
  payload.bloqueos.push({
    id: "b-simulado-01",
    notion_id: "notion-bloq-sim-1",
    proyecto_id: payload.proyectos[1].id,
    proyecto_notion_id: payload.proyectos[1].notion_id,
    descripcion: "Falta acceso a servidor VPN de testing",
    motivo: "Infraestructura",
    area_destraba: "Infraestructura",
    fecha_apertura: new Date().toISOString().split("T")[0],
  });
  console.log(`-> Bloqueo nuevo agregado al Proyecto B ("${payload.proyectos[1].nombre}")`);
} else if (escenario === "retroceso") {
  const etapa = payload.etapas.find((e) => e.proyecto_notion_id === payload.proyectos[1].notion_id && e.orden === 1);
  if (etapa) {
    etapa.estado = "En curso";
    console.log(`-> Etapa "${etapa.nombre}" de Proyecto B marcada como retroceso a En curso.`);
  }
} else if (escenario === "cerrar-bloqueo") {
  if (payload.bloqueos.length > 0) {
    payload.bloqueos[0].fecha_cierre = new Date().toISOString().split("T")[0];
    console.log(`-> Bloqueo en Proyecto A cerrado exitosamente.`);
  }
}

const resultado = await sincronizarLocal(payload);
console.log(`Resultado simulación:`, resultado);
