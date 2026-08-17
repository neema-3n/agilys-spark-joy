-- Lot B, premiere tranche : la chaine de la depense et le budget passent des
-- blocs de roles aux permissions.
--
-- Les politiques actuelles ressemblent toutes a ceci :
--   has_role('admin_client') OR has_role('directeur_financier') OR has_role('chef_service')
-- Un seul bloc pour creer, modifier et supprimer, sans distinguer la saisie de
-- la validation — donc sans separation des taches possible.
--
-- Deux mecanismes sont necessaires. Les politiques RLS savent distinguer les
-- operations (INSERT / UPDATE / DELETE), mais pas les transitions : elles ne
-- peuvent pas dire « tu peux modifier cette depense, mais pas la faire passer
-- de brouillon a validee ». C'est le role des triggers de la section 2.

-- ---------------------------------------------------------------------------
-- 1. Politiques d'ecriture fondees sur les permissions
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_map    jsonb := jsonb_build_object(
    'engagements',              'engagements',
    'factures',                 'factures',
    'depenses',                 'depenses',
    'paiements',                'paiements',
    'bons_commande',            'bons_commande',
    'reservations_credits',     'reservations',
    'lignes_budgetaires',       'budgets',
    'modifications_budgetaires','budgets'
  );
  v_table  text;
  v_module text;
  v_pol    record;
BEGIN
  FOR v_table, v_module IN SELECT key, value #>> '{}' FROM jsonb_each(v_map) LOOP

    -- Les anciennes politiques d'ecriture sont retirees : les laisser en
    -- place les rendrait permissives en OR avec les nouvelles, ce qui
    -- annulerait tout le controle.
    FOR v_pol IN
      SELECT policyname FROM pg_policies
       WHERE schemaname = 'public' AND tablename = v_table AND cmd <> 'SELECT'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_pol.policyname, v_table);
    END LOOP;

    EXECUTE format($f$
      CREATE POLICY "permission_insert_%1$s" ON public.%1$I
        FOR INSERT WITH CHECK (
          client_id = public.get_user_client_id(auth.uid())
          AND public.has_permission(auth.uid(), '%2$s.creer')
        )$f$, v_table, v_module);

    -- La validation est techniquement un UPDATE : qui ne peut que valider doit
    -- pouvoir passer la politique, c'est le trigger qui verifiera la nature
    -- exacte du changement.
    EXECUTE format($f$
      CREATE POLICY "permission_update_%1$s" ON public.%1$I
        FOR UPDATE USING (
          client_id = public.get_user_client_id(auth.uid())
          AND (
            public.has_permission(auth.uid(), '%2$s.modifier')
            OR public.has_permission(auth.uid(), '%2$s.valider')
            OR public.has_permission(auth.uid(), '%2$s.annuler')
          )
        )$f$, v_table, v_module);

    -- La suppression n'existe pas pour tous les modules : quand le catalogue
    -- ne la prevoit pas, elle reste reservee au super admin, comme avant.
    IF EXISTS (SELECT 1 FROM public.permissions WHERE code = v_module || '.supprimer') THEN
      EXECUTE format($f$
        CREATE POLICY "permission_delete_%1$s" ON public.%1$I
          FOR DELETE USING (
            client_id = public.get_user_client_id(auth.uid())
            AND public.has_permission(auth.uid(), '%2$s.supprimer')
          )$f$, v_table, v_module);
    ELSE
      EXECUTE format($f$
        CREATE POLICY "permission_delete_%1$s" ON public.%1$I
          FOR DELETE USING (public.is_super_admin(auth.uid()))$f$, v_table);
    END IF;

  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Controle des transitions de statut
-- ---------------------------------------------------------------------------
-- Sans cela, `depenses.valider` resterait decorative : n'importe qui pouvant
-- modifier une depense pourrait la passer en validee.
--
-- Seuls les etats traduisant un ACTE HUMAIN sont controles. Les etats atteints
-- automatiquement par les triggers metier — une facture qui devient soldee
-- parce qu'un paiement l'apure, une reservation qui devient convertie ou
-- expiree — ne le sont pas : les bloquer casserait la chaine d'execution.

CREATE OR REPLACE FUNCTION public.enforce_statut_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module     text := TG_ARGV[0];
  v_valider    text[] := string_to_array(TG_ARGV[1], ',');
  v_annuler    text[] := string_to_array(TG_ARGV[2], ',');
  v_permission text;
BEGIN
  IF NEW.statut IS NOT DISTINCT FROM OLD.statut THEN
    RETURN NEW;
  END IF;

  -- Aucun utilisateur authentifie : l'ecriture vient du serveur — edge function
  -- avec la cle service_role, migration, trigger metier en cascade. Ces
  -- contextes n'ont pas de role a evaluer, et les bloquer casserait la chaine
  -- d'execution. Le controle porte sur les actes des utilisateurs.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.statut = ANY (v_valider) THEN
    v_permission := v_module || '.valider';
  ELSIF NEW.statut = ANY (v_annuler) THEN
    -- Tous les modules n'ont pas de permission d'annulation distincte ; a
    -- defaut, annuler releve du meme acte que valider.
    v_permission := CASE
      WHEN EXISTS (SELECT 1 FROM public.permissions WHERE code = v_module || '.annuler')
        THEN v_module || '.annuler'
      ELSE v_module || '.valider'
    END;
  ELSE
    -- Transition automatique : rien a controler.
    RETURN NEW;
  END IF;

  IF NOT public.has_permission(auth.uid(), v_permission) THEN
    RAISE EXCEPTION
      'Vous n''avez pas le droit « % » : ce changement de statut revient a un autre role.',
      v_permission
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  v_conf record;
BEGIN
  FOR v_conf IN
    SELECT * FROM (VALUES
      ('engagements',          'engagements',   'valide',           'annule'),
      ('factures',             'factures',      'validee',          'annulee'),
      ('depenses',             'depenses',      'validee',          'annulee'),
      ('paiements',            'paiements',     'valide',           'annule'),
      ('bons_commande',        'bons_commande', 'emis,receptionne', 'annule'),
      ('reservations_credits', 'reservations',  'active',           'annulee')
    ) AS t(tbl, module, etats_valider, etats_annuler)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS statut_transition_%1$s ON public.%1$I', v_conf.tbl);
    EXECUTE format(
      'CREATE TRIGGER statut_transition_%1$s
         BEFORE UPDATE OF statut ON public.%1$I
         FOR EACH ROW EXECUTE FUNCTION public.enforce_statut_transition(%2$L, %3$L, %4$L)',
      v_conf.tbl, v_conf.module, v_conf.etats_valider, v_conf.etats_annuler);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Coherence de l'administration
-- ---------------------------------------------------------------------------
-- is_client_admin ne consultait que l'ancien enum : donner a quelqu'un un
-- clone du role Administrateur ne le rendait pas administrateur. La permission
-- fait desormais foi, l'enum restant reconnu le temps de la transition.

CREATE OR REPLACE FUNCTION public.is_client_admin(_user_id uuid, _client_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_clients uc
      LEFT JOIN public.role_permissions rp
        ON rp.role_id = uc.role_id AND rp.permission_code = 'utilisateurs.gerer'
     WHERE uc.user_id = _user_id
       AND uc.client_id = _client_id
       AND uc.statut = 'actif'
       AND (rp.permission_code IS NOT NULL OR uc.role = 'admin_client'::public.app_role)
  )
$$;
