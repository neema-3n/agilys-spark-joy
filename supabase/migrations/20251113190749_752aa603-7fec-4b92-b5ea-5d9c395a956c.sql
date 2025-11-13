-- Ajouter uniquement les foreign keys manquantes sur engagements

-- FK vers lignes_budgetaires (obligatoire) - MANQUANTE
ALTER TABLE public.engagements 
ADD CONSTRAINT engagements_ligne_budgetaire_id_fkey 
FOREIGN KEY (ligne_budgetaire_id) 
REFERENCES public.lignes_budgetaires(id)
ON DELETE RESTRICT;

-- Créer l'index correspondant
CREATE INDEX IF NOT EXISTS idx_engagements_ligne_budgetaire_id 
ON public.engagements(ligne_budgetaire_id);