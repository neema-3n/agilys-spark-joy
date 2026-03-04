import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const configPath = path.join(__dirname, 'supabase-runtime-gate.config.json');

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const allowedExtensions = new Set(config.file_extensions);
const excludedPathPrefixes = (config.exclude_paths ?? []).map((prefix) =>
  String(prefix).replace(/\\/g, '/').replace(/\/+$/, '')
);
const forbiddenPatterns = config.forbidden_runtime_patterns.map((pattern) => ({
  pattern,
  regex: new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
}));

const shouldExcludePath = (entryPath) => {
  const relativePath = path.relative(repoRoot, entryPath).replace(/\\/g, '/');
  return excludedPathPrefixes.some((prefix) => relativePath.startsWith(prefix));
};

const readDirRecursive = (entryPath, acc) => {
  if (shouldExcludePath(entryPath)) {
    return;
  }

  const stat = fs.statSync(entryPath);
  if (stat.isDirectory()) {
    const entries = fs.readdirSync(entryPath);
    for (const child of entries) {
      readDirRecursive(path.join(entryPath, child), acc);
    }
    return;
  }

  if (!allowedExtensions.has(path.extname(entryPath))) {
    return;
  }

  acc.push(entryPath);
};

const collectActiveFiles = () => {
  const files = [];
  for (const relativePath of config.active_surface_paths) {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }
    readDirRecursive(absolutePath, files);
  }
  return Array.from(new Set(files));
};

const findViolations = (files) => {
  const violations = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const forbidden of forbiddenPatterns) {
      forbidden.regex.lastIndex = 0;
      let match = forbidden.regex.exec(content);
      while (match) {
        const startIndex = match.index;
        const line = content.slice(0, startIndex).split('\n').length;
        violations.push({
          file: path.relative(repoRoot, file),
          line,
          pattern: forbidden.pattern
        });
        match = forbidden.regex.exec(content);
      }
    }
  }
  return violations;
};

const gateDate = new Date();
const expiryDate = new Date(config.legacy_mode.expires_on);
const legacyFlagEnabled = process.env[config.legacy_mode.feature_flag] === '1';

if (legacyFlagEnabled && gateDate > expiryDate) {
  console.error('❌ Gate bloquante: le mode legacy Supabase a depasse la date d expiration.');
  console.error(`   Feature flag: ${config.legacy_mode.feature_flag}=1`);
  console.error(`   Date limite: ${config.legacy_mode.expires_on}`);
  process.exit(1);
}

const activeFiles = collectActiveFiles();
const violations = findViolations(activeFiles);

if (violations.length > 0) {
  console.error('❌ Gate ZERO RUNTIME SUPABASE: violations detectees dans les surfaces actives.');
  for (const violation of violations) {
    console.error(` - ${violation.file}:${violation.line} -> ${violation.pattern}`);
  }
  process.exit(1);
}

console.log('✅ Gate ZERO RUNTIME SUPABASE: aucune dependance runtime Supabase dans les surfaces actives.');
console.log(`ℹ️ Surfaces analysees: ${activeFiles.length} fichiers.`);
console.log(`ℹ️ Legacy mode: ${config.legacy_mode.feature_flag} (expiration ${config.legacy_mode.expires_on}).`);
