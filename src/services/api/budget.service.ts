import { 
  LigneBudgetaire, 
  ModificationBudgetaire
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
    
    return (data || []).map(toCamelCase);
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
  updateLigneBudgetaire: async (id: string, updates: Partial<LigneBudgetaire>): Promise<LigneBudgetaire> => {
    const updateData = toSnakeCase(updates);
    
    const { data, error } = await supabase
      .from('lignes_budgetaires')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Ligne budgétaire non trouvée');
    
    return toCamelCase(data);
  },

  // Supprimer une ligne budgétaire
  deleteLigneBudgetaire: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('lignes_budgetaires')
      .delete()
      .eq('id', id);

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
  },

  // Récupérer les modifications budgétaires
  getModifications: async (exerciceId: string, clientId: string): Promise<ModificationBudgetaire[]> => {
    const { data, error } = await supabase
      .from('modifications_budgetaires')
      .select('*')
      .eq('exercice_id', exerciceId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(toCamelCase);
  },

  // Créer une modification budgétaire
  createModification: async (
    modification: Omit<ModificationBudgetaire, 'id' | 'dateCreation' | 'numero'>,
    clientId: string
  ): Promise<ModificationBudgetaire> => {
    // Appeler l'Edge Function pour créer la modification avec numéro atomique
    const { data, error } = await supabase.functions.invoke('create-modification-budgetaire', {
      body: {
        exerciceId: modification.exerciceId,
        clientId,
        type: modification.type,
        ligneSourceId: modification.ligneSourceId,
        ligneDestinationId: modification.ligneDestinationId,
        montant: modification.montant,
        motif: modification.motif,
      },
    });

    if (error) throw new Error(error.message || 'Erreur lors de la création de la modification budgétaire');
    return data;
  },

  // Valider une modification budgétaire
  validerModification: async (id: string, userId: string): Promise<ModificationBudgetaire> => {
    // Récupérer la modification
    const { data: modification, error: modifError } = await supabase
      .from('modifications_budgetaires')
      .select('*')
      .eq('id', id)
      .single();

    if (modifError) throw modifError;
    if (!modification) throw new Error('Modification non trouvée');

    // Récupérer la ligne de destination
    const { data: ligneDestination, error: destError } = await supabase
      .from('lignes_budgetaires')
      .select('*')
      .eq('id', modification.ligne_destination_id)
      .single();

    if (destError) throw destError;
    if (!ligneDestination) throw new Error('Ligne de destination non trouvée');

    // Appliquer la modification
    if (modification.type === 'augmentation') {
      const { error } = await supabase
        .from('lignes_budgetaires')
        .update({
          montant_modifie: ligneDestination.montant_modifie + modification.montant,
          disponible: ligneDestination.disponible + modification.montant
        })
        .eq('id', ligneDestination.id);

      if (error) throw error;
    } else if (modification.type === 'diminution') {
      const { error } = await supabase
        .from('lignes_budgetaires')
        .update({
          montant_modifie: ligneDestination.montant_modifie - modification.montant,
          disponible: ligneDestination.disponible - modification.montant
        })
        .eq('id', ligneDestination.id);

      if (error) throw error;
    } else if (modification.type === 'virement' && modification.ligne_source_id) {
      // Récupérer la ligne source
      const { data: ligneSource, error: sourceError } = await supabase
        .from('lignes_budgetaires')
        .select('*')
        .eq('id', modification.ligne_source_id)
        .single();

      if (sourceError) throw sourceError;
      if (!ligneSource) throw new Error('Ligne source non trouvée');

      // Mettre à jour les deux lignes
      const { error: sourceUpdateError } = await supabase
        .from('lignes_budgetaires')
        .update({
          montant_modifie: ligneSource.montant_modifie - modification.montant,
          disponible: ligneSource.disponible - modification.montant
        })
        .eq('id', ligneSource.id);

      if (sourceUpdateError) throw sourceUpdateError;

      const { error: destUpdateError } = await supabase
        .from('lignes_budgetaires')
        .update({
          montant_modifie: ligneDestination.montant_modifie + modification.montant,
          disponible: ligneDestination.disponible + modification.montant
        })
        .eq('id', ligneDestination.id);

      if (destUpdateError) throw destUpdateError;
    }

    // Mettre à jour le statut de la modification
    const { data: updatedModif, error: updateError } = await supabase
      .from('modifications_budgetaires')
      .update({
        statut: 'validee',
        date_validation: new Date().toISOString().split('T')[0],
        valide_par: userId
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    
    return toCamelCase(updatedModif);
  },

  // Soumettre une modification budgétaire (brouillon -> en_attente)
  soumettreModification: async (id: string): Promise<ModificationBudgetaire> => {
    const { data: modification, error: fetchError } = await supabase
      .from('modifications_budgetaires')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!modification) throw new Error('Modification non trouvée');
    if (modification.statut !== 'brouillon') {
      throw new Error('Seules les modifications en brouillon peuvent être soumises');
    }

    const { data, error } = await supabase
      .from('modifications_budgetaires')
      .update({ statut: 'en_attente' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return toCamelCase(data);
  },

  // Rejeter une modification budgétaire
  rejeterModification: async (id: string): Promise<ModificationBudgetaire> => {
    const { data, error } = await supabase
      .from('modifications_budgetaires')
      .update({ statut: 'rejetee' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Modification non trouvée');
    
    return toCamelCase(data);
  }
};
