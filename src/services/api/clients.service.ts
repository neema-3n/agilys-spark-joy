import { Client } from '@/types';
import { MOCK_CLIENTS } from '../mockData/clients.mock';

export const clientsService = {
  getAll: async (): Promise<Client[]> => {
    // Simulation d'un délai réseau
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_CLIENTS.filter((client) => client.statut === 'actif');
  },

  getById: async (id: string): Promise<Client | null> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return MOCK_CLIENTS.find(c => c.id === id) || null;
  },

  update: async (id: string, updates: Partial<Client>): Promise<Client> => {
    await new Promise(resolve => setTimeout(resolve, 200));

    const index = MOCK_CLIENTS.findIndex((client) => client.id === id);

    if (index === -1) {
      throw new Error('Client introuvable');
    }

    MOCK_CLIENTS[index] = {
      ...MOCK_CLIENTS[index],
      ...updates,
    };

    return MOCK_CLIENTS[index];
  },
};
