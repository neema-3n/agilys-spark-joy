import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClient } from '@/contexts/ClientContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Permissions de l'utilisateur sur l'organisation active.
 *
 * Sert uniquement à l'affichage : masquer une action qui serait refusée évite
 * de proposer un bouton qui échoue. Ce qui protège réellement, ce sont les
 * politiques et les triggers en base — jamais ce hook.
 */
export const usePermissions = () => {
  const { currentClient } = useClient();
  const { user, hasRole } = useAuth();
  const clientId = currentClient?.id;
  const estSuperAdmin = hasRole('super_admin');

  const { data, isLoading } = useQuery({
    queryKey: ['mes-permissions', user?.id, clientId],
    enabled: !!user?.id && !!clientId,
    queryFn: async (): Promise<string[]> => {
      const { data: liaisons, error } = await supabase
        .from('user_clients')
        .select('role_id')
        .eq('user_id', user!.id)
        .eq('client_id', clientId!)
        .eq('statut', 'actif')
        .maybeSingle();

      if (error) throw error;
      if (!liaisons?.role_id) return [];

      const { data: permissions, error: permError } = await supabase
        .from('role_permissions')
        .select('permission_code')
        .eq('role_id', liaisons.role_id);

      if (permError) throw permError;
      return (permissions ?? []).map((p) => p.permission_code);
    },
  });

  const accordees = new Set(data ?? []);

  return {
    isLoading,
    estSuperAdmin,
    /** Le super admin en prise en main n'a pas de rattachement, donc pas de rôle. */
    can: (code: string) => estSuperAdmin || accordees.has(code),
    permissions: accordees,
  };
};
