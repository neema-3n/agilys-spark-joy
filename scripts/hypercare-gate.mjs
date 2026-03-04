import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactsDir = path.resolve(__dirname, '..', '_bmad-output', 'implementation-artifacts');

const requiredFiles = [
  'm3-4-hypercare-dashboard-template.md',
  'm3-4-incident-register.md',
  'm3-4-daily-report-2026-03-03.md',
  'm3-4-exit-criteria-check.md',
];

function assertContains(content, checks, fileName) {
  const normalized = content.toLowerCase();
  for (const check of checks) {
    if (!normalized.includes(check.toLowerCase())) {
      throw new Error(`${fileName}: contenu manquant -> "${check}"`);
    }
  }
}

async function load(fileName) {
  const target = path.join(artifactsDir, fileName);
  return readFile(target, 'utf8');
}

async function main() {
  const contents = {};

  for (const fileName of requiredFiles) {
    contents[fileName] = await load(fileName);
  }

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
    contents['m3-4-daily-report-2026-03-03.md'],
    [
      'incidents ouverts',
      'incidents fermes',
      'MTTD',
      'MTTR',
      'risques',
      'actions',
    ],
    'm3-4-daily-report-2026-03-03.md',
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

  const output = [
    '# Hypercare Gate Report',
    '',
    '- Story: M3.4',
    '- Date: 2026-03-03',
    '- Decision: Go',
    '',
    'Tous les livrables hypercare requis sont presents et complets.',
  ].join('\n');

  console.log(output);
}

main().catch((error) => {
  console.error(`Hypercare gate failed: ${error.message}`);
  process.exit(1);
});
