-- Création de la table regles_comptables
CREATE TABLE public.regles_comptables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  
  -- Identification de la règle
  code TEXT NOT NULL,
  nom TEXT NOT NULL,
  description TEXT,
  
  -- Période de validité
  date_debut DATE,
  date_fin DATE,
  permanente BOOLEAN DEFAULT true,
  
  -- Opération cible
  type_operation TEXT NOT NULL CHECK (type_operation IN ('reservation', 'engagement', 'bon_commande', 'facture', 'depense', 'paiement')),
  
  -- Conditions (stockées en JSONB pour flexibilité)
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Comptes
  compte_debit_id UUID NOT NULL REFERENCES public.comptes(id),
  compte_credit_id UUID NOT NULL REFERENCES public.comptes(id),
  
  -- Statut et métadonnées
  actif BOOLEAN DEFAULT true,
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  
  CONSTRAINT unique_client_code UNIQUE(client_id, code)
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_regles_comptables_client_operation 
  ON public.regles_comptables(client_id, type_operation, actif);

CREATE INDEX idx_regles_comptables_ordre 
  ON public.regles_comptables(client_id, type_operation, ordre);

-- Enable RLS
ALTER TABLE public.regles_comptables ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own client regles comptables"
  ON public.regles_comptables
  FOR SELECT
  USING (
    client_id = get_user_client_id(auth.uid())
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admins can insert regles comptables"
  ON public.regles_comptables
  FOR INSERT
  WITH CHECK (
    (
      client_id = get_user_client_id(auth.uid())
      AND (
        has_role(auth.uid(), 'admin_client'::app_role)
        OR has_role(auth.uid(), 'directeur_financier'::app_role)
        OR has_role(auth.uid(), 'comptable'::app_role)
      )
    )
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admins can update regles comptables"
  ON public.regles_comptables
  FOR UPDATE
  USING (
    (
      client_id = get_user_client_id(auth.uid())
      AND (
        has_role(auth.uid(), 'admin_client'::app_role)
        OR has_role(auth.uid(), 'directeur_financier'::app_role)
        OR has_role(auth.uid(), 'comptable'::app_role)
      )
    )
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Super admins can delete regles comptables"
  ON public.regles_comptables
  FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));