CREATE OR REPLACE FUNCTION public.sync_depense_party_from_source()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_facture_fournisseur_id UUID;
  v_engagement_fournisseur_id UUID;
  v_engagement_beneficiaire TEXT;
BEGIN
  IF NEW.facture_id IS NOT NULL THEN
    SELECT fournisseur_id
    INTO v_facture_fournisseur_id
    FROM public.factures
    WHERE id = NEW.facture_id;

    NEW.fournisseur_id := v_facture_fournisseur_id;
    NEW.beneficiaire := NULL;

    RETURN NEW;
  END IF;

  IF NEW.engagement_id IS NOT NULL THEN
    SELECT fournisseur_id, beneficiaire
    INTO v_engagement_fournisseur_id, v_engagement_beneficiaire
    FROM public.engagements
    WHERE id = NEW.engagement_id;

    IF v_engagement_fournisseur_id IS NOT NULL THEN
      NEW.fournisseur_id := v_engagement_fournisseur_id;
      NEW.beneficiaire := NULL;
    ELSIF NEW.beneficiaire IS NULL THEN
      NEW.beneficiaire := v_engagement_beneficiaire;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_depense_party_from_source ON public.depenses;

CREATE TRIGGER trg_sync_depense_party_from_source
BEFORE INSERT OR UPDATE ON public.depenses
FOR EACH ROW
EXECUTE FUNCTION public.sync_depense_party_from_source();

UPDATE public.depenses d
SET
  fournisseur_id = CASE
    WHEN d.facture_id IS NOT NULL THEN (
      SELECT f.fournisseur_id
      FROM public.factures f
      WHERE f.id = d.facture_id
    )
    WHEN d.engagement_id IS NOT NULL THEN (
      SELECT e.fournisseur_id
      FROM public.engagements e
      WHERE e.id = d.engagement_id
    )
    ELSE d.fournisseur_id
  END,
  beneficiaire = CASE
    WHEN d.facture_id IS NOT NULL THEN NULL
    WHEN d.engagement_id IS NOT NULL AND (
      SELECT e.fournisseur_id
      FROM public.engagements e
      WHERE e.id = d.engagement_id
    ) IS NOT NULL THEN NULL
    WHEN d.engagement_id IS NOT NULL AND d.beneficiaire IS NULL THEN (
      SELECT e.beneficiaire
      FROM public.engagements e
      WHERE e.id = d.engagement_id
    )
    ELSE d.beneficiaire
  END
WHERE d.facture_id IS NOT NULL
   OR d.engagement_id IS NOT NULL;

DROP POLICY IF EXISTS "Super admins can delete depenses" ON public.depenses;

CREATE POLICY "Authorized users can delete draft depenses"
ON public.depenses
FOR DELETE
TO authenticated
USING (
  statut = 'brouillon'
  AND (
    (
      client_id = get_user_client_id(auth.uid())
      AND (
        has_role(auth.uid(), 'admin_client'::app_role)
        OR has_role(auth.uid(), 'directeur_financier'::app_role)
        OR has_role(auth.uid(), 'chef_service'::app_role)
        OR has_role(auth.uid(), 'comptable'::app_role)
      )
    )
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);
