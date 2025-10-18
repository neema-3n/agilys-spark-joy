import { supabase } from '@/integrations/supabase/client';
import { Exercice } from '@/types';

export const exercicesService = {
  // Récupérer tous les exercices d'un client
  async getByClient(clientId: string): Promise<Exercice[]> {
    const { data, error } = await supabase
      .from('exercices')
      .select('*')
      .eq('client_id', clientId)
      .order('date_debut', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(ex => ({
      id: ex.id,
      clientId: ex.client_id,
      libelle: ex.libelle,
      code: ex.code || undefined,
      dateDebut: ex.date_debut,
      dateFin: ex.date_fin,
      statut: ex.statut as 'ouvert' | 'cloture'
    }));
  },

  // Créer un nouvel exercice
  async create(exercice: Omit<Exercice, 'id'>): Promise<Exercice> {
    const { data, error } = await supabase
      .from('exercices')
      .insert({
        client_id: exercice.clientId,
        libelle: exercice.libelle,
        code: exercice.code || null,
        date_debut: exercice.dateDebut,
        date_fin: exercice.dateFin,
        statut: exercice.statut
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      clientId: data.client_id,
      libelle: data.libelle,
      code: data.code || undefined,
      dateDebut: data.date_debut,
      dateFin: data.date_fin,
      statut: data.statut as 'ouvert' | 'cloture'
    };
  },

  // Mettre à jour un exercice
  async update(id: string, updates: Partial<Omit<Exercice, 'id' | 'clientId'>>): Promise<Exercice> {
    const updateData: any = {};
    if (updates.libelle) updateData.libelle = updates.libelle;
    if (updates.code !== undefined) updateData.code = updates.code || null;
    if (updates.dateDebut) updateData.date_debut = updates.dateDebut;
    if (updates.dateFin) updateData.date_fin = updates.dateFin;
    if (updates.statut) updateData.statut = updates.statut;

    const { data, error } = await supabase
      .from('exercices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      clientId: data.client_id,
      libelle: data.libelle,
      code: data.code || undefined,
      dateDebut: data.date_debut,
      dateFin: data.date_fin,
      statut: data.statut as 'ouvert' | 'cloture'
    };
  },

  // Clôturer un exercice
  async cloturer(id: string): Promise<Exercice> {
    return this.update(id, { statut: 'cloture' });
  },

  // Supprimer un exercice
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('exercices')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
