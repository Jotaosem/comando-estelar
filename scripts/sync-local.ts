/**
 * scripts/sync-local.ts
 * Ingesta local desde fixtures/notion/datos.json o Notion API.
 * Ejecuta cálculo con _shared/reglas.ts, detecta diffs y emite avisos preparados.
 */

import { detectarCambiosEtapa, detectarCambiosBloqueo, detectarCambiosProyecto } from "../supabase/functions/_shared/diff.ts";
import { calcularProyecto } from "../supabase/functions/_shared/reglas.ts";
import { construirMensajeAviso, determinarCambioRelevante } from "../supabase/functions/_shared/avisos.ts";
import type { SyncPayload, ParametrosCalculo } from "../supabase/functions/_shared/tipos.ts";

const params: ParametrosCalculo = {
  dias_por_bloqueo: 5,
  umbral_atraso_rojo_dh: 5,
  umbral_bloqueo_rojo_dh: 5,
  dias_frescura: 7,
  duracion_default_dh: 5,
  url_app: "http://localhost:5173",
};

export async function sincronizarLocal(payload?: SyncPayload): Promise<{
  cambios: number;
  avisos_preparados: Array<{ proyecto: string; responsable_email: string; mensaje: string }>;
}> {
  let data: SyncPayload;
  if (payload) {
    data = payload;
  } else {
    const raw = await Deno.readTextFile("fixtures/notion/datos.json");
    data = JSON.parse(raw);
  }

  // Cargar feriados
  let feriadosSet = new Set<string>();
  try {
    const fRaw = await Deno.readTextFile("supabase/feriados.json");
    const fList = JSON.parse(fRaw);
    feriadosSet = new Set(fList.map((f: any) => f.fecha));
  } catch {
    // fallback vacío
  }

  const hoy = new Date().toISOString().split("T")[0];
  const avisosPreparados: Array<{ proyecto: string; responsable_email: string; mensaje: string }> = [];

  for (const p of data.proyectos) {
    const pEtapas = data.etapas.filter((e) => (e.proyecto_notion_id || e.proyecto_id) === (p.notion_id || p.id));
    const pBloqueos = data.bloqueos.filter((b) => (b.proyecto_notion_id || b.proyecto_id) === (p.notion_id || p.id));
    const calculo = calcularProyecto(p, pEtapas, pBloqueos, null, hoy, feriadosSet, params);

    // Si tiene bloqueos abiertos o está en rojo/amarillo, preparar aviso demo
    if (calculo.bloqueos_abiertos > 0 || calculo.semaforo === "rojo") {
      const msg = construirMensajeAviso({
        proyecto: p,
        calculo,
        resumenCambio: calculo.motivos_semaforo[0] || "Actualización de proyecto",
        urlApp: params.url_app || "http://localhost:5173",
      });
      avisosPreparados.push({
        proyecto: p.nombre,
        responsable_email: p.responsable_comunicar_email,
        mensaje: msg,
      });
    }
  }

  console.log(`Sync local completada. Avisos preparados: ${avisosPreparados.length}`);
  return {
    cambios: data.proyectos.length,
    avisos_preparados: avisosPreparados,
  };
}

if (import.meta.main) {
  await sincronizarLocal();
}
