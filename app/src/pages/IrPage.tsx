import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { obtenerProyectosSeed } from '../lib/proyectosData';
import { Compass, AlertCircle, ArrowLeft } from 'lucide-react';

export const IrPage: React.FC = () => {
  const { fuente, id } = useParams<{ fuente: string; id: string }>();
  const navigate = useNavigate();
  const [buscando, setBuscando] = useState(true);

  useEffect(() => {
    let activo = true;

    async function resolverRuta() {
      if (!fuente || !id) {
        if (activo) setBuscando(false);
        return;
      }

      // 1. Verificar primero si coincide de inmediato en catálogo local / seed (instantáneo)
      const localProyectos = obtenerProyectosSeed();
      const localMatch = localProyectos.find(
        p =>
          p.id === id ||
          p.notion_id === id ||
          p.codigo_visible?.toLowerCase() === id.toLowerCase() ||
          p.callsign?.toLowerCase() === id.toLowerCase()
      );

      if (localMatch && activo) {
        navigate(`/proyectos/${localMatch.id}`, { replace: true });
        return;
      }

      // 2. Si no es un id del seed local, consultar en Supabase (proyecto_fuente o codigo_visible)
      try {
        const fetchRemote = async () => {
          const { data: fuenteData } = await supabase
            .from('fuente')
            .select('id, codigo')
            .eq('codigo', fuente)
            .maybeSingle();

          if (fuenteData) {
            const { data: vinculo } = await supabase
              .from('proyecto_fuente')
              .select('proyecto_id')
              .eq('fuente_id', (fuenteData as { id: string }).id)
              .eq('id_origen', id)
              .maybeSingle();

            if (vinculo && (vinculo as { proyecto_id: string }).proyecto_id) {
              return (vinculo as { proyecto_id: string }).proyecto_id;
            }
          }

          const { data: proyPorCodigo } = await supabase
            .from('proyecto')
            .select('id')
            .eq('codigo_visible', id)
            .maybeSingle();

          if (proyPorCodigo && (proyPorCodigo as { id: string }).id) {
            return (proyPorCodigo as { id: string }).id;
          }
          return null;
        };

        const remoteId = await Promise.race([
          fetchRemote(),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 1500))
        ]);

        if (remoteId && activo) {
          navigate(`/proyectos/${remoteId}`, { replace: true });
          return;
        }

        if (activo) {
          setBuscando(false);
        }
      } catch (err) {
        console.warn('Error resolviendo deep link remoto:', err);
        if (activo) {
          setBuscando(false);
        }
      }
    }

    resolverRuta();

    return () => {
      activo = false;
    };
  }, [fuente, id, navigate]);

  if (buscando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Compass className="w-8 h-8 text-terracotta animate-spin" />
        <p className="text-sm text-muted-foreground font-mono">
          Localizando proyecto en órbita ({fuente} / {id})...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-12 p-8 bg-card border border-border rounded-2xl text-center space-y-4 shadow-sm">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-health-amber">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-bold text-foreground">Proyecto no encontrado</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        No se encontró ningún proyecto asociado a la fuente <span className="font-mono text-terracotta">{fuente}</span> con identificador <span className="font-mono text-terracotta">{id}</span>.
      </p>
      <div className="pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Comando Estelar
        </Link>
      </div>
    </div>
  );
};
