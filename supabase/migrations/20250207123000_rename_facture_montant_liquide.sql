-- Renommer le champ facture "montant_paye" en "montant_liquide"
-- Migration rendue idempotente et rejouable.

DO $$
BEGIN
  IF to_regclass('public.factures') IS NULL THEN
    RAISE NOTICE 'Skip 20250207123000: table public.factures absente.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'factures' AND column_name = 'montant_paye'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'factures' AND column_name = 'montant_liquide'
  ) THEN
    ALTER TABLE public.factures
    RENAME COLUMN montant_paye TO montant_liquide;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.factures') IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'factures' AND column_name = 'montant_liquide'
  ) THEN
    COMMENT ON COLUMN public.factures.montant_liquide IS 'Montant déjà liquidé sur cette facture';
  END IF;
END;
$$;

-- Mettre à jour les fonctions de recalcul pour utiliser le nouveau nom
CREATE OR REPLACE FUNCTION public.recalculate_facture_montant_paye(p_facture_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  IF p_facture_id IS NULL THEN
    RETURN;
  END IF;

  IF to_regclass('public.factures') IS NULL OR to_regclass('public.depenses') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'factures' AND column_name = 'montant_liquide'
  ) THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(montant), 0)
  INTO v_total
  FROM public.depenses
  WHERE facture_id = p_facture_id
    AND statut != 'annulee';

  UPDATE public.factures
  SET montant_liquide = v_total,
      updated_at = now()
  WHERE id = p_facture_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_facture_after_depense_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_facture_id UUID;
BEGIN
  v_facture_id := COALESCE(NEW.facture_id, OLD.facture_id);

  IF v_facture_id IS NOT NULL THEN
    PERFORM public.recalculate_facture_montant_paye(v_facture_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.depenses') IS NULL THEN
    RAISE NOTICE 'Skip trigger update_facture_after_depense: table depenses absente.';
    RETURN;
  END IF;

  DROP TRIGGER IF EXISTS trigger_update_facture_after_depense ON public.depenses;
  CREATE TRIGGER trigger_update_facture_after_depense
  AFTER INSERT OR UPDATE OR DELETE ON public.depenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_facture_after_depense_change();
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.factures') IS NULL OR to_regclass('public.depenses') IS NULL THEN
    RAISE NOTICE 'Skip data backfill 20250207123000: tables manquantes.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'factures' AND column_name = 'montant_liquide'
  ) THEN
    RAISE NOTICE 'Skip data backfill 20250207123000: colonne montant_liquide absente.';
    RETURN;
  END IF;

  UPDATE public.factures f
  SET montant_liquide = COALESCE(dep.total_depenses, 0),
      updated_at = now()
  FROM (
    SELECT facture_id, SUM(montant) AS total_depenses
    FROM public.depenses
    WHERE statut != 'annulee'
    GROUP BY facture_id
  ) dep
  WHERE f.id = dep.facture_id;

  UPDATE public.factures
  SET montant_liquide = 0,
      updated_at = now()
  WHERE id NOT IN (SELECT DISTINCT facture_id FROM public.depenses WHERE facture_id IS NOT NULL);
END;
$$;
