-- Fix multi-tenant data isolation by adding client_id filtering to RLS policies

-- 1. Create security definer function to get user's client_id
CREATE OR REPLACE FUNCTION public.get_user_client_id(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.profiles WHERE id = user_id
$$;

-- 2. Update SELECT policies for actions table
DROP POLICY IF EXISTS "Authenticated users can view actions" ON public.actions;
CREATE POLICY "Users can view own client actions" ON public.actions
  FOR SELECT USING (
    client_id = get_user_client_id(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 3. Update SELECT policies for sections table
DROP POLICY IF EXISTS "Authenticated users can view sections" ON public.sections;
CREATE POLICY "Users can view own client sections" ON public.sections
  FOR SELECT USING (
    client_id = get_user_client_id(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 4. Update SELECT policies for programmes table
DROP POLICY IF EXISTS "Authenticated users can view programmes" ON public.programmes;
CREATE POLICY "Users can view own client programmes" ON public.programmes
  FOR SELECT USING (
    client_id = get_user_client_id(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 5. Update SELECT policies for enveloppes table
DROP POLICY IF EXISTS "Authenticated users can view enveloppes" ON public.enveloppes;
CREATE POLICY "Users can view own client enveloppes" ON public.enveloppes
  FOR SELECT USING (
    client_id = get_user_client_id(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 6. Update SELECT policies for comptes table
DROP POLICY IF EXISTS "Authenticated users can view comptes" ON public.comptes;
CREATE POLICY "Users can view own client comptes" ON public.comptes
  FOR SELECT USING (
    client_id = get_user_client_id(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 7. Update SELECT policies for structures table
DROP POLICY IF EXISTS "Authenticated users can view structures" ON public.structures;
CREATE POLICY "Users can view own client structures" ON public.structures
  FOR SELECT USING (
    client_id = get_user_client_id(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 8. Update SELECT policies for parametres_referentiels table
DROP POLICY IF EXISTS "Authenticated users can view referentiels" ON public.parametres_referentiels;
CREATE POLICY "Users can view own client referentiels" ON public.parametres_referentiels
  FOR SELECT USING (
    client_id = get_user_client_id(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 9. Update SELECT policies for exercices table
DROP POLICY IF EXISTS "Authenticated users can view exercices" ON public.exercices;
CREATE POLICY "Users can view own client exercices" ON public.exercices
  FOR SELECT USING (
    client_id = get_user_client_id(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 10. Update SELECT policies for projets table
DROP POLICY IF EXISTS "Authenticated users can view projets" ON public.projets;
CREATE POLICY "Users can view own client projets" ON public.projets
  FOR SELECT USING (
    client_id = get_user_client_id(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 11. Fix profiles table PII exposure - restrict super_admin to same client
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view own client profiles" ON public.profiles
  FOR SELECT USING (
    id = auth.uid() OR (
      has_role(auth.uid(), 'super_admin'::app_role) AND
      client_id = get_user_client_id(auth.uid())
    )
  );