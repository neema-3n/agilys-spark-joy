import { supabase } from '@/integrations/supabase/client';
import { Structure, CreateStructureInput, UpdateStructureInput } from '@/types/structure.types';

export const structuresService = {
  async getAll(clientId: string, exerciceId?: string): Promise<Structure[]> {
    let query = supabase
      .from('structures')
      .select('*')
      .eq('client_id', clientId)
      .order('code', { ascending: true });

    if (exerciceId) {
      query = query.eq('exercice_id', exerciceId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(s => ({
      id: s.id,
      clientId: s.client_id,
      exerciceId: s.exercice_id || undefined,
      code: s.code,
      nom: s.nom,
      type: s.type as Structure['type'],
      parentId: s.parent_id || undefined,
      responsable: s.responsable || undefined,
      statut: s.statut as Structure['statut'],
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));
  },

  async getById(id: string): Promise<Structure> {
    const { data, error } = await supabase
      .from('structures')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      clientId: data.client_id,
      exerciceId: data.exercice_id || undefined,
      code: data.code,
      nom: data.nom,
      type: data.type as Structure['type'],
      parentId: data.parent_id || undefined,
      responsable: data.responsable || undefined,
      statut: data.statut as Structure['statut'],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async create(input: CreateStructureInput): Promise<Structure> {
    const { data, error } = await supabase
      .from('structures')
      .insert({
        client_id: input.clientId,
        exercice_id: input.exerciceId || null,
        code: input.code,
        nom: input.nom,
        type: input.type,
        parent_id: input.parentId || null,
        responsable: input.responsable || null,
        statut: input.statut || 'actif'
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      clientId: data.client_id,
      exerciceId: data.exercice_id || undefined,
      code: data.code,
      nom: data.nom,
      type: data.type as Structure['type'],
      parentId: data.parent_id || undefined,
      responsable: data.responsable || undefined,
      statut: data.statut as Structure['statut'],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async update(id: string, input: UpdateStructureInput): Promise<Structure> {
    const updateData: any = {};
    if (input.code) updateData.code = input.code;
    if (input.nom) updateData.nom = input.nom;
    if (input.type) updateData.type = input.type;
    if (input.parentId !== undefined) updateData.parent_id = input.parentId || null;
    if (input.responsable !== undefined) updateData.responsable = input.responsable || null;
    if (input.statut) updateData.statut = input.statut;

    const { data, error } = await supabase
      .from('structures')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      clientId: data.client_id,
      exerciceId: data.exercice_id || undefined,
      code: data.code,
      nom: data.nom,
      type: data.type as Structure['type'],
      parentId: data.parent_id || undefined,
      responsable: data.responsable || undefined,
      statut: data.statut as Structure['statut'],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('structures')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
