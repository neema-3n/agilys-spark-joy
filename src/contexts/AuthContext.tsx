import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthContextType, User, AppRole } from '@/types';
import { authService } from '@/services/api/auth.service';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Charger le profil complet avec les rôles (différé pour éviter deadlock)
          setTimeout(async () => {
            const fullUser = await authService.getUserWithRoles(session.user.id);
            setUser(fullUser);
          }, 0);
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    // Vérifier la session au chargement
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setTimeout(async () => {
          const fullUser = await authService.getUserWithRoles(session.user.id);
          setUser(fullUser);
          setIsLoading(false);
        }, 0);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authService.login(email, password);
    if (result.user) {
      setUser(result.user);
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
      isAuthenticated: !!session, 
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
