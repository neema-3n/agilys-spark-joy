-- Lot 1 : referentiel des clients et rattachement multi-client des utilisateurs.
--
-- Cette migration est volontairement NON BREAKING : elle cree les tables et
-- reprend les donnees existantes, sans modifier get_user_client_id() ni
-- has_role(). Le comportement de l'application reste strictement identique
-- apres son application. La bascule des fonctions fait l'objet du lot 2.

-- ---------------------------------------------------------------------------
-- 1. Referentiel des clients
-- ---------------------------------------------------------------------------
-- La cle primaire est en text, pas en uuid : les 30 tables metier portent deja
-- un client_id text ('client-1', ...). Un passage en uuid imposerait de migrer
-- 99 colonnes de donnees vivantes, pour un gain purement esthetique.

CREATE TABLE IF NOT EXISTS public.clients (
  id           text PRIMARY KEY,
  nom          text NOT NULL,
  code         text NOT NULL UNIQUE,
  pays         text NOT NULL DEFAULT '',
  devise       text NOT NULL DEFAULT 'XOF',
  statut       text NOT NULL DEFAULT 'actif'
                 CHECK (statut IN ('actif', 'suspendu', 'resilie')),
  money_format jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.clients IS
  'Referentiel des organisations clientes. statut=suspendu place le client en lecture seule (abonnement impaye).';
COMMENT ON COLUMN public.clients.money_format IS
  'Format d''affichage des montants. Etait stocke en memoire cote frontend et perdu a chaque rechargement.';

-- Reprise des trois clients jusqu'ici codes en dur dans clients.mock.ts.
INSERT INTO public.clients (id, nom, code, pays, devise, statut, money_format) VALUES
  ('client-1', 'CAP CUE', 'CPN-2024', 'Cameroun', 'XAF', 'actif',
   '{"locale":"fr-FR","currencyCode":"XAF","thousandsSeparator":"space","decimalSeparator":"comma","minimumFractionDigits":0,"maximumFractionDigits":0}'::jsonb),
  ('client-2', 'Mairie de Cotonou', 'MCO-2024', 'Benin', 'XOF', 'actif',
   '{"locale":"fr-FR","currencyCode":"XOF","thousandsSeparator":"space","decimalSeparator":"comma","minimumFractionDigits":0,"maximumFractionDigits":0}'::jsonb),
  ('client-3', 'Conseil Departemental du Littoral', 'CDL-2024', 'Benin', 'XOF', 'actif',
   '{"locale":"fr-FR","currencyCode":"XOF","thousandsSeparator":"space","decimalSeparator":"comma","minimumFractionDigits":0,"maximumFractionDigits":0}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Filet de securite : tout client_id present dans les donnees mais absent du
-- mock est cree ici, sinon la cle etrangere posee plus bas echouerait.
INSERT INTO public.clients (id, nom, code)
SELECT DISTINCT p.client_id, p.client_id, p.client_id
FROM public.profiles p
WHERE p.client_id IS NOT NULL
  AND p.client_id <> ''
  AND NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = p.client_id);

-- ---------------------------------------------------------------------------
-- 2. Rattachement utilisateur <-> client
-- ---------------------------------------------------------------------------
-- Un utilisateur peut appartenir a plusieurs clients, avec un role different
-- dans chacun. L'identite reste unique dans auth.users : rattacher un
-- utilisateur existant a un nouveau client cree une liaison, jamais un doublon.

CREATE TABLE IF NOT EXISTS public.user_clients (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id  text NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  statut     text NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id, client_id)
);

COMMENT ON TABLE public.user_clients IS
  'Liaison utilisateur/client portant le role. Un super_admin n''a aucune ligne ici : il est hors client.';

CREATE INDEX IF NOT EXISTS user_clients_user_id_idx   ON public.user_clients (user_id);
CREATE INDEX IF NOT EXISTS user_clients_client_id_idx ON public.user_clients (client_id);

