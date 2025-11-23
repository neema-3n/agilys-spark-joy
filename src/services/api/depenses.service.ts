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
    reservationCreditId: undefined,
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
      projet:projets!projet_id(*),
      reservation_credit:reservations_credits!reservation_credit_id(*)
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
    reservationCreditId: engagementData.reservation_credit_id || undefined,
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

/**
 * Crée une dépense d'urgence depuis une réservation (cas exceptionnel)
 */
export const createDepenseFromReservation = async (
  data: any,
  exerciceId: string,
  clientId: string,
  userId: string
): Promise<Depense> => {
  console.log('💳 createDepenseFromReservation - Début', { reservationId: data.reservationCreditId });
  
  // 1. Vérifier la justification
  if (!data.justificationUrgence || data.justificationUrgence.trim().length < 10) {
    throw new Error('Justification d\'urgence requise (minimum 10 caractères)');
  }

  // 2. Récupérer la réservation
  const { data: reservationData, error: reservationError } = await supabase
    .from('reservations_credits')
    .select(`
      *,
      ligne_budgetaire:lignes_budgetaires!ligne_budgetaire_id(*),
      projet:projets!projet_id(*)
    `)
    .eq('id', data.reservationCreditId)
    .single();

  if (reservationError || !reservationData) {
    throw new Error('Réservation introuvable');
  }

  if (reservationData.statut !== 'active') {
    throw new Error('Seules les réservations actives peuvent générer une dépense');
  }

  // 3. Calculer le solde disponible
  const { data: engagementsExistants } = await supabase
    .from('engagements')
    .select('montant')
    .eq('reservation_credit_id', data.reservationCreditId)
    .neq('statut', 'annule');

  const { data: depensesExistantes } = await supabase
    .from('depenses')
    .select('montant')
    .eq('reservation_credit_id', data.reservationCreditId)
    .neq('statut', 'annulee');

  const montantEngage = (engagementsExistants || []).reduce((sum, e) => sum + Number(e.montant), 0);
  const montantDepense = (depensesExistantes || []).reduce((sum, d) => sum + Number(d.montant), 0);
  const soldeDisponible = Number(reservationData.montant) - montantEngage - montantDepense;

  if (data.montant > soldeDisponible) {
    throw new Error(`Montant invalide. Solde disponible : ${soldeDisponible.toFixed(2)} €`);
  }

  // 4. Limite métier
  const LIMITE_URGENCE = 5000;
  if (data.montant > LIMITE_URGENCE) {
    throw new Error(`Pour les montants > ${LIMITE_URGENCE}€, veuillez créer un engagement puis une facture`);
  }

  // 5. Construire les données
  const depenseFormData = {
    reservationCreditId: data.reservationCreditId,
    ligneBudgetaireId: reservationData.ligne_budgetaire_id,
    beneficiaire: data.beneficiaire || reservationData.beneficiaire,
    projetId: reservationData.projet_id || undefined,
    objet: data.objet,
    montant: data.montant,
    dateDepense: data.dateDepense,
    modePaiement: data.modePaiement,
    referencePaiement: data.referencePaiement,
    observations: `[URGENCE] ${data.justificationUrgence}\n\n${data.observations || ''}`,
  };

  return createDepense(depenseFormData, exerciceId, clientId, userId);
};
