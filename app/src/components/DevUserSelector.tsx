import React, { useState } from 'react';
import { Shield, ChevronDown, Check } from 'lucide-react';

export interface UsuarioPrueba {
  email: string;
  nombre: string;
  rol: 'Admin' | 'Gerencia' | 'Gerente de área' | 'Solicitante' | 'Ejecutor' | 'Sin perfil';
  area?: string;
}

export const USUARIOS_SEED: UsuarioPrueba[] = [
  {
    email: 'admin@prontopaga.com',
    nombre: 'Admin General',
    rol: 'Admin',
  },
  {
    email: 'gerencia@prontopaga.com',
    nombre: 'Valeria Castro (Gerencia General)',
    rol: 'Gerencia',
  },
  {
    email: 'gerente.area@prontopaga.com',
    nombre: 'Rodrigo Fuentes',
    rol: 'Gerente de área',
    area: 'Operaciones',
  },
  {
    email: 'solicitante.comercial@prontopaga.com',
    nombre: 'Mariana Duarte',
    rol: 'Solicitante',
    area: 'Comercial',
  },
  {
    email: 'ejecutor.lider@prontopaga.com',
    nombre: 'José Miguel (Ejecutor / Líder)',
    rol: 'Ejecutor',
  },
  {
    email: 'invitado.sinperfil@prontopaga.com',
    nombre: 'Consultor Externo',
    rol: 'Sin perfil',
  },
];

interface DevUserSelectorProps {
  usuarioActual: UsuarioPrueba;
  onCambiarUsuario: (u: UsuarioPrueba) => void;
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
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-card hover:bg-surface border border-border text-xs text-foreground transition-all shadow-sm font-mono"
        title="Cambiar perfil de acceso"
      >
        <div className="w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center text-terracotta">
          <Shield className="w-3 h-3" />
        </div>
        <div className="text-left hidden sm:block">
          <div className="font-semibold text-terracotta leading-none">{usuarioActual.rol}</div>
          <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">
            {usuarioActual.nombre}
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {desplegado && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDesplegado(false)}
          />
          <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-card border border-border shadow-panel z-50 overflow-hidden font-mono text-xs">
            <div className="px-3 py-2 bg-surface border-b border-border text-[10px] text-terracotta font-bold uppercase tracking-wider">
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                      isSelected
                        ? 'bg-muted text-foreground border border-border-strong font-semibold'
                        : 'text-foreground hover:bg-surface'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{u.nombre}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {u.rol} {u.area ? `• Área: ${u.area}` : ''}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-terracotta shrink-0" />
                    )}
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
