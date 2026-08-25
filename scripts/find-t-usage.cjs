import fs from 'fs';
import path from 'path';

const files = [];
const ROOT = path.resolve(process.cwd(), 'src');

function walk(dir) {
  const baseDir = path.resolve(dir);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const resolvedFull = path.resolve(dir, entry.name);
    if (!resolvedFull.startsWith(baseDir)) continue;
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) walk(resolvedFull);
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) files.push(resolvedFull);
  }
}
walk(ROOT);
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  if (!content.includes('useLanguage()')) continue;
  const hasTInDestructure = /const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useLanguage\(\)/.test(content);
  const usesT = /[^a-zA-Z0-9_]t\(['\"]/.test(content);
  if (usesT && !hasTInDestructure) {
    console.log(f);
  }
}
