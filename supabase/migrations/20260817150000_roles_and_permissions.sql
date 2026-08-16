-- Politique de roles : catalogue de permissions explicites, et roles definis
-- par chaque organisation.
--
-- Constat de depart : les six roles etaient decoratifs. Les politiques RLS des
-- 30 tables metier ne distinguent que super_admin, si bien qu'un
-- operateur_saisie disposait exactement des memes droits qu'un directeur
-- financier. Cette migration pose le modele et l'outillage ; l'application par
-- les politiques fait l'objet d'un lot distinct, module par module, parce que
-- c'est elle qui peut bloquer des utilisateurs.

-- ---------------------------------------------------------------------------
-- 1. Catalogue global des permissions
-- ---------------------------------------------------------------------------
-- Le catalogue est commun a tout le produit : ce sont les gestes que
-- l'application sait faire. Ce que chaque organisation compose, ce sont les
-- roles qui les regroupent.

CREATE TABLE IF NOT EXISTS public.permissions (
  code        text PRIMARY KEY,
  module      text NOT NULL,
  action      text NOT NULL,
  libelle     text NOT NULL,
  description text,
  ordre       integer NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.permissions IS
  'Catalogue des gestes possibles, sous la forme module.action. Commun a toutes les organisations.';

INSERT INTO public.permissions (code, module, action, libelle, ordre) VALUES
  ('budgets.lire',          'budgets',       'lire',      'Consulter le budget',                 10),
  ('budgets.creer',         'budgets',       'creer',     'Créer une ligne budgétaire',          11),
  ('budgets.modifier',      'budgets',       'modifier',  'Modifier une ligne budgétaire',       12),
  ('budgets.supprimer',     'budgets',       'supprimer', 'Supprimer une ligne budgétaire',      13),
  ('budgets.valider',       'budgets',       'valider',   'Valider une modification budgétaire', 14),

  ('projets.lire',          'projets',       'lire',      'Consulter les projets',               20),
  ('projets.creer',         'projets',       'creer',     'Créer un projet',                     21),
  ('projets.modifier',      'projets',       'modifier',  'Modifier un projet',                  22),
  ('projets.supprimer',     'projets',       'supprimer', 'Supprimer un projet',                 23),

  ('reservations.lire',     'reservations',  'lire',      'Consulter les réservations',          30),
  ('reservations.creer',    'reservations',  'creer',     'Réserver un crédit',                  31),
  ('reservations.annuler',  'reservations',  'annuler',   'Annuler une réservation',             32),

  ('engagements.lire',      'engagements',   'lire',      'Consulter les engagements',           40),
  ('engagements.creer',     'engagements',   'creer',     'Créer un engagement',                 41),
  ('engagements.modifier',  'engagements',   'modifier',  'Modifier un engagement',              42),
  ('engagements.valider',   'engagements',   'valider',   'Valider un engagement',               43),
  ('engagements.annuler',   'engagements',   'annuler',   'Annuler un engagement',               44),

  ('bons_commande.lire',    'bons_commande', 'lire',      'Consulter les bons de commande',      50),
  ('bons_commande.creer',   'bons_commande', 'creer',     'Créer un bon de commande',            51),
  ('bons_commande.valider', 'bons_commande', 'valider',   'Émettre un bon de commande',          52),

  ('factures.lire',         'factures',      'lire',      'Consulter les factures',              60),
  ('factures.creer',        'factures',      'creer',     'Saisir une facture',                  61),
  ('factures.modifier',     'factures',      'modifier',  'Modifier une facture',                62),
  ('factures.valider',      'factures',      'valider',   'Valider une facture',                 63),

  ('depenses.lire',         'depenses',      'lire',      'Consulter les dépenses',              70),
  ('depenses.creer',        'depenses',      'creer',     'Saisir une dépense',                  71),
  ('depenses.modifier',     'depenses',      'modifier',  'Modifier une dépense',                72),
  ('depenses.valider',      'depenses',      'valider',   'Liquider une dépense',                73),
  ('depenses.supprimer',    'depenses',      'supprimer', 'Supprimer une dépense brouillon',     74),

  ('paiements.lire',        'paiements',     'lire',      'Consulter les paiements',             80),
  ('paiements.creer',       'paiements',     'creer',     'Préparer un paiement',                81),
  ('paiements.valider',     'paiements',     'valider',   'Décaisser un paiement',               82),

  ('fournisseurs.lire',     'fournisseurs',  'lire',      'Consulter les fournisseurs',          90),
  ('fournisseurs.gerer',    'fournisseurs',  'gerer',     'Gérer les fournisseurs',              91),

  ('tresorerie.lire',       'tresorerie',    'lire',      'Consulter la trésorerie',            100),
  ('tresorerie.gerer',      'tresorerie',    'gerer',     'Saisir les opérations de trésorerie',101),
  ('tresorerie.rapprocher', 'tresorerie',    'rapprocher','Rapprocher les comptes bancaires',   102),

  ('comptabilite.lire',     'comptabilite',  'lire',      'Consulter la comptabilité',          110),
  ('comptabilite.gerer',    'comptabilite',  'gerer',     'Tenir la comptabilité',              111),
  ('comptabilite.cloturer', 'comptabilite',  'cloturer',  'Clôturer un exercice',               112),

  ('reporting.lire',        'reporting',     'lire',      'Consulter les rapports',             120),
  ('reporting.exporter',    'reporting',     'exporter',  'Exporter les rapports',              121),

  ('parametres.lire',       'parametres',    'lire',      'Consulter les paramètres',           130),
  ('parametres.gerer',      'parametres',    'gerer',     'Modifier les paramètres',            131),

  ('utilisateurs.lire',     'utilisateurs',  'lire',      'Consulter les utilisateurs',         140),
  ('utilisateurs.gerer',    'utilisateurs',  'gerer',     'Gérer les utilisateurs et les rôles',141),

  ('audit.lire',            'audit',         'lire',      'Consulter le journal d''audit',      150)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Roles, propres a chaque organisation
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.roles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    text NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  code         text NOT NULL,
  libelle      text NOT NULL,
  description  text,
  -- Equivalence heritee. has_role() est appelee 408 fois dans les politiques
  -- existantes et raisonne sur l'enum : un role clone doit pouvoir declarer de
  -- quel role standard il derive, sinon ces politiques cesseraient de le
  -- reconnaitre.
  role_base    public.app_role,
  est_standard boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES auth.users(id),
  UNIQUE (client_id, code)
);

