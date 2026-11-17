// src/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { USUARIOS_SEED, type UsuarioPrueba } from '../components/DevUserSelector';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  usuarioActual: UsuarioPrueba;
  cambiarUsuarioDemo: (u: UsuarioPrueba) => void;
  cerrarSesion: () => Promise<void>;
  enviarEnlaceMagico: (email: string) => Promise<{ error: string | null }>;
  iniciarSesionPassword: (email: string, password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Modo demo activo solo si está explícitamente forzado por env (tests), webdriver o query param ?demo=true
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    if (import.meta.env.PROD) return false;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === 'true') return true;
      if ((window.navigator as any)?.webdriver) return true;
    }
    return import.meta.env.VITE_MODO_DEMO === 'true';
  });

  // Usuario demo activo
  const [usuarioActual, setUsuarioActual] = useState<UsuarioPrueba>(() => {
    const savedEmail = localStorage.getItem('user_email');
    return USUARIOS_SEED.find((u) => u.email === savedEmail) || USUARIOS_SEED[0];
  });

  useEffect(() => {
    // Si estamos en demo forzado por env
    if (!import.meta.env.PROD && import.meta.env.VITE_MODO_DEMO === 'true') {
      setIsDemo(true);
      setLoading(false);
      return;
    }

    // Inicializar listener de Supabase Auth
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsDemo(false);
        const email = session.user.email?.toLowerCase() || '';
        try {
          const { data: dbUser } = await supabase
            .from('usuario_rol')
            .select('email, nombre, rol, area, activo')
            .eq('email', email)
            .eq('activo', true)
            .maybeSingle();

          if (dbUser) {
            setUsuarioActual({
              email: dbUser.email,
              nombre: dbUser.nombre || session.user.user_metadata?.nombre || email.split('@')[0],
              rol: dbUser.rol,
              area: dbUser.area || undefined,
            });
          } else {
            setUsuarioActual({
              email,
              nombre: session.user.user_metadata?.nombre || email.split('@')[0],
              rol: 'Sin perfil',
            });
          }
        } catch {
          setUsuarioActual({
            email,
            nombre: session.user.user_metadata?.nombre || email.split('@')[0],
            rol: 'Sin perfil',
          });
        }
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsDemo(false);
        const email = session.user.email?.toLowerCase() || '';
        try {
          const { data: dbUser } = await supabase
            .from('usuario_rol')
            .select('email, nombre, rol, area, activo')
            .eq('email', email)
            .eq('activo', true)
            .maybeSingle();

          if (dbUser) {
            setUsuarioActual({
              email: dbUser.email,
              nombre: dbUser.nombre || session.user.user_metadata?.nombre || email.split('@')[0],
              rol: dbUser.rol,
              area: dbUser.area || undefined,
            });
          } else {
            setUsuarioActual({
              email,
              nombre: session.user.user_metadata?.nombre || email.split('@')[0],
              rol: 'Sin perfil',
            });
          }
        } catch {
          setUsuarioActual({
            email,
            nombre: session.user.user_metadata?.nombre || email.split('@')[0],
            rol: 'Sin perfil',
          });
        }
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const cambiarUsuarioDemo = (u: UsuarioPrueba) => {
    setUsuarioActual(u);
    localStorage.setItem('user_email', u.email);
    localStorage.setItem('user_rol', u.rol);
    if (u.area) {
      localStorage.setItem('user_area', u.area);
    } else {
      localStorage.removeItem('user_area');
    }
  };

  const enviarEnlaceMagico = async (email: string): Promise<{ error: string | null }> => {
    const emailNorm = email.trim().toLowerCase();
    if (!emailNorm.endsWith('@prontopaga.com')) {
      return { error: 'Acceso restringido: debes usar tu correo corporativo (@prontopaga.com).' };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: emailNorm,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  };

  const iniciarSesionPassword = async (email: string, password: string): Promise<{ error: string | null }> => {
    const emailNorm = email.trim().toLowerCase();
    if (!emailNorm.endsWith('@prontopaga.com')) {
      return { error: 'Acceso restringido: debes usar tu correo corporativo (@prontopaga.com).' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailNorm,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
      setIsDemo(false);
      const email = data.session.user.email?.toLowerCase() || '';
      setUsuarioActual((prev) => ({
        ...prev,
        email,
        nombre: data.session.user.user_metadata?.nombre || email.split('@')[0],
      }));
    }
    return { error: null };
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    if (!import.meta.env.PROD) {
      // En desarrollo vuelve a demo si se desea
      setIsDemo(true);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isDemo,
        usuarioActual,
        cambiarUsuarioDemo,
        cerrarSesion,
        enviarEnlaceMagico,
        iniciarSesionPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Fallback defensivo para evitar caídas si se monta fuera del Provider
    const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null;
    const defaultUser = USUARIOS_SEED.find((u) => u.email === savedEmail) || USUARIOS_SEED[0];
    return {
      user: null,
      session: null,
      loading: false,
      isDemo: true,
      usuarioActual: defaultUser,
      cambiarUsuarioDemo: () => {},
      cerrarSesion: async () => {},
      enviarEnlaceMagico: async () => ({ error: null }),
      iniciarSesionPassword: async () => ({ error: null }),
    };
  }
  return context;
};
