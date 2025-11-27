-- Migration : Améliorations du schéma de base de données
-- Date : 2025-11-27
-- Description : Correction des contraintes UNIQUE, ajout de CHECK constraints, triggers updated_at, et FKs manquantes

-- ============================================================================
-- PHASE 1 : CONTRAINTES UNIQUE (client_id, exercice_id, numero)
-- ============================================================================

-- 1. Engagements : remplacer UNIQUE(numero) par UNIQUE(client_id, exercice_id, numero)
ALTER TABLE engagements DROP CONSTRAINT IF EXISTS engagements_numero_key;
ALTER TABLE engagements ADD CONSTRAINT engagements_client_exercice_numero_key 
  UNIQUE (client_id, exercice_id, numero);

-- 2. Factures
ALTER TABLE factures DROP CONSTRAINT IF EXISTS factures_client_numero_unique;
ALTER TABLE factures ADD CONSTRAINT factures_client_exercice_numero_key 
  UNIQUE (client_id, exercice_id, numero);

-- 3. Bons commande
ALTER TABLE bons_commande DROP CONSTRAINT IF EXISTS unique_numero_bc;
ALTER TABLE bons_commande ADD CONSTRAINT bons_commande_client_exercice_numero_key 
  UNIQUE (client_id, exercice_id, numero);

-- 4. Paiements
ALTER TABLE paiements DROP CONSTRAINT IF EXISTS paiements_client_id_numero_key;
ALTER TABLE paiements ADD CONSTRAINT paiements_client_exercice_numero_key 
  UNIQUE (client_id, exercice_id, numero);

-- 5. Recettes
ALTER TABLE recettes DROP CONSTRAINT IF EXISTS recettes_client_id_numero_key;
ALTER TABLE recettes ADD CONSTRAINT recettes_client_exercice_numero_key 
  UNIQUE (client_id, exercice_id, numero);

-- 6. Operations tresorerie
ALTER TABLE operations_tresorerie DROP CONSTRAINT IF EXISTS operations_tresorerie_client_id_numero_key;
ALTER TABLE operations_tresorerie ADD CONSTRAINT operations_tresorerie_client_exercice_numero_key 
  UNIQUE (client_id, exercice_id, numero);

-- 7. Reservations credits (nouvelle contrainte)
ALTER TABLE reservations_credits ADD CONSTRAINT reservations_credits_client_exercice_numero_key 
  UNIQUE (client_id, exercice_id, numero);

-- 8. Modifications budgetaires (nouvelle contrainte)
ALTER TABLE modifications_budgetaires ADD CONSTRAINT modifications_budgetaires_client_exercice_numero_key 
  UNIQUE (client_id, exercice_id, numero);

-- ============================================================================
-- PHASE 2 : CHECK CONSTRAINTS - STATUTS
-- ============================================================================

-- Bons commande (avec en_cours inclus)
ALTER TABLE bons_commande ADD CONSTRAINT bons_commande_statut_check 
  CHECK (statut IN ('brouillon', 'valide', 'en_cours', 'receptionne', 'facture', 'annule'));

-- Factures (avec payee au lieu de liquidee)
ALTER TABLE factures ADD CONSTRAINT factures_statut_check 
  CHECK (statut IN ('brouillon', 'validee', 'payee', 'annulee'));

-- Depenses
ALTER TABLE depenses ADD CONSTRAINT depenses_statut_check 
  CHECK (statut IN ('brouillon', 'validee', 'ordonnancee', 'payee', 'annulee'));

-- Engagements
ALTER TABLE engagements ADD CONSTRAINT engagements_statut_check 
  CHECK (statut IN ('brouillon', 'valide', 'annule'));

-- Reservations credits
ALTER TABLE reservations_credits ADD CONSTRAINT reservations_credits_statut_check 
  CHECK (statut IN ('active', 'utilisee', 'expiree', 'annulee'));

-- Paiements
ALTER TABLE paiements ADD CONSTRAINT paiements_statut_check 
  CHECK (statut IN ('valide', 'annule'));

-- Operations tresorerie
ALTER TABLE operations_tresorerie ADD CONSTRAINT operations_tresorerie_statut_check 
  CHECK (statut IN ('validee', 'annulee'));

-- Modifications budgetaires
ALTER TABLE modifications_budgetaires ADD CONSTRAINT modifications_budgetaires_statut_check 
  CHECK (statut IN ('brouillon', 'valide', 'annule'));

-- Recettes
ALTER TABLE recettes ADD CONSTRAINT recettes_statut_check 
  CHECK (statut IN ('validee', 'annulee'));

-- ============================================================================
-- PHASE 3 : CHECK CONSTRAINTS - MONTANTS >= 0
-- ============================================================================

ALTER TABLE engagements ADD CONSTRAINT engagements_montant_check 
  CHECK (montant >= 0);

ALTER TABLE depenses ADD CONSTRAINT depenses_montant_check 
  CHECK (montant >= 0);

ALTER TABLE factures ADD CONSTRAINT factures_montant_ht_check 
  CHECK (montant_ht >= 0);

