import React from 'react';
import { useRegistrarVista } from '../hooks/useRegistrarVista';
import { Database, Download } from 'lucide-react';

export const AdminPage: React.FC = () => {
  useRegistrarVista('admin');

  const exportarCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,Sistema,Comando Estelar\nMetrica,Línea Base,Semana 1\nConfianza Fecha,2.8,4.2\nPreguntas Contacto,6.4,1.8\nAutonomia Consulta,35%,88%\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "comando_estelar_metricas_piloto.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Panel de Administración y Métricas</h1>
          <p className="text-sm text-muted-foreground">
            Seguimiento de hipótesis H1-H4, estado de sincronización y parámetros del piloto.
          </p>
        </div>
        <button
          onClick={exportarCSV}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-xs font-semibold text-foreground hover:bg-muted shadow-sm"
        >
          <Download className="w-4 h-4 text-terracotta" />
          Exportar Métricas (CSV)
        </button>
      </div>

      {/* Métricas H1-H4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <span className="text-xs font-semibold text-terracotta uppercase tracking-wider block mb-1">
            H1: Autonomía Consulta
          </span>
          <div className="text-3xl font-extrabold text-foreground">88%</div>
          <p className="text-xs text-muted-foreground mt-1">Encuentran estado sin preguntar (vs 35% en línea base)</p>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <span className="text-xs font-semibold text-health-green uppercase tracking-wider block mb-1">
            H2: Confiabilidad Fechas
          </span>
          <div className="text-3xl font-extrabold text-foreground">4.2 / 5</div>
          <p className="text-xs text-muted-foreground mt-1">Confianza en fecha estimada con desglose transparente</p>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <span className="text-xs font-semibold text-terracotta uppercase tracking-wider block mb-1">
            H3: Avisos Oportunos
          </span>
          <div className="text-3xl font-extrabold text-foreground">100%</div>
          <p className="text-xs text-muted-foreground mt-1">Avisos publicados dentro de 1 día hábil por el responsable</p>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <span className="text-xs font-semibold text-health-amber uppercase tracking-wider block mb-1">
            H4: Profundidad por Rol
          </span>
          <div className="text-3xl font-extrabold text-foreground">62% / 38%</div>
          <p className="text-xs text-muted-foreground mt-1">62% vista resumen (gerencia) vs 38% detalle de tareas (operación)</p>
        </div>
      </div>

      {/* Parámetros del Sistema */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Database className="w-5 h-5 text-terracotta" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Parámetros del Piloto
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-surface rounded-lg border border-border">
            <span className="text-muted-foreground block">Días hábiles por bloqueo:</span>
            <span className="font-bold text-foreground text-sm">5 dh</span>
          </div>
          <div className="p-3 bg-surface rounded-lg border border-border">
            <span className="text-muted-foreground block">Umbral de atraso rojo:</span>
            <span className="font-bold text-foreground text-sm">&gt; 5 dh</span>
          </div>
          <div className="p-3 bg-surface rounded-lg border border-border">
            <span className="text-muted-foreground block">Tolerancia de frescura:</span>
            <span className="font-bold text-foreground text-sm">7 días calendario</span>
          </div>
          <div className="p-3 bg-surface rounded-lg border border-border">
            <span className="text-muted-foreground block">Canal oficial de avisos:</span>
            <span className="font-bold text-foreground text-sm">#piloto-proyectos</span>
          </div>
          <div className="p-3 bg-surface rounded-lg border border-border">
            <span className="text-muted-foreground block">Estado última sincronización:</span>
            <span className="font-bold text-health-green text-sm">OK (hace 2 min)</span>
          </div>
          <div className="p-3 bg-surface rounded-lg border border-border">
            <span className="text-muted-foreground block">Kill switch Asistente IA:</span>
            <span className="font-bold text-health-green text-sm">Activo (habilitado)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