COMMENT ON TABLE public.roles IS
  'Roles definis par chaque organisation. Les six roles standard sont poses a la creation et peuvent etre clones puis modifies.';
COMMENT ON COLUMN public.roles.role_base IS
  'Role standard dont celui-ci derive, pour que has_role() continue de fonctionner tant que les politiques n''ont pas bascule sur les permissions.';

CREATE INDEX IF NOT EXISTS roles_client_idx ON public.roles (client_id);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id         uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);

ALTER TABLE public.user_clients
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.roles(id) ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- 3. Les six roles standard, avec separation des taches proposee
-- ---------------------------------------------------------------------------
-- Ce decoupage est une PROPOSITION : chaque organisation l'adopte, l'ajuste ou
-- clone un role pour s'en ecarter. La separation appliquee ici est celle
-- qu'attend un auditeur : celui qui saisit ne valide pas.

CREATE OR REPLACE FUNCTION public.seed_standard_roles(_client_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
BEGIN
  -- Administrateur : toutes les permissions du catalogue.
  INSERT INTO public.roles (client_id, code, libelle, description, role_base, est_standard)
  VALUES (_client_id, 'admin_client', 'Administrateur',
          'Accès complet, y compris la gestion des utilisateurs et des rôles.',
          'admin_client', true)
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_role_id;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions;
  END IF;

  -- Directeur financier : valide, mais ne saisit pas ce qu'il valide.
  INSERT INTO public.roles (client_id, code, libelle, description, role_base, est_standard)
  VALUES (_client_id, 'directeur_financier', 'Directeur financier',
          'Valide les engagements, les dépenses et les décaissements. Ne saisit pas ce qu''il valide.',
          'directeur_financier', true)
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_role_id;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
     WHERE action IN ('lire', 'exporter')
        OR code IN ('budgets.valider', 'engagements.valider', 'engagements.annuler',
                    'bons_commande.valider', 'factures.valider', 'depenses.valider',
                    'paiements.valider', 'comptabilite.cloturer', 'reservations.annuler');
  END IF;

  -- Chef de service : engage pour son service, sans valider.
  INSERT INTO public.roles (client_id, code, libelle, description, role_base, est_standard)
  VALUES (_client_id, 'chef_service', 'Chef de service',
          'Réserve des crédits et prépare les engagements. La validation revient à un autre.',
          'chef_service', true)
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_role_id;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
     WHERE action IN ('lire', 'exporter')
        OR code IN ('reservations.creer', 'engagements.creer', 'engagements.modifier',
                    'bons_commande.creer', 'projets.creer', 'projets.modifier');
  END IF;

  -- Comptable : tient la comptabilité et prépare les paiements, sans décaisser.
  INSERT INTO public.roles (client_id, code, libelle, description, role_base, est_standard)
  VALUES (_client_id, 'comptable', 'Comptable',
          'Saisit factures et dépenses, tient la comptabilité, prépare les paiements. Le décaissement revient à un autre.',
          'comptable', true)
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_role_id;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
     WHERE action IN ('lire', 'exporter')
        OR code IN ('factures.creer', 'factures.modifier',
                    'depenses.creer', 'depenses.modifier', 'depenses.supprimer',
                    'paiements.creer',
                    'comptabilite.gerer', 'tresorerie.gerer', 'tresorerie.rapprocher',
                    'fournisseurs.gerer');
  END IF;

  -- Opérateur de saisie : saisit, ne valide rien, ne supprime rien.
  INSERT INTO public.roles (client_id, code, libelle, description, role_base, est_standard)
  VALUES (_client_id, 'operateur_saisie', 'Opérateur de saisie',
          'Saisit les pièces. Aucune validation, aucune suppression.',
          'operateur_saisie', true)
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_role_id;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
     WHERE action = 'lire'
        OR code IN ('factures.creer', 'depenses.creer', 'engagements.creer',
                    'reservations.creer', 'bons_commande.creer');
  END IF;

  -- Consultation : lecture et export, rien d'autre. Utile pour un bailleur ou
  -- un auditeur externe, cas frequent dans ce metier.
  INSERT INTO public.roles (client_id, code, libelle, description, role_base, est_standard)
  VALUES (_client_id, 'lecture_seule', 'Consultation',
          'Lecture et export uniquement. Convient à un auditeur ou à un bailleur.',
          'operateur_saisie', true)
  ON CONFLICT (client_id, code) DO NOTHING
  RETURNING id INTO v_role_id;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_code)
    SELECT v_role_id, code FROM public.permissions
     WHERE action IN ('lire', 'exporter')
       AND module <> 'utilisateurs';
  END IF;
