import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { obtenerProyectosSeed } from '../lib/proyectosData';
import { obtenerProyectosReales } from '../lib/datos/supabaseFuente';
import { mapProyecto, type ProyectoView } from '../data/proyectoView';

export function useProyectos() {
  const { isDemo, session, usuarioActual } = useAuth();

  return useQuery<ProyectoView[]>({
    queryKey: ['proyectos', isDemo, session?.user?.id, usuarioActual?.email, usuarioActual?.rol],
    queryFn: async () => {
      // Si estamos explícitamente en modo demo de prueba / E2E, devolver seed mapeado
      if (isDemo && !session) {
        return (obtenerProyectosSeed(usuarioActual) as any[]).map(mapProyecto);
      }
      // Consultar directamente datos reales de Supabase
      const datos = await obtenerProyectosReales(usuarioActual);
      return datos;
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}
