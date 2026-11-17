import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { obtenerProyectosSeed, type ProyectoResumenUI } from '../lib/proyectosData';
import { obtenerProyectosReales } from '../lib/datos/supabaseFuente';

export function useProyectos() {
  const { isDemo, session, usuarioActual } = useAuth();

  return useQuery<ProyectoResumenUI[]>({
    queryKey: ['proyectos', isDemo, session?.user?.id, usuarioActual?.email, usuarioActual?.rol],
    queryFn: async () => {
      // Si estamos en demo puro sin supabase session, devolver seed
      if (isDemo && !session) {
        return obtenerProyectosSeed(usuarioActual);
      }
      try {
        const datos = await obtenerProyectosReales(usuarioActual);
        if (!datos || datos.length === 0) {
          return obtenerProyectosSeed(usuarioActual);
        }
        return datos;
      } catch (err) {
        console.warn('Error al cargar proyectos reales de Supabase, usando seed:', err);
        return obtenerProyectosSeed(usuarioActual);
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}
