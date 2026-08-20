-- user_clients.role est l'ancien enum, anterieur aux roles par organisation.
-- Il reste NOT NULL alors que role_id porte desormais l'information : toute
-- insertion qui ne renseigne que role_id echoue, ce qui bloquait l'invitation
-- d'un utilisateur.
--
-- La colonne devient facultative, et se deduit du role quand elle n'est pas
-- fournie. On la garde plutot que de la supprimer : has_role() s'en sert encore
-- comme repli, et 408 politiques passent par cette fonction.

ALTER TABLE public.user_clients ALTER COLUMN role DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.derive_legacy_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Le role de base du role attribue fait foi : un role clone reste ainsi
  -- reconnu par les politiques qui raisonnent encore sur l'enum.
  IF NEW.role_id IS NOT NULL THEN
    SELECT r.role_base INTO NEW.role FROM public.roles r WHERE r.id = NEW.role_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS derive_legacy_role_trigger ON public.user_clients;
CREATE TRIGGER derive_legacy_role_trigger
  BEFORE INSERT OR UPDATE OF role_id ON public.user_clients
  FOR EACH ROW EXECUTE FUNCTION public.derive_legacy_role();
