-- Fonction corrigée pour calculer le montant réservé (solde disponible uniquement)
CREATE OR REPLACE FUNCTION public.calculate_montant_reserve(p_ligne_budgetaire_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_montant_reserve NUMERIC;
BEGIN
  -- Calculer le solde disponible de chaque réservation active
  -- (montant réservé - montant déjà engagé sur cette réservation)
  SELECT COALESCE(SUM(
    r.montant - COALESCE(eng.montant_engage, 0)
  ), 0)
  INTO v_montant_reserve
  FROM public.reservations_credits r
  LEFT JOIN (
    SELECT reservation_credit_id, SUM(montant) as montant_engage
    FROM public.engagements
    WHERE statut != 'annule'
    GROUP BY reservation_credit_id
  ) eng ON r.id = eng.reservation_credit_id
  WHERE r.ligne_budgetaire_id = p_ligne_budgetaire_id
    AND r.statut = 'active';
  
  RETURN v_montant_reserve;
END;
$$;

-- Recalculer toutes les lignes budgétaires pour appliquer la correction
DO $$
DECLARE
  v_ligne RECORD;
BEGIN
  FOR v_ligne IN SELECT id FROM public.lignes_budgetaires
  LOOP
    PERFORM recalculate_ligne_disponible(v_ligne.id);
  END LOOP;
END $$;