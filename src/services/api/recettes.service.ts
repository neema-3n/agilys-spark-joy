import { supabase } from '@/integrations/supabase/client';
import type { Recette, RecetteFormData, RecettesStats } from '@/types/recette.types';

const mapDbToRecette = (data: any): Recette => ({
  id: data.id,
  clientId: data.client_id,
  exerciceId: data.exercice_id,
  numero: data.numero,
  dateRecette: data.date_recette,
  montant: data.montant,
  compteDestinationId: data.compte_destination_id,
  sourceRecette: data.source_recette,
  categorie: data.categorie,
  beneficiaire: data.beneficiaire,
  reference: data.reference,
  libelle: data.libelle,
  observations: data.observations,
  statut: data.statut,
  motifAnnulation: data.motif_annulation,
  dateAnnulation: data.date_annulation,
  createdBy: data.created_by,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  compteDestination: data.compte_destination ? {
    code: data.compte_destination.code,
    libelle: data.compte_destination.libelle,
    type: data.compte_destination.type,
  } : undefined,
});

export const recettesService = {
  async getAll(clientId: string, exerciceId: string): Promise<Recette[]> {
    const { data, error } = await supabase
      .from('recettes')
      .select(`
        *,
        compte_destination:comptes_tresorerie!compte_destination_id(code, libelle, type)
      `)
      .eq('client_id', clientId)
      .eq('exercice_id', exerciceId)
      .order('date_recette', { ascending: false })
      .order('numero', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapDbToRecette);
  },

  async getById(id: string): Promise<Recette> {
    const { data, error } = await supabase
      .from('recettes')
      .select(`
        *,
        compte_destination:comptes_tresorerie!compte_destination_id(code, libelle, type)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapDbToRecette(data);
  },

  async create(
    clientId: string,
    exerciceId: string,
    recette: RecetteFormData
  ): Promise<Recette> {
    const { data, error } = await supabase.functions.invoke('create-recette', {
      body: {
        clientId,
        exerciceId,
        ...recette,
      },
    });

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<RecetteFormData>): Promise<void> {
    const { error } = await supabase
      .from('recettes')
      .update({
        date_recette: updates.dateRecette,
        montant: updates.montant,
        compte_destination_id: updates.compteDestinationId,
        source_recette: updates.sourceRecette,
        categorie: updates.categorie,
        beneficiaire: updates.beneficiaire,
        reference: updates.reference,
        libelle: updates.libelle,
        observations: updates.observations,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },

  async annuler(id: string, motif: string): Promise<void> {
    const { error } = await supabase
      .from('recettes')
      .update({
        statut: 'annulee',
        motif_annulation: motif,
        date_annulation: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },

  async getStats(clientId: string, exerciceId: string): Promise<RecettesStats> {
    const { data, error } = await supabase
      .from('recettes')
      .select('montant, statut, date_recette, source_recette')
      .eq('client_id', clientId)
      .eq('exercice_id', exerciceId);

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);

    const stats: RecettesStats = {
      nombreTotal: data?.length || 0,
      nombreValidees: 0,
      nombreAnnulees: 0,
      montantTotal: 0,
      montantValidees: 0,
      montantAujourdhui: 0,
      montantCeMois: 0,
      repartitionParSource: [],
    };

    const sourceMap = new Map<string, { nombre: number; montant: number }>();

    data?.forEach((recette) => {
      if (recette.statut === 'validee') {
        stats.nombreValidees++;
        stats.montantValidees += recette.montant;
        stats.montantTotal += recette.montant;

        if (recette.date_recette === today) {
          stats.montantAujourdhui += recette.montant;
        }

        if (recette.date_recette.startsWith(currentMonth)) {
          stats.montantCeMois += recette.montant;
        }

        const source = recette.source_recette;
        const current = sourceMap.get(source) || { nombre: 0, montant: 0 };
        current.nombre++;
        current.montant += recette.montant;
        sourceMap.set(source, current);
      } else if (recette.statut === 'annulee') {
        stats.nombreAnnulees++;
      }
    });

    stats.repartitionParSource = Array.from(sourceMap.entries()).map(([source, data]) => ({
      source,
      nombre: data.nombre,
      montant: data.montant,
    }));

    return stats;
  },
};
