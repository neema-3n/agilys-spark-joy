import { 
  LigneBudgetaire
} from '@/types/budget.types';
import { supabase } from '@/integrations/supabase/client';

// Helpers pour convertir entre camelCase et snake_case
const toSnakeCase = (obj: any) => {
  const result: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
};

const toCamelCase = (obj: any): any => {
  if (!obj) return obj;
  const result: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
};

export const budgetService = {
  // Récupérer les lignes budgétaires par exercice
  getLignesBudgetaires: async (exerciceId: string, clientId: string): Promise<LigneBudgetaire[]> => {
    const { data, error } = await supabase
      .from('lignes_budgetaires')
      .select('*')
      .eq('exercice_id', exerciceId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(row => ({
      ...toCamelCase(row),
      montantLiquide: row.montant_liquide || 0
    }));
  },

  // Créer une ligne budgétaire
  createLigneBudgetaire: async (
    ligne: Omit<LigneBudgetaire, 'id' | 'dateCreation'>,
    clientId: string,
    userId: string
  ): Promise<LigneBudgetaire> => {
    const ligneData = {
      client_id: clientId,
      exercice_id: ligne.exerciceId,
      action_id: ligne.actionId,
      compte_id: ligne.compteId,
      enveloppe_id: ligne.enveloppeId || null,
      libelle: ligne.libelle,
      montant_initial: ligne.montantInitial,
      montant_modifie: ligne.montantInitial,
      montant_engage: 0,
      montant_paye: 0,
      disponible: ligne.montantInitial,
      statut: 'actif',
      created_by: userId
    };

    const { data, error } = await supabase
      .from('lignes_budgetaires')
      .insert(ligneData)
      .select()
      .single();

    if (error) throw error;
    
    return toCamelCase(data);
  },

  // Mettre à jour une ligne budgétaire
  updateLigneBudgetaire: async (
    id: string,
    updates: Partial<LigneBudgetaire>,
    clientId: string,
    exerciceId: string
  ): Promise<LigneBudgetaire> => {
    const updateData = toSnakeCase(updates);
    
    const { data, error } = await supabase
      .from('lignes_budgetaires')
      .update(updateData)
      .eq('id', id)
      .eq('client_id', clientId)
      .eq('exercice_id', exerciceId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Ligne budgétaire non trouvée');
    
    return toCamelCase(data);
  },

  // Supprimer une ligne budgétaire
  deleteLigneBudgetaire: async (id: string, clientId: string, exerciceId: string): Promise<void> => {
    const { error } = await supabase
      .from('lignes_budgetaires')
      .delete()
      .eq('id', id)
      .eq('client_id', clientId)
      .eq('exercice_id', exerciceId);

    if (error) {
      // Détecter l'erreur de contrainte de clé étrangère (code PostgreSQL 23503)
      if (error.code === '23503' && error.message.includes('reservations_credits')) {
        throw new Error(
          'Cette ligne budgétaire ne peut pas être supprimée car elle est utilisée par une ou plusieurs réservations de crédits. ' +
          'Veuillez d\'abord supprimer ou libérer les réservations associées.'
        );
      }
      throw error;
    }
  }
};
