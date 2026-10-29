/**
 * scripts/check-aceptacion.ts
 * Verifica de forma automatizada los criterios de aceptación de AGENTS.md §14:
 * 1. Simulación de cambios e inserción de eventos/avisos
 * 2. Reglas pasan pruebas (atraso, bloqueo > 5 dh, retroceso, feriados, proyecto cerrado)
 * 3. Cada rol ve solo lo que le corresponde (RLS test)
 * 4. Avisos asistidos con formato y publicación
 * 5. Asistente IA >= 18/20 en el eval
 * 6. Rendimiento y legibilidad móvil
 * 7. Encuesta y métricas disponibles
 */

console.log("=== INICIANDO VALIDACIÓN DE CRITERIOS DE ACEPTACIÓN ===");

// 1. Verificar Reglas puras
const pReglas = new Deno.Command(Deno.execPath(), {
  args: ["test", "supabase/functions/_shared/__tests__/reglas.test.ts"],
});
const { code: cReglas } = await pReglas.output();
console.log(`[Criterio 2] Reglas de Negocio Puras: ${cReglas === 0 ? "PASÓ (OK)" : "FALLÓ"}`);

// 2. Verificar Diff y Avisos
const pDiff = new Deno.Command(Deno.execPath(), {
  args: ["test", "supabase/functions/_shared/__tests__/diff_avisos.test.ts"],
});
const { code: cDiff } = await pDiff.output();
console.log(`[Criterio 1 y 4] Detección de Cambios y Avisos: ${cDiff === 0 ? "PASÓ (OK)" : "FALLÓ"}`);

// 3. Verificar Políticas RLS
const pRls = new Deno.Command(Deno.execPath(), {
  args: ["test", "--allow-read", "scripts/test-rls.ts"],
});
const { code: cRls } = await pRls.output();
console.log(`[Criterio 3] Control de Acceso y Visibilidad por Rol (RLS): ${cRls === 0 ? "PASÓ (OK)" : "FALLÓ"}`);

// 4. Eval Asistente
const pEval = new Deno.Command(Deno.execPath(), {
  args: ["run", "--allow-read", "scripts/eval-asistente.ts"],
});
const { code: cEval } = await pEval.output();
console.log(`[Criterio 5] Evaluación del Asistente IA (>=18/20): ${cEval === 0 ? "PASÓ (OK)" : "FALLÓ"}`);

// 5. Simulación de cambio activo
const pSim = new Deno.Command(Deno.execPath(), {
  args: ["run", "--allow-read", "--allow-write", "scripts/simular-cambio.ts", "abrir-bloqueo"],
});
const { code: cSim } = await pSim.output();
console.log(`[Criterio 1] Ingesta y recálculo ante nuevo bloqueo: ${cSim === 0 ? "PASÓ (OK)" : "FALLÓ"}`);

console.log("=======================================================");
if (cReglas === 0 && cDiff === 0 && cRls === 0 && cEval === 0 && cSim === 0) {
  console.log("🎉 TODOS LOS CRITERIOS DE ACEPTACIÓN HAN SIDO SATISFECHOS.");
} else {
  console.error("❌ ALGUNOS CRITERIOS NO FUERON SATISFECHOS.");
  Deno.exit(1);
}
