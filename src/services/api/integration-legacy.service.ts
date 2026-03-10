import { httpClient } from '@/services/api/http-client';
import { requestJson } from '@/services/api/api-utils';
import type {
  IntegrationEvent,
  IntegrationRemediationAction,
  IntegrationSupervisionFilters,
  PaginatedIntegrationEvents,
} from '@/types/integration-legacy.types';

const buildSupervisionParams = (exerciceId: string, filters: IntegrationSupervisionFilters = {}) => {
  const params = new URLSearchParams({ exerciceId });

  if (filters.status) {
    params.set('status', filters.status);
  }
  if (filters.severity) {
    params.set('severity', filters.severity);
  }
  if (filters.priority) {
    params.set('priority', filters.priority);
  }
  if (filters.treatmentStatus) {
    params.set('treatmentStatus', filters.treatmentStatus);
  }
  if (filters.owner) {
    params.set('owner', filters.owner);
  }
  if (filters.correlationId) {
    params.set('correlationId', filters.correlationId);
  }
  if (filters.fromDate) {
    params.set('fromDate', filters.fromDate);
  }
  if (filters.toDate) {
    params.set('toDate', filters.toDate);
  }
  if (filters.page) {
    params.set('page', String(filters.page));
  }
  if (filters.pageSize) {
    params.set('pageSize', String(filters.pageSize));
  }

  return params;
};

export const integrationLegacyService = {
  async createOutgoing(
    _clientId: string,
    payload: {
      exerciceId: string;
      eventType: string;
      sourceType: string;
      sourceId: string;
      occurredAt: string;
      schemaVersion?: string;
      correlationId?: string;
      maxAttempts?: number;
      payload: Record<string, unknown>;
    }
  ): Promise<IntegrationEvent> {
    return requestJson<IntegrationEvent>(
      '/integration-legacy/outgoing',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      "Erreur lors de l'enqueue de l'événement sortant"
    );
  },

  async getSupervision(
    _clientId: string,
    exerciceId: string,
    filters: IntegrationSupervisionFilters = {}
  ): Promise<PaginatedIntegrationEvents> {
    const params = buildSupervisionParams(exerciceId, filters);

    return requestJson<PaginatedIntegrationEvents>(
      `/integration-legacy/supervision?${params.toString()}`,
      { method: 'GET' },
      "Erreur lors du chargement de la supervision d'intégration"
    );
  },

  async downloadSupervisionExport(_clientId: string, exerciceId: string, filters: IntegrationSupervisionFilters = {}): Promise<void> {
    const params = buildSupervisionParams(exerciceId, filters);
    const response = await httpClient.request(`/integration-legacy/supervision/export?${params.toString()}`, { method: 'GET' });
    if (!response.ok) {
      throw new Error("Erreur lors de l'export supervision d'intégration");
    }

    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const contentDisposition = response.headers.get('Content-Disposition') || '';
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    const filename = filenameMatch?.[1] || `integration-supervision-${exerciceId}.csv`;

    link.href = href;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(href);
  },

  async retry(
    _clientId: string,
    input: {
      eventId: string;
      exerciceId: string;
      reasonCode?: string;
      reasonMessage?: string;
    }
  ): Promise<{ dispatchedStatus: string; event: IntegrationEvent }> {
    return requestJson<{ dispatchedStatus: string; event: IntegrationEvent }>(
      `/integration-legacy/events/${encodeURIComponent(input.eventId)}/retry`,
      {
        method: 'POST',
        body: JSON.stringify({
          exerciceId: input.exerciceId,
          reasonCode: input.reasonCode,
          reasonMessage: input.reasonMessage,
        }),
      },
      "Erreur lors du déclenchement du retry d'intégration"
    );
  },

  async remediate(
    _clientId: string,
    input: {
      eventId: string;
      exerciceId: string;
      action: IntegrationRemediationAction;
      priority?: 'P1' | 'P2' | 'P3';
      treatmentStatus?: 'open' | 'triaged' | 'in_progress' | 'resolved' | 'closed';
      owner?: string;
      reasonCode?: string;
      reasonMessage?: string;
    }
  ): Promise<{ event: IntegrationEvent; dispatchedStatus?: string }> {
    return requestJson<{ event: IntegrationEvent; dispatchedStatus?: string }>(
      `/integration-legacy/events/${encodeURIComponent(input.eventId)}/remediate`,
      {
        method: 'POST',
        body: JSON.stringify({
          exerciceId: input.exerciceId,
          action: input.action,
          priority: input.priority,
          treatmentStatus: input.treatmentStatus,
          owner: input.owner,
          reasonCode: input.reasonCode,
          reasonMessage: input.reasonMessage,
        }),
      },
      "Erreur lors de l'action de remediation d'intégration"
    );
  },
};
