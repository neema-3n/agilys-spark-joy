import { supabase } from '@/integrations/supabase/client';

export const testDataService = {
  async generateTestFactures(
    clientId: string,
    exerciceId: string,
    count: number
  ): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-test-factures', {
        body: {
          clientId,
          exerciceId,
          count,
        },
      });

      if (error) {
        console.error('Error from edge function:', error);
        throw new Error(error.message || 'Erreur lors de la génération des factures de test');
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la génération des factures de test:', error);
      throw error;
    }
  },
};
