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

// Générer un numéro de réservation unique
const generateNumeroReservation = async (exerciceId: string, clientId: string): Promise<string> => {
  const { data, error } = await supabase
    .from('reservations_credits')
    .select('numero')
    .eq('exercice_id', exerciceId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  const lastNumero = data && data.length > 0 ? data[0].numero : null;
  const lastNumber = lastNumero ? parseInt(lastNumero.split('-')[1]) : 0;
  const newNumber = lastNumber + 1;

  return `RES-${newNumber.toString().padStart(5, '0')}`;
};

export const getReservations = async (
  exerciceId: string,
  clientId: string
): Promise<ReservationCredit[]> => {
  const { data, error } = await supabase
    .from('reservations_credits')
    .select(`
      *,
      lignes_budgetaires:ligne_budgetaire_id (
        libelle,
        disponible
      )
    `)
    .eq('exercice_id', exerciceId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return toCamelCase(data);
};

export const createReservation = async (
  reservation: ReservationCreditFormData,
  exerciceId: string,
  clientId: string,
  userId: string
): Promise<ReservationCredit> => {
  // Générer le numéro de réservation
  const numero = await generateNumeroReservation(exerciceId, clientId);

  const newReservation = {
    ...toSnakeCase(reservation),
    numero,
    exercice_id: exerciceId,
    client_id: clientId,
    created_by: userId,
    statut: 'active'
  };

  const { data, error } = await supabase
    .from('reservations_credits')
    .insert(newReservation)
    .select(`
      *,
      lignes_budgetaires:ligne_budgetaire_id (
        libelle,
        disponible
      )
    `)
    .single();

  if (error) throw error;
  return toCamelCase(data);
};

export const updateReservation = async (
  id: string,
  updates: Partial<ReservationCreditFormData>
): Promise<ReservationCredit> => {
  const { data, error } = await supabase
    .from('reservations_credits')
    .update(toSnakeCase(updates))
    .eq('id', id)
    .select(`
      *,
      lignes_budgetaires:ligne_budgetaire_id (
        libelle,
        disponible
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
      lignes_budgetaires:ligne_budgetaire_id (
        libelle,
        disponible
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
      lignes_budgetaires:ligne_budgetaire_id (
        libelle,
        disponible
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
