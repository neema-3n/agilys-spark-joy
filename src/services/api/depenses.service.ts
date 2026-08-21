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
  } else if (obj != null && typeof obj === 'object' && obj.constructor === Object) {
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

const getSupabaseErrorMessage = async (error: any) => {
  let errorMessage = error?.message || 'Une erreur est survenue';

  if (error?.context) {
    try {
      const errorBody = await error.context.json();
      if (errorBody?.error) {
        errorMessage = errorBody.error;
      } else if (errorBody?.message) {
        errorMessage = errorBody.message;
      }
    } catch {
      // keep original message
    }
  }

  return errorMessage;
};

const hasOwn = <T extends object>(obj: T, key: keyof T) => Object.prototype.hasOwnProperty.call(obj, key);

const resolveDepenseLinkedParty = async (
  currentDepense: {
    facture_id: string | null;
    engagement_id: string | null;
    fournisseur_id: string | null;
    beneficiaire: string | null;
  },
) => {
  if (currentDepense.fournisseur_id || currentDepense.beneficiaire) {
    return {
      fournisseur_id: currentDepense.fournisseur_id,
      beneficiaire: currentDepense.beneficiaire,
    };
  }

  if (currentDepense.facture_id) {
    const { data: facture, error } = await supabase
      .from('factures')
      .select('fournisseur_id')
      .eq('id', currentDepense.facture_id)
      .single();

    if (error) throw error;

    if (facture?.fournisseur_id) {
      return {
        fournisseur_id: facture.fournisseur_id,
        beneficiaire: null,
      };
    }
  }

  if (currentDepense.engagement_id) {
    const { data: engagement, error } = await supabase
      .from('engagements')
      .select('fournisseur_id, beneficiaire')
      .eq('id', currentDepense.engagement_id)
      .single();

    if (error) throw error;

    return {
      fournisseur_id: engagement?.fournisseur_id ?? null,
      beneficiaire: engagement?.beneficiaire ?? null,
    };
  }

  return {
    fournisseur_id: null,
    beneficiaire: null,
  };
};

const mergeDepenseUpdates = (
  currentDepense: {
    engagement_id: string | null;
    ligne_budgetaire_id: string | null;
    facture_id: string | null;
    fournisseur_id: string | null;
    beneficiaire: string | null;
    projet_id: string | null;
    objet: string;
    montant: number;
    date_depense: string;
    mode_paiement: string | null;
    reference_paiement: string | null;
    observations: string | null;
    compte_charge_id: string | null;
  },
  preservedParty: {
    fournisseur_id: string | null;
    beneficiaire: string | null;
  },
  updates: Partial<DepenseFormData>,
) => {
  const merged: Record<string, string | number | null> = {
    engagement_id: updates.engagementId ?? currentDepense.engagement_id,
    ligne_budgetaire_id: updates.ligneBudgetaireId ?? currentDepense.ligne_budgetaire_id,
    facture_id: updates.factureId ?? currentDepense.facture_id,
    projet_id: updates.projetId ?? currentDepense.projet_id,
    objet: updates.objet ?? currentDepense.objet,
    montant: updates.montant ?? currentDepense.montant,
    date_depense: updates.dateDepense ?? currentDepense.date_depense,
    mode_paiement: updates.modePaiement ?? currentDepense.mode_paiement,
    reference_paiement: updates.referencePaiement ?? currentDepense.reference_paiement,
    observations: updates.observations ?? currentDepense.observations,
    compte_charge_id: updates.compteChargeId ?? currentDepense.compte_charge_id,
    fournisseur_id: preservedParty.fournisseur_id,
    beneficiaire: preservedParty.beneficiaire,
  };

  if (hasOwn(updates, 'fournisseurId') || hasOwn(updates, 'beneficiaire')) {
    merged.fournisseur_id = updates.fournisseurId ?? null;
    merged.beneficiaire = updates.beneficiaire ?? null;
  }

  return cleanData(merged);
};

const normalizeDepenseRecord = (record: any): Depense => {
  const normalized = toCamelCase({
    ...record,
    compte_charge_id: record?.compte_charge_id ?? null,
  });

  if (normalized?.facture) {
    normalized.facture = {
      ...normalized.facture,
      montantTTC:
        normalized.facture.montantTTC ??
        normalized.facture.montantTtc ??
        null,
    };
    delete normalized.facture.montantTtc;
  }

  if (!normalized?.fournisseur && normalized?.facture?.fournisseur) {
    normalized.fournisseur = normalized.facture.fournisseur;
    normalized.fournisseurId = normalized.fournisseurId ?? normalized.facture.fournisseurId;
  }

  return normalized as Depense;
};

export const getDepenses = async (exerciceId: string, clientId: string): Promise<Depense[]> => {
  const { data, error } = await supabase
    .from('depenses')
    .select(`
      *,
      engagement:engagements(id, numero, objet, montant, fournisseur_id, beneficiaire),
      reservation_credit:reservations_credits(id, numero, montant, statut),
      ligne_budgetaire:lignes_budgetaires(id, libelle, disponible),
      facture:factures(id, numero, montant_ttc, statut, fournisseur_id, fournisseur:fournisseurs(id, nom, code)),
      fournisseur:fournisseurs(id, nom, code),
      projet:projets(id, code, nom),
      ecritures_comptables!depense_id(count)
    `)
    .eq('exercice_id', exerciceId)
    .eq('client_id', clientId)
    .order('date_depense', { ascending: false });

  if (error) throw error;
  
  const depensesWithCount = (data || []).map(dep => {
    const ecrituresCount = dep.ecritures_comptables?.[0]?.count || 0;
    const { ecritures_comptables, ...depenseData } = dep;
    return {
      ...depenseData,
      ecritures_count: ecrituresCount,
      compte_charge_id: dep.compte_charge_id ?? null,
    };
  });
  
  return depensesWithCount.map((depense) => normalizeDepenseRecord(depense));
};

export const createDepense = async (
  depense: DepenseFormData,
  exerciceId: string,
  clientId: string,
  userId: string
): Promise<Depense> => {
  if (!depense.engagementId && !depense.factureId) {
    throw new Error("Une dépense doit être rattachée à un engagement ou à une facture.");
  }
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

  return normalizeDepenseRecord(data);
};

export const updateDepense = async (
  id: string,
  updates: Partial<DepenseFormData>
): Promise<Depense> => {
  // 1. Récupérer la dépense actuelle
  const { data: currentDepense, error: fetchError } = await supabase
    .from('depenses')
    .select(`
      statut,
      engagement_id,
      ligne_budgetaire_id,
      facture_id,
      fournisseur_id,
      beneficiaire,
      projet_id,
      objet,
      montant,
      date_depense,
      mode_paiement,
      reference_paiement,
      observations,
      compte_charge_id
    `)
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // 2. Vérifier s'il existe des écritures validées
  const { data: ecritures, error: ecrituresError } = await supabase
    .from('ecritures_comptables')
    .select('id')
    .eq('depense_id', id)
    .eq('statut_ecriture', 'validee')
    .limit(1);

  if (ecrituresError) throw ecrituresError;

  // 3. Si écritures validées existent → BLOQUER (les brouillons ne génèrent jamais d'écritures)
  if (ecritures && ecritures.length > 0) {
    throw new Error(
      '❌ Modification impossible : Cette opération a été comptabilisée.\n\n' +
      '💡 Pour effectuer une correction :\n' +
      '1. Annulez cette dépense (génère des écritures d\'annulation)\n' +
      '2. Créez une nouvelle dépense avec les bonnes valeurs'
    );
  }

  // 4. Procéder à la modification
  const finalEngagementId = updates.engagementId ?? currentDepense.engagement_id;
  const finalFactureId = updates.factureId ?? currentDepense.facture_id;
  if (!finalEngagementId && !finalFactureId) {
    throw new Error("Une dépense doit rester rattachée à un engagement ou à une facture.");
  }

  const preservedParty = await resolveDepenseLinkedParty(currentDepense);
  const cleanedData = mergeDepenseUpdates(currentDepense, preservedParty, updates);
  
  const { data, error } = await supabase
    .from('depenses')
    .update(cleanedData)
    .eq('id', id)
    .select(`
      *,
      engagement:engagements(id, numero, objet, montant, fournisseur_id, beneficiaire),
      reservation_credit:reservations_credits(id, numero, montant, statut),
      ligne_budgetaire:lignes_budgetaires(id, libelle, disponible),
      facture:factures(id, numero, montant_ttc, statut, fournisseur_id, fournisseur:fournisseurs(id, nom, code)),
      fournisseur:fournisseurs(id, nom, code),
      projet:projets(id, code, nom)
    `)
    .single();

  if (error) throw error;
  return normalizeDepenseRecord(data);
};

export const validerDepense = async (id: string): Promise<Depense> => {
  // 1. Récupérer la dépense pour avoir client_id et exercice_id
  const { data: depense, error: fetchError } = await supabase
    .from('depenses')
    .select('client_id, exercice_id, facture_id')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // 2. Mettre à jour le statut
  const { data, error } = await supabase
    .from('depenses')
    .update({
      statut: 'validee',
      date_validation: new Date().toISOString().split('T')[0],
    })
    .eq('id', id)
    .select(`
      *,
      engagement:engagements(id, numero, objet, montant, fournisseur_id, beneficiaire),
      reservation_credit:reservations_credits(id, numero, montant, statut),
      ligne_budgetaire:lignes_budgetaires(id, libelle, disponible),
      facture:factures(id, numero, montant_ttc, statut, fournisseur_id, fournisseur:fournisseurs(id, nom, code)),
      fournisseur:fournisseurs(id, nom, code),
      projet:projets(id, code, nom)
    `)
    .single();

  if (error) throw error;

  // 3. Générer les écritures comptables automatiquement seulement si la dépense ne dérive pas d'une facture
  if (!depense.facture_id) {
    try {
      await supabase.functions.invoke('generate-ecritures-comptables', {
        body: {
          typeOperation: 'depense',
          sourceId: id,
          clientId: depense.client_id,
          exerciceId: depense.exercice_id
        }
      });
    } catch (error) {
      console.error('Erreur lors de la génération des écritures:', error);
    }
  }

  return normalizeDepenseRecord(data);
};

export const marquerPayee = async (
  id: string,
  datePaiement: string,
  modePaiement: string,
  referencePaiement?: string
): Promise<Depense> => {
  // 1. Récupérer la dépense
  const { data: depense, error: fetchError } = await supabase
    .from('depenses')
    .select('montant, client_id, exercice_id, facture_id')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // 2. Mettre à jour le statut
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
      engagement:engagements(id, numero, objet, montant, fournisseur_id, beneficiaire),
      reservation_credit:reservations_credits(id, numero, montant, statut),
      ligne_budgetaire:lignes_budgetaires(id, libelle, disponible),
      facture:factures(id, numero, montant_ttc, statut, fournisseur_id, fournisseur:fournisseurs(id, nom, code)),
      fournisseur:fournisseurs(id, nom, code),
      projet:projets(id, code, nom)
    `)
    .single();

  if (error) throw error;

  // 3. Générer les écritures comptables automatiquement seulement si la dépense ne dérive pas d'une facture
  if (!depense.facture_id) {
    try {
      await supabase.functions.invoke('generate-ecritures-comptables', {
        body: {
          typeOperation: 'depense',
          sourceId: id,
          clientId: depense.client_id,
          exerciceId: depense.exercice_id
        }
      });
    } catch (error) {
      console.error('Erreur lors de la génération des écritures:', error);
    }
  }

  return normalizeDepenseRecord(data);
};

/**
 * Récupère les paiements valides associés à une dépense
 */
export const getPaiementsValidesDepense = async (depenseId: string) => {
  const { data, error } = await supabase
    .from('paiements')
    .select('id, numero, montant, date_paiement, mode_paiement')
    .eq('depense_id', depenseId)
    .eq('statut', 'valide')
    .order('date_paiement', { ascending: false });

  if (error) throw error;
  return toCamelCase(data);
};

/**
 * Récupère les paiements valides associés à plusieurs dépenses
 */
export const getPaiementsValidesMultipleDepenses = async (depenseIds: string[]) => {
  if (depenseIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from('paiements')
    .select(`
      id, 
      numero, 
      montant, 
      date_paiement, 
      mode_paiement,
      depense_id,
      depenses!inner(numero, objet)
    `)
    .in('depense_id', depenseIds)
    .eq('statut', 'valide')
    .order('date_paiement', { ascending: false });

  if (error) throw error;
  return toCamelCase(data);
};

/**
 * Annule plusieurs dépenses avec le même motif
 */
export const annulerMultipleDepenses = async (depenseIds: string[], motif: string): Promise<void> => {
  const promises = depenseIds.map(id => annulerDepense(id, motif));
  await Promise.all(promises);
};

export const annulerDepense = async (id: string, motif: string): Promise<Depense> => {
  // 1. Vérifier s'il existe des écritures validées
  const { data: ecritures, error: ecrituresError } = await supabase
    .from('ecritures_comptables')
    .select('id')
    .eq('depense_id', id)
    .eq('statut_ecriture', 'validee');

  if (ecrituresError) throw ecrituresError;

  // 2. Si écritures existent → Contrepasser
  if (ecritures && ecritures.length > 0) {
    const { error: contrepasserError } = await supabase.functions.invoke('contrepasser-ecritures', {
      body: {
        typeOperation: 'depense',
        sourceId: id,
        motifAnnulation: motif,
      }
    });

    if (contrepasserError) throw contrepasserError;
  }

  // 3. Mettre à jour le statut
  const { data, error } = await supabase
    .from('depenses')
    .update({
      statut: 'annulee',
      motif_annulation: motif,
    })
    .eq('id', id)
    .select(`
      *,
      engagement:engagements(id, numero, objet, montant, fournisseur_id, beneficiaire),
      reservation_credit:reservations_credits(id, numero, montant, statut),
      ligne_budgetaire:lignes_budgetaires(id, libelle, disponible),
      facture:factures(id, numero, montant_ttc, statut, fournisseur_id, fournisseur:fournisseurs(id, nom, code)),
      fournisseur:fournisseurs(id, nom, code),
      projet:projets(id, code, nom)
    `)
    .single();

  if (error) throw error;
  return normalizeDepenseRecord(data);
};

export const deleteDepense = async (id: string): Promise<void> => {
  // 1. Vérifier le statut
  const { data: depense, error: fetchError } = await supabase
    .from('depenses')
    .select('statut')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // 2. Bloquer si pas brouillon (les brouillons n'ont jamais d'écritures)
  if (depense.statut !== 'brouillon') {
    throw new Error(
      '❌ Suppression impossible\n\n' +
      '💡 Utilisez l\'annulation au lieu de la suppression pour conserver l\'historique comptable'
    );
  }

  const depenseStillExists = async () => {
    const { data: existingDepense, error } = await supabase
      .from('depenses')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return !!existingDepense;
  };

  const errors: string[] = [];

  const { data: functionData, error: functionError } = await supabase.functions.invoke('delete-depense', {
    body: { id },
  });

  if (!functionError && functionData?.success === true && !(await depenseStillExists())) {
    return;
  }

  if (functionError) {
    errors.push(`Edge Function: ${await getSupabaseErrorMessage(functionError)}`);
  } else {
    errors.push('Edge Function: la dépense existe toujours après confirmation.');
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc('delete_depense_brouillon', {
    p_depense_id: id,
  });

  if (!rpcError && rpcData && typeof rpcData === 'object' && 'success' in rpcData && rpcData.success === true && !(await depenseStillExists())) {
    return;
  }

  if (rpcError) {
    errors.push(`RPC SQL: ${await getSupabaseErrorMessage(rpcError)}`);
  } else {
    errors.push('RPC SQL: la dépense existe toujours après confirmation.');
  }

  const { error: directDeleteError } = await supabase
    .from('depenses')
    .delete()
    .eq('id', id);

  if (!directDeleteError && !(await depenseStillExists())) {
    return;
  }

  if (directDeleteError) {
    errors.push(`DELETE direct: ${await getSupabaseErrorMessage(directDeleteError)}`);
  } else {
    errors.push('DELETE direct: aucune ligne supprimée.');
  }

  throw new Error(`La suppression de la dépense a échoué.\n${errors.join('\n')}`);
};

/**
 * Crée une dépense depuis une facture validée
 */
export const createDepenseFromFacture = async (
  data: any,
  exerciceId: string,
  clientId: string,
  userId: string
): Promise<Depense> => {
  console.log('📄 createDepenseFromFacture - Début', { factureId: data.factureId });
  
  // 1. Récupérer la facture
  const { data: factureData, error: factureError } = await supabase
    .from('factures')
    .select(`
      *,
      fournisseur:fournisseurs!fournisseur_id(*),
      engagement:engagements!engagement_id(*),
      ligne_budgetaire:lignes_budgetaires!ligne_budgetaire_id(*),
      projet:projets!projet_id(*)
    `)
    .eq('id', data.factureId)
    .single();

  if (factureError || !factureData) {
    throw new Error('Facture introuvable');
  }

  if (factureData.statut !== 'validee') {
    throw new Error('Seules les factures validées peuvent générer une dépense');
  }

  // 2. Calculer le solde disponible
  const { data: depensesExistantes } = await supabase
    .from('depenses')
    .select('montant')
    .eq('facture_id', data.factureId)
    .neq('statut', 'annulee');

  const montantDejaPaye = (depensesExistantes || []).reduce((sum, d) => sum + Number(d.montant), 0);
  const soldeDisponible = Number(factureData.montant_ttc) - montantDejaPaye;

  if (data.montant > soldeDisponible) {
    throw new Error(`Montant invalide. Solde disponible : ${soldeDisponible.toFixed(2)} €`);
  }

  // 3. Vérifier qu'au moins une imputation budgétaire existe
  if (!factureData.engagement_id && !factureData.ligne_budgetaire_id) {
    throw new Error('La facture doit être liée à un engagement ou une ligne budgétaire pour créer une dépense');
  }

  // 4. Construire les données
  const depenseFormData = {
    factureId: data.factureId,
    engagementId: factureData.engagement_id || undefined,
    ligneBudgetaireId: factureData.ligne_budgetaire_id || undefined,
    fournisseurId: factureData.fournisseur_id,
    beneficiaire: undefined,
    projetId: factureData.projet_id || undefined,
    objet: `Liquidation facture ${factureData.numero} - ${factureData.objet}`,
    montant: data.montant,
    dateDepense: data.dateDepense,
    modePaiement: data.modePaiement,
    referencePaiement: data.referencePaiement,
    observations: data.observations || `Créée depuis la facture ${factureData.numero}`,
  };

  return createDepense(depenseFormData, exerciceId, clientId, userId);
};

/**
 * Crée une dépense depuis un engagement validé
 */
export const createDepenseFromEngagement = async (
  data: any,
  exerciceId: string,
  clientId: string,
  userId: string
): Promise<Depense> => {
  console.log('🤝 createDepenseFromEngagement - Début', { engagementId: data.engagementId });
  
  // 1. Récupérer l'engagement
  const { data: engagementData, error: engagementError } = await supabase
    .from('engagements')
    .select(`
      *,
      fournisseur:fournisseurs!fournisseur_id(*),
      ligne_budgetaire:lignes_budgetaires!ligne_budgetaire_id(*),
      projet:projets!projet_id(*)
    `)
    .eq('id', data.engagementId)
    .single();

  if (engagementError || !engagementData) {
    throw new Error('Engagement introuvable');
  }

  if (engagementData.statut !== 'valide') {
    throw new Error('Seuls les engagements validés peuvent générer une dépense');
  }

  // 2. Calculer le solde disponible
  const { data: depensesExistantes } = await supabase
    .from('depenses')
    .select('montant')
    .eq('engagement_id', data.engagementId)
    .neq('statut', 'annulee');

  const montantDejaLiquide = (depensesExistantes || []).reduce((sum, d) => sum + Number(d.montant), 0);
  const soldeDisponible = Number(engagementData.montant) - montantDejaLiquide;

  if (data.montant > soldeDisponible) {
    throw new Error(`Montant invalide. Solde disponible : ${soldeDisponible.toFixed(2)} €`);
  }

  // 3. Construire les données
  const depenseFormData = {
    engagementId: data.engagementId,
    ligneBudgetaireId: engagementData.ligne_budgetaire_id,
    fournisseurId: engagementData.fournisseur_id || undefined,
    beneficiaire: engagementData.beneficiaire || undefined,
    projetId: engagementData.projet_id || undefined,
    objet: `Liquidation engagement ${engagementData.numero} - ${engagementData.objet}`,
    montant: data.montant,
    dateDepense: data.dateDepense,
    modePaiement: data.modePaiement,
    referencePaiement: data.referencePaiement,
    observations: data.observations || `Créée depuis l'engagement ${engagementData.numero}`,
  };

  return createDepense(depenseFormData, exerciceId, clientId, userId);
};
