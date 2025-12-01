import { supabase } from '@/integrations/supabase/client';
import type { CompteTresorerie, CompteTresorerieFormData, ComptesTresorerieStats } from '@/types/compte-tresorerie.types';

const mapDbToCompteTresorerie = (data: any): CompteTresorerie => ({
  id: data.id,
  clientId: data.client_id,
  code: data.code,
  libelle: data.libelle,
  type: data.type,
  banque: data.banque,
  numeroCompte: data.numero_compte,
  devise: data.devise,
  soldeInitial: data.solde_initial,
  soldeActuel: data.solde_actuel,
  statut: data.statut,
  dateOuverture: data.date_ouverture,
  dateCloture: data.date_cloture,
  observations: data.observations,
  createdBy: data.created_by,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

const mapToDb = (data: Partial<CompteTresorerieFormData>) => ({
  code: data.code,
  libelle: data.libelle,
  type: data.type,
  banque: data.banque,
  numero_compte: data.numeroCompte,
  devise: data.devise || 'XOF',
  solde_initial: data.soldeInitial,
  date_ouverture: data.dateOuverture,
  observations: data.observations,
});

export const comptesTresorerieService = {
  async getAll(clientId: string): Promise<CompteTresorerie[]> {
    const { data, error } = await supabase
      .from('comptes_tresorerie')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapDbToCompteTresorerie);
  },

  async getById(id: string): Promise<CompteTresorerie> {
    const { data, error } = await supabase
      .from('comptes_tresorerie')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapDbToCompteTresorerie(data);
  },

  async getActifs(clientId: string): Promise<CompteTresorerie[]> {
    const { data, error } = await supabase
      .from('comptes_tresorerie')
      .select('*')
      .eq('client_id', clientId)
      .eq('statut', 'actif')
      .order('type', { ascending: true })
      .order('libelle', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapDbToCompteTresorerie);
  },

  async create(clientId: string, compte: CompteTresorerieFormData): Promise<CompteTresorerie> {
    const { data, error } = await supabase
      .from('comptes_tresorerie')
      .insert({
        client_id: clientId,
        ...mapToDb(compte),
        solde_actuel: compte.soldeInitial,
      })
      .select()
      .single();

    if (error) throw error;
    return mapDbToCompteTresorerie(data);
  },

  async update(id: string, updates: Partial<CompteTresorerieFormData>): Promise<void> {
    const { error } = await supabase
      .from('comptes_tresorerie')
      .update({
        ...mapToDb(updates),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('comptes_tresorerie')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getStats(clientId: string): Promise<ComptesTresorerieStats> {
    const { data, error } = await supabase
      .from('comptes_tresorerie')
      .select('type, solde_actuel')
      .eq('client_id', clientId)
      .eq('statut', 'actif');

    if (error) throw error;

    const stats: ComptesTresorerieStats = {
      nombreTotal: data?.length || 0,
      nombreBanques: 0,
      nombreCaisses: 0,
      soldeTotal: 0,
      soldeBanques: 0,
      soldeCaisses: 0,
    };

    data?.forEach((compte) => {
      stats.soldeTotal += compte.solde_actuel;
      
      if (compte.type === 'banque') {
        stats.nombreBanques++;
        stats.soldeBanques += compte.solde_actuel;
      } else if (compte.type === 'caisse') {
        stats.nombreCaisses++;
        stats.soldeCaisses += compte.solde_actuel;
      }
    });

    return stats;
  },
};
