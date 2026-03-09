ALTER TABLE public.rapprochements_bancaires
  ADD COLUMN IF NOT EXISTS mode_generation TEXT NOT NULL DEFAULT 'manuel'
    CHECK (mode_generation IN ('auto', 'manuel', 'mixte')),
  ADD COLUMN IF NOT EXISTS statut_detaille TEXT NOT NULL DEFAULT 'a_traiter'
    CHECK (statut_detaille IN ('a_traiter', 'en_attente_validation', 'valide', 'annule')),
  ADD COLUMN IF NOT EXISTS score_global NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS categorie_ecart TEXT
    CHECK (categorie_ecart IN ('timing', 'montant', 'reference', 'operation_manquante', 'anomalie_externe')),
  ADD COLUMN IF NOT EXISTS motif_qualification TEXT,
  ADD COLUMN IF NOT EXISTS metadata_audit JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS total_lignes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_propositions_auto INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ecarts_qualifies INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.operations_tresorerie
  ADD COLUMN IF NOT EXISTS rapprochement_bancaire_id UUID REFERENCES public.rapprochements_bancaires(id);

CREATE TABLE IF NOT EXISTS public.rapprochement_bancaire_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rapprochement_id UUID NOT NULL REFERENCES public.rapprochements_bancaires(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  exercice_id UUID NOT NULL REFERENCES public.exercices(id),
  compte_id UUID NOT NULL REFERENCES public.comptes_tresorerie(id),
  ordre INTEGER NOT NULL,
  date_operation DATE NOT NULL,
  libelle TEXT NOT NULL,
  reference_bancaire TEXT,
  montant NUMERIC NOT NULL,
  type_flux TEXT NOT NULL CHECK (type_flux IN ('encaissement', 'decaissement')),
  statut TEXT NOT NULL CHECK (
    statut IN (
      'proposition_unique',
      'ambigu',
      'sans_match',
      'rapprochee_auto',
      'rapprochee_manuelle',
      'ecart_qualifie'
    )
  ),
  score NUMERIC(5,2),
  regles_appliquees JSONB NOT NULL DEFAULT '[]'::jsonb,
  operation_tresorerie_id UUID REFERENCES public.operations_tresorerie(id),
  categorie_ecart TEXT CHECK (categorie_ecart IN ('timing', 'montant', 'reference', 'operation_manquante', 'anomalie_externe')),
  motif_qualification TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rapprochement_bancaire_candidats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ligne_id UUID NOT NULL REFERENCES public.rapprochement_bancaire_lignes(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  exercice_id UUID NOT NULL REFERENCES public.exercices(id),
  compte_id UUID NOT NULL REFERENCES public.comptes_tresorerie(id),
  operation_tresorerie_id UUID NOT NULL REFERENCES public.operations_tresorerie(id),
  score NUMERIC(5,2) NOT NULL,
  statut TEXT NOT NULL DEFAULT 'propose'
    CHECK (statut IN ('propose', 'selectionne', 'rejete')),
  raison JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ligne_id, operation_tresorerie_id)
);

CREATE TABLE IF NOT EXISTS public.rapprochement_bancaire_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rapprochement_id UUID NOT NULL REFERENCES public.rapprochements_bancaires(id) ON DELETE CASCADE,
  ligne_id UUID NOT NULL REFERENCES public.rapprochement_bancaire_lignes(id) ON DELETE CASCADE,
  candidat_id UUID REFERENCES public.rapprochement_bancaire_candidats(id) ON DELETE SET NULL,
  client_id TEXT NOT NULL,
  exercice_id UUID NOT NULL REFERENCES public.exercices(id),
  compte_id UUID NOT NULL REFERENCES public.comptes_tresorerie(id),
  action TEXT NOT NULL CHECK (action IN ('select_candidate', 'reject_candidate', 'qualify_discrepancy')),
  previous_status TEXT,
  next_status TEXT NOT NULL,
  justification TEXT NOT NULL,
  categorie_ecart TEXT CHECK (categorie_ecart IN ('timing', 'montant', 'reference', 'operation_manquante', 'anomalie_externe')),
  actor_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_rapprochement_lignes_rapprochement
  ON public.rapprochement_bancaire_lignes(rapprochement_id, statut);

CREATE INDEX IF NOT EXISTS idx_rapprochement_lignes_scope
  ON public.rapprochement_bancaire_lignes(client_id, exercice_id, compte_id);

CREATE INDEX IF NOT EXISTS idx_rapprochement_candidats_ligne
  ON public.rapprochement_bancaire_candidats(ligne_id, statut);

CREATE INDEX IF NOT EXISTS idx_rapprochement_decisions_rapprochement
  ON public.rapprochement_bancaire_decisions(rapprochement_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operations_rapprochement_bancaire
  ON public.operations_tresorerie(rapprochement_bancaire_id);

