import React, { useState } from 'react';
import { useRegistrarVista } from '../hooks/useRegistrarVista';
import type { UsuarioPrueba } from '../components/DevUserSelector';
import { CheckCircle2, Send } from 'lucide-react';

interface EncuestaPageProps {
  usuarioActual: UsuarioPrueba;
}

export const EncuestaPage: React.FC<EncuestaPageProps> = ({ usuarioActual }) => {
  useRegistrarVista('encuesta');

  const [encontro, setEncontro] = useState<string>('Sí');
  const [tiempo, setTiempo] = useState<string>('<1 min');
  const [confianza, setConfianza] = useState<number>(4);
  const [preguntas, setPreguntas] = useState<number>(1);
  const [comoSeEntero, setComoSeEntero] = useState<string>('Aviso del responsable');
  const [vistaMasUsada, setVistaMasUsada] = useState<string>('Resumen');
  const [minutosNotion, setMinutosNotion] = useState<number>(15);
  const [enviado, setEnviado] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEnviado(true);
  };

  if (enviado) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 max-w-lg mx-auto text-center shadow-sm my-8">
        <CheckCircle2 className="w-12 h-12 text-health-green mx-auto mb-3" />
        <h2 className="text-xl font-bold text-foreground">¡Gracias por tu respuesta!</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Tu retroalimentación ha sido guardada en las métricas de impacto del piloto (H1 y H2).
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Encuesta de Percepción del Piloto</h1>
        <p className="text-sm text-muted-foreground">
          Medición de autonomía en la consulta y confiabilidad de las fechas (Línea Base / Semanal).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
            1. ¿Pudiste encontrar el avance de los proyectos sin preguntar a nadie?
          </label>
          <div className="flex gap-3">
            {['Sí', 'Parcialmente', 'No'].map((opc) => (
              <label key={opc} className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="encontro"
                  value={opc}
                  checked={encontro === opc}
                  onChange={(e) => setEncontro(e.target.value)}
                  className="text-terracotta accent-terracotta focus:ring-terracotta"
                />
                {opc}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
            2. ¿Cuánto tiempo te tomó enterarte del estado de un proyecto?
          </label>
          <select
            value={tiempo}
            onChange={(e) => setTiempo(e.target.value)}
            className="w-full text-xs border border-border rounded-lg p-2.5 bg-surface text-foreground"
          >
            <option value="<1 min">&lt; 1 minuto</option>
            <option value="1-5 min">Entre 1 y 5 minutos</option>
            <option value=">5 min">Más de 5 minutos</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
            3. Nivel de confianza en las fechas estimadas (1: Muy baja, 5: Muy alta): {confianza} / 5
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={confianza}
            onChange={(e) => setConfianza(parseInt(e.target.value, 10))}
            className="w-full accent-terracotta"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>1 - No son confiables</span>
            <span>3 - Medianamente confiables</span>
            <span>5 - Muy confiables</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
            4. ¿Cuántas veces tuviste que preguntar por Slack o correo esta semana para saber cómo iba un proyecto?
          </label>
          <input
            type="number"
            min="0"
            value={preguntas}
            onChange={(e) => setPreguntas(parseInt(e.target.value, 10))}
            className="w-full text-xs border border-border rounded-lg p-2.5 bg-surface text-foreground"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
            5. ¿Cómo te enteraste de los últimos cambios o atrasos?
          </label>
          <select
            value={comoSeEntero}
            onChange={(e) => setComoSeEntero(e.target.value)}
            className="w-full text-xs border border-border rounded-lg p-2.5 bg-surface text-foreground"
          >
            <option value="Aviso del responsable">Aviso del responsable en Slack</option>
            <option value="Revisando la app">Revisando directamente la app</option>
            <option value="Preguntando">Preguntando directamente al equipo</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
            6. ¿Qué vista o herramienta utilizas más frecuentemente?
          </label>
          <select
            value={vistaMasUsada}
            onChange={(e) => setVistaMasUsada(e.target.value)}
            className="w-full text-xs border border-border rounded-lg p-2.5 bg-surface text-foreground"
          >
            <option value="Resumen">Vista Resumen</option>
            <option value="Detalle">Detalle del Proyecto</option>
            <option value="Asistente">Asistente de IA</option>
          </select>
        </div>

        {usuarioActual.rol === 'Ejecutor' && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
              7. (Solo Ejecutor) Minutos semanales dedicados a actualizar Notion
            </label>
            <input
              type="number"
              min="0"
              value={minutosNotion}
              onChange={(e) => setMinutosNotion(parseInt(e.target.value, 10))}
              className="w-full text-xs border border-border rounded-lg p-2.5 bg-surface text-foreground"
            />
          </div>
        )}

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-terracotta text-white font-semibold text-xs hover:opacity-90 shadow-cta"
        >
          <Send className="w-4 h-4" />
          Enviar Respuestas
        </button>
      </form>
    </div>
  );
};
