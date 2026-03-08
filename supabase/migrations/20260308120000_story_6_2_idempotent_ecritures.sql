CREATE UNIQUE INDEX IF NOT EXISTS idx_ecritures_nominales_source_regle_unique
  ON public.ecritures_comptables (
    client_id,
    exercice_id,
    type_operation,
    source_id,
    regle_comptable_id,
    statut_ecriture
  )
  WHERE statut_ecriture = 'validee' AND regle_comptable_id IS NOT NULL;

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
  v_matching_count INTEGER := 0;
  v_candidate_count INTEGER := 0;
  v_existing_count INTEGER := 0;
  v_created_count INTEGER := 0;
  v_current_line INTEGER := 0;
  v_total_debit NUMERIC := 0;
  v_total_credit NUMERIC := 0;
  v_field_value TEXT;
  v_created_ecritures JSONB := '[]'::jsonb;
  v_ecriture_id UUID;
BEGIN
  IF p_montant IS NULL OR p_montant <= 0 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'status', 'error',
      'code', 'MONTANT_INVALIDE',
      'message', 'Le montant comptable doit etre strictement positif.',
      'ecritures_count', 0
    );
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      format('%s|%s|%s|%s', p_client_id, p_exercice_id::text, p_type_operation, p_source_id::text),
      0
    )
  );

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
      rc.created_at DESC,
      rc.id ASC
  LOOP
    v_all_conditions_met := TRUE;

    IF jsonb_array_length(COALESCE(v_regle.conditions, '[]'::jsonb)) > 0 THEN
      FOR v_condition IN SELECT * FROM jsonb_array_elements(v_regle.conditions)
      LOOP
        v_field_value := p_operation_data->>COALESCE(v_condition->>'champ', '');

        IF NOT public.evaluate_condition(
          v_field_value,
          v_condition->>'operateur',
          v_condition->>'valeur'
        ) THEN
          v_all_conditions_met := FALSE;
          EXIT;
        END IF;
      END LOOP;
    END IF;

    IF NOT v_all_conditions_met THEN
      CONTINUE;
    END IF;

    v_matching_count := v_matching_count + 1;

    IF NOT EXISTS (
      SELECT 1
      FROM public.comptes debit
      INNER JOIN public.comptes credit ON credit.id = v_regle.compte_credit_id
      WHERE debit.id = v_regle.compte_debit_id
        AND debit.client_id = p_client_id
        AND debit.statut = 'actif'
        AND credit.client_id = p_client_id
        AND credit.statut = 'actif'
    ) THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'status', 'error',
        'code', 'COMPTE_COMPTABLE_INVALIDE',
        'message', 'La regle comptable appliquee reference un compte invalide ou hors scope tenant.',
        'ecritures_count', 0,
        'regle_id', v_regle.id
      );
    END IF;

    v_candidate_count := v_candidate_count + 1;
  END LOOP;

  IF v_matching_count = 0 OR v_candidate_count = 0 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'status', 'error',
      'code', 'REGLE_COMPTABLE_MANQUANTE',
      'message', 'Aucune regle comptable publiee ne couvre cette operation pour la date et le contexte fournis.',
      'ecritures_count', 0
    );
  END IF;

  v_total_debit := p_montant * v_candidate_count;
  v_total_credit := p_montant * v_candidate_count;

  IF v_total_debit <> v_total_credit THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'status', 'error',
      'code', 'ECRITURES_DESEQUILIBREES',
      'message', 'Le lot comptable candidat est desequilibre (debit != credit).',
      'ecritures_count', 0,
      'total_debit', v_total_debit,
      'total_credit', v_total_credit
    );
  END IF;

  SELECT COUNT(*)
  INTO v_existing_count
  FROM public.ecritures_comptables ec
  WHERE ec.client_id = p_client_id
    AND ec.exercice_id = p_exercice_id
    AND ec.type_operation = p_type_operation
    AND ec.source_id = p_source_id
    AND ec.statut_ecriture = 'validee';

  IF v_existing_count >= v_candidate_count THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'status', 'already_generated',
      'code', 'ECRITURES_DEJA_PRESENTES',
      'message', 'Les ecritures comptables existent deja pour cette source et cette configuration.',
      'ecritures_count', v_existing_count
    );
  END IF;

  SELECT COALESCE(MAX(ec.numero_ligne), 0)
  INTO v_current_line
  FROM public.ecritures_comptables ec
  WHERE ec.client_id = p_client_id
    AND ec.exercice_id = p_exercice_id
    AND ec.numero_piece = p_numero_piece;

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
      rc.created_at DESC,
      rc.id ASC
  LOOP
    v_all_conditions_met := TRUE;

    IF jsonb_array_length(COALESCE(v_regle.conditions, '[]'::jsonb)) > 0 THEN
      FOR v_condition IN SELECT * FROM jsonb_array_elements(v_regle.conditions)
      LOOP
        v_field_value := p_operation_data->>COALESCE(v_condition->>'champ', '');

        IF NOT public.evaluate_condition(
          v_field_value,
          v_condition->>'operateur',
          v_condition->>'valeur'
        ) THEN
          v_all_conditions_met := FALSE;
          EXIT;
        END IF;
      END LOOP;
    END IF;

    IF NOT v_all_conditions_met THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.ecritures_comptables ec
      WHERE ec.client_id = p_client_id
        AND ec.exercice_id = p_exercice_id
        AND ec.type_operation = p_type_operation
        AND ec.source_id = p_source_id
        AND ec.regle_comptable_id = v_regle.id
        AND ec.statut_ecriture = 'validee'
    ) THEN
      CONTINUE;
    END IF;

    v_current_line := v_current_line + 1;

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
      statut_ecriture,
      created_by
    ) VALUES (
      p_client_id,
      p_exercice_id,
      p_numero_piece,
      v_current_line,
      p_date_operation,
      v_regle.compte_debit_id,
      v_regle.compte_credit_id,
      p_montant,
      v_regle.nom || ' - ' || COALESCE(p_operation_data->>'objet', 'Operation'),
      p_type_operation,
      p_source_id,
      v_regle.id,
      'validee',
      p_user_id
    )
    RETURNING id INTO v_ecriture_id;

    v_created_count := v_created_count + 1;
    v_created_ecritures := v_created_ecritures || jsonb_build_array(
      jsonb_build_object(
        'id', v_ecriture_id,
        'regle_id', v_regle.id,
        'regle_nom', v_regle.nom,
        'version_group_id', v_regle.version_group_id,
        'version_number', v_regle.version_number,
        'version_status', v_regle.version_status,
        'numero_ligne', v_current_line
      )
    );
  END LOOP;

  IF v_created_count = 0 THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'status', 'already_generated',
      'code', 'ECRITURES_DEJA_PRESENTES',
      'message', 'Les ecritures comptables existent deja pour cette source et cette configuration.',
      'ecritures_count', v_existing_count
    );
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'status', 'created',
    'code', 'ECRITURES_CREEES',
    'message', 'Les ecritures comptables ont ete generees avec succes.',
    'ecritures_count', v_created_count,
    'ecritures', v_created_ecritures
  );
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object(
    'success', TRUE,
    'status', 'already_generated',
    'code', 'ECRITURES_DEJA_PRESENTES',
    'message', 'Les ecritures comptables existent deja pour cette source et cette configuration.',
    'ecritures_count', v_existing_count
  );
WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'status', 'error',
    'code', 'ERREUR_GENERATION_ECRITURES',
    'message', SQLERRM,
    'ecritures_count', 0
  );
END;
$$;