-- Reprise des rattachements existants depuis profiles + user_roles.
-- Les super_admin sont exclus : ils deviennent hors client.
INSERT INTO public.user_clients (user_id, client_id, role)
SELECT
  p.id,
  p.client_id,
  COALESCE(
    (SELECT ur.role
     FROM public.user_roles ur
     WHERE ur.user_id = p.id
       AND ur.role <> 'super_admin'::public.app_role
     ORDER BY ur.created_at NULLS LAST
     LIMIT 1),
    'operateur_saisie'::public.app_role
  )
FROM public.profiles p
WHERE p.client_id IS NOT NULL
  AND p.client_id <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id AND ur.role = 'super_admin'::public.app_role
  )
ON CONFLICT (user_id, client_id) DO NOTHING;

-- Cle etrangere posee apres la reprise, pour ne pas bloquer sur des donnees
-- orphelines qui viennent d'etre rattrapees ci-dessus.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_client_id_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- 3. Fonctions d'appartenance
-- ---------------------------------------------------------------------------
-- Utilisees par les RLS ci-dessous et, au lot 2, par la bascule de
-- get_user_client_id() et has_role().

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'::public.app_role
  )
$$;

CREATE OR REPLACE FUNCTION public.user_has_client_access(_user_id uuid, _client_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_clients uc
    WHERE uc.user_id = _user_id
      AND uc.client_id = _client_id
      AND uc.statut = 'actif'
  )
$$;

-- Indispensable en SECURITY DEFINER : une politique posee sur user_clients qui
-- interrogerait user_clients directement declencherait une recursion infinie.
-- Une fonction SECURITY DEFINER s'execute avec les droits du proprietaire et
-- contourne la RLS, ce qui casse le cycle.
CREATE OR REPLACE FUNCTION public.is_client_admin(_user_id uuid, _client_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_clients uc
    WHERE uc.user_id = _user_id
      AND uc.client_id = _client_id
      AND uc.role = 'admin_client'::public.app_role
      AND uc.statut = 'actif'
  )
$$;

CREATE OR REPLACE FUNCTION public.can_read_client_audit(_user_id uuid, _client_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_clients uc
    WHERE uc.user_id = _user_id
      AND uc.client_id = _client_id
      AND uc.statut = 'actif'
      AND uc.role IN ('admin_client'::public.app_role,
                      'directeur_financier'::public.app_role)
  )
$$;

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_clients ENABLE ROW LEVEL SECURITY;

-- Droits de table explicites : ne pas dependre des privileges par defaut du
-- projet. C'est la RLS ci-dessous qui filtre reellement les lignes.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_clients TO authenticated;

-- clients : lecture pour les membres, ecriture reservee au super_admin
-- (la creation d'un client se fait depuis le back-office, hors app metier).
DROP POLICY IF EXISTS "Members can view their clients" ON public.clients;
CREATE POLICY "Members can view their clients" ON public.clients
  FOR SELECT USING (
    public.user_has_client_access(auth.uid(), id)
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Super admin manages clients" ON public.clients;
CREATE POLICY "Super admin manages clients" ON public.clients
  FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- user_clients : chacun voit ses propres rattachements ; un admin_client voit
-- et gere ceux de ses clients ; le super_admin gere tout.
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.user_clients;
CREATE POLICY "Users can view their own memberships" ON public.user_clients
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR public.is_client_admin(auth.uid(), client_id)
  );

DROP POLICY IF EXISTS "Client admins manage memberships" ON public.user_clients;
CREATE POLICY "Client admins manage memberships" ON public.user_clients
  FOR ALL
  USING (
    public.is_super_admin(auth.uid())
    OR public.is_client_admin(auth.uid(), client_id)
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.is_client_admin(auth.uid(), client_id)
  );

-- Un utilisateur ne peut pas modifier son propre rattachement : sans cela un
-- comptable pourrait s'auto-promouvoir directeur financier.
DROP POLICY IF EXISTS "Nobody edits their own membership" ON public.user_clients;
CREATE POLICY "Nobody edits their own membership" ON public.user_clients
  AS RESTRICTIVE
  FOR UPDATE
  USING (user_id <> auth.uid() OR public.is_super_admin(auth.uid()));
