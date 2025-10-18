-- Create enveloppes table for funding envelopes
CREATE TABLE IF NOT EXISTS public.enveloppes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  exercice_id UUID NOT NULL REFERENCES public.exercices(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  nom TEXT NOT NULL,
  source_financement TEXT NOT NULL,
  montant_alloue DECIMAL(15,2) NOT NULL DEFAULT 0,
  montant_consomme DECIMAL(15,2) NOT NULL DEFAULT 0,
  statut TEXT NOT NULL CHECK (statut IN ('actif', 'cloture')) DEFAULT 'actif',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(client_id, exercice_id, code)
);

-- Enable RLS
ALTER TABLE public.enveloppes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view enveloppes"
  ON public.enveloppes FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert enveloppes"
  ON public.enveloppes FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin_client'::app_role) OR
    has_role(auth.uid(), 'directeur_financier'::app_role)
  );

CREATE POLICY "Admins can update enveloppes"
  ON public.enveloppes FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin_client'::app_role) OR
    has_role(auth.uid(), 'directeur_financier'::app_role)
  );

CREATE POLICY "Super admins can delete enveloppes"
  ON public.enveloppes FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_enveloppes_updated_at
  BEFORE UPDATE ON public.enveloppes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_enveloppes_client_exercice ON public.enveloppes(client_id, exercice_id);
CREATE INDEX idx_enveloppes_statut ON public.enveloppes(statut);