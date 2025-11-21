-- Recalcule automatiquement le montant liquidé d'une facture à partir des dépenses non annulées
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

DROP TRIGGER IF EXISTS trigger_update_facture_after_depense ON public.depenses;
CREATE TRIGGER trigger_update_facture_after_depense
AFTER INSERT OR UPDATE OR DELETE ON public.depenses
FOR EACH ROW
EXECUTE FUNCTION public.update_facture_after_depense_change();

-- Remise en cohérence initiale
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

-- Factures sans dépenses : s'assurer que montant_paye est à zéro
UPDATE public.factures
SET montant_liquide = 0,
    updated_at = now()
WHERE id NOT IN (SELECT DISTINCT facture_id FROM public.depenses WHERE facture_id IS NOT NULL);
