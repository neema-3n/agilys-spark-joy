import { Exercice } from '@/types';

export const MOCK_EXERCICES: Exercice[] = [
  {
    id: 'ex-2024',
    clientId: 'client-1',
    libelle: 'Exercice 2024',
    code: 'EX2024',
    dateDebut: '2024-01-01',
    dateFin: '2024-12-31',
    statut: 'ouvert'
  },
  {
    id: 'ex-2023',
    clientId: 'client-1',
    libelle: 'Exercice 2023',
    code: 'EX2023',
    dateDebut: '2023-01-01',
    dateFin: '2023-12-31',
    statut: 'cloture'
  },
  {
    id: 'ex-2025',
    clientId: 'client-1',
    libelle: 'Budget Juillet 2024 - Juin 2025',
    code: 'FY2024-25',
    dateDebut: '2024-07-01',
    dateFin: '2025-06-30',
    statut: 'ouvert'
  }
];
