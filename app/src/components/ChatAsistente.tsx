import React, { useState, useEffect, useRef } from 'react';
import type { UsuarioPrueba } from './DevUserSelector';
import {
  Sparkles,
  X,
  Send,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  RotateCcw,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useNavigationStore } from './space/navigationStore';
import { useProyectos } from '../hooks/useProyectos';
import { preguntarCopiloto, type MensajeHistorial } from '../services/copiloto';
import { supabase } from '../lib/supabase';

interface Mensaje {
  id: string;
  autor: 'user' | 'assistant';
  texto: string;
  timestamp: string;
  consultaId?: string | null;
  valoracion?: number; // 1 o -1
  valoradoTexto?: string;
  esError?: boolean;
}

interface ChatAsistenteProps {
  usuarioActual: UsuarioPrueba;
  proyectoIdInicial?: string;
}

const STORAGE_KEY = 'copiloto_historial_v1';

export const ChatAsistente: React.FC<ChatAsistenteProps> = ({
  usuarioActual,
  proyectoIdInicial,
}) => {
  // Ocultar el Copiloto a los usuarios "Sin perfil"
  if (usuarioActual.rol === 'Sin perfil') {
    return null;
  }

  const {
    chatAbierto: abierto,
    abrirChatConProyecto,
    cerrarChat,
    chatProyectoId,
  } = useNavigationStore();

  const { data: proyectos } = useProyectos();

  // Contexto de proyecto activo
  const [contextoProyectoId, setContextoProyectoId] = useState<string | null>(
    chatProyectoId || proyectoIdInicial || null
  );

  useEffect(() => {
    if (chatProyectoId) {
      setContextoProyectoId(chatProyectoId);
    } else if (proyectoIdInicial) {
      setContextoProyectoId(proyectoIdInicial);
    }
  }, [chatProyectoId, proyectoIdInicial]);

  const proyectoActivo = proyectos?.find((p) => p.id === contextoProyectoId);
  const nombreProyecto = proyectoActivo?.nombre || 'Proyecto seleccionado';

  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [ultimoError, setUltimoError] = useState<{
    pregunta: string;
    proyectoId: string | null;
  } | null>(null);

  // Historial en sessionStorage protegido con try/catch
  const [mensajes, setMensajes] = useState<Mensaje[]>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignorar error de lectura de sessionStorage
    }
    return [
      {
        id: 'msg-inicial',
        autor: 'assistant',
        texto: `Hola ${usuarioActual.nombre.split(' ')[0]}. Soy el Copiloto de Comando Estelar.\nPuedes consultarme sobre el estado de un proyecto, qué bloqueos tiene o cuándo se proyecta su término.\n\nFuente: Notion vía sync`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mensajes));
    } catch {
      // Ignorar error de escritura en sessionStorage
    }
  }, [mensajes]);

  // Accesibilidad y manejo de focos
  const botonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mensajesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (abierto) {
      // Foco en el campo al abrir
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [abierto]);

  useEffect(() => {
    if (abierto) {
      mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes, cargando, abierto]);

  // Cierre con Esc y retorno de foco al botón
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && abierto) {
        cerrarChat();
        botonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [abierto, cerrarChat]);

  const handleAbrir = () => {
    const targetId = contextoProyectoId || proyectoIdInicial || '';
    abrirChatConProyecto(targetId);
  };

  const handleCerrar = () => {
    cerrarChat();
    botonRef.current?.focus();
  };

  const limpiarConversacion = () => {
    const msgReset: Mensaje[] = [
      {
        id: `msg-${Date.now()}`,
        autor: 'assistant',
        texto: `Conversación reiniciada. ¿En qué proyecto o entrega puedo apoyarte hoy?\n\nFuente: Notion vía sync`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setMensajes(msgReset);
    setUltimoError(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const ejecutarConsulta = async (preguntaTexto: string, pId: string | null) => {
    setCargando(true);
    setUltimoError(null);

    // Registrar evento_uso (vista = 'asistente') sin el texto de la pregunta
    try {
      await supabase.from('evento_uso').insert({
        email: usuarioActual.email,
        rol: usuarioActual.rol,
        vista: 'asistente',
        proyecto_id: pId || null,
      });
    } catch {
      // No bloquear la experiencia de usuario si falla la telemetría
    }

    // Preparar historial para el servicio (máx 6 mensajes previos, rol y texto)
    const historialParaServicio: MensajeHistorial[] = mensajes
      .filter((m) => !m.esError)
      .slice(-6)
      .map((m) => ({
        rol: m.autor,
        texto: m.texto,
      }));

    const resultado = await preguntarCopiloto({
      pregunta: preguntaTexto,
      proyectoId: pId,
      historial: historialParaServicio,
    });

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (resultado.error) {
      setUltimoError({ pregunta: preguntaTexto, proyectoId: pId });
      setMensajes((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          autor: 'assistant',
          texto: resultado.respuesta,
          timestamp: now,
          esError: true,
        },
      ]);
    } else {
      setMensajes((prev) => [
        ...prev,
        {
          id: `msg-ok-${Date.now()}`,
          autor: 'assistant',
          texto: resultado.respuesta,
          timestamp: now,
          consultaId: resultado.consulta_id,
        },
      ]);
    }

    setCargando(false);
  };

  const enviarPregunta = () => {
    if (!input.trim() || cargando) return;

    const texto = input.trim();
    setInput('');

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMensajes((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        autor: 'user',
        texto,
        timestamp: now,
      },
    ]);

    ejecutarConsulta(texto, contextoProyectoId);
  };

  const reintentarUltima = () => {
    if (!ultimoError) return;
    ejecutarConsulta(ultimoError.pregunta, ultimoError.proyectoId);
  };

  const valorar = async (mensajeId: string, consultaId: string, val: number) => {
    try {
      await supabase
        .from('consulta_asistente')
        .update({ valoracion: val })
        .eq('id', consultaId);

      setMensajes((prev) =>
        prev.map((m) =>
          m.id === mensajeId
            ? {
                ...m,
                valoracion: val,
                valoradoTexto: 'Gracias por tu valoración',
              }
            : m
        )
      );
    } catch {
      // Si falla la red, reflejar en UI defensivamente
      setMensajes((prev) =>
        prev.map((m) =>
          m.id === mensajeId
            ? {
                ...m,
                valoracion: val,
                valoradoTexto: 'Gracias por tu valoración',
              }
            : m
        )
      );
    }
  };

  // Renderizador seguro como TEXTO PLANO
  // Separa saltos de línea y viñetas sin HTML ni dangerouslySetInnerHTML
  const renderTextoPlano = (texto: string) => {
    const lineas = texto.split('\n');
    let cuerpoLineas: string[] = [];
    let fuenteLinea: string | null = null;

    // Detectar si la última línea no vacía empieza con "Fuente:"
    let lastIdx = lineas.length - 1;
    while (lastIdx >= 0 && !lineas[lastIdx].trim()) {
      lastIdx--;
    }

    if (lastIdx >= 0 && lineas[lastIdx].trim().startsWith('Fuente:')) {
      cuerpoLineas = lineas.slice(0, lastIdx);
      fuenteLinea = lineas[lastIdx].trim();
    } else {
      cuerpoLineas = lineas;
    }

    return (
      <div className="space-y-1">
        <div className="whitespace-pre-wrap leading-relaxed">
          {cuerpoLineas.join('\n')}
        </div>
        {fuenteLinea && (
          <div className="mt-2 pt-2 border-t border-border/40 font-mono text-[11px] text-muted-foreground/60 select-text">
            {fuenteLinea}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Botón Flotante con posición fija cuidada para no tapar radar ni controles */}
      <button
        ref={botonRef}
        onClick={handleAbrir}
        className="fixed bottom-6 right-6 z-40 bg-terracotta hover:opacity-95 text-white p-3.5 rounded-full shadow-cta flex items-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 border border-terracotta cursor-pointer"
        title="Abrir Copiloto IA"
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

      {/* Panel Lateral en Desktop / Pantalla completa en Móvil */}
      {abierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Panel del Copiloto IA"
          className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-card text-foreground backdrop-blur-2xl shadow-panel z-50 flex flex-col border-l border-border animate-in slide-in-from-right duration-200"
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-terracotta shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-sans font-bold text-sm text-foreground tracking-tight uppercase">
                    Copiloto IA
                  </h3>
                  <span className="inline-block w-2 h-2 rounded-full bg-health-green" title="Conectado a n8n" />
                </div>
                <p className="text-[10px] font-mono text-muted-foreground">
                  Comando Estelar · Agente Táctico
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={limpiarConversacion}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Nueva conversación"
                aria-label="Nueva conversación"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCerrar}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Cerrar copiloto (Esc)"
                aria-label="Cerrar copiloto"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contexto de proyecto activo (si existe) */}
          {contextoProyectoId && (
            <div className="px-4 py-2 bg-surface/80 border-b border-border flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                <span className="text-[10px] text-terracotta uppercase font-bold">Sobre:</span>
                <span className="text-foreground font-semibold truncate">{nombreProyecto}</span>
              </div>
              <button
                type="button"
                onClick={() => setContextoProyectoId(null)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 ml-2"
                title="Quitar contexto de proyecto"
                aria-label="Quitar contexto de proyecto"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Lista de Mensajes (con aria-live="polite") */}
          <div
            aria-live="polite"
            className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs select-text"
          >
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
                    <span>{isAssistant ? 'COPILOTO_IA' : usuarioActual.nombre}</span>
                    <span>•</span>
                    <span>{m.timestamp}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl max-w-[92%] leading-relaxed ${
                      isAssistant
                        ? m.esError
                          ? 'bg-health-red-soft text-health-red border border-health-red/30 shadow-sm'
                          : 'bg-surface text-foreground border border-border shadow-sm'
                        : 'bg-terracotta text-white font-sans font-medium shadow-cta'
                    }`}
                  >
                    {renderTextoPlano(m.texto)}
                  </div>

                  {/* Valoración 👍 / 👎 solo si consulta_id no es null */}
                  {isAssistant && !m.esError && m.consultaId && (
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground font-mono">
                      {m.valoradoTexto ? (
                        <span className="text-terracotta font-medium">{m.valoradoTexto}</span>
                      ) : (
                        <>
                          <span className="text-[9px]">¿Respuesta útil?</span>
                          <button
                            type="button"
                            onClick={() => valorar(m.id, m.consultaId!, 1)}
                            className="p-1 rounded hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            title="Respuesta útil"
                            aria-label="Respuesta útil"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => valorar(m.id, m.consultaId!, -1)}
                            className="p-1 rounded hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            title="Respuesta con errores"
                            aria-label="Respuesta con errores"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {cargando && (
              <div className="flex items-center gap-2.5 text-terracotta text-xs font-mono py-2 bg-surface/50 px-3 rounded-xl border border-border w-fit animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Consultando proyectos…</span>
              </div>
            )}

            {ultimoError && !cargando && (
              <div className="p-2.5 rounded-xl bg-health-red-soft border border-health-red/30 flex items-center justify-between gap-2 text-xs font-mono text-health-red">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Falló la última consulta.</span>
                </span>
                <button
                  type="button"
                  onClick={reintentarUltima}
                  className="px-2 py-1 rounded bg-card hover:bg-surface border border-health-red/40 text-foreground font-semibold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3 text-terracotta" />
                  <span>Reintentar</span>
                </button>
              </div>
            )}

            <div ref={mensajesEndRef} />
          </div>

          {/* Input Box y Contador */}
          <div className="p-3 border-t border-border bg-surface">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviarPregunta();
              }}
              className="space-y-2"
            >
              <div className="relative">
                <textarea
                  ref={inputRef}
                  rows={2}
                  maxLength={1000}
                  value={input}
                  disabled={cargando}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      enviarPregunta();
                    }
                  }}
                  placeholder="Pregunta sobre etapas, bloqueos o fechas (Enter envía, Shift+Enter nueva línea)..."
                  className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta font-mono resize-none disabled:opacity-50"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground px-1">
                <span className={input.length >= 950 ? 'text-health-red font-bold' : ''}>
                  {input.length} / 1000
                </span>

                <button
                  type="submit"
                  disabled={!input.trim() || cargando}
                  className="bg-terracotta hover:opacity-90 disabled:opacity-40 text-white px-3.5 py-1.5 rounded-xl transition-all shadow-cta flex items-center gap-1.5 font-sans font-semibold cursor-pointer disabled:cursor-not-allowed"
                  aria-label="Enviar pregunta al Copiloto"
                >
                  <span>Enviar</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
