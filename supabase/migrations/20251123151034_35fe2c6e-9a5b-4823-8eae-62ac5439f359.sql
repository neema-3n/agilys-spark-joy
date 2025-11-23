-- Création de la table ecritures_comptables
CREATE TABLE IF NOT EXISTS public.ecritures_comptables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  exercice_id UUID NOT NULL REFERENCES public.exercices(id) ON DELETE CASCADE,
  
  -- Identification de l'écriture
  numero_piece TEXT NOT NULL,
  numero_ligne INTEGER NOT NULL CHECK (numero_ligne > 0),
  date_ecriture DATE NOT NULL,
  
  -- Comptes
  compte_debit_id UUID NOT NULL REFERENCES public.comptes(id),
  compte_credit_id UUID NOT NULL REFERENCES public.comptes(id),
  
  -- Montants et libellé
  montant NUMERIC(15,2) NOT NULL CHECK (montant > 0),
  libelle TEXT NOT NULL,
  
  -- Source de l'écriture (polymorphique)
  type_operation TEXT NOT NULL CHECK (type_operation IN (
    'reservation', 'engagement', 'bon_commande', 
    'facture', 'depense', 'paiement'
  )),
  source_id UUID NOT NULL,
  
  -- Règle appliquée
  regle_comptable_id UUID REFERENCES public.regles_comptables(id) ON DELETE SET NULL,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contrainte d'unicité
  CONSTRAINT unique_piece_ligne UNIQUE(numero_piece, numero_ligne, client_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_ecritures_date ON public.ecritures_comptables(date_ecriture);
CREATE INDEX IF NOT EXISTS idx_ecritures_piece ON public.ecritures_comptables(numero_piece);
CREATE INDEX IF NOT EXISTS idx_ecritures_source ON public.ecritures_comptables(type_operation, source_id);
CREATE INDEX IF NOT EXISTS idx_ecritures_client ON public.ecritures_comptables(client_id, exercice_id);
CREATE INDEX IF NOT EXISTS idx_ecritures_debit ON public.ecritures_comptables(compte_debit_id);
CREATE INDEX IF NOT EXISTS idx_ecritures_credit ON public.ecritures_comptables(compte_credit_id);

-- Activer RLS
ALTER TABLE public.ecritures_comptables ENABLE ROW LEVEL SECURITY;

-- Politique de lecture : tous les utilisateurs du client peuvent voir
CREATE POLICY "Users can view own client ecritures"
  ON public.ecritures_comptables
  FOR SELECT
  USING (
    client_id = get_user_client_id(auth.uid())
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Politique d'insertion : uniquement pour admins
CREATE POLICY "Admins can insert ecritures"
  ON public.ecritures_comptables
  FOR INSERT
  WITH CHECK (
    (client_id = get_user_client_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin_client'::app_role) 
          OR has_role(auth.uid(), 'directeur_financier'::app_role)
          OR has_role(auth.uid(), 'comptable'::app_role)))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Fonction pour évaluer une condition
CREATE OR REPLACE FUNCTION public.evaluate_condition(
  p_field_value TEXT,
  p_operator TEXT,
  p_expected_value TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_field_value IS NULL THEN
    RETURN FALSE;
  END IF;

  CASE p_operator
    WHEN '==' THEN 
      RETURN p_field_value = p_expected_value;
    WHEN '!=' THEN 
      RETURN p_field_value != p_expected_value;
    WHEN '>' THEN 
      BEGIN
        RETURN p_field_value::NUMERIC > p_expected_value::NUMERIC;
      EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
      END;
    WHEN '<' THEN 
      BEGIN
        RETURN p_field_value::NUMERIC < p_expected_value::NUMERIC;
      EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
      END;
    WHEN '>=' THEN 
      BEGIN
        RETURN p_field_value::NUMERIC >= p_expected_value::NUMERIC;
      EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
      END;
    WHEN '<=' THEN 
      BEGIN
        RETURN p_field_value::NUMERIC <= p_expected_value::NUMERIC;
      EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
      END;
    WHEN 'contient' THEN 
      RETURN p_field_value ILIKE '%' || p_expected_value || '%';
    WHEN 'commence_par' THEN 
      RETURN p_field_value ILIKE p_expected_value || '%';
    ELSE 
      RETURN FALSE;
  END CASE;
END;
$$;

-- Fonction pour générer les écritures comptables
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
BEGIN
  -- Récupérer toutes les règles actives pour ce type d'opération
  FOR v_regle IN 
    SELECT * FROM public.regles_comptables
    WHERE client_id = p_client_id
      AND type_operation = p_type_operation
      AND actif = TRUE
      AND (permanente = TRUE OR (
        (date_debut IS NULL OR date_debut <= p_date_operation)
        AND (date_fin IS NULL OR date_fin >= p_date_operation)
      ))
    ORDER BY ordre ASC
  LOOP
    -- Vérifier si toutes les conditions sont remplies
    v_all_conditions_met := TRUE;
    
    -- Si pas de conditions, la règle s'applique toujours
    IF jsonb_array_length(v_regle.conditions) = 0 THEN
      v_all_conditions_met := TRUE;
    ELSE
      -- Vérifier chaque condition
      FOR v_condition IN SELECT * FROM jsonb_array_elements(v_regle.conditions)
      LOOP
        -- Extraire la valeur du champ depuis les données de l'opération
        v_field_value := p_operation_data->>COALESCE(v_condition->>'champ', '');
        
        -- Évaluer la condition
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
    
    -- Si toutes les conditions sont remplies, créer l'écriture
    IF v_all_conditions_met THEN
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
        v_ligne_numero,
        p_date_operation,
        v_regle.compte_debit_id,
        v_regle.compte_credit_id,
        p_montant,
        v_regle.nom || ' - ' || COALESCE(p_operation_data->>'objet', 'Opération'),
        p_type_operation,
        p_source_id,
        v_regle.id,
        p_user_id
      ) RETURNING id INTO v_ecriture_id;
      
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