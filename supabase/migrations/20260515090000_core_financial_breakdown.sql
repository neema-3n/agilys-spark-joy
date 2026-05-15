-- Natures de compte pour la charge principale
CREATE TABLE IF NOT EXISTS public.natures_compte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  code TEXT NOT NULL,
  libelle TEXT NOT NULL,
  description TEXT,
  compte_defaut_id UUID REFERENCES public.comptes(id) ON DELETE SET NULL,
  ordre INTEGER NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT natures_compte_client_code_unique UNIQUE (client_id, code)
);

ALTER TABLE public.natures_compte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client natures compte"
ON public.natures_compte
FOR SELECT
USING (
  client_id = get_user_client_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can insert natures compte"
ON public.natures_compte
FOR INSERT
WITH CHECK (
  (
    client_id = get_user_client_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin_client'::app_role)
      OR has_role(auth.uid(), 'directeur_financier'::app_role)
      OR has_role(auth.uid(), 'comptable'::app_role)
    )
  ) OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can update natures compte"
ON public.natures_compte
FOR UPDATE
USING (
  (
    client_id = get_user_client_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin_client'::app_role)
      OR has_role(auth.uid(), 'directeur_financier'::app_role)
      OR has_role(auth.uid(), 'comptable'::app_role)
    )
  ) OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Super admins can delete natures compte"
ON public.natures_compte
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP TRIGGER IF EXISTS update_natures_compte_updated_at ON public.natures_compte;
CREATE TRIGGER update_natures_compte_updated_at
BEFORE UPDATE ON public.natures_compte
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.factures
  ADD COLUMN IF NOT EXISTS montant_net_paye NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ajouts NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_retraits NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charge_principale_mode TEXT NOT NULL DEFAULT 'nature',
  ADD COLUMN IF NOT EXISTS nature_compte_charge_id UUID REFERENCES public.natures_compte(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS compte_charge_id UUID REFERENCES public.comptes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ventilations JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.depenses
  ADD COLUMN IF NOT EXISTS montant_ht NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS montant_ttc NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS montant_net_paye NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ajouts NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_retraits NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charge_principale_mode TEXT NOT NULL DEFAULT 'nature',
  ADD COLUMN IF NOT EXISTS nature_compte_charge_id UUID REFERENCES public.natures_compte(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS compte_charge_id UUID REFERENCES public.comptes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ventilations JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.paiements
  ALTER COLUMN depense_id DROP NOT NULL;

ALTER TABLE public.paiements
  ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES public.engagements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ligne_budgetaire_id UUID REFERENCES public.lignes_budgetaires(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fournisseur_id UUID REFERENCES public.fournisseurs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS beneficiaire TEXT,
  ADD COLUMN IF NOT EXISTS projet_id UUID REFERENCES public.projets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS objet TEXT,
  ADD COLUMN IF NOT EXISTS montant_ht NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS montant_ttc NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS montant_net_paye NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ajouts NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_retraits NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charge_principale_mode TEXT NOT NULL DEFAULT 'nature',
  ADD COLUMN IF NOT EXISTS nature_compte_charge_id UUID REFERENCES public.natures_compte(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS compte_charge_id UUID REFERENCES public.comptes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ventilations JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.paiements
  DROP CONSTRAINT IF EXISTS paiements_source_check;
ALTER TABLE public.paiements
  ADD CONSTRAINT paiements_source_check
  CHECK (
    depense_id IS NOT NULL
    OR engagement_id IS NOT NULL
    OR ligne_budgetaire_id IS NOT NULL
  );

ALTER TABLE public.factures
  DROP CONSTRAINT IF EXISTS factures_charge_principale_mode_check;
ALTER TABLE public.factures
  ADD CONSTRAINT factures_charge_principale_mode_check
  CHECK (charge_principale_mode IN ('nature', 'compte_expert'));

ALTER TABLE public.depenses
  DROP CONSTRAINT IF EXISTS depenses_charge_principale_mode_check;
ALTER TABLE public.depenses
  ADD CONSTRAINT depenses_charge_principale_mode_check
  CHECK (charge_principale_mode IN ('nature', 'compte_expert'));

ALTER TABLE public.paiements
  DROP CONSTRAINT IF EXISTS paiements_charge_principale_mode_check;
ALTER TABLE public.paiements
  ADD CONSTRAINT paiements_charge_principale_mode_check
  CHECK (charge_principale_mode IN ('nature', 'compte_expert'));

UPDATE public.factures
SET
  montant_net_paye = montant_ttc,
  total_ajouts = COALESCE(montant_tva, 0),
  total_retraits = 0,
  ventilations = CASE
    WHEN COALESCE(montant_tva, 0) > 0 THEN jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid()::text,
        'libelle', 'TVA',
        'nature', 'taxe',
        'montant', montant_tva,
        'sens', 'ajout'
      )
    )
    ELSE '[]'::jsonb
  END
WHERE montant_net_paye = 0
   OR ventilations = '[]'::jsonb;

UPDATE public.depenses
SET
  montant_ht = montant,
  montant_ttc = montant,
  montant_net_paye = COALESCE(montant_paye, montant),
  total_ajouts = 0,
  total_retraits = GREATEST(montant - COALESCE(montant_paye, montant), 0)
WHERE montant_ht = 0
  AND montant_ttc = 0
  AND montant_net_paye = 0;

UPDATE public.paiements
SET
  montant_ht = montant,
  montant_ttc = montant,
  montant_net_paye = montant,
  total_ajouts = 0,
  total_retraits = 0
WHERE montant_ht = 0
  AND montant_ttc = 0
  AND montant_net_paye = 0;

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
  IF TG_OP = 'DELETE' THEN
    v_depense_id := OLD.depense_id;
  ELSE
    v_depense_id := NEW.depense_id;
  END IF;

  IF v_depense_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT montant, statut INTO v_montant_depense, v_statut_actuel
  FROM public.depenses
  WHERE id = v_depense_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM(montant), 0) INTO v_total_paye
  FROM public.paiements
  WHERE depense_id = v_depense_id
    AND statut = 'valide';

  IF v_total_paye >= v_montant_depense THEN
    v_nouveau_statut := 'payee';
  ELSE
    IF v_statut_actuel = 'payee' AND v_total_paye < v_montant_depense THEN
      v_nouveau_statut := 'ordonnancee';
    ELSE
      v_nouveau_statut := v_statut_actuel;
    END IF;
  END IF;

  UPDATE public.depenses
  SET 
    montant_paye = v_total_paye,
    statut = v_nouveau_statut,
    updated_at = now()
  WHERE id = v_depense_id;

  RETURN NULL;
END;
$$;

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
  IF NEW.depense_id IS NULL THEN
    IF NEW.engagement_id IS NULL AND NEW.ligne_budgetaire_id IS NULL THEN
      RAISE EXCEPTION 'Un paiement direct doit être rattaché à un engagement ou à une ligne budgétaire';
    END IF;
    RETURN NEW;
  END IF;

  SELECT montant, statut INTO v_montant_depense, v_statut_depense
  FROM public.depenses
  WHERE id = NEW.depense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dépense introuvable';
  END IF;

  IF v_statut_depense NOT IN ('ordonnancee', 'payee') THEN
    RAISE EXCEPTION 'Seules les dépenses ordonnancées peuvent être payées';
  END IF;

  SELECT COALESCE(SUM(montant), 0) INTO v_total_deja_paye
  FROM public.paiements
  WHERE depense_id = NEW.depense_id
    AND statut = 'valide'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  v_solde_restant := v_montant_depense - v_total_deja_paye;

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
