import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const now = new Date();
const timestamp = now.toISOString().replace(/[:]/g, '-').replace(/\.\d{3}Z$/, 'Z');
const rootDir = process.cwd();
const runDir = path.join(rootDir, 'test-results', 'migration-e2e', timestamp);
const artifactsDir = path.join(runDir, 'artifacts');
const jsonPath = path.join(runDir, 'playwright-report.json');
const stdoutLogPath = path.join(runDir, 'playwright-stdout.log');
const stderrLogPath = path.join(runDir, 'playwright-stderr.log');
const reportPath = path.join(runDir, 'migration-e2e-report.md');
const scenarioCatalogPath = path.join(
  rootDir,
  '_bmad-output',
  'implementation-artifacts',
  'migration-e2e-critical-scenarios.md'
);

const cmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const args = [
  'exec',
  'playwright',
  'test',
  '--config',
  'playwright.migration.config.ts',
  'tests/auth-migration.spec.ts',
  '--grep',
  '@migration-',
  '--reporter=json',
  '--output',
  artifactsDir
];

const fallbackCriticalFlowTags = ['@flux-AUTH-01', '@flux-AUTH-03', '@flux-BUD-02', '@flux-OPS-05'];

const loadExpectedFlowTags = async () => {
  try {
    const catalog = await readFile(scenarioCatalogPath, 'utf8');
    const matches = [...catalog.matchAll(/`([A-Z]+-\d+)`/g)];
    const ids = [...new Set(matches.map((match) => match[1]))];

    if (ids.length === 0) {
      return fallbackCriticalFlowTags;
    }

    return ids.map((id) => `@flux-${id}`);
  } catch {
    return fallbackCriticalFlowTags;
  }
};

const flattenPlaywrightTests = (suite, parents = []) => {
  const suiteTitle = typeof suite.title === 'string' && suite.title.trim().length > 0
    ? [...parents, suite.title]
    : [...parents];

  const current = [];

  if (Array.isArray(suite.specs)) {
    for (const spec of suite.specs) {
      const specTitle = typeof spec.title === 'string' ? spec.title : '(untitled spec)';
      for (const test of spec.tests ?? []) {
        const results = Array.isArray(test.results) ? test.results : [];
        const finalResult = results.length > 0 ? results[results.length - 1] : null;
        const status = typeof finalResult?.status === 'string' ? finalResult.status : 'unknown';
        const fullTitle = [...suiteTitle, specTitle].join(' > ');
        const tags = Array.isArray(spec.tags)
          ? spec.tags.map((tag) => (tag.startsWith('@') ? tag : `@${tag}`))
          : [];
        const acTag = tags.find((tag) => /^@ac\d+$/i.test(tag)) ?? '@ac-unknown';
        const flowTag = tags.find((tag) => /^@flux-[\w-]+$/i.test(tag)) ?? '@flux-unknown';
        const migrationTag = tags.find((tag) => /^@migration-[\w-]+$/i.test(tag)) ?? '@migration-unknown';

        current.push({
          title: fullTitle,
          status,
          acTag,
          flowTag,
          migrationTag,
          tags,
          errors: finalResult?.errors ?? []
        });
      }
    }
  }

  for (const child of suite.suites ?? []) {
    current.push(...flattenPlaywrightTests(child, suiteTitle));
  }

  return current;
};

