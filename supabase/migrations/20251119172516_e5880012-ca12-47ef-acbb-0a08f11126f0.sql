-- Création de la table depenses
CREATE TABLE public.depenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  exercice_id UUID NOT NULL REFERENCES public.exercices(id) ON DELETE RESTRICT,
  numero TEXT NOT NULL,
  date_depense DATE NOT NULL DEFAULT CURRENT_DATE,
  objet TEXT NOT NULL,
  montant NUMERIC NOT NULL DEFAULT 0,
  montant_paye NUMERIC NOT NULL DEFAULT 0,
  
  -- Relations optionnelles
  engagement_id UUID REFERENCES public.engagements(id) ON DELETE SET NULL,
  reservation_credit_id UUID REFERENCES public.reservations_credits(id) ON DELETE SET NULL,
  ligne_budgetaire_id UUID REFERENCES public.lignes_budgetaires(id) ON DELETE SET NULL,
  facture_id UUID REFERENCES public.factures(id) ON DELETE SET NULL,
  fournisseur_id UUID REFERENCES public.fournisseurs(id) ON DELETE SET NULL,
  beneficiaire TEXT,
  projet_id UUID REFERENCES public.projets(id) ON DELETE SET NULL,
  
  -- Workflow
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'validee', 'ordonnancee', 'payee', 'annulee')),
  date_validation DATE,
  date_ordonnancement DATE,
  date_paiement DATE,
  
  -- Paiement
  mode_paiement TEXT CHECK (mode_paiement IN ('virement', 'cheque', 'especes', 'carte', 'autre')),
  reference_paiement TEXT,
  
  -- Métadonnées
  observations TEXT,
  motif_annulation TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contraintes
  UNIQUE(client_id, exercice_id, numero),
  CHECK (montant > 0),
  CHECK (montant_paye >= 0 AND montant_paye <= montant),
  -- Au moins une imputation budgétaire
  CHECK (
    engagement_id IS NOT NULL OR 
    reservation_credit_id IS NOT NULL OR 
    ligne_budgetaire_id IS NOT NULL
  )
);

-- Index pour les performances
CREATE INDEX idx_depenses_client_exercice ON public.depenses(client_id, exercice_id);
CREATE INDEX idx_depenses_engagement ON public.depenses(engagement_id) WHERE engagement_id IS NOT NULL;
CREATE INDEX idx_depenses_reservation ON public.depenses(reservation_credit_id) WHERE reservation_credit_id IS NOT NULL;
CREATE INDEX idx_depenses_ligne_budgetaire ON public.depenses(ligne_budgetaire_id) WHERE ligne_budgetaire_id IS NOT NULL;
CREATE INDEX idx_depenses_facture ON public.depenses(facture_id) WHERE facture_id IS NOT NULL;
CREATE INDEX idx_depenses_fournisseur ON public.depenses(fournisseur_id) WHERE fournisseur_id IS NOT NULL;
CREATE INDEX idx_depenses_statut ON public.depenses(statut);
CREATE INDEX idx_depenses_date ON public.depenses(date_depense);

-- Activer RLS
ALTER TABLE public.depenses ENABLE ROW LEVEL SECURITY;

