-- Un utilisateur ne pouvait lire que son propre profil. Consequence directe :
-- l'administrateur d'une organisation voit ses rattachements mais aucun des
-- noms ni des adresses qui vont avec — l'ecran de gestion des utilisateurs
-- affiche des lignes vides.
--
-- Le meme trou touche l'affichage courant : « saisi par », « valide par » et
-- toute mention d'un collegue ne peuvent pas etre resolus.
--
-- Les membres d'une meme organisation peuvent desormais se lire entre eux. La
-- portee reste le client : rien ne fuit d'une organisation a l'autre.

CREATE OR REPLACE FUNCTION public.partage_une_organisation(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_clients ua
      JOIN public.user_clients ub ON ub.client_id = ua.client_id
     WHERE ua.user_id = _a
       AND ub.user_id = _b
       AND ua.statut = 'actif'
  )
$$;

COMMENT ON FUNCTION public.partage_une_organisation(uuid, uuid) IS
  'Vrai si les deux utilisateurs appartiennent a une meme organisation. SECURITY DEFINER : une politique sur profiles qui interrogerait user_clients directement declencherait la RLS de cette table.';

DROP POLICY IF EXISTS "Members can view profiles of their organisations" ON public.profiles;
CREATE POLICY "Members can view profiles of their organisations" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR public.partage_une_organisation(auth.uid(), id)
  );