ALTER TABLE factures ADD CONSTRAINT factures_montant_ttc_check 
  CHECK (montant_ttc >= 0);

ALTER TABLE bons_commande ADD CONSTRAINT bons_commande_montant_check 
  CHECK (montant >= 0);

ALTER TABLE reservations_credits ADD CONSTRAINT reservations_credits_montant_check 
  CHECK (montant >= 0);

ALTER TABLE paiements ADD CONSTRAINT paiements_montant_check 
  CHECK (montant >= 0);

ALTER TABLE operations_tresorerie ADD CONSTRAINT operations_tresorerie_montant_check 
  CHECK (montant >= 0);

ALTER TABLE recettes ADD CONSTRAINT recettes_montant_check 
  CHECK (montant >= 0);

ALTER TABLE modifications_budgetaires ADD CONSTRAINT modifications_budgetaires_montant_check 
  CHECK (montant >= 0);

-- ============================================================================
-- PHASE 4 : TRIGGERS UPDATED_AT
-- ============================================================================

-- Créer les triggers pour mise à jour automatique de updated_at
CREATE TRIGGER update_depenses_updated_at 
  BEFORE UPDATE ON depenses 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_engagements_updated_at 
  BEFORE UPDATE ON engagements 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_factures_updated_at 
  BEFORE UPDATE ON factures 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paiements_updated_at 
  BEFORE UPDATE ON paiements 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bons_commande_updated_at 
  BEFORE UPDATE ON bons_commande 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_credits_updated_at 
  BEFORE UPDATE ON reservations_credits 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modifications_budgetaires_updated_at 
  BEFORE UPDATE ON modifications_budgetaires 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operations_tresorerie_updated_at 
  BEFORE UPDATE ON operations_tresorerie 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recettes_updated_at 
  BEFORE UPDATE ON recettes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PHASE 5 : FOREIGN KEYS MANQUANTES (modifications_budgetaires)
-- ============================================================================

-- Ajouter les FKs sur modifications_budgetaires
ALTER TABLE modifications_budgetaires 
  ADD CONSTRAINT modifications_budgetaires_ligne_source_id_fkey 
  FOREIGN KEY (ligne_source_id) REFERENCES lignes_budgetaires(id);

ALTER TABLE modifications_budgetaires 
  ADD CONSTRAINT modifications_budgetaires_ligne_destination_id_fkey 
  FOREIGN KEY (ligne_destination_id) REFERENCES lignes_budgetaires(id);

-- ============================================================================
-- PHASE 6 : CONTRAINTES DE DATES (OPTIONNEL)
-- ============================================================================

-- Vérification date_validation >= date_creation pour engagements
ALTER TABLE engagements ADD CONSTRAINT engagements_dates_check 
  CHECK (date_validation IS NULL OR date_validation >= date_creation);

-- Vérification date_validation >= date_depense pour depenses
ALTER TABLE depenses ADD CONSTRAINT depenses_dates_check 
  CHECK (date_validation IS NULL OR date_validation >= date_depense);

-- Vérification date_ordonnancement >= date_depense pour depenses
ALTER TABLE depenses ADD CONSTRAINT depenses_ordonnancement_dates_check 
  CHECK (date_ordonnancement IS NULL OR date_ordonnancement >= date_depense);

-- Vérification date_paiement >= date_ordonnancement pour depenses
ALTER TABLE depenses ADD CONSTRAINT depenses_paiement_dates_check 
  CHECK (date_paiement IS NULL OR date_ordonnancement IS NULL OR date_paiement >= date_ordonnancement);

-- ============================================================================
-- NETTOYAGE DES INDEX REDONDANTS
-- ============================================================================

-- Supprimer les index redondants sur engagements
DROP INDEX IF EXISTS idx_engagements_exercice;
DROP INDEX IF EXISTS idx_engagements_ligne_budgetaire;
DROP INDEX IF EXISTS idx_engagements_reservation;

-- ============================================================================
-- COMMENTAIRES ET DOCUMENTATION
-- ============================================================================

COMMENT ON CONSTRAINT engagements_client_exercice_numero_key ON engagements 
  IS 'Garantit l''unicité des numéros d''engagement par client et exercice';

COMMENT ON CONSTRAINT factures_client_exercice_numero_key ON factures 
  IS 'Garantit l''unicité des numéros de facture par client et exercice';

COMMENT ON CONSTRAINT bons_commande_client_exercice_numero_key ON bons_commande 
  IS 'Garantit l''unicité des numéros de bon de commande par client et exercice';

COMMENT ON CONSTRAINT paiements_client_exercice_numero_key ON paiements 
  IS 'Garantit l''unicité des numéros de paiement par client et exercice';

COMMENT ON CONSTRAINT recettes_client_exercice_numero_key ON recettes 
  IS 'Garantit l''unicité des numéros de recette par client et exercice';

COMMENT ON CONSTRAINT operations_tresorerie_client_exercice_numero_key ON operations_tresorerie 
  IS 'Garantit l''unicité des numéros d''opération de trésorerie par client et exercice';
