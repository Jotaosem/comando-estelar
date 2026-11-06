import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useRegistrarVista(vista: string, proyectoId?: string) {
  useEffect(() => {
    const email = localStorage.getItem('user_email') || 'gerencia@empresa.cl';
    const rol = localStorage.getItem('user_rol') || 'Gerencia';

    // Registrar evento de uso en Supabase de forma no bloqueante solo si hay conexión configurada
    if (import.meta.env.VITE_SUPABASE_URL) {
      Promise.resolve(
        supabase.from('evento_uso').insert({
          email,
          rol,
          vista,
          proyecto_id: proyectoId || null,
          meta: { timestamp: new Date().toISOString() },
        })
      ).catch(() => {
        // Fallback silencioso en entorno local
      });
    }
  }, [vista, proyectoId]);
}
