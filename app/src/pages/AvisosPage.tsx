import React, { useState } from 'react';
import { useRegistrarVista } from '../hooks/useRegistrarVista';
import { Send, CheckCircle2, XCircle, Edit3 } from 'lucide-react';

interface AvisoItem {
  id: string;
  proyecto: string;
  responsable_email: string;
  tipo: string;
  mensaje: string;
  estado: 'preparado' | 'publicado' | 'descartado';
  preparado_en: string;
  publicado_en?: string;
  publicado_por?: string;
}

const AVISOS_INICIALES: AvisoItem[] = [
  {
    id: 'aviso-1',
    proyecto: 'Portal Proveedores (Proyecto A)',
    responsable_email: 'jose.miguel@empresa.cl',
    tipo: 'bloqueo_nuevo',
    mensaje:
      '📌 *Portal Proveedores (Proyecto A)* — Bloqueo de Aprobación QA abierto hace 6 días hábiles\nEtapa actual: QA (50%) · Semáforo: 🔴 Bloqueo de Aprobación QA abierto hace 6 días hábiles\nFecha estimada: 30/10 (comprometida 06/11, -5 días hábiles)\nBloqueos abiertos: 1 (Aprobación QA)\nDetalle: http://localhost:5173/proyectos/a0000000-0000-0000-0000-000000000001',
    estado: 'preparado',
    preparado_en: 'Hace 10 minutos',
  },
  {
    id: 'aviso-2',
    proyecto: 'Automatización Compliance (Proyecto C)',
    responsable_email: 'jose.miguel@empresa.cl',
    tipo: 'retroceso',
    mensaje:
      '📌 *Automatización Compliance (Proyecto C)* — Retroceso de etapa detectado\nEtapa actual: Desarrollo (33%) · Semáforo: 🟡 Atraso de 3 días hábiles\nFecha estimada: 13/11 (comprometida 10/11, +3 días hábiles)\nBloqueos abiertos: 0\nDetalle: http://localhost:5173/proyectos/c0000000-0000-0000-0000-000000000003',
    estado: 'preparado',
    preparado_en: 'Hace 1 hora',
  },
];

export const AvisosPage: React.FC = () => {
  useRegistrarVista('avisos');
  const [avisos, setAvisos] = useState<AvisoItem[]>(AVISOS_INICIALES);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mensajeEditado, setMensajeEditado] = useState<string>('');
  const [notificacion, setNotificacion] = useState<string | null>(null);

  const handlePublicar = (id: string) => {
    setAvisos((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              estado: 'publicado',
              publicado_en: 'Recién',
              publicado_por: 'jose.miguel@empresa.cl',
              mensaje: editandoId === id ? mensajeEditado : a.mensaje,
            }
          : a
      )
    );
    setEditandoId(null);
    setNotificacion('¡Aviso publicado exitosamente en canal Slack (#piloto-proyectos)!');
    setTimeout(() => setNotificacion(null), 4000);
  };

  const handleDescartar = (id: string) => {
    setAvisos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, estado: 'descartado' } : a))
    );
    setEditandoId(null);
  };

  const iniciarEdicion = (aviso: AvisoItem) => {
    setEditandoId(aviso.id);
    setMensajeEditado(aviso.mensaje);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Bandeja de Avisos Asistidos</h1>
        <p className="text-sm text-muted-foreground">
          Avisos generados automáticamente ante cambios relevantes. Revisa, edita o publica en Slack con 1 clic.
        </p>
      </div>

      {notificacion && (
        <div className="p-4 bg-health-green-soft border border-health-green/40 text-health-green rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-health-green flex-shrink-0" />
          <span>{notificacion}</span>
        </div>
      )}

      {/* Avisos Preparados */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Avisos Preparados ({avisos.filter((a) => a.estado === 'preparado').length})
        </h2>

        {avisos.filter((a) => a.estado === 'preparado').length === 0 ? (
          <div className="p-8 bg-card border border-border rounded-xl text-center text-muted-foreground text-sm">
            No hay avisos pendientes de publicación.
          </div>
        ) : (
          avisos
            .filter((a) => a.estado === 'preparado')
            .map((aviso) => (
              <div
                key={aviso.id}
                className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <span className="text-xs font-semibold text-terracotta-text uppercase tracking-wider">
                      {aviso.proyecto}
                    </span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Para: <span className="font-medium text-foreground">{aviso.responsable_email}</span> · {aviso.preparado_en}
                    </div>
                  </div>
                  <span className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium bg-health-amber-soft text-health-amber border border-health-amber/40">
                    Pendiente de aprobación
                  </span>
                </div>

                {editandoId === aviso.id ? (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Editar mensaje antes de enviar:</label>
                    <textarea
                      rows={4}
                      value={mensajeEditado}
                      onChange={(e) => setMensajeEditado(e.target.value)}
                      className="w-full text-xs font-mono bg-muted border border-border rounded-lg p-3 text-foreground focus:bg-surface focus:ring-1 focus:ring-terracotta"
                    />
                  </div>
                ) : (
                  <pre className="text-xs font-mono bg-muted p-3 rounded-lg border border-border text-foreground whitespace-pre-wrap">
                    {aviso.mensaje}
                  </pre>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  {editandoId === aviso.id ? (
                    <button
                      onClick={() => setEditandoId(null)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted"
                    >
                      Cancelar
                    </button>
                  ) : (
                    <button
                      onClick={() => iniciarEdicion(aviso)}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar Mensaje
                    </button>
                  )}

                  <button
                    onClick={() => handleDescartar(aviso.id)}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-health-red/40 text-health-red hover:bg-health-red-soft"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Descartar
                  </button>

                  <button
                    onClick={() => handlePublicar(aviso.id)}
                    className="inline-flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-terracotta text-white font-semibold hover:opacity-90 shadow-cta"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Publicar en Slack (1 clic)
                  </button>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Historial de Publicados */}
      <div className="space-y-4 pt-4">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Historial de Avisos Publicados y Descartados
        </h2>

        <div className="space-y-3">
          {avisos
            .filter((a) => a.estado !== 'preparado')
            .map((aviso) => (
              <div
                key={aviso.id}
                className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">{aviso.proyecto}</span>
                    <span
                      className={`px-2 py-0.5 rounded font-medium ${
                        aviso.estado === 'publicado'
                          ? 'bg-health-green-soft text-health-green border border-health-green/30'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      {aviso.estado === 'publicado' ? 'Publicado en Slack' : 'Descartado'}
                    </span>
                  </div>
                  <pre className="font-mono text-muted-foreground text-[11px] whitespace-pre-wrap">{aviso.mensaje}</pre>
                </div>
                <div className="text-muted-foreground whitespace-nowrap text-right">
                  {aviso.publicado_en || 'Hoy'}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
