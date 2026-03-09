import { Injectable } from '@nestjs/common';
import type { IntegrationCanonicalEvent } from './integration-legacy.types';

export interface IntegrationTransportResult {
  acked: boolean;
  code?: string;
  message?: string;
}

@Injectable()
export class IntegrationLegacyTransport {
  async send(event: IntegrationCanonicalEvent): Promise<IntegrationTransportResult> {
    const forcedFailure = event.payload['forceFailure'];
    if (forcedFailure === true) {
      return {
        acked: false,
        code: 'LEGACY_TIMEOUT',
        message: 'Legacy indisponible (simulation)',
      };
    }

    return {
      acked: true,
      code: 'ACK',
      message: 'Ack legacy simulé',
    };
  }
}
