import { supabase } from '@/integrations/supabase/client';
import type { MoneyFormatSettings } from '@/types';

export type ClientStatut = 'actif' | 'suspendu' | 'resilie';
export type TypeAbonnement = 'trial' | 'live';

export interface AdminClient {
  id: string;
  nom: string;
  code: string;
  pays: string;
  devise: string;
  statut: ClientStatut;
  moneyFormat?: MoneyFormatSettings;
  createdAt: string;
  typeAbonnement: TypeAbonnement;
  /** Échéance de l'abonnement. `null` = aucune validité, donc lecture seule. */
  dateFinAbonnement: string | null;
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
  type_abonnement: TypeAbonnement;
  date_fin_abonnement: string | null;
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
  typeAbonnement: row.type_abonnement ?? 'trial',
  dateFinAbonnement: row.date_fin_abonnement,
  membres: row.user_clients?.[0]?.count ?? 0,
});

/** Jours restants avant l'échéance. Négatif si dépassée, `null` si aucune. */
export const joursRestants = (dateFin: string | null): number | null => {
  if (!dateFin) return null;
  const echeance = new Date(`${dateFin}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((echeance.getTime() - today.getTime()) / 86_400_000);
};

/** Un client expiré reste consultable : seules les écritures sont refusées. */
export const estExpire = (dateFin: string | null): boolean => {
  const jours = joursRestants(dateFin);
  return jours === null || jours < 0;
};

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
      .select(
        'id, nom, code, pays, devise, statut, money_format, created_at, ' +
          'type_abonnement, date_fin_abonnement, user_clients(count)',
      )
      .order('nom');

    if (error) throw error;
    return ((data ?? []) as unknown as ClientRow[]).map(mapRow);
  },

  /** Durée d'essai accordée par défaut à toute nouvelle organisation. */
  getDureeEssaiJours: async (): Promise<number> => {
    const { data, error } = await supabase
      .from('parametres_systeme')
      .select('valeur')
      .eq('cle', 'duree_essai_jours')
      .maybeSingle();

    if (error) throw error;
    return Number(data?.valeur ?? 30);
  },

  setDureeEssaiJours: async (jours: number): Promise<void> => {
    const { error } = await supabase
      .from('parametres_systeme')
      .update({ valeur: jours, updated_at: new Date().toISOString() })
      .eq('cle', 'duree_essai_jours');

    if (error) throw error;
  },

  setAbonnement: async (
    id: string,
    typeAbonnement: TypeAbonnement,
    dateFin: string | null,
  ): Promise<void> => {
    const { error } = await supabase
      .from('clients')
      .update({
        type_abonnement: typeAbonnement,
        date_fin_abonnement: dateFin,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },

  create: async (input: CreateClientInput): Promise<void> => {
    // La période d'essai est posée à la création : sans échéance, la nouvelle
    // organisation serait en lecture seule dès sa première connexion.
    const jours = await adminClientsService.getDureeEssaiJours();
    const echeance = new Date();
    echeance.setDate(echeance.getDate() + jours);

    const { error } = await supabase.from('clients').insert({
      id: input.id,
      nom: input.nom,
      code: input.code,
      pays: input.pays,
      devise: input.devise,
      statut: 'actif',
      type_abonnement: 'trial',
      date_fin_abonnement: echeance.toISOString().slice(0, 10),
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
