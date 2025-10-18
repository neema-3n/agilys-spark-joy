import { supabase } from '@/integrations/supabase/client';
import { Programme } from '@/types/budget.types';

export const programmesService = {
  async getAll(clientId: string, exerciceId: string): Promise<Programme[]> {
    const { data, error } = await supabase
      .from('programmes')
      .select('*')
      .eq('client_id', clientId)
      .eq('exercice_id', exerciceId)
      .order('ordre', { ascending: true });

    if (error) throw error;
    return (data || []) as Programme[];
  },

  async getBySectionId(sectionId: string): Promise<Programme[]> {
    const { data, error } = await supabase
      .from('programmes')
      .select('*')
      .eq('section_id', sectionId)
      .order('ordre', { ascending: true });

    if (error) throw error;
    return (data || []) as Programme[];
  },

  async getById(id: string): Promise<Programme> {
    const { data, error } = await supabase
      .from('programmes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Programme;
  },

  async create(programme: Omit<Programme, 'id' | 'created_at' | 'updated_at'>): Promise<Programme> {
    const { data, error } = await supabase
      .from('programmes')
      .insert(programme)
      .select()
      .single();

    if (error) throw error;
    return data as Programme;
  },

  async update(id: string, updates: Partial<Programme>): Promise<Programme> {
    const { data, error } = await supabase
      .from('programmes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Programme;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('programmes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