END;
$$;

-- Toute organisation creee ensuite recoit les memes roles.
CREATE OR REPLACE FUNCTION public.seed_roles_on_client_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_standard_roles(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_roles_clients ON public.clients;
CREATE TRIGGER seed_roles_clients
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.seed_roles_on_client_insert();

-- Reprise : les organisations existantes recoivent les memes roles, et les
-- rattachements en place sont raccordes au role correspondant.
DO $$
DECLARE
  v_client text;
BEGIN
  FOR v_client IN SELECT id FROM public.clients LOOP
    PERFORM public.seed_standard_roles(v_client);
  END LOOP;
END;
$$;

UPDATE public.user_clients uc
   SET role_id = r.id
  FROM public.roles r
 WHERE r.client_id = uc.client_id
   AND r.role_base = uc.role
   AND r.est_standard
   AND r.code = uc.role::text
   AND uc.role_id IS NULL;

-- ---------------------------------------------------------------------------
-- 4. Resolution des droits
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id)
      OR EXISTS (
        SELECT 1
          FROM public.user_clients uc
          JOIN public.role_permissions rp ON rp.role_id = uc.role_id
         WHERE uc.user_id = _user_id
           AND uc.statut = 'actif'
           AND uc.client_id = public.get_user_client_id(_user_id)
           AND rp.permission_code = _permission
      )
