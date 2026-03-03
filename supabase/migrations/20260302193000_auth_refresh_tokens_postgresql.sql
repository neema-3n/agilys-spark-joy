-- Story 2.5: persistance PostgreSQL des refresh tokens auth

CREATE TABLE IF NOT EXISTS public.auth_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.auth_refresh_tokens (
  jti TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_auth_refresh_tokens_user
    FOREIGN KEY (user_id)
    REFERENCES public.auth_users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_expires_at
  ON public.auth_refresh_tokens (expires_at);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_revoked_at
  ON public.auth_refresh_tokens (revoked_at);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user_tenant
  ON public.auth_refresh_tokens (user_id, tenant_id);

CREATE OR REPLACE FUNCTION public.set_auth_refresh_tokens_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_refresh_tokens_updated_at ON public.auth_refresh_tokens;
CREATE TRIGGER trg_auth_refresh_tokens_updated_at
  BEFORE UPDATE ON public.auth_refresh_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.set_auth_refresh_tokens_updated_at();

COMMENT ON TABLE public.auth_refresh_tokens IS
  'Refresh token hash store with persistent revocation for multi-instance auth.';

ALTER TABLE public.auth_refresh_tokens
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.auth_refresh_tokens
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
