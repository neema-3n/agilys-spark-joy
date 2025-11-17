-- Fonction de validation des dates pour les bons de commande
CREATE OR REPLACE FUNCTION public.check_bon_commande_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que la date de livraison prévue est >= date de commande
  IF NEW.date_livraison_prevue IS NOT NULL 
     AND NEW.date_livraison_prevue < NEW.date_commande THEN
    RAISE EXCEPTION 'La date de livraison prévue (%) ne peut pas être antérieure à la date de commande (%)',
      NEW.date_livraison_prevue, NEW.date_commande;
  END IF;
  
  -- Vérifier que la date de livraison réelle est >= date de commande
  IF NEW.date_livraison_reelle IS NOT NULL 
     AND NEW.date_livraison_reelle < NEW.date_commande THEN
    RAISE EXCEPTION 'La date de livraison réelle (%) ne peut pas être antérieure à la date de commande (%)',
      NEW.date_livraison_reelle, NEW.date_commande;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger pour valider les dates avant insertion/modification
CREATE TRIGGER validate_bon_commande_dates
  BEFORE INSERT OR UPDATE ON public.bons_commande
  FOR EACH ROW
  EXECUTE FUNCTION public.check_bon_commande_dates();