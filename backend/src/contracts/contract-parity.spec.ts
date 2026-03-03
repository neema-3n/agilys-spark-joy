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
    expect(result.nonCoveredEndpoints).toContain('BUD-04-PREVISIONS');
    expect(result.diffs.filter((diff) => diff.severity === 'bloquant')).toHaveLength(0);
    expect(existsSync(markdownPath)).toBe(true);
    expect(existsSync(diffPath)).toBe(true);
  });

  it('validates that declared current contracts match runtime security/status semantics', async () => {
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
      if (currentEndpointIsProtected) {
        // Guards run before DTO validation: protected endpoints must reject missing token.
        expect([401, 403]).toContain(response.status);
        expect(contract.statuses).toEqual(expect.arrayContaining([response.status]));
        continue;
      }

      // Public auth endpoints must keep declared HTTP contract for invalid payloads.
      expect(contract.statuses).toEqual(expect.arrayContaining([response.status]));
    }
  });
});
