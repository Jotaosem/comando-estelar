import React, { useState, useMemo } from 'react';
import type { ProyectoResumenUI } from '../lib/proyectosData';
import {
  Flame,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ProyectosTablaProps {
  proyectos: ProyectoResumenUI[];
  onSelectProyecto: (p: ProyectoResumenUI) => void;
  onLimpiarFiltros?: () => void;
}

type SortColumn =
  | 'estado'
  | 'codigo'
  | 'nombre'
  | 'area'
  | 'etapa'
  | 'avance'
  | 'estimada'
  | 'compromiso'
  | 'atraso'
  | 'sprint'
  | 'responsable'
  | 'actualizado';

const semaforoScore: Record<string, number> = {
  rojo: 4,
  amarillo: 3,
  verde: 2,
  gris: 1,
};

export const ProyectosTabla: React.FC<ProyectosTablaProps> = ({
  proyectos,
  onSelectProyecto,
  onLimpiarFiltros,
}) => {
  const [sortCol, setSortCol] = useState<SortColumn>('estado');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pagina, setPagina] = useState<number>(1);
  const itemsPorPagina = 25;

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortOrder('asc');
    }
  };

  const proyectosOrdenados = useMemo(() => {
    return [...proyectos].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'estado': {
          const scoreA = a.cerrado ? 0 : semaforoScore[a.semaforo] || 0;
          const scoreB = b.cerrado ? 0 : semaforoScore[b.semaforo] || 0;
          cmp = scoreA - scoreB;
          if (cmp === 0) {
            cmp = (a.atraso_dh || 0) - (b.atraso_dh || 0);
          }
          break;
        }
        case 'codigo': {
          const codA = a.callsign || a.id;
          const codB = b.callsign || b.id;
          cmp = codA.localeCompare(codB);
          break;
        }
        case 'nombre':
          cmp = a.nombre.localeCompare(b.nombre);
          break;
        case 'area':
          cmp = a.area_solicitante.localeCompare(b.area_solicitante);
          break;
        case 'etapa':
          cmp = (a.etapa_actual_nombre || '').localeCompare(b.etapa_actual_nombre || '');
          break;
        case 'avance':
          cmp = (a.avance_pct || 0) - (b.avance_pct || 0);
          break;
        case 'estimada':
          cmp = (a.fecha_reproyectada || '').localeCompare(b.fecha_reproyectada || '');
          break;
        case 'compromiso':
          cmp = (a.fecha_comprometida || '').localeCompare(b.fecha_comprometida || '');
          break;
        case 'atraso':
          cmp = (a.atraso_dh || 0) - (b.atraso_dh || 0);
          break;
        case 'sprint':
          cmp = (a.sprint_ingreso || '').localeCompare(b.sprint_ingreso || '');
          break;
        case 'responsable':
          cmp = a.responsable_comunicar_nombre.localeCompare(b.responsable_comunicar_nombre);
          break;
        case 'actualizado':
          cmp = (a.ultima_actualizacion || '').localeCompare(b.ultima_actualizacion || '');
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [proyectos, sortCol, sortOrder]);

  const totalPaginas = Math.ceil(proyectosOrdenados.length / itemsPorPagina);
  const debePaginar = proyectosOrdenados.length > itemsPorPagina;

  const proyectosPaginados = useMemo(() => {
    if (!debePaginar) return proyectosOrdenados;
    const start = (pagina - 1) * itemsPorPagina;
    return proyectosOrdenados.slice(start, start + itemsPorPagina);
  }, [proyectosOrdenados, pagina, debePaginar, itemsPorPagina]);

  const exportarCSV = () => {
    const headers = [
      'Estado',
      'Código',
      'Proyecto',
      'Área Solicitante',
      'Etapa Actual',
      'Avance %',
      'Fecha Estimada',
      'Fecha Compromiso',
      'Atraso DH',
      'Sprint Ingreso',
      'Sprint Producción',
      'Responsable',
      'Última Actualización',
    ];

    const filas = proyectosOrdenados.map((p) => [
      `"${p.semaforo}"`,
      `"${p.callsign || p.id}"`,
      `"${p.nombre.replace(/"/g, '""')}"`,
      `"${p.area_solicitante}"`,
      `"${p.etapa_actual_nombre || ''}"`,
      `"${p.avance_pct}%"`,
      `"${p.fecha_reproyectada || ''}"`,
      `"${p.fecha_comprometida || ''}"`,
      `"${p.atraso_dh || 0}"`,
      `"${p.sprint_ingreso || ''}"`,
      `"${p.fecha_produccion || ''}"`,
      `"${p.responsable_comunicar_nombre.replace(/"/g, '""')}"`,
      `"${p.ultima_actualizacion || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...filas.map((f) => f.join(';'))].join('\r\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `proyectos_misiones_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSortIcon = (col: SortColumn) => {
    if (sortCol !== col) {
      return <ArrowUpDown className="w-3 h-3 text-muted-foreground opacity-60" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-terracotta font-bold" />
    ) : (
      <ArrowDown className="w-3 h-3 text-terracotta font-bold" />
    );
  };

  if (proyectos.length === 0) {
    return (
      <div className="panel p-8 text-center space-y-4 border border-border my-6 bg-card">
        <p className="font-mono text-sm text-muted-foreground">
          No hay proyectos con estos filtros
        </p>
        {onLimpiarFiltros && (
          <button
            type="button"
            onClick={onLimpiarFiltros}
            className="px-4 py-2 rounded-xl text-xs font-mono bg-surface border border-border hover:bg-muted text-foreground transition-colors shadow-sm"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de herramientas de tabla */}
      <div className="flex items-center justify-between gap-3 text-xs font-mono">
        <div className="text-muted-foreground">
          Mostrando <span className="text-foreground font-bold">{proyectosOrdenados.length}</span> proyectos
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={exportarCSV}
            className="px-3 py-1.5 rounded-full bg-surface border border-border text-foreground hover:border-terracotta text-xs font-mono transition-colors flex items-center gap-1.5 shadow-sm"
            title="Exportar columnas visibles en formato CSV"
          >
            <Download className="w-3.5 h-3.5 text-terracotta" />
            <span>Exportar CSV</span>
          </button>

          {debePaginar && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-full bg-surface border border-border disabled:opacity-40 hover:text-foreground text-muted-foreground"
                title="Página anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] text-muted-foreground">
                {pagina} / {totalPaginas}
              </span>
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                className="p-1.5 rounded-full bg-surface border border-border disabled:opacity-40 hover:text-foreground text-muted-foreground"
                title="Página siguiente"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contenedor con Scroll Horizontal de Tabla */}
      <div className="panel overflow-hidden border border-border bg-card shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-border bg-surface text-muted-foreground text-[11px] uppercase tracking-wider select-none">
                <th
                  onClick={() => handleSort('estado')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap sticky left-0 z-20 bg-surface"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Estado</span>
                    {getSortIcon('estado')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('codigo')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Código</span>
                    {getSortIcon('codigo')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nombre')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap min-w-[200px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Proyecto</span>
                    {getSortIcon('nombre')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('area')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Área</span>
                    {getSortIcon('area')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('etapa')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap min-w-[150px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Etapa actual</span>
                    {getSortIcon('etapa')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('avance')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap min-w-[130px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Avance</span>
                    {getSortIcon('avance')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('estimada')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Est.</span>
                    {getSortIcon('estimada')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('compromiso')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Compromiso</span>
                    {getSortIcon('compromiso')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('atraso')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Atraso (dh)</span>
                    {getSortIcon('atraso')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('sprint')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Sprint prod.</span>
                    {getSortIcon('sprint')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('responsable')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Responsable</span>
                    {getSortIcon('responsable')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('actualizado')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Actualizado</span>
                    {getSortIcon('actualizado')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {proyectosPaginados.map((p) => {
                const isCritico = p.semaforo === 'rojo';
                const isAlerta = p.semaforo === 'amarillo';
                const isCerrado = p.cerrado;
                const estadoTexto = isCritico
                  ? 'Crítico'
                  : isAlerta
                  ? 'Alerta'
                  : isCerrado
                  ? 'Cerrado'
                  : 'Nominal';
                const estadoColor = isCritico
                  ? 'text-health-red'
                  : isAlerta
                  ? 'text-health-amber'
                  : isCerrado
                  ? 'text-sand'
                  : 'text-health-green';
                const StatusIcon = isCritico
                  ? Flame
                  : isAlerta
                  ? AlertTriangle
                  : isCerrado
                  ? CheckCircle2
                  : ShieldCheck;

                const tieneBloqueo = p.bloqueos_abiertos > 0 || (p.bloqueos && p.bloqueos.length > 0);
                const motivoBloqueo =
                  p.bloqueos?.[0]?.descripcion ||
                  p.bloqueos?.[0]?.motivo ||
                  p.motivos_semaforo?.[0] ||
                  'Bloqueo pendiente por área externa';

                return (
                  <tr
                    key={p.id}
                    tabIndex={0}
                    onClick={() => onSelectProyecto(p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onSelectProyecto(p);
                      }
                    }}
                    className="cursor-pointer hover:bg-muted/50 focus:bg-muted focus:outline-none transition-colors group"
                  >
                    {/* Estado: Primera columna sticky */}
                    <td className="p-3 sticky left-0 z-10 bg-card group-hover:bg-muted/70 group-focus:bg-muted/70 transition-colors whitespace-nowrap border-r border-border/50">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={`w-3.5 h-3.5 ${estadoColor} shrink-0`} />
                        <span className={`font-bold ${estadoColor}`}>{estadoTexto}</span>
                        {tieneBloqueo && (
                          <span
                            title={`Bloqueo: ${motivoBloqueo}`}
                            className="text-health-red ml-1 inline-flex items-center cursor-help"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3 whitespace-nowrap font-bold text-terracotta">
                      {p.callsign || p.id}
                    </td>

                    <td className="p-3 font-sans font-medium text-foreground min-w-[200px]">
                      <div className="line-clamp-1">{p.nombre}</div>
                    </td>

                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {p.area_solicitante}
                    </td>

                    <td className="p-3 whitespace-nowrap text-foreground min-w-[150px]">
                      <div className="line-clamp-1">{p.etapa_actual_nombre || '—'}</div>
                    </td>

                    {/* Barra de avance con tokens viz */}
                    <td className="p-3 whitespace-nowrap min-w-[130px]">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.max(0, p.avance_pct || 0))}%`,
                              backgroundColor: 'var(--viz-average)',
                            }}
                          />
                        </div>
                        <span className="font-bold text-[11px] text-foreground">{p.avance_pct}%</span>
                      </div>
                    </td>

                    <td className="p-3 whitespace-nowrap text-foreground">
                      {p.fecha_reproyectada || '—'}
                    </td>

                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {p.fecha_comprometida || '—'}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`font-bold ${
                          (p.atraso_dh || 0) > 0
                            ? 'text-health-red'
                            : (p.atraso_dh || 0) < 0
                            ? 'text-health-green'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {(p.atraso_dh || 0) > 0 ? `+${p.atraso_dh}` : p.atraso_dh || 0}
                      </span>
                    </td>

                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {p.fecha_produccion || p.sprint_ingreso || '—'}
                    </td>

                    <td className="p-3 whitespace-nowrap text-muted-foreground max-w-[160px] truncate">
                      {p.responsable_comunicar_nombre}
                    </td>

                    <td className="p-3 whitespace-nowrap text-[10px] text-muted-foreground">
                      {p.ultima_actualizacion?.slice(0, 10) || 'Reciente'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
