-- Créer la table engagements
CREATE TABLE public.engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  exercice_id uuid NOT NULL,
  client_id text NOT NULL,
  
  -- Lien avec réservation (optionnel mais recommandé)
  reservation_credit_id uuid REFERENCES public.reservations_credits(id) ON DELETE SET NULL,
  
  -- Données de l'engagement
  ligne_budgetaire_id uuid NOT NULL,
  objet text NOT NULL,
  montant numeric NOT NULL DEFAULT 0,
  
  -- Bénéficiaire
  fournisseur_id uuid REFERENCES public.fournisseurs(id) ON DELETE SET NULL,
  beneficiaire text,
  
  -- Projet (optionnel)
  projet_id uuid REFERENCES public.projets(id) ON DELETE SET NULL,
  
  -- Statut et dates
  statut text NOT NULL DEFAULT 'brouillon',
  -- Valeurs : brouillon, valide, engage, liquide, annule
  date_creation date NOT NULL DEFAULT CURRENT_DATE,
  date_validation date,
  
  -- Traçabilité
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Métadonnées
  motif_annulation text,
  observations text,
  
  CONSTRAINT check_statut CHECK (statut IN ('brouillon', 'valide', 'engage', 'liquide', 'annule'))
);

-- Index pour optimisation des requêtes
CREATE INDEX idx_engagements_exercice ON public.engagements(exercice_id);
CREATE INDEX idx_engagements_client ON public.engagements(client_id);
CREATE INDEX idx_engagements_reservation ON public.engagements(reservation_credit_id);
CREATE INDEX idx_engagements_statut ON public.engagements(statut);
CREATE INDEX idx_engagements_ligne_budgetaire ON public.engagements(ligne_budgetaire_id);

-- Trigger pour updated_at
CREATE TRIGGER update_engagements_updated_at
BEFORE UPDATE ON public.engagements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour marquer automatiquement la réservation comme 'utilisee'
CREATE OR REPLACE FUNCTION public.mark_reservation_as_used()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si un engagement est validé avec une réservation liée, marquer la réservation comme utilisée
  IF NEW.reservation_credit_id IS NOT NULL AND NEW.statut = 'valide' AND (TG_OP = 'INSERT' OR OLD.statut != 'valide') THEN
    UPDATE public.reservations_credits
    SET statut = 'utilisee',
        updated_at = now()
    WHERE id = NEW.reservation_credit_id
      AND statut = 'active';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_mark_reservation_used
AFTER INSERT OR UPDATE ON public.engagements
FOR EACH ROW
EXECUTE FUNCTION public.mark_reservation_as_used();

-- Enable RLS
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
-- SELECT : Utilisateurs du même client ou super_admin
CREATE POLICY "Users can view own client engagements"
ON public.engagements FOR SELECT
USING (
  (client_id = get_user_client_id(auth.uid())) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- INSERT : Chefs de service, directeurs financiers, admins
CREATE POLICY "Admins can insert engagements"
ON public.engagements FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin_client'::app_role) OR
  has_role(auth.uid(), 'directeur_financier'::app_role) OR
  has_role(auth.uid(), 'chef_service'::app_role)
);

-- UPDATE : Mêmes rôles
CREATE POLICY "Admins can update engagements"
ON public.engagements FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin_client'::app_role) OR
  has_role(auth.uid(), 'directeur_financier'::app_role) OR
  has_role(auth.uid(), 'chef_service'::app_role)
);

-- DELETE : Super admins uniquement
CREATE POLICY "Super admins can delete engagements"
ON public.engagements FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));