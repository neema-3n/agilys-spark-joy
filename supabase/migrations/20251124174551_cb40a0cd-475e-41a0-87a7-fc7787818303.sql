-- =====================================================
-- PHASE 1 : CRÉATION DES TABLES DE TRÉSORERIE
-- =====================================================

-- Table des comptes de trésorerie (banques et caisses)
CREATE TABLE IF NOT EXISTS public.comptes_tresorerie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  code TEXT NOT NULL,
  libelle TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('banque', 'caisse')),
  banque TEXT,
  numero_compte TEXT,
  devise TEXT NOT NULL DEFAULT 'XOF',
  solde_initial NUMERIC NOT NULL DEFAULT 0,
  solde_actuel NUMERIC NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif', 'cloture')),
  date_ouverture DATE NOT NULL DEFAULT CURRENT_DATE,
  date_cloture DATE,
  observations TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, code)
);

-- Table des recettes (encaissements)
CREATE TABLE IF NOT EXISTS public.recettes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  exercice_id UUID NOT NULL REFERENCES public.exercices(id),
  numero TEXT NOT NULL,
  date_recette DATE NOT NULL DEFAULT CURRENT_DATE,
  montant NUMERIC NOT NULL,
  compte_destination_id UUID NOT NULL REFERENCES public.comptes_tresorerie(id),
  source_recette TEXT NOT NULL,
  categorie TEXT,
  beneficiaire TEXT,
  reference TEXT,
  libelle TEXT NOT NULL,
  observations TEXT,
  statut TEXT NOT NULL DEFAULT 'validee' CHECK (statut IN ('validee', 'annulee')),
  motif_annulation TEXT,
  date_annulation DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, numero)
);

-- Table des opérations de trésorerie
CREATE TABLE IF NOT EXISTS public.operations_tresorerie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  exercice_id UUID NOT NULL REFERENCES public.exercices(id),
  numero TEXT NOT NULL,
  date_operation DATE NOT NULL DEFAULT CURRENT_DATE,
  type_operation TEXT NOT NULL CHECK (type_operation IN ('encaissement', 'decaissement', 'transfert')),
  compte_id UUID NOT NULL REFERENCES public.comptes_tresorerie(id),
  compte_contrepartie_id UUID REFERENCES public.comptes_tresorerie(id),
  montant NUMERIC NOT NULL,
  mode_paiement TEXT,
  reference_bancaire TEXT,
  libelle TEXT NOT NULL,
  categorie TEXT,
  piece_justificative TEXT,
  
  -- Liens vers les entités source
  paiement_id UUID REFERENCES public.paiements(id),
  recette_id UUID REFERENCES public.recettes(id),
  depense_id UUID REFERENCES public.depenses(id),
  
  statut TEXT NOT NULL DEFAULT 'validee' CHECK (statut IN ('validee', 'rapprochee', 'annulee')),
  rapproche BOOLEAN NOT NULL DEFAULT false,
  date_rapprochement DATE,
  observations TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, numero)
);

-- Table des rapprochements bancaires
CREATE TABLE IF NOT EXISTS public.rapprochements_bancaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  exercice_id UUID NOT NULL REFERENCES public.exercices(id),
  numero TEXT NOT NULL,
  compte_id UUID NOT NULL REFERENCES public.comptes_tresorerie(id),
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  solde_releve NUMERIC NOT NULL,
  solde_comptable NUMERIC NOT NULL,
  ecart NUMERIC NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'valide', 'annule')),
  date_validation DATE,
  valide_par UUID REFERENCES auth.users(id),
  observations TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, numero)
);

-- =====================================================
-- INDEX POUR PERFORMANCES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_comptes_tresorerie_client ON public.comptes_tresorerie(client_id);
CREATE INDEX IF NOT EXISTS idx_comptes_tresorerie_statut ON public.comptes_tresorerie(statut);

CREATE INDEX IF NOT EXISTS idx_recettes_client_exercice ON public.recettes(client_id, exercice_id);
CREATE INDEX IF NOT EXISTS idx_recettes_compte ON public.recettes(compte_destination_id);
CREATE INDEX IF NOT EXISTS idx_recettes_date ON public.recettes(date_recette);

CREATE INDEX IF NOT EXISTS idx_operations_client_exercice ON public.operations_tresorerie(client_id, exercice_id);
CREATE INDEX IF NOT EXISTS idx_operations_compte ON public.operations_tresorerie(compte_id);
CREATE INDEX IF NOT EXISTS idx_operations_date ON public.operations_tresorerie(date_operation);
CREATE INDEX IF NOT EXISTS idx_operations_paiement ON public.operations_tresorerie(paiement_id);
CREATE INDEX IF NOT EXISTS idx_operations_recette ON public.operations_tresorerie(recette_id);

