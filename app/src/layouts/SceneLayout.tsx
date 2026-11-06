import React from 'react';
import type { UsuarioPrueba } from '../components/DevUserSelector';
import { NavigationHeader } from '../components/NavigationHeader';
import { ChatAsistente } from '../components/ChatAsistente';

interface SceneLayoutProps {
  usuarioActual: UsuarioPrueba;
  onCambiarUsuario: (u: UsuarioPrueba) => void;
  children: React.ReactNode;
}

export const SceneLayout: React.FC<SceneLayoutProps> = ({
  usuarioActual,
  onCambiarUsuario,
  children,
}) => {
  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-background text-foreground overflow-hidden font-sans relative selection:bg-terracotta selection:text-white">
      <NavigationHeader usuarioActual={usuarioActual} onCambiarUsuario={onCambiarUsuario} />
      <main className="flex-1 w-full min-h-0 overflow-hidden p-0 relative z-10 flex flex-col">
        {children}
      </main>
      <ChatAsistente usuarioActual={usuarioActual} />
    </div>
  );
};
