import { supabase } from '@/integrations/supabase/client';
import { User, AppRole } from '@/types';

export const authService = {
  // Connexion
  login: async (email: string, password: string): Promise<{ user?: User; error?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { error: error.message };
    }

    if (!data.user) {
      return { error: 'Utilisateur non trouvé' };
    }

    // Récupérer le profil et les rôles
    const user = await authService.getUserWithRoles(data.user.id);
    if (!user) {
      return { error: 'Erreur lors du chargement du profil' };
    }
    return { user };
  },

  // Inscription
  signup: async (email: string, password: string, nom: string, prenom: string, clientId: string = 'client-1') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nom,
          prenom,
          client_id: clientId
        },
        emailRedirectTo: `${window.location.origin}/`
      }
    });

    if (error) {
      return { error: error.message };
    }

    return { user: data.user };
  },

  // Déconnexion
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Récupérer l'utilisateur actuel avec ses rôles
  getUserWithRoles: async (userId: string): Promise<User | null> => {
    // Récupérer le profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Erreur profil:', profileError);
      return null;
    }

    // Récupérer les rôles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (rolesError) {
      console.error('Erreur rôles:', rolesError);
    }

    const roles = (userRoles || []).map(r => r.role as AppRole);

    return {
      id: profile.id,
      email: profile.email,
      nom: profile.nom,
      prenom: profile.prenom,
      clientId: profile.client_id,
      roles
    };
  },

  // Vérifier si l'utilisateur est authentifié
  isAuthenticated: async (): Promise<boolean> => {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  }
};
