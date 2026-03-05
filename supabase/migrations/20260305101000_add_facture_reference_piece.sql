ALTER TABLE public.factures
  ADD COLUMN IF NOT EXISTS reference_piece TEXT;

COMMENT ON COLUMN public.factures.reference_piece IS 'Reference de la piece justificative associee a la facture';
