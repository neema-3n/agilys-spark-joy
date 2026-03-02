DO $$
DECLARE
  v_exercice_id UUID;
BEGIN
  IF to_regclass('public.exercices') IS NULL THEN
    RAISE EXCEPTION 'Table public.exercices introuvable. Executez db:migrate avant db:seed.';
  END IF;

  INSERT INTO public.exercices (
    client_id,
    code,
    libelle,
    date_debut,
    date_fin,
    statut
  )
  VALUES (
    'client-demo',
    'EX-2026',
    'Exercice 2026',
    DATE '2026-01-01',
    DATE '2026-12-31',
    'ouvert'
  )
  ON CONFLICT (client_id, code)
  DO UPDATE SET
    libelle = EXCLUDED.libelle,
    date_debut = EXCLUDED.date_debut,
    date_fin = EXCLUDED.date_fin,
    statut = EXCLUDED.statut,
    updated_at = now()
  RETURNING id INTO v_exercice_id;

  IF v_exercice_id IS NULL THEN
    SELECT id
    INTO v_exercice_id
    FROM public.exercices
    WHERE client_id = 'client-demo' AND code = 'EX-2026'
    LIMIT 1;
  END IF;

  IF to_regclass('public.enveloppes') IS NOT NULL AND v_exercice_id IS NOT NULL THEN
    INSERT INTO public.enveloppes (
      client_id,
      exercice_id,
      code,
      nom,
      source_financement,
      montant_alloue,
      montant_consomme,
      statut
    )
    VALUES (
      'client-demo',
      v_exercice_id,
      'ENV-GEN-2026',
      'Enveloppe Generale 2026',
      'Subvention',
      1000000.00,
      0.00,
      'actif'
    )
    ON CONFLICT (client_id, exercice_id, code)
    DO UPDATE SET
      nom = EXCLUDED.nom,
      source_financement = EXCLUDED.source_financement,
      montant_alloue = EXCLUDED.montant_alloue,
      statut = EXCLUDED.statut,
      updated_at = now();
  END IF;
END;
$$;
