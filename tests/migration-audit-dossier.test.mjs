import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const scriptPath = path.join(rootDir, 'scripts', 'build-migration-audit-dossier.mjs');
const tmpRoots = [];

async function createTempWorkspace() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'm42-audit-'));
  const artifactsDir = path.join(tempRoot, 'artifacts');
  const outputDir = path.join(tempRoot, 'output');
  await mkdir(artifactsDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });
  tmpRoots.push(tempRoot);
  return { artifactsDir, outputDir };
}

async function seedArtifacts(artifactsDir, withMissingCritical = false) {
  const files = [
    ['migration-contract-parity-report.md', '# parity report'],
    ['migration-e2e-critical-scenarios.md', '# e2e report'],
    ['migration-reconciliation-lot-standard-20260304.md', '# reconciliation md'],
    ['migration-reconciliation-lot-standard-20260304.json', '{"ok":true}'],
    ['migration-reconciliation-lot-standard-20260304.csv', 'id,status\n1,ok'],
    ['production-cutover-runbook.md', '# runbook'],
    ['supabase-decommission-report-2026-03-03.md', '# decommission'],
    ['m4-1-security-revalidation-report-2026-03-04.md', '# security'],
    ['m3-4-incident-register.md', '# incidents'],
    ['m3-4-hypercare-exit-report.md', '# resolutions'],
  ];

  if (!withMissingCritical) {
    files.push(['rollback-drill-gate-report.md', '# rollback gate']);
  }

  for (const [name, content] of files) {
    await writeFile(path.join(artifactsDir, name), content, 'utf8');
  }
}

function runBuilder({ artifactsDir, outputDir }) {
  return spawnSync(
    process.execPath,
    [
      scriptPath,
      '--date',
      '2026-03-04',
      '--artifacts-dir',
      artifactsDir,
      '--output-dir',
      outputDir,
    ],
    {
      cwd: rootDir,
      encoding: 'utf8',
    }
  );
}

async function readManifest(outputDir) {
  const manifestPath = path.join(outputDir, 'm4-2-audit-manifest-2026-03-04.json');
  const raw = await readFile(manifestPath, 'utf8');
  return JSON.parse(raw);
}

describe('build-migration-audit-dossier', () => {
  afterEach(async () => {
    while (tmpRoots.length > 0) {
      const tempRoot = tmpRoots.pop();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test('generates complete dossier in happy path', async () => {
    const { artifactsDir, outputDir } = await createTempWorkspace();
    await seedArtifacts(artifactsDir, false);

    const result = runBuilder({ artifactsDir, outputDir });
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const expected = [
      'm4-2-audit-dossier-index-2026-03-04.md',
      'm4-2-audit-evidence-matrix-2026-03-04.md',
      'm4-2-audit-signoff-2026-03-04.md',
      'm4-2-audit-incident-resolution-log-2026-03-04.md',
      'm4-2-audit-manifest-2026-03-04.json',
      'm4-2-audit-package-2026-03-04.zip',
    ];

    for (const fileName of expected) {
      await access(path.join(outputDir, fileName));
    }

    const manifest = await readManifest(outputDir);
    assert.equal(manifest.decision, 'GO');
    assert.equal(manifest.missingCritical.length, 0);
  });

  test('returns explicit no-go when critical evidence is missing', async () => {
    const { artifactsDir, outputDir } = await createTempWorkspace();
    await seedArtifacts(artifactsDir, true);

    const result = runBuilder({ artifactsDir, outputDir });
    assert.notEqual(result.status, 0);

    const manifest = await readManifest(outputDir);
    assert.equal(manifest.decision, 'NO-GO');
    assert.ok(
      manifest.missingCritical.some((item) => item.requirementId === 'EV-M32-ROLLBACK'),
      'missing rollback requirement should trigger explicit NO-GO'
    );
  });

  test('stores correct sha-256 checksums in manifest', async () => {
    const { artifactsDir, outputDir } = await createTempWorkspace();
    await seedArtifacts(artifactsDir, false);

    const result = runBuilder({ artifactsDir, outputDir });
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const manifest = await readManifest(outputDir);
    const entry = manifest.evidence.find((item) =>
      item.source.endsWith('/artifacts/migration-contract-parity-report.md') ||
      item.source.endsWith('artifacts/migration-contract-parity-report.md') ||
      item.source.endsWith('migration-contract-parity-report.md')
    );
    assert.ok(entry, 'expected contract parity evidence');

    const content = await readFile(path.join(artifactsDir, 'migration-contract-parity-report.md'), 'utf8');
    const expectedHash = createHash('sha256').update(content).digest('hex');
    assert.equal(entry.checksum, expectedHash);
  });

  test('records generation duration and enforces SLA metadata', async () => {
    const { artifactsDir, outputDir } = await createTempWorkspace();
    await seedArtifacts(artifactsDir, false);

    const result = runBuilder({ artifactsDir, outputDir });
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const manifest = await readManifest(outputDir);
    assert.equal(typeof manifest.generation.durationMs, 'number');
    assert.ok(manifest.generation.durationMs >= 0);
    assert.ok(manifest.generation.durationMs <= 60000);
    assert.equal(manifest.generation.durationWithinSla, true);
  });
});
