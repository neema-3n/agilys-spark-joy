-- Corriger le trigger pour gérer l'annulation complète des factures
CREATE OR REPLACE FUNCTION public.update_bc_statut_facture()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bc_id UUID;
  v_montant_bc NUMERIC;
  v_montant_facture_total NUMERIC;
BEGIN
  -- Déterminer l'ID du BC concerné
  IF TG_OP = 'DELETE' THEN
    v_bc_id := OLD.bon_commande_id;
  ELSE
    v_bc_id := NEW.bon_commande_id;
  END IF;
  
  -- Si pas de BC lié, rien à faire
  IF v_bc_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Récupérer le montant du BC
  SELECT montant INTO v_montant_bc
  FROM bons_commande
  WHERE id = v_bc_id;
  
  -- Calculer le montant total facturé (hors factures annulées)
  SELECT COALESCE(SUM(montant_ttc), 0) INTO v_montant_facture_total
  FROM factures
  WHERE bon_commande_id = v_bc_id
    AND statut != 'annulee';
  
  -- Mettre à jour le statut du BC selon le montant facturé
  IF v_montant_facture_total >= v_montant_bc THEN
    -- BC entièrement facturé → statut 'facture'
    UPDATE bons_commande
    SET statut = 'facture',
        updated_at = now()
    WHERE id = v_bc_id
      AND statut = 'receptionne';
      
  ELSIF v_montant_facture_total > 0 AND v_montant_facture_total < v_montant_bc THEN
    -- BC partiellement facturé → statut 'receptionne'
    UPDATE bons_commande
    SET statut = 'receptionne',
        updated_at = now()
    WHERE id = v_bc_id
      AND statut = 'facture';
      
  ELSE
    -- Aucune facture active (toutes annulées) → revenir à 'receptionne'
    UPDATE bons_commande
    SET statut = 'receptionne',
        updated_at = now()
    WHERE id = v_bc_id
      AND statut = 'facture';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;