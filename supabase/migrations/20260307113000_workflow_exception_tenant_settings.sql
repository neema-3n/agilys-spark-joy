-- Story 5.3 follow-up - quorum configurable par tenant

CREATE TABLE IF NOT EXISTS public.workflow_exception_tenant_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  quorum_required INTEGER NOT NULL DEFAULT 2,
  updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_workflow_exception_tenant_settings_quorum CHECK (quorum_required >= 1)
);
