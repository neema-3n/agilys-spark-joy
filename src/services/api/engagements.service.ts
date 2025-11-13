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

// Générer un numéro d'engagement unique
export const generateNumeroEngagement = async (
  exerciceId: string,
  clientId: string
): Promise<string> => {
  const { data: exercice } = await supabase
    .from('exercices')
    .select('code')
    .eq('id', exerciceId)
    .single();

  const { count } = await supabase
    .from('engagements')
    .select('*', { count: 'exact', head: true })
    .eq('exercice_id', exerciceId)
    .eq('client_id', clientId);

  const nextNumber = (count || 0) + 1;
  const year = exercice?.code || new Date().getFullYear();
  
  return `ENG/${year}/${nextNumber.toString().padStart(3, '0')}`;
};

// Récupérer tous les engagements
export const getEngagements = async (
  exerciceId: string,
  clientId: string
): Promise<Engagement[]> => {
  const { data, error } = await supabase
    .from('engagements')
    .select(`
      *,
      ligne_budgetaire:lignes_budgetaires!ligne_budgetaire_id (
        libelle,
        disponible
      ),
      fournisseur:fournisseurs!fournisseur_id (
        nom,
        code
      ),
      projet:projets!projet_id (
        code,
        nom
      ),
      reservation_credit:reservations_credits!reservation_credit_id (
        numero,
        statut
      )
    `)
    .eq('exercice_id', exerciceId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return toCamelCase(data || []);
};

// Créer un engagement
export const createEngagement = async (
  engagement: EngagementFormData,
  exerciceId: string,
  clientId: string,
  userId: string
): Promise<Engagement> => {
  const numero = await generateNumeroEngagement(exerciceId, clientId);
  
  const cleanedData = cleanData({
    ...toSnakeCase(engagement),
    numero,
    exercice_id: exerciceId,
    client_id: clientId,
    created_by: userId,
    statut: 'brouillon',
  });

  const { data, error } = await supabase
    .from('engagements')
    .insert(cleanedData)
    .select(`
      *,
      ligne_budgetaire:lignes_budgetaires!ligne_budgetaire_id (
        libelle,
        disponible
      ),
      fournisseur:fournisseurs!fournisseur_id (
        nom,
        code
      ),
      projet:projets!projet_id (
        code,
        nom
      ),
      reservation_credit:reservations_credits!reservation_credit_id (
        numero,
        statut
      )
    `)
    .single();

  if (error) throw error;
  return toCamelCase(data);
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

  // Utiliser les données du formulaire en priorité, avec fallback sur la réservation
  const engagementData: EngagementFormData = {
    ligneBudgetaireId: additionalData.ligneBudgetaireId || reservation.ligne_budgetaire_id,
    objet: additionalData.objet || reservation.objet,
    montant: additionalData.montant !== undefined ? additionalData.montant : Number(reservation.montant),
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
      ligne_budgetaire:lignes_budgetaires!ligne_budgetaire_id (
        libelle,
        disponible
      ),
      fournisseur:fournisseurs!fournisseur_id (
        nom,
        code
      ),
      projet:projets!projet_id (
        code,
        nom
      ),
      reservation_credit:reservations_credits!reservation_credit_id (
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
      ligne_budgetaire:lignes_budgetaires!ligne_budgetaire_id (
        libelle,
        disponible
      ),
      fournisseur:fournisseurs!fournisseur_id (
        nom,
        code
      ),
      projet:projets!projet_id (
        code,
        nom
      ),
      reservation_credit:reservations_credits!reservation_credit_id (
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
  const { data, error } = await supabase
    .from('engagements')
    .update({
      statut: 'annule',
      motif_annulation: motifAnnulation,
    })
    .eq('id', id)
    .select(`
      *,
      ligne_budgetaire:lignes_budgetaires!ligne_budgetaire_id (
        libelle,
        disponible
      ),
      fournisseur:fournisseurs!fournisseur_id (
        nom,
        code
      ),
      projet:projets!projet_id (
        code,
        nom
      ),
      reservation_credit:reservations_credits!reservation_credit_id (
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
  const { error } = await supabase
    .from('engagements')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
