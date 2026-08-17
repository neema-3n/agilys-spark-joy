import { supabase } from '@/integrations/supabase/client';

export interface OrganisationRole {
  id: string;
  code: string;
  libelle: string;
  description: string | null;
  estStandard: boolean;
  nbPermissions: number;
}

export interface OrganisationUser {
  userId: string;
  email: string;
  nom: string;
  prenom: string;
  roleId: string | null;
  roleLibelle: string | null;
  statut: 'actif' | 'inactif';
  /** Nombre d'organisations auxquelles ce compte a accès. */
  autresOrganisations: number;
}

export interface PermissionCatalogue {
  code: string;
  module: string;
  action: string;
  libelle: string;
  ordre: number;
}

/** Remonte le message porté par le corps de la réponse d'une edge function. */
const messageErreur = async (error: unknown, defaut: string): Promise<string> => {
  const err = error as { message?: string; context?: { json?: () => Promise<unknown> } };
  if (err?.context?.json) {
    try {
      const body = (await err.context.json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      // on garde le message d'origine
    }
  }
  return err?.message ?? defaut;
};

const invoquer = async (payload: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('manage-users', { body: payload });
  if (error) throw new Error(await messageErreur(error, 'Opération impossible.'));
  if (!data?.success) throw new Error(data?.error ?? 'Opération impossible.');
  return data;
};

export const adminUsersService = {
  catalogue: async (): Promise<PermissionCatalogue[]> => {
    const { data, error } = await supabase
      .from('permissions')
      .select('code, module, action, libelle, ordre')
      .order('ordre');

    if (error) throw error;
    return (data ?? []) as PermissionCatalogue[];
  },

  roles: async (clientId: string): Promise<OrganisationRole[]> => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, code, libelle, description, est_standard, role_permissions(count)')
      .eq('client_id', clientId)
      .order('est_standard', { ascending: false })
      .order('libelle');

    if (error) throw error;
    return ((data ?? []) as unknown as Array<{
      id: string; code: string; libelle: string; description: string | null;
      est_standard: boolean; role_permissions: { count: number }[] | null;
    }>).map((row) => ({
      id: row.id,
      code: row.code,
      libelle: row.libelle,
      description: row.description,
      estStandard: row.est_standard,
      nbPermissions: row.role_permissions?.[0]?.count ?? 0,
    }));
  },

  permissionsDuRole: async (roleId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('permission_code')
      .eq('role_id', roleId);

    if (error) throw error;
    return (data ?? []).map((r) => r.permission_code);
  },

  utilisateurs: async (clientId: string): Promise<OrganisationUser[]> => {
    const { data, error } = await supabase
      .from('user_clients')
      .select('user_id, statut, role_id, roles(libelle), profiles(email, nom, prenom)')
      .eq('client_id', clientId);

    if (error) throw error;

    const lignes = (data ?? []) as unknown as Array<{
      user_id: string; statut: string; role_id: string | null;
      roles: { libelle: string } | null;
      profiles: { email: string; nom: string; prenom: string } | null;
    }>;

    // Un même compte peut appartenir à plusieurs organisations : le signaler
    // évite de croire qu'on le supprime en le détachant d'ici.
    const { data: toutes } = await supabase
      .from('user_clients')
      .select('user_id')
      .in('user_id', lignes.map((l) => l.user_id));

    const compte = new Map<string, number>();
    (toutes ?? []).forEach((l) => compte.set(l.user_id, (compte.get(l.user_id) ?? 0) + 1));

    return lignes
      .map((l) => ({
        userId: l.user_id,
        email: l.profiles?.email ?? '(compte sans profil)',
        nom: l.profiles?.nom ?? '',
        prenom: l.profiles?.prenom ?? '',
        roleId: l.role_id,
        roleLibelle: l.roles?.libelle ?? null,
        statut: (l.statut === 'inactif' ? 'inactif' : 'actif') as 'actif' | 'inactif',
        autresOrganisations: Math.max(0, (compte.get(l.user_id) ?? 1) - 1),
      }))
      .sort((a, b) => a.email.localeCompare(b.email));
  },

  inviter: (clientId: string, email: string, nom: string, prenom: string, roleId: string) =>
    invoquer({ action: 'inviter', clientId, email, nom, prenom, roleId }),

  rattacher: (clientId: string, email: string, roleId: string) =>
    invoquer({ action: 'rattacher', clientId, email, roleId }),

  changerRole: (clientId: string, userId: string, roleId: string) =>
    invoquer({ action: 'changer_role', clientId, userId, roleId }),

  changerStatut: (clientId: string, userId: string, statut: 'actif' | 'inactif') =>
    invoquer({ action: 'changer_statut', clientId, userId, statut }),

  detacher: (clientId: string, userId: string) =>
    invoquer({ action: 'detacher', clientId, userId }),

  /**
   * Clone un rôle : le nouveau part des mêmes permissions, puis diverge
   * librement. Les rôles standard ne se modifient pas — c'est ce qui garantit
   * qu'une organisation garde toujours une référence intacte.
   */
  clonerRole: async (
    clientId: string,
    sourceRoleId: string,
    code: string,
    libelle: string,
  ): Promise<string> => {
    const { data: source } = await supabase
      .from('roles')
      .select('role_base, description')
      .eq('id', sourceRoleId)
      .maybeSingle();

    const { data: cree, error } = await supabase
      .from('roles')
      .insert({
        client_id: clientId,
        code,
        libelle,
        description: source?.description ?? null,
        role_base: source?.role_base ?? null,
        est_standard: false,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') throw new Error(`Le code « ${code} » est déjà utilisé.`);
      throw error;
    }

    const permissions = await adminUsersService.permissionsDuRole(sourceRoleId);
    if (permissions.length > 0) {
      const { error: permError } = await supabase
        .from('role_permissions')
        .insert(permissions.map((permission_code) => ({ role_id: cree.id, permission_code })));
      if (permError) throw permError;
    }

    return cree.id;
  },

  basculerPermission: async (roleId: string, code: string, accordee: boolean): Promise<void> => {
    if (accordee) {
      const { error } = await supabase
        .from('role_permissions')
        .insert({ role_id: roleId, permission_code: code });
      if (error && error.code !== '23505') throw error;
      return;
    }

    const { error } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_code', code);
    if (error) throw error;
  },

  supprimerRole: async (roleId: string): Promise<void> => {
    const { error } = await supabase.from('roles').delete().eq('id', roleId);
    if (error) throw error;
  },
};
