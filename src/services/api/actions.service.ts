import { supabase } from '@/integrations/supabase/client';
import { Action } from '@/types/budget.types';

export const actionsService = {
  async getAll(clientId: string, exerciceId: string): Promise<Action[]> {
    const { data, error } = await supabase
      .from('actions')
      .select('*')
      .eq('client_id', clientId)
      .eq('exercice_id', exerciceId)
      .order('ordre', { ascending: true });

    if (error) throw error;
    return (data || []) as Action[];
  },

  async getByProgrammeId(programmeId: string): Promise<Action[]> {
    const { data, error } = await supabase
      .from('actions')
      .select('*')
      .eq('programme_id', programmeId)
      .order('ordre', { ascending: true });

    if (error) throw error;
    return (data || []) as Action[];
  },

  async getById(id: string): Promise<Action> {
    const { data, error } = await supabase
      .from('actions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Action;
  },

  async create(action: Omit<Action, 'id' | 'created_at' | 'updated_at'>): Promise<Action> {
    const { data, error } = await supabase
      .from('actions')
      .insert(action)
      .select()
      .single();

    if (error) throw error;
    return data as Action;
  },

  async update(id: string, updates: Partial<Action>): Promise<Action> {
    const { data, error } = await supabase
      .from('actions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Action;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('actions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
