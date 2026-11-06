import React, { useState, useEffect } from 'react';
import type { UsuarioPrueba } from './DevUserSelector';
import { Sparkles, X, Send, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { useNavigationStore } from './space/navigationStore';

interface Mensaje {
  id: string;
  autor: 'user' | 'assistant';
  texto: string;
  timestamp: string;
  valoracion?: number; // 1 o -1
}

interface ChatAsistenteProps {
  usuarioActual: UsuarioPrueba;
  proyectoIdInicial?: string;
}

export const ChatAsistente: React.FC<ChatAsistenteProps> = ({
  usuarioActual,
  proyectoIdInicial,
}) => {
  const {
    chatAbierto: abierto,
    abrirChatConProyecto,
    cerrarChat,
    chatProyectoId,
  } = useNavigationStore();

  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: 'm-1',
      autor: 'assistant',
      texto: `Hola ${usuarioActual.nombre.split(' ')[0]}. Soy el asistente de seguimiento de proyectos. Pregúntame sobre el estado de un proyecto, qué bloqueos tiene o cuándo se proyecta su término.\n\nFuente: Notion · actualizado 29/10 09:15`,
      timestamp: '09:15',
    },
  ]);

  useEffect(() => {
    if (chatProyectoId && abierto) {
      setMensajes((prev) => [
        ...prev,
        {
          id: `m-ctx-${Date.now()}`,
          autor: 'assistant',
          texto: `Contexto sincronizado con la misión seleccionada (${chatProyectoId}). ¿Deseas consultar sobre su fecha estimada, el bloqueo activo o el desglose de días hábiles?\n\nFuente: Notion · actualizado hoy`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [chatProyectoId, abierto]);

  const handleAbrir = () => {
    if (proyectoIdInicial) {
      abrirChatConProyecto(proyectoIdInicial);
    } else {
      abrirChatConProyecto('');
    }
  };

  const handleCerrar = () => {
    cerrarChat();
  };

  const enviarPregunta = async () => {
    if (!input.trim() || cargando) return;

    const textoUsuario = input.trim();
    setInput('');
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMensajes((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        autor: 'user',
        texto: textoUsuario,
        timestamp: now,
      },
    ]);

    setCargando(true);

    setTimeout(() => {
      let respuestaMock = '';
      const pLower = textoUsuario.toLowerCase();

      if (pLower.includes('bloqueo') || pLower.includes('bloquea')) {
        respuestaMock =
          'El proyecto presenta un bloqueo activo por "Aprobación QA" abierto hace 6 días hábiles por el área de Calidad. La penalización automática aplicada en la proyección es de +5 días hábiles.\n\nFuente: Notion · actualizado 29/10 09:15';
      } else if (pLower.includes('cuándo') || pLower.includes('fecha') || pLower.includes('termina')) {
        respuestaMock =
          'La fecha proyectada auditada es el 12/11/2026. Se calcula desde hoy (29/10) + 3 días hábiles restantes de QA + 8 días de etapas pendientes + 5 días por 1 bloqueo = 16 días hábiles en total.\n\nFuente: Notion · actualizado 29/10 09:15';
      } else if (pLower.includes('responsable')) {
        respuestaMock =
          'El responsable de comunicar el estado es José Miguel (lider.tecnico@empresa.com). Para destrabar el bloqueo actual, el área a contactar es Calidad y Testing.\n\nFuente: Notion · actualizado 29/10 09:15';
      } else {
        respuestaMock =
          'El proyecto se encuentra en la etapa 03 (Pruebas de Calidad) con un 60% de avance auditado. Semáforo actual: Crítico por bloqueo de QA superior a 5 días hábiles.\n\nFuente: Notion · actualizado 29/10 09:15';
      }

      setMensajes((prev) => [
        ...prev,
        {
          id: `m-bot-${Date.now()}`,
          autor: 'assistant',
          texto: respuestaMock,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setCargando(false);
    }, 700);
  };

  const valorar = (id: string, val: number) => {
    setMensajes((prev) =>
      prev.map((m) => (m.id === id ? { ...m, valoracion: val } : m))
    );
  };

  return (
    <>
      {/* Botón Flotante con estilo principal WWP (Terracota con sombra cta, sin azul/cian) */}
      <button
        onClick={handleAbrir}
        className="fixed bottom-6 right-6 z-40 bg-terracotta hover:opacity-90 text-white p-3.5 rounded-full shadow-cta flex items-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 border border-terracotta"
        title="Activar Copiloto IA"
        aria-label="Abrir Copiloto IA"
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white animate-ping" />
        </div>
        <span className="font-sans tracking-wide uppercase font-bold text-xs pr-1">
          Copiloto IA
        </span>
      </button>

      {/* Panel Lateral */}
      {abierto && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-card text-foreground backdrop-blur-2xl shadow-panel z-50 flex flex-col border-l border-border">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-terracotta shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-sans font-bold text-sm text-foreground tracking-tight uppercase">
                    Copiloto Táctico IA
                  </h3>
                  <span className="inline-block w-2 h-2 rounded-full bg-health-green" />
                </div>
                <p className="text-[10px] font-mono text-muted-foreground">
                  MOD: CLAUDE-SONNET-5 · LATENCY: 24ms
                </p>
              </div>
            </div>
            <button
              onClick={handleCerrar}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Cerrar copiloto"
            >
              <X className="w-5 h-5" />
            </button>
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
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground font-mono">
                    <span>{isAssistant ? 'MISSION_AI' : usuarioActual.nombre}</span>
                    <span>•</span>
                    <span>{m.timestamp}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl max-w-[90%] leading-relaxed whitespace-pre-wrap ${
                      isAssistant
                        ? 'bg-surface text-foreground border border-border shadow-sm'
                        : 'bg-terracotta text-white font-sans font-medium shadow-cta'
                    }`}
                  >
                    {m.texto}
                  </div>

                  {/* Valoración para asistente */}
                  {isAssistant && m.id !== 'm-1' && (
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="font-mono text-[9px]">¿Respuesta útil?</span>
                      <button
                        onClick={() => valorar(m.id, 1)}
                        className={`p-1 rounded-full hover:text-foreground transition-colors ${
                          m.valoracion === 1 ? 'text-health-green' : ''
                        }`}
                        title="Respuesta útil"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => valorar(m.id, -1)}
                        className={`p-1 rounded-full hover:text-foreground transition-colors ${
                          m.valoracion === -1 ? 'text-health-red' : ''
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
              <div className="flex items-center gap-2 text-terracotta text-xs font-mono py-2">
                <div className="w-2 h-2 rounded-full bg-terracotta animate-ping" />
                <span>Interrogando telemetría de Notion...</span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-border bg-surface">
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
                className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta font-mono"
              />
              <button
                type="submit"
                disabled={!input.trim() || cargando}
                className="bg-terracotta hover:opacity-90 disabled:opacity-40 text-white p-2 rounded-xl transition-all shadow-cta"
                aria-label="Enviar pregunta"
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
