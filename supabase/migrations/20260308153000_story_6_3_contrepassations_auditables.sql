CREATE UNIQUE INDEX IF NOT EXISTS idx_ecritures_contrepassation_origine_unique
  ON public.ecritures_comptables (ecriture_origine_id)
  WHERE statut_ecriture = 'contrepassation' AND ecriture_origine_id IS NOT NULL;

COMMENT ON INDEX idx_ecritures_contrepassation_origine_unique IS
  'Garantit qu une ecriture validee ne peut etre contre-passee qu une seule fois.';