const buildMarkdownReport = ({
  generatedAt,
  runCommand,
  total,
  passed,
  failed,
  skipped,
  failedCases,
  allCases,
  gateDecision,
  expectedFlowTags,
  missingFlowTags
}) => {
  const rows = allCases
    .map(
      (testCase) =>
        `| ${testCase.acTag} | ${testCase.flowTag} | ${testCase.migrationTag} | ${testCase.status.toUpperCase()} | ${testCase.title.replace(/\|/g, '\\|')} |`
    )
    .join('\n');

  const failures = failedCases.length
    ? failedCases
        .map(
          (testCase) =>
            `- ${testCase.acTag} ${testCase.flowTag} -> ${testCase.title}${
              testCase.errors.length ? ` (errors: ${testCase.errors.length})` : ''
            }`
        )
        .join('\n')
    : '- Aucun echec critique.';

  const coverageLine = `${expectedFlowTags.length - missingFlowTags.length}/${expectedFlowTags.length}`;
  const missingFlowsSection = missingFlowTags.length
    ? missingFlowTags.map((flow) => `- ${flow}`).join('\n')
    : '- Aucun flux critique manquant.';

  return `# Migration E2E Non-Regression Report\n\n- Generated at: ${generatedAt}\n- Command: \`${runCommand}\`\n- Gate decision: **${gateDecision}**\n\n## Summary\n\n- Total critical tests: ${total}\n- Passed: ${passed}\n- Failed: ${failed}\n- Skipped/Other: ${skipped}\n- Critical flow coverage: ${coverageLine}\n\n## AC/Flow Traceability\n\n| AC | Flux | Migration Tag | Status | Test |\n|---|---|---|---|---|\n${rows || '| @ac-unknown | @flux-unknown | @migration-unknown | UNKNOWN | No tagged tests found |'}\n\n## Missing critical flows\n\n${missingFlowsSection}\n\n## Failures mapped to AC/Flow\n\n${failures}\n`;
};

await mkdir(artifactsDir, { recursive: true });

let stdout = '';
let stderr = '';

const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(cmd, args, {
    cwd: rootDir,
    env: {
      ...process.env,
      PLAYWRIGHT_HTML_OPEN: 'never',
      PLAYWRIGHT_JSON_OUTPUT_NAME: jsonPath
    }
  });

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  child.on('error', reject);
  child.on('close', (code) => resolve(code ?? 1));
});

await writeFile(stdoutLogPath, stdout, 'utf8');
await writeFile(stderrLogPath, stderr, 'utf8');

let json = null;
try {
  const raw = await readFile(jsonPath, 'utf8');
  json = JSON.parse(raw);
} catch {
  json = null;
}

if (!json) {
  const fallbackReport = `# Migration E2E Non-Regression Report\n\n- Generated at: ${new Date().toISOString()}\n- Gate decision: **No-Go**\n\n## Error\n\nImpossible de parser le rapport JSON Playwright. Voir logs:\n- \`${path.relative(rootDir, stdoutLogPath)}\`\n- \`${path.relative(rootDir, stderrLogPath)}\`\n`;
  await writeFile(reportPath, fallbackReport, 'utf8');
  console.error('Unable to parse Playwright JSON output.');
  process.exit(1);
}

const suites = Array.isArray(json.suites) ? json.suites : [];
const allCases = suites.flatMap((suite) => flattenPlaywrightTests(suite)).filter((testCase) =>
  testCase.tags.some((tag) => /^@migration-/i.test(tag))
);

const failedCases = allCases.filter((testCase) => testCase.status !== 'passed');
const total = allCases.length;
const passed = allCases.filter((testCase) => testCase.status === 'passed').length;
const failed = allCases.filter((testCase) => testCase.status === 'failed').length;
const skipped = total - passed - failed;
const expectedFlowTags = await loadExpectedFlowTags();
const coveredFlowTags = new Set(allCases.map((testCase) => testCase.flowTag));
const missingFlowTags = expectedFlowTags.filter((flowTag) => !coveredFlowTags.has(flowTag));

const gateDecision =
  total > 0 &&
  failedCases.length === 0 &&
  exitCode === 0 &&
  missingFlowTags.length === 0
    ? 'Go'
    : 'No-Go';

const report = buildMarkdownReport({
  generatedAt: now.toISOString(),
  runCommand: `${cmd} ${args.join(' ')}`,
  total,
  passed,
  failed,
  skipped,
  failedCases,
  allCases,
  gateDecision,
  expectedFlowTags,
  missingFlowTags
});

await writeFile(reportPath, report, 'utf8');

console.log(report);
console.log(`Artifacts directory: ${path.relative(rootDir, runDir)}`);

if (gateDecision !== 'Go') {
  process.exit(1);
}
