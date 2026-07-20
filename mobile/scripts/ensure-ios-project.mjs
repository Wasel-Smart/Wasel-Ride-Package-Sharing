import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const workspacePath = join(root, 'ios', 'Wasel.xcworkspace');
const projectPath = join(root, 'ios', 'Wasel.xcodeproj');

function run(command, args) {
  execFileSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

if (existsSync(workspacePath) || existsSync(projectPath)) {
  process.exit(0);
}

if (process.platform !== 'darwin') {
  console.error(
    'iOS native project is missing. Run `npm run ios:prebuild` on macOS, then `npm run ios:pods` before building.',
  );
  process.exit(1);
}

run('npx', ['expo', 'prebuild', '--platform', 'ios']);

if (!existsSync(workspacePath) && !existsSync(projectPath)) {
  console.error('Expo prebuild completed but did not create ios/Wasel.xcworkspace or ios/Wasel.xcodeproj.');
  process.exit(1);
}
