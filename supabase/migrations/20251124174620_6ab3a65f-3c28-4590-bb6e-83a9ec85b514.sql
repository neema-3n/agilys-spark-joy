-- Correction des warnings de sécurité : ajout de search_path aux fonctions

-- Fix 1: update_compte_solde
CREATE OR REPLACE FUNCTION update_compte_solde()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.statut = 'validee' THEN
    IF NEW.type_operation = 'encaissement' THEN
      UPDATE public.comptes_tresorerie 
      SET solde_actuel = solde_actuel + NEW.montant,
          updated_at = now()
      WHERE id = NEW.compte_id;
    ELSIF NEW.type_operation = 'decaissement' THEN
      UPDATE public.comptes_tresorerie 
      SET solde_actuel = solde_actuel - NEW.montant,
          updated_at = now()
      WHERE id = NEW.compte_id;
    ELSIF NEW.type_operation = 'transfert' THEN
      UPDATE public.comptes_tresorerie 
      SET solde_actuel = solde_actuel - NEW.montant,
          updated_at = now()
      WHERE id = NEW.compte_id;
      
      UPDATE public.comptes_tresorerie 
      SET solde_actuel = solde_actuel + NEW.montant,
          updated_at = now()
      WHERE id = NEW.compte_contrepartie_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Fix 2: create_operation_from_paiement
CREATE OR REPLACE FUNCTION create_operation_from_paiement()
RETURNS TRIGGER AS $$
DECLARE
  v_compte_id UUID;
  v_numero TEXT;
  v_last_numero TEXT;
  v_next_number INT;
BEGIN
  IF NEW.statut = 'valide' AND (TG_OP = 'INSERT' OR OLD.statut != 'valide') THEN
    SELECT id INTO v_compte_id
    FROM public.comptes_tresorerie
    WHERE client_id = NEW.client_id 
      AND type = 'banque'
      AND statut = 'actif'
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF v_compte_id IS NOT NULL THEN
      SELECT numero INTO v_last_numero
      FROM public.operations_tresorerie
      WHERE client_id = NEW.client_id
      ORDER BY numero DESC
      LIMIT 1
      FOR UPDATE;
      
      IF v_last_numero IS NULL THEN
        v_next_number := 1;
      ELSE
        v_next_number := (regexp_match(v_last_numero, 'OPE(\d+)$'))[1]::INT + 1;
      END IF;
      
      v_numero := 'OPE' || LPAD(v_next_number::TEXT, 6, '0');
      
      INSERT INTO public.operations_tresorerie (
        client_id,
        exercice_id,
        numero,
        date_operation,
        type_operation,
        compte_id,
        montant,
        mode_paiement,
        reference_bancaire,
        libelle,
        paiement_id,
        statut,
        created_by
      ) VALUES (
        NEW.client_id,
        NEW.exercice_id,
        v_numero,
        NEW.date_paiement,
        'decaissement',
        v_compte_id,
        NEW.montant,
        NEW.mode_paiement,
        NEW.reference_paiement,
        'Paiement ' || NEW.numero,
        NEW.id,
        'validee',
        NEW.created_by
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Fix 3: create_operation_from_recette
CREATE OR REPLACE FUNCTION create_operation_from_recette()
RETURNS TRIGGER AS $$
DECLARE
  v_numero TEXT;
  v_last_numero TEXT;
  v_next_number INT;
BEGIN
  IF NEW.statut = 'validee' AND (TG_OP = 'INSERT' OR OLD.statut != 'validee') THEN
    SELECT numero INTO v_last_numero
    FROM public.operations_tresorerie
    WHERE client_id = NEW.client_id
    ORDER BY numero DESC
    LIMIT 1
    FOR UPDATE;
    
    IF v_last_numero IS NULL THEN
      v_next_number := 1;
    ELSE
      v_next_number := (regexp_match(v_last_numero, 'OPE(\d+)$'))[1]::INT + 1;
    END IF;
    
    v_numero := 'OPE' || LPAD(v_next_number::TEXT, 6, '0');
    
    INSERT INTO public.operations_tresorerie (
      client_id,
      exercice_id,
      numero,
      date_operation,
      type_operation,
      compte_id,
      montant,
      libelle,
      categorie,
      recette_id,
      statut,
      created_by
    ) VALUES (
      NEW.client_id,
      NEW.exercice_id,
      v_numero,
      NEW.date_recette,
      'encaissement',
      NEW.compte_destination_id,
      NEW.montant,
      NEW.libelle,
      NEW.categorie,
      NEW.id,
      'validee',
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';