import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { AuthContextType, User, AppRole } from '@/types';
import { authService } from '@/services/api/auth.service';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);
  const activeUserIdRef = useRef<string | null>(null);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUserLoadedRef = useRef(false);

  const loadUserFromSession = (nextSession: Session | null) => {
    if (!isMountedRef.current) return;

    setIsLoading(true);
    setSession(nextSession);

    const nextUserId = nextSession?.user?.id ?? null;
    activeUserIdRef.current = nextUserId;

    if (nextUserId) {
      // Charger le profil complet avec les rôles (différé pour éviter deadlock)
      setTimeout(async () => {
        const expectedUserId = activeUserIdRef.current;
        try {
          const fullUser = await authService.getUserWithRoles(nextUserId);

          if (!isMountedRef.current || expectedUserId !== nextUserId) return;

          setUser(fullUser);
          hasUserLoadedRef.current = !!fullUser;
        } catch (error) {
          console.error('Erreur lors du chargement de l\'utilisateur', error);
        } finally {
          if (isMountedRef.current && activeUserIdRef.current === expectedUserId) {
            setIsLoading(false);
          }
        }
      }, 0);
    } else {
      setUser(null);
      hasUserLoadedRef.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const clearFallback = () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
    };

    // Source unique de vérité : onAuthStateChange (inclut INITIAL_SESSION)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Gestion dédiée de INITIAL_SESSION pour éviter un flash quand le token est rechargé juste après
        if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            clearFallback();
            loadUserFromSession(session);
          } else {
            // On attend un bref délai pour laisser une éventuelle signature silencieuse arriver
            clearFallback();
            fallbackTimeoutRef.current = setTimeout(() => {
              if (!isMountedRef.current) return;
              loadUserFromSession(null);
            }, 400);
          }
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          clearFallback();
          if (session?.user?.id && activeUserIdRef.current === session.user.id && hasUserLoadedRef.current) {
            setSession(session);
            setIsLoading(false);
            return;
          }
          loadUserFromSession(session);
          return;
        }

        if (event === 'SIGNED_IN') {
          clearFallback();
          loadUserFromSession(session);
          return;
        }

        if (event === 'SIGNED_OUT') {
          clearFallback();
          loadUserFromSession(null);
          return;
        }

        // Fallback pour tout autre événement (ex: USER_UPDATED)
        clearFallback();
        loadUserFromSession(session);
      }
    );

    return () => {
      isMountedRef.current = false;
      clearFallback();
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authService.login(email, password);
    if (result.user) {
      setUser(result.user);
      // Récupérer immédiatement la session pour éviter un flash avant l'événement Supabase
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      return { success: true };
    }
    return { success: false, error: result.error };
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
    setUser(null);
    setSession(null);
  };

  const isAuthenticated = !!(session || user);

  const hasRole = (role: AppRole): boolean => {
    return user?.roles.includes(role) || false;
  };

  const hasAnyRole = (roles: AppRole[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      isAuthenticated,
      isLoading,
      hasRole,
      hasAnyRole,
      login,
      signup,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
