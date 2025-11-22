-- Créer la table paiements pour gérer les paiements multiples sur une dépense
CREATE TABLE public.paiements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  exercice_id UUID NOT NULL REFERENCES public.exercices(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  
  -- Source : dépense payée
  depense_id UUID NOT NULL REFERENCES public.depenses(id) ON DELETE CASCADE,
  
  -- Montant du paiement
  montant NUMERIC NOT NULL CHECK (montant > 0),
  
  -- Détails du paiement
  date_paiement DATE NOT NULL,
  mode_paiement TEXT NOT NULL CHECK (mode_paiement IN ('virement', 'cheque', 'especes', 'carte', 'autre')),
  reference_paiement TEXT,
  observations TEXT,
  
  -- Statut
  statut TEXT NOT NULL DEFAULT 'valide' CHECK (statut IN ('valide', 'annule')),
  motif_annulation TEXT,
  date_annulation DATE,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  
  -- Contrainte d'unicité sur le numéro par client
  UNIQUE(client_id, numero)
);

-- Index pour performance
CREATE INDEX idx_paiements_depense ON public.paiements(depense_id);
CREATE INDEX idx_paiements_client_exercice ON public.paiements(client_id, exercice_id);
CREATE INDEX idx_paiements_date ON public.paiements(date_paiement);
CREATE INDEX idx_paiements_statut ON public.paiements(statut);

-- Activer RLS
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;

