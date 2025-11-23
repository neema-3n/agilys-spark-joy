import { supabase } from '@/integrations/supabase/client';
import type { Engagement, EngagementFormData } from '@/types/engagement.types';

// Helper functions
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

const toSnakeCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      acc[snakeKey] = toSnakeCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

const cleanData = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  
  return Object.keys(obj).reduce((acc, key) => {
    const value = obj[key];
    acc[key] = value === '' || value === undefined ? null : cleanData(value);
    return acc;
  }, {} as any);
};

// Calculer le montant disponible d'une réservation
export const getMontantDisponibleReservation = async (
  reservationId: string
): Promise<number> => {
  // 1. Récupérer la réservation
  const { data: reservation, error: resError } = await supabase
    .from('reservations_credits')
    .select('montant')
    .eq('id', reservationId)
    .single();
  
  if (resError) throw resError;
  
  // 2. Récupérer tous les engagements liés (sauf ceux annulés)
  const { data: engagements, error: engError } = await supabase
    .from('engagements')
    .select('montant')
    .eq('reservation_credit_id', reservationId)
    .neq('statut', 'annule');
  
  if (engError) throw engError;
  
  // 3. Calculer le montant déjà engagé
  const montantEngage = engagements?.reduce((sum, eng) => sum + Number(eng.montant), 0) || 0;
  
  // 4. Retourner le disponible
  return Number(reservation.montant) - montantEngage;
};

// Note: La génération du numéro est désormais gérée par l'Edge Function create-engagement

