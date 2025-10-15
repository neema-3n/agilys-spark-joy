import { Client } from '@/types';

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'client-1',
    nom: 'Commune de Porto-Novo',
    code: 'CPN-2024',
    pays: 'Bénin',
    devise: 'XOF',
    statut: 'actif'
  },
  {
    id: 'client-2',
    nom: 'Mairie de Cotonou',
    code: 'MCO-2024',
    pays: 'Bénin',
    devise: 'XOF',
    statut: 'actif'
  },
  {
    id: 'client-3',
    nom: 'Conseil Départemental du Littoral',
    code: 'CDL-2024',
    pays: 'Bénin',
    devise: 'XOF',
    statut: 'actif'
  }
];
