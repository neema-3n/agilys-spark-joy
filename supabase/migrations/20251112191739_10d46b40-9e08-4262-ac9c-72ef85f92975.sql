-- Ajouter les contraintes de clé étrangère sur reservations_credits

-- Relation vers lignes_budgetaires
ALTER TABLE public.reservations_credits
ADD CONSTRAINT fk_reservations_credits_ligne_budgetaire
FOREIGN KEY (ligne_budgetaire_id)
REFERENCES public.lignes_budgetaires(id)
ON DELETE RESTRICT;

-- Relation vers projets (nullable)
ALTER TABLE public.reservations_credits
ADD CONSTRAINT fk_reservations_credits_projet
FOREIGN KEY (projet_id)
REFERENCES public.projets(id)
ON DELETE SET NULL;

-- Relation vers exercices
ALTER TABLE public.reservations_credits
ADD CONSTRAINT fk_reservations_credits_exercice
FOREIGN KEY (exercice_id)
REFERENCES public.exercices(id)
ON DELETE CASCADE;

-- Relation vers profiles (created_by)
ALTER TABLE public.reservations_credits
ADD CONSTRAINT fk_reservations_credits_created_by
FOREIGN KEY (created_by)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- Créer des index pour améliorer les performances des jointures
CREATE INDEX IF NOT EXISTS idx_reservations_credits_ligne_budgetaire 
ON public.reservations_credits(ligne_budgetaire_id);

CREATE INDEX IF NOT EXISTS idx_reservations_credits_projet 
ON public.reservations_credits(projet_id);

CREATE INDEX IF NOT EXISTS idx_reservations_credits_exercice 
ON public.reservations_credits(exercice_id);

CREATE INDEX IF NOT EXISTS idx_reservations_credits_created_by 
ON public.reservations_credits(created_by);