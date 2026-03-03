import type { EndpointContract } from './api-contract.types';

export const legacyCriticalContracts: EndpointContract[] = [
  {
    id: 'AUTH-01',
    domain: 'AUTH',
    method: 'POST',
    path: '/auth/login',
    statuses: [201, 400, 401],
    request: {
      required: {
        email: 'string',
        password: 'string'
      }
    },
    response: {
      required: {
        accessToken: 'string',
        refreshToken: 'string'
      }
    },
    businessErrorCodes: ['AUTH_INVALID_CREDENTIALS']
  },
  {
    id: 'AUTH-02',
    domain: 'AUTH',
    method: 'POST',
    path: '/auth/refresh',
    statuses: [201, 400, 403],
    request: {
      required: {
        refreshToken: 'string'
      }
    },
    response: {
      required: {
        accessToken: 'string',
        refreshToken: 'string'
      }
    },
    businessErrorCodes: ['AUTH_REFRESH_REVOKED']
  },
  {
    id: 'AUTH-03',
    domain: 'AUTH',
    method: 'POST',
    path: '/auth/logout',
    statuses: [204, 400],
    request: {
      required: {
        refreshToken: 'string'
      }
    }
  },
  {
    id: 'TENANT-01',
    domain: 'TENANT',
    method: 'GET',
    path: '/tenant-policies/retention',
    statuses: [200, 401, 403],
    response: {
      required: {
        tenantId: 'string',
        retentionDays: 'number',
        legalHoldEnabled: 'boolean',
        version: 'number'
      }
    }
  },
  {
    id: 'TENANT-02',
    domain: 'TENANT',
    method: 'PATCH',
    path: '/tenant-policies/retention',
    statuses: [200, 400, 401, 403, 404],
    request: {
      required: {
        retentionDays: 'number',
        legalHoldEnabled: 'boolean'
      },
      optional: {
        tenantId: 'string'
      }
    },
    response: {
      required: {
        tenantId: 'string',
        retentionDays: 'number',
        legalHoldEnabled: 'boolean',
        version: 'number'
      }
    }
  },
  {
    id: 'BUD-01',
    domain: 'BUD',
    method: 'POST',
    path: '/budget-referentiels/exercices',
    statuses: [201, 400, 401, 403],
    request: {
      required: {
        libelle: 'string',
        dateDebut: 'string',
        dateFin: 'string',
        statut: 'string'
      },
      optional: {
        code: 'string'
      }
    }
  },
  {
    id: 'BUD-02',
    domain: 'BUD',
    method: 'POST',
    path: '/budget-referentiels/allocations',
    statuses: [201, 400, 401, 403, 404],
    request: {
      required: {
        exerciceId: 'string',
        destinationAxeId: 'string',
        montant: 'number',
        motif: 'string'
      }
    }
  },
  {
    id: 'BUD-03',
    domain: 'BUD',
    method: 'POST',
    path: '/budget-referentiels/reallocations',
    statuses: [201, 400, 401, 403, 404],
    request: {
      required: {
        exerciceId: 'string',
        sourceAxeId: 'string',
        destinationAxeId: 'string',
        montant: 'number',
        motif: 'string'
      }
    }
  },
  {
    id: 'BUD-04',
    domain: 'BUD',
    method: 'GET',
    path: '/budget-referentiels/allocations/:id/decisions/compare',
    statuses: [200, 400, 401, 403]
  }
];
