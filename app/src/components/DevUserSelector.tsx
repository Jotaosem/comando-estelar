import React, { useState } from 'react';
import { ChevronDown, Check, Shield } from 'lucide-react';

export interface UsuarioPrueba {
  email: string;
  nombre: string;
  rol: 'Admin' | 'Gerencia' | 'Solicitante' | 'Ejecutor';
  area?: string;
}

export const USUARIOS_SEED: UsuarioPrueba[] = [
  {
    email: 'admin@empresa.cl',
    nombre: 'Comandante Supremo (Admin)',
    rol: 'Admin',
  },
  {
    email: 'gerencia@empresa.cl',
    nombre: 'Dirección Estratégica (Gerencia)',
    rol: 'Gerencia',
  },
  {
    email: 'valeria.soto@empresa.cl',
    nombre: 'Valeria Soto (Solicitante Operaciones)',
    rol: 'Solicitante',
    area: 'Operaciones',
  },
  {
    email: 'esteban.lagos@empresa.cl',
    nombre: 'Esteban Lagos (Solicitante Comercial)',
    rol: 'Solicitante',
    area: 'Comercial',
  },
  {
    email: 'carlos.dev@empresa.cl',
    nombre: 'Carlos Dev (Ejecutor Lead)',
    rol: 'Ejecutor',
  },
  {
    email: 'paula.qa@empresa.cl',
    nombre: 'Paula QA (Ejecutora QA)',
    rol: 'Ejecutor',
  },
  {
    email: 'jose.miguel@empresa.cl',
    nombre: 'Jose Miguel (Resp. Comunicar)',
    rol: 'Ejecutor',
  },
];

interface DevUserSelectorProps {
  usuarioActual: UsuarioPrueba;
  onCambiarUsuario: (usuario: UsuarioPrueba) => void;
}

export const DevUserSelector: React.FC<DevUserSelectorProps> = ({
  usuarioActual,
  onCambiarUsuario,
}) => {
  const [desplegado, setDesplegado] = useState<boolean>(false);

  return (
    <div className="relative">
      <button
        onClick={() => setDesplegado(!desplegado)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-cyan-500/30 text-xs text-slate-200 transition-all shadow-[0_0_15px_rgba(0,242,254,0.1)] font-mono"
        title="Cambiar perfil de acceso"
      >
        <div className="w-5 h-5 rounded-md bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
          <Shield className="w-3 h-3" />
        </div>
        <div className="text-left hidden sm:block">
          <div className="font-semibold text-cyan-300 leading-none">{usuarioActual.rol}</div>
          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
            {usuarioActual.nombre}
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {desplegado && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDesplegado(false)}
          />
          <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#090e1c] border border-cyan-500/30 shadow-[0_10px_35px_rgba(0,0,0,0.8)] z-50 overflow-hidden font-mono text-xs">
            <div className="px-3 py-2 bg-gradient-to-r from-cyan-950/40 to-purple-950/40 border-b border-cyan-500/20 text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
              Conmutar Identificador Operativo
            </div>
            <div className="p-1 space-y-0.5">
              {USUARIOS_SEED.map((u) => {
                const isSelected = u.email === usuarioActual.email;
                return (
                  <button
                    key={u.email}
                    onClick={() => {
                      onCambiarUsuario(u);
                      setDesplegado(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{u.nombre}</div>
                      <div className="text-[10px] text-slate-500">
                        {u.rol} {u.area ? `• Área: ${u.area}` : ''}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
