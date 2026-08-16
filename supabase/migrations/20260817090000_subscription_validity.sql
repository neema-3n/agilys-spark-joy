-- Abonnement des organisations : une date de fin, et un type disant pourquoi
-- le client est valide.
--
-- L'echeance n'est pas appliquee par un travail planifie qui basculerait les
-- clients expires : un job qui ne tourne pas laisserait passer un client
-- expire, et un job qui tourne mal en bloquerait un a jour. L'etat effectif se
-- calcule donc a la lecture, a partir de la date.
--
-- L'historique n'a pas de table dediee : le journal d'audit enregistre deja
-- chaque modification de `clients` avec son auteur et les valeurs avant/apres.

-- ---------------------------------------------------------------------------
-- 1. Colonnes d'abonnement
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.type_abonnement AS ENUM ('trial', 'live');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS type_abonnement     public.type_abonnement NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS date_fin_abonnement date;

COMMENT ON COLUMN public.clients.type_abonnement IS
  'trial = periode d''essai ou tolerance accordee ; live = abonnement paye.';
COMMENT ON COLUMN public.clients.date_fin_abonnement IS
  'Echeance. Au-dela, le client passe en lecture seule. NULL = aucune validite.';

-- Reprise de l'existant, sur decision explicite : rien n'est presume paye.
UPDATE public.clients
   SET type_abonnement = 'live', date_fin_abonnement = DATE '2026-12-31'
 WHERE id = 'client-1';

UPDATE public.clients
   SET type_abonnement = 'trial', date_fin_abonnement = DATE '2026-08-20'
 WHERE id <> 'client-1'
   AND date_fin_abonnement IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Parametres de niveau systeme
-- ---------------------------------------------------------------------------
-- parametres_referentiels est rattachee a un client : elle ne peut pas porter
-- un reglage global comme la duree d'essai accordee a toute nouvelle
-- organisation.

CREATE TABLE IF NOT EXISTS public.parametres_systeme (
  cle         text PRIMARY KEY,
  valeur      jsonb NOT NULL,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id)
);

COMMENT ON TABLE public.parametres_systeme IS
  'Reglages globaux du produit, hors de tout client. Reserve au super admin.';

INSERT INTO public.parametres_systeme (cle, valeur, description) VALUES
  ('duree_essai_jours', '30'::jsonb,
   'Duree de la periode d''essai posee a la creation d''une organisation. 0 = aucune validite initiale.')
ON CONFLICT (cle) DO NOTHING;

ALTER TABLE public.parametres_systeme ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parametres_systeme TO authenticated;

DROP POLICY IF EXISTS "Super admin manages system settings" ON public.parametres_systeme;
CREATE POLICY "Super admin manages system settings" ON public.parametres_systeme
  FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Table sensible : elle est auditee comme les autres. La boucle du lot 2 ne
-- couvre que les tables portant un client_id, celle-ci n'en a pas.
DROP TRIGGER IF EXISTS audit_parametres_systeme ON public.parametres_systeme;
CREATE TRIGGER audit_parametres_systeme
  AFTER INSERT OR UPDATE OR DELETE ON public.parametres_systeme
  FOR EACH ROW EXECUTE FUNCTION public.record_audit_entry();

-- ---------------------------------------------------------------------------
-- 3. L'echeance rend le client lecture seule
-- ---------------------------------------------------------------------------
-- Le garde pose au lot 2 sur les 30 tables metier est simplement elargi : la
-- fonction change, les triggers restent en place.

CREATE OR REPLACE FUNCTION public.enforce_client_not_suspended()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id text;
  v_statut    text;
  v_echeance  date;
BEGIN
  v_client_id := COALESCE(to_jsonb(NEW) ->> 'client_id', to_jsonb(OLD) ->> 'client_id');

  IF v_client_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT statut, date_fin_abonnement
    INTO v_statut, v_echeance
    FROM public.clients
   WHERE id = v_client_id;

  IF v_statut IN ('suspendu', 'resilie') THEN
    RAISE EXCEPTION
      'Abonnement % pour ce client : les donnees restent consultables et exportables, mais aucune modification n''est possible.',
      CASE v_statut WHEN 'suspendu' THEN 'suspendu' ELSE 'resilie' END
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_echeance IS NULL OR v_echeance < CURRENT_DATE THEN
    RAISE EXCEPTION
      'Abonnement expire%. Les donnees restent consultables et exportables, mais aucune modification n''est possible.',
      CASE WHEN v_echeance IS NULL THEN '' ELSE ' depuis le ' || to_char(v_echeance, 'DD/MM/YYYY') END
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. my_clients() expose l'abonnement
-- ---------------------------------------------------------------------------
-- Le frontend doit pouvoir alerter avant l'echeance : decouvrir l'expiration
-- en se heurtant a un refus d'ecriture est une mauvaise facon de l'apprendre.

DROP FUNCTION IF EXISTS public.my_clients();

CREATE FUNCTION public.my_clients()
RETURNS TABLE (
  id                  text,
  nom                 text,
  code                text,
  pays                text,
  devise              text,
  statut              text,
  money_format        jsonb,
  role                public.app_role,
  is_active           boolean,
  is_takeover         boolean,
  type_abonnement     public.type_abonnement,
  date_fin_abonnement date
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.nom, c.code, c.pays, c.devise, c.statut, c.money_format,
         uc.role,
         c.id = public.jwt_active_client_id(),
         false,
         c.type_abonnement, c.date_fin_abonnement
    FROM public.clients c
    JOIN public.user_clients uc ON uc.client_id = c.id
   WHERE uc.user_id = auth.uid()
     AND uc.statut = 'actif'
     AND c.statut <> 'resilie'

  UNION ALL

  SELECT c.id, c.nom, c.code, c.pays, c.devise, c.statut, c.money_format,
         'super_admin'::public.app_role,
         c.id = public.jwt_active_client_id(),
         true,
         c.type_abonnement, c.date_fin_abonnement
    FROM public.clients c
   WHERE public.is_super_admin(auth.uid())
     AND c.statut <> 'resilie'
     AND NOT EXISTS (
       SELECT 1 FROM public.user_clients uc
        WHERE uc.user_id = auth.uid() AND uc.client_id = c.id
     )

   ORDER BY 2
$$;

GRANT EXECUTE ON FUNCTION public.my_clients() TO authenticated;
