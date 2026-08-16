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
