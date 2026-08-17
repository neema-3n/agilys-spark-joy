-- Les roles standard etaient proteges en modification, mais pas en
-- suppression : un administrateur client pouvait les effacer. Or ils sont la
-- reference qu'on clone pour s'en ecarter — les perdre prive l'organisation de
-- tout point de depart, et de toute possibilite de revenir en arriere.

DROP POLICY IF EXISTS "Standard roles cannot be deleted" ON public.roles;
CREATE POLICY "Standard roles cannot be deleted" ON public.roles
  AS RESTRICTIVE
  FOR DELETE
  USING (NOT est_standard);

-- Un role encore attribue ne doit pas disparaitre sous les pieds de ses
-- utilisateurs. La cle etrangere est en ON DELETE RESTRICT, mais son message
-- ne dit rien d'utile ; celui-ci nomme le probleme.
CREATE OR REPLACE FUNCTION public.prevent_delete_role_in_use()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_utilisateurs integer;
BEGIN
  SELECT count(*) INTO v_utilisateurs
    FROM public.user_clients
   WHERE role_id = OLD.id;

  IF v_utilisateurs > 0 THEN
    RAISE EXCEPTION
      'Le role « % » est attribue a % utilisateur(s). Reaffectez-les avant de le supprimer.',
      OLD.libelle, v_utilisateurs
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_delete_role_in_use_trigger ON public.roles;
CREATE TRIGGER prevent_delete_role_in_use_trigger
  BEFORE DELETE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_role_in_use();

-- Le role de base n'est pas une notion metier : c'est la passerelle qui permet
-- aux 408 appels a has_role() de continuer a reconnaitre un role clone. Le
-- laisser modifiable donnerait a un administrateur le moyen de s'octroyer les
-- droits d'un autre role standard sans passer par les permissions.
CREATE OR REPLACE FUNCTION public.freeze_role_base()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role_base IS DISTINCT FROM OLD.role_base THEN
    RAISE EXCEPTION
      'Le role de base ne se modifie pas : il est fixe au clonage. Creez un nouveau role a partir du role standard voulu.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS freeze_role_base_trigger ON public.roles;
CREATE TRIGGER freeze_role_base_trigger
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.freeze_role_base();
