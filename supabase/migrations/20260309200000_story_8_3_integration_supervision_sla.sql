-- Story 8.3 - Supervision divergences + SLA de rattrapage

ALTER TABLE public.integration_async_events
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS treatment_status text,
  ADD COLUMN IF NOT EXISTS owner text,
  ADD COLUMN IF NOT EXISTS detected_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

UPDATE public.integration_async_events
SET
  priority = COALESCE(priority, 'P3'),
  treatment_status = COALESCE(treatment_status, 'open'),
  detected_at = COALESCE(detected_at, created_at)
WHERE priority IS NULL
   OR treatment_status IS NULL
   OR detected_at IS NULL;

ALTER TABLE public.integration_async_events
  ALTER COLUMN priority SET DEFAULT 'P3',
  ALTER COLUMN priority SET NOT NULL,
  ALTER COLUMN treatment_status SET DEFAULT 'open',
  ALTER COLUMN treatment_status SET NOT NULL,
  ALTER COLUMN detected_at SET DEFAULT now(),
  ALTER COLUMN detected_at SET NOT NULL;

ALTER TABLE public.integration_async_events
  DROP CONSTRAINT IF EXISTS integration_async_events_priority_check,
  ADD CONSTRAINT integration_async_events_priority_check
    CHECK (priority IN ('P1', 'P2', 'P3')),
  DROP CONSTRAINT IF EXISTS integration_async_events_treatment_status_check,
  ADD CONSTRAINT integration_async_events_treatment_status_check
    CHECK (treatment_status IN ('open', 'triaged', 'in_progress', 'resolved', 'closed'));

CREATE INDEX IF NOT EXISTS idx_integration_async_events_supervision_priority
  ON public.integration_async_events (tenant_id, exercice_id, priority, treatment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_async_events_supervision_owner
  ON public.integration_async_events (tenant_id, exercice_id, owner, created_at DESC)
  WHERE owner IS NOT NULL;

DO $$
DECLARE
  existing_action_check text;
BEGIN
  SELECT c.conname
  INTO existing_action_check
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'integration_async_event_attempts'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%action%'
  LIMIT 1;

  IF existing_action_check IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.integration_async_event_attempts DROP CONSTRAINT %I',
      existing_action_check
    );
  END IF;
END;
$$;

ALTER TABLE public.integration_async_event_attempts
  ADD CONSTRAINT integration_async_event_attempts_action_check
    CHECK (action IN ('dispatch', 'ingest', 'manual-retry', 'escalate', 'reconcile-manual'));
