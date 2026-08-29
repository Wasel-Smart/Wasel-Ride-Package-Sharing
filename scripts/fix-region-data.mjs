import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'src', 'utils', 'regionConfig', 'data');

const files = readdirSync(dataDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const path = join(dataDir, file);
  let content = readFileSync(path, 'utf-8');
  
  // Add import for RegionConfig if not present
  if (!content.includes('import type')) {
    content = `import type { RegionConfig } from '../types';\n\n${content}`;
  }
  
  // Add export before const (check after any imports)
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('const ')) {
      lines[i] = lines[i].replace('const ', 'export const ');
      break;
    }
  }
  content = lines.join('\n');
  
  writeFileSync(path, content);
}

console.log(`Fixed ${files.length} data files`);
