-- Recalcule automatiquement le montant liquidé d'une facture à partir des dépenses non annulées
-- Migration rendue idempotente et tolérante aux états intermédiaires de schéma.

DO $$
BEGIN
  IF to_regclass('public.factures') IS NULL OR to_regclass('public.depenses') IS NULL THEN
    RAISE NOTICE 'Skip 20250207120000: tables public.factures/public.depenses absentes.';
    RETURN;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_facture_montant_paye(p_facture_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC;
  v_target_column TEXT;
BEGIN
  IF p_facture_id IS NULL THEN
    RETURN;
  END IF;

  IF to_regclass('public.factures') IS NULL OR to_regclass('public.depenses') IS NULL THEN
    RETURN;
  END IF;

  SELECT
    CASE
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'factures' AND column_name = 'montant_liquide'
      ) THEN 'montant_liquide'
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'factures' AND column_name = 'montant_paye'
      ) THEN 'montant_paye'
      ELSE NULL
    END
  INTO v_target_column;

  IF v_target_column IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(montant), 0)
  INTO v_total
  FROM public.depenses
  WHERE facture_id = p_facture_id
    AND statut != 'annulee';

  EXECUTE format(
    'UPDATE public.factures SET %I = $1, updated_at = now() WHERE id = $2',
    v_target_column
  )
  USING v_total, p_facture_id;
END;
$$;

-- Applique le recalcul suite à toute modification sur les dépenses liées à une facture
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
DECLARE
  v_target_column TEXT;
BEGIN
  IF to_regclass('public.factures') IS NULL OR to_regclass('public.depenses') IS NULL THEN
    RAISE NOTICE 'Skip data backfill 20250207120000: tables manquantes.';
    RETURN;
  END IF;

  SELECT
    CASE
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'factures' AND column_name = 'montant_liquide'
      ) THEN 'montant_liquide'
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'factures' AND column_name = 'montant_paye'
      ) THEN 'montant_paye'
      ELSE NULL
    END
  INTO v_target_column;

  IF v_target_column IS NULL THEN
    RAISE NOTICE 'Skip data backfill 20250207120000: colonne montant absente.';
    RETURN;
  END IF;

  EXECUTE format(
    'UPDATE public.factures f
       SET %I = COALESCE(dep.total_depenses, 0),
           updated_at = now()
      FROM (
        SELECT facture_id, SUM(montant) AS total_depenses
        FROM public.depenses
        WHERE statut != ''annulee''
        GROUP BY facture_id
      ) dep
      WHERE f.id = dep.facture_id',
    v_target_column
  );

  EXECUTE format(
    'UPDATE public.factures
       SET %I = 0,
           updated_at = now()
     WHERE id NOT IN (
       SELECT DISTINCT facture_id
       FROM public.depenses
       WHERE facture_id IS NOT NULL
     )',
    v_target_column
  );
END;
$$;
