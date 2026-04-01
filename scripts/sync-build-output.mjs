import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const legacyBuildDir = path.join(root, 'build');

if (!fs.existsSync(distDir)) {
  console.error('Cannot sync build output because /dist does not exist.');
  process.exit(1);
}

fs.rmSync(legacyBuildDir, { recursive: true, force: true });
fs.cpSync(distDir, legacyBuildDir, { recursive: true });

console.log('Mirrored /dist to /build for legacy deployment targets.');
