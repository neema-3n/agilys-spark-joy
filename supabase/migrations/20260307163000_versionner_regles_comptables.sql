ALTER TABLE public.regles_comptables
  ADD COLUMN IF NOT EXISTS version_group_id UUID,
  ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS version_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS change_reason TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id);

UPDATE public.regles_comptables
SET
  version_group_id = COALESCE(version_group_id, gen_random_uuid()),
  version_number = COALESCE(version_number, 1),
  version_status = CASE
    WHEN version_status IN ('draft', 'published', 'archived') THEN version_status
    WHEN actif = TRUE THEN 'published'
    ELSE 'archived'
  END,
  published_at = CASE
    WHEN COALESCE(published_at, NULL) IS NOT NULL THEN published_at
    WHEN actif = TRUE THEN COALESCE(created_at, NOW())
    ELSE NULL
  END,
  archived_at = CASE
    WHEN COALESCE(archived_at, NULL) IS NOT NULL THEN archived_at
    WHEN actif = FALSE THEN COALESCE(updated_at, NOW())
    ELSE NULL
  END
WHERE version_group_id IS NULL
   OR version_status NOT IN ('draft', 'published', 'archived');

ALTER TABLE public.regles_comptables
  ALTER COLUMN version_group_id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN version_group_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'regles_comptables_version_status_check'
  ) THEN
    ALTER TABLE public.regles_comptables
      ADD CONSTRAINT regles_comptables_version_status_check
      CHECK (version_status IN ('draft', 'published', 'archived'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_regles_comptables_version_group_number
  ON public.regles_comptables (client_id, version_group_id, version_number);

CREATE INDEX IF NOT EXISTS idx_regles_comptables_version_status
  ON public.regles_comptables (client_id, type_operation, version_status, actif, ordre);

CREATE OR REPLACE FUNCTION public.generate_ecritures_comptables(
  p_client_id TEXT,
  p_exercice_id UUID,
  p_type_operation TEXT,
  p_source_id UUID,
  p_numero_piece TEXT,
  p_date_operation DATE,
  p_montant NUMERIC,
  p_operation_data JSONB,
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_regle RECORD;
  v_condition JSONB;
  v_all_conditions_met BOOLEAN;
  v_field_value TEXT;
  v_selected_regle RECORD;
  v_selected_specificity INTEGER := -1;
  v_matching_count INTEGER := 0;
  v_conflict_count INTEGER := 0;
  v_ecriture_id UUID;
BEGIN
  FOR v_regle IN
    SELECT
      rc.*,
      jsonb_array_length(COALESCE(rc.conditions, '[]'::jsonb)) AS specificity
    FROM public.regles_comptables rc
    WHERE rc.client_id = p_client_id
      AND rc.type_operation = p_type_operation
      AND rc.actif = TRUE
      AND rc.version_status = 'published'
      AND (
        rc.permanente = TRUE
        OR (
          (rc.date_debut IS NULL OR rc.date_debut <= p_date_operation)
          AND (rc.date_fin IS NULL OR rc.date_fin >= p_date_operation)
        )
      )
    ORDER BY
      rc.ordre ASC,
      jsonb_array_length(COALESCE(rc.conditions, '[]'::jsonb)) DESC,
      rc.version_number DESC,
      rc.date_debut DESC NULLS LAST,
      rc.created_at DESC
  LOOP
    v_all_conditions_met := TRUE;

    IF jsonb_array_length(COALESCE(v_regle.conditions, '[]'::jsonb)) > 0 THEN
      FOR v_condition IN SELECT * FROM jsonb_array_elements(v_regle.conditions)
      LOOP
        v_field_value := p_operation_data->>COALESCE(v_condition->>'champ', '');

        IF NOT evaluate_condition(
          v_field_value,
          v_condition->>'operateur',
          v_condition->>'valeur'
        ) THEN
          v_all_conditions_met := FALSE;
          EXIT;
        END IF;
      END LOOP;
    END IF;

    IF v_all_conditions_met THEN
      v_matching_count := v_matching_count + 1;

      IF v_matching_count = 1 THEN
        v_selected_regle := v_regle;
        v_selected_specificity := v_regle.specificity;
      ELSIF v_regle.ordre = v_selected_regle.ordre
        AND v_regle.specificity = v_selected_specificity THEN
        v_conflict_count := v_conflict_count + 1;
      END IF;
    END IF;
  END LOOP;

  IF v_matching_count = 0 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Aucune regle comptable publiee ne couvre cette operation pour la date et le contexte fournis.',
      'code', 'REGLE_COMPTABLE_MANQUANTE',
      'ecritures_count', 0
    );
  END IF;

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Conflit de priorite detecte entre plusieurs versions de regles applicables. Ajustez les priorites ou les dates d''effet.',
      'code', 'REGLE_COMPTABLE_CONFLIT',
      'ecritures_count', 0
    );
  END IF;

  INSERT INTO public.ecritures_comptables (
    client_id,
    exercice_id,
    numero_piece,
    numero_ligne,
    date_ecriture,
    compte_debit_id,
    compte_credit_id,
    montant,
    libelle,
    type_operation,
    source_id,
    regle_comptable_id,
    created_by
  ) VALUES (
    p_client_id,
    p_exercice_id,
    p_numero_piece,
    1,
    p_date_operation,
    v_selected_regle.compte_debit_id,
    v_selected_regle.compte_credit_id,
    p_montant,
    v_selected_regle.nom || ' - ' || COALESCE(p_operation_data->>'objet', 'Operation'),
    p_type_operation,
    p_source_id,
    v_selected_regle.id,
    p_user_id
  ) RETURNING id INTO v_ecriture_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'ecritures_count', 1,
    'ecritures', jsonb_build_array(
      jsonb_build_object(
        'id', v_ecriture_id,
        'regle_id', v_selected_regle.id,
        'regle_nom', v_selected_regle.nom,
        'version_group_id', v_selected_regle.version_group_id,
        'version_number', v_selected_regle.version_number,
        'version_status', v_selected_regle.version_status,
        'numero_ligne', 1
      )
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', SQLERRM,
    'ecritures_count', 0
  );
END;
$$;
