-- Phase 1: Ajouter colonnes pour la gestion des écritures comptables

-- Ajouter le statut de l'écriture (validee par défaut, ou contrepassation pour annulation)
ALTER TABLE ecritures_comptables
  ADD COLUMN statut_ecriture TEXT DEFAULT 'validee';

-- Ajouter la référence à l'écriture d'origine (pour les contrepassations)
ALTER TABLE ecritures_comptables
  ADD COLUMN ecriture_origine_id UUID REFERENCES ecritures_comptables(id) ON DELETE SET NULL;

-- Créer des index pour améliorer les performances
CREATE INDEX idx_ecritures_statut ON ecritures_comptables(statut_ecriture);
CREATE INDEX idx_ecritures_origine ON ecritures_comptables(ecriture_origine_id);

-- Ajouter un commentaire pour documenter les valeurs possibles
COMMENT ON COLUMN ecritures_comptables.statut_ecriture IS 'Statut de l''écriture: validee (normale) ou contrepassation (annulation)';
COMMENT ON COLUMN ecritures_comptables.ecriture_origine_id IS 'ID de l''écriture d''origine pour les contrepassations';