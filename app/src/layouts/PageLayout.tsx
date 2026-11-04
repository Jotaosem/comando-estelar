import React from 'react';
import type { UsuarioPrueba } from '../components/DevUserSelector';
import { NavigationHeader } from '../components/NavigationHeader';
import { ChatAsistente } from '../components/ChatAsistente';

interface PageLayoutProps {
  usuarioActual: UsuarioPrueba;
  onCambiarUsuario: (u: UsuarioPrueba) => void;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  usuarioActual,
  onCambiarUsuario,
  children,
  maxWidth = 'max-w-7xl',
  className = '',
}) => {
  return (
    <div className={`min-h-[100dvh] w-full flex flex-col bg-[#030712] text-slate-100 font-sans relative selection:bg-cyan-500 selection:text-slate-950 overflow-y-auto ${className}`}>
      <NavigationHeader usuarioActual={usuarioActual} onCambiarUsuario={onCambiarUsuario} />
      <main className={`flex-1 w-full ${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 flex flex-col`}>
        {children}
      </main>
      <ChatAsistente usuarioActual={usuarioActual} />
      <footer className="border-t border-cyan-500/15 bg-[#030610]/90 backdrop-blur py-4 text-center font-mono text-[11px] text-slate-500 relative z-10">
        COMANDO ESTELAR // FUENTE AUDITABLE: NOTION VÍA SYNC // OPERADOR: {usuarioActual.rol} ({usuarioActual.email})
      </footer>
    </div>
  );
};

