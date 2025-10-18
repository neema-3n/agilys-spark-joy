import { supabase } from '@/integrations/supabase/client';
import { Section } from '@/types/budget.types';

export const sectionsService = {
  async getAll(clientId: string, exerciceId: string): Promise<Section[]> {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('client_id', clientId)
      .eq('exercice_id', exerciceId)
      .order('ordre', { ascending: true });

    if (error) throw error;
    return (data || []) as Section[];
  },

  async getById(id: string): Promise<Section> {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Section;
  },

  async create(section: Omit<Section, 'id' | 'created_at' | 'updated_at'>): Promise<Section> {
    const { data, error } = await supabase
      .from('sections')
      .insert(section)
      .select()
      .single();

    if (error) throw error;
    return data as Section;
  },

  async update(id: string, updates: Partial<Section>): Promise<Section> {
    const { data, error } = await supabase
      .from('sections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Section;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
