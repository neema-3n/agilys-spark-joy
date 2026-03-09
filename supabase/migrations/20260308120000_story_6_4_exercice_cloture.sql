ALTER TABLE public.exercices
  DROP CONSTRAINT IF EXISTS exercices_statut_check;

ALTER TABLE public.exercices
  ADD CONSTRAINT exercices_statut_check
  CHECK (statut IN ('ouvert', 'cloture', 'ouverte', 'en_revue', 'fermee'));

UPDATE public.exercices
SET statut = CASE
  WHEN statut = 'ouvert' THEN 'ouverte'
  WHEN statut = 'cloture' THEN 'fermee'
  ELSE statut
END
WHERE statut IN ('ouvert', 'cloture');

CREATE TABLE IF NOT EXISTS public.exercice_cloture_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercice_id UUID NOT NULL REFERENCES public.exercices(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('pre_cloture', 'cloture', 'reouverture')),
  from_status TEXT NOT NULL CHECK (from_status IN ('ouverte', 'en_revue', 'fermee')),
  to_status TEXT NOT NULL CHECK (to_status IN ('ouverte', 'en_revue', 'fermee')),
  decision TEXT NOT NULL CHECK (decision IN ('accepted', 'blocked')),
  checklist_payload JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercice_cloture_events_exercice_id
  ON public.exercice_cloture_events (exercice_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exercice_cloture_events_client_id
  ON public.exercice_cloture_events (client_id, created_at DESC);
