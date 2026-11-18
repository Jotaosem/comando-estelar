import React, { useState } from 'react';
import { Shield, ChevronDown, Check } from 'lucide-react';

export interface UsuarioPrueba {
  email: string;
  nombre: string;
  rol: 'Admin' | 'Gerencia' | 'Gerente de área' | 'Solicitante' | 'Ejecutor' | 'Sin perfil';
  area?: string;
}

export function obtenerRolDisplay(rol?: string | null): string {
  if (!rol) return 'Sin perfil';
  if (rol === 'Gerencia') return 'Gerencia general';
  if (rol === 'Admin') return 'Admin';
  if (rol === 'Gerente de área') return 'Gerente de área';
  if (rol === 'Solicitante') return 'Solicitante';
  if (rol === 'Ejecutor') return 'Ejecutor';
  return rol;
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

  // En desarrollo local siempre permitimos alternar perfiles con 1 clic
  const isDevAuth = !import.meta.env.PROD || import.meta.env.DEV || import.meta.env.VITE_DEV_AUTH === 'true';

  return (
    <div className="relative z-50">
      <button
        type="button"
        onClick={() => {
          if (isDevAuth) {
            setDesplegado((prev) => !prev);
          }
        }}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-card hover:bg-surface border border-border text-xs text-foreground transition-all shadow-sm font-mono cursor-pointer ${
          desplegado ? 'ring-2 ring-terracotta border-terracotta' : ''
        }`}
        title="Clic para alternar perfil de usuario (Admin, Gerencia, Gerente de Área, Solicitante, Ejecutor, Sin perfil)"
      >
        <div className="w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center text-terracotta shrink-0">
          <Shield className="w-3 h-3" />
        </div>
        <div className="text-left hidden sm:block">
          <div className="font-semibold text-terracotta leading-none">
            {obtenerRolDisplay(usuarioActual?.rol)}
          </div>
          <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">
            {usuarioActual?.nombre || usuarioActual?.email}
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${desplegado ? 'rotate-180' : ''}`} />
      </button>

      {desplegado && (
        <>
          <div
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setDesplegado(false)}
          />
          <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-card border border-border shadow-panel z-50 overflow-hidden font-mono text-xs animate-in fade-in zoom-in-95">
            <div className="px-3 py-2 bg-surface border-b border-border text-[10px] text-terracotta font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Alternar Perfil de Prueba</span>
              <span className="text-[9px] text-muted-foreground lowercase">1 clic</span>
            </div>
            <div className="p-1 space-y-0.5 max-h-[360px] overflow-y-auto">
              {USUARIOS_SEED.map((u) => {
                const isSelected = u.email === usuarioActual?.email || u.rol === usuarioActual?.rol;
                return (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => {
                      onCambiarUsuario(u);
                      setDesplegado(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-muted text-foreground border border-border-strong font-semibold'
                        : 'text-foreground hover:bg-surface'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold flex items-center gap-1.5">
                        <span className="truncate">{u.nombre}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <span className="text-terracotta font-medium">{obtenerRolDisplay(u.rol)}</span>
                        {u.area && <span>· Área: {u.area}</span>}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-terracotta shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="p-2 bg-surface/50 border-t border-border text-[10px] text-muted-foreground text-center">
              Ajusta permisos de galaxia, tabla y detalle al instante
            </div>
          </div>
        </>
      )}
    </div>
  );
};
