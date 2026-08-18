-- Lot B, seconde tranche : les modules restants passent aux permissions.
--
-- L'etat a moitie applique etait le vrai defaut. La matrice affichait 47
-- permissions sur 15 modules, mais seules celles de 8 modules produisaient un
-- effet : un administrateur qui retirait `tresorerie.gerer` a son comptable ne
-- retirait rien du tout, sans aucun moyen de s'en apercevoir. Un ecran de
-- reglage qui ne regle rien est pire qu'une interface inegale.

-- ---------------------------------------------------------------------------
-- 1. Le module Previsions rejoint le catalogue
-- ---------------------------------------------------------------------------
-- scenarios_prevision et lignes_prevision n'avaient aucune permission a leur
-- nom. Les rattacher a `budgets` aurait retire aux roles qui les gerent
-- aujourd'hui un droit qu'ils possedent : mieux vaut nommer le module.

INSERT INTO public.permissions (code, module, action, libelle, ordre) VALUES
  ('previsions.lire',  'previsions', 'lire',  'Consulter les prévisions',        25),
  ('previsions.gerer', 'previsions', 'gerer', 'Construire les scénarios de prévision', 26)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. La matrice standard reflete ce que les roles font reellement
-- ---------------------------------------------------------------------------
-- Le directeur financier ecrit aujourd'hui partout hors chaine de la depense.
-- La separation des taches porte sur la chaine transactionnelle — qui saisit
-- ne valide pas — et non sur la gestion courante : rien ne justifie de lui
-- interdire de creer un fournisseur ou d'ouvrir un exercice.
--
-- On n'ajoute que ce qui evite une perte : la chaine de la depense et le
-- budget restent tels qu'ils ont ete valides.

DO $$
DECLARE
  v_role record;
BEGIN
  FOR v_role IN
    SELECT id, code FROM public.roles WHERE est_standard
  LOOP
    IF v_role.code = 'admin_client' THEN
      INSERT INTO public.role_permissions (role_id, permission_code)
      SELECT v_role.id, code FROM public.permissions
      ON CONFLICT DO NOTHING;

    ELSIF v_role.code = 'directeur_financier' THEN
      INSERT INTO public.role_permissions (role_id, permission_code)
      SELECT v_role.id, code FROM public.permissions
       WHERE code IN ('projets.creer', 'projets.modifier', 'projets.supprimer',
                      'fournisseurs.gerer',
                      'tresorerie.gerer', 'tresorerie.rapprocher',
                      'comptabilite.gerer', 'comptabilite.cloturer',
                      'parametres.gerer',
                      'previsions.lire', 'previsions.gerer')
      ON CONFLICT DO NOTHING;

    ELSIF v_role.code = 'comptable' THEN
      -- Il tient deja la comptabilite, la tresorerie et les fournisseurs ; il
      -- ne touche pas aux parametres, ce qui correspond a l'existant.
      INSERT INTO public.role_permissions (role_id, permission_code)
      SELECT v_role.id, code FROM public.permissions
       WHERE code IN ('previsions.lire')
      ON CONFLICT DO NOTHING;

    ELSIF v_role.code = 'chef_service' THEN
      INSERT INTO public.role_permissions (role_id, permission_code)
      SELECT v_role.id, code FROM public.permissions
       WHERE code IN ('previsions.lire')
      ON CONFLICT DO NOTHING;

    ELSE
      INSERT INTO public.role_permissions (role_id, permission_code)
      SELECT v_role.id, code FROM public.permissions
       WHERE code = 'previsions.lire'
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- Le seeding des futures organisations doit produire la meme chose.
CREATE OR REPLACE FUNCTION public.seed_roles_on_client_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role record;
BEGIN
  PERFORM public.seed_standard_roles(NEW.id);

  FOR v_role IN SELECT id, code FROM public.roles WHERE client_id = NEW.id AND est_standard LOOP
    IF v_role.code = 'admin_client' THEN
      INSERT INTO public.role_permissions (role_id, permission_code)
      SELECT v_role.id, code FROM public.permissions ON CONFLICT DO NOTHING;
    ELSIF v_role.code = 'directeur_financier' THEN
      INSERT INTO public.role_permissions (role_id, permission_code)
      SELECT v_role.id, code FROM public.permissions
       WHERE code IN ('projets.creer', 'projets.modifier', 'projets.supprimer',
                      'fournisseurs.gerer', 'tresorerie.gerer', 'tresorerie.rapprocher',
                      'comptabilite.gerer', 'comptabilite.cloturer', 'parametres.gerer',
                      'previsions.lire', 'previsions.gerer')
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO public.role_permissions (role_id, permission_code)
      SELECT v_role.id, 'previsions.lire' ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Politiques d'ecriture sur les modules restants
-- ---------------------------------------------------------------------------
-- Le rattachement table -> permission est explicite plutot que devine : c'est
-- la piece qu'un auditeur relira.

DO $$
DECLARE
  v_conf record;
  v_pol  record;
