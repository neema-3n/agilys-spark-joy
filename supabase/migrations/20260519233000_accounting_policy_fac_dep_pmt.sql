-- Contrôle de complétude des mouvements comptables
-- Le moteur compose désormais toutes les lignes d'un même moment comptable,
-- vérifie la cohérence globale du mouvement, puis persiste l'ensemble en bloc.

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
  v_ecritures_created JSONB[] := '{}';
  v_ecriture_id UUID;
  v_ligne_numero INT := 1;
  v_existing_count INT := 0;
  v_generate_constatation BOOLEAN := FALSE;
  v_generate_reglement BOOLEAN := FALSE;
  v_has_prior_facture BOOLEAN := FALSE;
  v_has_prior_depense BOOLEAN := FALSE;
  v_depense_data JSONB;
  v_amount NUMERIC := 0;
  v_debit UUID;
  v_credit UUID;
  v_libelle TEXT;
  v_ventilation JSONB;
  v_pending_lines JSONB := '[]'::jsonb;
  v_pending_line JSONB;
  v_pending_moment TEXT;
  v_pending_count INT := 0;
  v_moment_count INT := 0;
  v_total_debit NUMERIC := 0;
  v_total_credit NUMERIC := 0;
BEGIN
  SELECT COUNT(*)
  INTO v_existing_count
  FROM public.ecritures_comptables
  WHERE client_id = p_client_id
    AND type_operation = p_type_operation
    AND source_id = p_source_id
    AND statut_ecriture = 'validee';

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'message', 'Ecritures deja generees pour cette operation',
      'ecritures_count', v_existing_count,
      'ecritures', '[]'::jsonb
    );
  END IF;

  CASE p_type_operation
    WHEN 'reservation', 'engagement', 'bon_commande' THEN
      RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Operation non comptabilisante dans le nouveau moteur',
        'ecritures_count', 0,
        'ecritures', '[]'::jsonb
      );

    WHEN 'facture' THEN
      v_generate_constatation := TRUE;

    WHEN 'depense' THEN
      v_generate_constatation := COALESCE(p_operation_data->>'facture_id', '') = '';

    WHEN 'paiement' THEN
      v_generate_reglement := TRUE;
  END CASE;

  FOR v_regle IN
    SELECT *
    FROM public.regles_comptables
    WHERE client_id = p_client_id
      AND type_operation = p_type_operation
      AND actif = TRUE
      AND (permanente = TRUE OR (
        (date_debut IS NULL OR date_debut <= p_date_operation)
        AND (date_fin IS NULL OR date_fin >= p_date_operation)
      ))
    ORDER BY
      CASE point_comptable WHEN 'constatation' THEN 1 ELSE 2 END,
      ordre ASC
  LOOP
    IF v_regle.point_comptable = 'constatation' AND NOT v_generate_constatation THEN
      CONTINUE;
    END IF;

    IF v_regle.point_comptable = 'reglement' AND NOT v_generate_reglement THEN
      CONTINUE;
    END IF;

    v_all_conditions_met := TRUE;

    IF COALESCE(jsonb_array_length(v_regle.conditions), 0) > 0 THEN
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

    IF v_regle.role_ligne = 'charge_principale' THEN
      v_amount := CASE v_regle.source_montant
        WHEN 'montant' THEN COALESCE((p_operation_data->>'montant')::NUMERIC, 0)
        WHEN 'montant_ht' THEN COALESCE((p_operation_data->>'montant_ht')::NUMERIC, 0)
        WHEN 'montant_ttc' THEN COALESCE((p_operation_data->>'montant_ttc')::NUMERIC, 0)
        WHEN 'montant_net_paye' THEN COALESCE((p_operation_data->>'montant_net_paye')::NUMERIC, 0)
        ELSE 0
      END;

      IF v_amount <= 0 THEN
        CONTINUE;
      END IF;

      v_debit := CASE
        WHEN v_regle.debit_source = 'charge_principale' THEN NULLIF(p_operation_data->>'compte_charge_id', '')::UUID
        ELSE v_regle.compte_debit_id
      END;
      v_credit := CASE
        WHEN v_regle.credit_source = 'charge_principale' THEN NULLIF(p_operation_data->>'compte_charge_id', '')::UUID
        ELSE v_regle.compte_credit_id
      END;

      IF v_debit IS NULL OR v_credit IS NULL THEN
        RAISE EXCEPTION 'Règle comptable incomplète: %', v_regle.code;
      END IF;

      v_libelle := v_regle.nom || ' - ' || COALESCE(p_operation_data->>'objet', 'Opération');

      v_pending_lines := v_pending_lines || jsonb_build_array(jsonb_build_object(
        'client_id', p_client_id,
        'exercice_id', p_exercice_id,
        'numero_piece', p_numero_piece,
        'numero_ligne', v_ligne_numero,
        'date_ecriture', p_date_operation,
        'compte_debit_id', v_debit,
        'compte_credit_id', v_credit,
        'montant', v_amount,
        'libelle', v_libelle,
        'type_operation', p_type_operation,
        'source_id', p_source_id,
        'regle_comptable_id', v_regle.id,
        'created_by', p_user_id,
        'point_comptable', v_regle.point_comptable,
        'role_ligne', v_regle.role_ligne,
        'ventilation_nature', NULL,
        'ventilation_sens', NULL,
        'metadata', jsonb_build_object('source_montant', v_regle.source_montant)
      ));
      v_ligne_numero := v_ligne_numero + 1;
    ELSIF v_regle.role_ligne = 'ventilation' THEN
      FOR v_ventilation IN
        SELECT value
        FROM jsonb_array_elements(COALESCE(p_operation_data->'ventilations', '[]'::jsonb))
      LOOP
        IF v_regle.sens_ventilation IS NOT NULL
           AND COALESCE(v_ventilation->>'sens', '') <> v_regle.sens_ventilation THEN
          CONTINUE;
        END IF;

        IF v_regle.nature_ventilation IS NOT NULL
           AND COALESCE(v_ventilation->>'nature', '') <> v_regle.nature_ventilation THEN
          CONTINUE;
        END IF;

        v_amount := COALESCE((v_ventilation->>'montant')::NUMERIC, 0);
        IF v_amount <= 0 THEN
          CONTINUE;
        END IF;

        v_debit := CASE
          WHEN v_regle.debit_source = 'charge_principale' THEN NULLIF(p_operation_data->>'compte_charge_id', '')::UUID
          ELSE v_regle.compte_debit_id
        END;
        v_credit := CASE
          WHEN v_regle.credit_source = 'charge_principale' THEN NULLIF(p_operation_data->>'compte_charge_id', '')::UUID
          ELSE v_regle.compte_credit_id
        END;

        IF v_debit IS NULL OR v_credit IS NULL THEN
          RAISE EXCEPTION 'Règle comptable incomplète: %', v_regle.code;
        END IF;

        v_libelle := COALESCE(v_regle.nom, 'Ventilation') || ' - ' || COALESCE(v_ventilation->>'libelle', COALESCE(p_operation_data->>'objet', 'Opération'));

        v_pending_lines := v_pending_lines || jsonb_build_array(jsonb_build_object(
          'client_id', p_client_id,
          'exercice_id', p_exercice_id,
          'numero_piece', p_numero_piece,
          'numero_ligne', v_ligne_numero,
          'date_ecriture', p_date_operation,
          'compte_debit_id', v_debit,
          'compte_credit_id', v_credit,
          'montant', v_amount,
          'libelle', v_libelle,
          'type_operation', p_type_operation,
          'source_id', p_source_id,
          'regle_comptable_id', v_regle.id,
          'created_by', p_user_id,
          'point_comptable', v_regle.point_comptable,
          'role_ligne', v_regle.role_ligne,
          'ventilation_nature', v_ventilation->>'nature',
          'ventilation_sens', v_ventilation->>'sens',
          'metadata', v_ventilation
        ));
        v_ligne_numero := v_ligne_numero + 1;
      END LOOP;
    ELSIF v_regle.role_ligne = 'reglement_tresorerie' THEN
      v_amount := CASE v_regle.source_montant
        WHEN 'montant_ht' THEN COALESCE((p_operation_data->>'montant_ht')::NUMERIC, 0)
        WHEN 'montant_ttc' THEN COALESCE((p_operation_data->>'montant_ttc')::NUMERIC, 0)
        WHEN 'montant_net_paye' THEN COALESCE((p_operation_data->>'montant_net_paye')::NUMERIC, 0)
        ELSE COALESCE((p_operation_data->>'montant')::NUMERIC, 0)
      END;

      IF v_amount <= 0 THEN
        CONTINUE;
      END IF;

      v_debit := CASE
        WHEN v_regle.debit_source = 'charge_principale' THEN NULLIF(p_operation_data->>'compte_charge_id', '')::UUID
        ELSE v_regle.compte_debit_id
      END;
      v_credit := CASE
        WHEN v_regle.credit_source = 'charge_principale' THEN NULLIF(p_operation_data->>'compte_charge_id', '')::UUID
        ELSE v_regle.compte_credit_id
      END;

      IF v_debit IS NULL OR v_credit IS NULL THEN
        RAISE EXCEPTION 'Règle comptable incomplète: %', v_regle.code;
      END IF;

      v_libelle := v_regle.nom || ' - ' || COALESCE(p_operation_data->>'reference_paiement', COALESCE(p_operation_data->>'objet', 'Paiement'));

      v_pending_lines := v_pending_lines || jsonb_build_array(jsonb_build_object(
        'client_id', p_client_id,
        'exercice_id', p_exercice_id,
        'numero_piece', p_numero_piece,
        'numero_ligne', v_ligne_numero,
        'date_ecriture', p_date_operation,
        'compte_debit_id', v_debit,
        'compte_credit_id', v_credit,
        'montant', v_amount,
        'libelle', v_libelle,
        'type_operation', p_type_operation,
        'source_id', p_source_id,
        'regle_comptable_id', v_regle.id,
        'created_by', p_user_id,
        'point_comptable', v_regle.point_comptable,
        'role_ligne', v_regle.role_ligne,
        'ventilation_nature', NULL,
        'ventilation_sens', NULL,
        'metadata', jsonb_build_object('mode_paiement', p_operation_data->>'mode_paiement')
      ));
      v_ligne_numero := v_ligne_numero + 1;
    END IF;
  END LOOP;

  SELECT COUNT(*)
  INTO v_pending_count
  FROM jsonb_array_elements(v_pending_lines);

  IF v_pending_count = 0 THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'message', 'Aucune écriture générée pour cette opération',
      'ecritures_count', 0,
      'ecritures', '[]'::jsonb
    );
  END IF;

  IF v_generate_constatation THEN
    SELECT COUNT(*)
    INTO v_moment_count
    FROM jsonb_array_elements(v_pending_lines) AS line
    WHERE line->>'point_comptable' = 'constatation';

    IF v_moment_count = 0 THEN
      RAISE EXCEPTION 'Mouvement comptable incomplet pour la pièce %: aucune ligne de constatation n''a été générée', p_numero_piece;
    END IF;
  END IF;

  IF v_generate_reglement THEN
    SELECT COUNT(*)
    INTO v_moment_count
    FROM jsonb_array_elements(v_pending_lines) AS line
    WHERE line->>'point_comptable' = 'reglement';

    IF v_moment_count = 0 THEN
      RAISE EXCEPTION 'Mouvement comptable incomplet pour la pièce %: aucune ligne de règlement n''a été générée', p_numero_piece;
    END IF;
  END IF;

  FOR v_pending_moment IN
    SELECT DISTINCT line->>'point_comptable'
    FROM jsonb_array_elements(v_pending_lines) AS line
  LOOP
    SELECT COUNT(*),
           COALESCE(SUM((line->>'montant')::NUMERIC), 0),
           COALESCE(SUM((line->>'montant')::NUMERIC), 0)
    INTO v_moment_count, v_total_debit, v_total_credit
    FROM jsonb_array_elements(v_pending_lines) AS line
    WHERE line->>'point_comptable' = v_pending_moment;

    IF v_moment_count = 0 THEN
      RAISE EXCEPTION 'Mouvement comptable vide pour la pièce % et le moment %', p_numero_piece, v_pending_moment;
    END IF;

    IF v_total_debit <> v_total_credit THEN
      RAISE EXCEPTION 'Mouvement comptable déséquilibré pour la pièce % et le moment % (débit=% crédit=%)',
        p_numero_piece, v_pending_moment, v_total_debit, v_total_credit;
    END IF;
  END LOOP;

  FOR v_pending_line IN
    SELECT value
    FROM jsonb_array_elements(v_pending_lines) WITH ORDINALITY AS lines(value, ord)
    ORDER BY ord
  LOOP
    INSERT INTO public.ecritures_comptables (
      client_id, exercice_id, numero_piece, numero_ligne, date_ecriture,
      compte_debit_id, compte_credit_id, montant, libelle,
      type_operation, source_id, regle_comptable_id, created_by,
      point_comptable, role_ligne, ventilation_nature, ventilation_sens, metadata
    ) VALUES (
      v_pending_line->>'client_id',
      (v_pending_line->>'exercice_id')::UUID,
      v_pending_line->>'numero_piece',
      (v_pending_line->>'numero_ligne')::INT,
      (v_pending_line->>'date_ecriture')::DATE,
      (v_pending_line->>'compte_debit_id')::UUID,
      (v_pending_line->>'compte_credit_id')::UUID,
      (v_pending_line->>'montant')::NUMERIC,
      v_pending_line->>'libelle',
      v_pending_line->>'type_operation',
      (v_pending_line->>'source_id')::UUID,
      (v_pending_line->>'regle_comptable_id')::UUID,
      (v_pending_line->>'created_by')::UUID,
      v_pending_line->>'point_comptable',
      v_pending_line->>'role_ligne',
      NULLIF(v_pending_line->>'ventilation_nature', ''),
      NULLIF(v_pending_line->>'ventilation_sens', ''),
      COALESCE(v_pending_line->'metadata', '{}'::jsonb)
    )
    RETURNING id INTO v_ecriture_id;

    v_ecritures_created := v_ecritures_created || jsonb_build_object(
      'id', v_ecriture_id,
      'regle_id', (v_pending_line->>'regle_comptable_id')::UUID,
      'regle_nom', (
        SELECT nom
        FROM public.regles_comptables
        WHERE id = (v_pending_line->>'regle_comptable_id')::UUID
      ),
      'numero_ligne', (v_pending_line->>'numero_ligne')::INT,
      'point_comptable', v_pending_line->>'point_comptable'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', TRUE,
    'ecritures_count', COALESCE(array_length(v_ecritures_created, 1), 0),
    'ecritures', v_ecritures_created
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', SQLERRM,
    'ecritures_count', 0
  );
END;
$$;
