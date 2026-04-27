import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const domainsRoot = path.resolve('src/domains');
const importPattern = /\bfrom\s+['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
const violations = [];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(fullPath);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  }));

  return files.flat();
}

function normalizeImport(specifier) {
  return specifier.replace(/\\/g, '/');
}

function addViolation(file, specifier, message) {
  violations.push({
    file: path.relative(process.cwd(), file).replace(/\\/g, '/'),
    specifier,
    message,
  });
}

function validateImport(file, layer, specifier, domainName) {
  const normalized = normalizeImport(specifier);
  const importsLegacyUi = /(^@\/(components|features|pages)\/)|(^\.\.\/)+((components|features|pages)\/)/.test(normalized);
  const importsLegacyServices = /(^@\/services\/)|(^\.\.\/)+(services\/)/.test(normalized);
  const importsOtherDomainInternals = /^@domains\/[^/]+\/(application|domain|infrastructure|presentation)/.test(normalized);
  const importsInternalLayer = /\/(application|infrastructure|presentation)\//.test(normalized);

  if (importsLegacyUi) {
    addViolation(file, normalized, 'Domain code must not depend on legacy UI layers.');
  }

  if (importsLegacyServices && layer !== 'infrastructure') {
    addViolation(file, normalized, 'Only infrastructure adapters may bridge to legacy services.');
  }

  if (importsOtherDomainInternals && !normalized.startsWith(`@domains/${domainName}/`)) {
    addViolation(file, normalized, 'Cross-domain imports must use published contracts, not internal layers.');
  }

  if (layer === 'domain' && importsInternalLayer) {
    addViolation(file, normalized, 'Domain layer cannot depend on application, infrastructure, or presentation layers.');
  }

  if (layer === 'application' && /\/presentation\//.test(normalized)) {
    addViolation(file, normalized, 'Application layer cannot depend on presentation.');
  }
}

const files = await collectFiles(domainsRoot);

for (const file of files) {
  const normalizedFile = file.replace(/\\/g, '/');
  const match = normalizedFile.match(/src\/domains\/([^/]+)\/([^/]+)\//);
  if (!match) {
    continue;
  }

  const [, domainName, layer] = match;
  const content = await readFile(file, 'utf8');

  for (const result of content.matchAll(importPattern)) {
    const specifier = result[1] ?? result[2];
    if (!specifier) {
      continue;
    }

    validateImport(file, layer, specifier, domainName);
  }
}

if (violations.length > 0) {
  console.error('Domain boundary violations detected:\n');
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.message} (${violation.specifier})`);
  }
  process.exit(1);
}

console.log(`Domain boundary check passed for ${files.length} files.`);
