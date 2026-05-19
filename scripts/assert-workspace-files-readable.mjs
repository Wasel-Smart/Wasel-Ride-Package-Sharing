import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_DIRS = ['src', 'scripts', 'tests'];
const DEFAULT_FILES = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local',
  '.env.production',
  '.env.production.local',
  '.npmrc',
  '.prettierrc',
];
const SKIP_DIR_NAMES = new Set([
  '.git',
  '.kilo',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);
const MAX_REPORTED_FILES = 12;

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function assertFileReadable(filePath) {
  const handle = await fs.open(filePath, 'r');

  try {
    const probe = Buffer.alloc(1);
    await handle.read(probe, 0, 1, 0);
  } finally {
    await handle.close();
  }
}

async function collectUnreadableFiles(rootPath, unreadableFiles) {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(rootPath, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIR_NAMES.has(entry.name)) {
        await collectUnreadableFiles(entryPath, unreadableFiles);
      }
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    try {
      await assertFileReadable(entryPath);
    } catch (error) {
      unreadableFiles.push({
        filePath: entryPath,
        message: error instanceof Error ? error.message : String(error),
      });

      if (unreadableFiles.length >= MAX_REPORTED_FILES) {
        return;
      }
    }
  }
}

export async function assertWorkspaceFilesReadable({
  cwd,
  dirs = DEFAULT_DIRS,
  files = DEFAULT_FILES,
} = {}) {
  const workspaceRoot = cwd ? path.resolve(cwd) : process.cwd();
  const unreadableFiles = [];

  for (const relativeFilePath of files) {
    const absoluteFilePath = path.join(workspaceRoot, relativeFilePath);
    if (!(await pathExists(absoluteFilePath))) {
      continue;
    }

    try {
      await assertFileReadable(absoluteFilePath);
    } catch (error) {
      unreadableFiles.push({
        filePath: absoluteFilePath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const relativeDirPath of dirs) {
    if (unreadableFiles.length >= MAX_REPORTED_FILES) {
      break;
    }

    const absoluteDirPath = path.join(workspaceRoot, relativeDirPath);
    if (!(await pathExists(absoluteDirPath))) {
      continue;
    }

    await collectUnreadableFiles(absoluteDirPath, unreadableFiles);
  }

  if (unreadableFiles.length === 0) {
    return;
  }

  const lines = unreadableFiles.map(({ filePath, message }) => {
    const relativePath = path.relative(workspaceRoot, filePath) || filePath;
    return `  - ${relativePath}: ${message}`;
  });

  throw new Error(
    [
      'Workspace contains unreadable files.',
      'This usually means OneDrive Files On-Demand left cloud placeholders in the repo.',
      'Make the project folder available offline or move it outside OneDrive, then try again.',
      '',
      ...lines,
    ].join('\n'),
  );
}
