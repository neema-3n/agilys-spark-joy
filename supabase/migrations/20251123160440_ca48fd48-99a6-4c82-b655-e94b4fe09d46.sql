-- Migration: Ajout de Foreign Keys sur ecritures_comptables
-- Ajout des colonnes FK pour permettre les jointures automatiques avec Supabase

-- 1. Ajout des 6 colonnes FK (nullable avec CASCADE)
ALTER TABLE public.ecritures_comptables
  ADD COLUMN engagement_id UUID REFERENCES public.engagements(id) ON DELETE CASCADE,
  ADD COLUMN reservation_id UUID REFERENCES public.reservations_credits(id) ON DELETE CASCADE,
  ADD COLUMN bon_commande_id UUID REFERENCES public.bons_commande(id) ON DELETE CASCADE,
  ADD COLUMN facture_id UUID REFERENCES public.factures(id) ON DELETE CASCADE,
  ADD COLUMN depense_id UUID REFERENCES public.depenses(id) ON DELETE CASCADE,
  ADD COLUMN paiement_id UUID REFERENCES public.paiements(id) ON DELETE CASCADE;

-- 2. Migration des données existantes
-- Popule les nouvelles colonnes FK à partir de source_id + type_operation

UPDATE public.ecritures_comptables
SET engagement_id = source_id::uuid
WHERE type_operation = 'engagement';

UPDATE public.ecritures_comptables
SET reservation_id = source_id::uuid
WHERE type_operation = 'reservation';

UPDATE public.ecritures_comptables
SET bon_commande_id = source_id::uuid
WHERE type_operation = 'bon_commande';

UPDATE public.ecritures_comptables
SET facture_id = source_id::uuid
WHERE type_operation = 'facture';

UPDATE public.ecritures_comptables
SET depense_id = source_id::uuid
WHERE type_operation = 'depense';

UPDATE public.ecritures_comptables
SET paiement_id = source_id::uuid
WHERE type_operation = 'paiement';

-- 3. Création de la fonction de synchronisation automatique
CREATE OR REPLACE FUNCTION public.sync_ecriture_foreign_keys()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Réinitialiser toutes les FK
  NEW.engagement_id := NULL;
  NEW.reservation_id := NULL;
  NEW.bon_commande_id := NULL;
  NEW.facture_id := NULL;
  NEW.depense_id := NULL;
  NEW.paiement_id := NULL;
  
  -- Assigner la bonne FK selon le type d'opération
  CASE NEW.type_operation
    WHEN 'engagement' THEN
      NEW.engagement_id := NEW.source_id;
    WHEN 'reservation' THEN
      NEW.reservation_id := NEW.source_id;
    WHEN 'bon_commande' THEN
      NEW.bon_commande_id := NEW.source_id;
    WHEN 'facture' THEN
      NEW.facture_id := NEW.source_id;
    WHEN 'depense' THEN
      NEW.depense_id := NEW.source_id;
    WHEN 'paiement' THEN
      NEW.paiement_id := NEW.source_id;
  END CASE;
  
  RETURN NEW;
END;
$$;

-- 4. Création du trigger
CREATE TRIGGER sync_ecriture_fks_trigger
  BEFORE INSERT OR UPDATE ON public.ecritures_comptables
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_ecriture_foreign_keys();

-- 5. Création d'index partiels pour optimiser les performances des jointures
CREATE INDEX idx_ecritures_engagement_id ON public.ecritures_comptables(engagement_id) WHERE engagement_id IS NOT NULL;
CREATE INDEX idx_ecritures_reservation_id ON public.ecritures_comptables(reservation_id) WHERE reservation_id IS NOT NULL;
CREATE INDEX idx_ecritures_bon_commande_id ON public.ecritures_comptables(bon_commande_id) WHERE bon_commande_id IS NOT NULL;
CREATE INDEX idx_ecritures_facture_id ON public.ecritures_comptables(facture_id) WHERE facture_id IS NOT NULL;
CREATE INDEX idx_ecritures_depense_id ON public.ecritures_comptables(depense_id) WHERE depense_id IS NOT NULL;
CREATE INDEX idx_ecritures_paiement_id ON public.ecritures_comptables(paiement_id) WHERE paiement_id IS NOT NULL;