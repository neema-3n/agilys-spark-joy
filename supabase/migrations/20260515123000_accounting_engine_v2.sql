-- Refonte du moteur comptable pour intégrer :
-- - point comptabilisant
-- - charge principale
-- - financial breakdown (ventilations)
-- - paiement direct

ALTER TABLE public.regles_comptables
  ALTER COLUMN compte_debit_id DROP NOT NULL,
  ALTER COLUMN compte_credit_id DROP NOT NULL;

ALTER TABLE public.regles_comptables
  ADD COLUMN IF NOT EXISTS point_comptable TEXT NOT NULL DEFAULT 'constatation'
    CHECK (point_comptable IN ('constatation', 'reglement')),
  ADD COLUMN IF NOT EXISTS role_ligne TEXT NOT NULL DEFAULT 'charge_principale'
    CHECK (role_ligne IN ('charge_principale', 'ventilation', 'reglement_tresorerie')),
  ADD COLUMN IF NOT EXISTS source_montant TEXT NOT NULL DEFAULT 'montant_ttc'
    CHECK (source_montant IN ('montant_ht', 'montant_ttc', 'montant_net_paye', 'ventilation_montant')),
  ADD COLUMN IF NOT EXISTS debit_source TEXT NOT NULL DEFAULT 'compte_fixe'
    CHECK (debit_source IN ('compte_fixe', 'charge_principale')),
  ADD COLUMN IF NOT EXISTS credit_source TEXT NOT NULL DEFAULT 'compte_fixe'
    CHECK (credit_source IN ('compte_fixe', 'charge_principale')),
  ADD COLUMN IF NOT EXISTS sens_ventilation TEXT
    CHECK (sens_ventilation IN ('ajout', 'retrait')),
  ADD COLUMN IF NOT EXISTS nature_ventilation TEXT
    CHECK (nature_ventilation IN ('taxe', 'retenue', 'redevance', 'frais', 'autre'));

ALTER TABLE public.ecritures_comptables
  ADD COLUMN IF NOT EXISTS point_comptable TEXT
    CHECK (point_comptable IN ('constatation', 'reglement')),
  ADD COLUMN IF NOT EXISTS role_ligne TEXT,
  ADD COLUMN IF NOT EXISTS ventilation_nature TEXT,
  ADD COLUMN IF NOT EXISTS ventilation_sens TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.regles_comptables
SET
  point_comptable = CASE
    WHEN type_operation = 'paiement' THEN 'reglement'
    ELSE 'constatation'
  END,
  role_ligne = CASE
    WHEN type_operation = 'paiement' THEN 'reglement_tresorerie'
    ELSE 'charge_principale'
  END,
  source_montant = CASE
    WHEN type_operation = 'facture' THEN 'montant_ttc'
    WHEN type_operation = 'paiement' THEN 'montant_net_paye'
    ELSE 'montant_ttc'
  END,
  debit_source = 'compte_fixe',
  credit_source = 'compte_fixe'
