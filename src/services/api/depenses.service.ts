import { supabase } from '@/integrations/supabase/client';
import type { Depense, DepenseFormData } from '@/types/depense.types';

// Conversion helpers
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCase(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

const toSnakeCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => toSnakeCase(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

const cleanData = (obj: any): any => {
  const cleaned = { ...obj };
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === '' || cleaned[key] === undefined) {
      cleaned[key] = null;
    }
  });
  return cleaned;
};

export const getDepenses = async (exerciceId: string, clientId: string): Promise<Depense[]> => {
  const { data, error } = await supabase
    .from('depenses')
    .select(`
      *,
      engagement:engagements(id, numero, montant),
      reservation_credit:reservations_credits(id, numero, montant, statut),
      ligne_budgetaire:lignes_budgetaires(id, libelle, disponible),
      facture:factures(id, numero, montant_ttc, statut),
      fournisseur:fournisseurs(id, nom, code),
      projet:projets(id, code, nom)
    `)
    .eq('exercice_id', exerciceId)
    .eq('client_id', clientId)
    .order('date_depense', { ascending: false });

  if (error) throw error;
  return toCamelCase(data) as Depense[];
};

export const createDepense = async (
  depense: DepenseFormData,
  exerciceId: string,
  clientId: string,
  userId: string
): Promise<Depense> => {
  const cleanedData = cleanData(toSnakeCase(depense));
  
  const { data, error } = await supabase.functions.invoke('create-depense', {
    body: {
      ...cleanedData,
      exercice_id: exerciceId,
      client_id: clientId,
      user_id: userId,
    },
  });

  if (error) {
    let errorMessage = error.message;
    
    if (error.context) {
      try {
        const errorBody = await error.context.json();
        if (errorBody && errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch (e) {
        console.error('Impossible de parser l\'erreur:', e);
      }
    }
    
    throw new Error(errorMessage);
  }
  if (!data) throw new Error('Dépense non créée');

  return toCamelCase(data) as Depense;
};

export const updateDepense = async (
  id: string,
  updates: Partial<DepenseFormData>
): Promise<Depense> => {
  const cleanedData = cleanData(toSnakeCase(updates));
  
  const { data, error } = await supabase
    .from('depenses')
    .update(cleanedData)
    .eq('id', id)
    .select(`
      *,
      engagement:engagements(id, numero, montant),
      reservation_credit:reservations_credits(id, numero, montant, statut),
      ligne_budgetaire:lignes_budgetaires(id, libelle, disponible),
      facture:factures(id, numero, montant_ttc, statut),
      fournisseur:fournisseurs(id, nom, code),
      projet:projets(id, code, nom)
    `)
    .single();

  if (error) throw error;
  return toCamelCase(data) as Depense;
};

export const validerDepense = async (id: string): Promise<Depense> => {
  const { data, error } = await supabase
    .from('depenses')
    .update({
      statut: 'validee',
      date_validation: new Date().toISOString().split('T')[0],
    })
    .eq('id', id)
    .select(`
      *,
      engagement:engagements(id, numero, montant),
      reservation_credit:reservations_credits(id, numero, montant, statut),
      ligne_budgetaire:lignes_budgetaires(id, libelle, disponible),
      facture:factures(id, numero, montant_ttc, statut),
      fournisseur:fournisseurs(id, nom, code),
      projet:projets(id, code, nom)
    `)
    .single();

  if (error) throw error;
  return toCamelCase(data) as Depense;
};

export const ordonnancerDepense = async (id: string): Promise<Depense> => {
  const { data, error } = await supabase
    .from('depenses')
    .update({
      statut: 'ordonnancee',
      date_ordonnancement: new Date().toISOString().split('T')[0],
    })
    .eq('id', id)
    .select(`
      *,
      engagement:engagements(id, numero, montant),
      reservation_credit:reservations_credits(id, numero, montant, statut),
      ligne_budgetaire:lignes_budgetaires(id, libelle, disponible),
      facture:factures(id, numero, montant_ttc, statut),
      fournisseur:fournisseurs(id, nom, code),
      projet:projets(id, code, nom)
    `)
    .single();

  if (error) throw error;
  return toCamelCase(data) as Depense;
};

export const marquerPayee = async (
  id: string,
  datePaiement: string,
  modePaiement: string,
  referencePaiement?: string
): Promise<Depense> => {
  const { data: depense } = await supabase
    .from('depenses')
    .select('montant')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('depenses')
    .update({
      statut: 'payee',
      date_paiement: datePaiement,
      mode_paiement: modePaiement,
      reference_paiement: referencePaiement || null,
      montant_paye: depense?.montant || 0,
    })
    .eq('id', id)
    .select(`
      *,
      engagement:engagements(id, numero, montant),
      reservation_credit:reservations_credits(id, numero, montant, statut),
      ligne_budgetaire:lignes_budgetaires(id, libelle, disponible),
      facture:factures(id, numero, montant_ttc, statut),
      fournisseur:fournisseurs(id, nom, code),
      projet:projets(id, code, nom)
    `)
    .single();

  if (error) throw error;
  return toCamelCase(data) as Depense;
};

export const annulerDepense = async (id: string, motif: string): Promise<Depense> => {
  const { data, error } = await supabase
    .from('depenses')
    .update({
      statut: 'annulee',
      motif_annulation: motif,
    })
    .eq('id', id)
    .select(`
      *,
      engagement:engagements(id, numero, montant),
      reservation_credit:reservations_credits(id, numero, montant, statut),
      ligne_budgetaire:lignes_budgetaires(id, libelle, disponible),
      facture:factures(id, numero, montant_ttc, statut),
      fournisseur:fournisseurs(id, nom, code),
      projet:projets(id, code, nom)
    `)
    .single();

  if (error) throw error;
  return toCamelCase(data) as Depense;
};

export const deleteDepense = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('depenses')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
