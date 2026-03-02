import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { AuthContextType, User, AppRole } from '@/types';
import { authService } from '@/services/api/auth.service';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<{ accessTokenExpiresAt: number | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const applySession = async () => {
      setIsLoading(true);
      const nextSession = await authService.hydrateSession();
      if (!mountedRef.current) {
        return;
      }

      setUser(nextSession?.user ?? null);
      setSession(nextSession ? { accessTokenExpiresAt: nextSession.accessTokenExpiresAt } : null);
      setIsLoading(false);
    };

    authService.onAuthFailure(() => {
      if (!mountedRef.current) {
        return;
      }

      setUser(null);
      setSession(null);
      setIsLoading(false);
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
    setUser(validSession?.user ?? result.user);
    setSession(validSession ? { accessTokenExpiresAt: validSession.accessTokenExpiresAt } : null);

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
    await authService.logout();

    if (!mountedRef.current) {
      return;
    }

    setUser(null);
    setSession(null);
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
