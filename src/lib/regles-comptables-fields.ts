import type { TypeOperation } from '@/types/regle-comptable.types';

export interface FieldDefinition {
  value: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: string[];
}

export const OPERATION_FIELDS: Record<TypeOperation, FieldDefinition[]> = {
  reservation: [
    { value: 'statut', label: 'Statut', type: 'select', options: ['active', 'utilisee', 'annulee', 'expiree'] },
    { value: 'montant', label: 'Montant', type: 'number' },
    { value: 'beneficiaire', label: 'Bénéficiaire', type: 'text' },
    { value: 'objet', label: 'Objet', type: 'text' },
  ],
  engagement: [
    { value: 'statut', label: 'Statut', type: 'select', options: ['brouillon', 'valide', 'engage', 'liquide', 'annule'] },
    { value: 'montant', label: 'Montant', type: 'number' },
    { value: 'beneficiaire', label: 'Bénéficiaire', type: 'text' },
    { value: 'objet', label: 'Objet', type: 'text' },
  ],
  bon_commande: [
    { value: 'statut', label: 'Statut', type: 'select', options: ['brouillon', 'valide', 'en_cours', 'receptionne', 'facture', 'annule'] },
    { value: 'montant', label: 'Montant', type: 'number' },
    { value: 'objet', label: 'Objet', type: 'text' },
  ],
  facture: [
    { value: 'statut', label: 'Statut', type: 'select', options: ['brouillon', 'validee', 'payee', 'annulee'] },
    { value: 'montant_ht', label: 'Montant HT', type: 'number' },
    { value: 'montant_ttc', label: 'Montant TTC', type: 'number' },
    { value: 'objet', label: 'Objet', type: 'text' },
  ],
  depense: [
    { value: 'statut', label: 'Statut', type: 'select', options: ['brouillon', 'validee', 'ordonnancee', 'payee', 'annulee'] },
    { value: 'montant', label: 'Montant', type: 'number' },
    { value: 'beneficiaire', label: 'Bénéficiaire', type: 'text' },
    { value: 'objet', label: 'Objet', type: 'text' },
    { value: 'mode_paiement', label: 'Mode de paiement', type: 'select', options: ['virement', 'cheque', 'especes', 'carte', 'autre'] },
  ],
  paiement: [
    { value: 'statut', label: 'Statut', type: 'select', options: ['valide', 'annule'] },
    { value: 'montant', label: 'Montant', type: 'number' },
    { value: 'mode_paiement', label: 'Mode de paiement', type: 'select', options: ['virement', 'cheque', 'especes', 'carte', 'autre'] },
    { value: 'reference_paiement', label: 'Référence', type: 'text' },
  ],
};

export const TYPE_OPERATION_LABELS: Record<TypeOperation, string> = {
  reservation: 'Réservation de crédit',
  engagement: 'Engagement',
  bon_commande: 'Bon de commande',
  facture: 'Facture',
  depense: 'Dépense',
  paiement: 'Paiement',
};

export const OPERATEUR_LABELS: Record<string, string> = {
  '==': 'Égal à',
  '!=': 'Différent de',
  '>': 'Supérieur à',
  '<': 'Inférieur à',
  '>=': 'Supérieur ou égal à',
  '<=': 'Inférieur ou égal à',
  'contient': 'Contient',
  'commence_par': 'Commence par',
};
