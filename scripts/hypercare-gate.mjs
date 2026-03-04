import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactsDir = path.resolve(__dirname, '..', '_bmad-output', 'implementation-artifacts');

const requiredFiles = [
  'm3-4-hypercare-dashboard-template.md',
  'm3-4-incident-register.md',
  'm3-4-exit-criteria-check.md',
];

function normalize(content) {
  return content
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-zA-Z0-9+]+/g, ' ')
    .toLowerCase()
    .trim();
}

function assertContains(content, checks, fileName) {
  const normalized = normalize(content);
  for (const check of checks) {
    if (!normalized.includes(normalize(check))) {
      throw new Error(`${fileName}: contenu manquant -> "${check}"`);
    }
  }
}

async function load(fileName) {
  const target = path.join(artifactsDir, fileName);
  return readFile(target, 'utf8');
}

async function resolveLatestDailyReport() {
  const files = await readdir(artifactsDir);
  const candidates = files
    .map((fileName) => {
      const match = fileName.match(/^m3-4-daily-report-(\d{4}-\d{2}-\d{2})\.md$/);
      if (!match) {
        return null;
      }
      return {
        fileName,
        date: match[1],
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (candidates.length === 0) {
    throw new Error(
      'Aucun rapport journalier trouve. Fichier attendu: m3-4-daily-report-YYYY-MM-DD.md',
    );
  }

  return candidates[candidates.length - 1].fileName;
}

function extractUncheckedExitCriteria(exitCriteriaContent) {
  const lines = exitCriteriaContent.split('\n');
  const unchecked = [];
  let inExitSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('## Criteres de sortie')) {
      inExitSection = true;
      continue;
    }

    if (inExitSection && trimmed.startsWith('## ') && !trimmed.startsWith('## Criteres de sortie')) {
      break;
    }

    if (inExitSection && trimmed.startsWith('- [ ]')) {
      unchecked.push(trimmed.replace('- [ ]', '').trim());
    }
  }

  return unchecked;
}

async function main() {
  const contents = {};
  const latestDailyReport = await resolveLatestDailyReport();

  for (const fileName of requiredFiles) {
    contents[fileName] = await load(fileName);
  }
  contents[latestDailyReport] = await load(latestDailyReport);

  assertContains(
    contents['m3-4-hypercare-dashboard-template.md'],
    [
      'J0',
      'J+30',
      'RACI',
      'Standup hypercare quotidien',
      'auth',
      'API',
      'parcours critiques',
      'erreurs frontend',
      'seuils d alerte',
      'escalade',
    ],
    'm3-4-hypercare-dashboard-template.md',
  );

  assertContains(
    contents['m3-4-incident-register.md'],
    [
      'P1',
      'P2',
      'Temps de detection',
      'Temps de mitigation',
      'Temps de resolution',
      'Action corrective',
      'Proprietaire',
      'ETA',
      'communication interne',
    ],
    'm3-4-incident-register.md',
  );

  assertContains(
    contents[latestDailyReport],
    [
      'incidents ouverts',
      'incidents fermes',
      'MTTD',
      'MTTR',
      'risques',
      'actions',
    ],
    latestDailyReport,
  );

  assertContains(
    contents['m3-4-exit-criteria-check.md'],
    [
      'criteres d entree',
      'criteres de sortie',
      'revue hebdomadaire',
      'causes racines',
      'transfert en run standard',
    ],
    'm3-4-exit-criteria-check.md',
  );

  const pendingExitCriteria = extractUncheckedExitCriteria(
    contents['m3-4-exit-criteria-check.md'],
  );
  const exitReadiness =
    pendingExitCriteria.length === 0
      ? 'Go (criteres de sortie valides)'
      : `No-Go (criteres en attente: ${pendingExitCriteria.length})`;

  const output = [
    '# Hypercare Gate Report',
    '',
    '- Story: M3.4',
    `- Rapport journalier evalue: ${latestDailyReport}`,
    `- Date gate: ${new Date().toISOString().slice(0, 10)}`,
    '- Decision Documentation: Go',
    `- Decision Sortie Hypercare: ${exitReadiness}`,
    '',
    'Tous les livrables hypercare requis sont presents et complets.',
    ...(pendingExitCriteria.length === 0
      ? []
      : ['', 'Criteres de sortie en attente:', ...pendingExitCriteria.map((item) => `- ${item}`)]),
  ].join('\n');

  console.log(output);
}

main().catch((error) => {
  console.error(`Hypercare gate failed: ${error.message}`);
  process.exit(1);
});
