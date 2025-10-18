-- Table pour la structure organisationnelle
CREATE TABLE IF NOT EXISTS public.structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  exercice_id UUID REFERENCES public.exercices(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  nom TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('entite', 'service', 'centre_cout', 'direction')),
  parent_id UUID REFERENCES public.structures(id) ON DELETE SET NULL,
  responsable TEXT,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(client_id, exercice_id, code)
);

-- Index pour améliorer les performances
CREATE INDEX idx_structures_client_exercice ON public.structures(client_id, exercice_id);
CREATE INDEX idx_structures_parent ON public.structures(parent_id);

-- Enable RLS
ALTER TABLE public.structures ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour structures
CREATE POLICY "Authenticated users can view structures"
  ON public.structures FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert structures"
  ON public.structures FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin_client'::app_role) OR
    has_role(auth.uid(), 'directeur_financier'::app_role)
  );

CREATE POLICY "Admins can update structures"
  ON public.structures FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin_client'::app_role) OR
    has_role(auth.uid(), 'directeur_financier'::app_role)
  );

CREATE POLICY "Super admins can delete structures"
  ON public.structures FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_structures_updated_at
  BEFORE UPDATE ON public.structures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Table pour le plan comptable
CREATE TABLE IF NOT EXISTS public.comptes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  numero TEXT NOT NULL,
  libelle TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('actif', 'passif', 'charge', 'produit', 'resultat')),
  categorie TEXT NOT NULL CHECK (categorie IN ('immobilisation', 'stock', 'creance', 'tresorerie', 'dette', 'capital', 'exploitation', 'financier', 'exceptionnel', 'autre')),
  parent_id UUID REFERENCES public.comptes(id) ON DELETE SET NULL,
  niveau INTEGER NOT NULL DEFAULT 1,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(client_id, numero)
);

-- Index pour améliorer les performances
CREATE INDEX idx_comptes_client ON public.comptes(client_id);
CREATE INDEX idx_comptes_numero ON public.comptes(numero);
CREATE INDEX idx_comptes_parent ON public.comptes(parent_id);

-- Enable RLS
ALTER TABLE public.comptes ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour comptes
CREATE POLICY "Authenticated users can view comptes"
  ON public.comptes FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert comptes"
  ON public.comptes FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin_client'::app_role) OR
    has_role(auth.uid(), 'directeur_financier'::app_role) OR
    has_role(auth.uid(), 'comptable'::app_role)
  );

CREATE POLICY "Admins can update comptes"
  ON public.comptes FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin_client'::app_role) OR
    has_role(auth.uid(), 'directeur_financier'::app_role) OR
    has_role(auth.uid(), 'comptable'::app_role)
  );

CREATE POLICY "Super admins can delete comptes"
  ON public.comptes FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_comptes_updated_at
  BEFORE UPDATE ON public.comptes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();