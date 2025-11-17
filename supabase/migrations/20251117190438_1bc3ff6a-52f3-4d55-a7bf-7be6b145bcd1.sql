-- Fonction pour créer un engagement avec numéro atomique
CREATE OR REPLACE FUNCTION create_engagement_with_numero(
  p_exercice_id UUID,
  p_client_id TEXT,
  p_ligne_budgetaire_id UUID,
  p_objet TEXT,
  p_montant NUMERIC,
  p_fournisseur_id UUID,
  p_beneficiaire TEXT,
  p_projet_id UUID,
  p_observations TEXT,
  p_reservation_credit_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_exercice_code TEXT;
  v_last_numero TEXT;
  v_next_number INT;
  v_new_numero TEXT;
  v_engagement_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Récupérer le code exercice
  SELECT code INTO v_exercice_code FROM exercices WHERE id = p_exercice_id;
  
  -- 2. Verrouiller et récupérer le dernier numéro
  SELECT numero INTO v_last_numero
  FROM engagements
  WHERE exercice_id = p_exercice_id 
    AND client_id = p_client_id
    AND numero LIKE 'ENG/' || v_exercice_code || '/%'
  ORDER BY numero DESC
  LIMIT 1
  FOR UPDATE;
  
  -- 3. Calculer le prochain numéro
  IF v_last_numero IS NULL THEN
    v_next_number := 1;
  ELSE
    v_next_number := (regexp_match(v_last_numero, '/(\d+)$'))[1]::INT + 1;
  END IF;
  
  v_new_numero := 'ENG/' || v_exercice_code || '/' || LPAD(v_next_number::TEXT, 3, '0');
  
  -- 4. Insérer l'engagement
  INSERT INTO engagements (
    numero,
    exercice_id,
    client_id,
    ligne_budgetaire_id,
    objet,
    montant,
    fournisseur_id,
    beneficiaire,
    projet_id,
    observations,
    reservation_credit_id,
    statut,
    date_creation,
    created_by
  ) VALUES (
    v_new_numero,
    p_exercice_id,
    p_client_id,
    p_ligne_budgetaire_id,
    p_objet,
    p_montant,
    p_fournisseur_id,
    p_beneficiaire,
    p_projet_id,
    p_observations,
    p_reservation_credit_id,
    'brouillon',
    CURRENT_DATE,
    p_user_id
  )
  RETURNING id INTO v_engagement_id;
  
  -- 5. Retourner l'engagement avec ses relations
  SELECT jsonb_build_object(
    'id', e.id,
    'numero', e.numero,
    'exercice_id', e.exercice_id,
    'client_id', e.client_id,
    'ligne_budgetaire_id', e.ligne_budgetaire_id,
    'objet', e.objet,
    'montant', e.montant,
    'statut', e.statut,
    'date_creation', e.date_creation,
    'beneficiaire', e.beneficiaire,
    'observations', e.observations,
    'projet_id', e.projet_id,
    'fournisseur_id', e.fournisseur_id,
    'reservation_credit_id', e.reservation_credit_id,
    'created_by', e.created_by,
    'created_at', e.created_at,
    'updated_at', e.updated_at,
    'ligne_budgetaire', jsonb_build_object(
      'libelle', lb.libelle,
      'disponible', lb.disponible
    ),
    'fournisseur', CASE 
      WHEN f.id IS NOT NULL THEN jsonb_build_object('id', f.id, 'nom', f.nom, 'code', f.code)
      ELSE NULL
    END,
    'projet', CASE
      WHEN p.id IS NOT NULL THEN jsonb_build_object('id', p.id, 'code', p.code, 'nom', p.nom, 'statut', p.statut)
      ELSE NULL
    END
  )
  INTO v_result
  FROM engagements e
  LEFT JOIN lignes_budgetaires lb ON e.ligne_budgetaire_id = lb.id
  LEFT JOIN fournisseurs f ON e.fournisseur_id = f.id
  LEFT JOIN projets p ON e.projet_id = p.id
  WHERE e.id = v_engagement_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour créer une réservation avec numéro atomique
CREATE OR REPLACE FUNCTION create_reservation_with_numero(
  p_exercice_id UUID,
  p_client_id TEXT,
  p_ligne_budgetaire_id UUID,
  p_montant NUMERIC,
  p_objet TEXT,
  p_beneficiaire TEXT,
  p_projet_id UUID,
  p_date_expiration DATE,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_last_numero TEXT;
  v_next_number INT;
  v_new_numero TEXT;
  v_reservation_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Verrouiller et récupérer le dernier numéro
  SELECT numero INTO v_last_numero
  FROM reservations_credits
  WHERE exercice_id = p_exercice_id 
    AND client_id = p_client_id
  ORDER BY numero DESC
  LIMIT 1
  FOR UPDATE;
  
  -- 2. Calculer le prochain numéro
  IF v_last_numero IS NULL THEN
    v_next_number := 1;
  ELSE
    v_next_number := (regexp_match(v_last_numero, 'RES-(\d+)$'))[1]::INT + 1;
  END IF;
  
  v_new_numero := 'RES-' || LPAD(v_next_number::TEXT, 5, '0');
  
  -- 3. Insérer la réservation
  INSERT INTO reservations_credits (
    numero,
    exercice_id,
    client_id,
    ligne_budgetaire_id,
    montant,
    objet,
    beneficiaire,
    projet_id,
    date_expiration,
    statut,
    date_reservation,
    created_by
  ) VALUES (
    v_new_numero,
    p_exercice_id,
    p_client_id,
    p_ligne_budgetaire_id,
    p_montant,
    p_objet,
    p_beneficiaire,
    p_projet_id,
    p_date_expiration,
    'active',
    CURRENT_DATE,
    p_user_id
  )
  RETURNING id INTO v_reservation_id;
  
  -- 4. Retourner la réservation avec ses relations
  SELECT jsonb_build_object(
    'id', r.id,
    'numero', r.numero,
    'exercice_id', r.exercice_id,
    'client_id', r.client_id,
    'ligne_budgetaire_id', r.ligne_budgetaire_id,
    'montant', r.montant,
    'objet', r.objet,
    'beneficiaire', r.beneficiaire,
    'projet_id', r.projet_id,
    'date_reservation', r.date_reservation,
    'date_expiration', r.date_expiration,
    'statut', r.statut,
    'created_by', r.created_by,
    'created_at', r.created_at,
    'updated_at', r.updated_at,
    'ligne_budgetaire', jsonb_build_object(
      'libelle', lb.libelle,
      'disponible', lb.disponible
    ),
    'projet', CASE
      WHEN p.id IS NOT NULL THEN jsonb_build_object('id', p.id, 'code', p.code, 'nom', p.nom, 'statut', p.statut)
      ELSE NULL
    END
  )
  INTO v_result
  FROM reservations_credits r
  LEFT JOIN lignes_budgetaires lb ON r.ligne_budgetaire_id = lb.id
  LEFT JOIN projets p ON r.projet_id = p.id
  WHERE r.id = v_reservation_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour créer une modification budgétaire avec numéro atomique
CREATE OR REPLACE FUNCTION create_modification_budgetaire_with_numero(
  p_exercice_id UUID,
  p_client_id TEXT,
  p_type TEXT,
  p_ligne_source_id UUID,
  p_ligne_destination_id UUID,
  p_montant NUMERIC,
  p_motif TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_exercice_code TEXT;
  v_last_numero TEXT;
  v_next_number INT;
  v_new_numero TEXT;
  v_modification_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Récupérer le code exercice
  SELECT code INTO v_exercice_code FROM exercices WHERE id = p_exercice_id;
  
  -- 2. Verrouiller et récupérer le dernier numéro
  SELECT numero INTO v_last_numero
  FROM modifications_budgetaires
  WHERE exercice_id = p_exercice_id 
    AND client_id = p_client_id
    AND numero LIKE 'MOD/' || v_exercice_code || '/%'
  ORDER BY numero DESC
  LIMIT 1
  FOR UPDATE;
  
  -- 3. Calculer le prochain numéro
  IF v_last_numero IS NULL THEN
    v_next_number := 1;
  ELSE
    v_next_number := (regexp_match(v_last_numero, '/(\d+)$'))[1]::INT + 1;
  END IF;
  
  v_new_numero := 'MOD/' || v_exercice_code || '/' || LPAD(v_next_number::TEXT, 4, '0');
  
  -- 4. Insérer la modification
  INSERT INTO modifications_budgetaires (
    numero,
    exercice_id,
    client_id,
    type,
    ligne_source_id,
    ligne_destination_id,
    montant,
    motif,
    statut,
    date_creation
  ) VALUES (
    v_new_numero,
    p_exercice_id,
    p_client_id,
    p_type,
    p_ligne_source_id,
    p_ligne_destination_id,
    p_montant,
    p_motif,
    'brouillon',
    CURRENT_DATE
  )
  RETURNING id INTO v_modification_id;
  
  -- 5. Retourner la modification avec ses relations
  SELECT jsonb_build_object(
    'id', m.id,
    'numero', m.numero,
    'exercice_id', m.exercice_id,
    'client_id', m.client_id,
    'type', m.type,
    'ligne_source_id', m.ligne_source_id,
    'ligne_destination_id', m.ligne_destination_id,
    'montant', m.montant,
    'motif', m.motif,
    'statut', m.statut,
    'date_creation', m.date_creation,
    'created_at', m.created_at,
    'updated_at', m.updated_at,
    'ligne_source', CASE
      WHEN ls.id IS NOT NULL THEN jsonb_build_object('libelle', ls.libelle)
      ELSE NULL
    END,
    'ligne_destination', jsonb_build_object('libelle', ld.libelle)
  )
  INTO v_result
  FROM modifications_budgetaires m
  LEFT JOIN lignes_budgetaires ls ON m.ligne_source_id = ls.id
  LEFT JOIN lignes_budgetaires ld ON m.ligne_destination_id = ld.id
  WHERE m.id = v_modification_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;