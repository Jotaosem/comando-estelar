import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Mail, CheckCircle2, AlertCircle, ArrowRight, Lock, Sparkles, KeyRound } from 'lucide-react';
import { USUARIOS_SEED } from '../components/DevUserSelector';

export const LoginPage: React.FC = () => {
  const { enviarEnlaceMagico, iniciarSesionPassword } = useAuth();
  const navigate = useNavigate();
  const [metodo, setMetodo] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('admin@prontopaga.com');
  const [password, setPassword] = useState('ProntoPaga2026!');
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailNorm = email.trim().toLowerCase();
    if (!emailNorm.endsWith('@prontopaga.com')) {
      setError('Solo se permite acceso con cuenta corporativa @prontopaga.com');
      return;
    }

    setCargando(true);

    if (metodo === 'password') {
      if (!password) {
        setError('Ingresa la contraseña asignada (ProntoPaga2026!).');
        setCargando(false);
        return;
      }
      const res = await iniciarSesionPassword(emailNorm, password);
      setCargando(false);
      if (res.error) {
        setError(res.error);
      } else {
        navigate('/');
      }
      return;
    }

    const res = await enviarEnlaceMagico(emailNorm);
    setCargando(false);

    if (res.error) {
      if (
        res.error.toLowerCase().includes('rate limit') ||
        res.error.toLowerCase().includes('over_email_send_rate_limit')
      ) {
        setError(
          'El servidor SMTP de Supabase alcanzó el límite de correos. Ingresa directamente con la opción Contraseña (ProntoPaga2026!).'
        );
      } else {
        setError(res.error);
      }
    } else {
      setEnviado(true);
    }
  };

  const seleccionarUsuarioRapido = (uEmail: string) => {
    setEmail(uEmail);
    setPassword('ProntoPaga2026!');
    setError(null);
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col justify-center items-center px-4 font-sans select-none relative overflow-hidden">
      {/* Resplandor de fondo estilo Galaxia */}
      <div className="absolute w-[600px] h-[600px] bg-terracotta/10 rounded-full blur-[140px] pointer-events-none -top-40 -left-40" />
      <div className="absolute w-[500px] h-[500px] bg-surface/20 rounded-full blur-[120px] pointer-events-none -bottom-20 -right-20" />

      <div className="w-full max-w-md bg-card/95 border border-border rounded-3xl p-8 sm:p-10 shadow-panel backdrop-blur-2xl relative z-10 space-y-6">
        {/* Cabecera / Marca */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-surface border border-border mx-auto flex items-center justify-center p-2.5 shadow-sm">
            <img src="/wwp-mark.svg" alt="WWP Mark" className="w-9 h-9 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Comando Estelar</h1>
            <p className="text-xs font-mono text-muted-foreground mt-1">Capa Transversal de Proyectos · ProntoPaga</p>
          </div>
        </div>

        {/* Selector de Método: Contraseña vs Enlace Mágico */}
        <div className="flex rounded-xl bg-surface p-1 border border-border">
          <button
            type="button"
            onClick={() => {
              setMetodo('password');
              setError(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              metodo === 'password'
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Contraseña</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMetodo('otp');
              setError(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              metodo === 'otp'
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Enlace Mágico</span>
          </button>
        </div>

        {enviado ? (
          <div className="p-6 rounded-2xl bg-surface border border-border text-center space-y-3 animate-in fade-in zoom-in-95">
            <CheckCircle2 className="w-10 h-10 text-health-green mx-auto" />
            <h2 className="font-bold text-sm text-foreground">¡Enlace Mágico Enviado!</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hemos enviado un enlace de acceso seguro a <strong className="text-foreground">{email}</strong>. Revisa tu bandeja de entrada para ingresar.
            </p>
            <button
              onClick={() => {
                setEnviado(false);
                setEmail('');
              }}
              className="mt-3 text-xs font-mono text-terracotta hover:underline cursor-pointer"
            >
              Probar con otro correo
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-foreground uppercase tracking-wider block">
                Correo Corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="usuario@prontopaga.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-terracotta transition-colors"
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground block">
                Solo se admiten cuentas terminadas en @prontopaga.com
              </span>
            </div>

            {metodo === 'password' && (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="text-xs font-mono font-medium text-foreground uppercase tracking-wider block">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-terracotta transition-colors"
                  />
                </div>
                <div className="p-2 rounded-lg bg-surface border border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-terracotta" />
                    <span>Clave: <strong className="text-foreground">ProntoPaga2026!</strong></span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPassword('ProntoPaga2026!')}
                    className="text-terracotta hover:underline cursor-pointer font-semibold"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-health-red-soft border border-health-red/30 text-health-red text-xs font-mono flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3 px-4 rounded-xl bg-terracotta text-white font-sans text-xs font-semibold hover:opacity-95 shadow-cta transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>
                {cargando
                  ? 'Autenticando...'
                  : metodo === 'password'
                  ? 'Ingresar con Contraseña'
                  : 'Enviar Enlace Mágico'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Accesos rápidos de perfiles */}
            <div className="pt-2 border-t border-border space-y-2">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block text-center">
                Seleccionar Perfil para Ingresar:
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                {USUARIOS_SEED.map((u) => (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => seleccionarUsuarioRapido(u.email)}
                    className={`p-1.5 rounded-lg border text-left truncate transition-colors cursor-pointer ${
                      email === u.email
                        ? 'bg-muted border-terracotta text-terracotta font-semibold'
                        : 'bg-surface hover:bg-muted border-border text-foreground'
                    }`}
                  >
                    <span className="block truncate">{u.rol}</span>
                    <span className="text-[9px] text-muted-foreground block truncate">{u.nombre.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        <div className="pt-4 border-t border-border text-center">
          <p className="text-[10px] font-mono text-muted-foreground">
            Acceso auditado · Capa multi-fuente ProntoPaga
          </p>
        </div>
      </div>
    </div>
  );
};
