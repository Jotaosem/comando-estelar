import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { detectarCambiosEtapa, detectarCambiosBloqueo, detectarCambiosProyecto } from '../_shared/diff.ts';
import { construirMensajeAviso, determinarCambioRelevante } from '../_shared/avisos.ts';
import { calcularProyecto } from '../_shared/reglas.ts';
import type { SyncPayload, ParametrosCalculo } from '../_shared/tipos.ts';

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
    const syncSecret = Deno.env.get('SYNC_SECRET');
    const headerSecret = req.headers.get('x-sync-secret');
    if (syncSecret && headerSecret !== syncSecret) {
      return new Response(JSON.stringify({ error: 'No autorizado: secret inválido' }), { status: 401 });
    }

    const payload: SyncPayload = await req.json();
    if (!payload.proyectos || !payload.etapas) {
      return new Response(JSON.stringify({ error: 'Payload incompleto o inválido' }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const avisosPreparados: any[] = [];
    let totalCambios = 0;

    // Registrar estado del sync
    await supabase.from('sync_estado').upsert({
      base: payload.fuente || 'notion',
      ultima_sync: new Date().toISOString(),
      resultado: 'ok',
      detalle: `Procesados ${payload.proyectos.length} proyectos`,
      registros: payload.proyectos.length,
    });

    const params: ParametrosCalculo = {
      dias_por_bloqueo: 5,
      umbral_atraso_rojo_dh: 5,
      umbral_bloqueo_rojo_dh: 5,
      dias_frescura: 7,
      duracion_default_dh: 5,
      url_app: Deno.env.get('URL_APP') || 'http://localhost:5173',
    };

    const hoy = new Date().toISOString().split('T')[0];
    const feriadosSet = new Set<string>();

    for (const p of payload.proyectos) {
      const pEtapas = payload.etapas.filter((e) => (e.proyecto_notion_id || e.proyecto_id) === (p.notion_id || p.id));
      const pBloqueos = payload.bloqueos?.filter((b) => (b.proyecto_notion_id || b.proyecto_id) === (p.notion_id || p.id)) || [];

      // Upsert proyecto
      await supabase.from('proyecto').upsert(
        {
          notion_id: p.notion_id,
          nombre: p.nombre,
          area_solicitante: p.area_solicitante,
          solicitante_nombre: p.solicitante_nombre,
          solicitante_email: p.solicitante_email,
          responsable_comunicar_nombre: p.responsable_comunicar_nombre,
          responsable_comunicar_email: p.responsable_comunicar_email,
          fecha_comprometida: p.fecha_comprometida,
          notion_url: p.notion_url,
          notion_editado_en: p.notion_editado_en,
        },
        { onConflict: 'notion_id' }
      );

      const calculo = calcularProyecto(p, pEtapas, pBloqueos, null, hoy, feriadosSet, params);

      // Si amerita aviso
      if (calculo.bloqueos_abiertos > 0 || calculo.semaforo === 'rojo' || calculo.atraso_dh > 0) {
        const msg = construirMensajeAviso({
          proyecto: p,
          calculo,
          resumenCambio: calculo.motivos_semaforo[0] || 'Actualización de estado',
          urlApp: params.url_app || 'http://localhost:5173',
        });

        avisosPreparados.push({
          proyecto: p.nombre,
          responsable_email: p.responsable_comunicar_email,
          mensaje: msg,
        });
      }
      totalCambios++;
    }

    return new Response(
      JSON.stringify({
        cambios: totalCambios,
        avisos_preparados: avisosPreparados,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error en sync-ingest' }), { status: 500 });
  }
});
