import { supabase } from '@/integrations/supabase/client';
import { ParametreReferentiel, CreateReferentielInput, UpdateReferentielInput, ReferentielCategorie } from '@/types/referentiel.types';

const mapFromDatabase = (row: any): ParametreReferentiel => ({
  id: row.id,
  clientId: row.client_id,
  categorie: row.categorie,
  code: row.code,
  libelle: row.libelle,
  description: row.description,
  ordre: row.ordre,
  actif: row.actif,
  modifiable: row.modifiable,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by
});

export const referentielsService = {
  async getAllByCategorie(
    clientId: string, 
    categorie: ReferentielCategorie,
    actifOnly: boolean = true
  ): Promise<ParametreReferentiel[]> {
    let query = supabase
      .from('parametres_referentiels')
      .select('*')
      .eq('client_id', clientId)
      .eq('categorie', categorie)
      .order('ordre', { ascending: true })
      .order('libelle', { ascending: true });

    if (actifOnly) {
      query = query.eq('actif', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching referentiels:', error);
      throw new Error(`Erreur lors de la récupération des référentiels: ${error.message}`);
    }

    return (data || []).map(mapFromDatabase);
  },

  async getById(id: string): Promise<ParametreReferentiel> {
    const { data, error } = await supabase
      .from('parametres_referentiels')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching referentiel:', error);
      throw new Error(`Erreur lors de la récupération du référentiel: ${error.message}`);
    }

    if (!data) {
      throw new Error('Référentiel non trouvé');
    }

    return mapFromDatabase(data);
  },

  async create(input: CreateReferentielInput): Promise<ParametreReferentiel> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('parametres_referentiels')
      .insert([{
        client_id: input.clientId,
        categorie: input.categorie,
        code: input.code,
        libelle: input.libelle,
        description: input.description,
        ordre: input.ordre,
        actif: input.actif,
        modifiable: input.modifiable,
        created_by: user?.id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating referentiel:', error);
      throw new Error(`Erreur lors de la création du référentiel: ${error.message}`);
    }

    return mapFromDatabase(data);
  },

  async update(id: string, input: UpdateReferentielInput): Promise<ParametreReferentiel> {
    const updateData: any = {};
    
    if (input.code !== undefined) updateData.code = input.code;
    if (input.libelle !== undefined) updateData.libelle = input.libelle;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.ordre !== undefined) updateData.ordre = input.ordre;
    if (input.actif !== undefined) updateData.actif = input.actif;
    if (input.modifiable !== undefined) updateData.modifiable = input.modifiable;

    const { data, error } = await supabase
      .from('parametres_referentiels')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating referentiel:', error);
      throw new Error(`Erreur lors de la mise à jour du référentiel: ${error.message}`);
    }

    return mapFromDatabase(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('parametres_referentiels')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting referentiel:', error);
      throw new Error(`Erreur lors de la suppression du référentiel: ${error.message}`);
    }
  },

  async reorder(
    categorie: ReferentielCategorie,
    clientId: string,
    orderedIds: string[]
  ): Promise<void> {
    const updates = orderedIds.map((id, index) => 
      supabase
        .from('parametres_referentiels')
        .update({ ordre: index })
        .eq('id', id)
        .eq('client_id', clientId)
        .eq('categorie', categorie)
    );

    const results = await Promise.all(updates);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      console.error('Error reordering referentiels:', errors);
      throw new Error('Erreur lors de la réorganisation des référentiels');
    }
  }
};
