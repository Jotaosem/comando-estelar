import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { calcularProyecto } from '../_shared/reglas.ts';
import type { ParametrosCalculo } from '../_shared/tipos.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
      },
    });
  }

  try {
    const url = new URL(req.url);
    const guardarSnapshot = url.searchParams.get('snapshot') === 'true';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const { data: proyectos } = await supabase.from('proyecto').select('*').eq('eliminado', false);
    const { data: etapas } = await supabase.from('etapa').select('*').eq('eliminado', false);
    const { data: bloqueos } = await supabase.from('bloqueo').select('*').eq('eliminado', false);

    const params: ParametrosCalculo = {
      dias_por_bloqueo: 5,
      umbral_atraso_rojo_dh: 5,
      umbral_bloqueo_rojo_dh: 5,
      dias_frescura: 7,
      duracion_default_dh: 5,
    };

    const hoy = new Date().toISOString().split('T')[0];
    const feriadosSet = new Set<string>();

    let recalculados = 0;

    for (const p of proyectos || []) {
      const pEtapas = (etapas || []).filter((e) => e.proyecto_id === p.id);
      const pBloqueos = (bloqueos || []).filter((b) => b.proyecto_id === p.id);
      const calc = calcularProyecto(p, pEtapas, pBloqueos, null, hoy, feriadosSet, params);

      await supabase.from('proyecto_calculo').upsert({
        proyecto_id: p.id,
        etapa_actual_id: calc.etapa_actual_id,
        avance_pct: calc.avance_pct,
        etapas_completadas: calc.etapas_completadas,
        etapas_total: calc.etapas_total,
        fecha_reproyectada: calc.fecha_reproyectada,
        atraso_dh: calc.atraso_dh,
        semaforo: calc.semaforo,
        motivos_semaforo: calc.motivos_semaforo,
        bloqueos_abiertos: calc.bloqueos_abiertos,
        ultima_actualizacion: calc.ultima_actualizacion,
        sin_actualizar: calc.sin_actualizar,
        alertas_gobierno: calc.alertas_gobierno,
        desglose: calc.desglose,
        cerrado: calc.cerrado,
        calculado_en: new Date().toISOString(),
      });

      if (guardarSnapshot && calc.fecha_reproyectada) {
        await supabase.from('proyeccion_snapshot').upsert(
          {
            proyecto_id: p.id,
            fecha: hoy,
            fecha_reproyectada: calc.fecha_reproyectada,
            atraso_dh: calc.atraso_dh,
            semaforo: calc.semaforo,
          },
          { onConflict: 'proyecto_id,fecha' }
        );
      }
      recalculados++;
    }

    return new Response(JSON.stringify({ ok: true, recalculados, snapshot: guardarSnapshot }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error en recalcular' }), { status: 500 });
  }
});
