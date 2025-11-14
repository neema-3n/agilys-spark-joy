-- Fonction unifiée pour gérer le statut de la réservation en fonction du solde
CREATE OR REPLACE FUNCTION public.update_reservation_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_montant_reservation NUMERIC;
  v_montant_engage_total NUMERIC;
  v_reservation_id UUID;
BEGIN
  -- Déterminer l'ID de la réservation (OLD pour DELETE, NEW sinon)
  IF TG_OP = 'DELETE' THEN
    v_reservation_id := OLD.reservation_credit_id;
  ELSE
    v_reservation_id := NEW.reservation_credit_id;
  END IF;
  
  -- Si pas de réservation liée, rien à faire
  IF v_reservation_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Récupérer le montant de la réservation
  SELECT montant INTO v_montant_reservation
  FROM public.reservations_credits
  WHERE id = v_reservation_id;
  
  -- Calculer le total des engagements NON annulés (tous statuts sauf annulé)
  SELECT COALESCE(SUM(montant), 0) INTO v_montant_engage_total
  FROM public.engagements
  WHERE reservation_credit_id = v_reservation_id
    AND statut != 'annule';
  
  -- Mettre à jour le statut en fonction du solde
  IF v_montant_engage_total >= v_montant_reservation THEN
    -- Solde = 0 → statut "utilisee"
    UPDATE public.reservations_credits
    SET statut = 'utilisee',
        updated_at = now()
    WHERE id = v_reservation_id
      AND statut != 'utilisee';
  ELSE
    -- Solde > 0 → statut "active"
    UPDATE public.reservations_credits
    SET statut = 'active',
        updated_at = now()
    WHERE id = v_reservation_id
      AND statut != 'active';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Supprimer les anciens triggers
DROP TRIGGER IF EXISTS trigger_mark_reservation_as_used ON public.engagements;
DROP TRIGGER IF EXISTS trigger_reactivate_reservation ON public.engagements;

-- Créer un seul trigger pour tous les changements d'engagements
CREATE TRIGGER trigger_update_reservation_status
  AFTER INSERT OR UPDATE OR DELETE ON public.engagements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reservation_status();