import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, AlertTriangle } from 'lucide-react';

export const DatosAl: React.FC = () => {
  const [ultimaSync, setUltimaSync] = useState<string | null>(null);
  const [desfaseHoras, setDesfaseHoras] = useState<number>(0);

  useEffect(() => {
    Promise.resolve(supabase.rpc('ultima_sincronizacion')).then(({ data, error }) => {
      if (!error && data) {
        setUltimaSync(data);
        const diffMs = Date.now() - new Date(data).getTime();
        const diffHrs = diffMs / (1000 * 60 * 60);
        setDesfaseHoras(diffHrs);
      }
    }).catch(() => {});
  }, []);

  const formatHora = (dStr: string | null) => {
    if (!dStr) return '09:00';
    try {
      const d = new Date(dStr);
      return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '09:00';
    }
  };

  const esDesfaseCritico = desfaseHoras > 6;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-[11px] font-mono text-muted-foreground select-none">
      {esDesfaseCritico ? (
        <AlertTriangle className="w-3.5 h-3.5 text-health-amber shrink-0" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-terracotta shrink-0" />
      )}
      <span>Datos al {formatHora(ultimaSync)}</span>
      {esDesfaseCritico && (
        <span className="text-[10px] text-health-amber font-semibold hidden lg:inline">
          (&gt;6h sin sync)
        </span>
      )}
    </div>
  );
};
