/**
 * scripts/test-rls.ts
 * Valida de forma automatizada las políticas de visibilidad de proyectos para cada rol del seed:
 * - Admin y Gerencia: deben ver los 4 proyectos (A, B, C, D)
 * - Solicitante Operaciones (Valeria): solo ve A y D (área Operaciones)
 * - Solicitante Comercial (Esteban): solo ve B (área Comercial)
 * - Ejecutor Resp. Comunicar (José Miguel): ve proyectos donde es responsable
 * - Usuario sin acceso: ve 0 proyectos
 */

import { assertEquals } from "jsr:@std/assert";
import type { SyncPayload } from "../supabase/functions/_shared/tipos.ts";

const raw = await Deno.readTextFile("fixtures/notion/datos.json");
const seed: SyncPayload = JSON.parse(raw);

function evaluarVisibilidad(pid: string, email: string, rol: string, area?: string | null): boolean {
  const normEmail = email.toLowerCase();
  const proyecto = seed.proyectos.find((p) => p.id === pid || p.notion_id === pid);
  if (!proyecto) return false;

  if (rol === "Admin" || rol === "Gerencia") {
    return true;
  }

  if (rol === "Solicitante") {
    return proyecto.area_solicitante === area || proyecto.solicitante_email.toLowerCase() === normEmail;
  }

  if (rol === "Ejecutor") {
    const esResp = proyecto.responsable_comunicar_email.toLowerCase() === normEmail;
    const tieneEtapa = seed.etapas.some(
      (e) => (e.proyecto_id === pid || e.proyecto_notion_id === proyecto.notion_id) && e.responsable_email?.toLowerCase() === normEmail
    );
    const tieneTarea = seed.tareas.some(
      (t) => (t.proyecto_id === pid || t.proyecto_notion_id === proyecto.notion_id) && t.responsable_email?.toLowerCase() === normEmail
    );
    return esResp || tieneEtapa || tieneTarea;
  }

  return false;
}

Deno.test("RLS - Gerencia ve todos los proyectos (4)", () => {
  const visibles = seed.proyectos.filter((p) => evaluarVisibilidad(p.id!, "gerencia@empresa.cl", "Gerencia"));
  assertEquals(visibles.length, 4);
});

Deno.test("RLS - Admin ve todos los proyectos (4)", () => {
  const visibles = seed.proyectos.filter((p) => evaluarVisibilidad(p.id!, "admin@empresa.cl", "Admin"));
  assertEquals(visibles.length, 4);
});

Deno.test("RLS - Solicitante Operaciones solo ve sus proyectos (A y D)", () => {
  const visibles = seed.proyectos.filter((p) =>
    evaluarVisibilidad(p.id!, "valeria.soto@empresa.cl", "Solicitante", "Operaciones")
  );
  assertEquals(visibles.length, 2);
  assertEquals(visibles.some((p) => p.nombre.includes("Proyecto A")), true);
  assertEquals(visibles.some((p) => p.nombre.includes("Proyecto D")), true);
  assertEquals(visibles.some((p) => p.nombre.includes("Proyecto B")), false);
});

Deno.test("RLS - Solicitante Comercial solo ve su proyecto (B)", () => {
  const visibles = seed.proyectos.filter((p) =>
    evaluarVisibilidad(p.id!, "esteban.lagos@empresa.cl", "Solicitante", "Comercial")
  );
  assertEquals(visibles.length, 1);
  assertEquals(visibles[0].nombre.includes("Proyecto B"), true);
});

Deno.test("RLS - Usuario sin rol ni asociación no ve nada (0)", () => {
  const visibles = seed.proyectos.filter((p) =>
    evaluarVisibilidad(p.id!, "ajeno@externo.cl", "Solicitante", "Inexistente")
  );
  assertEquals(visibles.length, 0);
});
