ALTER TABLE public.comptes
  ADD COLUMN IF NOT EXISTS version_group_id UUID,
  ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS version_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS effective_start_date DATE,
  ADD COLUMN IF NOT EXISTS effective_end_date DATE,
  ADD COLUMN IF NOT EXISTS change_reason TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS superseded_by_id UUID REFERENCES public.comptes(id);

UPDATE public.comptes
SET
  version_group_id = COALESCE(version_group_id, gen_random_uuid()),
  version_number = COALESCE(version_number, 1),
  version_status = CASE
    WHEN version_status IN ('draft', 'published', 'archived') THEN version_status
    WHEN statut = 'actif' THEN 'published'
    ELSE 'archived'
  END,
  effective_start_date = COALESCE(effective_start_date, CURRENT_DATE),
  change_reason = COALESCE(change_reason, 'Migration initiale du plan comptable'),
  published_at = CASE
    WHEN published_at IS NOT NULL THEN published_at
    WHEN COALESCE(version_status, CASE WHEN statut = 'actif' THEN 'published' ELSE 'archived' END) = 'published' THEN COALESCE(updated_at, created_at, now())
    ELSE NULL
  END,
  archived_at = CASE
    WHEN archived_at IS NOT NULL THEN archived_at
    WHEN COALESCE(version_status, CASE WHEN statut = 'actif' THEN 'published' ELSE 'archived' END) = 'archived' THEN COALESCE(updated_at, created_at, now())
    ELSE NULL
  END
WHERE version_group_id IS NULL
   OR version_status NOT IN ('draft', 'published', 'archived')
   OR effective_start_date IS NULL;

ALTER TABLE public.comptes
  ALTER COLUMN version_group_id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN version_group_id SET NOT NULL;

ALTER TABLE public.comptes
  DROP CONSTRAINT IF EXISTS comptes_client_id_numero_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comptes_version_status_check'
  ) THEN
    ALTER TABLE public.comptes
      ADD CONSTRAINT comptes_version_status_check
      CHECK (version_status IN ('draft', 'published', 'archived'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comptes_effective_date_range_check'
  ) THEN
    ALTER TABLE public.comptes
      ADD CONSTRAINT comptes_effective_date_range_check
      CHECK (effective_end_date IS NULL OR effective_start_date IS NULL OR effective_end_date >= effective_start_date);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comptes_change_reason_required_check'
  ) THEN
    ALTER TABLE public.comptes
      ADD CONSTRAINT comptes_change_reason_required_check
      CHECK (
        version_status NOT IN ('published', 'archived')
        OR NULLIF(BTRIM(change_reason), '') IS NOT NULL
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_comptes_version_group_number
  ON public.comptes (client_id, version_group_id, version_number);

CREATE INDEX IF NOT EXISTS idx_comptes_latest_version
  ON public.comptes (client_id, numero, version_status)
  WHERE superseded_by_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_comptes_current_numero_unique
  ON public.comptes (client_id, numero)
  WHERE superseded_by_id IS NULL;