export const getEngagements = async (
  exerciceId: string,
  clientId: string
): Promise<Engagement[]> => {
  const { data, error } = await supabase
    .from('engagements')
    .select(`
      *,
      ligne_budgetaire:lignes_budgetaires!engagements_ligne_budgetaire_id_fkey (
        libelle,
        disponible
      ),
      fournisseur:fournisseurs!engagements_fournisseur_id_fkey (
        nom,
        code
      ),
      projet:projets!engagements_projet_id_fkey (
        code,
        nom
      ),
      reservation_credit:reservations_credits!engagements_reservation_credit_id_fkey (
        numero,
        statut
      ),
      bons_commande:bons_commande!bons_commande_engagement_id_fkey (
        montant
      ),
      ecritures_comptables!engagement_id(count)
    `)
    .eq('exercice_id', exerciceId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  // Calculer le solde pour chaque engagement
  const engagementsAvecSolde = (data || []).map(eng => {
    const montantBonsCommande = eng.bons_commande?.reduce((sum: number, bc: any) => sum + Number(bc.montant || 0), 0) || 0;
    const solde = Number(eng.montant) - montantBonsCommande;
    const ecrituresCount = eng.ecritures_comptables?.[0]?.count || 0;
    
    // Retirer bons_commande et ecritures_comptables du résultat final pour garder la structure propre
    const { bons_commande, ecritures_comptables, ...engagementData } = eng;
    
    return {
      ...engagementData,
      solde,
      ecrituresCount
    };
  });
  
  return toCamelCase(engagementsAvecSolde);
};

// Créer un engagement
export const createEngagement = async (
  engagement: EngagementFormData,
  exerciceId: string,
  clientId: string,
  userId: string
): Promise<Engagement> => {
  // Appeler l'Edge Function pour créer l'engagement avec numéro atomique
  const { data, error } = await supabase.functions.invoke('create-engagement', {
    body: {
      exerciceId,
      clientId,
      ligneBudgetaireId: engagement.ligneBudgetaireId,
      objet: engagement.objet,
      montant: engagement.montant,
      fournisseurId: engagement.fournisseurId,
      beneficiaire: engagement.beneficiaire,
      projetId: engagement.projetId,
      observations: engagement.observations,
      reservationCreditId: engagement.reservationCreditId,
    },
  });

  if (error) throw new Error(error.message || 'Erreur lors de la création de l\'engagement');
  return data;
};

// Créer un engagement depuis une réservation
export const createEngagementFromReservation = async (
  reservationId: string,
  additionalData: Partial<EngagementFormData>,
  exerciceId: string,
  clientId: string,
  userId: string
): Promise<Engagement> => {
  // Récupérer les données de la réservation
  const { data: reservation, error: resError } = await supabase
    .from('reservations_credits')
    .select('*')
    .eq('id', reservationId)
    .single();

  if (resError) throw resError;

  // Calculer le montant de l'engagement
  const montant = additionalData.montant !== undefined ? additionalData.montant : Number(reservation.montant);
  
  // Valider que le montant ne dépasse pas le disponible de la réservation
  const montantDisponible = await getMontantDisponibleReservation(reservationId);
  
  if (montant > montantDisponible) {
    throw new Error(
      `Le montant de l'engagement (${montant.toLocaleString()} FCFA) dépasse le montant disponible de la réservation (${montantDisponible.toLocaleString()} FCFA)`
    );
  }

  // Utiliser les données du formulaire en priorité, avec fallback sur la réservation
  const engagementData: EngagementFormData = {
    ligneBudgetaireId: additionalData.ligneBudgetaireId || reservation.ligne_budgetaire_id,
    objet: additionalData.objet || reservation.objet,
    montant,
    reservationCreditId: reservationId,
    fournisseurId: additionalData.fournisseurId,
    beneficiaire: additionalData.beneficiaire !== undefined ? additionalData.beneficiaire : reservation.beneficiaire,
    projetId: additionalData.projetId !== undefined ? additionalData.projetId : reservation.projet_id,
    observations: additionalData.observations,
  };

  return createEngagement(engagementData, exerciceId, clientId, userId);
};

// Mettre à jour un engagement
export const updateEngagement = async (
  id: string,
  updates: Partial<EngagementFormData>
): Promise<Engagement> => {
  const cleanedUpdates = cleanData(toSnakeCase(updates));

  const { data, error } = await supabase
    .from('engagements')
    .update(cleanedUpdates)
    .eq('id', id)
    .select(`
      *,
      ligne_budgetaire:lignes_budgetaires!engagements_ligne_budgetaire_id_fkey (
        libelle,
        disponible
      ),
      fournisseur:fournisseurs!engagements_fournisseur_id_fkey (
        nom,
        code
      ),
      projet:projets!engagements_projet_id_fkey (
        code,
        nom
      ),
      reservation_credit:reservations_credits!engagements_reservation_credit_id_fkey (
        numero,
        statut
      )
    `)
    .single();

  if (error) throw error;
  return toCamelCase(data);
};

// Valider un engagement
export const validerEngagement = async (id: string): Promise<Engagement> => {
  const { data, error } = await supabase
    .from('engagements')
    .update({
      statut: 'valide',
      date_validation: new Date().toISOString().split('T')[0],
    })
    .eq('id', id)
    .select(`
      *,
      ligne_budgetaire:lignes_budgetaires!engagements_ligne_budgetaire_id_fkey (
        libelle,
        disponible
      ),
      fournisseur:fournisseurs!engagements_fournisseur_id_fkey (
        nom,
        code
      ),
      projet:projets!engagements_projet_id_fkey (
        code,
        nom
      ),
      reservation_credit:reservations_credits!engagements_reservation_credit_id_fkey (
        numero,
        statut
      )
    `)
    .single();

  if (error) throw error;
  return toCamelCase(data);
};

// Annuler un engagement
export const annulerEngagement = async (
  id: string,
  motifAnnulation: string
): Promise<Engagement> => {
  // Vérifier s'il existe des bons de commande liés
  const { data: bonsCommande, error: checkError } = await supabase
    .from('bons_commande')
    .select('id, numero')
    .eq('engagement_id', id);
  
  if (checkError) throw checkError;
  
  if (bonsCommande && bonsCommande.length > 0) {
    throw new Error(
      `Impossible d'annuler cet engagement : ${bonsCommande.length} bon(s) de commande y sont liés. ` +
      `Veuillez d'abord supprimer ou dissocier les BC suivants : ${bonsCommande.map(bc => bc.numero).join(', ')}`
    );
  }
  
  const { data, error } = await supabase
    .from('engagements')
    .update({
      statut: 'annule',
      motif_annulation: motifAnnulation,
    })
    .eq('id', id)
    .select(`
      *,
      ligne_budgetaire:lignes_budgetaires!engagements_ligne_budgetaire_id_fkey (
        libelle,
        disponible
      ),
      fournisseur:fournisseurs!engagements_fournisseur_id_fkey (
        nom,
        code
      ),
      projet:projets!engagements_projet_id_fkey (
        code,
        nom
      ),
      reservation_credit:reservations_credits!engagements_reservation_credit_id_fkey (
        numero,
        statut
      )
    `)
    .single();

  if (error) throw error;
  return toCamelCase(data);
};

// Supprimer un engagement
export const deleteEngagement = async (id: string): Promise<void> => {
  // Vérifier s'il existe des bons de commande liés
  const { data: bonsCommande, error: checkError } = await supabase
    .from('bons_commande')
    .select('id, numero')
    .eq('engagement_id', id);
  
  if (checkError) throw checkError;
  
  if (bonsCommande && bonsCommande.length > 0) {
    throw new Error(
      `Impossible de supprimer cet engagement : ${bonsCommande.length} bon(s) de commande y sont liés. ` +
      `Veuillez d'abord supprimer ou dissocier les BC suivants : ${bonsCommande.map(bc => bc.numero).join(', ')}`
    );
  }
  
  const { error } = await supabase
    .from('engagements')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
