/**
 * Convenience wrapper around the canonical Python asset generator.
 *
 * The checked-in source files live in:
 *   - src/assets/wasel-logo-source.png
 *   - src/assets/wasel-mark-source.png
 *
 * Run from the project root:
 *   node scripts/update-logo-assets.js
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const scriptPath = path.join(__dirname, 'generate-wasel-brand-assets.py');

const result = spawnSync('python', [scriptPath], {
  cwd: projectRoot,
  stdio: 'inherit',
});

if (result.error) {
  console.error('Failed to run Python logo asset generator:', result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
