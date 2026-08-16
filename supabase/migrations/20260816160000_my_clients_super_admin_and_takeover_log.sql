-- Le super admin n'a aucune ligne dans user_clients : c'est la regle "hors
-- client". my_clients() lui renverrait donc une liste vide, et le selecteur
-- d'en-tete le laisserait bloque sans aucun client une fois le frontend
-- branche sur la vraie table.
--
-- Il conserve donc l'acces, mais explicitement marque comme une prise en main,
-- et cette prise en main est journalisee.

-- ---------------------------------------------------------------------------
-- 1. my_clients() : ajout du cas super admin
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.my_clients();

CREATE FUNCTION public.my_clients()
RETURNS TABLE (
  id           text,
  nom          text,
  code         text,
  pays         text,
  devise       text,
  statut       text,
  money_format jsonb,
  role         public.app_role,
  is_active    boolean,
  is_takeover  boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Clients dont l'utilisateur est reellement membre
  SELECT c.id, c.nom, c.code, c.pays, c.devise, c.statut, c.money_format,
         uc.role,
         c.id = public.jwt_active_client_id(),
         false
    FROM public.clients c
    JOIN public.user_clients uc ON uc.client_id = c.id
   WHERE uc.user_id = auth.uid()
     AND uc.statut = 'actif'
     AND c.statut <> 'resilie'

  UNION ALL

  -- Prise en main par un super admin, sur les clients ou il n'est pas membre
  SELECT c.id, c.nom, c.code, c.pays, c.devise, c.statut, c.money_format,
         'super_admin'::public.app_role,
         c.id = public.jwt_active_client_id(),
         true
    FROM public.clients c
   WHERE public.is_super_admin(auth.uid())
     AND c.statut <> 'resilie'
     AND NOT EXISTS (
       SELECT 1 FROM public.user_clients uc
        WHERE uc.user_id = auth.uid() AND uc.client_id = c.id
     )

   ORDER BY 2
$$;

COMMENT ON FUNCTION public.my_clients() IS
  'Clients accessibles a l''utilisateur. is_takeover=true signale une prise en main par un super admin, hors de tout rattachement.';

GRANT EXECUTE ON FUNCTION public.my_clients() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Journalisation de la prise en main
-- ---------------------------------------------------------------------------
-- Les triggers d'audit ne tracent que les ecritures. L'acces en lecture d'un
-- super admin aux donnees d'un client n'ecrit rien, et passerait donc
-- inapercu : c'est precisement ce qu'il faut tracer ici.
--
-- La fonction est idempotente sur une fenetre d'une heure, sinon chaque
-- rechargement de page produirait une entree.

CREATE OR REPLACE FUNCTION public.log_client_takeover(_client_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email  text;
  v_recent boolean;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RETURN;
  END IF;

  -- Un membre legitime n'est pas en prise en main.
  IF EXISTS (
    SELECT 1 FROM public.user_clients uc
     WHERE uc.user_id = auth.uid() AND uc.client_id = _client_id
  ) THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.audit_log
     WHERE user_id = auth.uid()
       AND table_name = '_takeover'
       AND client_id = _client_id
       AND occurred_at > now() - interval '1 hour'
  ) INTO v_recent;

  IF v_recent THEN
    RETURN;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.audit_log (
    user_id, user_email, acting_as, client_id,
    table_name, operation, record_id, new_data
  ) VALUES (
    auth.uid(), v_email, _client_id, _client_id,
    '_takeover', 'INSERT', _client_id,
    jsonb_build_object('motif', 'Acces super admin aux donnees du client')
  );
END;
$$;

COMMENT ON FUNCTION public.log_client_takeover(text) IS
  'Journalise l''acces d''un super admin a un client dont il n''est pas membre. Idempotent sur une heure.';

GRANT EXECUTE ON FUNCTION public.log_client_takeover(text) TO authenticated;
