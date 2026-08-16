CREATE OR REPLACE FUNCTION public.update_facture_after_depense_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_facture_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_facture_id := OLD.facture_id;
  ELSE
    v_facture_id := COALESCE(NEW.facture_id, OLD.facture_id);
  END IF;

  IF v_facture_id IS NOT NULL THEN
    PERFORM public.recalculate_facture_montant_paye(v_facture_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
