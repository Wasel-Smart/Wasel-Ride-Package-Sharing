import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const utilsDir = join(__dirname, '..', 'src', 'utils');
const regionDir = join(utilsDir, 'regionConfig');
const dataDir = join(regionDir, 'data');

mkdirSync(dataDir, { recursive: true });

const lines = readFileSync(join(utilsDir, 'regionConfig.ts'), 'utf-8').split('\n');

const countries = [
  { name: 'JORDAN', iso: 'jo', start: 104 },
  { name: 'EGYPT', iso: 'eg', start: 287 },
  { name: 'SAUDI_ARABIA', iso: 'sa', start: 502 },
  { name: 'UAE', iso: 'ae', start: 651 },
  { name: 'KUWAIT', iso: 'kw', start: 784 },
  { name: 'BAHRAIN', iso: 'bh', start: 869 },
  { name: 'QATAR', iso: 'qa', start: 938 },
  { name: 'OMAN', iso: 'om', start: 1023 },
  { name: 'LEBANON', iso: 'lb', start: 1108 },
  { name: 'PALESTINE', iso: 'ps', start: 1209 },
  { name: 'MOROCCO', iso: 'ma', start: 1278 },
  { name: 'TUNISIA', iso: 'tn', start: 1395 },
  { name: 'IRAQ', iso: 'iq', start: 1496 },
];

const regionsStart = 1581; // line 1582: export const REGIONS
const helpersStart = 1597; // line 1598: // ─── Helpers

// Extract block from startLine to just before next country or REGIONS
function extractCountryBlock(lines, startLine) {
  const result = [];
  let depth = 0;
  let started = false;
  
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    
    // Stop at REGIONS or next country
    if (started && i >= regionsStart) break;
    
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

// Write each country config
for (const country of countries) {
  const block = extractCountryBlock(lines, country.start);
  const content = block.join('\n') + '\n';
  writeFileSync(join(dataDir, `${country.iso}.ts`), content);
}

// Extract types section (lines 1-101)
const typesLines = lines.slice(0, 101);
writeFileSync(join(regionDir, 'types.ts'), typesLines.join('\n') + '\n');

// Extract REGIONS object
const regionsLines = lines.slice(regionsStart, helpersStart);
writeFileSync(join(regionDir, 'regions.ts'), regionsLines.join('\n') + '\n');

// Extract helper functions
const helpersLines = lines.slice(helpersStart);
writeFileSync(join(regionDir, 'helpers.ts'), helpersLines.join('\n') + '\n');

// Create barrel index.ts
const barrel = `// Types
export type { CountryCode, RegionFuelConfig, RouteTier, CityRoute, CulturalRules, RegionConfig } from './types';

// Country data
${countries.map(c => `export { ${c.name} } from './data/${c.iso}';`).join('\n')}

// Regions map and helpers
export { REGIONS } from './regions';
export { getRegion, getActiveRegions, getAllRegions, getTier1Routes, getPopularRoutes, getPackageRoutes, findRoute, findCityRoutes, getOriginCities, getDestinationsFrom, getFuelConfig, isPackageDeliveryEnabled, getCulturalRules } from './helpers';
`;

writeFileSync(join(regionDir, 'index.ts'), barrel);

console.log(`✓ Split regionConfig.ts:`);
console.log(`  - types.ts (type definitions)`);
console.log(`  - regions.ts (REGIONS map)`);
console.log(`  - helpers.ts (helper functions)`);
console.log(`  - data/*.ts (${countries.length} country configs)`);
console.log(`  - index.ts (barrel)`);
