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

// Resaltado con <mark> inline sin padding ni margen (background terracota 25%, color heredado).
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
        className="bg-terracotta/25 text-inherit p-0 m-0 rounded-none font-bold"
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
  const { searchQuery, setSearchQuery, setIsSearchDropdownOpen, seleccionarProyecto } = useNavigationStore();

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
      const currentParam = searchParams.get('q') || '';
      if (searchQuery !== currentParam) {
        const nextParams = new URLSearchParams(searchParams);
        if (searchQuery) {
          nextParams.set('q', searchQuery);
        } else {
          nextParams.delete('q');
        }
        setSearchParams(nextParams, { replace: true });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchParams, setSearchParams]);

  // Instancia Fuse.js memoizada
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

  // REQUERIMIENTO 1: Al seleccionar un resultado (click o Enter):
  // · Galaxia → la cámara vuela al planeta y entra al nivel planeta.
  // · Tarjetas o tabla → navega a /proyectos/:id.
  // · Planeta, etapa o detalle → navega al proyecto elegido en la misma vista.
  // Después de navegar, el input se limpia y se quita el filtro (sin dejar lista filtrada a 1).
  const handleSelect = (p: ProyectoResumenUI) => {
    setSearchQuery('');
    setIsOpen(false);
    onFilterChange?.('', null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });

    if (onSelectProyecto) {
      onSelectProyecto(p);
    } else {
      const urlVista = searchParams.get('vista');
      const esGalaxia = !urlVista || urlVista === 'galaxia';
      if (esGalaxia && window.location.pathname === '/') {
        seleccionarProyecto(p);
      } else {
        navigate(`/proyectos/${p.id}`);
      }
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
        return 'Proyecto';
      case 'callsign':
      case 'codigo':
        return 'Código';
      case 'descripcion':
        return 'Descripción';
      case 'palabras_clave':
        return 'Etiqueta';
      case 'area_solicitante':
        return 'Área';
      case 'responsable_comunicar_nombre':
        return 'Responsable';
      default:
        return 'Coincidencia';
    }
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Input de Búsqueda controlado */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
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
          placeholder={placeholder}
          className="w-full pl-9 pr-14 py-1.5 rounded-full bg-card/90 border border-border focus:border-terracotta focus:ring-1 focus:ring-terracotta text-foreground placeholder:text-muted-foreground text-xs font-mono transition-all outline-none shadow-sm"
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {searchQuery ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Limpiar campo"
              title="Limpiar búsqueda"
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border text-[9px] font-mono text-muted-foreground bg-surface">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown flotante montado en Portal */}
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
            className="rounded-2xl bg-card border border-border shadow-panel backdrop-blur-2xl overflow-hidden font-sans animate-in fade-in zoom-in-95"
          >
            {searchQuery.trim().length < 2 ? (
              <div className="p-3 text-center text-xs font-mono text-muted-foreground">
                Escribe al menos 2 letras para buscar…
              </div>
            ) : rawResults.length === 0 ? (
              <div className="p-4 text-center space-y-2">
                <div className="text-xs font-mono text-muted-foreground">
                  Sin coincidencias para «<strong className="text-foreground">{searchQuery}</strong>»
                </div>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-1 rounded-full text-xs font-mono bg-surface border border-border text-foreground hover:bg-muted transition-colors shadow-sm"
                >
                  Limpiar búsqueda
                </button>
              </div>
            ) : (
              <div className="max-h-[340px] overflow-y-auto divide-y divide-border/60">
                {rawResults.map((res, idx) => {
                  const p = res.item;
                  const isSelected = idx === selectedIndex;
                  const primaryMatch = res.matches?.[0];
                  const matchKey = primaryMatch?.key;
                  const matchIndices = primaryMatch?.indices;

                  const semColor =
                    p.semaforo === 'rojo'
                      ? 'text-health-red bg-health-red-soft border-health-red/30'
                      : p.semaforo === 'amarillo'
                      ? 'text-health-amber bg-health-amber-soft border-health-amber/30'
                      : 'text-health-green bg-health-green-soft border-health-green/30';

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelect(p)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`p-2.5 sm:p-3 cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-muted/70 text-foreground'
                          : 'hover:bg-surface text-foreground'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`px-1.5 py-0.2 rounded-full border text-[9px] font-mono font-bold uppercase ${semColor}`}>
                            {p.semaforo}
                          </span>
                          <span className="text-[10px] font-mono text-terracotta font-semibold truncate">
                            {matchKey === 'callsign' || matchKey === 'codigo'
                              ? renderHighlightedText(p.callsign || p.id, matchIndices)
                              : p.callsign || p.id}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            · {p.area_solicitante}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-foreground truncate">
                          {matchKey === 'nombre'
                            ? renderHighlightedText(p.nombre, matchIndices)
                            : p.nombre}
                        </div>

                        {primaryMatch && matchKey !== 'nombre' && (
                          <div className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                            Coincidencia en <strong className="text-foreground">{mapKeyLabel(matchKey)}</strong>: {renderHighlightedText(String(primaryMatch.value || ''), matchIndices)}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0 font-mono">
                        <span className="text-xs font-bold text-foreground block">
                          {p.avance_pct}%
                        </span>
                        <span className="text-[9px] text-muted-foreground block">
                          Est: {p.fecha_reproyectada?.slice(5) || 'N/A'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
