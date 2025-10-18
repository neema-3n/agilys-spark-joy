-- Création de la table sections
CREATE TABLE public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  exercice_id uuid NOT NULL REFERENCES public.exercices(id) ON DELETE CASCADE,
  code text NOT NULL,
  libelle text NOT NULL,
  ordre integer NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'archive')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(client_id, exercice_id, code)
);

-- Index pour performance
CREATE INDEX idx_sections_client_exercice ON public.sections(client_id, exercice_id);
CREATE INDEX idx_sections_statut ON public.sections(statut);

-- RLS pour sections
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sections"
  ON public.sections FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert sections"
  ON public.sections FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin_client'::app_role) OR
    has_role(auth.uid(), 'directeur_financier'::app_role)
  );

CREATE POLICY "Admins can update sections"
  ON public.sections FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin_client'::app_role) OR
    has_role(auth.uid(), 'directeur_financier'::app_role)
  );

CREATE POLICY "Super admins can delete sections"
  ON public.sections FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_sections_updated_at
  BEFORE UPDATE ON public.sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Création de la table programmes
CREATE TABLE public.programmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  exercice_id uuid NOT NULL REFERENCES public.exercices(id) ON DELETE CASCADE,
  code text NOT NULL,
  libelle text NOT NULL,
  ordre integer NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'archive')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(section_id, code)
);

-- Index pour performance
CREATE INDEX idx_programmes_section ON public.programmes(section_id);
CREATE INDEX idx_programmes_client_exercice ON public.programmes(client_id, exercice_id);
CREATE INDEX idx_programmes_statut ON public.programmes(statut);

-- RLS pour programmes
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view programmes"
  ON public.programmes FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert programmes"
  ON public.programmes FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin_client'::app_role) OR
    has_role(auth.uid(), 'directeur_financier'::app_role)
  );

CREATE POLICY "Admins can update programmes"
  ON public.programmes FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin_client'::app_role) OR
    has_role(auth.uid(), 'directeur_financier'::app_role)
  );

CREATE POLICY "Super admins can delete programmes"
  ON public.programmes FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_programmes_updated_at
  BEFORE UPDATE ON public.programmes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Création de la table actions
CREATE TABLE public.actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  exercice_id uuid NOT NULL REFERENCES public.exercices(id) ON DELETE CASCADE,
  code text NOT NULL,
  libelle text NOT NULL,
  ordre integer NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'archive')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(programme_id, code)
);

-- Index pour performance
CREATE INDEX idx_actions_programme ON public.actions(programme_id);
CREATE INDEX idx_actions_client_exercice ON public.actions(client_id, exercice_id);
CREATE INDEX idx_actions_statut ON public.actions(statut);

-- RLS pour actions
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view actions"
  ON public.actions FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert actions"
  ON public.actions FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin_client'::app_role) OR
    has_role(auth.uid(), 'directeur_financier'::app_role)
  );

CREATE POLICY "Admins can update actions"
  ON public.actions FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin_client'::app_role) OR
    has_role(auth.uid(), 'directeur_financier'::app_role)
  );

CREATE POLICY "Super admins can delete actions"
  ON public.actions FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_actions_updated_at
  BEFORE UPDATE ON public.actions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer les données mockées existantes pour l'exercice 2024 (client-1)
-- Note: Vous devrez récupérer l'ID réel de l'exercice 2024 pour le client-1
-- Pour l'instant, on utilise une sous-requête

-- Insertion des sections
INSERT INTO public.sections (id, client_id, exercice_id, code, libelle, ordre, statut)
SELECT 
  gen_random_uuid(),
  'client-1',
  e.id,
  'S01',
  'Fonctionnement',
  1,
  'actif'
FROM public.exercices e
WHERE e.client_id = 'client-1' AND e.statut = 'ouvert'
LIMIT 1;

INSERT INTO public.sections (id, client_id, exercice_id, code, libelle, ordre, statut)
SELECT 
  gen_random_uuid(),
  'client-1',
  e.id,
  'S02',
  'Investissement',
  2,
  'actif'
FROM public.exercices e
WHERE e.client_id = 'client-1' AND e.statut = 'ouvert'
LIMIT 1;

-- Insertion des programmes
INSERT INTO public.programmes (id, section_id, client_id, exercice_id, code, libelle, ordre, statut)
SELECT 
  gen_random_uuid(),
  s.id,
  'client-1',
  s.exercice_id,
  'P01',
  'Administration Générale',
  1,
  'actif'
FROM public.sections s
WHERE s.client_id = 'client-1' AND s.code = 'S01';

INSERT INTO public.programmes (id, section_id, client_id, exercice_id, code, libelle, ordre, statut)
SELECT 
  gen_random_uuid(),
  s.id,
  'client-1',
  s.exercice_id,
  'P02',
  'Services Techniques',
  2,
  'actif'
FROM public.sections s
WHERE s.client_id = 'client-1' AND s.code = 'S01';

INSERT INTO public.programmes (id, section_id, client_id, exercice_id, code, libelle, ordre, statut)
SELECT 
  gen_random_uuid(),
  s.id,
  'client-1',
  s.exercice_id,
  'P03',
  'Équipements et Infrastructures',
  3,
  'actif'
FROM public.sections s
WHERE s.client_id = 'client-1' AND s.code = 'S02';

-- Insertion des actions
INSERT INTO public.actions (id, programme_id, client_id, exercice_id, code, libelle, ordre, statut)
SELECT 
  gen_random_uuid(),
  p.id,
  'client-1',
  p.exercice_id,
  'A01',
  'Personnel',
  1,
  'actif'
FROM public.programmes p
WHERE p.client_id = 'client-1' AND p.code = 'P01';

INSERT INTO public.actions (id, programme_id, client_id, exercice_id, code, libelle, ordre, statut)
SELECT 
  gen_random_uuid(),
  p.id,
  'client-1',
  p.exercice_id,
  'A02',
  'Fournitures de bureau',
  2,
  'actif'
FROM public.programmes p
WHERE p.client_id = 'client-1' AND p.code = 'P01';

INSERT INTO public.actions (id, programme_id, client_id, exercice_id, code, libelle, ordre, statut)
SELECT 
  gen_random_uuid(),
  p.id,
  'client-1',
  p.exercice_id,
  'A03',
  'Entretien véhicules',
  3,
  'actif'
FROM public.programmes p
WHERE p.client_id = 'client-1' AND p.code = 'P02';

INSERT INTO public.actions (id, programme_id, client_id, exercice_id, code, libelle, ordre, statut)
SELECT 
  gen_random_uuid(),
  p.id,
  'client-1',
  p.exercice_id,
  'A04',
  'Prestations techniques',
  4,
  'actif'
FROM public.programmes p
WHERE p.client_id = 'client-1' AND p.code = 'P02';

INSERT INTO public.actions (id, programme_id, client_id, exercice_id, code, libelle, ordre, statut)
SELECT 
  gen_random_uuid(),
  p.id,
  'client-1',
  p.exercice_id,
  'A05',
  'Construction bâtiments',
  5,
  'actif'
FROM public.programmes p
WHERE p.client_id = 'client-1' AND p.code = 'P03';

INSERT INTO public.actions (id, programme_id, client_id, exercice_id, code, libelle, ordre, statut)
SELECT 
  gen_random_uuid(),
  p.id,
  'client-1',
  p.exercice_id,
  'A06',
  'Équipements informatiques',
  6,
  'actif'
FROM public.programmes p
WHERE p.client_id = 'client-1' AND p.code = 'P03';