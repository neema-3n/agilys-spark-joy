-- Remplacer la fonction mark_reservation_as_used pour une gestion intelligente
CREATE OR REPLACE FUNCTION public.mark_reservation_as_used()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_montant_reservation NUMERIC;
  v_montant_engage_total NUMERIC;
BEGIN
  -- Si un engagement est validé avec une réservation liée
  IF NEW.reservation_credit_id IS NOT NULL AND NEW.statut = 'valide' 
     AND (TG_OP = 'INSERT' OR OLD.statut != 'valide') THEN
    
    -- Récupérer le montant de la réservation
    SELECT montant INTO v_montant_reservation
    FROM public.reservations_credits
    WHERE id = NEW.reservation_credit_id;
    
    -- Calculer le total des engagements validés (non annulés)
    SELECT COALESCE(SUM(montant), 0) INTO v_montant_engage_total
    FROM public.engagements
    WHERE reservation_credit_id = NEW.reservation_credit_id
      AND statut != 'annule';
    
    -- Si le montant disponible atteint 0, marquer comme utilisée
    IF v_montant_engage_total >= v_montant_reservation THEN
      UPDATE public.reservations_credits
      SET statut = 'utilisee',
          updated_at = now()
      WHERE id = NEW.reservation_credit_id
        AND statut = 'active';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Créer la fonction pour réactiver une réservation si du crédit redevient disponible
CREATE OR REPLACE FUNCTION public.reactivate_reservation_if_available()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_montant_reservation NUMERIC;
  v_montant_engage_total NUMERIC;
BEGIN
  -- Si un engagement est annulé et qu'il était lié à une réservation
  IF OLD.reservation_credit_id IS NOT NULL AND NEW.statut = 'annule' 
     AND OLD.statut != 'annule' THEN
    
    -- Récupérer le montant de la réservation
    SELECT montant INTO v_montant_reservation
    FROM public.reservations_credits
    WHERE id = OLD.reservation_credit_id;
    
    -- Recalculer le total des engagements actifs
    SELECT COALESCE(SUM(montant), 0) INTO v_montant_engage_total
    FROM public.engagements
    WHERE reservation_credit_id = OLD.reservation_credit_id
      AND statut != 'annule';
    
    -- Si du crédit redevient disponible, remettre à 'active'
    IF v_montant_engage_total < v_montant_reservation THEN
      UPDATE public.reservations_credits
      SET statut = 'active',
          updated_at = now()
      WHERE id = OLD.reservation_credit_id
        AND statut = 'utilisee';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Vérifier que le trigger mark_reservation_as_used existe
DROP TRIGGER IF EXISTS trigger_mark_reservation_as_used ON public.engagements;

CREATE TRIGGER trigger_mark_reservation_as_used
  AFTER INSERT OR UPDATE ON public.engagements
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_reservation_as_used();

-- Créer le trigger pour réactiver les réservations
DROP TRIGGER IF EXISTS trigger_reactivate_reservation ON public.engagements;

CREATE TRIGGER trigger_reactivate_reservation
  AFTER UPDATE ON public.engagements
  FOR EACH ROW
  EXECUTE FUNCTION public.reactivate_reservation_if_available();