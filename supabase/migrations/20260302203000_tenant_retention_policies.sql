-- Story 2.3: politiques de retention versionnees et scopees par tenant

CREATE TABLE IF NOT EXISTS public.tenant_retention_policies (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  policy_key TEXT NOT NULL DEFAULT 'default',
  version INTEGER NOT NULL,
  retention_days INTEGER NOT NULL,
  legal_hold_enabled BOOLEAN NOT NULL DEFAULT false,
  is_current BOOLEAN NOT NULL DEFAULT true,
  updated_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_tenant_retention_policies_version_positive CHECK (version > 0),
  CONSTRAINT chk_tenant_retention_policies_retention_days_positive CHECK (retention_days > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_retention_policies_tenant_key_version
  ON public.tenant_retention_policies (tenant_id, policy_key, version);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_retention_policies_current_per_tenant
  ON public.tenant_retention_policies (tenant_id, policy_key)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_tenant_retention_policies_tenant_current
  ON public.tenant_retention_policies (tenant_id, is_current);

CREATE OR REPLACE FUNCTION public.set_tenant_retention_policies_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_retention_policies_updated_at ON public.tenant_retention_policies;
CREATE TRIGGER trg_tenant_retention_policies_updated_at
  BEFORE UPDATE ON public.tenant_retention_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_retention_policies_updated_at();

COMMENT ON TABLE public.tenant_retention_policies IS
  'Historique versionne des politiques de retention scopees par tenant.';
