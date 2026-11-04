import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ResumenPage } from './pages/ResumenPage';
import { DetallePage } from './pages/DetallePage';
import { ImprimirPage } from './pages/ImprimirPage';
import { AvisosPage } from './pages/AvisosPage';
import { EncuestaPage } from './pages/EncuestaPage';
import { AdminPage } from './pages/AdminPage';
import { USUARIOS_SEED, type UsuarioPrueba } from './components/DevUserSelector';
import { PageLayout } from './layouts/PageLayout';

export const App: React.FC = () => {
  const [usuarioActual, setUsuarioActual] = useState<UsuarioPrueba>(() => {
    const savedEmail = localStorage.getItem('user_email');
    return USUARIOS_SEED.find((u) => u.email === savedEmail) || USUARIOS_SEED[0];
  });

  const handleCambiarUsuario = (usuario: UsuarioPrueba) => {
    setUsuarioActual(usuario);
    localStorage.setItem('user_email', usuario.email);
    localStorage.setItem('user_rol', usuario.rol);
    if (usuario.area) {
      localStorage.setItem('user_area', usuario.area);
    } else {
      localStorage.removeItem('user_area');
    }
  };

  return (
    <BrowserRouter>
      <AppContent usuarioActual={usuarioActual} onCambiarUsuario={handleCambiarUsuario} />
    </BrowserRouter>
  );
};

const AppContent: React.FC<{
  usuarioActual: UsuarioPrueba;
  onCambiarUsuario: (u: UsuarioPrueba) => void;
}> = ({ usuarioActual, onCambiarUsuario }) => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ResumenPage
            usuarioActual={usuarioActual}
            onCambiarUsuario={onCambiarUsuario}
          />
        }
      />
      <Route
        path="/lista"
        element={
          <ResumenPage
            usuarioActual={usuarioActual}
            onCambiarUsuario={onCambiarUsuario}
            vistaInicialLista
          />
        }
      />
      <Route
        path="/proyectos/:id"
        element={
          <PageLayout usuarioActual={usuarioActual} onCambiarUsuario={onCambiarUsuario}>
            <DetallePage usuarioActual={usuarioActual} />
          </PageLayout>
        }
      />
      <Route
        path="/proyectos/:id/imprimir"
        element={
          <PageLayout usuarioActual={usuarioActual} onCambiarUsuario={onCambiarUsuario} maxWidth="max-w-none">
            <ImprimirPage />
          </PageLayout>
        }
      />
      <Route
        path="/avisos"
        element={
          <PageLayout usuarioActual={usuarioActual} onCambiarUsuario={onCambiarUsuario}>
            <AvisosPage />
          </PageLayout>
        }
      />
      <Route
        path="/encuesta"
        element={
          <PageLayout usuarioActual={usuarioActual} onCambiarUsuario={onCambiarUsuario}>
            <EncuestaPage usuarioActual={usuarioActual} />
          </PageLayout>
        }
      />
      <Route
        path="/admin"
        element={
          <PageLayout usuarioActual={usuarioActual} onCambiarUsuario={onCambiarUsuario}>
            <AdminPage />
          </PageLayout>
        }
      />
    </Routes>
  );
};

export default App;
