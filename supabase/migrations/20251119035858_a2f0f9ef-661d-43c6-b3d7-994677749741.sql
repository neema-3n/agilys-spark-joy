-- Fix multi-tenant isolation vulnerability
-- Add client_id validation to all INSERT and UPDATE policies

-- ============================================
-- ACTIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Admins can insert actions" ON public.actions;
CREATE POLICY "Admins can insert actions"
  ON public.actions FOR INSERT
  WITH CHECK (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update actions" ON public.actions;
CREATE POLICY "Admins can update actions"
  ON public.actions FOR UPDATE
  USING (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ============================================
-- BONS_COMMANDE TABLE
-- ============================================
DROP POLICY IF EXISTS "Admins can insert bons commande" ON public.bons_commande;
CREATE POLICY "Admins can insert bons commande"
  ON public.bons_commande FOR INSERT
  WITH CHECK (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role) OR
       has_role(auth.uid(), 'chef_service'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update bons commande" ON public.bons_commande;
CREATE POLICY "Admins can update bons commande"
  ON public.bons_commande FOR UPDATE
  USING (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role) OR
       has_role(auth.uid(), 'chef_service'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ============================================
-- COMPTES TABLE
-- ============================================
DROP POLICY IF EXISTS "Admins can insert comptes" ON public.comptes;
CREATE POLICY "Admins can insert comptes"
  ON public.comptes FOR INSERT
  WITH CHECK (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role) OR
       has_role(auth.uid(), 'comptable'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update comptes" ON public.comptes;
CREATE POLICY "Admins can update comptes"
  ON public.comptes FOR UPDATE
  USING (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role) OR
       has_role(auth.uid(), 'comptable'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ============================================
-- ENGAGEMENTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Admins can insert engagements" ON public.engagements;
CREATE POLICY "Admins can insert engagements"
  ON public.engagements FOR INSERT
  WITH CHECK (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role) OR
       has_role(auth.uid(), 'chef_service'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update engagements" ON public.engagements;
CREATE POLICY "Admins can update engagements"
  ON public.engagements FOR UPDATE
  USING (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role) OR
       has_role(auth.uid(), 'chef_service'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ============================================
-- ENVELOPPES TABLE
-- ============================================
DROP POLICY IF EXISTS "Admins can insert enveloppes" ON public.enveloppes;
CREATE POLICY "Admins can insert enveloppes"
  ON public.enveloppes FOR INSERT
  WITH CHECK (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update enveloppes" ON public.enveloppes;
CREATE POLICY "Admins can update enveloppes"
  ON public.enveloppes FOR UPDATE
  USING (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ============================================
-- EXERCICES TABLE
-- ============================================
DROP POLICY IF EXISTS "Admins can insert exercices" ON public.exercices;
CREATE POLICY "Admins can insert exercices"
  ON public.exercices FOR INSERT
  WITH CHECK (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update exercices" ON public.exercices;
CREATE POLICY "Admins can update exercices"
  ON public.exercices FOR UPDATE
  USING (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ============================================
-- FACTURES TABLE
-- ============================================
DROP POLICY IF EXISTS "Admins can insert factures" ON public.factures;
CREATE POLICY "Admins can insert factures"
  ON public.factures FOR INSERT
  WITH CHECK (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role) OR
       has_role(auth.uid(), 'chef_service'::app_role) OR
       has_role(auth.uid(), 'comptable'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update factures" ON public.factures;
CREATE POLICY "Admins can update factures"
  ON public.factures FOR UPDATE
  USING (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role) OR
       has_role(auth.uid(), 'chef_service'::app_role) OR
       has_role(auth.uid(), 'comptable'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ============================================
-- FOURNISSEURS TABLE
-- ============================================
DROP POLICY IF EXISTS "Admins can insert fournisseurs" ON public.fournisseurs;
CREATE POLICY "Admins can insert fournisseurs"
  ON public.fournisseurs FOR INSERT
  WITH CHECK (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role) OR
       has_role(auth.uid(), 'comptable'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update fournisseurs" ON public.fournisseurs;
CREATE POLICY "Admins can update fournisseurs"
  ON public.fournisseurs FOR UPDATE
  USING (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role) OR
       has_role(auth.uid(), 'comptable'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ============================================
-- LIGNES_BUDGETAIRES TABLE
-- ============================================
DROP POLICY IF EXISTS "Admins can insert lignes budgetaires" ON public.lignes_budgetaires;
CREATE POLICY "Admins can insert lignes budgetaires"
  ON public.lignes_budgetaires FOR INSERT
  WITH CHECK (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update lignes budgetaires" ON public.lignes_budgetaires;
CREATE POLICY "Admins can update lignes budgetaires"
  ON public.lignes_budgetaires FOR UPDATE
  USING (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ============================================
-- LIGNES_PREVISION TABLE
-- ============================================
DROP POLICY IF EXISTS "Admins can insert lignes prevision" ON public.lignes_prevision;
CREATE POLICY "Admins can insert lignes prevision"
  ON public.lignes_prevision FOR INSERT
  WITH CHECK (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update lignes prevision" ON public.lignes_prevision;
CREATE POLICY "Admins can update lignes prevision"
  ON public.lignes_prevision FOR UPDATE
  USING (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ============================================
-- MODIFICATIONS_BUDGETAIRES TABLE
-- ============================================
DROP POLICY IF EXISTS "Admins can insert modifications" ON public.modifications_budgetaires;
CREATE POLICY "Admins can insert modifications"
  ON public.modifications_budgetaires FOR INSERT
  WITH CHECK (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update modifications" ON public.modifications_budgetaires;
CREATE POLICY "Admins can update modifications"
  ON public.modifications_budgetaires FOR UPDATE
  USING (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ============================================
-- PARAMETRES_REFERENTIELS TABLE
-- ============================================
DROP POLICY IF EXISTS "Admins can insert referentiels" ON public.parametres_referentiels;
CREATE POLICY "Admins can insert referentiels"
  ON public.parametres_referentiels FOR INSERT
  WITH CHECK (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update referentiels" ON public.parametres_referentiels;
CREATE POLICY "Admins can update referentiels"
  ON public.parametres_referentiels FOR UPDATE
  USING (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ============================================
-- PROGRAMMES TABLE
-- ============================================
DROP POLICY IF EXISTS "Admins can insert programmes" ON public.programmes;
CREATE POLICY "Admins can insert programmes"
  ON public.programmes FOR INSERT
  WITH CHECK (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update programmes" ON public.programmes;
CREATE POLICY "Admins can update programmes"
  ON public.programmes FOR UPDATE
  USING (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ============================================
-- PROJETS TABLE
-- ============================================
DROP POLICY IF EXISTS "Admins can insert projets" ON public.projets;
CREATE POLICY "Admins can insert projets"
  ON public.projets FOR INSERT
  WITH CHECK (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role) OR
       has_role(auth.uid(), 'chef_service'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update projets" ON public.projets;
CREATE POLICY "Admins can update projets"
  ON public.projets FOR UPDATE
  USING (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role) OR
       has_role(auth.uid(), 'chef_service'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ============================================
-- RESERVATIONS_CREDITS TABLE
-- ============================================
DROP POLICY IF EXISTS "Admins can insert reservations" ON public.reservations_credits;
CREATE POLICY "Admins can insert reservations"
  ON public.reservations_credits FOR INSERT
  WITH CHECK (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role) OR
       has_role(auth.uid(), 'chef_service'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update reservations" ON public.reservations_credits;
CREATE POLICY "Admins can update reservations"
  ON public.reservations_credits FOR UPDATE
  USING (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role) OR
       has_role(auth.uid(), 'chef_service'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ============================================
-- SCENARIOS_PREVISION TABLE
-- ============================================
DROP POLICY IF EXISTS "Admins can insert scenarios" ON public.scenarios_prevision;
CREATE POLICY "Admins can insert scenarios"
  ON public.scenarios_prevision FOR INSERT
  WITH CHECK (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update scenarios" ON public.scenarios_prevision;
CREATE POLICY "Admins can update scenarios"
  ON public.scenarios_prevision FOR UPDATE
  USING (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ============================================
-- SECTIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Admins can insert sections" ON public.sections;
CREATE POLICY "Admins can insert sections"
  ON public.sections FOR INSERT
  WITH CHECK (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update sections" ON public.sections;
CREATE POLICY "Admins can update sections"
  ON public.sections FOR UPDATE
  USING (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ============================================
-- STRUCTURES TABLE
-- ============================================
DROP POLICY IF EXISTS "Admins can insert structures" ON public.structures;
CREATE POLICY "Admins can insert structures"
  ON public.structures FOR INSERT
  WITH CHECK (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update structures" ON public.structures;
CREATE POLICY "Admins can update structures"
  ON public.structures FOR UPDATE
  USING (
    (
      client_id = get_user_client_id(auth.uid()) AND
      (has_role(auth.uid(), 'admin_client'::app_role) OR
       has_role(auth.uid(), 'directeur_financier'::app_role))
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );