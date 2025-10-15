import { Section, Programme, Action, LigneBudgetaire, ModificationBudgetaire } from '@/types/budget.types';

export const MOCK_SECTIONS: Section[] = [
  { id: 'sec-1', code: 'S01', libelle: 'Fonctionnement', ordre: 1 },
  { id: 'sec-2', code: 'S02', libelle: 'Investissement', ordre: 2 },
];

export const MOCK_PROGRAMMES: Programme[] = [
  { id: 'prog-1', sectionId: 'sec-1', code: 'P01', libelle: 'Administration Générale', ordre: 1 },
  { id: 'prog-2', sectionId: 'sec-1', code: 'P02', libelle: 'Services Techniques', ordre: 2 },
  { id: 'prog-3', sectionId: 'sec-2', code: 'P03', libelle: 'Équipements et Infrastructures', ordre: 3 },
];

export const MOCK_ACTIONS: Action[] = [
  { id: 'act-1', programmeId: 'prog-1', code: 'A01', libelle: 'Personnel', ordre: 1 },
  { id: 'act-2', programmeId: 'prog-1', code: 'A02', libelle: 'Fournitures de bureau', ordre: 2 },
  { id: 'act-3', programmeId: 'prog-2', code: 'A03', libelle: 'Entretien véhicules', ordre: 3 },
  { id: 'act-4', programmeId: 'prog-2', code: 'A04', libelle: 'Prestations techniques', ordre: 4 },
  { id: 'act-5', programmeId: 'prog-3', code: 'A05', libelle: 'Construction bâtiments', ordre: 5 },
  { id: 'act-6', programmeId: 'prog-3', code: 'A06', libelle: 'Équipements informatiques', ordre: 6 },
];

export const MOCK_LIGNES_BUDGETAIRES: LigneBudgetaire[] = [
  {
    id: 'lb-1',
    exerciceId: 'ex-2024',
    actionId: 'act-1',
    compteId: 'cpt-601',
    libelle: 'Salaires et traitements',
    montantInitial: 50000000,
    montantModifie: 50000000,
    montantEngage: 35000000,
    montantPaye: 30000000,
    disponible: 15000000,
    dateCreation: '2024-01-01',
    statut: 'actif'
  },
  {
    id: 'lb-2',
    exerciceId: 'ex-2024',
    actionId: 'act-2',
    compteId: 'cpt-605',
    libelle: 'Fournitures de bureau',
    montantInitial: 5000000,
    montantModifie: 5500000,
    montantEngage: 3200000,
    montantPaye: 2800000,
    disponible: 2300000,
    dateCreation: '2024-01-01',
    statut: 'actif'
  },
  {
    id: 'lb-3',
    exerciceId: 'ex-2024',
    actionId: 'act-3',
    compteId: 'cpt-615',
    libelle: 'Entretien et maintenance véhicules',
    montantInitial: 8000000,
    montantModifie: 7500000,
    montantEngage: 5000000,
    montantPaye: 4500000,
    disponible: 2500000,
    dateCreation: '2024-01-01',
    statut: 'actif'
  },
  {
    id: 'lb-4',
    exerciceId: 'ex-2024',
    actionId: 'act-4',
    compteId: 'cpt-625',
    libelle: 'Prestations techniques',
    montantInitial: 12000000,
    montantModifie: 12000000,
    montantEngage: 8000000,
    montantPaye: 6000000,
    disponible: 4000000,
    dateCreation: '2024-01-01',
    statut: 'actif'
  },
  {
    id: 'lb-5',
    exerciceId: 'ex-2024',
    actionId: 'act-5',
    compteId: 'cpt-221',
    libelle: 'Construction bâtiments administratifs',
    montantInitial: 75000000,
    montantModifie: 75000000,
    montantEngage: 45000000,
    montantPaye: 30000000,
    disponible: 30000000,
    dateCreation: '2024-01-01',
    statut: 'actif'
  },
  {
    id: 'lb-6',
    exerciceId: 'ex-2024',
    actionId: 'act-6',
    compteId: 'cpt-218',
    libelle: 'Équipements informatiques',
    montantInitial: 15000000,
    montantModifie: 15000000,
    montantEngage: 8000000,
    montantPaye: 7000000,
    disponible: 7000000,
    dateCreation: '2024-01-01',
    statut: 'actif'
  },
];

export const MOCK_MODIFICATIONS_BUDGETAIRES: ModificationBudgetaire[] = [
  {
    id: 'mod-1',
    exerciceId: 'ex-2024',
    numero: 'MOD/2024/001',
    type: 'augmentation',
    ligneDestinationId: 'lb-2',
    montant: 500000,
    motif: 'Augmentation des besoins en fournitures',
    statut: 'validee',
    dateCreation: '2024-02-15',
    dateValidation: '2024-02-20',
    validePar: 'user-1'
  },
  {
    id: 'mod-2',
    exerciceId: 'ex-2024',
    numero: 'MOD/2024/002',
    type: 'virement',
    ligneSourceId: 'lb-3',
    ligneDestinationId: 'lb-4',
    montant: 500000,
    motif: 'Réallocation pour prestations urgentes',
    statut: 'en_attente',
    dateCreation: '2024-03-01'
  },
  {
    id: 'mod-3',
    exerciceId: 'ex-2024',
    numero: 'MOD/2024/003',
    type: 'diminution',
    ligneDestinationId: 'lb-3',
    montant: 500000,
    motif: 'Réduction des dépenses d\'entretien',
    statut: 'validee',
    dateCreation: '2024-03-01',
    dateValidation: '2024-03-05',
    validePar: 'user-1'
  },
];
