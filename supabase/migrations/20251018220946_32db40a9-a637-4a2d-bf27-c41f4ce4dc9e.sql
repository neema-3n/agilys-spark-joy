-- Créer la table projets
CREATE TABLE IF NOT EXISTS public.projets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  exercice_id uuid NOT NULL,
  code text NOT NULL,
  nom text NOT NULL,
  description text,
  responsable text,
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  budget_alloue numeric DEFAULT 0,
  budget_consomme numeric DEFAULT 0,
  budget_engage numeric DEFAULT 0,
  enveloppe_id uuid,
  statut text NOT NULL DEFAULT 'planifie',
  type_projet text,
  priorite text,
  taux_avancement numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  
  CONSTRAINT unique_code_per_client UNIQUE (client_id, code),
  CONSTRAINT valid_dates CHECK (date_fin >= date_debut),
  CONSTRAINT valid_budget CHECK (budget_alloue >= 0 AND budget_consomme >= 0 AND budget_engage >= 0),
  CONSTRAINT valid_taux CHECK (taux_avancement >= 0 AND taux_avancement <= 100)
);

-- Créer les index
CREATE INDEX idx_projets_client_id ON public.projets(client_id);
CREATE INDEX idx_projets_exercice_id ON public.projets(exercice_id);
CREATE INDEX idx_projets_statut ON public.projets(statut);
CREATE INDEX idx_projets_enveloppe_id ON public.projets(enveloppe_id);

-- Activer RLS
ALTER TABLE public.projets ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Authenticated users can view projets"
ON public.projets FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert projets"
ON public.projets FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin_client'::app_role) OR
  has_role(auth.uid(), 'directeur_financier'::app_role) OR
  has_role(auth.uid(), 'chef_service'::app_role)
);

CREATE POLICY "Admins can update projets"
ON public.projets FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin_client'::app_role) OR
  has_role(auth.uid(), 'directeur_financier'::app_role) OR
  has_role(auth.uid(), 'chef_service'::app_role)
);

CREATE POLICY "Super admins can delete projets"
ON public.projets FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_projets_updated_at
  BEFORE UPDATE ON public.projets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ajouter les référentiels pour les projets dans parametres_referentiels
INSERT INTO public.parametres_referentiels (client_id, categorie, code, libelle, description, ordre, actif, modifiable) VALUES
-- Types de projets
('client-1', 'type_projet', 'infrastructure', 'Infrastructure', 'Projets d''infrastructure et équipements', 1, true, true),
('client-1', 'type_projet', 'formation', 'Formation', 'Projets de formation et renforcement des capacités', 2, true, true),
('client-1', 'type_projet', 'sante', 'Santé', 'Projets du secteur santé', 3, true, true),
('client-1', 'type_projet', 'education', 'Éducation', 'Projets du secteur éducation', 4, true, true),
('client-1', 'type_projet', 'autre', 'Autre', 'Autres types de projets', 5, true, true),

-- Statuts projet
('client-1', 'statut_projet', 'planifie', 'Planifié', 'Projet en phase de planification', 1, true, true),
('client-1', 'statut_projet', 'en_cours', 'En cours', 'Projet en cours d''exécution', 2, true, true),
('client-1', 'statut_projet', 'en_attente', 'En attente', 'Projet en attente de décision ou déblocage', 3, true, true),
('client-1', 'statut_projet', 'termine', 'Terminé', 'Projet terminé et clôturé', 4, true, true),
('client-1', 'statut_projet', 'annule', 'Annulé', 'Projet annulé', 5, true, true);