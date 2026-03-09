-- Story 8.2 - Mode degrade et reprise apres reconnexion

CREATE TABLE IF NOT EXISTS public.offline_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  exercice_id uuid NOT NULL REFERENCES public.exercices(id) ON DELETE CASCADE,
  local_id text NOT NULL,
  operation_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  idempotency_key text NOT NULL,
  correlation_id text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'syncing', 'synced', 'failed', 'conflict')),
  conflict_code text CHECK (conflict_code IN ('stale_version', 'forbidden_transition', 'missing_dependency', 'cross_tenant_scope')),
  conflict_message text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 5 CHECK (max_retries >= 1),
  queued_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz,
  synced_at timestamptz,
  next_retry_at timestamptz,
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_offline_sync_idempotency UNIQUE (tenant_id, exercice_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_offline_sync_events_scope_status
  ON public.offline_sync_events (tenant_id, exercice_id, status, queued_at ASC);

CREATE INDEX IF NOT EXISTS idx_offline_sync_events_retry
  ON public.offline_sync_events (tenant_id, exercice_id, next_retry_at)
  WHERE status IN ('failed', 'queued');

CREATE INDEX IF NOT EXISTS idx_offline_sync_events_correlation
  ON public.offline_sync_events (tenant_id, exercice_id, correlation_id);

CREATE TABLE IF NOT EXISTS public.offline_sync_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.offline_sync_events(id) ON DELETE CASCADE,
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  exercice_id uuid NOT NULL REFERENCES public.exercices(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('queued', 'syncing', 'synced', 'failed', 'conflict')),
  retry_count integer NOT NULL DEFAULT 0,
  reason_code text,
  reason_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offline_sync_attempts_scope
  ON public.offline_sync_attempts (tenant_id, exercice_id, event_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_offline_sync_events_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_offline_sync_events_updated_at ON public.offline_sync_events;
CREATE TRIGGER trg_offline_sync_events_updated_at
BEFORE UPDATE ON public.offline_sync_events
FOR EACH ROW
EXECUTE FUNCTION public.set_offline_sync_events_updated_at();
