import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import type { ProyectoResumenUI } from '../../lib/proyectosData';
import { Search, Command, X } from 'lucide-react';
import { useNavigationStore } from './navigationStore';
import { Z_LAYERS } from '../../constants/zLayers';

interface GalaxySearchBarProps {
  proyectos: ProyectoResumenUI[];
  onSelectProyecto?: (p: ProyectoResumenUI) => void;
  onFilterChange?: (query: string, matchingIds: Set<string> | null) => void;
  className?: string;
  placeholder?: string;
}

// Resaltado con <mark> inline sin padding ni margen (background cian 25%, color heredado).
function renderHighlightedText(text: string, indices?: readonly [number, number][]) {
  if (!text) return null;
  if (!indices || indices.length === 0) return <span>{text}</span>;

  const sorted = [...indices].sort((a, b) => a[0] - b[0]);
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  sorted.forEach(([start, end], i) => {
    if (start > lastIndex) {
      elements.push(<span key={`text-${i}`}>{text.slice(lastIndex, start)}</span>);
    }
    elements.push(
      <mark
        key={`mark-${i}`}
        className="bg-cyan-400/25 text-inherit p-0 m-0 rounded-none font-bold"
      >
        {text.slice(start, end + 1)}
      </mark>
    );
    lastIndex = end + 1;
  });

  if (lastIndex < text.length) {
    elements.push(<span key="text-end">{text.slice(lastIndex)}</span>);
  }

  return <>{elements}</>;
}

