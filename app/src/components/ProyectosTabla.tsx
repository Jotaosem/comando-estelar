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
          // Si empatan en riesgo, ordenar por atraso descendente
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
        case 'sprint': {
          const spA = a.sprint_comprometido || a.sprint_estimado || '';
          const spB = b.sprint_comprometido || b.sprint_estimado || '';
          cmp = spA.localeCompare(spB);
          break;
        }
        case 'responsable':
          cmp = a.responsable_comunicar_nombre.localeCompare(b.responsable_comunicar_nombre);
          break;
        case 'actualizado':
          cmp = (a.ultima_actualizacion || '').localeCompare(b.ultima_actualizacion || '');
          break;
        default:
          cmp = 0;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [proyectos, sortCol, sortOrder]);

  // Paginación si hay más de 50 filas
  const totalPaginas = Math.ceil(proyectosOrdenados.length / itemsPorPagina);
  const debePaginar = proyectosOrdenados.length > 50;
  const proyectosPaginados = useMemo(() => {
    if (!debePaginar) return proyectosOrdenados;
    const start = (pagina - 1) * itemsPorPagina;
    return proyectosOrdenados.slice(start, start + itemsPorPagina);
  }, [proyectosOrdenados, debePaginar, pagina]);

  // Exportar CSV con columnas visibles (sin correos)
  const exportarCSV = () => {
    const headers = [
      'Estado',
      'Código',
      'Proyecto',
      'Área',
      'Etapa actual',
      'Avance %',
      'Est.',
      'Compromiso',
      'Atraso (dh)',
      'Sprint prod.',
      'Responsable',
      'Actualizado',
    ];

    const filas = proyectosOrdenados.map((p) => {
      const estado = p.cerrado
        ? 'Cerrado'
        : p.semaforo === 'rojo'
        ? 'Crítico'
        : p.semaforo === 'amarillo'
        ? 'En riesgo'
        : 'Nominal';
      const codigo = p.callsign || p.id.slice(0, 8);
      const nombre = `"${(p.nombre || '').replace(/"/g, '""')}"`;
      const area = `"${(p.area_solicitante || '').replace(/"/g, '""')}"`;
      const etapa = `"${(p.etapa_actual_nombre || '').replace(/"/g, '""')}"`;
      const avance = p.avance_pct || 0;
      const est = p.fecha_reproyectada || 'N/A';
      const comp = p.fecha_comprometida || 'N/A';
      const atraso = p.atraso_dh || 0;
      const sprint = p.sprint_comprometido || p.sprint_estimado || 'Sprint 4';
      const resp = `"${(p.responsable_comunicar_nombre || '').replace(/"/g, '""')}"`;
      const act = p.sin_actualizar ? 'Sin actualizar' : 'Al día';

      return [
        estado,
        codigo,
        nombre,
        area,
        etapa,
        avance,
        est,
        comp,
        atraso,
        sprint,
        resp,
        act,
      ].join(',');
    });

    const csvData = '\uFEFF' + [headers.join(','), ...filas].join('\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `proyectos_misiones_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSortIcon = (col: SortColumn) => {
    if (sortCol !== col) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-cyan-400 font-bold" />
    ) : (
      <ArrowDown className="w-3 h-3 text-cyan-400 font-bold" />
    );
  };

  if (proyectos.length === 0) {
    return (
      <div className="hud-glass rounded-2xl p-8 text-center space-y-4 border border-cyan-500/30 my-6">
        <p className="font-mono text-sm text-slate-300">
          No hay proyectos con estos filtros
        </p>
        {onLimpiarFiltros && (
          <button
            type="button"
            onClick={onLimpiarFiltros}
            className="px-4 py-2 rounded-lg text-xs font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-500/30 transition-colors shadow-[0_0_15px_rgba(0,242,254,0.2)]"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de herramientas de tabla (Exportar CSV y Paginador) */}
      <div className="flex items-center justify-between gap-3 text-xs font-mono">
        <div className="text-slate-400">
          Mostrando <span className="text-cyan-300 font-bold">{proyectosOrdenados.length}</span> proyectos
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={exportarCSV}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/30 text-cyan-300 hover:text-white hover:border-cyan-400 text-xs font-mono transition-all flex items-center gap-1.5 shadow-sm"
            title="Exportar columnas visibles en formato CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>

          {debePaginar && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded bg-slate-900 border border-slate-700 disabled:opacity-40 hover:text-cyan-300 text-slate-300"
                title="Página anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] text-slate-400">
                {pagina} / {totalPaginas}
              </span>
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                className="p-1.5 rounded bg-slate-900 border border-slate-700 disabled:opacity-40 hover:text-cyan-300 text-slate-300"
                title="Página siguiente"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Vista Desktop: Tabla completa con sticky header y primera columna sticky */}
      <div className="hidden md:block w-full overflow-x-auto rounded-2xl hud-glass border border-cyan-500/30 shadow-2xl">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead className="sticky top-0 z-20 bg-[#040817]/95 backdrop-blur-md border-b border-cyan-500/30 text-slate-300 select-none uppercase tracking-wider text-[11px]">
            <tr>
              {/* Primera columna sticky en scroll horizontal */}
              <th
                onClick={() => handleSort('estado')}
                className="p-3 sticky left-0 z-30 bg-[#040817] cursor-pointer hover:text-cyan-300 transition-colors whitespace-nowrap min-w-[120px]"
              >
                <div className="flex items-center gap-1.5">
                  <span>Estado</span>
                  {getSortIcon('estado')}
                </div>
              </th>
              <th
                onClick={() => handleSort('codigo')}
                className="p-3 cursor-pointer hover:text-cyan-300 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <span>Código</span>
                  {getSortIcon('codigo')}
                </div>
              </th>
              <th
                onClick={() => handleSort('nombre')}
                className="p-3 cursor-pointer hover:text-cyan-300 transition-colors whitespace-nowrap min-w-[200px]"
              >
                <div className="flex items-center gap-1.5">
                  <span>Proyecto</span>
                  {getSortIcon('nombre')}
                </div>
              </th>
              <th
                onClick={() => handleSort('area')}
                className="p-3 cursor-pointer hover:text-cyan-300 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <span>Área</span>
                  {getSortIcon('area')}
                </div>
              </th>
              <th
                onClick={() => handleSort('etapa')}
                className="p-3 cursor-pointer hover:text-cyan-300 transition-colors whitespace-nowrap min-w-[150px]"
              >
                <div className="flex items-center gap-1.5">
                  <span>Etapa actual</span>
                  {getSortIcon('etapa')}
                </div>
              </th>
              <th
                onClick={() => handleSort('avance')}
                className="p-3 cursor-pointer hover:text-cyan-300 transition-colors whitespace-nowrap min-w-[130px]"
              >
                <div className="flex items-center gap-1.5">
                  <span>Avance</span>
                  {getSortIcon('avance')}
                </div>
              </th>
              <th
                onClick={() => handleSort('estimada')}
                className="p-3 cursor-pointer hover:text-cyan-300 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <span>Est.</span>
                  {getSortIcon('estimada')}
                </div>
              </th>
              <th
                onClick={() => handleSort('compromiso')}
                className="p-3 cursor-pointer hover:text-cyan-300 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <span>Compromiso</span>
                  {getSortIcon('compromiso')}
                </div>
              </th>
              <th
                onClick={() => handleSort('atraso')}
                className="p-3 cursor-pointer hover:text-cyan-300 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <span>Atraso (dh)</span>
                  {getSortIcon('atraso')}
                </div>
              </th>
              <th
                onClick={() => handleSort('sprint')}
                className="p-3 cursor-pointer hover:text-cyan-300 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <span>Sprint prod.</span>
                  {getSortIcon('sprint')}
                </div>
              </th>
              <th
                onClick={() => handleSort('responsable')}
                className="p-3 cursor-pointer hover:text-cyan-300 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <span>Responsable</span>
                  {getSortIcon('responsable')}
                </div>
              </th>
              <th
                onClick={() => handleSort('actualizado')}
                className="p-3 cursor-pointer hover:text-cyan-300 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <span>Actualizado</span>
                  {getSortIcon('actualizado')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200">
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
                ? 'text-rose-400'
                : isAlerta
                ? 'text-amber-400'
                : isCerrado
                ? 'text-yellow-400'
                : 'text-emerald-400';
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
                  className="cursor-pointer hover:bg-cyan-500/10 focus:bg-cyan-500/15 focus:outline-none transition-colors group"
                >
                  {/* Estado: Primera columna sticky */}
                  <td className="p-3 sticky left-0 z-10 bg-[#040817] group-hover:bg-[#081226] group-focus:bg-[#081226] transition-colors whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={`w-3.5 h-3.5 ${estadoColor} shrink-0`} />
                      <span className={`font-bold ${estadoColor}`}>{estadoTexto}</span>
                      {tieneBloqueo && (
                        <span
                          title={`Bloqueo: ${motivoBloqueo}`}
                          className="text-rose-400 ml-1 inline-flex items-center cursor-help"
                        >
                          <Lock className="w-3.5 h-3.5 animate-pulse" />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Código */}
                  <td className="p-3 text-cyan-400 font-bold whitespace-nowrap">
                    {p.callsign || p.id.slice(0, 8)}
                  </td>

                  {/* Proyecto */}
                  <td className="p-3 font-sans font-bold text-white group-hover:text-cyan-300 transition-colors whitespace-nowrap">
                    {p.nombre}
                  </td>

                  {/* Área */}
                  <td className="p-3 text-slate-400 whitespace-nowrap">
                    {p.area_solicitante}
                  </td>

                  {/* Etapa actual */}
                  <td className="p-3 text-slate-300 whitespace-nowrap">
                    {p.etapa_actual_nombre || 'N/A'}
                  </td>

                  {/* Avance (barra + %) */}
                  <td className="p-3 whitespace-nowrap min-w-[120px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden w-16">
                        <div
                          className={`h-full rounded-full ${
                            isCritico
                              ? 'bg-rose-500'
                              : isAlerta
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                          style={{ width: `${p.avance_pct}%` }}
                        />
                      </div>
                      <span className="font-bold text-[11px] text-slate-200">
                        {p.avance_pct}%
                      </span>
                    </div>
                  </td>

                  {/* Est. */}
                  <td className="p-3 text-slate-300 whitespace-nowrap">
                    {p.fecha_reproyectada || 'N/A'}
                  </td>

                  {/* Compromiso */}
                  <td className="p-3 text-slate-400 whitespace-nowrap">
                    {p.fecha_comprometida || 'N/A'}
                  </td>

                  {/* Atraso (dh) */}
                  <td
                    className={`p-3 font-bold whitespace-nowrap ${
                      p.atraso_dh > 0
                        ? 'text-rose-400'
                        : p.atraso_dh < 0
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {p.atraso_dh > 0
                      ? `+${p.atraso_dh} dh`
                      : p.atraso_dh < 0
                      ? `${p.atraso_dh} dh`
                      : '0 dh'}
                  </td>

                  {/* Sprint prod. */}
                  <td className="p-3 text-slate-400 whitespace-nowrap">
                    {p.sprint_comprometido || p.sprint_estimado || 'Sprint 4'}
                  </td>

                  {/* Responsable */}
                  <td className="p-3 text-slate-300 whitespace-nowrap">
                    {p.responsable_comunicar_nombre}
                  </td>

                  {/* Actualizado */}
                  <td className="p-3 whitespace-nowrap">
                    {p.sin_actualizar ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Sin actualizar
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        {p.ultima_actualizacion ? p.ultima_actualizacion.slice(0, 10) : 'Al día'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vista Mobile (<768px): Mini tarjeta de 3 líneas */}
      <div className="md:hidden space-y-3">
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
            ? 'text-rose-400'
            : isAlerta
            ? 'text-amber-400'
            : isCerrado
            ? 'text-yellow-400'
            : 'text-emerald-400';
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
            'Bloqueo pendiente';

          return (
            <div
              key={p.id}
              tabIndex={0}
              onClick={() => onSelectProyecto(p)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSelectProyecto(p);
              }}
              className="p-3 rounded-xl hud-glass border border-cyan-500/30 bg-[#030818]/95 space-y-1.5 cursor-pointer hover:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            >
              {/* Línea 1: estado + código + nombre */}
              <div className="flex items-center justify-between gap-2 font-mono text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <StatusIcon className={`w-3.5 h-3.5 ${estadoColor} shrink-0`} />
                  <span className={`font-bold text-[10px] uppercase ${estadoColor}`}>
                    {estadoTexto}
                  </span>
                  {tieneBloqueo && (
                    <span title={`Bloqueo: ${motivoBloqueo}`} className="text-rose-400 shrink-0">
                      <Lock className="w-3 h-3 animate-pulse" />
                    </span>
                  )}
                  <span className="text-cyan-400 text-[10px] font-bold shrink-0">
                    {p.callsign || p.id.slice(0, 8)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {p.area_solicitante}
                </div>
              </div>
              <div className="font-sans font-bold text-xs text-white truncate">
                {p.nombre}
              </div>

              {/* Línea 2: etapa + avance */}
              <div className="flex items-center justify-between text-xs font-mono text-slate-300 pt-0.5">
                <span className="text-[11px] truncate">
                  Etapa: <strong className="text-cyan-300">{p.etapa_actual_nombre || 'N/A'}</strong>
                </span>
                <span className="font-bold text-emerald-400 shrink-0">
                  {p.avance_pct}%
                </span>
              </div>

              {/* Línea 3: fecha estimada + atraso */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-1">
                <span>
                  Est: <strong className="text-slate-200">{p.fecha_reproyectada || 'N/A'}</strong>
                </span>
                <span
                  className={`font-bold ${
                    p.atraso_dh > 0
                      ? 'text-rose-400'
                      : p.atraso_dh < 0
                      ? 'text-emerald-400'
                      : 'text-slate-400'
                  }`}
                >
                  {p.atraso_dh > 0 ? `+${p.atraso_dh} dh` : `${p.atraso_dh} dh`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

