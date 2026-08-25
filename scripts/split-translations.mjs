import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '..', 'src', 'locales');
const chunksDir = join(localesDir, 'chunks');

mkdirSync(chunksDir, { recursive: true });

const lines = readFileSync(join(localesDir, 'translations.ts'), 'utf-8').split('\n');

const enStart = 4; // 0-indexed line 5: "  en: {"
const arStart = 2529; // 0-indexed line 2530: "  ar: {"
const fileEnd = lines.length - 1;

console.log(`EN: lines ${enStart+1}-${arStart}, AR: lines ${arStart+1}-${fileEnd+1}`);

const enKeys = [];
for (let i = enStart + 1; i < arStart; i++) {
  const match = lines[i].match(/^    (\w+): \{/);
  if (match) {
    enKeys.push(match[1]);
  }
}

console.log(`Found ${enKeys.length} domains: ${enKeys.slice(0,5).join(', ')}...`);

// Extract a block starting at startLine (inclusive), ending when depth returns to 0
function extractBlock(lines, startLine) {
  const result = [];
  let depth = 0;
  let started = false;
  
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    for (const char of line) {
      if (char === '{') depth++;
      if (char === '}') depth--;
    }
    
    if (started && depth === 0) {
      result.push(line);
      break;
    }
    
    started = true;
    result.push(line);
  }
  
  return result;
}

const chunkNames = [];
let skipped = 0;

for (const key of enKeys) {
  let enLineIdx = -1;
  for (let i = enStart + 1; i < arStart; i++) {
    if (lines[i].trim() === `${key}: {`) {
      enLineIdx = i;
      break;
    }
  }
  
  let arLineIdx = -1;
  for (let i = arStart + 1; i < fileEnd; i++) {
    if (lines[i].trim() === `${key}: {`) {
      arLineIdx = i;
      break;
    }
  }
  
  if (enLineIdx === -1 || arLineIdx === -1) {
    console.warn(`Skipping ${key}: EN at ${enLineIdx}, AR at ${arLineIdx}`);
    skipped++;
    continue;
  }
  
  const enBlock = extractBlock(lines, enLineIdx);
  const arBlock = extractBlock(lines, arLineIdx);
  
  // Remove the first line ("    key: {") and the last line ("      },")
  const enContent = enBlock.slice(1, -1);
  const arContent = arBlock.slice(1, -1);
  
  // Remove trailing comma from the last property line if present
  const trimTrailingComma = (arr) => {
    if (arr.length > 0) {
      const last = arr[arr.length - 1];
      // If last line ends with just a comma (not "}," or "],")
      if (last.trim().endsWith(',') && !last.trim().endsWith('},') && !last.trim().endsWith('],')) {
        arr[arr.length - 1] = last.replace(/,$/, '');
      }
    }
    return arr;
  };
  
  const chunkFile = `export const ${key} = {
  en: {
${trimTrailingComma(enContent).join('\n')}
  },
  ar: {
${trimTrailingComma(arContent).join('\n')}
  }
} as const;

`;
  
  writeFileSync(join(chunksDir, `${key}.ts`), chunkFile);
  chunkNames.push(key);
}

console.log(`Created ${chunkNames.length} chunks, skipped ${skipped}`);

const barrel = `export type { Language, TranslationNode } from './translations';

${chunkNames.map(k => `export { ${k} } from './chunks/${k}';`).join('\n')}
`;
writeFileSync(join(localesDir, 'index.ts'), barrel);

const imports = chunkNames.map(k => `import { ${k} } from './chunks/${k}';`).join('\n');
const enSpread = chunkNames.map(k => `    ...${k}.en,`).join('\n');
const arSpread = chunkNames.map(k => `    ...${k}.ar,`).join('\n');

const assembled = `${imports}

export type Language = 'en' | 'ar';

export type TranslationNode = string | { [key: string]: TranslationNode };

export const translations: Record<Language, TranslationNode> = {
  en: {
${enSpread}
  },
  ar: {
${arSpread}
  },
};

export { type Language, type TranslationNode };
`;

writeFileSync(join(localesDir, 'translations.ts'), assembled);

console.log('\n✓ Done');
console.log(`  - ${chunkNames.length} chunk files in src/locales/chunks/`);
console.log('  - src/locales/translations.ts (assembled)');
console.log('  - src/locales/index.ts (barrel)');
