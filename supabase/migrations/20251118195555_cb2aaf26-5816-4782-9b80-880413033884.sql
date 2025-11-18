-- Ajouter une colonne pour suivre le montant payé
ALTER TABLE factures 
ADD COLUMN montant_paye NUMERIC DEFAULT 0 NOT NULL;

COMMENT ON COLUMN factures.montant_paye IS 'Montant déjà payé sur cette facture';