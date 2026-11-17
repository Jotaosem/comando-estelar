import React, { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Mail, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { enviarEnlaceMagico, isDemo } = useAuth();
  const [email, setEmail] = useState('');
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
    const res = await enviarEnlaceMagico(emailNorm);
    setCargando(false);

    if (res.error) {
      setError(res.error);
    } else {
      setEnviado(true);
    }
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

        {enviado ? (
          <div className="p-6 rounded-2xl bg-surface border border-border text-center space-y-3 animate-in fade-in zoom-in-95">
            <CheckCircle2 className="w-10 h-10 text-health-green mx-auto" />
            <h2 className="font-bold text-sm text-foreground">¡Enlace Mágico Enviado!</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hemos enviado un enlace de acceso seguro a <strong className="text-foreground">{email}</strong>. Revisa tu bandeja de entrada o spam para ingresar.
            </p>
            <button
              onClick={() => {
                setEnviado(false);
                setEmail('');
              }}
              className="mt-3 text-xs font-mono text-terracotta hover:underline"
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

            {error && (
              <div className="p-3 rounded-xl bg-health-red-soft border border-health-red/30 text-health-red text-xs font-mono flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3 px-4 rounded-xl bg-terracotta text-white font-sans text-xs font-semibold hover:opacity-95 shadow-cta transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{cargando ? 'Enviando enlace...' : 'Ingresar con Enlace Mágico'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {isDemo && (
              <div className="pt-2 text-center">
                <span className="text-[11px] font-mono text-muted-foreground">
                  Modo de prueba local habilitado (acceso directo en curso)
                </span>
              </div>
            )}
          </form>
        )}

        <div className="pt-4 border-t border-border text-center">
          <p className="text-[10px] font-mono text-muted-foreground">
            Acceso auditado · Solo lectura multi-fuente
          </p>
        </div>
      </div>
    </div>
  );
};
