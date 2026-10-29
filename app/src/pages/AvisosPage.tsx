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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bandeja de Avisos Asistidos</h1>
        <p className="text-sm text-slate-500">
          Avisos generados automáticamente ante cambios relevantes. Revisa, edita o publica en Slack con 1 clic.
        </p>
      </div>

      {notificacion && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{notificacion}</span>
        </div>
      )}

      {/* Avisos Preparados */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Avisos Preparados ({avisos.filter((a) => a.estado === 'preparado').length})
        </h2>

        {avisos.filter((a) => a.estado === 'preparado').length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-slate-400 text-sm">
            No hay avisos pendientes de publicación.
          </div>
        ) : (
          avisos
            .filter((a) => a.estado === 'preparado')
            .map((aviso) => (
              <div
                key={aviso.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                      {aviso.proyecto}
                    </span>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Para: <span className="font-medium text-slate-700">{aviso.responsable_email}</span> · {aviso.preparado_en}
                    </div>
                  </div>
                  <span className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    Pendiente de aprobación
                  </span>
                </div>

                {editandoId === aviso.id ? (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Editar mensaje antes de enviar:</label>
                    <textarea
                      rows={4}
                      value={mensajeEditado}
                      onChange={(e) => setMensajeEditado(e.target.value)}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <pre className="text-xs font-mono bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-800 whitespace-pre-wrap">
                    {aviso.mensaje}
                  </pre>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  {editandoId === aviso.id ? (
                    <button
                      onClick={() => setEditandoId(null)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  ) : (
                    <button
                      onClick={() => iniciarEdicion(aviso)}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar Mensaje
                    </button>
                  )}

                  <button
                    onClick={() => handleDescartar(aviso.id)}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Descartar
                  </button>

                  <button
                    onClick={() => handlePublicar(aviso.id)}
                    className="inline-flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-sm"
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
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Historial de Avisos Publicados y Descartados
        </h2>

        <div className="space-y-3">
          {avisos
            .filter((a) => a.estado !== 'preparado')
            .map((aviso) => (
              <div
                key={aviso.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">{aviso.proyecto}</span>
                    <span
                      className={`px-2 py-0.5 rounded font-medium ${
                        aviso.estado === 'publicado'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {aviso.estado === 'publicado' ? 'Publicado en Slack' : 'Descartado'}
                    </span>
                  </div>
                  <pre className="font-mono text-slate-600 text-[11px] whitespace-pre-wrap">{aviso.mensaje}</pre>
                </div>
                <div className="text-slate-400 whitespace-nowrap text-right">
                  {aviso.publicado_en || 'Hoy'}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
