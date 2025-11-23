-- Corriger le trigger valider_paiement pour ignorer la validation lors de l'annulation
CREATE OR REPLACE FUNCTION public.valider_paiement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_montant_depense NUMERIC;
  v_total_deja_paye NUMERIC;
  v_solde_restant NUMERIC;
  v_statut_depense TEXT;
BEGIN
  -- Ne pas valider si le paiement est en train d'être annulé
  IF NEW.statut = 'annule' THEN
    RETURN NEW;
  END IF;

  -- Récupérer les infos de la dépense
  SELECT montant, statut INTO v_montant_depense, v_statut_depense
  FROM public.depenses
  WHERE id = NEW.depense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dépense introuvable';
  END IF;

  -- Vérifier que la dépense est dans un état permettant le paiement
  IF v_statut_depense NOT IN ('ordonnancee', 'payee') THEN
    RAISE EXCEPTION 'Seules les dépenses ordonnancées peuvent être payées';
  END IF;

  -- Calculer le solde restant à payer
  SELECT COALESCE(SUM(montant), 0) INTO v_total_deja_paye
  FROM public.paiements
  WHERE depense_id = NEW.depense_id
    AND statut = 'valide'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  v_solde_restant := v_montant_depense - v_total_deja_paye;

  -- Vérifier que le montant du paiement ne dépasse pas le solde
  IF NEW.montant > v_solde_restant THEN
    RAISE EXCEPTION '⚠️ Montant invalide

• Montant de la dépense : % €
• Déjà payé : % €
• Reste à payer : % €
• Vous tentez de payer : % €

💡 Réduisez le montant à % € maximum',
      v_montant_depense,
      v_total_deja_paye,
      v_solde_restant,
      NEW.montant,
      v_solde_restant;
  END IF;

  RETURN NEW;
END;
$function$;