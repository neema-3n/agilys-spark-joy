-- Story 2.3 follow-up: tenant catalog as source of truth for tenant existence checks

CREATE TABLE IF NOT EXISTS public.tenants (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_tenants_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenants_updated_at ON public.tenants;
CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenants_updated_at();

INSERT INTO public.tenants (id, display_name, is_active)
VALUES
  ('tenant-1', 'Tenant 1', true),
  ('tenant-2', 'Tenant 2', true)
ON CONFLICT (id) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  is_active = EXCLUDED.is_active,
  updated_at = now();