$$;

COMMENT ON FUNCTION public.has_permission(uuid, text) IS
  'Droit de l''utilisateur sur le client actif, resolu par le role porte par son rattachement.';

-- has_role continue de repondre, en s'appuyant sur le role de base : un role
-- clone reste reconnu par les politiques qui n'ont pas encore bascule.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      _role = 'super_admin'::public.app_role
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
         WHERE ur.user_id = _user_id
           AND ur.role = 'super_admin'::public.app_role
      )
    )
    OR EXISTS (
      SELECT 1
        FROM public.user_clients uc
        LEFT JOIN public.roles r ON r.id = uc.role_id
       WHERE uc.user_id = _user_id
         AND uc.statut = 'actif'
         AND uc.client_id = public.get_user_client_id(_user_id)
         AND COALESCE(r.role_base, uc.role) = _role
    )
$$;

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;

-- Le catalogue est public en lecture : c'est une liste de libelles, et le
-- masquer empecherait d'afficher la matrice des droits.
DROP POLICY IF EXISTS "Anyone can read the permission catalogue" ON public.permissions;
CREATE POLICY "Anyone can read the permission catalogue" ON public.permissions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Members read their client roles" ON public.roles;
CREATE POLICY "Members read their client roles" ON public.roles
  FOR SELECT USING (
    public.is_super_admin(auth.uid())
    OR public.user_has_client_access(auth.uid(), client_id)
  );

DROP POLICY IF EXISTS "Client admins manage roles" ON public.roles;
CREATE POLICY "Client admins manage roles" ON public.roles
  FOR ALL
  USING (public.is_super_admin(auth.uid()) OR public.is_client_admin(auth.uid(), client_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_client_admin(auth.uid(), client_id));

-- Un role standard ne se modifie pas : on le clone pour s'en ecarter. Cela
-- garantit qu'une organisation garde toujours une reference intacte.
DROP POLICY IF EXISTS "Standard roles are read only" ON public.roles;
CREATE POLICY "Standard roles are read only" ON public.roles
  AS RESTRICTIVE
  FOR UPDATE
  USING (NOT est_standard OR public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.can_manage_role(_role_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.roles r
     WHERE r.id = _role_id
       AND (public.is_super_admin(auth.uid()) OR public.is_client_admin(auth.uid(), r.client_id))
  )
$$;

CREATE OR REPLACE FUNCTION public.can_read_role(_role_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.roles r
     WHERE r.id = _role_id
       AND (public.is_super_admin(auth.uid())
            OR public.user_has_client_access(auth.uid(), r.client_id))
  )
$$;

DROP POLICY IF EXISTS "Members read role permissions" ON public.role_permissions;
CREATE POLICY "Members read role permissions" ON public.role_permissions
  FOR SELECT USING (public.can_read_role(role_id));

DROP POLICY IF EXISTS "Client admins manage role permissions" ON public.role_permissions;
CREATE POLICY "Client admins manage role permissions" ON public.role_permissions
  FOR ALL
  USING (public.can_manage_role(role_id))
  WITH CHECK (public.can_manage_role(role_id));

-- Tables sensibles : elles sont auditees comme le reste.
DROP TRIGGER IF EXISTS audit_roles ON public.roles;
CREATE TRIGGER audit_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.record_audit_entry();

DROP TRIGGER IF EXISTS audit_role_permissions ON public.role_permissions;
CREATE TRIGGER audit_role_permissions
  AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.record_audit_entry();
