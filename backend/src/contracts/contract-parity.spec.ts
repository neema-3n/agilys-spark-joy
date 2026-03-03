import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { compareContracts } from './contract-parity';
import { currentCriticalContracts, migrationCriticalEndpointCatalog } from './current-critical-contracts';
import { legacyCriticalContracts } from './legacy-critical-contracts';

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
});

