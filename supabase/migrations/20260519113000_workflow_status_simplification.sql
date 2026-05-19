-- Remap legacy statuses to the simplified workflow model
UPDATE public.reservations_credits
SET statut = 'convertie'
WHERE statut = 'utilisee';

UPDATE public.bons_commande
SET statut = 'emis'
WHERE statut IN ('valide', 'en_cours');

UPDATE public.bons_commande
SET statut = 'receptionne'
WHERE statut = 'facture';

UPDATE public.factures
SET statut = 'soldee'
WHERE statut = 'payee';

UPDATE public.depenses
SET statut = 'validee'
WHERE statut = 'ordonnancee';

-- Refresh status constraints
ALTER TABLE public.reservations_credits DROP CONSTRAINT IF EXISTS reservations_credits_statut_check;
ALTER TABLE public.reservations_credits DROP CONSTRAINT IF EXISTS check_statut;
ALTER TABLE public.reservations_credits
  ADD CONSTRAINT reservations_credits_statut_check
  CHECK (statut IN ('brouillon', 'active', 'convertie', 'annulee', 'expiree'));

ALTER TABLE public.engagements DROP CONSTRAINT IF EXISTS engagements_statut_check;
ALTER TABLE public.engagements DROP CONSTRAINT IF EXISTS check_statut;
ALTER TABLE public.engagements
  ADD CONSTRAINT engagements_statut_check
  CHECK (statut IN ('brouillon', 'valide', 'annule'));

ALTER TABLE public.bons_commande DROP CONSTRAINT IF EXISTS bons_commande_statut_check;
ALTER TABLE public.bons_commande
  ADD CONSTRAINT bons_commande_statut_check
  CHECK (statut IN ('brouillon', 'emis', 'receptionne', 'annule'));

ALTER TABLE public.factures DROP CONSTRAINT IF EXISTS factures_statut_check;
ALTER TABLE public.factures
  ADD CONSTRAINT factures_statut_check
  CHECK (statut IN ('brouillon', 'validee', 'soldee', 'annulee'));

ALTER TABLE public.depenses DROP CONSTRAINT IF EXISTS depenses_statut_check;
ALTER TABLE public.depenses
  ADD CONSTRAINT depenses_statut_check
  CHECK (statut IN ('brouillon', 'validee', 'payee', 'annulee'));

CREATE OR REPLACE FUNCTION public.update_reservation_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_montant_reservation NUMERIC;
  v_montant_engage_total NUMERIC;
  v_reservation_id UUID;
  v_statut_actuel TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_reservation_id := OLD.reservation_credit_id;
  ELSE
    v_reservation_id := NEW.reservation_credit_id;
  END IF;

  IF v_reservation_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT montant, statut
    INTO v_montant_reservation, v_statut_actuel
  FROM public.reservations_credits
  WHERE id = v_reservation_id;

  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_statut_actuel IN ('brouillon', 'annulee', 'expiree') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(montant), 0)
    INTO v_montant_engage_total
  FROM public.engagements
  WHERE reservation_credit_id = v_reservation_id
    AND statut != 'annule';

  IF v_montant_engage_total >= v_montant_reservation THEN
    UPDATE public.reservations_credits
    SET statut = 'convertie',
        updated_at = now()
    WHERE id = v_reservation_id
      AND statut != 'convertie';
  ELSE
    UPDATE public.reservations_credits
    SET statut = 'active',
        updated_at = now()
    WHERE id = v_reservation_id
      AND statut = 'convertie';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_bc_statut_facture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_bc_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_bc_id := OLD.bon_commande_id;
  ELSE
    v_bc_id := NEW.bon_commande_id;
  END IF;

  IF v_bc_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.bons_commande
  SET statut = 'receptionne',
      updated_at = now()
  WHERE id = v_bc_id
    AND statut = 'facture';

  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculer_montant_paye_depense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_depense_id UUID;
  v_total_paye NUMERIC;
  v_montant_depense NUMERIC;
  v_nouveau_statut TEXT;
  v_statut_actuel TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_depense_id := OLD.depense_id;
  ELSE
    v_depense_id := NEW.depense_id;
  END IF;

  IF v_depense_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT montant, statut INTO v_montant_depense, v_statut_actuel
  FROM public.depenses
  WHERE id = v_depense_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM(montant), 0) INTO v_total_paye
  FROM public.paiements
  WHERE depense_id = v_depense_id
    AND statut = 'valide';

  IF v_total_paye >= v_montant_depense THEN
    v_nouveau_statut := 'payee';
  ELSE
    IF v_statut_actuel = 'payee' AND v_total_paye < v_montant_depense THEN
      v_nouveau_statut := 'validee';
    ELSE
      v_nouveau_statut := v_statut_actuel;
    END IF;
  END IF;

  UPDATE public.depenses
  SET montant_paye = v_total_paye,
      statut = v_nouveau_statut,
      updated_at = now()
  WHERE id = v_depense_id;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.valider_paiement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_montant_depense NUMERIC;
  v_total_deja_paye NUMERIC;
  v_solde_restant NUMERIC;
  v_statut_depense TEXT;
BEGIN
  IF NEW.depense_id IS NULL THEN
    IF NEW.engagement_id IS NULL AND NEW.ligne_budgetaire_id IS NULL THEN
      RAISE EXCEPTION 'Un paiement direct doit être rattaché à un engagement ou à une ligne budgétaire';
    END IF;
    RETURN NEW;
  END IF;

  SELECT montant, statut INTO v_montant_depense, v_statut_depense
  FROM public.depenses
  WHERE id = NEW.depense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dépense introuvable';
  END IF;

  IF v_statut_depense NOT IN ('validee', 'payee') THEN
    RAISE EXCEPTION 'Seules les dépenses validées peuvent être payées';
  END IF;

  SELECT COALESCE(SUM(montant), 0) INTO v_total_deja_paye
  FROM public.paiements
  WHERE depense_id = NEW.depense_id
    AND statut = 'valide'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  v_solde_restant := v_montant_depense - v_total_deja_paye;

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
$$;
