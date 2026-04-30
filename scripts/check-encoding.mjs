import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FILE_PATTERN = /\.(ts|tsx|js|mjs|json|md|ya?ml|css)$/i;
const EXCLUDED_FILES = [
  'src/utils/textEncoding.ts',
  'src\\utils\\textEncoding.ts',
  'scripts/check-encoding.mjs',
  'scripts\\check-encoding.mjs',
];
const EXCLUDED_PATH_PREFIXES = [
  '.eval-dist/',
  '.playwright-dist/',
  'dist/',
  'coverage/',
];
const SUSPICIOUS_PATTERNS = [
  /Ã./u,
  /Â./u,
  /â[\u0080-\u00BF]/u,
  /ðŸ/u,
  /Ù[\u0000-\u00FF]/u,
  /Ø[\u0000-\u00FF]/u,
];

function readGitFileList(args) {
  try {
    return execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getOffendingLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content
    .split(/\r?\n/u)
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(line)));
}

function normalizeGitPath(filePath) {
  return filePath.replaceAll('\\', '/');
}

function isExcludedFile(filePath) {
  const normalizedPath = normalizeGitPath(filePath);
  return EXCLUDED_FILES.includes(filePath)
    || EXCLUDED_FILES.includes(normalizedPath)
    || EXCLUDED_PATH_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
}

const files = Array.from(new Set([
  ...readGitFileList(['diff', '--cached', '--name-only', '--diff-filter=ACMR']),
  ...readGitFileList(['diff', '--name-only', '--diff-filter=ACMR']),
]))
  .filter((filePath) => FILE_PATTERN.test(filePath))
  .filter((filePath) => !isExcludedFile(filePath))
  .map((filePath) => path.join(ROOT, filePath))
  .filter((filePath) => fs.existsSync(filePath));

if (files.length === 0) {
  console.log('Encoding check skipped: no changed text files found.');
  process.exit(0);
}

const failures = files.flatMap((filePath) =>
  getOffendingLines(filePath).map(({ line, lineNumber }) => ({
    filePath,
    lineNumber,
    line,
  })),
);

if (failures.length > 0) {
  console.error('Encoding check failed. Suspicious mojibake markers were found:');
  for (const failure of failures) {
    console.error(`- ${path.relative(ROOT, failure.filePath)}:${failure.lineNumber} ${failure.line.trim()}`);
  }
  process.exit(1);
}

console.log(`Encoding check passed across ${files.length} files.`);
