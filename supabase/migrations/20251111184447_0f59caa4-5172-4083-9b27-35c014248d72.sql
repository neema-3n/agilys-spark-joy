-- Ajouter la colonne enveloppe_id à la table lignes_budgetaires
ALTER TABLE public.lignes_budgetaires
ADD COLUMN enveloppe_id uuid REFERENCES public.enveloppes(id) ON DELETE SET NULL;

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX idx_lignes_budgetaires_enveloppe ON public.lignes_budgetaires(enveloppe_id);

-- Fonction pour valider que le total des lignes ne dépasse pas le montant alloué de l'enveloppe
CREATE OR REPLACE FUNCTION public.check_enveloppe_budget_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_lignes numeric;
  v_montant_alloue numeric;
  v_enveloppe_id uuid;
BEGIN
  -- Déterminer l'enveloppe_id concernée
  IF TG_OP = 'DELETE' THEN
    v_enveloppe_id := OLD.enveloppe_id;
  ELSE
    v_enveloppe_id := NEW.enveloppe_id;
  END IF;

  -- Si pas d'enveloppe, pas de validation nécessaire
  IF v_enveloppe_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculer le total des lignes budgétaires pour cette enveloppe
  -- On utilise montant_modifie s'il existe, sinon montant_initial
  SELECT COALESCE(SUM(CASE 
    WHEN montant_modifie > 0 THEN montant_modifie 
    ELSE montant_initial 
  END), 0)
  INTO v_total_lignes
  FROM public.lignes_budgetaires
  WHERE enveloppe_id = v_enveloppe_id
    AND statut = 'actif'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Ajouter le montant de la ligne en cours d'insertion/modification
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_total_lignes := v_total_lignes + CASE 
      WHEN NEW.montant_modifie > 0 THEN NEW.montant_modifie 
      ELSE NEW.montant_initial 
    END;
  END IF;

  -- Récupérer le montant alloué de l'enveloppe
  SELECT montant_alloue
  INTO v_montant_alloue
  FROM public.enveloppes
  WHERE id = v_enveloppe_id;

  -- Vérifier que le total ne dépasse pas le montant alloué
  IF v_total_lignes > v_montant_alloue THEN
    RAISE EXCEPTION 'Le total des lignes budgétaires (%) dépasse le montant alloué de l''enveloppe (%)', 
      v_total_lignes, v_montant_alloue;
  END IF;

  RETURN NEW;
END;
$$;

-- Créer le trigger sur les opérations INSERT et UPDATE
CREATE TRIGGER validate_enveloppe_budget_before_write
  BEFORE INSERT OR UPDATE ON public.lignes_budgetaires
  FOR EACH ROW
  EXECUTE FUNCTION public.check_enveloppe_budget_limit();