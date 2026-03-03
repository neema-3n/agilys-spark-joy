CREATE TABLE IF NOT EXISTS public.migration_batches (
  id TEXT PRIMARY KEY,
  lot_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  source_path TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,
  total_inserts INTEGER NOT NULL DEFAULT 0,
  total_updates INTEGER NOT NULL DEFAULT 0,
  total_rejects INTEGER NOT NULL DEFAULT 0,
  total_errors INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_summary JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_migration_batches_lot_name ON public.migration_batches(lot_name);
CREATE INDEX IF NOT EXISTS idx_migration_batches_status ON public.migration_batches(status);

CREATE TABLE IF NOT EXISTS public.migration_batch_sub_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT NOT NULL REFERENCES public.migration_batches(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  watermark TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  source_hash TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,
  inserts_count INTEGER NOT NULL DEFAULT 0,
  updates_count INTEGER NOT NULL DEFAULT 0,
  rejects_count INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  anomalies JSONB NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE(batch_id, domain, watermark)
);

CREATE INDEX IF NOT EXISTS idx_migration_batch_sub_lots_batch ON public.migration_batch_sub_lots(batch_id);
CREATE INDEX IF NOT EXISTS idx_migration_batch_sub_lots_status ON public.migration_batch_sub_lots(status);

CREATE TABLE IF NOT EXISTS public.migration_business_hash_registry (
  domain TEXT NOT NULL,
  business_key TEXT NOT NULL,
  business_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (domain, business_key)
);

CREATE TABLE IF NOT EXISTS public.budget_decision_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  exercice_id UUID NOT NULL REFERENCES public.exercices(id) ON DELETE CASCADE,
  allocation_id UUID NOT NULL REFERENCES public.modifications_budgetaires(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL,
  version INTEGER NOT NULL,
  statut_decision TEXT NOT NULL CHECK (statut_decision IN ('validated', 'rejected')),
  motif TEXT NOT NULL,
  auteur TEXT NOT NULL,
  horodatage TIMESTAMPTZ NOT NULL,
  snapshot_avant JSONB NOT NULL,
  snapshot_apres JSONB NOT NULL,
  business_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(allocation_id, version)
);

CREATE INDEX IF NOT EXISTS idx_budget_decision_versions_client_exercice
  ON public.budget_decision_versions(client_id, exercice_id);

DROP TRIGGER IF EXISTS update_budget_decision_versions_updated_at ON public.budget_decision_versions;
CREATE TRIGGER update_budget_decision_versions_updated_at
  BEFORE UPDATE ON public.budget_decision_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
