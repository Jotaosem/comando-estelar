import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ResumenPage } from './pages/ResumenPage';
import { DetallePage } from './pages/DetallePage';
import { AvisosPage } from './pages/AvisosPage';
import { EncuestaPage } from './pages/EncuestaPage';
import { AdminPage } from './pages/AdminPage';
import { DevUserSelector, USUARIOS_SEED, type UsuarioPrueba } from './components/DevUserSelector';
import { ChatAsistente } from './components/ChatAsistente';
import {
  Compass,
  Radio,
  ClipboardList,
  Shield,
  Activity,
} from 'lucide-react';

const NavigationHeader: React.FC<{
  usuarioActual: UsuarioPrueba;
  onCambiarUsuario: (u: UsuarioPrueba) => void;
}> = ({ usuarioActual, onCambiarUsuario }) => {
  const location = useLocation();
  const puedeVerAvisos = usuarioActual.rol === 'Admin' || usuarioActual.rol === 'Ejecutor';
  const esAdmin = usuarioActual.rol === 'Admin';

  return (
    <header className="sticky top-0 z-30 hud-glass border-b border-cyan-500/20 bg-[#040711]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-[1px] shadow-[0_0_20px_rgba(0,242,254,0.35)] group-hover:shadow-[0_0_30px_rgba(0,242,254,0.6)] transition-all">
              <div className="w-full h-full bg-[#060a18] rounded-[11px] flex items-center justify-center text-cyan-400">
                <Compass className="w-5 h-5 animate-pulse" />
              </div>
            </div>
            <div>
              <span className="font-display font-black text-lg text-white tracking-widest uppercase block leading-none">
                Comando Estelar
              </span>
              <span className="text-[10px] font-mono text-cyan-400/80 tracking-wider">
                Seguimiento de proyectos
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-2 font-mono text-xs">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                location.pathname === '/' || location.pathname.startsWith('/proyectos')
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(0,242,254,0.2)]'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Misiones</span>
            </Link>

            {puedeVerAvisos && (
              <Link
                to="/avisos"
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                  location.pathname === '/avisos'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(0,242,254,0.2)]'
                    : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900/60'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Avisos</span>
              </Link>
            )}

            <Link
              to="/encuesta"
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                location.pathname === '/encuesta'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(0,242,254,0.2)]'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900/60'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Encuesta</span>
            </Link>

            {esAdmin && (
              <Link
                to="/admin"
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                  location.pathname === '/admin'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(0,242,254,0.2)]'
                    : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900/60'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Administración</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <DevUserSelector usuarioActual={usuarioActual} onCambiarUsuario={onCambiarUsuario} />
        </div>
      </div>
    </header>
  );
};

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
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans relative selection:bg-cyan-500 selection:text-slate-950">
        <NavigationHeader usuarioActual={usuarioActual} onCambiarUsuario={handleCambiarUsuario} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          <Routes>
            <Route path="/" element={<ResumenPage usuarioActual={usuarioActual} />} />
            <Route path="/proyectos/:id" element={<DetallePage usuarioActual={usuarioActual} />} />
            <Route path="/avisos" element={<AvisosPage />} />
            <Route path="/encuesta" element={<EncuestaPage usuarioActual={usuarioActual} />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>

        <ChatAsistente usuarioActual={usuarioActual} />

        <footer className="border-t border-cyan-500/15 bg-[#030610]/90 backdrop-blur py-4 text-center font-mono text-[11px] text-slate-500 relative z-10">
          COMANDO ESTELAR // FUENTE AUDITABLE: NOTION VÍA SYNC // OPERADOR: {usuarioActual.rol} ({usuarioActual.email})
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;
