-- Migration: Ajouter le support des projets comme bénéficiaires
ALTER TABLE public.reservations_credits
ADD COLUMN projet_id uuid REFERENCES public.projets(id) ON DELETE SET NULL;

-- Créer un index pour les performances
CREATE INDEX idx_reservations_credits_projet_id ON public.reservations_credits(projet_id);

-- Commentaire pour documentation
COMMENT ON COLUMN public.reservations_credits.projet_id IS 'Référence au projet bénéficiaire (optionnel)';
COMMENT ON COLUMN public.reservations_credits.beneficiaire IS 'Nom du bénéficiaire en texte libre si pas de projet';