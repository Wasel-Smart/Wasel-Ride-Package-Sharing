import fs from 'fs';
import path from 'path';

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) walk(full);
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) files.push(full);
  }
}
walk(path.join(process.cwd(), 'src'));
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  if (!content.includes('useLanguage()')) continue;
  const hasTInDestructure = /const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useLanguage\(\)/.test(content);
  const usesT = /[^a-zA-Z0-9_]t\(['\"]/.test(content);
  if (usesT && !hasTInDestructure) {
    console.log(f);
  }
}
