CREATE TABLE IF NOT EXISTS public.internal_control_action_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  exercice_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  owner_user_id text NOT NULL,
  due_date timestamptz NOT NULL,
  priority text NOT NULL CHECK (priority IN ('basse', 'moyenne', 'haute', 'critique')),
  status text NOT NULL CHECK (status IN ('a_traiter', 'en_cours', 'resolu', 'rejete', 'cloture')),
  source_type text NOT NULL,
  source_id text NOT NULL,
  entity_id text,
  exception_id uuid,
  correlation_id text,
  evidence_refs text[] NOT NULL DEFAULT ARRAY[]::text[],
  rejection_reason text,
  resolution_note text,
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_control_action_plans_scope
  ON public.internal_control_action_plans (tenant_id, exercice_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_internal_control_action_plans_exception
  ON public.internal_control_action_plans (tenant_id, exercice_id, exception_id, correlation_id);

CREATE TABLE IF NOT EXISTS public.internal_control_action_plan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_plan_id uuid NOT NULL REFERENCES public.internal_control_action_plans(id) ON DELETE CASCADE,
  tenant_id text NOT NULL,
  exercice_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('created', 'updated', 'status_changed')),
  changed_by text NOT NULL,
  reason text,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_control_action_plan_events_scope
  ON public.internal_control_action_plan_events (tenant_id, exercice_id, action_plan_id, created_at DESC);
