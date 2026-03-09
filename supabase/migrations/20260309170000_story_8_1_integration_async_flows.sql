-- Story 8.1 - Flux d'intégration asynchrones (outbox + ingestion idempotente)

CREATE TABLE IF NOT EXISTS public.integration_async_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  exercice_id uuid NOT NULL REFERENCES public.exercices(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('outgoing', 'incoming')),
  event_type text NOT NULL,
  correlation_id text NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  payload jsonb NOT NULL,
  schema_version text NOT NULL DEFAULT '1.0.0',
  status text NOT NULL CHECK (status IN ('queued', 'sent', 'acked', 'received', 'processed', 'failed', 'dead_letter', 'replayed')),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  reason_code text,
  reason_message text,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts >= 1),
  next_retry_at timestamptz,
  dead_lettered_at timestamptz,
  occurred_at timestamptz NOT NULL,
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_integration_async_dedup UNIQUE (tenant_id, exercice_id, direction, correlation_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_integration_async_events_scope
  ON public.integration_async_events (tenant_id, exercice_id, direction, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_async_events_retry
  ON public.integration_async_events (status, next_retry_at)
  WHERE status IN ('queued', 'failed', 'replayed');

CREATE INDEX IF NOT EXISTS idx_integration_async_events_correlation
  ON public.integration_async_events (tenant_id, exercice_id, correlation_id, event_type);

CREATE TABLE IF NOT EXISTS public.integration_async_event_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.integration_async_events(id) ON DELETE CASCADE,
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  exercice_id uuid NOT NULL REFERENCES public.exercices(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('outgoing', 'incoming')),
  attempt_number integer NOT NULL,
  action text NOT NULL CHECK (action IN ('dispatch', 'ingest', 'manual-retry')),
  status text NOT NULL CHECK (status IN ('queued', 'sent', 'acked', 'received', 'processed', 'failed', 'dead_letter', 'replayed', 'duplicate')),
  reason_code text,
  reason_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_async_event_attempts_scope
  ON public.integration_async_event_attempts (tenant_id, exercice_id, event_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_integration_async_events_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_integration_async_events_updated_at ON public.integration_async_events;
CREATE TRIGGER trg_integration_async_events_updated_at
BEFORE UPDATE ON public.integration_async_events
FOR EACH ROW
EXECUTE FUNCTION public.set_integration_async_events_updated_at();
