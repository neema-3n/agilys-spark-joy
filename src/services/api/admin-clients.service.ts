import { supabase } from '@/integrations/supabase/client';
import type { MoneyFormatSettings } from '@/types';

export type ClientStatut = 'actif' | 'suspendu' | 'resilie';

export interface AdminClient {
  id: string;
  nom: string;
  code: string;
  pays: string;
  devise: string;
  statut: ClientStatut;
  moneyFormat?: MoneyFormatSettings;
  createdAt: string;
  /** Nombre d'utilisateurs rattachés, tous rôles confondus. */
  membres: number;
}

export interface CreateClientInput {
  id: string;
  nom: string;
  code: string;
  pays: string;
  devise: string;
}

type ClientRow = {
  id: string;
  nom: string;
  code: string;
  pays: string;
  devise: string;
  statut: string;
  money_format: MoneyFormatSettings | null;
  created_at: string;
  user_clients: { count: number }[] | null;
};

const mapRow = (row: ClientRow): AdminClient => ({
  id: row.id,
  nom: row.nom,
  code: row.code,
  pays: row.pays,
  devise: row.devise,
  statut: (row.statut as ClientStatut) ?? 'actif',
  moneyFormat: row.money_format ?? undefined,
  createdAt: row.created_at,
  membres: row.user_clients?.[0]?.count ?? 0,
});

/**
 * Administration des organisations clientes, réservée au super admin.
 *
 * Les écritures ne sont pas protégées par ce module mais par la politique
 * « Super admin manages clients » : un appel émis par un autre rôle est rejeté
 * par la base, quoi que fasse le frontend.
 */
export const adminClientsService = {
  listAll: async (): Promise<AdminClient[]> => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, nom, code, pays, devise, statut, money_format, created_at, user_clients(count)')
      .order('nom');

    if (error) throw error;
    return ((data ?? []) as unknown as ClientRow[]).map(mapRow);
  },

  create: async (input: CreateClientInput): Promise<void> => {
    const { error } = await supabase.from('clients').insert({
      id: input.id,
      nom: input.nom,
      code: input.code,
      pays: input.pays,
      devise: input.devise,
      statut: 'actif',
    });

    if (error) {
      if (error.code === '23505') {
        throw new Error(
          `L'identifiant « ${input.id} » ou le code « ${input.code} » est déjà utilisé.`,
        );
      }
      throw error;
    }
  },

  update: async (id: string, input: Partial<CreateClientInput>): Promise<void> => {
    const { error } = await supabase
      .from('clients')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Change l'état de l'abonnement.
   *
   * `suspendu` place le client en lecture seule : la consultation et les
   * exports restent possibles, toute écriture est refusée par les triggers
   * posés sur les tables métier. `resilie` retire en plus le client de la
   * liste de ses utilisateurs.
   */
  setStatut: async (id: string, statut: ClientStatut): Promise<void> => {
    const { error } = await supabase
      .from('clients')
      .update({ statut, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },
};
