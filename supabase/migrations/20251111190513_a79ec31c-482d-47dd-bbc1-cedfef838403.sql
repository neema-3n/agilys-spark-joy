-- Create scenarios_prevision table
CREATE TABLE public.scenarios_prevision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  code text NOT NULL,
  nom text NOT NULL,
  description text,
  type_scenario text NOT NULL CHECK (type_scenario IN ('optimiste', 'pessimiste', 'realiste', 'personnalise')),
  annee_reference integer NOT NULL,
  exercice_reference_id uuid REFERENCES public.exercices(id) ON DELETE SET NULL,
  statut text NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'valide', 'archive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(client_id, code)
);

-- Create lignes_prevision table
CREATE TABLE public.lignes_prevision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.scenarios_prevision(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  annee integer NOT NULL,
  section_code text,
  programme_code text,
  action_code text,
  compte_numero text,
  enveloppe_id uuid REFERENCES public.enveloppes(id) ON DELETE SET NULL,
  libelle text NOT NULL,
  montant_prevu numeric NOT NULL DEFAULT 0,
  taux_croissance numeric,
  hypotheses text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_scenarios_prevision_client ON public.scenarios_prevision(client_id);
CREATE INDEX idx_scenarios_prevision_exercice_ref ON public.scenarios_prevision(exercice_reference_id);
CREATE INDEX idx_scenarios_prevision_statut ON public.scenarios_prevision(statut);
CREATE INDEX idx_lignes_prevision_scenario ON public.lignes_prevision(scenario_id);
CREATE INDEX idx_lignes_prevision_annee ON public.lignes_prevision(annee);
CREATE INDEX idx_lignes_prevision_client ON public.lignes_prevision(client_id);

-- Enable RLS
ALTER TABLE public.scenarios_prevision ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lignes_prevision ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scenarios_prevision
CREATE POLICY "Users can view own client scenarios"
ON public.scenarios_prevision
FOR SELECT
USING (
  client_id = get_user_client_id(auth.uid()) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can insert scenarios"
ON public.scenarios_prevision
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin_client'::app_role)
  OR has_role(auth.uid(), 'directeur_financier'::app_role)
);

CREATE POLICY "Admins can update scenarios"
ON public.scenarios_prevision
FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin_client'::app_role)
  OR has_role(auth.uid(), 'directeur_financier'::app_role)
);

CREATE POLICY "Super admins can delete scenarios"
ON public.scenarios_prevision
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for lignes_prevision
CREATE POLICY "Users can view own client lignes prevision"
ON public.lignes_prevision
FOR SELECT
USING (
  client_id = get_user_client_id(auth.uid()) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can insert lignes prevision"
ON public.lignes_prevision
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin_client'::app_role)
  OR has_role(auth.uid(), 'directeur_financier'::app_role)
);

CREATE POLICY "Admins can update lignes prevision"
ON public.lignes_prevision
FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin_client'::app_role)
  OR has_role(auth.uid(), 'directeur_financier'::app_role)
);

CREATE POLICY "Super admins can delete lignes prevision"
ON public.lignes_prevision
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create trigger for updated_at on scenarios_prevision
CREATE TRIGGER update_scenarios_prevision_updated_at
BEFORE UPDATE ON public.scenarios_prevision
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on lignes_prevision
CREATE TRIGGER update_lignes_prevision_updated_at
BEFORE UPDATE ON public.lignes_prevision
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();