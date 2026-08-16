-- Lot 2 : bascule du perimetre sur le client actif du jeton.
--
-- 93 politiques RLS appellent get_user_client_id() et 408 appellent has_role().
-- Les reecrire une par une serait long et surtout dangereux : une seule erreur
-- et des donnees fuient d'un client a l'autre. On change donc le CORPS des deux
-- fonctions, pas leurs appelants.
--
-- Compatibilite ascendante : tant que le frontend n'a pas pose de client actif
-- dans le jeton, les fonctions se replient sur l'appartenance unique de
-- l'utilisateur. Sans ce repli, tous les comptes existants perdraient l'acces
-- a la seconde ou cette migration est appliquee.

-- ---------------------------------------------------------------------------
-- 1. Lecture du client actif porte par le jeton
-- ---------------------------------------------------------------------------
-- app_metadata est ecrit par le serveur (edge function avec la cle service_role)
-- et signe dans le JWT : un utilisateur ne peut pas le falsifier depuis le
-- navigateur, contrairement a user_metadata.

CREATE OR REPLACE FUNCTION public.jwt_active_client_id()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT nullif(auth.jwt() -> 'app_metadata' ->> 'active_client_id', '')
$$;

COMMENT ON FUNCTION public.jwt_active_client_id() IS
  'Client actif porte par le jeton. NULL tant que l''utilisateur n''en a pas choisi un.';

-- ---------------------------------------------------------------------------
-- 2. get_user_client_id : perimetre effectif de l'utilisateur
-- ---------------------------------------------------------------------------
-- Trois cas, dans cet ordre :
--   a. le jeton porte un client actif et l'utilisateur y a acces -> ce client
--   b. pas de client actif mais une seule appartenance          -> celle-ci
--   c. pas de client actif et plusieurs appartenances           -> NULL
-- Le cas (c) est volontaire : mieux vaut ne rien montrer que de choisir un
-- client au hasard pour l'utilisateur.
--
-- Un client suspendu reste retourne ici : la suspension est une lecture seule,
-- pas une coupure d'acces. C'est le garde en ecriture (section 4) qui l'applique.

CREATE OR REPLACE FUNCTION public.get_user_client_id(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- (a) client actif du jeton, valide contre les appartenances reelles
    (SELECT uc.client_id
       FROM public.user_clients uc
       JOIN public.clients c ON c.id = uc.client_id
      WHERE uc.user_id = get_user_client_id.user_id
        AND uc.statut = 'actif'
        AND c.statut <> 'resilie'
        AND uc.client_id = public.jwt_active_client_id()
      LIMIT 1),
    -- (b) repli : appartenance unique. min() plutot qu'une simple projection,
    -- car HAVING impose une requete agregee ; la clause ne renvoie donc une
    -- valeur que s'il existe exactement une appartenance.
    (SELECT min(uc.client_id)
       FROM public.user_clients uc
       JOIN public.clients c ON c.id = uc.client_id
      WHERE uc.user_id = get_user_client_id.user_id
        AND uc.statut = 'actif'
        AND c.statut <> 'resilie'
     HAVING count(*) = 1)
  )
$$;

COMMENT ON FUNCTION public.get_user_client_id(uuid) IS
  'Client actif de l''utilisateur. Repli sur l''appartenance unique tant qu''aucun client actif n''est pose dans le jeton.';

-- ---------------------------------------------------------------------------
-- 3. has_role : le role devient relatif au client actif
-- ---------------------------------------------------------------------------
-- Un utilisateur peut etre comptable chez un client et directeur financier
-- chez un autre. Le role global de user_roles reste consulte : il porte
-- super_admin, qui n'est rattache a aucun client.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- user_roles ne fait plus autorite que pour super_admin, seul role qui
    -- reste global. Les autres roles y subsistent apres la reprise du lot 1 :
    -- les honorer ici les ferait fuir sur TOUS les clients d'un utilisateur
    -- multi-client, qui serait alors directeur financier partout des lors
    -- qu'il l'etait quelque part.
    (
      _role = 'super_admin'::public.app_role
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
         WHERE ur.user_id = _user_id
           AND ur.role = 'super_admin'::public.app_role
      )
    )
    -- role porte par l'appartenance au client actif
    OR EXISTS (
      SELECT 1 FROM public.user_clients uc
       WHERE uc.user_id = _user_id
         AND uc.role = _role
         AND uc.statut = 'actif'
         AND uc.client_id = public.get_user_client_id(_user_id)
    )
$$;

COMMENT ON FUNCTION public.has_role(uuid, public.app_role) IS
  'Role relatif au client actif. Seul super_admin reste global, via user_roles.';

-- ---------------------------------------------------------------------------
-- 4. Suspension d'abonnement : lecture seule
-- ---------------------------------------------------------------------------
-- Applique par trigger et non par les 138 politiques d'ecriture : un seul
-- point de verite, et aucune politique existante n'est touchee.
-- Les SELECT ne declenchent aucun trigger : la consultation et les exports
-- restent donc possibles, ce qui est l'intention d'un abonnement suspendu.

CREATE OR REPLACE FUNCTION public.enforce_client_not_suspended()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id text;
  v_statut    text;
BEGIN
  v_client_id := COALESCE(to_jsonb(NEW) ->> 'client_id', to_jsonb(OLD) ->> 'client_id');

  IF v_client_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT statut INTO v_statut FROM public.clients WHERE id = v_client_id;

  IF v_statut IN ('suspendu', 'resilie') THEN
    RAISE EXCEPTION
      'Abonnement % pour ce client : les donnees restent consultables et exportables, mais aucune modification n''est possible.',
      CASE v_statut WHEN 'suspendu' THEN 'suspendu' ELSE 'resilie' END
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  v_table text;
BEGIN
  FOR v_table IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND a.attname = 'client_id'
       AND a.attnum > 0
       AND NOT a.attisdropped
       AND c.relname NOT IN ('audit_log', 'clients', 'user_clients', 'profiles')
     ORDER BY c.relname
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS suspension_guard_%1$s ON public.%1$I', v_table);
    EXECUTE format(
      'CREATE TRIGGER suspension_guard_%1$s
         BEFORE INSERT OR UPDATE OR DELETE ON public.%1$I
         FOR EACH ROW EXECUTE FUNCTION public.enforce_client_not_suspended()',
      v_table
    );
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Liste des clients accessibles a l'utilisateur
-- ---------------------------------------------------------------------------
-- Alimente l'ecran de selection apres connexion et le menu deroulant d'en-tete.

CREATE OR REPLACE FUNCTION public.my_clients()
RETURNS TABLE (
  id           text,
  nom          text,
  code         text,
  pays         text,
  devise       text,
  statut       text,
  money_format jsonb,
  role         public.app_role,
  is_active    boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.nom, c.code, c.pays, c.devise, c.statut, c.money_format,
         uc.role,
         c.id = public.jwt_active_client_id()
    FROM public.clients c
    JOIN public.user_clients uc ON uc.client_id = c.id
   WHERE uc.user_id = auth.uid()
     AND uc.statut = 'actif'
     AND c.statut <> 'resilie'
   ORDER BY c.nom
$$;

GRANT EXECUTE ON FUNCTION public.my_clients() TO authenticated;
