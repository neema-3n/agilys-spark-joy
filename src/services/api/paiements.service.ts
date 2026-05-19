import { supabase } from "@/integrations/supabase/client";
import { Paiement, PaiementFormData } from "@/types/paiement.types";
import type { FinancialVentilation } from '@/types/financial.types';

// Utility functions
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCase(v));
  } else if (obj && typeof obj === 'object' && obj.constructor === Object) {
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
  } else if (obj && typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

const parseVentilations = (value: any): FinancialVentilation[] => (Array.isArray(value) ? value : []);

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
      compte_tresorerie:comptes_tresorerie!compte_tresorerie_id (
        id,
        code,
        libelle,
        type
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
    return {
      ...paiementData,
      ecritures_count: ecrituresCount,
      montant_ht: paie.montant_ht ?? paie.montant,
      montant_ttc: paie.montant_ttc ?? paie.montant,
      montant_net_paye: paie.montant_net_paye ?? paie.montant,
      total_ajouts: paie.total_ajouts ?? 0,
      total_retraits: paie.total_retraits ?? 0,
      charge_principale_mode: paie.charge_principale_mode ?? 'nature',
      nature_compte_charge_id: paie.nature_compte_charge_id ?? null,
      compte_charge_id: paie.compte_charge_id ?? null,
      compte_tresorerie_id: paie.compte_tresorerie_id ?? null,
      ventilations: parseVentilations(paie.ventilations),
    };
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

  return toCamelCase(
    (data || []).map((paiement) => ({
      ...paiement,
      montant_ht: paiement.montant_ht ?? paiement.montant,
      montant_ttc: paiement.montant_ttc ?? paiement.montant,
      montant_net_paye: paiement.montant_net_paye ?? paiement.montant,
      total_ajouts: paiement.total_ajouts ?? 0,
      total_retraits: paiement.total_retraits ?? 0,
      charge_principale_mode: paiement.charge_principale_mode ?? 'nature',
      ventilations: parseVentilations(paiement.ventilations),
    }))
  );
};

// Créer un paiement via l'edge function
export const createPaiement = async (
  paiement: PaiementFormData,
  exerciceId: string,
  clientId: string,
  userId: string
): Promise<Paiement> => {
  if (!paiement.depenseId) {
    throw new Error("Un paiement doit être rattaché à une dépense.");
  }
  const { data, error } = await supabase.functions.invoke('create-paiement', {
    body: {
      ...toSnakeCase(paiement),
      exercice_id: exerciceId,
      client_id: clientId,
      user_id: userId,
    }
  });

  if (error) {
    console.error('Error creating paiement:', error);
    let errorMessage = error.message;

    if (error.context) {
      try {
        const errorBody = await error.context.json();
        if (errorBody && errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch (parseError) {
        console.error('Impossible de parser l\'erreur create-paiement:', parseError);
      }
    }

    throw new Error(errorMessage);
  }

  return toCamelCase(data);
};

export const updatePaiement = async (
  id: string,
  paiement: PaiementFormData,
): Promise<Paiement> => {
  const { data: currentPaiement, error: currentPaiementError } = await supabase
    .from('paiements')
    .select('depense_id')
    .eq('id', id)
    .single();

  if (currentPaiementError) {
    console.error('Error fetching current paiement:', currentPaiementError);
    throw currentPaiementError;
  }

  if (!paiement.depenseId && !currentPaiement?.depense_id) {
    throw new Error("Un paiement doit rester rattaché à une dépense.");
  }
  const { data, error } = await supabase
    .from('paiements')
    .update({
      ...toSnakeCase(paiement),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
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
      compte_tresorerie:comptes_tresorerie!compte_tresorerie_id (
        id,
        code,
        libelle,
        type
      )
    `)
    .single();

  if (error) {
    console.error('Error updating paiement:', error);
    throw error;
  }

  return toCamelCase({
    ...data,
    montant_ht: data.montant_ht ?? data.montant,
    montant_ttc: data.montant_ttc ?? data.montant,
    montant_net_paye: data.montant_net_paye ?? data.montant,
    total_ajouts: data.total_ajouts ?? 0,
    total_retraits: data.total_retraits ?? 0,
    charge_principale_mode: data.charge_principale_mode ?? 'nature',
    nature_compte_charge_id: data.nature_compte_charge_id ?? null,
    compte_charge_id: data.compte_charge_id ?? null,
    compte_tresorerie_id: data.compte_tresorerie_id ?? null,
    ventilations: parseVentilations(data.ventilations),
  });
};

export const validerPaiement = async (
  id: string,
  clientId: string,
  exerciceId: string,
): Promise<Paiement> => {
  const updated = await updatePaiement(id, { statut: 'valide' });

  const { data, error } = await supabase.functions.invoke('generate-ecritures-comptables', {
    body: {
      typeOperation: 'paiement',
      sourceId: id,
      clientId,
      exerciceId,
    },
  });

  if (error) {
    console.error('Error validating paiement accounting:', error);
    throw new Error('Le paiement a été validé mais la génération des écritures comptables a échoué.');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'La validation du paiement a échoué côté comptabilité.');
  }

  return updated;
};

// Annuler un paiement
export const annulerPaiement = async (id: string, motif: string): Promise<Paiement> => {
  // 1. Vérifier s'il existe des écritures validées
  const { data: ecritures, error: ecrituresError } = await supabase
    .from('ecritures_comptables')
    .select('id')
    .eq('paiement_id', id)
    .eq('statut_ecriture', 'validee');

  if (ecrituresError) throw ecrituresError;

  // 2. Si écritures existent → Contrepasser
  if (ecritures && ecritures.length > 0) {
    const { error: contrepasserError } = await supabase.functions.invoke('contrepasser-ecritures', {
      body: {
        typeOperation: 'paiement',
        sourceId: id,
        motifAnnulation: motif,
      }
    });

    if (contrepasserError) throw contrepasserError;
  }

  // 3. Mettre à jour le statut
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
  // 1. Vérifier le statut
  const { data: paiement, error: fetchError } = await supabase
    .from('paiements')
    .select('statut')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // 2. Bloquer si validé (les paiements validés peuvent avoir des écritures)
  if (paiement.statut === 'valide') {
    throw new Error(
      '❌ Suppression impossible\n\n' +
      '💡 Utilisez l\'annulation au lieu de la suppression pour conserver l\'historique comptable'
    );
  }

  // 4. OK pour suppression
  const { error } = await supabase
    .from('paiements')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting paiement:', error);
    throw error;
  }
};
