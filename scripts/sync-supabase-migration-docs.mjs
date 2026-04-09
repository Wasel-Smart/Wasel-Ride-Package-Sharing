import fs from 'node:fs';
import path from 'node:path';
import { migrationReadmePath, renderMigrationReadme } from './supabase-migration-registry.mjs';

const root = process.cwd();
const outputPath = path.join(root, migrationReadmePath);
fs.writeFileSync(outputPath, `${renderMigrationReadme()}\n`, 'utf8');
console.log(`Updated ${migrationReadmePath}`);
