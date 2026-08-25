import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '..', 'src', 'locales');
const chunksDir = join(localesDir, 'chunks');

mkdirSync(chunksDir, { recursive: true });

const lines = readFileSync(join(localesDir, 'translations.ts'), 'utf-8').split('\n');

// Find boundaries: line 5 = "  en: {", line 2530 = "  ar: {"
const enStart = 4; // 0-indexed
const arStart = 2529; // 0-indexed
const fileEnd = lines.length - 1;

console.log(`EN: lines ${enStart+1}-${arStart}, AR: lines ${arStart+1}-${fileEnd+1}`);

// Collect top-level keys from EN section (line 6 onwards, before ar:)
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

// For each EN key, find the matching AR key and extract both
const chunkNames = [];
let skipped = 0;

for (const key of enKeys) {
  // Find line index of this key in EN section
  let enLineIdx = -1;
  for (let i = enStart + 1; i < arStart; i++) {
    if (lines[i].trim() === `${key}: {`) {
      enLineIdx = i;
      break;
    }
  }
  
  // Find matching AR key
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
  
  // Remove the "key: {" header line from each block
  const enContent = enBlock.slice(1);
  const arContent = arBlock.slice(1);
  
  // Fix trailing "}," on the last line
  const fixTrailing = (arr) => {
    const last = arr[arr.length - 1];
    if (last && last.trim() === '},') {
      arr[arr.length - 1] = last.replace(/},$/, '}');
    }
    return arr;
  };
  
  const chunkFile = `export const ${key} = {
  en: {
${fixTrailing(enContent).join('\n')}
  },
  ar: {
${fixTrailing(arContent).join('\n')}
  }
} as const;

`;
  
  writeFileSync(join(chunksDir, `${key}.ts`), chunkFile);
  chunkNames.push(key);
}

console.log(`Created ${chunkNames.length} chunks, skipped ${skipped}`);

// Barrel index.ts
const barrel = `export type { Language, TranslationNode } from './translations';

${chunkNames.map(k => `export { ${k} } from './chunks/${k}';`).join('\n')}
`;
writeFileSync(join(localesDir, 'index.ts'), barrel);

// Assembled translations.ts
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
