import { supabase } from '../lib/supabase';

export interface MensajeHistorial {
  rol: 'user' | 'assistant';
  texto: string;
}

export interface PreguntarCopilotoParams {
  pregunta: string;
  proyectoId?: string | null;
  historial?: MensajeHistorial[];
}

export interface CopilotoExitoResponse {
  error: false;
  respuesta: string;
  datos_al?: string;
  proyectos_consultados?: string[];
  consulta_id: string | null;
  modo?: 'normal' | 'prueba';
}

export interface CopilotoErrorResponse {
  error: true;
  respuesta: string;
}

export type CopilotoResult = CopilotoExitoResponse | CopilotoErrorResponse;

const TIMEOUT_MS = 60000;

export async function preguntarCopiloto({
  pregunta,
  proyectoId = null,
  historial = [],
}: PreguntarCopilotoParams): Promise<CopilotoResult> {
  const copilotoUrl = import.meta.env.VITE_COPILOTO_URL;
  if (!copilotoUrl || typeof copilotoUrl !== 'string' || !copilotoUrl.trim()) {
    return {
      error: true,
      respuesta: 'Copiloto no configurado',
    };
  }

  // 1. Verificar sesión con Supabase Auth
  const { data: sessionData } = await supabase.auth.getSession();
  let token = sessionData?.session?.access_token;

  if (!token) {
    return {
      error: true,
      respuesta: 'Inicia sesión para usar el Copiloto',
    };
  }

  // Máximo 1000 caracteres para la pregunta
  const preguntaPayload = pregunta.slice(0, 1000);
  // Últimos 6 mensajes del historial, sin incluir la pregunta actual
  const historialPayload = (historial || []).slice(-6);

  const bodyPayload = JSON.stringify({
    pregunta: preguntaPayload,
    proyecto_id: proyectoId || null,
    historial: historialPayload,
  });

  const doFetch = async (authToken: string): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      return await fetch(copilotoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: bodyPayload,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    let response: Response;
    try {
      response = await doFetch(token);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return {
          error: true,
          respuesta: 'El Copiloto tardó demasiado. Intenta de nuevo.',
        };
      }
      return {
        error: true,
        respuesta: err?.message || 'Error de conexión con el Copiloto.',
      };
    }

    // 2. Si 401, reintentar una sola vez con refreshSession()
    if (response.status === 401) {
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        const nuevoToken = refreshData?.session?.access_token;

        if (refreshError || !nuevoToken) {
          const errBody = await response.json().catch(() => null);
          return {
            error: true,
            respuesta: errBody?.respuesta || 'Sesión expirada. Inicia sesión nuevamente.',
          };
        }

        // Reintento único
        token = nuevoToken;
        response = await doFetch(token);
      } catch (refreshErr: any) {
        if (refreshErr?.name === 'AbortError') {
          return {
            error: true,
            respuesta: 'El Copiloto tardó demasiado. Intenta de nuevo.',
          };
        }
        return {
          error: true,
          respuesta: 'No fue posible renovar la sesión del Copiloto.',
        };
      }
    }

    // 3. Manejo de respuesta
    if (response.ok) {
      const data = await response.json();
      return {
        error: false,
        respuesta: data.respuesta || '',
        datos_al: data.datos_al || '',
        proyectos_consultados: data.proyectos_consultados || [],
        consulta_id: data.consulta_id || null,
        modo: data.modo || 'normal',
      };
    }

    // Errores 400 / 401 / 403 / 502 / etc.
    let errorTexto = 'Error al comunicarse con el Copiloto.';
    try {
      const errorJson = await response.json();
      if (errorJson && typeof errorJson.respuesta === 'string' && errorJson.respuesta.trim()) {
        errorTexto = errorJson.respuesta;
      }
    } catch {
      // response no es JSON
      const text = await response.text().catch(() => '');
      if (text.trim()) {
        errorTexto = text;
      }
    }

    return {
      error: true,
      respuesta: errorTexto,
    };
  } catch (outerErr: any) {
    if (outerErr?.name === 'AbortError') {
      return {
        error: true,
        respuesta: 'El Copiloto tardó demasiado. Intenta de nuevo.',
      };
    }
    return {
      error: true,
      respuesta: outerErr?.message || 'Error inesperado al contactar al Copiloto.',
    };
  }
}
