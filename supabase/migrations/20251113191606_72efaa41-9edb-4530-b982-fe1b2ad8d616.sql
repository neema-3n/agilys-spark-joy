-- Fonction de validation du montant d'engagement par rapport à la réservation
CREATE OR REPLACE FUNCTION public.check_engagement_montant_vs_reservation()
RETURNS TRIGGER AS $$
DECLARE
  v_montant_reservation NUMERIC;
  v_montant_deja_engage NUMERIC;
BEGIN
  -- Si l'engagement n'est pas lié à une réservation, pas de vérification
  IF NEW.reservation_credit_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Récupérer le montant de la réservation
  SELECT montant INTO v_montant_reservation
  FROM public.reservations_credits
  WHERE id = NEW.reservation_credit_id;

  -- Si la réservation n'existe pas, laisser PostgreSQL gérer l'erreur de FK
  IF v_montant_reservation IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculer le montant déjà engagé (en excluant l'engagement actuel si UPDATE et les engagements annulés)
  SELECT COALESCE(SUM(montant), 0) INTO v_montant_deja_engage
  FROM public.engagements
  WHERE reservation_credit_id = NEW.reservation_credit_id
    AND statut != 'annule'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Vérifier que le total ne dépasse pas le montant de la réservation
  IF (v_montant_deja_engage + NEW.montant) > v_montant_reservation THEN
    RAISE EXCEPTION 'Le montant total des engagements (%) dépasse le montant de la réservation (%)', 
      (v_montant_deja_engage + NEW.montant), v_montant_reservation;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Créer le trigger sur la table engagements
DROP TRIGGER IF EXISTS validate_engagement_montant ON public.engagements;
CREATE TRIGGER validate_engagement_montant
  BEFORE INSERT OR UPDATE ON public.engagements
  FOR EACH ROW
  EXECUTE FUNCTION public.check_engagement_montant_vs_reservation();