-- Fonction pour calculer le montant réservé d'une ligne budgétaire
CREATE OR REPLACE FUNCTION public.calculate_montant_reserve(p_ligne_budgetaire_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_montant_reserve NUMERIC;
BEGIN
  SELECT COALESCE(SUM(montant), 0)
  INTO v_montant_reserve
  FROM public.reservations_credits
  WHERE ligne_budgetaire_id = p_ligne_budgetaire_id
    AND statut = 'active';
  
  RETURN v_montant_reserve;
END;
$$;

-- Fonction pour recalculer le disponible d'une ligne budgétaire
CREATE OR REPLACE FUNCTION public.recalculate_ligne_disponible(p_ligne_budgetaire_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_montant_modifie NUMERIC;
  v_montant_engage NUMERIC;
  v_montant_reserve NUMERIC;
  v_disponible NUMERIC;
BEGIN
  -- Récupérer le montant modifié (ou initial si pas de modification)
  SELECT CASE 
    WHEN montant_modifie > 0 THEN montant_modifie 
    ELSE montant_initial 
  END
  INTO v_montant_modifie
  FROM public.lignes_budgetaires
  WHERE id = p_ligne_budgetaire_id;
  
  -- Calculer le montant réservé
  v_montant_reserve := calculate_montant_reserve(p_ligne_budgetaire_id);
  
  -- Récupérer le montant engagé (déjà à jour via trigger)
  SELECT montant_engage INTO v_montant_engage
  FROM public.lignes_budgetaires
  WHERE id = p_ligne_budgetaire_id;
  
  -- Calculer le disponible
  v_disponible := v_montant_modifie - v_montant_engage - v_montant_reserve;
  
  -- Mettre à jour la ligne budgétaire
  UPDATE public.lignes_budgetaires
  SET disponible = v_disponible,
      updated_at = now()
  WHERE id = p_ligne_budgetaire_id;
END;
$$;

-- Fonction pour recalculer le montant_engage d'une ligne budgétaire
CREATE OR REPLACE FUNCTION public.recalculate_montant_engage(p_ligne_budgetaire_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_montant_engage NUMERIC;
BEGIN
  -- Calculer le total des engagements non annulés
  SELECT COALESCE(SUM(montant), 0)
  INTO v_montant_engage
  FROM public.engagements
  WHERE ligne_budgetaire_id = p_ligne_budgetaire_id
    AND statut != 'annule';
  
  -- Mettre à jour la ligne budgétaire
  UPDATE public.lignes_budgetaires
  SET montant_engage = v_montant_engage,
      updated_at = now()
  WHERE id = p_ligne_budgetaire_id;
END;
$$;

-- Fonction pour recalculer le montant_paye d'une ligne budgétaire
CREATE OR REPLACE FUNCTION public.recalculate_montant_paye(p_ligne_budgetaire_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_montant_paye NUMERIC;
BEGIN
  -- Calculer le total des factures payées
  SELECT COALESCE(SUM(montant_ttc), 0)
  INTO v_montant_paye
  FROM public.factures
  WHERE ligne_budgetaire_id = p_ligne_budgetaire_id
    AND statut = 'payee';
  
  -- Mettre à jour la ligne budgétaire
  UPDATE public.lignes_budgetaires
  SET montant_paye = v_montant_paye,
      updated_at = now()
  WHERE id = p_ligne_budgetaire_id;
END;
$$;

-- TRIGGER 1: Mettre à jour montant_engage et disponible quand un engagement change
CREATE OR REPLACE FUNCTION public.update_ligne_after_engagement_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Pour INSERT et UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- Recalculer montant_engage
    PERFORM recalculate_montant_engage(NEW.ligne_budgetaire_id);
    -- Recalculer disponible
    PERFORM recalculate_ligne_disponible(NEW.ligne_budgetaire_id);
  END IF;
  
  -- Pour DELETE
  IF TG_OP = 'DELETE' THEN
    -- Recalculer montant_engage
    PERFORM recalculate_montant_engage(OLD.ligne_budgetaire_id);
    -- Recalculer disponible
    PERFORM recalculate_ligne_disponible(OLD.ligne_budgetaire_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_ligne_after_engagement ON public.engagements;
CREATE TRIGGER trigger_update_ligne_after_engagement
AFTER INSERT OR UPDATE OR DELETE ON public.engagements
FOR EACH ROW
EXECUTE FUNCTION public.update_ligne_after_engagement_change();

-- TRIGGER 2: Mettre à jour montant_paye et disponible quand une facture change
CREATE OR REPLACE FUNCTION public.update_ligne_after_facture_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Pour INSERT et UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.ligne_budgetaire_id IS NOT NULL THEN
      -- Recalculer montant_paye
      PERFORM recalculate_montant_paye(NEW.ligne_budgetaire_id);
      -- Recalculer disponible
      PERFORM recalculate_ligne_disponible(NEW.ligne_budgetaire_id);
    END IF;
  END IF;
  
  -- Pour DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.ligne_budgetaire_id IS NOT NULL THEN
      -- Recalculer montant_paye
      PERFORM recalculate_montant_paye(OLD.ligne_budgetaire_id);
      -- Recalculer disponible
      PERFORM recalculate_ligne_disponible(OLD.ligne_budgetaire_id);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_ligne_after_facture ON public.factures;
CREATE TRIGGER trigger_update_ligne_after_facture
AFTER INSERT OR UPDATE OR DELETE ON public.factures
FOR EACH ROW
EXECUTE FUNCTION public.update_ligne_after_facture_change();

-- TRIGGER 3: Mettre à jour disponible quand une réservation change
CREATE OR REPLACE FUNCTION public.update_ligne_after_reservation_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Pour INSERT et UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- Recalculer disponible
    PERFORM recalculate_ligne_disponible(NEW.ligne_budgetaire_id);
  END IF;
  
  -- Pour DELETE
  IF TG_OP = 'DELETE' THEN
    -- Recalculer disponible
    PERFORM recalculate_ligne_disponible(OLD.ligne_budgetaire_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_ligne_after_reservation ON public.reservations_credits;
CREATE TRIGGER trigger_update_ligne_after_reservation
AFTER INSERT OR UPDATE OR DELETE ON public.reservations_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_ligne_after_reservation_change();

-- TRIGGER 4: Mettre à jour disponible quand une ligne budgétaire est modifiée directement
CREATE OR REPLACE FUNCTION public.update_disponible_after_ligne_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Si montant_initial ou montant_modifie change, recalculer le disponible
  IF OLD.montant_initial != NEW.montant_initial OR OLD.montant_modifie != NEW.montant_modifie THEN
    PERFORM recalculate_ligne_disponible(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_disponible_after_ligne ON public.lignes_budgetaires;
CREATE TRIGGER trigger_update_disponible_after_ligne
AFTER UPDATE ON public.lignes_budgetaires
FOR EACH ROW
EXECUTE FUNCTION public.update_disponible_after_ligne_change();

-- Script de recalcul des données existantes
DO $$
DECLARE
  v_ligne RECORD;
BEGIN
  RAISE NOTICE 'Début du recalcul de toutes les lignes budgétaires...';
  
  FOR v_ligne IN SELECT id FROM public.lignes_budgetaires
  LOOP
    -- Recalculer montant_engage
    PERFORM recalculate_montant_engage(v_ligne.id);
    -- Recalculer montant_paye
    PERFORM recalculate_montant_paye(v_ligne.id);
    -- Recalculer disponible
    PERFORM recalculate_ligne_disponible(v_ligne.id);
  END LOOP;
  
  RAISE NOTICE 'Recalcul terminé avec succès.';
END $$;