import type { EndpointContract } from './api-contract.types';

export const currentCriticalContracts: EndpointContract[] = [
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
    statuses: [201, 400, 401, 403],
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
    statuses: [204, 400, 401],
    request: {
      required: {
        refreshToken: 'string'
      }
    }
  },
  {
    id: 'AUTH-04-ASSIGN',
    domain: 'AUTH',
    method: 'PATCH',
    path: '/auth/users/:userId/roles/assign',
    statuses: [200, 400, 401, 403, 404],
    request: {
      required: {
        role: 'string'
      }
    },
    response: {
      required: {
        userId: 'string',
        roles: 'array'
      }
    }
  },
  {
    id: 'AUTH-04-REVOKE',
    domain: 'AUTH',
    method: 'PATCH',
    path: '/auth/users/:userId/roles/revoke',
    statuses: [200, 400, 401, 403, 404],
    request: {
      required: {
        role: 'string'
      }
    },
    response: {
      required: {
        userId: 'string',
        roles: 'array'
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
    id: 'BUD-01B',
    domain: 'BUD',
    method: 'POST',
    path: '/budget-referentiels/enveloppes',
    statuses: [201, 400, 401, 403],
    request: {
      required: {
        exerciceId: 'string',
        code: 'string',
        nom: 'string',
        sourceFinancement: 'string',
        montantAlloue: 'number',
        montantConsomme: 'number',
        statut: 'string'
      }
    }
  },
  {
    id: 'BUD-01C',
    domain: 'BUD',
    method: 'POST',
    path: '/budget-referentiels/sections',
    statuses: [201, 400, 401, 403],
    request: {
      required: {
        exerciceId: 'string',
        code: 'string',
        libelle: 'string',
        ordre: 'number',
        statut: 'string'
      }
    }
  },
  {
    id: 'BUD-01D',
    domain: 'BUD',
    method: 'POST',
    path: '/budget-referentiels/programmes',
    statuses: [201, 400, 401, 403],
    request: {
      required: {
        exerciceId: 'string',
        sectionId: 'string',
        code: 'string',
        libelle: 'string',
        ordre: 'number',
        statut: 'string'
      }
    }
  },
  {
    id: 'BUD-01E',
    domain: 'BUD',
    method: 'POST',
    path: '/budget-referentiels/actions',
    statuses: [201, 400, 401, 403],
    request: {
      required: {
        exerciceId: 'string',
        programmeId: 'string',
        code: 'string',
        libelle: 'string',
        ordre: 'number',
        statut: 'string'
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
    id: 'BUD-03-DECISION-VALIDATE',
    domain: 'BUD',
    method: 'POST',
    path: '/budget-referentiels/allocations/:id/decision/validate',
    statuses: [201, 400, 401, 403, 404],
    request: {
      required: {
        exerciceId: 'string',
        motif: 'string'
      }
    }
  },
  {
    id: 'BUD-03-DECISION-REJECT',
    domain: 'BUD',
    method: 'POST',
    path: '/budget-referentiels/allocations/:id/decision/reject',
    statuses: [201, 400, 401, 403, 404],
    request: {
      required: {
        exerciceId: 'string',
        motif: 'string'
      }
    }
  },
  {
    id: 'BUD-03-DECISIONS',
    domain: 'BUD',
    method: 'GET',
    path: '/budget-referentiels/allocations/:id/decisions',
    statuses: [200, 400, 401, 403, 404]
  },
  {
    id: 'BUD-04',
    domain: 'BUD',
    method: 'GET',
    path: '/budget-referentiels/allocations/:id/decisions/compare',
    statuses: [200, 400, 401, 403, 404]
  },
  {
    id: 'BUD-04-PREVISIONS',
    domain: 'BUD',
    method: 'GET',
    path: '/budget-referentiels/previsions',
    statuses: [404, 401, 403]
  }
];

// Catalogue complet attendu sur le lot migration M1.2 pour suivi couverture.
export const migrationCriticalEndpointCatalog = [
  'AUTH-01',
  'AUTH-02',
  'AUTH-03',
  'AUTH-04-ASSIGN',
  'AUTH-04-REVOKE',
  'TENANT-01',
  'TENANT-02',
  'BUD-01',
  'BUD-01B',
  'BUD-01C',
  'BUD-01D',
  'BUD-01E',
  'BUD-02',
  'BUD-03',
  'BUD-03-DECISION-VALIDATE',
  'BUD-03-DECISION-REJECT',
  'BUD-03-DECISIONS',
  'BUD-04',
  'BUD-04-PREVISIONS'
];
