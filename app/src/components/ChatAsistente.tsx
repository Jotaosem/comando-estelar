import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  ThumbsUp,
  ThumbsDown,
  Terminal,
  Zap,
} from 'lucide-react';
import type { UsuarioPrueba } from './DevUserSelector';

interface MensajeChat {
  id: string;
  autor: 'user' | 'assistant';
  texto: string;
  timestamp: string;
  valoracion?: number;
}

interface ChatAsistenteProps {
  usuarioActual: UsuarioPrueba;
  proyectoId?: string;
  proyectoNombre?: string;
}

export const ChatAsistente: React.FC<ChatAsistenteProps> = ({
  usuarioActual,
  proyectoNombre,
}) => {
  const [abierto, setAbierto] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [mensajes, setMensajes] = useState<MensajeChat[]>([
    {
      id: 'm-1',
      autor: 'assistant',
      texto: `[COPILOTO TÁCTICO IA ONLINE]\nOperador ${usuarioActual.nombre} autenticado (${usuarioActual.rol}). Sistema listo para consultas sobre misiones, bloqueos en nodos y proyecciones auditables.`,
      timestamp: '00:01',
    },
  ]);
  const [cargando, setCargando] = useState<boolean>(false);

  const ATAJOS = [
    { label: '¿Cómo va?', query: '¿Cómo va el proyecto actual y cuál es su avance?' },
    { label: '¿Qué lo bloquea?', query: '¿Qué bloqueos críticos existen y qué área destraba?' },
    { label: '¿Cuándo termina?', query: '¿Cuándo es la fecha estimada y cuántos días hábiles de atraso tiene?' },
  ];

  const enviarPregunta = (textoPregunta?: string) => {
    const q = textoPregunta || input;
    if (!q.trim() || cargando) return;

    const nuevoUserMsg: MensajeChat = {
      id: `u-${Date.now()}`,
      autor: 'user',
      texto: q,
      timestamp: 'NOW',
    };

    setMensajes((prev) => [...prev, nuevoUserMsg]);
    setInput('');
    setCargando(true);

    setTimeout(() => {
      let resp = '';
      const qLower = q.toLowerCase();

      if (
        usuarioActual.rol === 'Solicitante' &&
        usuarioActual.area === 'Comercial' &&
        (qLower.includes('orion') || qLower.includes('proyecto a') || proyectoNombre?.includes('Proyecto A'))
      ) {
        resp = `[PROTOCOLO DE ACCESO RESTRINGIDO]\nNo tienes credenciales de visualización para consultar la misión Portal Proveedores (restringido a Operaciones).\nResponsable de enlace: Jose Miguel (jose.miguel@empresa.cl).\n\nFuente: Notion vía sync · actualizado 21/10 09:00`;
      } else if (qLower.includes('bloque') || qLower.includes('bloquea')) {
        resp = `[DIAGNÓSTICO DE BLOQUEOS EN NODOS]\n• Misión Portal Proveedores (OP-ORION-01):\n  - Bloqueo activo en Nodo 4 [QA]: Pendiente firma de matriz UAT de regresión.\n  - Área que destraba: QA Lead (contacto: paula.qa@empresa.cl).\n  - Tiempo en bloqueo: 6 días hábiles.\n• Misión Sentinel (SEC-VALKYRIE-05):\n  - Bloqueo en Nodo 5 [Seguridad/Infra]: Falta clúster secundario.\n  - Área que destraba: Cloud Ops (7 días hábiles).\n\nFuente: Notion vía sync · actualizado 21/10 09:00`;
      } else if (qLower.includes('termina') || qLower.includes('cuándo') || qLower.includes('fecha')) {
        resp = `[ESTIMACIÓN AUDITABLE DE TÉRMINO]\n• Portal Proveedores: 30/10/2026 (Comprometida: 06/11/2026, atraso de +7 días hábiles tras impacto de bloqueo QA).\n• Integración ERP: 15/12/2026 (Dentro de compromiso, 0 días hábiles de desfase).\n• Cálculo ejecutado en base a días hábiles oficiales de Chile.\n\nFuente: Notion vía sync · actualizado 21/10 09:00`;
      } else {
        resp = `[ESTADO GENERAL DE LA FLOTA]\n• Misión en foco: ${proyectoNombre || 'Portal Proveedores (Proyecto A)'}\n• Avance: 43% completado · Nodo activo: QA [En curso / Bloqueado]\n• Salud: 🔴 ROJO por bloqueo QA excediendo umbral de 5 días hábiles.\n• Responsable: Jose Miguel (jose.miguel@empresa.cl)\n\nFuente: Notion vía sync · actualizado 21/10 09:00`;
      }

      setMensajes((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          autor: 'assistant',
          texto: resp,
          timestamp: 'NOW',
        },
      ]);
      setCargando(false);
    }, 450);
  };

  const valorar = (id: string, val: number) => {
    setMensajes((prev) =>
      prev.map((m) => (m.id === id ? { ...m, valoracion: val } : m))
    );
  };

  return (
    <>
      {/* Botón Flotante Holográfico */}
      <button
        onClick={() => setAbierto(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 p-3.5 rounded-full shadow-[0_0_25px_rgba(0,242,254,0.45)] flex items-center gap-2.5 group transition-all transform hover:scale-105 active:scale-95 border border-cyan-300/40"
        title="Activar Copiloto IA"
        aria-label="Abrir Copiloto IA"
      >
        <div className="relative">
          <Terminal className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <span className="font-display tracking-widest uppercase font-bold text-xs pr-1">
          Copiloto IA
        </span>
      </button>

      {/* Panel Lateral (HUD Holográfico) */}
      {abierto && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-[#070b18]/95 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] z-50 flex flex-col border-l border-cyan-500/30 text-slate-200">
          {/* Header HUD */}
          <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-purple-950/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.25)]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-sm text-cyan-300 tracking-wider uppercase">
                    Copiloto Táctico IA
                  </h3>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                </div>
                <p className="text-[10px] font-mono text-cyan-400/60">
                  MOD: CLAUDE-SONNET-5 · LATENCY: 24ms
                </p>
              </div>
            </div>
            <button
              onClick={() => setAbierto(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Atajos Rápidos */}
          <div className="p-3 border-b border-slate-800/80 bg-slate-950/60 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Zap className="w-3 h-3 text-cyan-400" /> Atajos:
            </span>
            {ATAJOS.map((a, idx) => (
              <button
                key={idx}
                onClick={() => enviarPregunta(a.query)}
                className="shrink-0 text-[11px] font-mono bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-md transition-all hover:border-cyan-400 active:scale-95"
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
            {mensajes.map((m) => {
              const isAssistant = m.autor === 'assistant';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    isAssistant ? 'items-start' : 'items-end'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-500 font-mono">
                    <span>{isAssistant ? 'MISSION_AI' : usuarioActual.nombre}</span>
                    <span>•</span>
                    <span>{m.timestamp}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-xl max-w-[90%] leading-relaxed whitespace-pre-wrap ${
                      isAssistant
                        ? 'bg-slate-900/90 text-cyan-100 border border-cyan-500/25 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
                        : 'bg-cyan-500 text-slate-950 font-sans font-medium shadow-[0_0_15px_rgba(0,242,254,0.3)]'
                    }`}
                  >
                    {m.texto}
                  </div>

                  {/* Valoración para asistente */}
                  {isAssistant && m.id !== 'm-1' && (
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                      <span className="font-mono text-[9px] text-slate-500">¿Respuesta útil?</span>
                      <button
                        onClick={() => valorar(m.id, 1)}
                        className={`p-1 rounded hover:text-cyan-300 transition-colors ${
                          m.valoracion === 1 ? 'text-emerald-400' : ''
                        }`}
                        title="Respuesta útil"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => valorar(m.id, -1)}
                        className={`p-1 rounded hover:text-red-400 transition-colors ${
                          m.valoracion === -1 ? 'text-red-400' : ''
                        }`}
                        title="Respuesta con errores"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {cargando && (
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono py-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Interrogando telemetría de Notion...</span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-cyan-500/20 bg-slate-950/90">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviarPregunta();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregunta sobre etapas, bloqueos, fechas..."
                className="flex-1 bg-slate-900/80 border border-cyan-500/30 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono"
              />
              <button
                type="submit"
                disabled={!input.trim() || cargando}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 p-2 rounded-lg transition-all shadow-[0_0_12px_rgba(0,242,254,0.3)]"
              >
                <Send className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
