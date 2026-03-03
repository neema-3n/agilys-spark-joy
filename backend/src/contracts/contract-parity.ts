import type {
  ContractDiff,
  ContractFieldMap,
  ContractParityResult,
  ContractShape,
  EndpointContract
} from './api-contract.types';

const keyFor = (contract: EndpointContract): string => `${contract.method} ${contract.path}`;

const compareFieldMap = (
  endpointId: string,
  method: string,
  path: string,
  baseline: ContractFieldMap,
  candidate: ContractFieldMap,
  label: string,
  diffs: ContractDiff[]
) => {
  for (const [field, baselineType] of Object.entries(baseline)) {
    const nextType = candidate[field];
    if (!nextType) {
      diffs.push({
        endpointId,
        method,
        path,
        severity: 'bloquant',
        message: `${label}: champ requis supprime (${field})`
      });
      continue;
    }
    if (nextType !== baselineType) {
      diffs.push({
        endpointId,
        method,
        path,
        severity: 'bloquant',
        message: `${label}: type incompatible pour ${field} (${baselineType} -> ${nextType})`
      });
    }
  }
};

const compareShape = (
  endpointId: string,
  method: string,
  path: string,
  baseline: ContractShape | undefined,
  candidate: ContractShape | undefined,
  label: string,
  diffs: ContractDiff[]
) => {
  if (!baseline) {
    return;
  }
  if (!candidate) {
    diffs.push({
      endpointId,
      method,
      path,
      severity: 'bloquant',
      message: `${label}: schema absent cote cible`
    });
    return;
  }

  compareFieldMap(endpointId, method, path, baseline.required, candidate.required, label, diffs);

  for (const field of Object.keys(candidate.required)) {
    if (!baseline.required[field]) {
      diffs.push({
        endpointId,
        method,
        path,
        severity: 'majeur',
        message: `${label}: nouveau champ requis (${field})`
      });
    }
  }
};

export const compareContracts = (
  legacyContracts: EndpointContract[],
  currentContracts: EndpointContract[],
  criticalEndpointCatalog: string[]
): ContractParityResult => {
  const diffs: ContractDiff[] = [];
  const currentByRoute = new Map<string, EndpointContract>();
  const coverageByDomain: Record<'AUTH' | 'TENANT' | 'BUD', number> = {
    AUTH: 0,
    TENANT: 0,
    BUD: 0
  };

  for (const contract of currentContracts) {
    currentByRoute.set(keyFor(contract), contract);
  }

  for (const legacy of legacyContracts) {
    const current = currentByRoute.get(keyFor(legacy));
    if (!current) {
      diffs.push({
        endpointId: legacy.id,
        method: legacy.method,
        path: legacy.path,
        severity: 'bloquant',
        message: 'Endpoint absent sur backend cible'
      });
      continue;
    }

    coverageByDomain[legacy.domain] += 1;

    for (const status of legacy.statuses) {
      if (!current.statuses.includes(status)) {
        diffs.push({
          endpointId: legacy.id,
          method: legacy.method,
          path: legacy.path,
          severity: 'bloquant',
          message: `Code HTTP attendu manquant (${status})`
        });
      }
    }

    compareShape(legacy.id, legacy.method, legacy.path, legacy.request, current.request, 'request', diffs);
    compareShape(legacy.id, legacy.method, legacy.path, legacy.response, current.response, 'response', diffs);
  }

  const coveredEndpointIds = new Set([...legacyContracts, ...currentContracts].map((endpoint) => endpoint.id));
  const nonCoveredEndpoints = criticalEndpointCatalog.filter((endpointId) => !coveredEndpointIds.has(endpointId));

  for (const endpointId of nonCoveredEndpoints) {
    diffs.push({
      endpointId,
      method: 'N/A',
      path: 'N/A',
      severity: 'majeur',
      message: "Endpoint critique non couvert par la campagne de parite de contrats"
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    comparedEndpoints: legacyContracts.length,
    coverageByDomain,
    nonCoveredEndpoints,
    diffs
  };
};

