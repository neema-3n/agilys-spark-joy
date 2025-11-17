-- Create factures table
CREATE TABLE public.factures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  exercice_id UUID NOT NULL REFERENCES public.exercices(id),
  numero TEXT NOT NULL,
  date_facture DATE NOT NULL DEFAULT CURRENT_DATE,
  date_echeance DATE,
  fournisseur_id UUID NOT NULL REFERENCES public.fournisseurs(id),
  bon_commande_id UUID REFERENCES public.bons_commande(id),
  engagement_id UUID REFERENCES public.engagements(id),
  ligne_budgetaire_id UUID REFERENCES public.lignes_budgetaires(id),
  projet_id UUID REFERENCES public.projets(id),
  objet TEXT NOT NULL,
  numero_facture_fournisseur TEXT,
  montant_ht NUMERIC NOT NULL DEFAULT 0,
  montant_tva NUMERIC NOT NULL DEFAULT 0,
  montant_ttc NUMERIC NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'brouillon',
  date_validation DATE,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  
  CONSTRAINT factures_client_numero_unique UNIQUE(client_id, numero),
  CONSTRAINT factures_statut_check CHECK (statut IN ('brouillon', 'validee', 'payee', 'annulee'))
);

-- Enable RLS
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for factures
CREATE POLICY "Users can view own client factures"
  ON public.factures FOR SELECT
  USING (
    client_id = get_user_client_id(auth.uid()) 
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admins can insert factures"
  ON public.factures FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_client'::app_role)
    OR has_role(auth.uid(), 'directeur_financier'::app_role)
    OR has_role(auth.uid(), 'chef_service'::app_role)
    OR has_role(auth.uid(), 'comptable'::app_role)
  );

CREATE POLICY "Admins can update factures"
  ON public.factures FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_client'::app_role)
    OR has_role(auth.uid(), 'directeur_financier'::app_role)
    OR has_role(auth.uid(), 'chef_service'::app_role)
    OR has_role(auth.uid(), 'comptable'::app_role)
  );

CREATE POLICY "Super admins can delete factures"
  ON public.factures FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_factures_updated_at
  BEFORE UPDATE ON public.factures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to validate dates
CREATE OR REPLACE FUNCTION public.check_facture_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que la date d'échéance est >= date de facture
  IF NEW.date_echeance IS NOT NULL 
     AND NEW.date_echeance < NEW.date_facture THEN
    RAISE EXCEPTION 'La date d''échéance (%) ne peut pas être antérieure à la date de facture (%)',
      NEW.date_echeance, NEW.date_facture;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_facture_dates_trigger
  BEFORE INSERT OR UPDATE ON public.factures
  FOR EACH ROW
  EXECUTE FUNCTION public.check_facture_dates();

-- Create indexes for better performance
CREATE INDEX idx_factures_client_id ON public.factures(client_id);
CREATE INDEX idx_factures_exercice_id ON public.factures(exercice_id);
CREATE INDEX idx_factures_fournisseur_id ON public.factures(fournisseur_id);
CREATE INDEX idx_factures_bon_commande_id ON public.factures(bon_commande_id);
CREATE INDEX idx_factures_statut ON public.factures(statut);
CREATE INDEX idx_factures_date_facture ON public.factures(date_facture);