export const GalaxySearchBar: React.FC<GalaxySearchBarProps> = ({
  proyectos,
  onSelectProyecto,
  onFilterChange,
  className = '',
  placeholder = 'Buscar proyecto…',
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { searchQuery, setSearchQuery, setIsSearchDropdownOpen } = useNavigationStore();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [portalPosition, setPortalPosition] = useState({ top: 0, left: 10, width: 340 });

  // Inicializar store desde URL param si existe en el primer montaje
  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam && qParam !== searchQuery) {
      setSearchQuery(qParam);
    }
  }, []);

  // Actualizar la URL ?q= con debounce de 300ms a partir del store
  useEffect(() => {
    const timer = setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams);
      if (searchQuery.trim()) {
        nextParams.set('q', searchQuery);
      } else {
        nextParams.delete('q');
      }
      setSearchParams(nextParams, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Configuración de Fuse.js (minMatchCharLength: 2, threshold: 0.3)
  const fuse = useMemo(() => {
    return new Fuse(proyectos, {
      keys: [
        { name: 'nombre', weight: 0.35 },
        { name: 'callsign', weight: 0.25 },
        { name: 'codigo', getFn: (p: any) => p.callsign || '', weight: 0.25 },
        { name: 'descripcion', weight: 0.3 },
        { name: 'palabras_clave', weight: 0.2 },
        { name: 'area_solicitante', weight: 0.15 },
        { name: 'responsable_comunicar_nombre', weight: 0.1 },
      ],
      threshold: 0.3,
      ignoreLocation: true,
      minMatchCharLength: 2,
      includeMatches: true,
    });
  }, [proyectos]);

  // Resultados de Fuse: a partir de 2 caracteres
  const rawResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return [];
    return fuse.search(searchQuery).slice(0, 8);
  }, [searchQuery, fuse]);

  // Notificar al padre sobre los IDs filtrados sin loops de renderizado
  const onFilterChangeRef = useRef(onFilterChange);
  useEffect(() => {
    onFilterChangeRef.current = onFilterChange;
  }, [onFilterChange]);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      onFilterChangeRef.current?.('', null);
    } else if (rawResults.length === 0) {
      // Sin coincidencias: no atenuar toda la galaxia
      onFilterChangeRef.current?.(searchQuery, null);
    } else {
      const ids = new Set(rawResults.map((r) => r.item.id));
      onFilterChangeRef.current?.(searchQuery, ids);
    }
  }, [searchQuery, rawResults]);

  // Dropdown visible cuando el input tiene foco/está abierto y hay texto escrito
  const dropdownVisible = isOpen && searchQuery.length > 0;

  useEffect(() => {
    setIsSearchDropdownOpen(dropdownVisible);
    return () => setIsSearchDropdownOpen(false);
  }, [dropdownVisible, setIsSearchDropdownOpen]);

  // Actualizar coordenadas del portal
  useEffect(() => {
    const updatePosition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
          setPortalPosition({
            top: rect.bottom + window.scrollY + 6,
            left: 10,
            width: window.innerWidth - 20,
          });
        } else {
          setPortalPosition({
            top: rect.bottom + window.scrollY + 6,
            left: Math.max(10, Math.min(window.innerWidth - 370, rect.left + window.scrollX)),
            width: Math.max(340, Math.min(450, rect.width)),
          });
        }
      }
    };

    if (dropdownVisible) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [dropdownVisible]);

  // Atajo global Ctrl+K / Cmd+K y Esc
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === 'Escape') {
        if (!searchQuery) {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [searchQuery]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !document.getElementById('galaxy-search-results-portal')?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (p: ProyectoResumenUI) => {
    setSearchQuery(p.nombre);
    setIsOpen(false);
    if (onSelectProyecto) {
      onSelectProyecto(p);
    } else {
      navigate(`/proyectos/${p.id}`);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setIsOpen(false);
    onFilterChange?.('', null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      if (rawResults.length > 0) {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % rawResults.length);
      }
    } else if (e.key === 'ArrowUp') {
      if (rawResults.length > 0) {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + rawResults.length) % rawResults.length);
      }
    } else if (e.key === 'Enter') {
      if (rawResults.length > 0) {
        e.preventDefault();
        const item = rawResults[selectedIndex]?.item;
        if (item) handleSelect(item);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const mapKeyLabel = (keyName?: string) => {
    switch (keyName) {
      case 'nombre':
        return 'en nombre';
      case 'callsign':
      case 'codigo':
        return 'en código';
      case 'descripcion':
        return 'en descripción';
      case 'area_solicitante':
        return 'en área';
      case 'responsable_comunicar_nombre':
        return 'en responsable';
      case 'palabras_clave':
        return 'en palabra clave';
      default:
        return 'en proyecto';
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input de Búsqueda Controlado */}
      <div className="relative flex items-center w-full">
        <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder || 'Buscar proyecto…'}
          className="w-full h-8 pl-8 pr-16 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all shadow-inner"
        />

        {/* Botón X de limpieza cuando hay texto */}
        {searchQuery.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-7 text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            title="Limpiar campo"
            aria-label="Limpiar campo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Badge Ctrl+K */}
        <div className="absolute right-2 flex items-center gap-0.5 text-[9px] font-mono text-slate-500 px-1 py-0.5 rounded border border-slate-700 bg-black/40 pointer-events-none">
          <Command className="w-2.5 h-2.5" />
          <span>K</span>
        </div>
      </div>

      {/* Dropdown en Portal */}
      {dropdownVisible &&
        createPortal(
          <div
            id="galaxy-search-results-portal"
            style={{
              position: 'absolute',
              top: `${portalPosition.top}px`,
              left: `${portalPosition.left}px`,
              width: `${portalPosition.width}px`,
              zIndex: Z_LAYERS.POPOVER_DROPDOWN,
            }}
            className="search-dropdown-results rounded-2xl bg-[#030919]/98 border border-cyan-500/50 shadow-[0_20px_50px_rgba(0,0,0,0.95)] backdrop-blur-2xl p-2 animate-in fade-in zoom-in-95"
          >
            {/* Caso 1: Menos de 2 caracteres */}
            {searchQuery.trim().length < 2 && (
              <div className="p-3 text-center text-xs font-mono text-slate-400">
                Escribe al menos 2 letras
              </div>
            )}

            {/* Caso 2: Desde 2 caracteres pero sin resultados */}
            {searchQuery.trim().length >= 2 && rawResults.length === 0 && (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs font-mono text-slate-400">
                  Sin coincidencias para «<span className="text-cyan-300 font-bold">{searchQuery}</span>»
                </p>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-1 text-[11px] font-mono rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 transition-colors"
                >
                  Limpiar búsqueda
                </button>
              </div>
            )}

            {/* Caso 3: Resultados encontrados */}
            {searchQuery.trim().length >= 2 && rawResults.length > 0 && (
              <>
                <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest px-2 py-1 mb-1 border-b border-cyan-500/20 flex items-center justify-between">
                  <span>Coincidencias ({rawResults.length})</span>
                  <span className="text-[9px] text-slate-500">Esc para cerrar</span>
                </div>
                <div className="space-y-1 max-h-[380px] overflow-y-auto">
                  {rawResults.map((result, idx) => {
                    const p = result.item;
                    const isSelected = idx === selectedIndex;
                    const isCritico = p.semaforo === 'rojo';
                    const isAlerta = p.semaforo === 'amarillo';
                    const estadoLabel = isCritico ? 'Crítico' : isAlerta ? 'Alerta' : p.cerrado ? 'Cerrado' : 'Nominal';
                    const estadoColor = isCritico ? 'text-rose-400' : isAlerta ? 'text-amber-400' : 'text-emerald-400';

                    const primaryMatch = result.matches?.[0];
                    const matchField = primaryMatch?.key;
                    const matchFieldLabel = mapKeyLabel(matchField);

                    const descMatch = result.matches?.find((m) => m.key === 'descripcion');
                    const nombreMatch = result.matches?.find((m) => m.key === 'nombre');
                    const callsignMatch = result.matches?.find((m) => m.key === 'callsign' || m.key === 'codigo');

                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelect(p)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`p-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                          isSelected
                            ? 'bg-cyan-500/20 border border-cyan-400/50 text-white shadow-[0_0_15px_rgba(0,242,254,0.15)]'
                            : 'text-slate-300 hover:bg-slate-900/80 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-display font-bold">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isCritico ? 'bg-rose-500' : isAlerta ? 'bg-amber-400' : 'bg-emerald-400'
                              } shrink-0`}
                            />
                            <span className={`text-[10px] font-mono font-bold ${estadoColor}`}>
                              {estadoLabel}
                            </span>
                            <span className="text-cyan-400 font-mono text-[10px]">
                              {callsignMatch
                                ? renderHighlightedText(p.callsign || '', callsignMatch.indices)
                                : p.callsign || p.nombre.split('(')[0].trim()}
                            </span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-400 font-sans text-[11px] truncate">
                              {p.area_solicitante}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                            <span className="text-[9px] text-cyan-400/80 uppercase px-1 rounded bg-cyan-950/60 border border-cyan-500/30">
                              {matchFieldLabel}
                            </span>
                            <span className="text-cyan-300 font-bold">{p.avance_pct}%</span>
                          </div>
                        </div>

                        {/* Título o descripción */}
                        <div className="mt-1 font-sans text-[11px] text-slate-200">
                          {nombreMatch ? renderHighlightedText(p.nombre, nombreMatch.indices) : p.nombre}
                        </div>

                        {p.descripcion && (
                          <div className="text-[11px] text-slate-300 font-sans mt-0.5 line-clamp-2 leading-relaxed">
                            {descMatch ? renderHighlightedText(p.descripcion, descMatch.indices) : p.descripcion}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
