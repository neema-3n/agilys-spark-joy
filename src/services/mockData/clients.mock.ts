import { Client } from '@/types';

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'client-1',
    nom: 'CAP CUE',
    code: 'CPN-2024',
    pays: 'Cameroun',
    devise: 'XAF',
    statut: 'actif',
    moneyFormat: {
      locale: 'fr-FR',
      currencyCode: 'XAF',
      thousandsSeparator: 'space',
      decimalSeparator: 'comma',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
  },
  {
    id: 'client-2',
    nom: 'Mairie de Cotonou',
    code: 'MCO-2024',
    pays: 'Bénin',
    devise: 'XOF',
    statut: 'inactif',
    moneyFormat: {
      locale: 'fr-FR',
      currencyCode: 'XOF',
      thousandsSeparator: 'space',
      decimalSeparator: 'comma',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
  },
  {
    id: 'client-3',
    nom: 'Conseil Départemental du Littoral',
    code: 'CDL-2024',
    pays: 'Bénin',
    devise: 'XOF',
    statut: 'inactif',
    moneyFormat: {
      locale: 'fr-FR',
      currencyCode: 'XOF',
      thousandsSeparator: 'space',
      decimalSeparator: 'comma',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
  }
];
