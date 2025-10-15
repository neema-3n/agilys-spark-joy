import { Client } from '@/types';
import { MOCK_CLIENTS } from '../mockData/clients.mock';

export const clientsService = {
  getAll: async (): Promise<Client[]> => {
    // Simulation d'un délai réseau
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_CLIENTS;
  },

  getById: async (id: string): Promise<Client | null> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return MOCK_CLIENTS.find(c => c.id === id) || null;
  }
};
