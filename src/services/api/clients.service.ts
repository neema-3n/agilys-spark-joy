import { Client } from '@/types';
import { supabase } from '@/integrations/supabase/client';

/**
 * Les clients accessibles à l'utilisateur viennent de la fonction `my_clients`,
 * qui applique elle-même les règles d'appartenance côté base. Le frontend ne
 * filtre donc rien : il affiche ce que la base l'autorise à voir.
 */

type MyClientRow = {
  id: string;
  nom: string;
  code: string;
  pays: string;
  devise: string;
  statut: string;
  money_format: Client['moneyFormat'] | null;
  role: string;
  is_active: boolean;
  is_takeover: boolean;
};

export type ClientAccess = Client & {
  /** Rôle de l'utilisateur chez ce client. */
  role: string;
  /** Vrai lorsqu'un super admin accède à un client dont il n'est pas membre. */
  isTakeover: boolean;
};

const mapRow = (row: MyClientRow): ClientAccess => ({
  id: row.id,
  nom: row.nom,
  code: row.code,
  pays: row.pays,
  devise: row.devise,
  statut: row.statut === 'actif' ? 'actif' : 'inactif',
  moneyFormat: row.money_format ?? undefined,
  role: row.role,
  isTakeover: row.is_takeover,
});

export const clientsService = {
  getAll: async (): Promise<ClientAccess[]> => {
    const { data, error } = await supabase.rpc('my_clients');
    if (error) throw error;
    return ((data ?? []) as MyClientRow[]).map(mapRow);
  },

  getById: async (id: string): Promise<ClientAccess | null> => {
    const clients = await clientsService.getAll();
    return clients.find((client) => client.id === id) ?? null;
  },

  update: async (id: string, updates: Partial<Client>): Promise<ClientAccess> => {
    const payload: Record<string, unknown> = {};
    if (updates.nom !== undefined) payload.nom = updates.nom;
    if (updates.code !== undefined) payload.code = updates.code;
    if (updates.pays !== undefined) payload.pays = updates.pays;
    if (updates.devise !== undefined) payload.devise = updates.devise;
    if (updates.statut !== undefined) payload.statut = updates.statut;
    if (updates.moneyFormat !== undefined) payload.money_format = updates.moneyFormat;
    payload.updated_at = new Date().toISOString();

    const { error } = await supabase.from('clients').update(payload).eq('id', id);
    if (error) throw error;

    const client = await clientsService.getById(id);
    if (!client) {
      throw new Error('Client introuvable après mise à jour.');
    }
    return client;
  },

  /**
   * Bascule le client actif de l'utilisateur.
   *
   * Le rafraîchissement de session qui suit n'est pas optionnel : le jeton en
   * cours porte encore l'ancien client, et `get_user_client_id()` le lit dans
   * ce jeton. Sans ce refresh, la RLS continuerait de répondre pour le client
   * précédent alors que l'interface affiche déjà le nouveau — c'est-à-dire le
   * scénario exact d'un mélange de données entre clients.
   *
   * L'invalidation du cache React Query est de la responsabilité de l'appelant
   * (voir ClientContext), pour la même raison.
   */
  switchTo: async (clientId: string): Promise<void> => {
    const { data, error } = await supabase.functions.invoke('switch-client', {
      body: { clientId },
    });

    if (error) {
      let message = error.message ?? 'Changement de client impossible.';
      // Les edge functions renvoient le détail dans le corps de la réponse.
      const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
      if (context?.json) {
        try {
          const body = (await context.json()) as { error?: string };
          if (body?.error) message = body.error;
        } catch {
          // on garde le message d'origine
        }
      }
      throw new Error(message);
    }

    if (!data?.success) {
      throw new Error(data?.error ?? 'Changement de client impossible.');
    }

    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      throw new Error(
        "Le client a été changé mais la session n'a pas pu être rafraîchie. " +
          'Reconnectez-vous pour appliquer le changement.',
      );
    }
  },

  /**
   * Journalise l'accès d'un super admin à un client dont il n'est pas membre.
   * Sans effet pour un utilisateur ordinaire, et idempotent sur une heure :
   * un rechargement de page ne produit pas d'entrée supplémentaire.
   */
  logTakeover: async (clientId: string): Promise<void> => {
    const { error } = await supabase.rpc('log_client_takeover', { _client_id: clientId });
    if (error) {
      // Ne jamais bloquer la navigation sur un échec de journalisation.
      console.warn('Journalisation de la prise en main impossible :', error.message);
    }
  },
};
