import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ResumenPage } from './pages/ResumenPage';
import { DetallePage } from './pages/DetallePage';
import { ImprimirPage } from './pages/ImprimirPage';
import { AvisosPage } from './pages/AvisosPage';
import { EncuestaPage } from './pages/EncuestaPage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';
import { PageLayout } from './layouts/PageLayout';
import { AuthProvider, useAuth } from './auth/AuthProvider';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
};

const AppContent: React.FC = () => {
  const { session, loading, isDemo, usuarioActual, cambiarUsuarioDemo } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full bg-background text-foreground flex items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-terracotta animate-pulse" />
          <span>Verificando credenciales de Comando Estelar...</span>
        </div>
      </div>
    );
  }

  // Si no hay sesión y no estamos en modo demo, redirigir a Login
  const estaAutenticado = !!session || isDemo;

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage />}
      />
      <Route
        path="/"
        element={
          !estaAutenticado ? (
            <Navigate to="/login" replace />
          ) : (
            <ResumenPage
              usuarioActual={usuarioActual}
              onCambiarUsuario={cambiarUsuarioDemo}
            />
          )
        }
      />
      <Route
        path="/lista"
        element={
          !estaAutenticado ? (
            <Navigate to="/login" replace />
          ) : (
            <ResumenPage
              usuarioActual={usuarioActual}
              onCambiarUsuario={cambiarUsuarioDemo}
              vistaInicialLista
            />
          )
        }
      />
      <Route
        path="/proyectos/:id"
        element={
          !estaAutenticado ? (
            <Navigate to="/login" replace />
          ) : (
            <PageLayout usuarioActual={usuarioActual} onCambiarUsuario={cambiarUsuarioDemo}>
              <DetallePage usuarioActual={usuarioActual} />
            </PageLayout>
          )
        }
      />
      <Route
        path="/proyectos/:id/imprimir"
        element={
          !estaAutenticado ? (
            <Navigate to="/login" replace />
          ) : (
            <PageLayout usuarioActual={usuarioActual} onCambiarUsuario={cambiarUsuarioDemo} maxWidth="max-w-none">
              <ImprimirPage />
            </PageLayout>
          )
        }
      />
      <Route
        path="/avisos"
        element={
          !estaAutenticado ? (
            <Navigate to="/login" replace />
          ) : (
            <PageLayout usuarioActual={usuarioActual} onCambiarUsuario={cambiarUsuarioDemo}>
              <AvisosPage />
            </PageLayout>
          )
        }
      />
      <Route
        path="/encuesta"
        element={
          !estaAutenticado ? (
            <Navigate to="/login" replace />
          ) : (
            <PageLayout usuarioActual={usuarioActual} onCambiarUsuario={cambiarUsuarioDemo}>
              <EncuestaPage usuarioActual={usuarioActual} />
            </PageLayout>
          )
        }
      />
      <Route
        path="/admin"
        element={
          !estaAutenticado ? (
            <Navigate to="/login" replace />
          ) : (
            <PageLayout usuarioActual={usuarioActual} onCambiarUsuario={cambiarUsuarioDemo}>
              <AdminPage />
            </PageLayout>
          )
        }
      />
    </Routes>
  );
};

export default App;
