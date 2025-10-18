-- Créer l'enum pour les rôles d'application
CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'admin_client',
  'directeur_financier',
  'chef_service',
  'comptable',
  'operateur_saisie'
);

-- Table des rôles utilisateurs (sécurité - évite l'escalade de privilèges)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- Fonction security definer pour vérifier les rôles (évite la récursion RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS sur user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Table des exercices budgétaires
CREATE TABLE public.exercices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  annee INTEGER NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  statut TEXT NOT NULL CHECK (statut IN ('ouvert', 'cloture')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  
  CONSTRAINT exercices_dates_check CHECK (date_fin > date_debut),
  CONSTRAINT exercices_unique_annee_client UNIQUE (client_id, annee)
);

-- Index pour performance
CREATE INDEX idx_exercices_client_id ON public.exercices(client_id);
CREATE INDEX idx_exercices_statut ON public.exercices(statut);
CREATE INDEX idx_exercices_annee ON public.exercices(annee);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_exercices_updated_at
  BEFORE UPDATE ON public.exercices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction de validation : un seul exercice ouvert par année et client
CREATE OR REPLACE FUNCTION public.check_exercice_ouvert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.statut = 'ouvert' THEN
    IF EXISTS (
      SELECT 1 FROM public.exercices
      WHERE client_id = NEW.client_id
      AND annee = NEW.annee
      AND statut = 'ouvert'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Un exercice ouvert existe déjà pour l''année % et ce client', NEW.annee;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_exercice_ouvert
  BEFORE INSERT OR UPDATE ON public.exercices
  FOR EACH ROW
  EXECUTE FUNCTION public.check_exercice_ouvert();

-- RLS sur exercices
ALTER TABLE public.exercices ENABLE ROW LEVEL SECURITY;

-- Politique de lecture : tous les utilisateurs authentifiés peuvent voir les exercices
CREATE POLICY "Authenticated users can view exercices"
  ON public.exercices FOR SELECT
  TO authenticated
  USING (true);

-- Politique d'insertion : admins et directeurs financiers peuvent créer
CREATE POLICY "Admins can insert exercices"
  ON public.exercices FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin_client') OR
    public.has_role(auth.uid(), 'directeur_financier')
  );

-- Politique de mise à jour : admins et directeurs financiers peuvent modifier
CREATE POLICY "Admins can update exercices"
  ON public.exercices FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin_client') OR
    public.has_role(auth.uid(), 'directeur_financier')
  );

-- Politique de suppression : seuls super_admins peuvent supprimer
CREATE POLICY "Super admins can delete exercices"
  ON public.exercices FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));