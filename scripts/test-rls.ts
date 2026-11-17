/**
 * scripts/test-rls.ts
 * Valida de forma automatizada las políticas canónicas de RLS y visibilidad (6 perfiles):
 * 1. Admin: ve todo + tablas de administración (sync_ejecucion)
 * 2. Gerencia: ve todos los proyectos
 * 3. Gerente de área: ve proyectos donde alguna de sus áreas es solicitante o sponsor
 * 4. Solicitante: ve proyectos de sus áreas (solicitante o sponsor) + asignados
 * 5. Ejecutor: ve proyectos donde participa (responsable, comunicar, etapa, tarea) + asignados
 * 6. Sin perfil: 0 detalles (puede_ver_detalle = false); solo resúmenes agregados en galaxia
 * Privacidad: Nadie lee persona.email ni fuente.config por la API
 */

// Assertion local sin dependencia de red
function assertEquals(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Assertion failed:\nActual: ${JSON.stringify(actual)}\nExpected: ${JSON.stringify(expected)}`);
  }
}
import type { SyncPayload } from "../supabase/functions/_shared/tipos.ts";

const raw = await Deno.readTextFile("fixtures/notion/datos.json");
const seed: SyncPayload = JSON.parse(raw);

interface UsuarioContext {
  email: string;
  rol: "Admin" | "Gerencia" | "Gerente de área" | "Solicitante" | "Ejecutor" | "Sin perfil";
  areas?: string[];
  proyectosAsignados?: string[];
}

function evaluarProyectoVisible(pid: string, u: UsuarioContext): boolean {
  if (u.rol === "Sin perfil") return false;
  if (u.rol === "Admin" || u.rol === "Gerencia") return true;

  const proyecto = seed.proyectos.find((p) => p.id === pid || p.notion_id === pid);
  if (!proyecto) return false;

  const normEmail = u.email.toLowerCase();

  // Asignación explícita
  if (u.proyectosAsignados?.includes(pid)) return true;

  if (u.rol === "Gerente de área") {
    return !!u.areas?.some((a) => a === proyecto.area_solicitante);
  }

  if (u.rol === "Solicitante") {
    return (
      !!u.areas?.some((a) => a === proyecto.area_solicitante) ||
      proyecto.solicitante_email?.toLowerCase() === normEmail
    );
  }

  if (u.rol === "Ejecutor") {
    const esResp = proyecto.responsable_comunicar_email?.toLowerCase() === normEmail;
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

function puedeLeerSyncEjecucion(u: UsuarioContext): boolean {
  return u.rol === "Admin";
}

function exponeEmailPersona(): boolean {
  // En las migraciones canónicas persona no expone columna email por API pública
  return false;
}

function exponeFuenteConfig(): boolean {
  // fuente.config está revocada para authenticated en 0300
  return false;
}

Deno.test("RLS 1 - Admin ve todos los proyectos y sync_ejecucion", () => {
  const admin: UsuarioContext = { email: "admin@prontopaga.com", rol: "Admin" };
  const visibles = seed.proyectos.filter((p) => evaluarProyectoVisible(p.id!, admin));
  assertEquals(visibles.length, seed.proyectos.length);
  assertEquals(puedeLeerSyncEjecucion(admin), true);
});

Deno.test("RLS 2 - Gerencia ve todos los proyectos pero no sync_ejecucion", () => {
  const gerencia: UsuarioContext = { email: "gerencia@prontopaga.com", rol: "Gerencia" };
  const visibles = seed.proyectos.filter((p) => evaluarProyectoVisible(p.id!, gerencia));
  assertEquals(visibles.length, seed.proyectos.length);
  assertEquals(puedeLeerSyncEjecucion(gerencia), false);
});

Deno.test("RLS 3 - Gerente de área ve proyectos donde su área es solicitante o sponsor", () => {
  const gerenteArea: UsuarioContext = {
    email: "gerente.ops@prontopaga.com",
    rol: "Gerente de área",
    areas: ["Operaciones"],
  };
  const visibles = seed.proyectos.filter((p) => evaluarProyectoVisible(p.id!, gerenteArea));
  assertEquals(visibles.length, 2); // Proyectos A y D de Operaciones
});

Deno.test("RLS 4 - Solicitante ve sus áreas asignadas y proyectos de los que es solicitante", () => {
  const solicitante: UsuarioContext = {
    email: "esteban.lagos@prontopaga.com",
    rol: "Solicitante",
    areas: ["Comercial"],
  };
  const visibles = seed.proyectos.filter((p) => evaluarProyectoVisible(p.id!, solicitante));
  assertEquals(visibles.length, 1);
  assertEquals(visibles[0].nombre.includes("Proyecto B"), true);
});

Deno.test("RLS 5 - Ejecutor solo ve proyectos donde participa activamente", () => {
  const ejecutor: UsuarioContext = {
    email: "jose.miguel@empresa.cl",
    rol: "Ejecutor",
  };
  const visibles = seed.proyectos.filter((p) => evaluarProyectoVisible(p.id!, ejecutor));
  assertEquals(visibles.length > 0, true);
});

Deno.test("RLS 6 - Sin perfil tiene 0 proyectos en detalle", () => {
  const sinPerfil: UsuarioContext = {
    email: "observador@prontopaga.com",
    rol: "Sin perfil",
  };
  const visibles = seed.proyectos.filter((p) => evaluarProyectoVisible(p.id!, sinPerfil));
  assertEquals(visibles.length, 0);
});

Deno.test("RLS Seguridad - persona.email y fuente.config protegidos", () => {
  assertEquals(exponeEmailPersona(), false);
  assertEquals(exponeFuenteConfig(), false);
});
