import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const options = {
    date: new Date().toISOString().slice(0, 10),
    artifactsDir: path.join(rootDir, '_bmad-output', 'implementation-artifacts'),
    outputDir: path.join(rootDir, '_bmad-output', 'implementation-artifacts'),
    zip: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--date') {
      options.date = argv[i + 1];
      i += 1;
      continue;
    }
    if (value === '--artifacts-dir') {
      options.artifactsDir = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    if (value === '--output-dir') {
      options.outputDir = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    if (value === '--no-zip') {
      options.zip = false;
    }
  }

  return options;
}

function matchFiles(fileNames, pattern) {
  if (pattern instanceof RegExp) {
    return fileNames.filter((fileName) => pattern.test(fileName));
  }
  return fileNames.includes(pattern) ? [pattern] : [];
}

function asRelative(fromRootPath) {
  return path.relative(rootDir, fromRootPath).replaceAll(path.sep, '/');
}

function quoteMarkdownPath(filePath) {
  return `\`${filePath.replaceAll('|', '\\|')}\``;
}

async function sha256(filePath) {
  const content = await readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function resolveGitAuthor(absoluteFilePath) {
  try {
    const relative = path.relative(rootDir, absoluteFilePath);
    const output = execFileSync('git', ['log', '-1', '--format=%an <%ae>|%aI', '--', relative], {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();

    if (!output) {
      return { author: 'unknown', authoredAt: null };
    }

    const [author, authoredAt] = output.split('|');
    return {
      author: author?.trim() || 'unknown',
      authoredAt: authoredAt?.trim() || null,
    };
  } catch {
    return { author: 'unknown', authoredAt: null };
  }
}

function buildAuditIndex({
  generatedAt,
  date,
  decision,
  durationMs,
  coverageStats,
  evidenceEntries,
  missingCritical,
  expectedOutputFiles,
}) {
  const coverageSection = [
    `- Evidence requirements: ${coverageStats.total}`,
    `- Covered: ${coverageStats.covered}`,
    `- Missing: ${coverageStats.missing}`,
    `- Generation duration: ${durationMs} ms`,
  ].join('\n');

  const groupedByAc = new Map([
    ['AC1', []],
    ['AC2', []],
    ['AC3', []],
  ]);
  for (const entry of evidenceEntries) {
    for (const ac of entry.ac) {
      const key = `AC${ac}`;
      if (groupedByAc.has(key)) {
        groupedByAc.get(key).push(entry);
      }
    }
  }

  const acSections = [...groupedByAc.entries()]
    .map(([acKey, rows]) => {
      const lines = rows
        .map((row) => `- ${row.requirementId}: ${quoteMarkdownPath(row.source)} (${row.status})`)
        .join('\n');
      return `### ${acKey}\n\n${lines || '- Aucune preuve associee.'}`;
    })
    .join('\n\n');

  const missingSection =
    missingCritical.length === 0
      ? '- Aucune preuve critique manquante.'
      : missingCritical.map((item) => `- ${item.requirementId}: ${item.requirement}`).join('\n');

  const fileSection = expectedOutputFiles.map((file) => `- ${quoteMarkdownPath(file)}`).join('\n');

  return `# M4.2 Audit Dossier Index

- Story Key: m4-2-produire-le-dossier-daudit-de-migration
- Generated at: ${generatedAt}
- Package Date: ${date}
- Decision: **${decision}**

## Scope

Dossier d'audit de migration consolide pour M4.2 (preuves techniques/metier, reconciliation, incidents/resolutions, sign-off).

## Decision Log

- Decision finale automatique: **${decision}**
- Regle appliquee: toute preuve critique absente force **NO-GO**
- Justification: ${missingCritical.length === 0 ? 'Toutes les preuves critiques minimales sont presentes.' : `${missingCritical.length} preuve(s) critique(s) manquante(s).`}

## Evidence Coverage Summary

${coverageSection}

## AC Traceability

${acSections}

## Incident & Resolution Highlights

- Source incidents principale: ${quoteMarkdownPath('m3-4-incident-register.md')}
- Source resolutions principale: ${quoteMarkdownPath('m3-4-hypercare-exit-report.md')}
- Source decisions Go/No-Go: ${quoteMarkdownPath('rollback-drill-gate-report.md')}

## Gaps (No-Go triggers)

${missingSection}

## Deliverables

${fileSection}
`;
}

function buildEvidenceMatrix(evidenceRequirements, evidenceEntries) {
  const header = '| Requirement ID | Story | AC | Requirement | Source | Owner | Author | Timestamp | SHA-256 | Status |';
  const separator = '|---|---|---|---|---|---|---|---|---|---|';

  const requirementRows = evidenceRequirements.flatMap((requirement) => {
    const rows = evidenceEntries.filter((entry) => entry.requirementId === requirement.id);
    if (rows.length === 0) {
      return [
        `| ${requirement.id} | ${requirement.story} | ${requirement.ac.join(',')} | ${requirement.requirement} | (missing) | ${requirement.owner} | unknown | unknown | unknown | missing |`,
      ];
    }
    return rows.map((row) => {
      const digest = row.checksum ? `\`${row.checksum}\`` : 'unknown';
      return `| ${row.requirementId} | ${row.story} | ${row.ac.join(',')} | ${row.requirement} | ${quoteMarkdownPath(row.source)} | ${row.owner} | ${row.author} | ${row.timestamp} | ${digest} | ${row.status} |`;
    });
  });

  return `# M4.2 Audit Evidence Matrix

${header}
${separator}
${requirementRows.join('\n')}
`;
}

function buildSignOff({ generatedAt, decision, missingCritical }) {
  const closureRule =
    missingCritical.length === 0
      ? 'Cloture autorisee: aucune preuve critique manquante detectee.'
      : `Cloture bloquee: ${missingCritical.length} preuve(s) critique(s) manquante(s).`;

  return `# M4.2 Sign-Off

- Story: m4-2-produire-le-dossier-daudit-de-migration
- Generated at: ${generatedAt}
- Decision automatisee: **${decision}**
- Regle de blocage: ${closureRule}

## Signatures

| Role | Nom | Date | Decision | Commentaire |
|---|---|---|---|---|
| Responsable metier | _A renseigner_ | _A renseigner_ | ${decision} | _A renseigner_ |
| Responsable technique | _A renseigner_ | _A renseigner_ | ${decision} | _A renseigner_ |
`;
}

function buildIncidentResolutionLog({ evidenceEntries }) {
  const incidentFiles = evidenceEntries
    .filter(
      (entry) =>
        entry.source.includes('incident') ||
        entry.source.includes('rollback') ||
        entry.source.includes('hypercare')
    )
    .map((entry) => entry.source);

  const uniqueIncidentFiles = [...new Set(incidentFiles)];

  const rows =
    uniqueIncidentFiles.length === 0
      ? '| N/A | Aucune source incident/resolution detectee |'
      : uniqueIncidentFiles.map((source) => `| ${quoteMarkdownPath(source)} | A analyser et confirmer dans le dossier final |`).join('\n');

  return `# M4.2 Incident Resolution Log

| Source | Synthese |
|---|---|
${rows}
`;
}

function ensureZip(outputZipPath, relativeFileList) {
  const args = ['-q', '-r', outputZipPath, ...relativeFileList];
  const result = spawnSync('zip', args, { cwd: rootDir, encoding: 'utf8' });
  if (result.status !== 0) {
    const message = result.stderr?.trim() || result.stdout?.trim() || 'zip command failed';
    throw new Error(`Echec creation ZIP: ${message}`);
  }
}

async function main() {
  const start = Date.now();
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outputDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const fileDate = options.date;

  const evidenceRequirements = [
    {
      id: 'EV-M12-CONTRACT',
      story: 'M1.2',
      ac: ['1', '2'],
      owner: 'Equipe migration',
      requirement: 'Parite des contrats API',
      critical: true,
      patterns: ['migration-contract-parity-report.md'],
    },
    {
      id: 'EV-M13-E2E',
      story: 'M1.3',
      ac: ['1', '2'],
      owner: 'QA migration',
      requirement: 'Preuve non-regression E2E',
      critical: true,
      patterns: ['migration-e2e-critical-scenarios.md'],
    },
    {
      id: 'EV-M23-RECO',
      story: 'M2.3',
      ac: ['1', '2'],
      owner: 'Controle migration',
      requirement: 'Reconciliation avant/apres',
      critical: true,
      patterns: [/^migration-reconciliation-.*\.(md|json|csv)$/],
    },
    {
      id: 'EV-M31-RUNBOOK',
      story: 'M3.1',
      ac: ['1', '2'],
      owner: 'Release management',
      requirement: 'Runbook de cutover',
      critical: true,
      patterns: ['production-cutover-runbook.md'],
    },
    {
      id: 'EV-M32-ROLLBACK',
      story: 'M3.2',
      ac: ['1', '2'],
      owner: 'SRE/Ops',
      requirement: 'Gate rollback operationnel',
      critical: true,
      patterns: ['rollback-drill-gate-report.md'],
    },
    {
      id: 'EV-M33-DECOM',
      story: 'M3.3',
      ac: ['1', '2'],
      owner: 'Plateforme',
      requirement: 'Rapport de decommission Supabase',
      critical: true,
      patterns: [/^supabase-decommission-report-.*\.md$/],
    },
    {
      id: 'EV-M41-SEC',
      story: 'M4.1',
      ac: ['1', '2'],
      owner: 'Security lead',
      requirement: 'Revalidation securite migration',
      critical: true,
      patterns: [/^m4-1-security-revalidation-report-.*\.md$/],
    },
    {
      id: 'EV-INCIDENTS',
      story: 'M3.4',
      ac: ['1'],
      owner: 'Operations',
      requirement: 'Registre incidents et resolutions',
      critical: true,
      patterns: ['m3-4-incident-register.md', 'm3-4-hypercare-exit-report.md'],
    },
  ];

  const artifactFileNames = await readdir(options.artifactsDir);
  const evidenceEntries = [];
  const missingCritical = [];

  for (const requirement of evidenceRequirements) {
    const discovered = requirement.patterns.flatMap((pattern) => matchFiles(artifactFileNames, pattern));
    const uniqueDiscovered = [...new Set(discovered)].sort((a, b) => a.localeCompare(b));

    if (uniqueDiscovered.length === 0) {
      if (requirement.critical) {
        missingCritical.push({
          requirementId: requirement.id,
          requirement: requirement.requirement,
        });
      }
      continue;
    }

    for (const fileName of uniqueDiscovered) {
      const absolutePath = path.join(options.artifactsDir, fileName);
      const fileStat = await stat(absolutePath);
      const digest = await sha256(absolutePath);
      const { author, authoredAt } = resolveGitAuthor(absolutePath);
      evidenceEntries.push({
        requirementId: requirement.id,
        story: requirement.story,
        ac: requirement.ac,
        owner: requirement.owner,
        requirement: requirement.requirement,
        source: asRelative(absolutePath),
        sourceAbsolutePath: absolutePath,
        checksum: digest,
        status: 'covered',
        author,
        timestamp: authoredAt || fileStat.mtime.toISOString(),
        sizeBytes: fileStat.size,
      });
    }
  }

  const coverageStats = {
    total: evidenceRequirements.length,
    covered: evidenceRequirements.length - missingCritical.length,
    missing: missingCritical.length,
  };

  const durationMs = Date.now() - start;
  const durationWithinSla = durationMs <= 60_000;
  if (!durationWithinSla) {
    missingCritical.push({
      requirementId: 'NFR3',
      requirement: `Generation depasse la cible <= 60 s (${durationMs} ms)`,
    });
  }

  const decision = missingCritical.length === 0 ? 'GO' : 'NO-GO';

  const outputFiles = {
    index: path.join(options.outputDir, `m4-2-audit-dossier-index-${fileDate}.md`),
    evidenceMatrix: path.join(options.outputDir, `m4-2-audit-evidence-matrix-${fileDate}.md`),
    signOff: path.join(options.outputDir, `m4-2-audit-signoff-${fileDate}.md`),
    incidentResolution: path.join(options.outputDir, `m4-2-audit-incident-resolution-log-${fileDate}.md`),
    manifest: path.join(options.outputDir, `m4-2-audit-manifest-${fileDate}.json`),
    zip: path.join(options.outputDir, `m4-2-audit-package-${fileDate}.zip`),
  };

  const expectedOutputFiles = Object.values(outputFiles)
    .filter((absolutePath) => absolutePath !== outputFiles.zip)
    .map((absolutePath) => asRelative(absolutePath));

  const auditIndex = buildAuditIndex({
    generatedAt,
    date: fileDate,
    decision,
    durationMs,
    coverageStats,
    evidenceEntries,
    missingCritical,
    expectedOutputFiles: [
      ...expectedOutputFiles,
      asRelative(outputFiles.zip),
    ],
  });
  const evidenceMatrix = buildEvidenceMatrix(evidenceRequirements, evidenceEntries);
  const signOff = buildSignOff({ generatedAt, decision, missingCritical });
  const incidentResolution = buildIncidentResolutionLog({ evidenceEntries });

  await writeFile(outputFiles.index, auditIndex, 'utf8');
  await writeFile(outputFiles.evidenceMatrix, evidenceMatrix, 'utf8');
  await writeFile(outputFiles.signOff, signOff, 'utf8');
  await writeFile(outputFiles.incidentResolution, incidentResolution, 'utf8');

  const manifestPayload = {
    storyKey: 'm4-2-produire-le-dossier-daudit-de-migration',
    generatedAt,
    outputDate: fileDate,
    decision,
    generation: {
      durationMs,
      durationWithinSla,
      slaMs: 60_000,
    },
    coverage: coverageStats,
    missingCritical,
    deliverables: {
      index: asRelative(outputFiles.index),
      evidenceMatrix: asRelative(outputFiles.evidenceMatrix),
      signOff: asRelative(outputFiles.signOff),
      incidentResolutionLog: asRelative(outputFiles.incidentResolution),
      manifest: asRelative(outputFiles.manifest),
      zip: asRelative(outputFiles.zip),
    },
    evidence: evidenceEntries.map((entry) => ({
      requirementId: entry.requirementId,
      story: entry.story,
      ac: entry.ac,
      requirement: entry.requirement,
      owner: entry.owner,
      source: entry.source,
      checksum: entry.checksum,
      author: entry.author,
      timestamp: entry.timestamp,
      sizeBytes: entry.sizeBytes,
      status: entry.status,
    })),
  };

  await writeFile(outputFiles.manifest, `${JSON.stringify(manifestPayload, null, 2)}\n`, 'utf8');

  const zipMembers = [
    outputFiles.index,
    outputFiles.evidenceMatrix,
    outputFiles.signOff,
    outputFiles.incidentResolution,
    outputFiles.manifest,
    ...evidenceEntries.map((entry) => entry.sourceAbsolutePath),
  ];
  const zipMemberRelativePaths = [...new Set(zipMembers.map((absolutePath) => asRelative(absolutePath)))];

  if (options.zip) {
    ensureZip(asRelative(outputFiles.zip), zipMemberRelativePaths);
  }

  const summary = [
    '# M4.2 Migration Audit Dossier',
    '',
    `- Decision: **${decision}**`,
    `- Generated at: ${generatedAt}`,
    `- Generation duration: ${durationMs} ms`,
    `- Missing critical evidence: ${missingCritical.length}`,
    `- Manifest: \`${asRelative(outputFiles.manifest)}\``,
    `- Package: \`${asRelative(outputFiles.zip)}\``,
  ].join('\n');

  console.log(summary);

  if (decision !== 'GO') {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
