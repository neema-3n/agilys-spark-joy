-- Créer la table bons_commande
CREATE TABLE IF NOT EXISTS public.bons_commande (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  exercice_id UUID NOT NULL REFERENCES public.exercices(id),
  numero TEXT NOT NULL,
  date_commande DATE NOT NULL DEFAULT CURRENT_DATE,
  fournisseur_id UUID NOT NULL REFERENCES public.fournisseurs(id),
  engagement_id UUID REFERENCES public.engagements(id),
  ligne_budgetaire_id UUID REFERENCES public.lignes_budgetaires(id),
  projet_id UUID REFERENCES public.projets(id),
  objet TEXT NOT NULL,
  montant NUMERIC NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'brouillon',
  date_validation DATE,
  date_livraison_prevue DATE,
  date_livraison_reelle DATE,
  conditions_livraison TEXT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT unique_numero_bc UNIQUE(client_id, numero)
);

-- Activer RLS
ALTER TABLE public.bons_commande ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : Les utilisateurs peuvent voir les BC de leur client
CREATE POLICY "Users can view own client bons commande"
  ON public.bons_commande
  FOR SELECT
  USING (
    client_id = get_user_client_id(auth.uid())
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Politique INSERT : Admins peuvent créer des BC
CREATE POLICY "Admins can insert bons commande"
  ON public.bons_commande
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_client'::app_role)
    OR has_role(auth.uid(), 'directeur_financier'::app_role)
    OR has_role(auth.uid(), 'chef_service'::app_role)
  );

-- Politique UPDATE : Admins peuvent modifier des BC
CREATE POLICY "Admins can update bons commande"
  ON public.bons_commande
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_client'::app_role)
    OR has_role(auth.uid(), 'directeur_financier'::app_role)
    OR has_role(auth.uid(), 'chef_service'::app_role)
  );

-- Politique DELETE : Super admins peuvent supprimer des BC
CREATE POLICY "Super admins can delete bons commande"
  ON public.bons_commande
  FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Index pour améliorer les performances
CREATE INDEX idx_bons_commande_client_id ON public.bons_commande(client_id);
CREATE INDEX idx_bons_commande_exercice_id ON public.bons_commande(exercice_id);
CREATE INDEX idx_bons_commande_fournisseur_id ON public.bons_commande(fournisseur_id);
CREATE INDEX idx_bons_commande_statut ON public.bons_commande(statut);
CREATE INDEX idx_bons_commande_date_commande ON public.bons_commande(date_commande);