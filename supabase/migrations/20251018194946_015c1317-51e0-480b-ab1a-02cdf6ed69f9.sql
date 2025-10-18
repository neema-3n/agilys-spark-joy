-- Corriger les fonctions pour définir explicitement le search_path

-- Recréer la fonction update_updated_at_column avec search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recréer la fonction check_exercice_ouvert avec search_path
CREATE OR REPLACE FUNCTION public.check_exercice_ouvert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.statut = 'ouvert' THEN
    IF EXISTS (
      SELECT 1 FROM public.exercices
      WHERE client_id = NEW.client_id
      AND annee = NEW.annee
      AND statut = 'ouvert'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Un exercice ouvert existe déjà pour l''année % et ce client', NEW.annee;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;