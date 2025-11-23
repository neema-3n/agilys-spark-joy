import { supabase } from "@/integrations/supabase/client";
import { Paiement, PaiementFormData } from "@/types/paiement.types";

// Utility functions
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCase(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
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

// Récupérer tous les paiements d'un exercice
export const getPaiements = async (exerciceId: string, clientId: string): Promise<Paiement[]> => {
  const { data, error } = await supabase
    .from('paiements')
    .select(`
      *,
      depense:depenses!depense_id (
        id,
        numero,
        objet,
        montant,
        fournisseur:fournisseurs (
          id,
          nom,
          code
        )
      ),
      ecritures_comptables!paiement_id(count)
    `)
    .eq('exercice_id', exerciceId)
    .eq('client_id', clientId)
    .order('date_paiement', { ascending: false });

  if (error) {
    console.error('Error fetching paiements:', error);
    throw error;
  }

  const paiementsWithCount = (data || []).map(paie => {
    const ecrituresCount = paie.ecritures_comptables?.[0]?.count || 0;
    const { ecritures_comptables, ...paiementData } = paie;
    return { ...paiementData, ecritures_count: ecrituresCount };
  });

  return toCamelCase(paiementsWithCount);
};

// Récupérer les paiements d'une dépense spécifique
export const getPaiementsByDepense = async (depenseId: string): Promise<Paiement[]> => {
  const { data, error } = await supabase
    .from('paiements')
    .select('*')
    .eq('depense_id', depenseId)
    .order('date_paiement', { ascending: false });

  if (error) {
    console.error('Error fetching paiements by depense:', error);
    throw error;
  }

  return toCamelCase(data || []);
};

// Créer un paiement via l'edge function
export const createPaiement = async (
  paiement: PaiementFormData,
  exerciceId: string,
  clientId: string,
  userId: string
): Promise<Paiement> => {
  const { data, error } = await supabase.functions.invoke('create-paiement', {
    body: toSnakeCase(paiement)
  });

  if (error) {
    console.error('Error creating paiement:', error);
    throw error;
  }

  return toCamelCase(data);
};

// Annuler un paiement
export const annulerPaiement = async (id: string, motif: string): Promise<Paiement> => {
  const { data, error } = await supabase
    .from('paiements')
    .update({
      statut: 'annule',
      motif_annulation: motif,
      date_annulation: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error annuling paiement:', error);
    throw error;
  }

  return toCamelCase(data);
};

// Supprimer un paiement (super admin uniquement)
export const deletePaiement = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('paiements')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting paiement:', error);
    throw error;
  }
};
