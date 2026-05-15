-- Referentiel fiscal
CREATE TABLE IF NOT EXISTS public.taxes_fiscales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  code TEXT NOT NULL,
  libelle TEXT NOT NULL,
  description TEXT,
  nature TEXT NOT NULL,
  sens_defaut TEXT NOT NULL,
  taux_defaut NUMERIC,
  montant_fixe_defaut NUMERIC,
  compte_comptable_id UUID REFERENCES public.comptes(id) ON DELETE SET NULL,
  ordre INTEGER NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT true,
  date_debut_validite DATE,
  date_fin_validite DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT taxes_fiscales_client_code_unique UNIQUE (client_id, code),
  CONSTRAINT taxes_fiscales_nature_check CHECK (nature IN ('taxe', 'retenue', 'redevance', 'frais', 'autre')),
  CONSTRAINT taxes_fiscales_sens_check CHECK (sens_defaut IN ('ajout', 'retrait'))
);

ALTER TABLE public.taxes_fiscales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client taxes fiscales"
ON public.taxes_fiscales
FOR SELECT
USING (
  client_id = get_user_client_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can insert taxes fiscales"
ON public.taxes_fiscales
FOR INSERT
WITH CHECK (
  (
    client_id = get_user_client_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin_client'::app_role)
      OR has_role(auth.uid(), 'directeur_financier'::app_role)
      OR has_role(auth.uid(), 'comptable'::app_role)
    )
  ) OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can update taxes fiscales"
ON public.taxes_fiscales
FOR UPDATE
USING (
  (
    client_id = get_user_client_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin_client'::app_role)
      OR has_role(auth.uid(), 'directeur_financier'::app_role)
      OR has_role(auth.uid(), 'comptable'::app_role)
    )
  ) OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Super admins can delete taxes fiscales"
ON public.taxes_fiscales
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP TRIGGER IF EXISTS update_taxes_fiscales_updated_at ON public.taxes_fiscales;
CREATE TRIGGER update_taxes_fiscales_updated_at
BEFORE UPDATE ON public.taxes_fiscales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Modeles fiscaux
CREATE TABLE IF NOT EXISTS public.modeles_fiscaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  code TEXT NOT NULL,
  libelle TEXT NOT NULL,
  description TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  ordre INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT modeles_fiscaux_client_code_unique UNIQUE (client_id, code)
);

ALTER TABLE public.modeles_fiscaux ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client modeles fiscaux"
ON public.modeles_fiscaux
FOR SELECT
USING (
  client_id = get_user_client_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can insert modeles fiscaux"
ON public.modeles_fiscaux
FOR INSERT
WITH CHECK (
  (
    client_id = get_user_client_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin_client'::app_role)
      OR has_role(auth.uid(), 'directeur_financier'::app_role)
      OR has_role(auth.uid(), 'comptable'::app_role)
    )
  ) OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can update modeles fiscaux"
ON public.modeles_fiscaux
FOR UPDATE
USING (
  (
    client_id = get_user_client_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin_client'::app_role)
      OR has_role(auth.uid(), 'directeur_financier'::app_role)
      OR has_role(auth.uid(), 'comptable'::app_role)
    )
  ) OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Super admins can delete modeles fiscaux"
ON public.modeles_fiscaux
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP TRIGGER IF EXISTS update_modeles_fiscaux_updated_at ON public.modeles_fiscaux;
CREATE TRIGGER update_modeles_fiscaux_updated_at
BEFORE UPDATE ON public.modeles_fiscaux
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.modele_fiscal_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modele_fiscal_id UUID NOT NULL REFERENCES public.modeles_fiscaux(id) ON DELETE CASCADE,
  taxe_fiscale_id UUID NOT NULL REFERENCES public.taxes_fiscales(id) ON DELETE RESTRICT,
  ordre INTEGER NOT NULL DEFAULT 0,
  taux_defaut_override NUMERIC,
  montant_defaut_override NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT modele_fiscal_lignes_modele_ordre_unique UNIQUE (modele_fiscal_id, ordre)
);

ALTER TABLE public.modele_fiscal_lignes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client modele fiscal lignes"
ON public.modele_fiscal_lignes
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.modeles_fiscaux mf
    WHERE mf.id = modele_fiscal_id
      AND (
        mf.client_id = get_user_client_id(auth.uid())
        OR has_role(auth.uid(), 'super_admin'::app_role)
      )
  )
);

CREATE POLICY "Admins can insert modele fiscal lignes"
ON public.modele_fiscal_lignes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.modeles_fiscaux mf
    WHERE mf.id = modele_fiscal_id
      AND (
        (
          mf.client_id = get_user_client_id(auth.uid())
          AND (
            has_role(auth.uid(), 'admin_client'::app_role)
            OR has_role(auth.uid(), 'directeur_financier'::app_role)
            OR has_role(auth.uid(), 'comptable'::app_role)
          )
        ) OR has_role(auth.uid(), 'super_admin'::app_role)
      )
  )
);

CREATE POLICY "Admins can update modele fiscal lignes"
ON public.modele_fiscal_lignes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.modeles_fiscaux mf
    WHERE mf.id = modele_fiscal_id
      AND (
        (
          mf.client_id = get_user_client_id(auth.uid())
          AND (
            has_role(auth.uid(), 'admin_client'::app_role)
            OR has_role(auth.uid(), 'directeur_financier'::app_role)
            OR has_role(auth.uid(), 'comptable'::app_role)
          )
        ) OR has_role(auth.uid(), 'super_admin'::app_role)
      )
  )
);

CREATE POLICY "Super admins can delete modele fiscal lignes"
ON public.modele_fiscal_lignes
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP TRIGGER IF EXISTS update_modele_fiscal_lignes_updated_at ON public.modele_fiscal_lignes;
CREATE TRIGGER update_modele_fiscal_lignes_updated_at
BEFORE UPDATE ON public.modele_fiscal_lignes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
