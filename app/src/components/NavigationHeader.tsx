import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { DevUserSelector, type UsuarioPrueba } from './DevUserSelector';
import {
  Compass,
  Radio,
  ClipboardList,
  Shield,
  Activity,
} from 'lucide-react';

export const NavigationHeader: React.FC<{
  usuarioActual: UsuarioPrueba;
  onCambiarUsuario: (u: UsuarioPrueba) => void;
}> = ({ usuarioActual, onCambiarUsuario }) => {
  const location = useLocation();
  const puedeVerAvisos = usuarioActual.rol === 'Admin' || usuarioActual.rol === 'Ejecutor';
  const esAdmin = usuarioActual.rol === 'Admin';

  return (
    <header className="sticky top-0 z-30 hud-glass border-b border-cyan-500/20 bg-[#040711]/85 backdrop-blur-xl shrink-0">
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

