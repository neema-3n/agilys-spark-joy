-- Story 4.4 - Workflow paiement complet (partiel, rejet, reprise)

ALTER TABLE public.depenses DROP CONSTRAINT IF EXISTS depenses_statut_check;
ALTER TABLE public.depenses
  ADD CONSTRAINT depenses_statut_check
  CHECK (statut IN ('brouillon', 'validee', 'ordonnancee', 'partiellement_payee', 'payee', 'annulee'));

ALTER TABLE public.paiements
  ADD COLUMN IF NOT EXISTS motif_rejet TEXT,
  ADD COLUMN IF NOT EXISTS date_rejet DATE,
  ADD COLUMN IF NOT EXISTS date_retour DATE,
  ADD COLUMN IF NOT EXISTS reference_retour TEXT,
  ADD COLUMN IF NOT EXISTS tentative_numero INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS paiement_origine_id UUID REFERENCES public.paiements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paiement_repris_de_id UUID REFERENCES public.paiements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.paiements
SET
  statut = CASE
    WHEN statut = 'valide' THEN 'execute'
    ELSE statut
  END,
  updated_by = COALESCE(updated_by, created_by);

ALTER TABLE public.paiements DROP CONSTRAINT IF EXISTS paiements_statut_check;
ALTER TABLE public.paiements
  ADD CONSTRAINT paiements_statut_check
  CHECK (statut IN ('brouillon', 'transmis', 'accepte', 'execute', 'reconcilie', 'rejete', 'annule'));

CREATE INDEX IF NOT EXISTS idx_paiements_origine ON public.paiements(paiement_origine_id);
CREATE INDEX IF NOT EXISTS idx_paiements_reprise ON public.paiements(paiement_repris_de_id);
CREATE INDEX IF NOT EXISTS idx_paiements_attempt ON public.paiements(depense_id, tentative_numero);
CREATE INDEX IF NOT EXISTS idx_paiements_date_retour ON public.paiements(date_retour);

CREATE OR REPLACE FUNCTION public.recalculer_montant_paye_depense()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_depense_id UUID;
  v_total_paye NUMERIC;
  v_montant_depense NUMERIC;
  v_statut_depense TEXT;
  v_nouveau_statut TEXT;
  v_last_payment RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_depense_id := OLD.depense_id;
  ELSE
    v_depense_id := NEW.depense_id;
  END IF;

  SELECT montant, statut INTO v_montant_depense, v_statut_depense
  FROM public.depenses
  WHERE id = v_depense_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM(montant), 0) INTO v_total_paye
  FROM public.paiements
  WHERE depense_id = v_depense_id
    AND statut IN ('execute', 'reconcilie');

  IF v_statut_depense = 'annulee' THEN
    v_nouveau_statut := 'annulee';
  ELSIF v_total_paye <= 0 THEN
    v_nouveau_statut := 'ordonnancee';
  ELSIF v_total_paye < v_montant_depense THEN
    v_nouveau_statut := 'partiellement_payee';
  ELSE
    v_nouveau_statut := 'payee';
  END IF;

  SELECT date_paiement, mode_paiement, reference_paiement
  INTO v_last_payment
  FROM public.paiements
  WHERE depense_id = v_depense_id
    AND statut IN ('execute', 'reconcilie')
  ORDER BY date_paiement DESC, created_at DESC
  LIMIT 1;

  UPDATE public.depenses
  SET
    montant_paye = LEAST(v_total_paye, montant),
    statut = v_nouveau_statut,
    date_paiement = CASE WHEN v_nouveau_statut = 'annulee' THEN NULL ELSE v_last_payment.date_paiement END,
    mode_paiement = CASE WHEN v_nouveau_statut = 'annulee' THEN NULL ELSE v_last_payment.mode_paiement END,
    reference_paiement = CASE WHEN v_nouveau_statut = 'annulee' THEN NULL ELSE v_last_payment.reference_paiement END,
    updated_at = now()
  WHERE id = v_depense_id;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.valider_paiement()
RETURNS TRIGGER
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
  SELECT montant, statut INTO v_montant_depense, v_statut_depense
  FROM public.depenses
  WHERE id = NEW.depense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dépense introuvable';
  END IF;

  IF NEW.statut IN ('execute', 'reconcilie') AND v_statut_depense NOT IN ('ordonnancee', 'partiellement_payee', 'payee') THEN
    RAISE EXCEPTION 'Seules les dépenses ordonnancées ou partiellement payées peuvent recevoir un paiement actif';
  END IF;

  SELECT COALESCE(SUM(montant), 0) INTO v_total_deja_paye
  FROM public.paiements
  WHERE depense_id = NEW.depense_id
    AND statut IN ('execute', 'reconcilie')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  v_solde_restant := v_montant_depense - v_total_deja_paye;

  IF NEW.statut IN ('execute', 'reconcilie') AND NEW.montant > v_solde_restant THEN
    RAISE EXCEPTION 'Montant de paiement invalide. Reste à payer: %', v_solde_restant;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.annuler_paiements_depense_annulee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.statut = 'annulee' AND OLD.statut != 'annulee' THEN
    UPDATE public.paiements
    SET
      statut = 'annule',
      motif_annulation = COALESCE(motif_annulation, 'Annulation automatique suite à l''annulation de la dépense'),
      date_annulation = COALESCE(date_annulation, CURRENT_DATE),
      updated_by = COALESCE(updated_by, created_by),
      updated_at = now()
    WHERE depense_id = NEW.id
      AND statut NOT IN ('annule', 'rejete');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_valider_paiement ON public.paiements;
CREATE TRIGGER trg_valider_paiement
BEFORE INSERT OR UPDATE ON public.paiements
FOR EACH ROW EXECUTE FUNCTION public.valider_paiement();

DROP TRIGGER IF EXISTS trg_recalculer_montant_paye_depense ON public.paiements;
CREATE TRIGGER trg_recalculer_montant_paye_depense
AFTER INSERT OR UPDATE OR DELETE ON public.paiements
FOR EACH ROW EXECUTE FUNCTION public.recalculer_montant_paye_depense();

DROP TRIGGER IF EXISTS trg_annuler_paiements_depense_annulee ON public.depenses;
CREATE TRIGGER trg_annuler_paiements_depense_annulee
AFTER UPDATE OF statut ON public.depenses
FOR EACH ROW
WHEN (OLD.statut IS DISTINCT FROM NEW.statut)
EXECUTE FUNCTION public.annuler_paiements_depense_annulee();
