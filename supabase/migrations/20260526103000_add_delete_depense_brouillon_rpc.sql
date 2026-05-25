ALTER TABLE public.operations_tresorerie
  DROP CONSTRAINT IF EXISTS operations_tresorerie_depense_id_fkey;

ALTER TABLE public.operations_tresorerie
  ADD CONSTRAINT operations_tresorerie_depense_id_fkey
  FOREIGN KEY (depense_id)
  REFERENCES public.depenses(id)
  ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.delete_depense_brouillon(p_depense_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_depense RECORD;
  v_user_client_id TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  SELECT get_user_client_id(v_user_id)
  INTO v_user_client_id;

  SELECT id, client_id, statut
  INTO v_depense
  FROM public.depenses
  WHERE id = p_depense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dépense introuvable.';
  END IF;

  IF v_depense.statut <> 'brouillon' THEN
    RAISE EXCEPTION 'Seules les dépenses brouillon peuvent être supprimées.';
  END IF;

  IF NOT (
    has_role(v_user_id, 'super_admin'::app_role)
    OR (
      v_depense.client_id = v_user_client_id
      AND (
        has_role(v_user_id, 'admin_client'::app_role)
        OR has_role(v_user_id, 'directeur_financier'::app_role)
        OR has_role(v_user_id, 'chef_service'::app_role)
        OR has_role(v_user_id, 'comptable'::app_role)
      )
    )
  ) THEN
    RAISE EXCEPTION 'Accès interdit à cette dépense.';
  END IF;

  DELETE FROM public.operations_tresorerie
  WHERE depense_id = p_depense_id
     OR paiement_id IN (
       SELECT id
       FROM public.paiements
       WHERE depense_id = p_depense_id
     );

  DELETE FROM public.paiements
  WHERE depense_id = p_depense_id;

  DELETE FROM public.depenses
  WHERE id = p_depense_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', p_depense_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_depense_brouillon(UUID) TO authenticated;
