import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';

export function useRegistrarVista(vista: string, proyectoId?: string) {
  const { session, usuarioActual } = useAuth();

  useEffect(() => {
    // Tomar siempre el email y rol real de la sesión autenticada
    const email = session?.user?.email || usuarioActual?.email || localStorage.getItem('user_email');
    const rol = usuarioActual?.rol || localStorage.getItem('user_rol') || 'Admin';

    if (!email) return;

    // Registrar evento de uso en Supabase de forma no bloqueante solo si hay conexión configurada
    if (import.meta.env.VITE_SUPABASE_URL) {
      Promise.resolve(
        supabase.from('evento_uso').insert({
          email: email.toLowerCase(),
          rol,
          vista,
          proyecto_id: proyectoId || null,
          meta: { timestamp: new Date().toISOString() },
        })
      ).catch(() => {
        // Fallback silencioso en entorno local
      });
    }
  }, [vista, proyectoId, session?.user?.email, usuarioActual?.email, usuarioActual?.rol]);
}

