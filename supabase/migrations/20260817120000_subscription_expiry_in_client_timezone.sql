-- L'echeance d'un abonnement se juge dans le calendrier du client, pas dans
-- celui du serveur.
--
-- CURRENT_DATE suit le fuseau de la base, qui est UTC sur Supabase. Une
-- organisation au Benin ou au Cameroun (UTC+1) conservait donc son acces une
-- heure de trop chaque jour : a 00h30 locale, le serveur etait encore la
-- veille, et l'echeance du jour precedent restait valide.
--
-- Le fuseau devient une propriete du client, et le garde compare la date
-- locale de ce client.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS fuseau_horaire text NOT NULL DEFAULT 'Africa/Lagos';

COMMENT ON COLUMN public.clients.fuseau_horaire IS
  'Fuseau servant a determiner la date locale du client. Africa/Lagos = UTC+1, sans heure d''ete : couvre le Benin, le Cameroun et une grande partie de la zone.';

-- Un nom de fuseau invalide ferait echouer le garde a l'execution, donc TOUTES
-- les ecritures du client. On le valide a la saisie.
-- Par trigger et non par CHECK : une contrainte CHECK n'admet pas de
-- sous-requete, et la liste des fuseaux est une table systeme.
CREATE OR REPLACE FUNCTION public.validate_client_timezone()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW.fuseau_horaire) THEN
    RAISE EXCEPTION 'Fuseau horaire inconnu : %', NEW.fuseau_horaire
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_timezone_clients ON public.clients;
CREATE TRIGGER validate_timezone_clients
  BEFORE INSERT OR UPDATE OF fuseau_horaire ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.validate_client_timezone();

CREATE OR REPLACE FUNCTION public.client_today(_client_id text)
RETURNS date
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (now() AT TIME ZONE COALESCE(c.fuseau_horaire, 'UTC'))::date
    FROM public.clients c
   WHERE c.id = _client_id
$$;

COMMENT ON FUNCTION public.client_today(text) IS
  'Date courante dans le fuseau du client. Sert a juger l''echeance d''abonnement.';

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
  v_today     date;
BEGIN
  v_client_id := COALESCE(to_jsonb(NEW) ->> 'client_id', to_jsonb(OLD) ->> 'client_id');

  IF v_client_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT c.statut,
         c.date_fin_abonnement,
         (now() AT TIME ZONE COALESCE(c.fuseau_horaire, 'UTC'))::date
    INTO v_statut, v_echeance, v_today
    FROM public.clients c
   WHERE c.id = v_client_id;

  IF v_statut IN ('suspendu', 'resilie') THEN
    RAISE EXCEPTION
      'Abonnement % pour ce client : les donnees restent consultables et exportables, mais aucune modification n''est possible.',
      CASE v_statut WHEN 'suspendu' THEN 'suspendu' ELSE 'resilie' END
      USING ERRCODE = 'check_violation';
  END IF;

  -- L'echeance est inclusive : le client travaille jusqu'a la fin de ce
  -- jour-la, dans son propre calendrier.
  IF v_echeance IS NULL OR v_echeance < v_today THEN
    RAISE EXCEPTION
      'Abonnement expire%. Les donnees restent consultables et exportables, mais aucune modification n''est possible.',
      CASE WHEN v_echeance IS NULL THEN '' ELSE ' depuis le ' || to_char(v_echeance, 'DD/MM/YYYY') END
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
