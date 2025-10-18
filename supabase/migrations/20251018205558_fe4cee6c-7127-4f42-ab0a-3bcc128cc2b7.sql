-- Ajouter les nouvelles colonnes libelle et code
ALTER TABLE public.exercices ADD COLUMN libelle TEXT;
ALTER TABLE public.exercices ADD COLUMN code TEXT;

-- Migrer les données existantes (avant de rendre libelle NOT NULL)
UPDATE public.exercices
SET 
  libelle = 'Exercice ' || annee::text,
  code = 'EX' || annee::text
WHERE libelle IS NULL;

-- Rendre libelle NOT NULL maintenant que les données sont migrées
ALTER TABLE public.exercices ALTER COLUMN libelle SET NOT NULL;

-- Ajouter une contrainte d'unicité sur le code par client
ALTER TABLE public.exercices ADD CONSTRAINT exercices_client_code_unique UNIQUE (client_id, code);

-- Supprimer la colonne annee qui n'est plus nécessaire
ALTER TABLE public.exercices DROP COLUMN annee;

-- Mettre à jour la fonction de vérification pour empêcher les chevauchements de dates
CREATE OR REPLACE FUNCTION public.check_exercice_ouvert()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier qu'il n'y a pas de chevauchement de dates pour les exercices ouverts
  IF NEW.statut = 'ouvert' THEN
    IF EXISTS (
      SELECT 1 FROM public.exercices
      WHERE client_id = NEW.client_id
      AND statut = 'ouvert'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        -- Vérifier les chevauchements de dates
        (NEW.date_debut BETWEEN date_debut AND date_fin)
        OR (NEW.date_fin BETWEEN date_debut AND date_fin)
        OR (date_debut BETWEEN NEW.date_debut AND NEW.date_fin)
        OR (date_fin BETWEEN NEW.date_debut AND NEW.date_fin)
      )
    ) THEN
      RAISE EXCEPTION 'Un exercice ouvert avec des dates qui se chevauchent existe déjà pour ce client';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';