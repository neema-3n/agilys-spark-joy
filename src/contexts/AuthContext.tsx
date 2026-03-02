import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { AuthContextType, User, AppRole } from '@/types';
import { authService } from '@/services/api/auth.service';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildRequestedPath, normalizeRedirectPath } from '@/services/auth/auth-routing';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigateRef = useRef(navigate);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<{ accessTokenExpiresAt: number | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    mountedRef.current = true;

    const applySession = async () => {
      setIsLoading(true);
      try {
        const nextSession = await authService.hydrateSession();
        if (!mountedRef.current) {
          return;
        }

        setUser(nextSession?.user ?? null);
        setSession(nextSession ? { accessTokenExpiresAt: nextSession.accessTokenExpiresAt } : null);
      } catch {
        if (!mountedRef.current) {
          return;
        }
        setUser(null);
        setSession(null);
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    authService.onAuthFailure((preservedPath) => {
      if (!mountedRef.current) {
        return;
      }

      const fallbackFrom = typeof window !== 'undefined'
        ? buildRequestedPath(window.location.pathname, window.location.search, window.location.hash)
        : '/app/dashboard';
      const from = normalizeRedirectPath(preservedPath, fallbackFrom);
      setUser(null);
      setSession(null);
      setIsLoading(false);

      const currentPathname = typeof window !== 'undefined' ? window.location.pathname : '';
      if (currentPathname !== '/auth/login') {
        navigateRef.current('/auth/login', { replace: true, state: { from } });
      }
    });

    void applySession();

    return () => {
      mountedRef.current = false;
      authService.onAuthFailure(null);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authService.login(email, password);
    if (!result.user) {
      return { success: false, error: result.error };
    }

    const validSession = await authService.ensureValidSession();
    if (!validSession) {
      setUser(null);
      setSession(null);
      return { success: false, error: 'Session invalide. Veuillez vous reconnecter.' };
    }

    setUser(validSession.user);
    setSession({ accessTokenExpiresAt: validSession.accessTokenExpiresAt });

    return { success: true };
  };

  const signup = async (email: string, password: string, nom: string, prenom: string) => {
    const result = await authService.signup(email, password, nom, prenom);
    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true };
  };

  const logout = async () => {
    const from = buildRequestedPath(location.pathname, location.search, location.hash);
    setUser(null);
    setSession(null);

    if (location.pathname !== '/auth/login') {
      navigate('/auth/login', { replace: true, state: { from } });
    }

    void authService.logout();
  };

  const isAuthenticated = Boolean(user && session);

  const hasRole = (role: AppRole): boolean => {
    return user?.roles.includes(role) ?? false;
  };

  const hasAnyRole = (roles: AppRole[]): boolean => {
    return roles.some((role) => hasRole(role));
  };

  const value = useMemo(
    () => ({
      user,
      session,
      isAuthenticated,
      isLoading,
      hasRole,
      hasAnyRole,
      login,
      signup,
      logout
    }),
    [user, session, isAuthenticated, isLoading]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
