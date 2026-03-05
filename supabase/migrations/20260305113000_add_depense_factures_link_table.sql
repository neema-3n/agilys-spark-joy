-- Story 4.3 - Support multi-factures pour une dépense
-- Crée une table de liaison explicite dépense <-> facture avec montant liquidé par facture.

CREATE TABLE IF NOT EXISTS public.depense_factures (
  depense_id UUID NOT NULL REFERENCES public.depenses(id) ON DELETE CASCADE,
  facture_id UUID NOT NULL REFERENCES public.factures(id) ON DELETE RESTRICT,
  montant NUMERIC(15,2) NOT NULL CHECK (montant >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT depense_factures_pkey PRIMARY KEY (depense_id, facture_id)
);

CREATE INDEX IF NOT EXISTS idx_depense_factures_facture_id ON public.depense_factures(facture_id);
CREATE INDEX IF NOT EXISTS idx_depense_factures_depense_id ON public.depense_factures(depense_id);

DROP TRIGGER IF EXISTS update_depense_factures_updated_at ON public.depense_factures;
CREATE TRIGGER update_depense_factures_updated_at
BEFORE UPDATE ON public.depense_factures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill historique mono-facture -> multi-factures
INSERT INTO public.depense_factures (depense_id, facture_id, montant)
SELECT d.id, d.facture_id, d.montant
FROM public.depenses d
WHERE d.facture_id IS NOT NULL
ON CONFLICT (depense_id, facture_id) DO NOTHING;
