-- Supprimer l'ancienne contrainte en double sur projet_id
ALTER TABLE public.reservations_credits
DROP CONSTRAINT IF EXISTS reservations_credits_projet_id_fkey;