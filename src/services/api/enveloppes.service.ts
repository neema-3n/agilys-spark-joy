import { supabase } from '@/integrations/supabase/client';
import type { Enveloppe, CreateEnveloppeInput, UpdateEnveloppeInput } from '@/types/enveloppe.types';

const mapFromDatabase = (row: any): Enveloppe => ({
  id: row.id,
  clientId: row.client_id,
  exerciceId: row.exercice_id,
  code: row.code,
  nom: row.nom,
  sourceFinancement: row.source_financement,
  montantAlloue: parseFloat(row.montant_alloue),
  montantConsomme: parseFloat(row.montant_consomme),
  montantDisponible: parseFloat(row.montant_alloue) - parseFloat(row.montant_consomme),
  statut: row.statut,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by,
});

export const enveloppesService = {
  async getAll(clientId: string, exerciceId?: string): Promise<Enveloppe[]> {
    let query = supabase
      .from('enveloppes')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (exerciceId) {
      query = query.eq('exercice_id', exerciceId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(mapFromDatabase);
  },

  async getById(id: string): Promise<Enveloppe> {
    const { data, error } = await supabase
      .from('enveloppes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapFromDatabase(data);
  },

  async create(input: CreateEnveloppeInput): Promise<Enveloppe> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('enveloppes')
      .insert({
        client_id: input.clientId,
        exercice_id: input.exerciceId,
        code: input.code,
        nom: input.nom,
        source_financement: input.sourceFinancement,
        montant_alloue: input.montantAlloue,
        montant_consomme: input.montantConsomme,
        statut: input.statut,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return mapFromDatabase(data);
  },

  async update(id: string, input: UpdateEnveloppeInput): Promise<Enveloppe> {
    const updateData: any = {};
    
    if (input.code !== undefined) updateData.code = input.code;
    if (input.nom !== undefined) updateData.nom = input.nom;
    if (input.sourceFinancement !== undefined) updateData.source_financement = input.sourceFinancement;
    if (input.montantAlloue !== undefined) updateData.montant_alloue = input.montantAlloue;
    if (input.montantConsomme !== undefined) updateData.montant_consomme = input.montantConsomme;
    if (input.statut !== undefined) updateData.statut = input.statut;

    const { data, error } = await supabase
      .from('enveloppes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapFromDatabase(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('enveloppes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async cloturer(id: string): Promise<Enveloppe> {
    return this.update(id, { statut: 'cloture' });
  },
};
