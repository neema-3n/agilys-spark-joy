-- Story 2.3 follow-up: enforce upper bound consistency with API validation

ALTER TABLE public.tenant_retention_policies
  DROP CONSTRAINT IF EXISTS chk_tenant_retention_policies_retention_days_positive;

ALTER TABLE public.tenant_retention_policies
  ADD CONSTRAINT chk_tenant_retention_policies_retention_days_range
  CHECK (retention_days > 0 AND retention_days <= 36500);
