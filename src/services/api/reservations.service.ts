import { supabase } from '@/integrations/supabase/client';
import type { ReservationCredit, ReservationCreditFormData } from '@/types/reservation.types';

// Helper pour convertir snake_case en camelCase
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

// Helper pour convertir camelCase en snake_case
const toSnakeCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

// Helper pour nettoyer les données avant l'envoi à Supabase
const cleanData = (obj: any): any => {
  const cleaned: any = {};
  for (const key in obj) {
    const value = obj[key];
    // Convertir les chaînes vides ou undefined en null pour les champs optionnels
    if (value === '' || value === undefined) {
      cleaned[key] = null;
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

// Note: La génération du numéro est désormais gérée par l'Edge Function create-reservation

export const getReservations = async (
  exerciceId: string,
  clientId: string
): Promise<ReservationCredit[]> => {
  const { data, error } = await supabase
    .from('reservations_credits')
    .select(`
      *,
      ligne_budgetaire:lignes_budgetaires!ligne_budgetaire_id (
        libelle,
        disponible
      ),
      projet:projets!fk_reservations_credits_projet (
        id,
        code,
        nom,
        statut
      ),
      engagements:engagements!engagements_reservation_credit_id_fkey (
        id,
        numero,
        montant,
        statut
      ),
      ecritures_comptables(count)
    `)
    .eq('exercice_id', exerciceId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  // Extraire le count des écritures comptables
  const reservationsWithCount = (data || []).map(res => {
    const ecrituresCount = Array.isArray(res.ecritures_comptables) && res.ecritures_comptables[0]
      ? Number(res.ecritures_comptables[0].count) || 0
      : 0;
    const { ecritures_comptables, ...reservationData } = res;
    return {
      ...reservationData,
      ecritures_count: ecrituresCount
    };
  });
  
  return toCamelCase(reservationsWithCount);
};

export const getReservationById = async (id: string): Promise<ReservationCredit | null> => {
  const { data, error } = await supabase
    .from('reservations_credits')
    .select(`
      *,
      ligne_budgetaire:lignes_budgetaires!ligne_budgetaire_id (
        libelle,
        disponible
      ),
      projet:projets!fk_reservations_credits_projet (
        id,
        code,
        nom,
        statut
      ),
      engagements:engagements!engagements_reservation_credit_id_fkey (
        id,
        numero,
        montant,
        statut
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? toCamelCase(data) : null;
};

export const createReservation = async (
  reservation: ReservationCreditFormData,
  exerciceId: string,
  clientId: string,
  userId: string
): Promise<ReservationCredit> => {
  // Appeler l'Edge Function pour créer la réservation avec numéro atomique
  const { data, error } = await supabase.functions.invoke('create-reservation', {
    body: {
      exerciceId,
      clientId,
      ligneBudgetaireId: reservation.ligneBudgetaireId,
      montant: reservation.montant,
      objet: reservation.objet,
      beneficiaire: reservation.beneficiaire,
      projetId: reservation.projetId,
      dateExpiration: reservation.dateExpiration,
    },
  });

  if (error) throw new Error(error.message || 'Erreur lors de la création de la réservation');
  return data;
};

export const updateReservation = async (
  id: string,
  updates: Partial<ReservationCreditFormData>
): Promise<ReservationCredit> => {
  const { data, error } = await supabase
    .from('reservations_credits')
    .update(cleanData(toSnakeCase(updates)))
    .eq('id', id)
    .select(`
      *,
      ligne_budgetaire:lignes_budgetaires!ligne_budgetaire_id (
        libelle,
        disponible
      ),
      projet:projets!fk_reservations_credits_projet (
        id,
        code,
        nom,
        statut
      )
    `)
    .single();

  if (error) throw error;
  return toCamelCase(data);
};

export const utiliserReservation = async (id: string): Promise<ReservationCredit> => {
  const { data, error } = await supabase
    .from('reservations_credits')
    .update({ statut: 'utilisee' })
    .eq('id', id)
    .select(`
      *,
      ligne_budgetaire:lignes_budgetaires!ligne_budgetaire_id (
        libelle,
        disponible
      ),
      projet:projets!fk_reservations_credits_projet (
        id,
        code,
        nom,
        statut
      )
    `)
    .single();

  if (error) throw error;
  return toCamelCase(data);
};

export const annulerReservation = async (
  id: string,
  motifAnnulation: string
): Promise<ReservationCredit> => {
  const { data, error } = await supabase
    .from('reservations_credits')
    .update({ 
      statut: 'annulee',
      motif_annulation: motifAnnulation
    })
    .eq('id', id)
    .select(`
      *,
      ligne_budgetaire:lignes_budgetaires!ligne_budgetaire_id (
        libelle,
        disponible
      ),
      projet:projets!fk_reservations_credits_projet (
        id,
        code,
        nom,
        statut
      )
    `)
    .single();

  if (error) throw error;
  return toCamelCase(data);
};

export const deleteReservation = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('reservations_credits')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
