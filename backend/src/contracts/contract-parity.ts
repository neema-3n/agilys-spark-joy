import type {
  ContractDiff,
  ContractFieldMap,
  ContractParityResult,
  ContractShape,
  EndpointContract
} from './api-contract.types';

const FIXED_GENERATED_AT = '1970-01-01T00:00:00.000Z';
const severityRank: Record<ContractDiff['severity'], number> = {
  bloquant: 0,
  majeur: 1,
  mineur: 2
};

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

const compareBusinessErrorCodes = (
  endpointId: string,
  method: string,
  path: string,
  baselineCodes: string[] | undefined,
  candidateCodes: string[] | undefined,
  diffs: ContractDiff[]
) => {
  if (!baselineCodes || baselineCodes.length === 0) {
    return;
  }

  const candidateSet = new Set(candidateCodes ?? []);
  for (const code of baselineCodes) {
    if (!candidateSet.has(code)) {
      diffs.push({
        endpointId,
        method,
        path,
        severity: 'bloquant',
        message: `business_error: code metier attendu manquant (${code})`
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
  const legacyById = new Map<string, EndpointContract>();
  const currentById = new Map<string, EndpointContract>();
  const currentByRoute = new Map<string, EndpointContract>();
  const coverageByDomain: Record<'AUTH' | 'TENANT' | 'BUD', number> = {
    AUTH: 0,
    TENANT: 0,
    BUD: 0
  };

  for (const contract of legacyContracts) {
    legacyById.set(contract.id, contract);
  }

  for (const contract of currentContracts) {
    currentById.set(contract.id, contract);
    currentByRoute.set(keyFor(contract), contract);
  }

  for (const legacy of legacyContracts) {
    let current = currentById.get(legacy.id);
    if (!current) {
      current = currentByRoute.get(keyFor(legacy));
    }

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

    if (legacy.method !== current.method || legacy.path !== current.path) {
      diffs.push({
        endpointId: legacy.id,
        method: legacy.method,
        path: legacy.path,
        severity: 'bloquant',
        message: `Signature endpoint modifiee (attendu ${legacy.method} ${legacy.path}, obtenu ${current.method} ${current.path})`
      });
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
    compareBusinessErrorCodes(
      legacy.id,
      legacy.method,
      legacy.path,
      legacy.businessErrorCodes,
      current.businessErrorCodes,
      diffs
    );
  }

  const nonCoveredEndpoints = criticalEndpointCatalog.filter(
    (endpointId) => !legacyById.has(endpointId) || !currentById.has(endpointId)
  );

  for (const endpointId of nonCoveredEndpoints) {
    diffs.push({
      endpointId,
      method: 'N/A',
      path: 'N/A',
      severity: 'majeur',
      message: "Endpoint critique non couvert par la campagne de parite de contrats"
    });
  }

  diffs.sort((a, b) => {
    const severityCompare = severityRank[a.severity] - severityRank[b.severity];
    if (severityCompare !== 0) {
      return severityCompare;
    }
    const endpointCompare = a.endpointId.localeCompare(b.endpointId);
    if (endpointCompare !== 0) {
      return endpointCompare;
    }
    const methodCompare = a.method.localeCompare(b.method);
    if (methodCompare !== 0) {
      return methodCompare;
    }
    const pathCompare = a.path.localeCompare(b.path);
    if (pathCompare !== 0) {
      return pathCompare;
    }
    return a.message.localeCompare(b.message);
  });

  return {
    generatedAt: process.env.CONTRACT_PARITY_GENERATED_AT ?? FIXED_GENERATED_AT,
    comparedEndpoints: legacyContracts.length,
    coverageByDomain,
    nonCoveredEndpoints,
    diffs
  };
};
