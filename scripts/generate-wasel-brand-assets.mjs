import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const brandDir = path.join(root, 'public', 'brand');
const artifactDir = path.join(root, 'artifacts', 'brand');

await mkdir(artifactDir, { recursive: true });

const files = await readdir(brandDir, { withFileTypes: true });
const copied = [];
for (const file of files) {
  if (!file.isFile() || !/\.(?:png|svg|ico)$/i.test(file.name)) continue;
  await cp(path.join(brandDir, file.name), path.join(artifactDir, file.name));
  copied.push(file.name);
}

if (copied.length === 0) {
  throw new Error(`No brand assets found in ${brandDir}`);
}

console.log(`Prepared ${copied.length} brand assets in ${artifactDir}`);
