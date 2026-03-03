import { access, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactsDir = path.join(rootDir, '_bmad-output', 'implementation-artifacts');
const outputPath = path.join(artifactsDir, 'rollback-drill-gate-report.md');

const requiredRoles = [
  'Release Manager',
  'SRE/Ops',
  'Lead Backend',
  'Lead Data',
  'Support/Business',
];

const requiredEvidenceTypes = ['logs', 'smoke', 'business-validation', 'final-decision'];

function asBoolean(value) {
  return Boolean(value);
}

function fail(message) {
  throw new Error(message);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function extractMinuteDelta(startMs, stepTime) {
  const stepMs = new Date(stepTime).getTime();
  if (!Number.isFinite(stepMs) || stepMs < startMs) {
    return null;
  }
  return Math.round((stepMs - startMs) / 60000);
}

async function resolveDefaultInputPath() {
  const entries = await readdir(artifactsDir, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isFile() && /^rollback-staging-drill-.*\.json$/.test(entry.name))
    .map((entry) => path.join(artifactsDir, entry.name));

  if (candidates.length === 0) {
    fail('Aucun fichier rollback-staging-drill-*.json trouve dans implementation-artifacts');
  }

  const withStats = await Promise.all(
    candidates.map(async (candidate) => ({
      candidate,
      mtimeMs: (await stat(candidate)).mtimeMs,
    }))
  );

  withStats.sort((a, b) => b.mtimeMs - a.mtimeMs || b.candidate.localeCompare(a.candidate));
  return withStats[0].candidate;
}

async function validatePayload(payload) {
  const findings = [];

  const preconditions = payload?.preconditions ?? {};
  for (const role of requiredRoles) {
    if (!asBoolean(preconditions.roles?.[role])) {
      findings.push(`Role critique manquant ou non confirme: ${role}`);
    }
  }
  if (!asBoolean(preconditions.noGoDeclared)) {
    findings.push('Decision No-Go non tracee');
  }
  if (!asBoolean(preconditions.incidentChannelActive)) {
    findings.push('Canal incident non actif');
  }
  if (!asBoolean(preconditions.snapshotAccessible)) {
    findings.push('Snapshot pre-cutover non accessible');
  }

  const timeline = Array.isArray(payload?.timeline) ? payload.timeline : [];
  if (timeline.length === 0) {
    findings.push('Timeline vide');
  }
  const unownedSteps = timeline.filter((step) => !step.owner);
  const stepsWithoutStatus = timeline.filter((step) => !step.status);
  const stepsWithoutCriteria = timeline.filter(
    (step) => typeof step?.successCriteria !== 'string' || step.successCriteria.trim().length === 0
  );
  if (unownedSteps.length > 0) {
    findings.push(`Etapes sans owner: ${unownedSteps.length}`);
  }
  if (stepsWithoutStatus.length > 0) {
    findings.push(`Etapes sans statut explicite: ${stepsWithoutStatus.length}`);
  }
  if (stepsWithoutCriteria.length > 0) {
    findings.push(`Etapes sans critere de succes: ${stepsWithoutCriteria.length}`);
  }

  let timelineMaxMinute = null;
  if (timeline.length > 0) {
    const startMs = new Date(timeline[0]?.time).getTime();
    if (!Number.isFinite(startMs)) {
      findings.push('Premier horodatage timeline invalide');
    } else {
      const minuteDeltas = timeline
        .map((step) => extractMinuteDelta(startMs, step.time))
        .filter((value) => value !== null);

      if (minuteDeltas.length !== timeline.length) {
        findings.push('Timeline contient des horodatages invalides ou non croissants');
      } else {
        const hasT0 = minuteDeltas.includes(0);
        timelineMaxMinute = Math.max(...minuteDeltas);
        if (!hasT0) {
          findings.push('Timeline ne demarre pas a T+0');
        }
        if (timelineMaxMinute < 45) {
          findings.push(`Timeline incomplete (max observe: T+${timelineMaxMinute}, attendu >= T+45)`);
        }
      }
    }
  }

  const metrics = payload?.metrics ?? {};
  const rtoMin = Number(metrics.rtoMinutes);
  const rpoMin = Number(metrics.rpoMinutes);
  if (!Number.isFinite(rtoMin)) {
    findings.push('RTO invalide');
  }
  if (!Number.isFinite(rpoMin)) {
    findings.push('RPO invalide');
  }
  if (Number.isFinite(rtoMin) && rtoMin > 30) {
    findings.push(`RTO hors cible (${rtoMin} > 30)`);
  }
  if (Number.isFinite(rpoMin) && rpoMin > 5) {
    findings.push(`RPO hors cible (${rpoMin} > 5)`);
  }

  if (!asBoolean(payload?.checks?.apiAuthSmokePass)) {
    findings.push('Smoke API/Auth non valide');
  }
  if (!asBoolean(payload?.checks?.criticalBusinessFlowsPass)) {
    findings.push('Parcours metier critiques non valides');
  }

  const evidence = Array.isArray(payload?.evidence) ? payload.evidence : [];
  for (const evidenceType of requiredEvidenceTypes) {
    const item = evidence.find((entry) => entry?.type === evidenceType);
    if (!item || typeof item.reference !== 'string' || item.reference.length === 0) {
      findings.push(`Preuve obligatoire manquante: ${evidenceType}`);
      continue;
    }

    const resolvedReference = path.isAbsolute(item.reference)
      ? item.reference
      : path.resolve(rootDir, item.reference);
    if (!(await fileExists(resolvedReference))) {
      findings.push(`Preuve referencee introuvable (${evidenceType}): ${item.reference}`);
    }
  }

  const expectedStatusValues = new Set(['success', 'partial', 'failure']);
  if (!expectedStatusValues.has(String(payload?.finalStatus))) {
    findings.push('Statut final invalide (attendu: success|partial|failure)');
  }

  return {
    findings,
    summary: {
      rtoMin,
      rpoMin,
      timelineSteps: timeline.length,
      timelineMaxMinute,
      evidenceItems: evidence.length,
      finalStatus: String(payload?.finalStatus ?? 'unknown'),
    },
  };
}

function buildMarkdownReport({ inputPath, generatedAt, result }) {
  const decision = result.findings.length === 0 ? 'PASS' : 'FAIL';
  const findingsSection =
    result.findings.length === 0
      ? '- Aucun ecart detecte.'
      : result.findings.map((item) => `- ${item}`).join('\n');

  return `# Rollback Drill Gate Report

- Generated at: ${generatedAt}
- Input: \`${inputPath}\`
- Gate decision: **${decision}**

## Summary

- Timeline steps: ${result.summary.timelineSteps}
- Timeline range: T+0 -> T+${result.summary.timelineMaxMinute ?? 'N/A'}
- Evidence items: ${result.summary.evidenceItems}
- RTO observed: ${result.summary.rtoMin} min (target <= 30)
- RPO observed: ${result.summary.rpoMin} min (target <= 5)
- Final execution status: ${result.summary.finalStatus}

## Findings

${findingsSection}
`;
}

async function main() {
  const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : await resolveDefaultInputPath();
  const raw = await readFile(inputPath, 'utf8');
  const payload = JSON.parse(raw);
  const result = await validatePayload(payload);
  const generatedAt = new Date().toISOString();
  const report = buildMarkdownReport({ inputPath, generatedAt, result });

  await writeFile(outputPath, report, 'utf8');
  console.log(report);

  if (result.findings.length > 0) {
    fail('Rollback drill gate failed');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
