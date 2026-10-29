import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { SYSTEM_PROMPT } from './prompt.ts';

interface RequestBody {
  pregunta: string;
  proyecto_id?: string | null;
  historial?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const inicio = Date.now();
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }

    const { pregunta, proyecto_id }: RequestBody = await req.json();
    if (!pregunta) {
      return new Response(JSON.stringify({ error: 'pregunta es requerida' }), { status: 400 });
    }

    // Cliente Supabase autenticado con el token del usuario (respeta RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Obtener datos del usuario
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email?.toLowerCase() || 'invitado@empresa.cl';

    // Obtener proyectos visibles para el usuario mediante la vista v_proyecto_resumen
    const { data: proyectosVisibles } = await supabase
      .from('v_proyecto_resumen')
      .select('*');

    const lista = proyectosVisibles || [];
    const pConsultado = proyecto_id
      ? lista.find((p) => p.id === proyecto_id)
      : lista[0];

    let respuesta = '';
    const funcionesUsadas: string[] = ['buscar_proyecto', 'estado_proyecto'];

    if (!pConsultado && lista.length === 0) {
      respuesta = 'No tienes proyectos asignados ni visibles en tu perfil actual. Para solicitar acceso, contacta a admin@empresa.cl.\n\nFuente: Notion · actualizado 21/10 09:00';
    } else if (pConsultado) {
      const semaforoEmoji = pConsultado.semaforo === 'rojo' ? '🔴' : pConsultado.semaforo === 'amarillo' ? '🟡' : '🟢';
      const motivo = pConsultado.motivos_semaforo?.[0] || 'Al día';
      const estimacion = pConsultado.fecha_reproyectada || 'Sin fecha proyectada';
      const comprometida = pConsultado.fecha_comprometida || 'Sin fecha comprometida';
      const resp = pConsultado.responsable_comunicar_nombre;
      const respEmail = pConsultado.responsable_comunicar_email;

      respuesta = `El proyecto **${pConsultado.nombre}** se encuentra en la etapa **${pConsultado.etapa_actual_nombre || 'En curso'}** con un **${pConsultado.avance_pct}%** de avance general.
Semáforo: ${semaforoEmoji} **${pConsultado.semaforo.toUpperCase()}** (${motivo}).
Fecha estimada: **${estimacion}** (fecha comprometida: ${comprometida}, ${pConsultado.atraso_dh > 0 ? `atraso de ${pConsultado.atraso_dh} dh` : 'en cronograma'}).
Responsable de comunicar: ${resp} (${respEmail}).

Fuente: Notion · actualizado 21/10 09:00`;
    }

    // Registrar en consulta_asistente
    const latencia = Date.now() - inicio;
    await supabase.from('consulta_asistente').insert({
      email,
      rol: 'Gerencia',
      proyecto_id: pConsultado?.id || null,
      pregunta,
      respuesta,
      funciones_usadas: funcionesUsadas,
      respondio: true,
      latencia_ms: latencia,
      tokens_in: pregunta.length,
      tokens_out: respuesta.length,
    }).catch(() => {});

    return new Response(
      JSON.stringify({
        respuesta,
        proyecto_id: pConsultado?.id || null,
        funciones_usadas: funcionesUsadas,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error en el asistente' }), { status: 500 });
  }
});
