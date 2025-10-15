import { StatutEngagement } from '@/types';

export interface Engagement {
  id: string;
  numero: string;
  objet: string;
  montant: number;
  beneficiaire: string;
  statut: StatutEngagement;
  dateCreation: string;
}

export const MOCK_ENGAGEMENTS: Engagement[] = [
  {
    id: 'eng-001',
    numero: 'ENG/2024/001',
    objet: 'Fournitures de bureau',
    montant: 2500000,
    beneficiaire: 'PAPETERIE MODERNE',
    statut: 'valide',
    dateCreation: '2024-01-15'
  },
  {
    id: 'eng-002',
    numero: 'ENG/2024/002',
    objet: 'Entretien véhicules',
    montant: 4800000,
    beneficiaire: 'GARAGE CENTRAL',
    statut: 'en_attente',
    dateCreation: '2024-01-18'
  },
  {
    id: 'eng-003',
    numero: 'ENG/2024/003',
    objet: 'Prestations informatiques',
    montant: 8500000,
    beneficiaire: 'TECHNO SOLUTIONS',
    statut: 'valide',
    dateCreation: '2024-01-20'
  },
  {
    id: 'eng-004',
    numero: 'ENG/2024/004',
    objet: 'Travaux de rénovation',
    montant: 15000000,
    beneficiaire: 'BATIMENT PRO',
    statut: 'engage',
    dateCreation: '2024-01-22'
  },
  {
    id: 'eng-005',
    numero: 'ENG/2024/005',
    objet: 'Formation du personnel',
    montant: 3200000,
    beneficiaire: 'FORMATION PLUS',
    statut: 'brouillon',
    dateCreation: '2024-01-25'
  }
];
