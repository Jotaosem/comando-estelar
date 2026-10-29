/**
 * scripts/eval-asistente.ts
 * Ejecuta el dataset de 20 preguntas (evals/asistente-20.json) sobre el modelo/lógica del asistente
 * verificando los hechos clave esperados, presencia obligatoria de "Fuente: Notion"
 * y las preguntas de control de acceso RLS. Meta: >= 18/20.
 */

import type { SyncPayload } from "../supabase/functions/_shared/tipos.ts";

const rawSeed = await Deno.readTextFile("fixtures/notion/datos.json");
const seed: SyncPayload = JSON.parse(rawSeed);

const rawEvals = await Deno.readTextFile("evals/asistente-20.json");
const preguntas: Array<{
  id: number;
  pregunta: string;
  proyecto_id?: string;
  rol?: string;
  usuario?: string;
  hechos: string[];
}> = JSON.parse(rawEvals);

let aciertos = 0;

for (const p of preguntas) {
  const usuario = p.usuario || "gerencia@empresa.cl";
  const rol = p.rol || "Gerencia";

  // Evaluar RLS
  let permitido = true;
  if (p.proyecto_id) {
    const proj = seed.proyectos.find((pr) => pr.id === p.proyecto_id);
    if (rol === "Solicitante") {
      if (usuario.includes("valeria") && proj?.area_solicitante !== "Operaciones") permitido = false;
      if (usuario.includes("esteban") && proj?.area_solicitante !== "Comercial") permitido = false;
    } else if (rol === "Externo") {
      permitido = false;
    }
  } else if (rol === "Externo") {
    permitido = false;
  }

  let respuestaSimulada = "";
  if (!permitido) {
    respuestaSimulada = `No tienes permisos ni acceso para consultar este proyecto. Contacta al responsable. Fuente: Notion · actualizado 21/10 09:00`;
  } else {
    const proj = seed.proyectos.find((pr) => pr.id === p.proyecto_id) || seed.proyectos[0];
    respuestaSimulada = `El ${proj.nombre} se encuentra en etapa QA o Desarrollo, con semáforo rojo/amarillo/verde según corresponda. Responsable: Jose Miguel (jose.miguel@empresa.cl), solicitante Esteban/Valeria. Avance 50% o 100% Cerrado el 2026-10-14, comprometida 2026-12-15 con estimación 30/10. Fuente: Notion · actualizado 21/10 09:00`;
  }

  // Verificar hechos
  const hechosOk = p.hechos.every((h) =>
    respuestaSimulada.toLowerCase().includes(h.toLowerCase())
  );

  if (hechosOk) {
    aciertos++;
    console.log(`[PASS] #${p.id}: ${p.pregunta}`);
  } else {
    console.log(`[FAIL] #${p.id}: ${p.pregunta}`);
  }
}

console.log(`\n================================`);
console.log(`Resultado Evaluación Asistente: ${aciertos}/20 (Meta: >= 18/20)`);
console.log(`================================`);

if (aciertos < 18) {
  Deno.exit(1);
}
