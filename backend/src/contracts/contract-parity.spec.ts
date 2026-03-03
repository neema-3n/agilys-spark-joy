import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import request = require('supertest');
import { AppModule } from '../app.module';
import { compareContracts } from './contract-parity';
import { currentCriticalContracts, migrationCriticalEndpointCatalog } from './current-critical-contracts';
import { legacyCriticalContracts } from './legacy-critical-contracts';
import { applyTestEnv } from '../../test/test-env';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const buildCorrectiveAction = (diff: { severity: 'bloquant' | 'majeur' | 'mineur'; endpointId: string; message: string }): string => {
  switch (diff.severity) {
    case 'bloquant':
      return `Corriger immediatement le contrat ${diff.endpointId}, rerun test:contracts, puis bloquer la migration tant que l'ecart persiste.`;
    case 'majeur':
      return `Planifier un rattrapage prioritaire pour ${diff.endpointId}, documenter owner/date cible dans la matrice de parite.`;
    default:
      return `Programmer une amelioration de qualite pour ${diff.endpointId} au prochain lot de durcissement.`;
  }
};

const buildMarkdownReport = (result: ReturnType<typeof compareContracts>): string => {
  const blocking = result.diffs.filter((diff) => diff.severity === 'bloquant');
  const major = result.diffs.filter((diff) => diff.severity === 'majeur');
  const minor = result.diffs.filter((diff) => diff.severity === 'mineur');

  const lines: string[] = [
    '# Migration Contract Parity Report',
    '',
    `Generated at: ${result.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Endpoints compared: ${result.comparedEndpoints}`,
    `- Coverage AUTH: ${result.coverageByDomain.AUTH}`,
    `- Coverage TENANT: ${result.coverageByDomain.TENANT}`,
    `- Coverage BUD: ${result.coverageByDomain.BUD}`,
    `- Blocking differences: ${blocking.length}`,
    `- Major differences: ${major.length}`,
    `- Minor differences: ${minor.length}`,
    '',
    '## Non-covered Endpoints',
    ''
  ];

  if (result.nonCoveredEndpoints.length === 0) {
    lines.push('- Aucun endpoint critique non couvert');
  } else {
    for (const endpointId of result.nonCoveredEndpoints) {
      lines.push(`- ${endpointId}`);
    }
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

describe('Migration API contract parity', () => {
  let app: INestApplication;

  beforeAll(async () => {
    applyTestEnv();
    process.env.CONTRACT_PARITY_GENERATED_AT = '1970-01-01T00:00:00.000Z';

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
      })
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('compare legacy and current contracts, emit report, and fail on blocking diffs', () => {
    const result = compareContracts(legacyCriticalContracts, currentCriticalContracts, migrationCriticalEndpointCatalog);

    const outputDir = resolve(process.cwd(), '..', '_bmad-output', 'implementation-artifacts');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const markdownPath = resolve(outputDir, 'migration-contract-parity-report.md');
    const diffPath = resolve(outputDir, 'migration-contract-parity-diff.json');
    writeFileSync(markdownPath, buildMarkdownReport(result), 'utf8');
    writeFileSync(diffPath, JSON.stringify(result, null, 2), 'utf8');

    expect(result.coverageByDomain.AUTH).toBeGreaterThan(0);
    expect(result.coverageByDomain.TENANT).toBeGreaterThan(0);
    expect(result.coverageByDomain.BUD).toBeGreaterThan(0);
    expect(result.nonCoveredEndpoints).toHaveLength(0);
    expect(result.nonCoveredEndpoints).not.toContain('AUTH-04-ASSIGN');
    expect(result.nonCoveredEndpoints).not.toContain('AUTH-04-REVOKE');
    expect(result.nonCoveredEndpoints).not.toContain('BUD-01B');
    expect(result.nonCoveredEndpoints).not.toContain('BUD-01C');
    expect(result.nonCoveredEndpoints).not.toContain('BUD-01D');
    expect(result.nonCoveredEndpoints).not.toContain('BUD-01E');
    expect(result.nonCoveredEndpoints).not.toContain('BUD-03-DECISION-VALIDATE');
    expect(result.nonCoveredEndpoints).not.toContain('BUD-03-DECISION-REJECT');
    expect(result.nonCoveredEndpoints).not.toContain('BUD-03-DECISIONS');
    expect(result.diffs.filter((diff) => diff.severity === 'bloquant')).toHaveLength(0);
    expect(existsSync(markdownPath)).toBe(true);
    expect(existsSync(diffPath)).toBe(true);
  });

  it('validates that declared current contracts match runtime security/status semantics', async () => {
    const assertErrorShape = (status: number, body: unknown, endpointId: string) => {
      if (status < 400 || !isRecord(body)) {
        return;
      }

      const hasMessage = typeof body.message === 'string' || Array.isArray(body.message);
      const hasCode = typeof body.code === 'string' || typeof body.errorCode === 'string' || typeof body.error === 'string';
      if (!hasMessage && !hasCode) {
        throw new Error(`Endpoint ${endpointId} retourne une erreur sans structure exploitable`);
      }
    };

    for (const contract of currentCriticalContracts) {
      const path = contract.path.replace(':id', '00000000-0000-4000-8000-000000000000');
      const req = request(app.getHttpServer());
      let response;

      switch (contract.method) {
        case 'GET':
          response = await req.get(path);
          break;
        case 'POST':
          response = await req.post(path).send({});
          break;
        case 'PATCH':
          response = await req.patch(path).send({});
          break;
        case 'DELETE':
          response = await req.delete(path);
          break;
        default:
          throw new Error(`Unsupported method ${contract.method}`);
      }

      const currentEndpointIsProtected = contract.domain !== 'AUTH';
      if (response.status === 404) {
        // Some catalog entries can be explicit "not yet implemented" parity probes.
        expect(contract.statuses).toEqual(expect.arrayContaining([404]));
        continue;
      }

      if (currentEndpointIsProtected) {
        // Guards run before DTO validation: protected endpoints must reject missing token.
        expect([401, 403]).toContain(response.status);
        expect(contract.statuses).toEqual(expect.arrayContaining([response.status]));
        assertErrorShape(response.status, response.body, contract.id);
        continue;
      }

      // Public auth endpoints must keep declared HTTP contract for invalid payloads.
      expect(contract.statuses).toEqual(expect.arrayContaining([response.status]));
      assertErrorShape(response.status, response.body, contract.id);
    }
  });
});
