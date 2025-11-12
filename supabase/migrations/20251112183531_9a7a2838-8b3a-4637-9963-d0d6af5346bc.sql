-- Créer la table des réservations de crédits
CREATE TABLE public.reservations_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL,
  exercice_id UUID NOT NULL,
  ligne_budgetaire_id UUID NOT NULL,
  montant NUMERIC NOT NULL DEFAULT 0,
  objet TEXT NOT NULL,
  beneficiaire TEXT,
  date_reservation DATE NOT NULL DEFAULT CURRENT_DATE,
  date_expiration DATE,
  statut TEXT NOT NULL DEFAULT 'active',
  motif_annulation TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  client_id TEXT NOT NULL,
  CONSTRAINT reservations_credits_statut_check CHECK (statut IN ('active', 'utilisee', 'annulee', 'expiree'))
);

-- Activer RLS
ALTER TABLE public.reservations_credits ENABLE ROW LEVEL SECURITY;

-- Politique de lecture
CREATE POLICY "Users can view own client reservations"
ON public.reservations_credits
FOR SELECT
USING (
  (client_id = get_user_client_id(auth.uid())) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Politique d'insertion
CREATE POLICY "Admins can insert reservations"
ON public.reservations_credits
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin_client'::app_role) 
  OR has_role(auth.uid(), 'directeur_financier'::app_role)
  OR has_role(auth.uid(), 'chef_service'::app_role)
);

-- Politique de mise à jour
CREATE POLICY "Admins can update reservations"
ON public.reservations_credits
FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin_client'::app_role) 
  OR has_role(auth.uid(), 'directeur_financier'::app_role)
  OR has_role(auth.uid(), 'chef_service'::app_role)
);

-- Politique de suppression
CREATE POLICY "Super admins can delete reservations"
ON public.reservations_credits
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Créer un index pour améliorer les performances
CREATE INDEX idx_reservations_credits_exercice ON public.reservations_credits(exercice_id);
CREATE INDEX idx_reservations_credits_ligne ON public.reservations_credits(ligne_budgetaire_id);
CREATE INDEX idx_reservations_credits_client ON public.reservations_credits(client_id);
CREATE INDEX idx_reservations_credits_statut ON public.reservations_credits(statut);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_reservations_credits_updated_at
BEFORE UPDATE ON public.reservations_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();