-- Policies RLS pour paiements
CREATE POLICY "Users can view own client paiements"
ON public.paiements
FOR SELECT
TO authenticated
USING (
  client_id = get_user_client_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can insert paiements"
ON public.paiements
FOR INSERT
TO authenticated
WITH CHECK (
  (client_id = get_user_client_id(auth.uid()) 
   AND (has_role(auth.uid(), 'admin_client'::app_role) 
        OR has_role(auth.uid(), 'directeur_financier'::app_role)
        OR has_role(auth.uid(), 'comptable'::app_role)))
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can update paiements"
ON public.paiements
FOR UPDATE
TO authenticated
USING (
  (client_id = get_user_client_id(auth.uid()) 
   AND (has_role(auth.uid(), 'admin_client'::app_role) 
        OR has_role(auth.uid(), 'directeur_financier'::app_role)
        OR has_role(auth.uid(), 'comptable'::app_role)))
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Super admins can delete paiements"
ON public.paiements
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_paiements_updated_at
  BEFORE UPDATE ON public.paiements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour recalculer le montant_paye d'une dépense après INSERT/UPDATE/DELETE d'un paiement
CREATE OR REPLACE FUNCTION public.recalculer_montant_paye_depense()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_depense_id UUID;
  v_total_paye NUMERIC;
  v_montant_depense NUMERIC;
  v_nouveau_statut TEXT;
  v_statut_actuel TEXT;
BEGIN
  -- Déterminer l'ID de la dépense concernée
  IF TG_OP = 'DELETE' THEN
    v_depense_id := OLD.depense_id;
  ELSE
    v_depense_id := NEW.depense_id;
  END IF;

  -- Récupérer le montant et le statut de la dépense
  SELECT montant, statut INTO v_montant_depense, v_statut_actuel
  FROM public.depenses
  WHERE id = v_depense_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Calculer le total des paiements valides
  SELECT COALESCE(SUM(montant), 0) INTO v_total_paye
  FROM public.paiements
  WHERE depense_id = v_depense_id
    AND statut = 'valide';

  -- Déterminer le nouveau statut
  -- On ne change le statut que si la dépense est payée intégralement
  IF v_total_paye >= v_montant_depense THEN
    v_nouveau_statut := 'payee';
  ELSE
    -- Si le montant payé < montant, on garde le statut actuel (ordonnancee, validee, etc.)
    -- SAUF si le statut était 'payee' et qu'un paiement a été annulé
    IF v_statut_actuel = 'payee' AND v_total_paye < v_montant_depense THEN
      v_nouveau_statut := 'ordonnancee'; -- Retour à ordonnancée si paiement annulé
    ELSE
      v_nouveau_statut := v_statut_actuel; -- On garde le statut actuel
    END IF;
  END IF;

  -- Mettre à jour la dépense
  UPDATE public.depenses
  SET 
    montant_paye = v_total_paye,
    statut = v_nouveau_statut,
    updated_at = now()
  WHERE id = v_depense_id;

  RETURN NULL;
END;
$$;

-- Trigger pour recalculer montant_paye après modification des paiements
CREATE TRIGGER trg_recalculer_montant_paye_depense
AFTER INSERT OR UPDATE OR DELETE ON public.paiements
FOR EACH ROW
EXECUTE FUNCTION public.recalculer_montant_paye_depense();

-- Fonction pour valider un paiement avant insertion/modification
CREATE OR REPLACE FUNCTION public.valider_paiement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_montant_depense NUMERIC;
  v_total_deja_paye NUMERIC;
  v_solde_restant NUMERIC;
  v_statut_depense TEXT;
BEGIN
  -- Récupérer les infos de la dépense
  SELECT montant, statut INTO v_montant_depense, v_statut_depense
  FROM public.depenses
  WHERE id = NEW.depense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dépense introuvable';
  END IF;

  -- Vérifier que la dépense est dans un état permettant le paiement
  IF v_statut_depense NOT IN ('ordonnancee', 'payee') THEN
    RAISE EXCEPTION 'Seules les dépenses ordonnancées peuvent être payées';
  END IF;

  -- Calculer le solde restant à payer
  SELECT COALESCE(SUM(montant), 0) INTO v_total_deja_paye
  FROM public.paiements
  WHERE depense_id = NEW.depense_id
    AND statut = 'valide'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  v_solde_restant := v_montant_depense - v_total_deja_paye;

  -- Vérifier que le montant du paiement ne dépasse pas le solde
  IF NEW.montant > v_solde_restant THEN
    RAISE EXCEPTION '⚠️ Montant invalide

• Montant de la dépense : % €
• Déjà payé : % €
• Reste à payer : % €
• Vous tentez de payer : % €

💡 Réduisez le montant à % € maximum',
      v_montant_depense,
      v_total_deja_paye,
      v_solde_restant,
      NEW.montant,
      v_solde_restant;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger pour valider avant insertion/modification d'un paiement
CREATE TRIGGER trg_valider_paiement
BEFORE INSERT OR UPDATE ON public.paiements
FOR EACH ROW
EXECUTE FUNCTION public.valider_paiement();

-- Fonction pour créer un paiement avec génération automatique du numéro
CREATE OR REPLACE FUNCTION public.create_paiement_with_numero(
  p_client_id TEXT,
  p_exercice_id UUID,
  p_depense_id UUID,
  p_montant NUMERIC,
  p_date_paiement DATE,
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
  v_last_numero TEXT;
  v_next_number INT;
  v_new_numero TEXT;
  v_paiement_id UUID;
  v_result JSONB;
BEGIN
  -- Verrouiller et récupérer le dernier numéro
  SELECT numero INTO v_last_numero
  FROM public.paiements
  WHERE client_id = p_client_id
  ORDER BY numero DESC
  LIMIT 1
  FOR UPDATE;
  
  -- Calculer le prochain numéro
  IF v_last_numero IS NULL THEN
    v_next_number := 1;
  ELSE
    v_next_number := (regexp_match(v_last_numero, 'PAY(\d+)$'))[1]::INT + 1;
  END IF;
  
  v_new_numero := 'PAY' || LPAD(v_next_number::TEXT, 6, '0');
  
  -- Insérer le paiement
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
    'valide',
    p_user_id
  )
  RETURNING id INTO v_paiement_id;
  
  -- Retourner le paiement avec ses relations
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