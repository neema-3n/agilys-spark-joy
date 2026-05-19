ALTER TABLE public.regles_comptables
  DROP CONSTRAINT IF EXISTS regles_comptables_source_montant_check;

ALTER TABLE public.regles_comptables
  ADD CONSTRAINT regles_comptables_source_montant_check
  CHECK (source_montant IN ('montant', 'montant_ht', 'montant_ttc', 'montant_net_paye', 'ventilation_montant'));

UPDATE public.regles_comptables
SET source_montant = 'montant'
WHERE type_operation IN ('depense', 'paiement')
  AND source_montant IN ('montant_ttc', 'montant_net_paye');

ALTER TABLE public.depenses
  DROP CONSTRAINT IF EXISTS depenses_charge_principale_mode_check;

ALTER TABLE public.paiements
  DROP CONSTRAINT IF EXISTS paiements_charge_principale_mode_check;

ALTER TABLE public.paiements
  DROP CONSTRAINT IF EXISTS paiements_source_check;

ALTER TABLE public.paiements
  ADD CONSTRAINT paiements_source_check
  CHECK (depense_id IS NOT NULL) NOT VALID;

ALTER TABLE public.depenses
  ADD CONSTRAINT depenses_source_check
  CHECK (engagement_id IS NOT NULL OR facture_id IS NOT NULL) NOT VALID;

ALTER TABLE public.depenses
  DROP COLUMN IF EXISTS montant_ht,
  DROP COLUMN IF EXISTS montant_ttc,
  DROP COLUMN IF EXISTS montant_net_paye,
  DROP COLUMN IF EXISTS total_ajouts,
  DROP COLUMN IF EXISTS total_retraits,
  DROP COLUMN IF EXISTS charge_principale_mode,
  DROP COLUMN IF EXISTS nature_compte_charge_id,
  DROP COLUMN IF EXISTS ventilations;

ALTER TABLE public.paiements
  DROP COLUMN IF EXISTS montant_ht,
  DROP COLUMN IF EXISTS montant_ttc,
  DROP COLUMN IF EXISTS montant_net_paye,
  DROP COLUMN IF EXISTS total_ajouts,
  DROP COLUMN IF EXISTS total_retraits,
  DROP COLUMN IF EXISTS charge_principale_mode,
  DROP COLUMN IF EXISTS nature_compte_charge_id,
  DROP COLUMN IF EXISTS compte_charge_id,
  DROP COLUMN IF EXISTS ventilations;
