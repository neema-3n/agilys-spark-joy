import { supabase } from '@/integrations/supabase/client';
import { Projet, CreateProjetInput, UpdateProjetInput, ProjetStats } from '@/types/projet.types';

// Helper pour mapper les données de la DB vers le type Projet
const mapFromDatabase = (row: any): Projet => ({
  id: row.id,
  clientId: row.client_id,
  exerciceId: row.exercice_id,
  code: row.code,
  nom: row.nom,
  description: row.description,
  responsable: row.responsable,
  dateDebut: row.date_debut,
  dateFin: row.date_fin,
  budgetAlloue: parseFloat(row.budget_alloue || 0),
  budgetConsomme: parseFloat(row.budget_consomme || 0),
  budgetEngage: parseFloat(row.budget_engage || 0),
  enveloppeId: row.enveloppe_id,
  statut: row.statut,
  typeProjet: row.type_projet,
  priorite: row.priorite,
  tauxAvancement: parseFloat(row.taux_avancement || 0),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by,
});

// Helper pour mapper les données du type Projet vers la DB
const mapToDatabase = (input: CreateProjetInput | UpdateProjetInput) => ({
  client_id: (input as any).clientId,
  exercice_id: (input as any).exerciceId,
  code: (input as any).code,
  nom: (input as any).nom,
  description: (input as any).description,
  responsable: (input as any).responsable,
  date_debut: (input as any).dateDebut,
  date_fin: (input as any).dateFin,
  budget_alloue: (input as any).budgetAlloue,
  enveloppe_id: (input as any).enveloppeId,
  statut: (input as any).statut,
  type_projet: (input as any).typeProjet,
  priorite: (input as any).priorite,
  taux_avancement: (input as any).tauxAvancement,
});

export const projetsService = {
  async getByExercice(exerciceId: string, clientId: string): Promise<Projet[]> {
    const { data, error } = await supabase
      .from('projets')
      .select('*')
      .eq('exercice_id', exerciceId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapFromDatabase);
  },

  async getById(id: string): Promise<Projet> {
    const { data, error } = await supabase
      .from('projets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapFromDatabase(data);
  },

  async create(input: CreateProjetInput): Promise<Projet> {
    const dbData = mapToDatabase(input);
    const { data, error } = await supabase
      .from('projets')
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;
    return mapFromDatabase(data);
  },

  async update(id: string, input: UpdateProjetInput): Promise<Projet> {
    const dbData = mapToDatabase(input);
    const { data, error } = await supabase
      .from('projets')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapFromDatabase(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('projets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async updateTauxAvancement(id: string, taux: number): Promise<Projet> {
    const { data, error } = await supabase
      .from('projets')
      .update({ taux_avancement: taux })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapFromDatabase(data);
  },

  async getStatistics(exerciceId: string, clientId: string): Promise<ProjetStats> {
    const projets = await this.getByExercice(exerciceId, clientId);
    
    return {
      nombreTotal: projets.length,
      nombreEnCours: projets.filter(p => p.statut === 'en_cours').length,
      nombreTermines: projets.filter(p => p.statut === 'termine').length,
      budgetTotalAlloue: projets.reduce((sum, p) => sum + p.budgetAlloue, 0),
      budgetTotalConsomme: projets.reduce((sum, p) => sum + p.budgetConsomme, 0),
      tauxExecutionMoyen: projets.length > 0 
        ? projets.reduce((sum, p) => sum + p.tauxAvancement, 0) / projets.length 
        : 0,
    };
  },
};
