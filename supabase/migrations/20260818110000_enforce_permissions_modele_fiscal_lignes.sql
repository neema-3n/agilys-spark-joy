-- Derniere table sur l'ancien modele. Elle ne porte pas de client_id : son
-- rattachement passe par le modele fiscal parent. Laisser cette seule table
-- sur des blocs de roles recreerait exactement l'incoherence que la tranche
-- precedente a supprimee.

CREATE OR REPLACE FUNCTION public.modele_fiscal_du_client(_modele_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.modeles_fiscaux m
     WHERE m.id = _modele_id
       AND m.client_id = public.get_user_client_id(auth.uid())
  )
$$;

DO $$
DECLARE v_pol record;
BEGIN
  FOR v_pol IN
    SELECT policyname FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'modele_fiscal_lignes' AND cmd <> 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.modele_fiscal_lignes', v_pol.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "permission_insert_modele_fiscal_lignes" ON public.modele_fiscal_lignes
  FOR INSERT WITH CHECK (
    public.modele_fiscal_du_client(modele_fiscal_id)
    AND public.has_permission(auth.uid(), 'comptabilite.gerer')
  );

CREATE POLICY "permission_update_modele_fiscal_lignes" ON public.modele_fiscal_lignes
  FOR UPDATE USING (
    public.modele_fiscal_du_client(modele_fiscal_id)
    AND public.has_permission(auth.uid(), 'comptabilite.gerer')
  );

CREATE POLICY "permission_delete_modele_fiscal_lignes" ON public.modele_fiscal_lignes
  FOR DELETE USING (
    public.modele_fiscal_du_client(modele_fiscal_id)
    AND public.has_permission(auth.uid(), 'comptabilite.gerer')
  );
