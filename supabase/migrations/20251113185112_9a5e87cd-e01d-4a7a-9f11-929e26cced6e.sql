-- Supprimer les contraintes de clés étrangères en double créées par erreur
-- Les contraintes originales existaient déjà

-- Supprimer la FK en double vers fournisseurs
ALTER TABLE public.engagements 
DROP CONSTRAINT IF EXISTS fk_engagements_fournisseur;

-- Supprimer la FK en double vers projets
ALTER TABLE public.engagements 
DROP CONSTRAINT IF EXISTS fk_engagements_projet;

-- Supprimer la FK en double vers reservations_credits
ALTER TABLE public.engagements 
DROP CONSTRAINT IF EXISTS fk_engagements_reservation_credit;

-- Supprimer la FK en double vers exercices
ALTER TABLE public.engagements 
DROP CONSTRAINT IF EXISTS fk_engagements_exercice;

-- Supprimer la FK en double vers lignes_budgetaires
ALTER TABLE public.engagements 
DROP CONSTRAINT IF EXISTS fk_engagements_ligne_budgetaire;