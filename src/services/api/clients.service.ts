import { Client } from '@/types';
import { requestJson } from '@/services/api/api-utils';

interface TenantApiModel {
  id: string;
  displayName: string;
  isActive: boolean;
}

const mapTenantToClient = (tenant: TenantApiModel): Client => ({
  id: tenant.id,
  nom: tenant.displayName?.trim() || tenant.id,
  code: tenant.id.toUpperCase(),
  pays: 'N/A',
  devise: 'N/A',
  statut: tenant.isActive ? 'actif' : 'inactif'
});

export const clientsService = {
  getAll: async (): Promise<Client[]> => {
    const payload = await requestJson<TenantApiModel[]>(
      '/auth/tenants',
      { method: 'GET' },
      'Erreur lors de la récupération des tenants'
    );

    return payload.map(mapTenantToClient);
  },

  getById: async (id: string): Promise<Client | null> => {
    const clients = await clientsService.getAll();
    return clients.find((client) => client.id === id) || null;
  }
};
