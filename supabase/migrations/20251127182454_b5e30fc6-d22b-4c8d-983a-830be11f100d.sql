-- Ajout du montant liquidé aux lignes budgétaires
-- avec recalcul automatique depuis les dépenses

-- 1. Ajouter la colonne montant_liquide
ALTER TABLE lignes_budgetaires 
ADD COLUMN montant_liquide NUMERIC DEFAULT 0 NOT NULL;

-- 2. Fonction de recalcul du montant liquidé
CREATE OR REPLACE FUNCTION public.recalculate_montant_liquide(p_ligne_budgetaire_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_montant_liquide NUMERIC;
BEGIN
  -- Calculer le total des dépenses validées, ordonnancées ou payées (= liquidées)
  SELECT COALESCE(SUM(montant), 0)
  INTO v_montant_liquide
  FROM public.depenses
  WHERE ligne_budgetaire_id = p_ligne_budgetaire_id
    AND statut IN ('validee', 'ordonnancee', 'payee');
  
  -- Mettre à jour la ligne budgétaire
  UPDATE public.lignes_budgetaires
  SET montant_liquide = v_montant_liquide,
      updated_at = now()
  WHERE id = p_ligne_budgetaire_id;
END;
$$;

-- 3. Trigger pour recalculer automatiquement après modification des dépenses
CREATE OR REPLACE FUNCTION public.update_ligne_after_depense_liquide_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Pour INSERT et UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.ligne_budgetaire_id IS NOT NULL THEN
      PERFORM recalculate_montant_liquide(NEW.ligne_budgetaire_id);
    END IF;
  END IF;
  
  -- Pour DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.ligne_budgetaire_id IS NOT NULL THEN
      PERFORM recalculate_montant_liquide(OLD.ligne_budgetaire_id);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Créer le trigger sur la table depenses
DROP TRIGGER IF EXISTS trigger_update_montant_liquide ON public.depenses;
CREATE TRIGGER trigger_update_montant_liquide
  AFTER INSERT OR UPDATE OR DELETE ON public.depenses
  FOR EACH ROW
  EXECUTE FUNCTION update_ligne_after_depense_liquide_change();

-- 5. Recalculer les montants liquidés pour toutes les lignes existantes
DO $$
DECLARE
  ligne_record RECORD;
BEGIN
  FOR ligne_record IN SELECT id FROM lignes_budgetaires LOOP
    PERFORM recalculate_montant_liquide(ligne_record.id);
  END LOOP;
END $$;

-- 6. Ajouter un commentaire pour documentation
COMMENT ON COLUMN lignes_budgetaires.montant_liquide IS 
  'Montant liquidé (somme des dépenses validées, ordonnancées ou payées) - Calculé automatiquement par trigger';

COMMENT ON FUNCTION recalculate_montant_liquide IS 
  'Recalcule le montant liquidé d''une ligne budgétaire à partir des dépenses validées, ordonnancées ou payées';