import { supabase } from '@/integrations/supabase/client';
import { Compte, CreateCompteInput, UpdateCompteInput } from '@/types/compte.types';

export const comptesService = {
  async getAll(clientId: string): Promise<Compte[]> {
    const { data, error } = await supabase
      .from('comptes')
      .select('*')
      .eq('client_id', clientId)
      .order('numero', { ascending: true });

    if (error) throw error;

    return (data || []).map(c => ({
      id: c.id,
      clientId: c.client_id,
      numero: c.numero,
      libelle: c.libelle,
      type: c.type as Compte['type'],
      categorie: c.categorie as Compte['categorie'],
      parentId: c.parent_id || undefined,
      niveau: c.niveau,
      statut: c.statut as Compte['statut'],
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));
  },

  async getById(id: string): Promise<Compte> {
    const { data, error } = await supabase
      .from('comptes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      clientId: data.client_id,
      numero: data.numero,
      libelle: data.libelle,
      type: data.type as Compte['type'],
      categorie: data.categorie as Compte['categorie'],
      parentId: data.parent_id || undefined,
      niveau: data.niveau,
      statut: data.statut as Compte['statut'],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async create(input: CreateCompteInput): Promise<Compte> {
    const { data, error } = await supabase
      .from('comptes')
      .insert({
        client_id: input.clientId,
        numero: input.numero,
        libelle: input.libelle,
        type: input.type,
        categorie: input.categorie,
        parent_id: input.parentId || null,
        niveau: input.niveau || 1,
        statut: input.statut || 'actif'
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      clientId: data.client_id,
      numero: data.numero,
      libelle: data.libelle,
      type: data.type as Compte['type'],
      categorie: data.categorie as Compte['categorie'],
      parentId: data.parent_id || undefined,
      niveau: data.niveau,
      statut: data.statut as Compte['statut'],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async update(id: string, input: UpdateCompteInput): Promise<Compte> {
    const updateData: any = {};
    if (input.numero) updateData.numero = input.numero;
    if (input.libelle) updateData.libelle = input.libelle;
    if (input.type) updateData.type = input.type;
    if (input.categorie) updateData.categorie = input.categorie;
    if (input.parentId !== undefined) updateData.parent_id = input.parentId || null;
    if (input.niveau) updateData.niveau = input.niveau;
    if (input.statut) updateData.statut = input.statut;

    const { data, error } = await supabase
      .from('comptes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      clientId: data.client_id,
      numero: data.numero,
      libelle: data.libelle,
      type: data.type as Compte['type'],
      categorie: data.categorie as Compte['categorie'],
      parentId: data.parent_id || undefined,
      niveau: data.niveau,
      statut: data.statut as Compte['statut'],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('comptes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
