-- Create fournisseurs table
CREATE TABLE public.fournisseurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  code text NOT NULL,
  nom text NOT NULL,
  nom_court text,
  type_fournisseur text NOT NULL,
  categorie text,
  
  -- Coordonnées
  email text,
  telephone text,
  telephone_mobile text,
  adresse text,
  ville text,
  pays text,
  site_web text,
  
  -- Informations légales
  numero_contribuable text,
  registre_commerce text,
  forme_juridique text,
  
  -- Informations bancaires
  banque text,
  numero_compte text,
  code_swift text,
  iban text,
  
  -- Informations commerciales
  conditions_paiement text,
  delai_livraison_moyen integer,
  note_evaluation numeric,
  
  -- Suivi
  statut text NOT NULL DEFAULT 'actif',
  date_premiere_collaboration date,
  dernier_engagement_date date,
  montant_total_engage numeric DEFAULT 0,
  nombre_engagements integer DEFAULT 0,
  
  -- Personne de contact
  contact_nom text,
  contact_prenom text,
  contact_fonction text,
  contact_email text,
  contact_telephone text,
  
  -- Notes
  commentaires text,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(client_id, code)
);

-- Create indexes
CREATE INDEX idx_fournisseurs_client ON public.fournisseurs(client_id);
CREATE INDEX idx_fournisseurs_statut ON public.fournisseurs(statut);
CREATE INDEX idx_fournisseurs_categorie ON public.fournisseurs(categorie);
CREATE INDEX idx_fournisseurs_nom ON public.fournisseurs(nom);

-- Create trigger for updated_at
CREATE TRIGGER update_fournisseurs_updated_at
  BEFORE UPDATE ON public.fournisseurs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.fournisseurs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own client fournisseurs"
  ON public.fournisseurs FOR SELECT
  TO authenticated
  USING (
    client_id = get_user_client_id(auth.uid())
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admins can insert fournisseurs"
  ON public.fournisseurs FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_client'::app_role)
    OR has_role(auth.uid(), 'directeur_financier'::app_role)
    OR has_role(auth.uid(), 'comptable'::app_role)
  );

CREATE POLICY "Admins can update fournisseurs"
  ON public.fournisseurs FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_client'::app_role)
    OR has_role(auth.uid(), 'directeur_financier'::app_role)
    OR has_role(auth.uid(), 'comptable'::app_role)
  );

CREATE POLICY "Super admins can delete fournisseurs"
  ON public.fournisseurs FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));