-- Ajouter les contraintes de clés étrangères manquantes sur la table engagements

-- Clé étrangère vers lignes_budgetaires
ALTER TABLE public.engagements 
ADD CONSTRAINT fk_engagements_ligne_budgetaire 
FOREIGN KEY (ligne_budgetaire_id) 
REFERENCES public.lignes_budgetaires(id)
ON DELETE RESTRICT;

-- Clé étrangère vers fournisseurs
ALTER TABLE public.engagements 
ADD CONSTRAINT fk_engagements_fournisseur 
FOREIGN KEY (fournisseur_id) 
REFERENCES public.fournisseurs(id)
ON DELETE SET NULL;

-- Clé étrangère vers projets
ALTER TABLE public.engagements 
ADD CONSTRAINT fk_engagements_projet 
FOREIGN KEY (projet_id) 
REFERENCES public.projets(id)
ON DELETE SET NULL;

-- Clé étrangère vers reservations_credits
ALTER TABLE public.engagements 
ADD CONSTRAINT fk_engagements_reservation_credit 
FOREIGN KEY (reservation_credit_id) 
REFERENCES public.reservations_credits(id)
ON DELETE SET NULL;

-- Clé étrangère vers exercices
ALTER TABLE public.engagements 
ADD CONSTRAINT fk_engagements_exercice 
FOREIGN KEY (exercice_id) 
REFERENCES public.exercices(id)
ON DELETE RESTRICT;

-- Créer les index pour améliorer les performances des jointures
CREATE INDEX IF NOT EXISTS idx_engagements_ligne_budgetaire_id ON public.engagements(ligne_budgetaire_id);
CREATE INDEX IF NOT EXISTS idx_engagements_fournisseur_id ON public.engagements(fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_engagements_projet_id ON public.engagements(projet_id);
CREATE INDEX IF NOT EXISTS idx_engagements_reservation_credit_id ON public.engagements(reservation_credit_id);
CREATE INDEX IF NOT EXISTS idx_engagements_exercice_id ON public.engagements(exercice_id);