WHERE point_comptable IS NOT DISTINCT FROM 'constatation'
  OR role_ligne IS NOT DISTINCT FROM 'charge_principale';

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
      IF COALESCE(p_operation_data->>'facture_id', '') <> '' THEN
        SELECT EXISTS (
          SELECT 1
          FROM public.ecritures_comptables
          WHERE type_operation = 'facture'
            AND source_id = (p_operation_data->>'facture_id')::UUID
            AND statut_ecriture = 'validee'
        )
        INTO v_has_prior_facture;

        v_generate_constatation := NOT v_has_prior_facture;
      ELSE
        v_generate_constatation := TRUE;
      END IF;

    WHEN 'paiement' THEN
      IF COALESCE(p_operation_data->>'depense_id', '') <> '' THEN
        SELECT to_jsonb(d.*)
        INTO v_depense_data
        FROM public.depenses d
        WHERE d.id = (p_operation_data->>'depense_id')::UUID;

        SELECT EXISTS (
          SELECT 1
          FROM public.ecritures_comptables
          WHERE type_operation = 'depense'
            AND source_id = (p_operation_data->>'depense_id')::UUID
            AND statut_ecriture = 'validee'
        )
        INTO v_has_prior_depense;

        IF COALESCE(v_depense_data->>'facture_id', '') <> '' THEN
          SELECT EXISTS (
            SELECT 1
            FROM public.ecritures_comptables
            WHERE type_operation = 'facture'
              AND source_id = (v_depense_data->>'facture_id')::UUID
              AND statut_ecriture = 'validee'
          )
          INTO v_has_prior_facture;
        END IF;

        IF v_has_prior_depense OR v_has_prior_facture THEN
          v_generate_reglement := TRUE;
        ELSE
          v_generate_constatation := TRUE;
          v_generate_reglement := TRUE;
        END IF;
      ELSE
        v_generate_constatation := TRUE;
        v_generate_reglement := TRUE;
      END IF;
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

      INSERT INTO public.ecritures_comptables (
        client_id, exercice_id, numero_piece, numero_ligne, date_ecriture,
        compte_debit_id, compte_credit_id, montant, libelle,
        type_operation, source_id, regle_comptable_id, created_by,
        point_comptable, role_ligne, metadata
      ) VALUES (
        p_client_id, p_exercice_id, p_numero_piece, v_ligne_numero, p_date_operation,
        v_debit, v_credit, v_amount, v_libelle,
        p_type_operation, p_source_id, v_regle.id, p_user_id,
        v_regle.point_comptable, v_regle.role_ligne,
        jsonb_build_object('source_montant', v_regle.source_montant)
      )
      RETURNING id INTO v_ecriture_id;

      v_ecritures_created := v_ecritures_created || jsonb_build_object(
        'id', v_ecriture_id,
        'regle_id', v_regle.id,
        'regle_nom', v_regle.nom,
        'numero_ligne', v_ligne_numero
      );
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

        INSERT INTO public.ecritures_comptables (
          client_id, exercice_id, numero_piece, numero_ligne, date_ecriture,
          compte_debit_id, compte_credit_id, montant, libelle,
          type_operation, source_id, regle_comptable_id, created_by,
          point_comptable, role_ligne, ventilation_nature, ventilation_sens, metadata
        ) VALUES (
          p_client_id, p_exercice_id, p_numero_piece, v_ligne_numero, p_date_operation,
          v_debit, v_credit, v_amount, v_libelle,
          p_type_operation, p_source_id, v_regle.id, p_user_id,
          v_regle.point_comptable, v_regle.role_ligne,
          v_ventilation->>'nature', v_ventilation->>'sens', v_ventilation
        )
        RETURNING id INTO v_ecriture_id;

        v_ecritures_created := v_ecritures_created || jsonb_build_object(
          'id', v_ecriture_id,
          'regle_id', v_regle.id,
          'regle_nom', v_regle.nom,
          'numero_ligne', v_ligne_numero
        );
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

      INSERT INTO public.ecritures_comptables (
        client_id, exercice_id, numero_piece, numero_ligne, date_ecriture,
        compte_debit_id, compte_credit_id, montant, libelle,
        type_operation, source_id, regle_comptable_id, created_by,
        point_comptable, role_ligne, metadata
      ) VALUES (
        p_client_id, p_exercice_id, p_numero_piece, v_ligne_numero, p_date_operation,
        v_debit, v_credit, v_amount, v_libelle,
        p_type_operation, p_source_id, v_regle.id, p_user_id,
        v_regle.point_comptable, v_regle.role_ligne,
        jsonb_build_object('mode_paiement', p_operation_data->>'mode_paiement')
      )
      RETURNING id INTO v_ecriture_id;

      v_ecritures_created := v_ecritures_created || jsonb_build_object(
        'id', v_ecriture_id,
        'regle_id', v_regle.id,
        'regle_nom', v_regle.nom,
        'numero_ligne', v_ligne_numero
      );
      v_ligne_numero := v_ligne_numero + 1;
    END IF;
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
