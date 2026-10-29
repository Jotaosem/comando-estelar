import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

interface ReqBody {
  aviso_id: string;
  accion?: 'publicar' | 'descartar';
  mensaje?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret, x-publicado-por',
      },
    });
  }

  try {
    const syncSecret = Deno.env.get('SYNC_SECRET');
    const headerSecret = req.headers.get('x-sync-secret');
    const authHeader = req.headers.get('authorization');
    const slackToken = Deno.env.get('SLACK_BOT_TOKEN');

    let usuarioEmail: string | null = null;
    let esServiceOAdmin = false;

    // Validación de autenticación (Header x-sync-secret de Slack webhook o JWT Supabase)
    if (syncSecret && headerSecret === syncSecret) {
      esServiceOAdmin = true;
      usuarioEmail = req.headers.get('x-publicado-por') || 'n8n@bot.slack';
    } else if (authHeader) {
      const supabaseUserClient = createClient(
        Deno.env.get('SUPABASE_URL') || '',
        Deno.env.get('SUPABASE_ANON_KEY') || '',
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
      if (userError || !user?.email) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
      }
      usuarioEmail = user.email.toLowerCase();
    }

    if (!usuarioEmail) {
      return new Response(JSON.stringify({ error: 'Falta autenticación válida' }), { status: 401 });
    }

    const { aviso_id, accion = 'publicar', mensaje }: ReqBody = await req.json();
    if (!aviso_id) {
      return new Response(JSON.stringify({ error: 'aviso_id es requerido' }), { status: 400 });
    }

    // Usar cliente service role para actualizar estado del aviso
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Obtener aviso
    const { data: aviso, error: fetchErr } = await supabaseAdmin
      .from('aviso')
      .select('*, proyecto:proyecto_id(*)')
      .eq('id', aviso_id)
      .single();

    if (fetchErr || !aviso) {
      return new Response(JSON.stringify({ error: 'Aviso no encontrado' }), { status: 404 });
    }

    // Verificar si el usuario es responsable de comunicar o Admin
    if (!esServiceOAdmin) {
      const respComunicar = aviso.proyecto?.responsable_comunicar_email?.toLowerCase();
      const { data: usuarioRol } = await supabaseAdmin
        .from('usuario_rol')
        .select('rol')
        .eq('email', usuarioEmail)
        .single();

      const esAdmin = usuarioRol?.rol === 'Admin';
      if (respComunicar !== usuarioEmail && !esAdmin) {
        return new Response(
          JSON.stringify({ error: 'Solo el responsable de comunicar o un Administrador puede publicar este aviso' }),
          { status: 403 }
        );
      }
    }

    if (accion === 'descartar') {
      await supabaseAdmin
        .from('aviso')
        .update({ estado: 'descartado' })
        .eq('id', aviso_id);

      return new Response(JSON.stringify({ ok: true, estado: 'descartado' }), { status: 200 });
    }

    // Publicar en Slack si hay token configurado
    let slackTs: string | null = null;
    const textoMensaje = mensaje || aviso.mensaje;
    const canalSlack = aviso.canal || '#piloto-proyectos';

    if (slackToken) {
      const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${slackToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: canalSlack,
          text: textoMensaje,
        }),
      });

      const slackData = await slackRes.json();
      if (slackData.ok) {
        slackTs = slackData.ts;
      }
    } else {
      // Simulado en entorno local
      slackTs = `sim_${Date.now()}`;
    }

    // Actualizar registro en base de datos
    const { data: actualizado, error: updErr } = await supabaseAdmin
      .from('aviso')
      .update({
        estado: 'publicado',
        mensaje: textoMensaje,
        publicado_en: new Date().toISOString(),
        publicado_por: usuarioEmail,
        slack_ts: slackTs,
      })
      .eq('id', aviso_id)
      .select()
      .single();

    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true, aviso: actualizado }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), { status: 500 });
  }
});
