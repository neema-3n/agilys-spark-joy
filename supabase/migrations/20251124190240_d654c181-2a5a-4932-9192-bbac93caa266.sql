-- Phase 2A : Création des comptes par défaut pour chaque client
-- Créer compte Banque Principale pour chaque client
INSERT INTO public.comptes_tresorerie (
  client_id,
  code,
  libelle,
  type,
  devise,
  solde_initial,
  solde_actuel,
  statut,
  date_ouverture,
  created_at,
  updated_at
)
SELECT DISTINCT
  p.client_id,
  'BQ001',
  'Banque Principale',
  'banque',
  'XOF',
  0,
  0,
  'actif',
  CURRENT_DATE,
  now(),
  now()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.comptes_tresorerie ct 
  WHERE ct.client_id = p.client_id AND ct.code = 'BQ001'
);

-- Créer compte Caisse pour chaque client
INSERT INTO public.comptes_tresorerie (
  client_id,
  code,
  libelle,
  type,
  devise,
  solde_initial,
  solde_actuel,
  statut,
  date_ouverture,
  created_at,
  updated_at
)
SELECT DISTINCT
  p.client_id,
  'CA001',
  'Caisse',
  'caisse',
  'XOF',
  0,
  0,
  'actif',
  CURRENT_DATE,
  now(),
  now()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.comptes_tresorerie ct 
  WHERE ct.client_id = p.client_id AND ct.code = 'CA001'
);

-- Phase 2B : Migration des paiements validés vers opérations de trésorerie
INSERT INTO public.operations_tresorerie (
  client_id,
  exercice_id,
  numero,
  date_operation,
  type_operation,
  compte_id,
  montant,
  libelle,
  mode_paiement,
  reference_bancaire,
  paiement_id,
  statut,
  rapproche,
  created_by,
  created_at,
  updated_at
)
SELECT 
  p.client_id,
  p.exercice_id,
  'OPE' || LPAD(ROW_NUMBER() OVER (PARTITION BY p.client_id ORDER BY p.date_paiement, p.created_at)::TEXT, 6, '0'),
  p.date_paiement,
  'decaissement',
  ct.id, -- ID du compte Banque Principale
  p.montant,
  'Migration paiement ' || p.numero || ' - ' || COALESCE(d.objet, 'Paiement'),
  p.mode_paiement,
  p.reference_paiement,
  p.id,
  'validee',
  false, -- Non rapproché par défaut
  p.created_by,
  p.created_at,
  now()
FROM public.paiements p
INNER JOIN public.comptes_tresorerie ct ON ct.client_id = p.client_id AND ct.code = 'BQ001'
INNER JOIN public.depenses d ON p.depense_id = d.id
WHERE p.statut = 'valide'
  AND NOT EXISTS (
    SELECT 1 FROM public.operations_tresorerie ot WHERE ot.paiement_id = p.id
  );

-- Recalcul des soldes des comptes basé sur les opérations
UPDATE public.comptes_tresorerie ct
SET 
  solde_actuel = COALESCE((
    SELECT 
      SUM(CASE 
        WHEN o.type_operation = 'encaissement' THEN o.montant
        WHEN o.type_operation = 'decaissement' THEN -o.montant
        WHEN o.type_operation = 'transfert' AND o.compte_id = ct.id THEN -o.montant
        WHEN o.type_operation = 'transfert' AND o.compte_contrepartie_id = ct.id THEN o.montant
        ELSE 0
      END)
    FROM public.operations_tresorerie o
    WHERE o.compte_id = ct.id OR o.compte_contrepartie_id = ct.id
  ), 0),
  updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM public.operations_tresorerie o 
  WHERE o.compte_id = ct.id OR o.compte_contrepartie_id = ct.id
);