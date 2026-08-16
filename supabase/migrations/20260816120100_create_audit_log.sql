-- Journal d'audit : trace de toutes les ecritures sur les tables metier.
--
-- Construit en base, par triggers, et non dans le frontend : c'est la seule
-- facon de garantir qu'aucune modification n'y echappe, y compris celles
-- passant par les edge functions ou par un acces direct a la base.
--
-- La table est en ajout seul : personne, pas meme un super_admin, ne peut
-- modifier ou supprimer une entree via l'API.

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_log (
  id             bigserial PRIMARY KEY,
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  user_id        uuid,
  user_email     text,
  acting_as      text,           -- renseigne quand un super_admin prend la main sur un client
  client_id      text,
  table_name     text NOT NULL,
  operation      text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id      text,
  old_data       jsonb,
  new_data       jsonb,
  changed_fields text[]
);

COMMENT ON TABLE public.audit_log IS
  'Piste d''audit en ajout seul. Alimentee par trigger sur les tables metier.';
COMMENT ON COLUMN public.audit_log.acting_as IS
  'Client sur lequel un super_admin a pris la main, le cas echeant. NULL pour un acces ordinaire.';

CREATE INDEX IF NOT EXISTS audit_log_client_date_idx  ON public.audit_log (client_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_record_idx       ON public.audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS audit_log_user_idx         ON public.audit_log (user_id, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Fonction de trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_audit_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old        jsonb;
  v_new        jsonb;
  v_row        jsonb;
  v_client_id  text;
  v_record_id  text;
  v_changed    text[];
  v_email      text;
  v_acting_as  text;
BEGIN
  v_old := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  v_new := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  v_row := COALESCE(v_new, v_old);

  -- Lecture via jsonb : la colonne client_id peut ne pas exister sur toutes
  -- les tables auditees, et profiles.client_id est amenee a disparaitre.
  v_client_id := v_row ->> 'client_id';
  v_record_id := v_row ->> 'id';

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key ORDER BY key)
      INTO v_changed
      FROM jsonb_each(v_new)
     WHERE v_old -> key IS DISTINCT FROM v_new -> key
       AND key NOT IN ('updated_at');

    -- Rien de significatif n'a change : on n'encombre pas le journal.
    IF v_changed IS NULL OR array_length(v_changed, 1) IS NULL THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  v_acting_as := auth.jwt() -> 'app_metadata' ->> 'acting_as_client_id';

  INSERT INTO public.audit_log (
    user_id, user_email, acting_as, client_id,
    table_name, operation, record_id,
    old_data, new_data, changed_fields
  ) VALUES (
    auth.uid(), v_email, v_acting_as, v_client_id,
    TG_TABLE_NAME, TG_OP, v_record_id,
    v_old, v_new, v_changed
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Un journal d'audit ne doit jamais faire echouer une operation metier.
    RAISE WARNING 'audit_log: echec de journalisation sur %.% : %',
      TG_TABLE_NAME, TG_OP, SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Pose des triggers sur toutes les tables portant un client_id
-- ---------------------------------------------------------------------------
-- Boucle plutot que 30 blocs repetes : toute table metier ajoutee plus tard
-- devra etre inscrite ici, ou recevoir son trigger explicitement.

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
      AND c.relname NOT IN ('audit_log', 'clients', 'user_clients')
    ORDER BY c.relname
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON public.%1$I', v_table);
    EXECUTE format(
      'CREATE TRIGGER audit_%1$s
         AFTER INSERT OR UPDATE OR DELETE ON public.%1$I
         FOR EACH ROW EXECUTE FUNCTION public.record_audit_entry()',
      v_table
    );
  END LOOP;
END;
$$;

-- Les rattachements sont sensibles : on les audite aussi.
DROP TRIGGER IF EXISTS audit_user_clients ON public.user_clients;
CREATE TRIGGER audit_user_clients
  AFTER INSERT OR UPDATE OR DELETE ON public.user_clients
  FOR EACH ROW EXECUTE FUNCTION public.record_audit_entry();

DROP TRIGGER IF EXISTS audit_clients ON public.clients;
CREATE TRIGGER audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.record_audit_entry();

-- ---------------------------------------------------------------------------
-- 4. RLS : lecture filtree, aucune ecriture
-- ---------------------------------------------------------------------------

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Client admins read their audit trail" ON public.audit_log;
CREATE POLICY "Client admins read their audit trail" ON public.audit_log
  FOR SELECT USING (
    public.is_super_admin(auth.uid())
    OR public.can_read_client_audit(auth.uid(), client_id)
  );

-- Aucune politique INSERT/UPDATE/DELETE n'est creee : le trigger ecrit en
-- SECURITY DEFINER et contourne la RLS, mais aucun appel via l'API ne peut
-- alterer le journal. Les droits de table le confirment : lecture seule, et
-- meme la lecture reste filtree par la politique ci-dessus.
GRANT SELECT ON public.audit_log TO authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_log FROM authenticated, anon;
