import React, { useState, useMemo } from 'react';
import type { ProyectoView } from '../data/proyectoView';
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
  proyectos: ProyectoView[];
  onSelectProyecto: (p: ProyectoView) => void;
  onLimpiarFiltros?: () => void;
}

type SortColumn =
  | 'estado'
  | 'codigo'
  | 'nombre'
  | 'fase'
  | 'area'
  | 'etapa'
  | 'avance'
  | 'compromiso'
  | 'estimada'
  | 'atraso'
  | 'sprint'
  | 'responsable'
  | 'actualizado';

// Mapeo de riesgo para orden canónico:
// Crítico (1), Alerta (2), Sin evaluar (3), Nominal (4), Cerrado (5), Cancelado (6)
function getRiesgoScore(p: ProyectoView): number {
  if (p.cancelado || p.fase_macro === 'Cancelado') return 6;
  if (p.cerrado || p.fase_macro === 'Cerrado') return 5;
  if (p.semaforo === 'rojo') return 1;
  if (p.semaforo === 'amarillo') return 2;
  if (p.semaforo === 'gris') return 3;
  return 4; // verde
}

export const ProyectosTabla: React.FC<ProyectosTablaProps> = ({
  proyectos,
  onSelectProyecto,
  onLimpiarFiltros,
}) => {
  const [sortCol, setSortCol] = useState<SortColumn>('estado');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pagina, setPagina] = useState<number>(1);
  const itemsPorPagina = 25;

  // Columnas condicionales: visibles solo si al menos una fila tiene ese dato
  const tieneCodigo = useMemo(
    () => proyectos.some((p) => Boolean(p.codigo && p.codigo.trim() !== '')),
    [proyectos]
  );
  const tieneSprint = useMemo(
    () =>
      proyectos.some(
        (p) => Boolean(p.sprint_ingreso || p.sprint_comprometido || p.sprint_estimado)
      ),
    [proyectos]
  );

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
          const scoreA = getRiesgoScore(a);
          const scoreB = getRiesgoScore(b);
          cmp = scoreA - scoreB;
          if (cmp === 0) {
            cmp = a.nombre.localeCompare(b.nombre);
          }
          break;
        }
        case 'codigo': {
          const codA = a.codigo || '';
          const codB = b.codigo || '';
          cmp = codA.localeCompare(codB);
          break;
        }
        case 'nombre':
          cmp = a.nombre.localeCompare(b.nombre);
          break;
        case 'fase':
          cmp = a.fase_macro.localeCompare(b.fase_macro);
          break;
        case 'area':
          cmp = a.area_nombre.localeCompare(b.area_nombre);
          break;
        case 'etapa':
          cmp = (a.etapa_actual || '').localeCompare(b.etapa_actual || '');
          break;
        case 'avance':
          cmp = (a.avance_pct || 0) - (b.avance_pct || 0);
          break;
        case 'compromiso':
          cmp = (a.fecha_comprometida || '').localeCompare(b.fecha_comprometida || '');
          break;
        case 'estimada':
          cmp = (a.fecha_estimada || '').localeCompare(b.fecha_estimada || '');
          break;
        case 'atraso': {
          const atA = a.atraso_dh !== null ? a.atraso_dh : -9999;
          const atB = b.atraso_dh !== null ? b.atraso_dh : -9999;
          cmp = atA - atB;
          break;
        }
        case 'sprint':
          cmp = (a.sprint_ingreso || '').localeCompare(b.sprint_ingreso || '');
          break;
        case 'responsable':
          cmp = a.responsable_nombre.localeCompare(b.responsable_nombre);
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
    const headers: string[] = ['Estado'];
    if (tieneCodigo) headers.push('Código');
    headers.push(
      'Proyecto',
      'Fase',
      'Área',
      'Etapa actual',
      'Avance %',
      'Compromiso',
      'Estimada',
      'Atraso (dh)'
    );
    if (tieneSprint) headers.push('Sprint');
    headers.push('Responsable', 'Actualizado');

    const filas = proyectosOrdenados.map((p) => {
      const fila: string[] = [`"${p.estado_display}"`];
      if (tieneCodigo) fila.push(`"${p.codigo || ''}"`);
      fila.push(
        `"${p.nombre.replace(/"/g, '""')}"`,
        `"${p.fase_macro}"`,
        `"${p.area_nombre}"`,
        `"${p.etapa_actual || ''}"`,
        `"${p.avance_pct}%"`,
        `"${p.fecha_comprometida || ''}"`,
        `"${p.fecha_estimada || ''}"`,
        `"${p.atraso_display}"`
      );
      if (tieneSprint) fila.push(`"${p.sprint_ingreso || ''}"`);
      fila.push(
        `"${p.responsable_nombre.replace(/"/g, '""')}"`,
        `"${p.ultima_actualizacion || ''}"`
      );
      return fila;
    });

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

  const renderBadgeEstado = (p: ProyectoView) => {
    switch (p.estado_display) {
      case 'Crítico':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-health-red-soft text-health-red border border-health-red/30">
            <Flame className="w-3 h-3 text-health-red" />
            <span>Crítico</span>
          </span>
        );
      case 'Alerta':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-health-amber-soft text-health-amber border border-health-amber/30">
            <AlertTriangle className="w-3 h-3 text-health-amber" />
            <span>Alerta</span>
          </span>
        );
      case 'Nominal':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-health-green-soft text-health-green border border-health-green/30">
            <ShieldCheck className="w-3 h-3 text-health-green" />
            <span>Nominal</span>
          </span>
        );
      case 'Cerrado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface text-muted-foreground border border-border">
            <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
            <span>Cerrado</span>
          </span>
        );
      case 'Cancelado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface text-muted-foreground/60 border border-border opacity-60">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
            <span>Cancelado</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface text-muted-foreground border border-border">
            <span className="w-2 h-2 rounded-full bg-muted" />
            <span>Sin evaluar</span>
          </span>
        );
    }
  };

  if (proyectos.length === 0) {
    return (
      <div className="panel p-12 text-center border border-border bg-card shadow-panel font-mono">
        <p className="text-sm text-muted-foreground">
          No se encontraron proyectos con los filtros seleccionados.
        </p>
        {onLimpiarFiltros && (
          <button
            onClick={onLimpiarFiltros}
            className="mt-4 px-4 py-2 rounded-xl bg-terracotta text-white text-xs font-semibold hover:opacity-90 shadow-cta transition-all"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 font-mono">
      {/* Barra de utilidades: Total proyectos y Exportar CSV */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div>
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
                {/* 1. Estado */}
                <th
                  onClick={() => handleSort('estado')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap sticky left-0 z-20 bg-surface"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Estado</span>
                    {getSortIcon('estado')}
                  </div>
                </th>

                {/* Código (condicional) */}
                {tieneCodigo && (
                  <th
                    onClick={() => handleSort('codigo')}
                    className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Código</span>
                      {getSortIcon('codigo')}
                    </div>
                  </th>
                )}

                {/* 2. Proyecto */}
                <th
                  onClick={() => handleSort('nombre')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap min-w-[200px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Proyecto</span>
                    {getSortIcon('nombre')}
                  </div>
                </th>

                {/* 3. Fase */}
                <th
                  onClick={() => handleSort('fase')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Fase</span>
                    {getSortIcon('fase')}
                  </div>
                </th>

                {/* 4. Área */}
                <th
                  onClick={() => handleSort('area')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Área</span>
                    {getSortIcon('area')}
                  </div>
                </th>

                {/* 5. Etapa actual */}
                <th
                  onClick={() => handleSort('etapa')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap min-w-[150px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Etapa actual</span>
                    {getSortIcon('etapa')}
                  </div>
                </th>

                {/* 6. Avance */}
                <th
                  onClick={() => handleSort('avance')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap min-w-[120px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Avance</span>
                    {getSortIcon('avance')}
                  </div>
                </th>

                {/* 7. Compromiso */}
                <th
                  onClick={() => handleSort('compromiso')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Compromiso</span>
                    {getSortIcon('compromiso')}
                  </div>
                </th>

                {/* 8. Estimada */}
                <th
                  onClick={() => handleSort('estimada')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Estimada</span>
                    {getSortIcon('estimada')}
                  </div>
                </th>

                {/* 9. Atraso (dh) */}
                <th
                  onClick={() => handleSort('atraso')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Atraso (dh)</span>
                    {getSortIcon('atraso')}
                  </div>
                </th>

                {/* Sprint (condicional) */}
                {tieneSprint && (
                  <th
                    onClick={() => handleSort('sprint')}
                    className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Sprint</span>
                      {getSortIcon('sprint')}
                    </div>
                  </th>
                )}

                {/* 10. Responsable */}
                <th
                  onClick={() => handleSort('responsable')}
                  className="p-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Responsable</span>
                    {getSortIcon('responsable')}
                  </div>
                </th>

                {/* 11. Actualizado */}
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
            <tbody className="divide-y divide-border">
              {proyectosPaginados.map((p) => {
                const isAtenuado = p.cerrado || p.cancelado;

                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectProyecto(p)}
                    className={`cursor-pointer hover:bg-surface/80 transition-colors group ${
                      isAtenuado ? 'opacity-70' : ''
                    }`}
                  >
                    {/* 1. Estado */}
                    <td className="p-3 whitespace-nowrap sticky left-0 bg-card group-hover:bg-surface/80 transition-colors z-10">
                      {renderBadgeEstado(p)}
                    </td>

                    {/* Código (condicional) */}
                    {tieneCodigo && (
                      <td className="p-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                        {p.codigo || '—'}
                      </td>
                    )}

                    {/* 2. Proyecto */}
                    <td className="p-3 min-w-[200px]">
                      <div className="font-sans font-semibold text-foreground text-xs group-hover:text-terracotta transition-colors flex items-center gap-2">
                        <span>{p.nombre}</span>
                        {p.puede_ver_detalle === false && (
                          <span title="Detalle restringido">
                            <Lock className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Fase */}
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-surface border border-border text-foreground font-semibold">
                        {p.fase_macro}
                      </span>
                    </td>

                    {/* 4. Área */}
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {p.area_nombre}
                    </td>

                    {/* 5. Etapa actual */}
                    <td className="p-3 whitespace-nowrap font-sans text-xs">
                      {p.etapa_actual ? (
                        <span className="text-foreground">{p.etapa_actual}</span>
                      ) : (
                        <span className="text-muted-foreground/50 italic">Sin etapa</span>
                      )}
                    </td>

                    {/* 6. Avance */}
                    <td className="p-3 whitespace-nowrap min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 rounded-full bg-surface overflow-hidden border border-border">
                          <div
                            className="h-full bg-terracotta rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, p.avance_pct))}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-foreground font-bold">{p.avance_pct}%</span>
                      </div>
                    </td>

                    {/* 7. Compromiso */}
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {p.fecha_comprometida || '—'}
                    </td>

                    {/* 8. Estimada */}
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {p.fecha_estimada || '—'}
                    </td>

                    {/* 9. Atraso (dh) */}
                    <td className="p-3 whitespace-nowrap">
                      {p.atraso_dh !== null ? (
                        <span
                          className={`font-semibold ${
                            p.atraso_dh > 0
                              ? 'text-health-red'
                              : p.atraso_dh < 0
                              ? 'text-health-green'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {p.atraso_display} dh
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>

                    {/* Sprint (condicional) */}
                    {tieneSprint && (
                      <td className="p-3 whitespace-nowrap text-muted-foreground text-[11px]">
                        {p.sprint_ingreso || '—'}
                      </td>
                    )}

                    {/* 10. Responsable */}
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {p.responsable_nombre}
                    </td>

                    {/* 11. Actualizado */}
                    <td className="p-3 whitespace-nowrap text-muted-foreground text-[10px]">
                      {p.ultima_actualizacion
                        ? p.ultima_actualizacion.slice(0, 10)
                        : '—'}
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
