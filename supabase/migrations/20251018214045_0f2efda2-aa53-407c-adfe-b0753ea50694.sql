-- Create table for dynamic reference data
CREATE TABLE public.parametres_referentiels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  categorie TEXT NOT NULL, -- 'compte_type', 'compte_categorie', 'structure_type', etc.
  code TEXT NOT NULL,
  libelle TEXT NOT NULL,
  description TEXT,
  ordre INTEGER DEFAULT 0,
  actif BOOLEAN DEFAULT true,
  modifiable BOOLEAN DEFAULT true, -- false for system values
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(client_id, categorie, code)
);

-- Enable RLS
ALTER TABLE public.parametres_referentiels ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view referentiels"
ON public.parametres_referentiels
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert referentiels"
ON public.parametres_referentiels
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin_client'::app_role) OR
  has_role(auth.uid(), 'directeur_financier'::app_role)
);

CREATE POLICY "Admins can update referentiels"
ON public.parametres_referentiels
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin_client'::app_role) OR
  has_role(auth.uid(), 'directeur_financier'::app_role)
);

CREATE POLICY "Super admins can delete referentiels"
ON public.parametres_referentiels
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_parametres_referentiels_updated_at
BEFORE UPDATE ON public.parametres_referentiels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default reference data for client-1
-- Compte types
INSERT INTO public.parametres_referentiels (client_id, categorie, code, libelle, ordre, modifiable)
VALUES
  ('client-1', 'compte_type', 'actif', 'Actif', 1, false),
  ('client-1', 'compte_type', 'passif', 'Passif', 2, false),
  ('client-1', 'compte_type', 'charge', 'Charge', 3, false),
  ('client-1', 'compte_type', 'produit', 'Produit', 4, false),
  ('client-1', 'compte_type', 'resultat', 'Résultat', 5, false);

-- Compte categories
INSERT INTO public.parametres_referentiels (client_id, categorie, code, libelle, ordre, modifiable)
VALUES
  ('client-1', 'compte_categorie', 'immobilisation', 'Immobilisation', 1, false),
  ('client-1', 'compte_categorie', 'stock', 'Stock', 2, false),
  ('client-1', 'compte_categorie', 'creance', 'Créance', 3, false),
  ('client-1', 'compte_categorie', 'tresorerie', 'Trésorerie', 4, false),
  ('client-1', 'compte_categorie', 'dette', 'Dette', 5, false),
  ('client-1', 'compte_categorie', 'capital', 'Capital', 6, false),
  ('client-1', 'compte_categorie', 'exploitation', 'Exploitation', 7, false),
  ('client-1', 'compte_categorie', 'financier', 'Financier', 8, false),
  ('client-1', 'compte_categorie', 'exceptionnel', 'Exceptionnel', 9, false),
  ('client-1', 'compte_categorie', 'autre', 'Autre', 10, false);

-- Structure types
INSERT INTO public.parametres_referentiels (client_id, categorie, code, libelle, ordre, modifiable)
VALUES
  ('client-1', 'structure_type', 'entite', 'Entité', 1, false),
  ('client-1', 'structure_type', 'service', 'Service', 2, false),
  ('client-1', 'structure_type', 'centre_cout', 'Centre de coût', 3, false),
  ('client-1', 'structure_type', 'direction', 'Direction', 4, false);

-- Source financement
INSERT INTO public.parametres_referentiels (client_id, categorie, code, libelle, ordre, modifiable)
VALUES
  ('client-1', 'source_financement', 'budget_etat', 'Budget État', 1, true),
  ('client-1', 'source_financement', 'fonds_propres', 'Fonds propres', 2, true),
  ('client-1', 'source_financement', 'subvention', 'Subvention', 3, true),
  ('client-1', 'source_financement', 'emprunt', 'Emprunt', 4, true),
  ('client-1', 'source_financement', 'partenaire', 'Partenaire', 5, true);

-- Statut general
INSERT INTO public.parametres_referentiels (client_id, categorie, code, libelle, ordre, modifiable)
VALUES
  ('client-1', 'statut_general', 'actif', 'Actif', 1, false),
  ('client-1', 'statut_general', 'inactif', 'Inactif', 2, false);