-- Fonction pour créer une facture avec numéro généré atomiquement
CREATE OR REPLACE FUNCTION public.create_facture_with_numero(
  p_exercice_id UUID,
  p_client_id TEXT,
  p_fournisseur_id UUID,
  p_objet TEXT,
  p_date_facture DATE,
  p_date_echeance DATE,
  p_montant_ht NUMERIC,
  p_montant_tva NUMERIC,
  p_montant_ttc NUMERIC,
  p_numero_facture_fournisseur TEXT,
  p_bon_commande_id UUID,
  p_engagement_id UUID,
  p_ligne_budgetaire_id UUID,
  p_projet_id UUID,
  p_observations TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exercice_code TEXT;
  v_last_numero TEXT;
  v_next_number INT;
  v_new_numero TEXT;
  v_facture_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Récupérer le code exercice
  SELECT code INTO v_exercice_code FROM exercices WHERE id = p_exercice_id;
  
  -- 2. Verrouiller et récupérer le dernier numéro
  SELECT numero INTO v_last_numero
  FROM factures
  WHERE exercice_id = p_exercice_id 
    AND client_id = p_client_id
    AND numero LIKE 'FAC/' || v_exercice_code || '/%'
  ORDER BY numero DESC
  LIMIT 1
  FOR UPDATE;
  
  -- 3. Calculer le prochain numéro
  IF v_last_numero IS NULL THEN
    v_next_number := 1;
  ELSE
    v_next_number := (regexp_match(v_last_numero, '/(\d+)$'))[1]::INT + 1;
  END IF;
  
  v_new_numero := 'FAC/' || v_exercice_code || '/' || LPAD(v_next_number::TEXT, 4, '0');
  
  -- 4. Insérer la facture
  INSERT INTO factures (
    numero,
    exercice_id,
    client_id,
    fournisseur_id,
    objet,
    date_facture,
    date_echeance,
    montant_ht,
    montant_tva,
    montant_ttc,
    montant_liquide,
    numero_facture_fournisseur,
    bon_commande_id,
    engagement_id,
    ligne_budgetaire_id,
    projet_id,
    observations,
    statut,
    created_by
  ) VALUES (
    v_new_numero,
    p_exercice_id,
    p_client_id,
    p_fournisseur_id,
    p_objet,
    p_date_facture,
    p_date_echeance,
    p_montant_ht,
    p_montant_tva,
    p_montant_ttc,
    0,
    p_numero_facture_fournisseur,
    p_bon_commande_id,
    p_engagement_id,
    p_ligne_budgetaire_id,
    p_projet_id,
    p_observations,
    'brouillon',
    p_user_id
  )
  RETURNING id INTO v_facture_id;
  
  -- 5. Retourner la facture avec ses relations
  SELECT jsonb_build_object(
    'id', f.id,
    'numero', f.numero,
    'exercice_id', f.exercice_id,
    'client_id', f.client_id,
    'fournisseur_id', f.fournisseur_id,
    'objet', f.objet,
    'date_facture', f.date_facture,
    'date_echeance', f.date_echeance,
    'montant_ht', f.montant_ht,
    'montant_tva', f.montant_tva,
    'montant_ttc', f.montant_ttc,
    'montant_liquide', f.montant_liquide,
    'numero_facture_fournisseur', f.numero_facture_fournisseur,
    'bon_commande_id', f.bon_commande_id,
    'engagement_id', f.engagement_id,
    'ligne_budgetaire_id', f.ligne_budgetaire_id,
    'projet_id', f.projet_id,
    'observations', f.observations,
    'statut', f.statut,
    'date_validation', f.date_validation,
    'created_by', f.created_by,
    'created_at', f.created_at,
    'updated_at', f.updated_at,
    'fournisseur', jsonb_build_object(
      'id', fournisseur.id,
      'nom', fournisseur.nom,
      'code', fournisseur.code
    ),
    'bon_commande', CASE 
      WHEN bc.id IS NOT NULL THEN jsonb_build_object('id', bc.id, 'numero', bc.numero)
      ELSE NULL
    END,
    'engagement', CASE 
      WHEN e.id IS NOT NULL THEN jsonb_build_object('id', e.id, 'numero', e.numero)
      ELSE NULL
    END,
    'ligne_budgetaire', CASE 
      WHEN lb.id IS NOT NULL THEN jsonb_build_object('id', lb.id, 'libelle', lb.libelle)
      ELSE NULL
    END,
    'projet', CASE 
      WHEN p.id IS NOT NULL THEN jsonb_build_object('id', p.id, 'code', p.code, 'nom', p.nom)
      ELSE NULL
    END
  )
  INTO v_result
  FROM factures f
  LEFT JOIN fournisseurs fournisseur ON f.fournisseur_id = fournisseur.id
  LEFT JOIN bons_commande bc ON f.bon_commande_id = bc.id
  LEFT JOIN engagements e ON f.engagement_id = e.id
  LEFT JOIN lignes_budgetaires lb ON f.ligne_budgetaire_id = lb.id
  LEFT JOIN projets p ON f.projet_id = p.id
  WHERE f.id = v_facture_id;
  
  RETURN v_result;
END;
$$;

-- Fonction pour créer un bon de commande avec numéro généré atomiquement
CREATE OR REPLACE FUNCTION public.create_bon_commande_with_numero(
  p_exercice_id UUID,
  p_client_id TEXT,
  p_fournisseur_id UUID,
  p_objet TEXT,
  p_montant NUMERIC,
  p_date_commande DATE,
  p_date_livraison_prevue DATE,
  p_conditions_livraison TEXT,
  p_engagement_id UUID,
  p_ligne_budgetaire_id UUID,
  p_projet_id UUID,
  p_observations TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exercice_code TEXT;
  v_last_numero TEXT;
  v_next_number INT;
  v_new_numero TEXT;
  v_bc_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Récupérer le code exercice
  SELECT code INTO v_exercice_code FROM exercices WHERE id = p_exercice_id;
  
  -- 2. Verrouiller et récupérer le dernier numéro
  SELECT numero INTO v_last_numero
  FROM bons_commande
  WHERE exercice_id = p_exercice_id 
    AND client_id = p_client_id
    AND numero LIKE 'BC/' || v_exercice_code || '/%'
  ORDER BY numero DESC
  LIMIT 1
  FOR UPDATE;
  
  -- 3. Calculer le prochain numéro
  IF v_last_numero IS NULL THEN
    v_next_number := 1;
  ELSE
    v_next_number := (regexp_match(v_last_numero, '/(\d+)$'))[1]::INT + 1;
  END IF;
  
  v_new_numero := 'BC/' || v_exercice_code || '/' || LPAD(v_next_number::TEXT, 4, '0');
  
  -- 4. Insérer le bon de commande
  INSERT INTO bons_commande (
    numero,
    exercice_id,
    client_id,
    fournisseur_id,
    objet,
    montant,
    date_commande,
    date_livraison_prevue,
    conditions_livraison,
    engagement_id,
    ligne_budgetaire_id,
    projet_id,
    observations,
    statut,
    created_by
  ) VALUES (
    v_new_numero,
    p_exercice_id,
    p_client_id,
    p_fournisseur_id,
    p_objet,
    p_montant,
    p_date_commande,
    p_date_livraison_prevue,
    p_conditions_livraison,
    p_engagement_id,
    p_ligne_budgetaire_id,
    p_projet_id,
    p_observations,
    'brouillon',
    p_user_id
  )
  RETURNING id INTO v_bc_id;
  
  -- 5. Retourner le bon de commande avec ses relations
  SELECT jsonb_build_object(
    'id', bc.id,
    'numero', bc.numero,
    'exercice_id', bc.exercice_id,
    'client_id', bc.client_id,
    'fournisseur_id', bc.fournisseur_id,
    'objet', bc.objet,
    'montant', bc.montant,
    'date_commande', bc.date_commande,
    'date_livraison_prevue', bc.date_livraison_prevue,
    'date_livraison_reelle', bc.date_livraison_reelle,
    'conditions_livraison', bc.conditions_livraison,
    'engagement_id', bc.engagement_id,
    'ligne_budgetaire_id', bc.ligne_budgetaire_id,
    'projet_id', bc.projet_id,
    'observations', bc.observations,
    'statut', bc.statut,
    'date_validation', bc.date_validation,
    'created_by', bc.created_by,
    'created_at', bc.created_at,
    'updated_at', bc.updated_at,
    'fournisseur', jsonb_build_object(
      'id', f.id,
      'nom', f.nom,
      'code', f.code
    ),
    'engagement', CASE 
      WHEN e.id IS NOT NULL THEN jsonb_build_object('id', e.id, 'numero', e.numero)
      ELSE NULL
    END,
    'ligne_budgetaire', CASE 
      WHEN lb.id IS NOT NULL THEN jsonb_build_object('id', lb.id, 'libelle', lb.libelle)
      ELSE NULL
    END,
    'projet', CASE 
      WHEN p.id IS NOT NULL THEN jsonb_build_object('id', p.id, 'code', p.code, 'nom', p.nom)
      ELSE NULL
    END
  )
  INTO v_result
  FROM bons_commande bc
  LEFT JOIN fournisseurs f ON bc.fournisseur_id = f.id
  LEFT JOIN engagements e ON bc.engagement_id = e.id
  LEFT JOIN lignes_budgetaires lb ON bc.ligne_budgetaire_id = lb.id
  LEFT JOIN projets p ON bc.projet_id = p.id
  WHERE bc.id = v_bc_id;
  
  RETURN v_result;
END;
$$;
