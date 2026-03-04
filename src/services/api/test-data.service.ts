import { requestJson } from '@/services/api/api-utils';

export const testDataService = {
  async generateTestFactures(
    _clientId: string,
    exerciceId: string,
    count: number
  ): Promise<{ success: boolean; count: number; message: string }> {
    return requestJson<{ success: boolean; count: number; message: string }>(
      '/factures/generate-test-data',
      {
        method: 'POST',
        body: JSON.stringify({
          exerciceId,
          count
        })
      },
      'Erreur lors de la génération des factures de test'
    );
  }
};
