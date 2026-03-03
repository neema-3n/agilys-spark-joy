import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import type { ContractDiff, EndpointContract, PrimitiveType } from './api-contract.types';
import { AppModule } from '../app.module';
import { applyTestEnv } from '../../test/test-env';
import { currentCriticalContracts } from './current-critical-contracts';
import { legacyCriticalContracts } from './legacy-critical-contracts';

type AuthMode = 'none' | 'bearer';

interface ProbeResponse {
  status: number;
  body: unknown;
}

interface LiveContractParityResult {
  generatedAt: string;
  comparedEndpoints: number;
  diffs: ContractDiff[];
  skipped: boolean;
  skipReason?: string;
}

const FIXED_GENERATED_AT = '1970-01-01T00:00:00.000Z';
const TEST_PATH_ID = '00000000-0000-4000-8000-000000000000';
const TEST_EXERCICE_ID = '00000000-0000-4000-8000-000000000001';

const replacePathParams = (path: string): string => path.replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, TEST_PATH_ID);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseJsonSafe = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const requestEndpoint = async (
  baseUrl: string,
  contract: EndpointContract,
  body: unknown,
  auth: AuthMode,
  accessToken?: string
): Promise<ProbeResponse> => {
  const path = replacePathParams(contract.path);
  const url = new URL(path, baseUrl);
  if (path.includes('/budget-referentiels/')) {
    url.searchParams.set('exerciceId', TEST_EXERCICE_ID);
  }

  const headers: Record<string, string> = {};
  if (auth === 'bearer' && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  if (contract.method !== 'GET' && contract.method !== 'DELETE') {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method: contract.method,
    headers,
    body: contract.method === 'GET' || contract.method === 'DELETE' ? undefined : JSON.stringify(body ?? {})
  });

  return {
    status: response.status,
    body: await parseJsonSafe(response)
  };
};

const isPrimitiveTypeMatch = (value: unknown, expectedType: PrimitiveType): boolean => {
  if (expectedType === 'null') {
    return value === null;
  }
  if (expectedType === 'array') {
    return Array.isArray(value);
  }
  if (expectedType === 'object') {
    return isRecord(value);
  }
  return typeof value === expectedType;
};

const extractBusinessErrorCode = (body: unknown): string | null => {
  if (!isRecord(body)) {
    return null;
  }

  const directCode = body.code;
  if (typeof directCode === 'string' && directCode.length > 0) {
    return directCode;
  }

  const errorCode = body.errorCode;
  if (typeof errorCode === 'string' && errorCode.length > 0) {
    return errorCode;
  }

  const nestedError = body.error;
  if (isRecord(nestedError) && typeof nestedError.code === 'string' && nestedError.code.length > 0) {
    return nestedError.code;
  }

  return null;
};

const buildCorrectiveAction = (diff: ContractDiff): string => {
  switch (diff.severity) {
    case 'bloquant':
      return `Corriger immediatement ${diff.endpointId}, rerun la comparaison live legacy/current, puis bloquer la migration tant que l'ecart persiste.`;
    case 'majeur':
      return `Programmer le rattrapage de ${diff.endpointId} (owner/date cible) et tracer l'avancement dans la matrice de parite.`;
    default:
      return `Planifier un durcissement mineur sur ${diff.endpointId} dans le prochain lot technique.`;
  }
};

const buildMarkdownReport = (result: LiveContractParityResult): string => {
  const blocking = result.diffs.filter((diff) => diff.severity === 'bloquant');
  const major = result.diffs.filter((diff) => diff.severity === 'majeur');
  const minor = result.diffs.filter((diff) => diff.severity === 'mineur');

  const lines: string[] = [
    '# Migration Live Contract Parity Report',
    '',
    `Generated at: ${result.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Endpoints compared: ${result.comparedEndpoints}`,
    `- Blocking differences: ${blocking.length}`,
    `- Major differences: ${major.length}`,
    `- Minor differences: ${minor.length}`,
    `- Skipped: ${result.skipped ? 'yes' : 'no'}`
  ];

  if (result.skipReason) {
    lines.push(`- Skip reason: ${result.skipReason}`);
  }

  lines.push('', '## Differences', '');
  if (result.diffs.length === 0) {
    lines.push('- Aucun ecart detecte');
  } else {
    for (const diff of result.diffs) {
      lines.push(`- [${diff.severity}] ${diff.endpointId} ${diff.method} ${diff.path} -> ${diff.message}`);
    }
  }

  lines.push('', '## Corrective Actions', '');
  if (result.diffs.length === 0) {
    lines.push('- Aucune action corrective requise');
  } else {
    for (const diff of result.diffs) {
      lines.push(`- ${diff.endpointId}: ${buildCorrectiveAction(diff)}`);
    }
  }

  return `${lines.join('\n')}\n`;
};

