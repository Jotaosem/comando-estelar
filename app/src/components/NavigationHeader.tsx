import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { DevUserSelector, type UsuarioPrueba } from './DevUserSelector';
import {
  Radio,
  ClipboardList,
  Shield,
  Activity,
  Sun,
  Moon,
} from 'lucide-react';

export const NavigationHeader: React.FC<{
  usuarioActual: UsuarioPrueba;
  onCambiarUsuario: (u: UsuarioPrueba) => void;
}> = ({ usuarioActual, onCambiarUsuario }) => {
  const location = useLocation();
  const puedeVerAvisos = usuarioActual.rol === 'Admin' || usuarioActual.rol === 'Ejecutor';
  const esAdmin = usuarioActual.rol === 'Admin';

  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wwp-brand-theme');
      if (saved) return saved === 'dark';
    } catch {
      // fallback
    }
    return true; // Default dark mode per WWP brand spec
  });

  useEffect(() => {
    try {
      if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('wwp-brand-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('wwp-brand-theme', 'light');
      }
    } catch {
      // ignore localStorage errors
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return (
    <header className="sticky top-0 z-30 bg-surface/90 border-b border-border backdrop-blur-xl shrink-0 text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center p-1.5 shadow-sm group-hover:border-terracotta transition-colors">
              <img src="/wwp-mark.svg" alt="WWP Mark" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <span className="font-sans font-bold text-base text-foreground tracking-tight block leading-none">
                Comando Estelar
              </span>
              <span className="text-[11px] font-mono text-muted-foreground tracking-normal">
                Seguimiento de proyectos
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-2 font-mono text-xs">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-2 ${
                location.pathname === '/' || location.pathname.startsWith('/proyectos')
                  ? 'bg-terracotta text-white font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Misiones</span>
            </Link>

            {puedeVerAvisos && (
              <Link
                to="/avisos"
                className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-2 ${
                  location.pathname === '/avisos'
                    ? 'bg-terracotta text-white font-medium shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Avisos</span>
              </Link>
            )}

            <Link
              to="/encuesta"
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-2 ${
                location.pathname === '/encuesta'
                  ? 'bg-terracotta text-white font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Encuesta</span>
            </Link>

            {esAdmin && (
              <Link
                to="/admin"
                className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-2 ${
                  location.pathname === '/admin'
                    ? 'bg-terracotta text-white font-medium shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Administración</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border-strong transition-colors"
            title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            aria-label="Toggle tema"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <DevUserSelector usuarioActual={usuarioActual} onCambiarUsuario={onCambiarUsuario} />
        </div>
      </div>
    </header>
  );
};
