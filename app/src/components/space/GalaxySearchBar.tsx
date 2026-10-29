import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import type { ProyectoResumenUI } from '../../lib/proyectosData';
import { Search, Command } from 'lucide-react';
import { useNavigationStore } from './navigationStore';

interface GalaxySearchBarProps {
  proyectos: ProyectoResumenUI[];
  onSelectProyecto: (p: ProyectoResumenUI) => void;
  onFilterChange: (query: string, matchingIds: Set<string> | null) => void;
  className?: string;
}

// Función helper para resaltar coincidencias
function highlightMatch(text: string, query: string) {
  if (!query.trim() || !text) return text;
  const terms = query.trim().split(/\s+/).filter(Boolean);
  const regex = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <strong key={i} className="text-cyan-300 font-bold bg-cyan-950/60 px-0.5 rounded">
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}

export const GalaxySearchBar: React.FC<GalaxySearchBarProps> = ({
  proyectos,
  onSelectProyecto,
  onFilterChange,
  className = '',
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';

  const { searchQuery, setSearchQuery } = useNavigationStore();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar store inicial con URL si existe
  useEffect(() => {
    if (urlQuery && urlQuery !== searchQuery) {
      setSearchQuery(urlQuery);
    }
  }, [urlQuery, searchQuery, setSearchQuery]);

  const query = searchQuery;

  const updateQuery = (newQuery: string) => {
    setSearchQuery(newQuery);
    const nextParams = new URLSearchParams(searchParams);
    if (newQuery.trim()) {
      nextParams.set('q', newQuery);
    } else {
      nextParams.delete('q');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const fuse = React.useMemo(() => {
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
      threshold: 0.4,
      ignoreLocation: true,
      includeMatches: true,
    });
  }, [proyectos]);

  const searchResults = React.useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 8).map((r) => r.item);
  }, [query, fuse]);

  // Actualizar IDs atenuados para la vista 3D / lista
  useEffect(() => {
    if (!query.trim()) {
      onFilterChange('', null);
    } else {
      const ids = new Set(searchResults.map((p) => p.id));
      onFilterChange(query, ids);
    }
  }, [query, searchResults, onFilterChange]);

  // Atajo Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (p: ProyectoResumenUI) => {
    onSelectProyecto(p);
    setIsOpen(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (searchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = searchResults[selectedIndex];
      if (item) handleSelect(item);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input Compacto en la Top Bar */}
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            updateQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleInputKeyDown}
          placeholder="Buscar misión, código, descripción... (Ctrl+K)"
          className="w-full h-8 pl-8 pr-12 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all shadow-inner"
        />
        <div className="absolute right-2 flex items-center gap-0.5 text-[9px] font-mono text-slate-500 px-1 py-0.5 rounded border border-slate-700 bg-black/40 pointer-events-none">
          <Command className="w-2.5 h-2.5" />
          <span>K</span>
        </div>
      </div>

      {/* Dropdown de Resultados Flotante (máx 8) */}
      {isOpen && searchResults.length > 0 && (
        <div className="absolute top-full left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#030919]/95 border border-cyan-500/40 shadow-2xl backdrop-blur-2xl p-2 z-50 animate-in fade-in zoom-in-95">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest px-2 py-1 mb-1 border-b border-cyan-500/20">
            Coincidencias ({searchResults.length})
          </div>
          <div className="space-y-1 max-h-[360px] overflow-y-auto">
            {searchResults.map((p, idx) => {
              const isSelected = idx === selectedIndex;
              const isCritico = p.semaforo === 'rojo';
              const isAlerta = p.semaforo === 'amarillo';
              const estadoLabel = isCritico ? 'Crítico' : isAlerta ? 'Alerta' : p.cerrado ? 'Cerrado' : 'Nominal';
              const estadoColor = isCritico ? 'text-rose-400' : isAlerta ? 'text-amber-400' : 'text-emerald-400';

              return (
                <div
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2 rounded-xl cursor-pointer text-xs transition-colors ${
                    isSelected ? 'bg-cyan-500/20 border border-cyan-400/40 text-white' : 'text-slate-300 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-display font-bold">
                      <span className={`w-2 h-2 rounded-full ${isCritico ? 'bg-rose-500' : isAlerta ? 'bg-amber-400' : 'bg-emerald-400'} shrink-0`} />
                      <span className={`text-[10px] font-mono font-bold ${estadoColor}`}>{estadoLabel}</span>
                      <span className="text-cyan-400 font-mono text-[10px]">{p.callsign || p.nombre.split('(')[0].trim()}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-400 font-sans text-[11px] truncate">{p.area_solicitante}</span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-300 font-bold shrink-0">{p.avance_pct}%</span>
                  </div>

                  {/* Descripción con coincidencia resaltada */}
                  <div className="text-[11px] text-slate-300 font-sans mt-1 line-clamp-2 leading-relaxed">
                    {p.descripcion ? (
                      highlightMatch(p.descripcion, query)
                    ) : (
                      <span className="italic text-slate-500">Sin descripción</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