CREATE INDEX IF NOT EXISTS idx_rapprochements_client ON public.rapprochements_bancaires(client_id);
CREATE INDEX IF NOT EXISTS idx_rapprochements_compte ON public.rapprochements_bancaires(compte_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.comptes_tresorerie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recettes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_tresorerie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rapprochements_bancaires ENABLE ROW LEVEL SECURITY;

-- Policies pour comptes_tresorerie
CREATE POLICY "Users can view own client comptes tresorerie"
  ON public.comptes_tresorerie FOR SELECT
  USING (client_id = get_user_client_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert comptes tresorerie"
  ON public.comptes_tresorerie FOR INSERT
  WITH CHECK (
    (client_id = get_user_client_id(auth.uid()) AND 
     (has_role(auth.uid(), 'admin_client') OR has_role(auth.uid(), 'directeur_financier') OR has_role(auth.uid(), 'comptable')))
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Admins can update comptes tresorerie"
  ON public.comptes_tresorerie FOR UPDATE
  USING (
    (client_id = get_user_client_id(auth.uid()) AND 
     (has_role(auth.uid(), 'admin_client') OR has_role(auth.uid(), 'directeur_financier') OR has_role(auth.uid(), 'comptable')))
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Super admins can delete comptes tresorerie"
  ON public.comptes_tresorerie FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'));

-- Policies pour recettes
CREATE POLICY "Users can view own client recettes"
  ON public.recettes FOR SELECT
  USING (client_id = get_user_client_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert recettes"
  ON public.recettes FOR INSERT
  WITH CHECK (
    (client_id = get_user_client_id(auth.uid()) AND 
     (has_role(auth.uid(), 'admin_client') OR has_role(auth.uid(), 'directeur_financier') OR has_role(auth.uid(), 'comptable')))
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Admins can update recettes"
  ON public.recettes FOR UPDATE
  USING (
    (client_id = get_user_client_id(auth.uid()) AND 
     (has_role(auth.uid(), 'admin_client') OR has_role(auth.uid(), 'directeur_financier') OR has_role(auth.uid(), 'comptable')))
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Super admins can delete recettes"
  ON public.recettes FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'));

-- Policies pour operations_tresorerie
CREATE POLICY "Users can view own client operations"
  ON public.operations_tresorerie FOR SELECT
  USING (client_id = get_user_client_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert operations"
  ON public.operations_tresorerie FOR INSERT
  WITH CHECK (
    (client_id = get_user_client_id(auth.uid()) AND 
     (has_role(auth.uid(), 'admin_client') OR has_role(auth.uid(), 'directeur_financier') OR has_role(auth.uid(), 'comptable')))
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Admins can update operations"
  ON public.operations_tresorerie FOR UPDATE
  USING (
    (client_id = get_user_client_id(auth.uid()) AND 
     (has_role(auth.uid(), 'admin_client') OR has_role(auth.uid(), 'directeur_financier') OR has_role(auth.uid(), 'comptable')))
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Super admins can delete operations"
  ON public.operations_tresorerie FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'));

-- Policies pour rapprochements_bancaires
CREATE POLICY "Users can view own client rapprochements"
  ON public.rapprochements_bancaires FOR SELECT
  USING (client_id = get_user_client_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert rapprochements"
  ON public.rapprochements_bancaires FOR INSERT
  WITH CHECK (
    (client_id = get_user_client_id(auth.uid()) AND 
     (has_role(auth.uid(), 'admin_client') OR has_role(auth.uid(), 'directeur_financier') OR has_role(auth.uid(), 'comptable')))
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Admins can update rapprochements"
  ON public.rapprochements_bancaires FOR UPDATE
  USING (
    (client_id = get_user_client_id(auth.uid()) AND 
     (has_role(auth.uid(), 'admin_client') OR has_role(auth.uid(), 'directeur_financier') OR has_role(auth.uid(), 'comptable')))
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Super admins can delete rapprochements"
  ON public.rapprochements_bancaires FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'));

-- =====================================================
-- TRIGGERS POUR GESTION AUTOMATIQUE
-- =====================================================

-- Trigger pour mettre à jour le solde d'un compte après une opération
CREATE OR REPLACE FUNCTION update_compte_solde()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.statut = 'validee' THEN
    IF NEW.type_operation = 'encaissement' THEN
      UPDATE public.comptes_tresorerie 
      SET solde_actuel = solde_actuel + NEW.montant,
          updated_at = now()
      WHERE id = NEW.compte_id;
    ELSIF NEW.type_operation = 'decaissement' THEN
      UPDATE public.comptes_tresorerie 
      SET solde_actuel = solde_actuel - NEW.montant,
          updated_at = now()
      WHERE id = NEW.compte_id;
    ELSIF NEW.type_operation = 'transfert' THEN
      -- Débiter le compte source
      UPDATE public.comptes_tresorerie 
      SET solde_actuel = solde_actuel - NEW.montant,
          updated_at = now()
      WHERE id = NEW.compte_id;
      
      -- Créditer le compte destination
      UPDATE public.comptes_tresorerie 
      SET solde_actuel = solde_actuel + NEW.montant,
          updated_at = now()
      WHERE id = NEW.compte_contrepartie_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_compte_solde
  AFTER INSERT ON public.operations_tresorerie
  FOR EACH ROW
  EXECUTE FUNCTION update_compte_solde();

-- Trigger pour créer une opération automatiquement lors d'un paiement
CREATE OR REPLACE FUNCTION create_operation_from_paiement()
RETURNS TRIGGER AS $$
DECLARE
  v_compte_id UUID;
  v_numero TEXT;
  v_last_numero TEXT;
  v_next_number INT;
BEGIN
  IF NEW.statut = 'valide' AND (TG_OP = 'INSERT' OR OLD.statut != 'valide') THEN
    -- Récupérer le compte par défaut (premier compte banque actif du client)
    SELECT id INTO v_compte_id
    FROM public.comptes_tresorerie
    WHERE client_id = NEW.client_id 
      AND type = 'banque'
      AND statut = 'actif'
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF v_compte_id IS NOT NULL THEN
      -- Générer un numéro d'opération
      SELECT numero INTO v_last_numero
      FROM public.operations_tresorerie
      WHERE client_id = NEW.client_id
      ORDER BY numero DESC
      LIMIT 1
      FOR UPDATE;
      
      IF v_last_numero IS NULL THEN
        v_next_number := 1;
      ELSE
        v_next_number := (regexp_match(v_last_numero, 'OPE(\d+)$'))[1]::INT + 1;
      END IF;
      
      v_numero := 'OPE' || LPAD(v_next_number::TEXT, 6, '0');
      
      -- Créer l'opération
      INSERT INTO public.operations_tresorerie (
        client_id,
        exercice_id,
        numero,
        date_operation,
        type_operation,
        compte_id,
        montant,
        mode_paiement,
        reference_bancaire,
        libelle,
        paiement_id,
        statut,
        created_by
      ) VALUES (
        NEW.client_id,
        NEW.exercice_id,
        v_numero,
        NEW.date_paiement,
        'decaissement',
        v_compte_id,
        NEW.montant,
        NEW.mode_paiement,
        NEW.reference_paiement,
        'Paiement ' || NEW.numero,
        NEW.id,
        'validee',
        NEW.created_by
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_operation_from_paiement
  AFTER INSERT OR UPDATE ON public.paiements
  FOR EACH ROW
  EXECUTE FUNCTION create_operation_from_paiement();

-- Trigger pour créer une opération lors d'une recette
CREATE OR REPLACE FUNCTION create_operation_from_recette()
RETURNS TRIGGER AS $$
DECLARE
  v_numero TEXT;
  v_last_numero TEXT;
  v_next_number INT;
BEGIN
  IF NEW.statut = 'validee' AND (TG_OP = 'INSERT' OR OLD.statut != 'validee') THEN
    -- Générer un numéro d'opération
    SELECT numero INTO v_last_numero
    FROM public.operations_tresorerie
    WHERE client_id = NEW.client_id
    ORDER BY numero DESC
    LIMIT 1
    FOR UPDATE;
    
    IF v_last_numero IS NULL THEN
      v_next_number := 1;
    ELSE
      v_next_number := (regexp_match(v_last_numero, 'OPE(\d+)$'))[1]::INT + 1;
    END IF;
    
    v_numero := 'OPE' || LPAD(v_next_number::TEXT, 6, '0');
    
    -- Créer l'opération
    INSERT INTO public.operations_tresorerie (
      client_id,
      exercice_id,
      numero,
      date_operation,
      type_operation,
      compte_id,
      montant,
      libelle,
      categorie,
      recette_id,
      statut,
      created_by
    ) VALUES (
      NEW.client_id,
      NEW.exercice_id,
      v_numero,
      NEW.date_recette,
      'encaissement',
      NEW.compte_destination_id,
      NEW.montant,
      NEW.libelle,
      NEW.categorie,
      NEW.id,
      'validee',
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_operation_from_recette
  AFTER INSERT OR UPDATE ON public.recettes
  FOR EACH ROW
  EXECUTE FUNCTION create_operation_from_recette();