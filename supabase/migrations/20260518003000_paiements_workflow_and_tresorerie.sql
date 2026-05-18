ALTER TABLE public.paiements
  ADD COLUMN IF NOT EXISTS compte_tresorerie_id UUID REFERENCES public.comptes_tresorerie(id) ON DELETE SET NULL;

ALTER TABLE public.paiements
  ALTER COLUMN statut SET DEFAULT 'brouillon';

ALTER TABLE public.paiements
  DROP CONSTRAINT IF EXISTS paiements_statut_check;

ALTER TABLE public.paiements
  ADD CONSTRAINT paiements_statut_check
  CHECK (statut IN ('brouillon', 'valide', 'annule'));

CREATE OR REPLACE FUNCTION public.create_paiement_with_numero(
  p_client_id TEXT,
  p_exercice_id UUID,
  p_depense_id UUID,
  p_montant NUMERIC,
  p_date_paiement DATE,
  p_mode_paiement TEXT,
  p_reference_paiement TEXT,
  p_observations TEXT,
  p_user_id UUID,
  p_statut TEXT DEFAULT 'brouillon',
  p_compte_tresorerie_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_numero TEXT;
  v_next_number INT;
  v_new_numero TEXT;
  v_paiement_id UUID;
  v_result JSONB;
BEGIN
  SELECT numero INTO v_last_numero
  FROM public.paiements
  WHERE client_id = p_client_id
  ORDER BY numero DESC
  LIMIT 1
  FOR UPDATE;

  IF v_last_numero IS NULL THEN
    v_next_number := 1;
  ELSE
    v_next_number := (regexp_match(v_last_numero, 'PAY(\d+)$'))[1]::INT + 1;
  END IF;

  v_new_numero := 'PAY' || LPAD(v_next_number::TEXT, 6, '0');

  INSERT INTO public.paiements (
    numero,
    client_id,
    exercice_id,
    depense_id,
    montant,
    date_paiement,
    mode_paiement,
    reference_paiement,
    observations,
    statut,
    compte_tresorerie_id,
    created_by
  ) VALUES (
    v_new_numero,
    p_client_id,
    p_exercice_id,
    p_depense_id,
    p_montant,
    p_date_paiement,
    p_mode_paiement,
    p_reference_paiement,
    p_observations,
    COALESCE(p_statut, 'brouillon'),
    p_compte_tresorerie_id,
    p_user_id
  )
  RETURNING id INTO v_paiement_id;

  SELECT jsonb_build_object(
    'id', p.id,
    'numero', p.numero,
    'client_id', p.client_id,
    'exercice_id', p.exercice_id,
    'depense_id', p.depense_id,
    'montant', p.montant,
    'date_paiement', p.date_paiement,
    'mode_paiement', p.mode_paiement,
    'reference_paiement', p.reference_paiement,
    'observations', p.observations,
    'statut', p.statut,
    'compte_tresorerie_id', p.compte_tresorerie_id,
    'created_by', p.created_by,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'depense', jsonb_build_object(
      'id', d.id,
      'numero', d.numero,
      'objet', d.objet,
      'montant', d.montant
    )
  )
  INTO v_result
  FROM public.paiements p
  LEFT JOIN public.depenses d ON p.depense_id = d.id
  WHERE p.id = v_paiement_id;

  RETURN v_result;
END;
$$;
