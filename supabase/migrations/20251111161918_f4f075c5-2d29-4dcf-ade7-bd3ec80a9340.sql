-- Créer la table lignes_budgetaires
CREATE TABLE public.lignes_budgetaires (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id text NOT NULL,
  exercice_id uuid NOT NULL,
  action_id uuid NOT NULL,
  compte_id uuid NOT NULL,
  libelle text NOT NULL,
  montant_initial numeric NOT NULL DEFAULT 0,
  montant_modifie numeric NOT NULL DEFAULT 0,
  montant_engage numeric NOT NULL DEFAULT 0,
  montant_paye numeric NOT NULL DEFAULT 0,
  disponible numeric NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'actif',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT lignes_budgetaires_statut_check CHECK (statut IN ('actif', 'cloture'))
);

-- Index pour améliorer les performances
CREATE INDEX idx_lignes_budgetaires_exercice ON public.lignes_budgetaires(exercice_id);
CREATE INDEX idx_lignes_budgetaires_client ON public.lignes_budgetaires(client_id);
CREATE INDEX idx_lignes_budgetaires_action ON public.lignes_budgetaires(action_id);

-- Enable RLS
ALTER TABLE public.lignes_budgetaires ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour lignes_budgetaires
CREATE POLICY "Users can view own client lignes budgetaires"
  ON public.lignes_budgetaires
  FOR SELECT
  USING (
    client_id = get_user_client_id(auth.uid()) 
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admins can insert lignes budgetaires"
  ON public.lignes_budgetaires
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) 
    OR has_role(auth.uid(), 'admin_client'::app_role)
    OR has_role(auth.uid(), 'directeur_financier'::app_role)
  );

CREATE POLICY "Admins can update lignes budgetaires"
  ON public.lignes_budgetaires
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_client'::app_role)
    OR has_role(auth.uid(), 'directeur_financier'::app_role)
  );

CREATE POLICY "Super admins can delete lignes budgetaires"
  ON public.lignes_budgetaires
  FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_lignes_budgetaires_updated_at
  BEFORE UPDATE ON public.lignes_budgetaires
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Créer la table modifications_budgetaires
CREATE TABLE public.modifications_budgetaires (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id text NOT NULL,
  exercice_id uuid NOT NULL,
  numero text NOT NULL,
  type text NOT NULL,
  ligne_source_id uuid,
  ligne_destination_id uuid NOT NULL,
  montant numeric NOT NULL,
  motif text NOT NULL,
  statut text NOT NULL DEFAULT 'brouillon',
  date_creation date NOT NULL DEFAULT CURRENT_DATE,
  date_validation date,
  valide_par uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT modifications_budgetaires_type_check CHECK (type IN ('augmentation', 'diminution', 'virement')),
  CONSTRAINT modifications_budgetaires_statut_check CHECK (statut IN ('brouillon', 'en_attente', 'validee', 'rejetee'))
);

-- Index pour améliorer les performances
CREATE INDEX idx_modifications_budgetaires_exercice ON public.modifications_budgetaires(exercice_id);
CREATE INDEX idx_modifications_budgetaires_client ON public.modifications_budgetaires(client_id);
CREATE INDEX idx_modifications_budgetaires_statut ON public.modifications_budgetaires(statut);

-- Enable RLS
ALTER TABLE public.modifications_budgetaires ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour modifications_budgetaires
CREATE POLICY "Users can view own client modifications"
  ON public.modifications_budgetaires
  FOR SELECT
  USING (
    client_id = get_user_client_id(auth.uid())
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admins can insert modifications"
  ON public.modifications_budgetaires
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_client'::app_role)
    OR has_role(auth.uid(), 'directeur_financier'::app_role)
  );

CREATE POLICY "Admins can update modifications"
  ON public.modifications_budgetaires
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_client'::app_role)
    OR has_role(auth.uid(), 'directeur_financier'::app_role)
  );

CREATE POLICY "Super admins can delete modifications"
  ON public.modifications_budgetaires
  FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_modifications_budgetaires_updated_at
  BEFORE UPDATE ON public.modifications_budgetaires
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();