BEGIN
  FOR v_conf IN
    SELECT * FROM (VALUES
      -- table,                      insert,               update,               delete
      ('projets',                  'projets.creer',      'projets.modifier',   'projets.supprimer'),
      ('fournisseurs',             'fournisseurs.gerer', 'fournisseurs.gerer', 'fournisseurs.gerer'),

      ('comptes_tresorerie',       'tresorerie.gerer',   'tresorerie.gerer',   'tresorerie.gerer'),
      ('operations_tresorerie',    'tresorerie.gerer',   'tresorerie.gerer',   'tresorerie.gerer'),
      ('recettes',                 'tresorerie.gerer',   'tresorerie.gerer',   'tresorerie.gerer'),
      ('rapprochements_bancaires', 'tresorerie.rapprocher','tresorerie.rapprocher','tresorerie.rapprocher'),

      ('ecritures_comptables',     'comptabilite.gerer', 'comptabilite.gerer', 'comptabilite.gerer'),
      ('comptes',                  'comptabilite.gerer', 'comptabilite.gerer', 'comptabilite.gerer'),
      ('natures_compte',           'comptabilite.gerer', 'comptabilite.gerer', 'comptabilite.gerer'),
      ('regles_comptables',        'comptabilite.gerer', 'comptabilite.gerer', 'comptabilite.gerer'),
      ('modeles_fiscaux',          'comptabilite.gerer', 'comptabilite.gerer', 'comptabilite.gerer'),
      ('taxes_fiscales',           'comptabilite.gerer', 'comptabilite.gerer', 'comptabilite.gerer'),

      ('scenarios_prevision',      'previsions.gerer',   'previsions.gerer',   'previsions.gerer'),
      ('lignes_prevision',         'previsions.gerer',   'previsions.gerer',   'previsions.gerer'),

      ('exercices',                'parametres.gerer',   'parametres.gerer',   'parametres.gerer'),
      ('sections',                 'parametres.gerer',   'parametres.gerer',   'parametres.gerer'),
      ('programmes',               'parametres.gerer',   'parametres.gerer',   'parametres.gerer'),
      ('actions',                  'parametres.gerer',   'parametres.gerer',   'parametres.gerer'),
      ('structures',               'parametres.gerer',   'parametres.gerer',   'parametres.gerer'),
      ('enveloppes',               'parametres.gerer',   'parametres.gerer',   'parametres.gerer'),
      ('parametres_referentiels',  'parametres.gerer',   'parametres.gerer',   'parametres.gerer')
    ) AS t(tbl, perm_insert, perm_update, perm_delete)
  LOOP
    FOR v_pol IN
      SELECT policyname FROM pg_policies
       WHERE schemaname = 'public' AND tablename = v_conf.tbl AND cmd <> 'SELECT'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_pol.policyname, v_conf.tbl);
    END LOOP;

    EXECUTE format($f$
      CREATE POLICY "permission_insert_%1$s" ON public.%1$I
        FOR INSERT WITH CHECK (
          client_id = public.get_user_client_id(auth.uid())
          AND public.has_permission(auth.uid(), %2$L)
        )$f$, v_conf.tbl, v_conf.perm_insert);

    EXECUTE format($f$
      CREATE POLICY "permission_update_%1$s" ON public.%1$I
        FOR UPDATE USING (
          client_id = public.get_user_client_id(auth.uid())
          AND public.has_permission(auth.uid(), %2$L)
        )$f$, v_conf.tbl, v_conf.perm_update);

    EXECUTE format($f$
      CREATE POLICY "permission_delete_%1$s" ON public.%1$I
        FOR DELETE USING (
          client_id = public.get_user_client_id(auth.uid())
          AND public.has_permission(auth.uid(), %2$L)
        )$f$, v_conf.tbl, v_conf.perm_delete);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Cloturer un exercice est un acte comptable, pas un reglage
-- ---------------------------------------------------------------------------

-- Le garde derive la permission du module en y ajoutant « .valider ». Aucune
-- permission « comptabilite.valider » n'existe : cloturer un exercice releve
-- de `comptabilite.cloturer`. Un quatrieme argument permet de nommer la
-- permission explicitement, sans toucher aux triggers deja poses.
CREATE OR REPLACE FUNCTION public.enforce_statut_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_module     text := TG_ARGV[0];
  v_valider    text[] := string_to_array(TG_ARGV[1], ',');
  v_annuler    text[] := string_to_array(TG_ARGV[2], ',');
  v_explicite  text := CASE WHEN TG_NARGS > 3 THEN TG_ARGV[3] ELSE NULL END;
  v_permission text;
BEGIN
  IF NEW.statut IS NOT DISTINCT FROM OLD.statut THEN
    RETURN NEW;
  END IF;

  -- Aucun utilisateur authentifie : l'ecriture vient du serveur — edge function
  -- avec la cle service_role, migration, trigger metier en cascade. Ces
  -- contextes n'ont pas de role a evaluer, et les bloquer casserait la chaine
  -- d'execution.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.statut = ANY (v_valider) THEN
    v_permission := COALESCE(v_explicite, v_module || '.valider');
  ELSIF NEW.statut = ANY (v_annuler) THEN
    v_permission := CASE
      WHEN EXISTS (SELECT 1 FROM public.permissions WHERE code = v_module || '.annuler')
        THEN v_module || '.annuler'
      ELSE COALESCE(v_explicite, v_module || '.valider')
    END;
  ELSE
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
$fn$;

DROP TRIGGER IF EXISTS statut_transition_exercices ON public.exercices;
CREATE TRIGGER statut_transition_exercices
  BEFORE UPDATE OF statut ON public.exercices
  FOR EACH ROW EXECUTE FUNCTION public.enforce_statut_transition(
    'comptabilite', 'cloture', '', 'comptabilite.cloturer');