-- Policies RLS
CREATE POLICY "Users can view own client depenses"
ON public.depenses
FOR SELECT
USING (
  client_id = get_user_client_id(auth.uid()) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can insert depenses"
ON public.depenses
FOR INSERT
WITH CHECK (
  (
    client_id = get_user_client_id(auth.uid()) 
    AND (
      has_role(auth.uid(), 'admin_client'::app_role) OR
      has_role(auth.uid(), 'directeur_financier'::app_role) OR
      has_role(auth.uid(), 'chef_service'::app_role) OR
      has_role(auth.uid(), 'comptable'::app_role)
    )
  ) OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can update depenses"
ON public.depenses
FOR UPDATE
USING (
  (
    client_id = get_user_client_id(auth.uid()) 
    AND (
      has_role(auth.uid(), 'admin_client'::app_role) OR
      has_role(auth.uid(), 'directeur_financier'::app_role) OR
      has_role(auth.uid(), 'comptable'::app_role)
    )
  ) OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Super admins can delete depenses"
ON public.depenses
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_depenses_updated_at
BEFORE UPDATE ON public.depenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour vérifier le montant vs engagement
CREATE OR REPLACE FUNCTION public.check_depense_montant_vs_engagement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_montant_engagement NUMERIC;
  v_montant_deja_depense NUMERIC;
BEGIN
  IF NEW.engagement_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Récupérer le montant de l'engagement
  SELECT montant INTO v_montant_engagement
  FROM public.engagements
  WHERE id = NEW.engagement_id;

  -- Calculer le montant déjà dépensé (en excluant la dépense actuelle si UPDATE et les dépenses annulées)
  SELECT COALESCE(SUM(montant), 0) INTO v_montant_deja_depense
  FROM public.depenses
  WHERE engagement_id = NEW.engagement_id
    AND statut != 'annulee'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Vérifier que le total ne dépasse pas
  IF (v_montant_deja_depense + NEW.montant) > v_montant_engagement THEN
    RAISE EXCEPTION '⚠️ Montant insuffisant sur l''engagement

• Montant de l''engagement : % €
• Déjà dépensé : % €
• Disponible : % €
• Vous tentez de dépenser : % €

💡 Réduisez le montant à % € maximum',
      v_montant_engagement, 
      v_montant_deja_depense,
      (v_montant_engagement - v_montant_deja_depense),
      NEW.montant,
      (v_montant_engagement - v_montant_deja_depense);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_depense_montant_engagement
BEFORE INSERT OR UPDATE ON public.depenses
FOR EACH ROW
EXECUTE FUNCTION public.check_depense_montant_vs_engagement();

-- Fonction pour vérifier le montant vs réservation
CREATE OR REPLACE FUNCTION public.check_depense_montant_vs_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_montant_reservation NUMERIC;
  v_montant_deja_depense NUMERIC;
BEGIN
  IF NEW.reservation_credit_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT montant INTO v_montant_reservation
  FROM public.reservations_credits
  WHERE id = NEW.reservation_credit_id;

  SELECT COALESCE(SUM(montant), 0) INTO v_montant_deja_depense
  FROM public.depenses
  WHERE reservation_credit_id = NEW.reservation_credit_id
    AND statut != 'annulee'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF (v_montant_deja_depense + NEW.montant) > v_montant_reservation THEN
    RAISE EXCEPTION '⚠️ Montant insuffisant sur la réservation

• Montant de la réservation : % €
• Déjà dépensé : % €
• Disponible : % €
• Vous tentez de dépenser : % €

💡 Réduisez le montant à % € maximum',
      v_montant_reservation,
      v_montant_deja_depense,
      (v_montant_reservation - v_montant_deja_depense),
      NEW.montant,
      (v_montant_reservation - v_montant_deja_depense);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_depense_montant_reservation
BEFORE INSERT OR UPDATE ON public.depenses
FOR EACH ROW
EXECUTE FUNCTION public.check_depense_montant_vs_reservation();

-- Fonction pour vérifier qu'une facture ne soit pas liquidée plusieurs fois
CREATE OR REPLACE FUNCTION public.check_depense_vs_facture()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_montant_facture NUMERIC;
  v_montant_deja_liquide NUMERIC;
BEGIN
  IF NEW.facture_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT montant_ttc INTO v_montant_facture
  FROM public.factures
  WHERE id = NEW.facture_id;

  SELECT COALESCE(SUM(montant), 0) INTO v_montant_deja_liquide
  FROM public.depenses
  WHERE facture_id = NEW.facture_id
    AND statut != 'annulee'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF (v_montant_deja_liquide + NEW.montant) > v_montant_facture THEN
    RAISE EXCEPTION '⚠️ Montant de liquidation supérieur au montant de la facture

• Montant TTC de la facture : % €
• Déjà liquidé : % €
• Disponible : % €
• Vous tentez de liquider : % €

💡 Réduisez le montant à % € maximum',
      v_montant_facture,
      v_montant_deja_liquide,
      (v_montant_facture - v_montant_deja_liquide),
      NEW.montant,
      (v_montant_facture - v_montant_deja_liquide);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_depense_facture
BEFORE INSERT OR UPDATE ON public.depenses
FOR EACH ROW
EXECUTE FUNCTION public.check_depense_vs_facture();

-- Fonction pour créer une dépense avec numéro auto-généré
CREATE OR REPLACE FUNCTION public.create_depense_with_numero(
  p_exercice_id UUID,
  p_client_id TEXT,
  p_objet TEXT,
  p_montant NUMERIC,
  p_date_depense DATE,
  p_engagement_id UUID,
  p_reservation_credit_id UUID,
  p_ligne_budgetaire_id UUID,
  p_facture_id UUID,
  p_fournisseur_id UUID,
  p_beneficiaire TEXT,
  p_projet_id UUID,
  p_mode_paiement TEXT,
  p_reference_paiement TEXT,
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
  v_depense_id UUID;
  v_result JSONB;
BEGIN
  -- Récupérer le code exercice
  SELECT code INTO v_exercice_code FROM exercices WHERE id = p_exercice_id;
  
  -- Verrouiller et récupérer le dernier numéro
  SELECT numero INTO v_last_numero
  FROM depenses
  WHERE exercice_id = p_exercice_id 
    AND client_id = p_client_id
    AND numero LIKE 'DEP/' || v_exercice_code || '/%'
  ORDER BY numero DESC
  LIMIT 1
  FOR UPDATE;
  
  -- Calculer le prochain numéro
  IF v_last_numero IS NULL THEN
    v_next_number := 1;
  ELSE
    v_next_number := (regexp_match(v_last_numero, '/(\d+)$'))[1]::INT + 1;
  END IF;
  
  v_new_numero := 'DEP/' || v_exercice_code || '/' || LPAD(v_next_number::TEXT, 4, '0');
  
  -- Insérer la dépense
  INSERT INTO depenses (
    numero,
    exercice_id,
    client_id,
    objet,
    montant,
    date_depense,
    engagement_id,
    reservation_credit_id,
    ligne_budgetaire_id,
    facture_id,
    fournisseur_id,
    beneficiaire,
    projet_id,
    mode_paiement,
    reference_paiement,
    observations,
    statut,
    created_by
  ) VALUES (
    v_new_numero,
    p_exercice_id,
    p_client_id,
    p_objet,
    p_montant,
    p_date_depense,
    p_engagement_id,
    p_reservation_credit_id,
    p_ligne_budgetaire_id,
    p_facture_id,
    p_fournisseur_id,
    p_beneficiaire,
    p_projet_id,
    p_mode_paiement,
    p_reference_paiement,
    p_observations,
    'brouillon',
    p_user_id
  )
  RETURNING id INTO v_depense_id;
  
  -- Retourner la dépense avec ses relations
  SELECT jsonb_build_object(
    'id', d.id,
    'numero', d.numero,
    'exercice_id', d.exercice_id,
    'client_id', d.client_id,
    'objet', d.objet,
    'montant', d.montant,
    'montant_paye', d.montant_paye,
    'date_depense', d.date_depense,
    'statut', d.statut,
    'engagement_id', d.engagement_id,
    'reservation_credit_id', d.reservation_credit_id,
    'ligne_budgetaire_id', d.ligne_budgetaire_id,
    'facture_id', d.facture_id,
    'fournisseur_id', d.fournisseur_id,
    'beneficiaire', d.beneficiaire,
    'projet_id', d.projet_id,
    'mode_paiement', d.mode_paiement,
    'reference_paiement', d.reference_paiement,
    'observations', d.observations,
    'date_validation', d.date_validation,
    'date_ordonnancement', d.date_ordonnancement,
    'date_paiement', d.date_paiement,
    'created_by', d.created_by,
    'created_at', d.created_at,
    'updated_at', d.updated_at,
    'engagement', CASE 
      WHEN e.id IS NOT NULL THEN jsonb_build_object(
        'id', e.id, 
        'numero', e.numero, 
        'montant', e.montant
      )
      ELSE NULL
    END,
    'reservation_credit', CASE 
      WHEN r.id IS NOT NULL THEN jsonb_build_object(
        'id', r.id, 
        'numero', r.numero, 
        'montant', r.montant, 
        'statut', r.statut
      )
      ELSE NULL
    END,
    'ligne_budgetaire', CASE 
      WHEN lb.id IS NOT NULL THEN jsonb_build_object(
        'id', lb.id, 
        'libelle', lb.libelle, 
        'disponible', lb.disponible
      )
      ELSE NULL
    END,
    'facture', CASE 
      WHEN f.id IS NOT NULL THEN jsonb_build_object(
        'id', f.id, 
        'numero', f.numero, 
        'montant_ttc', f.montant_ttc, 
        'statut', f.statut
      )
      ELSE NULL
    END,
    'fournisseur', CASE 
      WHEN fo.id IS NOT NULL THEN jsonb_build_object(
        'id', fo.id, 
        'nom', fo.nom, 
        'code', fo.code
      )
      ELSE NULL
    END,
    'projet', CASE 
      WHEN p.id IS NOT NULL THEN jsonb_build_object(
        'id', p.id, 
        'code', p.code, 
        'nom', p.nom
      )
      ELSE NULL
    END
  )
  INTO v_result
  FROM depenses d
  LEFT JOIN engagements e ON d.engagement_id = e.id
  LEFT JOIN reservations_credits r ON d.reservation_credit_id = r.id
  LEFT JOIN lignes_budgetaires lb ON d.ligne_budgetaire_id = lb.id
  LEFT JOIN factures f ON d.facture_id = f.id
  LEFT JOIN fournisseurs fo ON d.fournisseur_id = fo.id
  LEFT JOIN projets p ON d.projet_id = p.id
  WHERE d.id = v_depense_id;
  
  RETURN v_result;
END;
$$;