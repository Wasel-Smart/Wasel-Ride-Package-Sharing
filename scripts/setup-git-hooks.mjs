import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const gitDir = path.join(root, '.git');

if (!fs.existsSync(gitDir)) {
  console.log('Skipping git hook setup: no .git directory found.');
  process.exit(0);
}

try {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
    cwd: root,
    stdio: 'ignore',
  });
  console.log('Git hooks path configured to .githooks');
} catch {
  console.log('Skipping git hook setup: unable to configure git hooks path.');
}
