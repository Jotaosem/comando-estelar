import React, { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import type { ProyectoResumenUI } from '../../lib/proyectosData';
import { Search, Command } from 'lucide-react';

interface GalaxySearchBarProps {
  proyectos: ProyectoResumenUI[];
  onSelectProyecto: (p: ProyectoResumenUI) => void;
  onFilterChange: (query: string, matchingIds: Set<string> | null) => void;
}

export const GalaxySearchBar: React.FC<GalaxySearchBarProps> = ({
  proyectos,
  onSelectProyecto,
  onFilterChange,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const fuse = React.useMemo(() => {
    return new Fuse(proyectos, {
      keys: [
        { name: 'nombre', weight: 0.35 },
        { name: 'callsign', weight: 0.25 },
        { name: 'area_solicitante', weight: 0.2 },
        { name: 'responsable_comunicar_nombre', weight: 0.1 },
        { name: 'etapa_actual_nombre', weight: 0.1 },
      ],
      threshold: 0.38,
      ignoreLocation: true,
    });
  }, [proyectos]);

  const searchResults = React.useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 8).map((r) => r.item);
  }, [query, fuse]);

  // Actualizar IDs atenuados para la vista 3D
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
    setQuery('');
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
    <div className="relative">
      {/* Input Compacto en la Top Bar */}
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleInputKeyDown}
          placeholder="Buscar proyecto, código, área... (Ctrl+K)"
          className="w-48 sm:w-64 md:w-80 h-7 pl-8 pr-12 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:w-80 transition-all shadow-inner"
        />
        <div className="absolute right-2 flex items-center gap-0.5 text-[9px] font-mono text-slate-500 px-1 py-0.5 rounded border border-slate-700 bg-black/40 pointer-events-none">
          <Command className="w-2.5 h-2.5" />
          <span>K</span>
        </div>
      </div>

      {/* Paleta de Resultados Flotante */}
      {isOpen && searchResults.length > 0 && (
        <div className="absolute top-full left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#030919]/95 border border-cyan-500/40 shadow-2xl backdrop-blur-2xl p-2 z-50 animate-in fade-in zoom-in-95">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest px-2 py-1 mb-1 border-b border-cyan-500/20">
            Coincidencias ({searchResults.length})
          </div>
          <div className="space-y-1">
            {searchResults.map((p, idx) => {
              const isSelected = idx === selectedIndex;
              const isCritico = p.semaforo === 'rojo';
              const isAlerta = p.semaforo === 'amarillo';

              return (
                <div
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-colors ${
                    isSelected ? 'bg-cyan-500/20 border border-cyan-400/40 text-white' : 'text-slate-300 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-display font-bold">
                      <span className="text-cyan-400 font-mono text-[10px]">{p.callsign}</span>
                      <span className="truncate">{p.nombre}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>{p.area_solicitante}</span>
                      <span>·</span>
                      <span>{p.etapa_actual_nombre}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-2">
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                        isCritico
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : isAlerta
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {p.avance_pct}%
                    </span>
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
