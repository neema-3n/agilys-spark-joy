-- Story 5.3 - Workflow d'exception gouverné par quorum

CREATE TABLE IF NOT EXISTS public.workflow_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  exercice_id UUID NOT NULL REFERENCES public.exercices(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  transition TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID NULL,
  entity_id UUID NULL,
  correlation_id TEXT NOT NULL,
  motif TEXT NOT NULL,
  justification TEXT NOT NULL,
  urgence TEXT NOT NULL,
  quorum_required INTEGER NOT NULL DEFAULT 2,
  expires_at TIMESTAMPTZ NOT NULL,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approved_at TIMESTAMPTZ NULL,
  decided_at TIMESTAMPTZ NULL,
  consumed_at TIMESTAMPTZ NULL,
  consumed_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  consumed_transition TEXT NULL,
  risk_decision JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_workflow_exceptions_status CHECK (status IN ('soumise', 'approuvee', 'rejetee', 'expiree', 'consommee')),
  CONSTRAINT chk_workflow_exceptions_transition CHECK (transition IN ('engagement:create', 'engagement:validate', 'paiement:execute', 'paiement:reprendre', 'depense:ordonnancer')),
  CONSTRAINT chk_workflow_exceptions_source_type CHECK (source_type IN ('engagement', 'paiement', 'depense')),
  CONSTRAINT chk_workflow_exceptions_urgence CHECK (urgence IN ('faible', 'normale', 'haute', 'critique')),
  CONSTRAINT chk_workflow_exceptions_quorum CHECK (quorum_required >= 1)
);

CREATE TABLE IF NOT EXISTS public.workflow_exception_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id UUID NOT NULL REFERENCES public.workflow_exceptions(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  decision TEXT NOT NULL,
  commentaire TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_workflow_exception_votes_decision CHECK (decision IN ('approuver', 'rejeter')),
  CONSTRAINT uq_workflow_exception_votes_once_per_user UNIQUE (exception_id, actor_user_id)
);

CREATE TABLE IF NOT EXISTS public.workflow_exception_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id UUID NOT NULL REFERENCES public.workflow_exceptions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_exceptions_tenant_exercice_status
  ON public.workflow_exceptions (tenant_id, exercice_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_exceptions_scope
  ON public.workflow_exceptions (tenant_id, exercice_id, transition, source_type, source_id, entity_id);

CREATE INDEX IF NOT EXISTS idx_workflow_exceptions_expires_at
  ON public.workflow_exceptions (status, expires_at);

CREATE INDEX IF NOT EXISTS idx_workflow_exception_votes_exception
  ON public.workflow_exception_votes (exception_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_workflow_exception_events_exception
  ON public.workflow_exception_events (exception_id, created_at ASC);

CREATE OR REPLACE FUNCTION public.set_workflow_exceptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workflow_exceptions_updated_at ON public.workflow_exceptions;
CREATE TRIGGER trg_workflow_exceptions_updated_at
BEFORE UPDATE ON public.workflow_exceptions
FOR EACH ROW
EXECUTE FUNCTION public.set_workflow_exceptions_updated_at();
