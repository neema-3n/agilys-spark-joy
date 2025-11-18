-- Fixer le search_path de la fonction check_facture_montant_vs_bc pour la sécurité
CREATE OR REPLACE FUNCTION check_facture_montant_vs_bc()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_montant_bc NUMERIC;
  v_montant_facture_total NUMERIC;
BEGIN
  -- Si la facture n'est pas liée à un BC, pas de vérification
  IF NEW.bon_commande_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Si la facture est annulée, pas de vérification
  IF NEW.statut = 'annulee' THEN
    RETURN NEW;
  END IF;

  -- Récupérer le montant du BC
  SELECT montant INTO v_montant_bc
  FROM bons_commande
  WHERE id = NEW.bon_commande_id;

  -- Calculer le total facturé (en excluant les factures annulées et la facture actuelle en UPDATE)
  SELECT COALESCE(SUM(montant_ttc), 0) INTO v_montant_facture_total
  FROM factures
  WHERE bon_commande_id = NEW.bon_commande_id
    AND statut != 'annulee'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Ajouter le montant de la nouvelle facture
  v_montant_facture_total := v_montant_facture_total + NEW.montant_ttc;

  -- Vérifier que le total ne dépasse pas
  IF v_montant_facture_total > v_montant_bc THEN
    RAISE EXCEPTION 'Le montant total des factures (%) dépasse le montant du bon de commande (%)', 
      v_montant_facture_total, v_montant_bc;
  END IF;

  RETURN NEW;
END;
$$;