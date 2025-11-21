-- Migration 1/3: Créer les fonctions avec montant_liquide
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
  SELECT code INTO v_exercice_code FROM exercices WHERE id = p_exercice_id;
  
  SELECT numero INTO v_last_numero
  FROM factures
  WHERE exercice_id = p_exercice_id 
    AND client_id = p_client_id
    AND numero LIKE 'FAC/' || v_exercice_code || '/%'
  ORDER BY numero DESC
  LIMIT 1
  FOR UPDATE;
  
  IF v_last_numero IS NULL THEN
    v_next_number := 1;
  ELSE
    v_next_number := (regexp_match(v_last_numero, '/(\d+)$'))[1]::INT + 1;
  END IF;
  
  v_new_numero := 'FAC/' || v_exercice_code || '/' || LPAD(v_next_number::TEXT, 4, '0');
  
  INSERT INTO factures (
    numero, exercice_id, client_id, fournisseur_id, objet,
    date_facture, date_echeance, montant_ht, montant_tva, montant_ttc,
    montant_liquide, numero_facture_fournisseur, bon_commande_id,
    engagement_id, ligne_budgetaire_id, projet_id, observations,
    statut, created_by
  ) VALUES (
    v_new_numero, p_exercice_id, p_client_id, p_fournisseur_id, p_objet,
    p_date_facture, p_date_echeance, p_montant_ht, p_montant_tva, p_montant_ttc,
    0, p_numero_facture_fournisseur, p_bon_commande_id,
    p_engagement_id, p_ligne_budgetaire_id, p_projet_id, p_observations,
    'brouillon', p_user_id
  )
  RETURNING id INTO v_facture_id;
  
  SELECT jsonb_build_object(
    'id', f.id, 'numero', f.numero, 'exercice_id', f.exercice_id,
    'client_id', f.client_id, 'fournisseur_id', f.fournisseur_id,
    'objet', f.objet, 'date_facture', f.date_facture,
    'date_echeance', f.date_echeance, 'montant_ht', f.montant_ht,
    'montant_tva', f.montant_tva, 'montant_ttc', f.montant_ttc,
    'montant_liquide', f.montant_liquide,
    'numero_facture_fournisseur', f.numero_facture_fournisseur,
    'bon_commande_id', f.bon_commande_id, 'engagement_id', f.engagement_id,
    'ligne_budgetaire_id', f.ligne_budgetaire_id, 'projet_id', f.projet_id,
    'observations', f.observations, 'statut', f.statut,
    'date_validation', f.date_validation, 'created_by', f.created_by,
    'created_at', f.created_at, 'updated_at', f.updated_at,
    'fournisseur', jsonb_build_object('id', fournisseur.id, 'nom', fournisseur.nom, 'code', fournisseur.code),
    'bon_commande', CASE WHEN bc.id IS NOT NULL THEN jsonb_build_object('id', bc.id, 'numero', bc.numero) ELSE NULL END,
    'engagement', CASE WHEN e.id IS NOT NULL THEN jsonb_build_object('id', e.id, 'numero', e.numero) ELSE NULL END,
    'ligne_budgetaire', CASE WHEN lb.id IS NOT NULL THEN jsonb_build_object('id', lb.id, 'libelle', lb.libelle) ELSE NULL END,
    'projet', CASE WHEN p.id IS NOT NULL THEN jsonb_build_object('id', p.id, 'code', p.code, 'nom', p.nom) ELSE NULL END
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

-- Migration 2/3: Ajouter les triggers de recalcul automatique
CREATE OR REPLACE FUNCTION public.recalculate_facture_montant_liquide(p_facture_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  IF p_facture_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(montant), 0)
  INTO v_total
  FROM public.depenses
  WHERE facture_id = p_facture_id
    AND statut != 'annulee';

  UPDATE public.factures
  SET montant_liquide = v_total,
      updated_at = now()
  WHERE id = p_facture_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_facture_after_depense_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_facture_id UUID;
BEGIN
  v_facture_id := COALESCE(NEW.facture_id, OLD.facture_id);

  IF v_facture_id IS NOT NULL THEN
    PERFORM public.recalculate_facture_montant_liquide(v_facture_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_facture_after_depense ON public.depenses;
CREATE TRIGGER trigger_update_facture_after_depense
AFTER INSERT OR UPDATE OR DELETE ON public.depenses
FOR EACH ROW
EXECUTE FUNCTION public.update_facture_after_depense_change();

-- Migration 3/3: Remise en cohérence des données existantes
UPDATE public.factures f
SET montant_liquide = COALESCE(dep.total_depenses, 0),
    updated_at = now()
FROM (
  SELECT facture_id, SUM(montant) AS total_depenses
  FROM public.depenses
  WHERE statut != 'annulee'
  GROUP BY facture_id
) dep
WHERE f.id = dep.facture_id;

UPDATE public.factures
SET montant_liquide = 0,
    updated_at = now()
WHERE id NOT IN (SELECT DISTINCT facture_id FROM public.depenses WHERE facture_id IS NOT NULL);