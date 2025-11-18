-- Ajouter la colonne montant_reserve à la table lignes_budgetaires
ALTER TABLE public.lignes_budgetaires 
ADD COLUMN montant_reserve NUMERIC NOT NULL DEFAULT 0;

-- Créer une fonction pour recalculer le montant_reserve d'une ligne budgétaire
CREATE OR REPLACE FUNCTION public.recalculate_montant_reserve(p_ligne_budgetaire_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_montant_reserve NUMERIC;
BEGIN
  -- Utiliser la fonction existante pour calculer le montant réservé
  v_montant_reserve := calculate_montant_reserve(p_ligne_budgetaire_id);
  
  -- Mettre à jour la ligne budgétaire
  UPDATE public.lignes_budgetaires
  SET montant_reserve = v_montant_reserve,
      updated_at = now()
  WHERE id = p_ligne_budgetaire_id;
END;
$$;

-- Modifier la fonction recalculate_ligne_disponible pour utiliser la colonne montant_reserve
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
  -- Récupérer les valeurs de la ligne budgétaire
  SELECT 
    CASE WHEN montant_modifie > 0 THEN montant_modifie ELSE montant_initial END,
    montant_engage,
    montant_reserve
  INTO v_montant_modifie, v_montant_engage, v_montant_reserve
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

-- Trigger pour mettre à jour montant_reserve après modification de reservations_credits
CREATE OR REPLACE FUNCTION public.update_ligne_after_reservation_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Pour INSERT et UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- Recalculer montant_reserve
    PERFORM recalculate_montant_reserve(NEW.ligne_budgetaire_id);
    -- Recalculer disponible
    PERFORM recalculate_ligne_disponible(NEW.ligne_budgetaire_id);
  END IF;
  
  -- Pour DELETE
  IF TG_OP = 'DELETE' THEN
    -- Recalculer montant_reserve
    PERFORM recalculate_montant_reserve(OLD.ligne_budgetaire_id);
    -- Recalculer disponible
    PERFORM recalculate_ligne_disponible(OLD.ligne_budgetaire_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Modifier le trigger sur engagements pour aussi recalculer montant_reserve
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
    -- Si l'engagement est lié à une réservation, recalculer montant_reserve
    IF NEW.reservation_credit_id IS NOT NULL THEN
      PERFORM recalculate_montant_reserve(NEW.ligne_budgetaire_id);
    END IF;
    -- Recalculer disponible
    PERFORM recalculate_ligne_disponible(NEW.ligne_budgetaire_id);
  END IF;
  
  -- Pour DELETE
  IF TG_OP = 'DELETE' THEN
    -- Recalculer montant_engage
    PERFORM recalculate_montant_engage(OLD.ligne_budgetaire_id);
    -- Si l'engagement était lié à une réservation, recalculer montant_reserve
    IF OLD.reservation_credit_id IS NOT NULL THEN
      PERFORM recalculate_montant_reserve(OLD.ligne_budgetaire_id);
    END IF;
    -- Recalculer disponible
    PERFORM recalculate_ligne_disponible(OLD.ligne_budgetaire_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Initialiser les valeurs de montant_reserve pour toutes les lignes existantes
DO $$
DECLARE
  v_ligne RECORD;
BEGIN
  FOR v_ligne IN SELECT id FROM public.lignes_budgetaires
  LOOP
    PERFORM recalculate_montant_reserve(v_ligne.id);
    PERFORM recalculate_ligne_disponible(v_ligne.id);
  END LOOP;
END $$;