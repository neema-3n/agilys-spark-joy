import { User } from '@/types';

export const MOCK_USERS: User[] = [
  {
    id: 'user-1',
    email: 'admin@portonovo.bj',
    nom: 'KOFFI',
    prenom: 'Jean',
    clientId: 'client-1',
    roles: ['admin_client', 'directeur_financier']
  },
  {
    id: 'user-2',
    email: 'directeur@portonovo.bj',
    nom: 'MENSAH',
    prenom: 'Marie',
    clientId: 'client-1',
    roles: ['directeur_financier']
  },
  {
    id: 'user-3',
    email: 'comptable@portonovo.bj',
    nom: 'DOSSOU',
    prenom: 'Pierre',
    clientId: 'client-1',
    roles: ['comptable']
  },
  {
    id: 'user-super',
    email: 'super@agilys.com',
    nom: 'ADMIN',
    prenom: 'Super',
    clientId: 'client-1',
    roles: ['super_admin']
  }
];

// Mots de passe mockés (en production, ces données viendraient du backend)
export const MOCK_CREDENTIALS = {
  'admin@portonovo.bj': 'admin123',
  'directeur@portonovo.bj': 'directeur123',
  'comptable@portonovo.bj': 'comptable123',
  'super@agilys.com': 'super123'
};