const writeArtifacts = (result: LiveContractParityResult): void => {
  const outputDir = resolve(process.cwd(), '..', '_bmad-output', 'implementation-artifacts');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  const markdownPath = resolve(outputDir, 'migration-contract-parity-live-report.md');
  const diffPath = resolve(outputDir, 'migration-contract-parity-live-diff.json');
  writeFileSync(markdownPath, buildMarkdownReport(result), 'utf8');
  writeFileSync(diffPath, JSON.stringify(result, null, 2), 'utf8');
};

const startLocalBackend = async (): Promise<{ app: INestApplication; baseUrl: string }> => {
  applyTestEnv();

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  await app.init();
  await app.listen(0, '127.0.0.1');

  const address = app.getHttpServer().address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to determine local backend address for live parity');
  }

  return {
    app,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
};

describe('Migration API contract parity (live)', () => {
  it('compares legacy and current API responses in live mode when URLs are configured', async () => {
    const localApps: INestApplication[] = [];
    let legacyBaseUrl = process.env.CONTRACT_PARITY_LEGACY_BASE_URL;
    let currentBaseUrl = process.env.CONTRACT_PARITY_CURRENT_BASE_URL;
    const generatedAt = process.env.CONTRACT_PARITY_GENERATED_AT ?? FIXED_GENERATED_AT;

    if (!legacyBaseUrl || !currentBaseUrl) {
      const [legacyLocal, currentLocal] = await Promise.all([startLocalBackend(), startLocalBackend()]);
      localApps.push(legacyLocal.app, currentLocal.app);
      legacyBaseUrl = legacyLocal.baseUrl;
      currentBaseUrl = currentLocal.baseUrl;
    }

    try {
      const diffs: ContractDiff[] = [];

    const testEmail = process.env.CONTRACT_PARITY_TEST_EMAIL ?? process.env.AUTH_TEST_USER_EMAIL;
    const testPassword = process.env.CONTRACT_PARITY_TEST_PASSWORD ?? process.env.AUTH_TEST_USER_PASSWORD;
    const canAuthenticate = Boolean(testEmail && testPassword);

    const loginAndGetToken = async (baseUrl: string): Promise<string | null> => {
      if (!canAuthenticate) {
        return null;
      }
      const response = await requestEndpoint(
        baseUrl,
        {
          id: 'AUTH-01',
          domain: 'AUTH',
          method: 'POST',
          path: '/auth/login',
          statuses: [200, 201, 400, 401]
        },
        { email: testEmail, password: testPassword },
        'none'
      );
      if (!isRecord(response.body)) {
        return null;
      }
      const token = response.body.accessToken;
      return typeof token === 'string' && token.length > 0 ? token : null;
    };

      const [legacyToken, currentToken] = await Promise.all([
        loginAndGetToken(legacyBaseUrl),
        loginAndGetToken(currentBaseUrl)
      ]);
    const legacyById = new Map(legacyCriticalContracts.map((contract) => [contract.id, contract]));
    const currentById = new Map(currentCriticalContracts.map((contract) => [contract.id, contract]));

      for (const [endpointId, legacyContract] of legacyById.entries()) {
      const currentContract = currentById.get(endpointId);
      if (!currentContract) {
        diffs.push({
          endpointId,
          method: legacyContract.method,
          path: legacyContract.path,
          severity: 'bloquant',
          message: 'Endpoint absent dans les contrats cibles'
        });
        continue;
      }

      let requestBody: unknown = {};
      if (endpointId === 'AUTH-01') {
        requestBody = {
          email: testEmail ?? 'user@agilys.local',
          password: testPassword ?? 'ChangeMe123!'
        };
      } else if (endpointId === 'AUTH-02' || endpointId === 'AUTH-03') {
        requestBody = { refreshToken: 'invalid-refresh-token' };
      } else if (endpointId.startsWith('AUTH-04-')) {
        requestBody = { role: 'admin_client' };
      } else if (endpointId.startsWith('BUD-03-DECISION-')) {
        requestBody = { exerciceId: TEST_EXERCICE_ID, motif: 'parity-test' };
      }

      const endpointIsProtected = legacyContract.domain !== 'AUTH' || endpointId.startsWith('AUTH-04-');
      const authMode: AuthMode = endpointIsProtected ? 'bearer' : 'none';

        const [legacyResponse, currentResponse] = await Promise.all([
          requestEndpoint(legacyBaseUrl, legacyContract, requestBody, authMode, legacyToken ?? undefined),
          requestEndpoint(currentBaseUrl, currentContract, requestBody, authMode, currentToken ?? undefined)
        ]);

        if (endpointIsProtected && (!legacyToken || !currentToken)) {
        diffs.push({
          endpointId,
          method: legacyContract.method,
          path: legacyContract.path,
          severity: 'majeur',
          message:
            "Verification auth protegee partielle: token de test indisponible (definir CONTRACT_PARITY_TEST_EMAIL/PASSWORD pour valider payloads/erreurs metier en mode authentifie)"
        });
      }

        if (legacyResponse.status !== currentResponse.status) {
        diffs.push({
          endpointId,
          method: legacyContract.method,
          path: legacyContract.path,
          severity: 'bloquant',
          message: `Statut HTTP divergent (legacy=${legacyResponse.status}, current=${currentResponse.status})`
        });
      }

        if (!legacyContract.statuses.includes(legacyResponse.status)) {
        diffs.push({
          endpointId,
          method: legacyContract.method,
          path: legacyContract.path,
          severity: 'majeur',
          message: `Legacy hors contrat declare (status=${legacyResponse.status})`
        });
      }

        if (!currentContract.statuses.includes(currentResponse.status)) {
        diffs.push({
          endpointId,
          method: currentContract.method,
          path: currentContract.path,
          severity: 'majeur',
          message: `Current hors contrat declare (status=${currentResponse.status})`
        });
      }

        if (
        endpointId === 'AUTH-01' &&
        legacyResponse.status >= 200 &&
        legacyResponse.status < 300 &&
        currentResponse.status >= 200 &&
        currentResponse.status < 300 &&
        legacyContract.response
      ) {
        for (const [field, expectedType] of Object.entries(legacyContract.response.required)) {
          const legacyValue = isRecord(legacyResponse.body) ? legacyResponse.body[field] : undefined;
          const currentValue = isRecord(currentResponse.body) ? currentResponse.body[field] : undefined;

          if (!isPrimitiveTypeMatch(legacyValue, expectedType)) {
            diffs.push({
              endpointId,
              method: legacyContract.method,
              path: legacyContract.path,
              severity: 'bloquant',
              message: `Legacy payload invalide: ${field} devrait etre ${expectedType}`
            });
          }

          if (!isPrimitiveTypeMatch(currentValue, expectedType)) {
            diffs.push({
              endpointId,
              method: currentContract.method,
              path: currentContract.path,
              severity: 'bloquant',
              message: `Current payload invalide: ${field} devrait etre ${expectedType}`
            });
          }
        }
      }

        if (
          legacyContract.businessErrorCodes &&
          legacyResponse.status >= 400 &&
          currentResponse.status >= 400 &&
          ![401, 403].includes(legacyResponse.status) &&
          ![401, 403].includes(currentResponse.status)
        ) {
        const legacyCode = extractBusinessErrorCode(legacyResponse.body);
        const currentCode = extractBusinessErrorCode(currentResponse.body);

        if (!legacyCode || !legacyContract.businessErrorCodes.includes(legacyCode)) {
          diffs.push({
            endpointId,
            method: legacyContract.method,
            path: legacyContract.path,
            severity: 'majeur',
            message: `Legacy code erreur metier manquant ou inattendu (recu=${legacyCode ?? 'none'})`
          });
        }

        if (!currentCode || !currentContract.businessErrorCodes?.includes(currentCode)) {
          diffs.push({
            endpointId,
            method: currentContract.method,
            path: currentContract.path,
            severity: 'majeur',
            message: `Current code erreur metier manquant ou inattendu (recu=${currentCode ?? 'none'})`
          });
        }

        if (legacyCode && currentCode && legacyCode !== currentCode) {
          diffs.push({
            endpointId,
            method: legacyContract.method,
            path: legacyContract.path,
            severity: 'bloquant',
            message: `Code erreur metier divergent (legacy=${legacyCode}, current=${currentCode})`
          });
        }
      }

        if (endpointIsProtected && legacyToken && currentToken && legacyResponse.status >= 400 && currentResponse.status >= 400) {
        const hasLegacyErrorShape = isRecord(legacyResponse.body) && 'message' in legacyResponse.body;
        const hasCurrentErrorShape = isRecord(currentResponse.body) && 'message' in currentResponse.body;

        if (!hasLegacyErrorShape || !hasCurrentErrorShape) {
          diffs.push({
            endpointId,
            method: legacyContract.method,
            path: legacyContract.path,
            severity: 'majeur',
            message: 'Structure erreur metier non exploitable (champ message absent) pour endpoint protege'
          });
        }
      }
      }

      diffs.sort((a, b) => {
        const byEndpoint = a.endpointId.localeCompare(b.endpointId);
        if (byEndpoint !== 0) {
          return byEndpoint;
        }
        const byMethod = a.method.localeCompare(b.method);
        if (byMethod !== 0) {
          return byMethod;
        }
        const byPath = a.path.localeCompare(b.path);
        if (byPath !== 0) {
          return byPath;
        }
        return a.message.localeCompare(b.message);
      });

      const result: LiveContractParityResult = {
        generatedAt,
        comparedEndpoints: legacyCriticalContracts.length,
        diffs,
        skipped: false
      };

      writeArtifacts(result);
      expect(diffs.filter((diff) => diff.severity === 'bloquant')).toHaveLength(0);
    } finally {
      await Promise.all(localApps.map((app) => app.close()));
    }
  });
});
