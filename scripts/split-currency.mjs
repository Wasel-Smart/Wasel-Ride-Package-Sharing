import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const utilsDir = join(__dirname, '..', 'src', 'utils');
const currencyDir = join(utilsDir, 'currency');

mkdirSync(currencyDir, { recursive: true });

const lines = readFileSync(join(utilsDir, 'currency.ts'), 'utf-8').split('\n');

// Find section boundaries
const typesEnd = lines.findIndex(l => l.includes('export const CURRENCIES'));
const dataEnd = lines.findIndex(l => l.includes('export interface Money'));
const serviceEnd = lines.findIndex(l => l.includes('// ─── Standalone helper functions'));
const hooksStart = lines.findIndex(l => l.includes('export function useCurrency'));

console.log(`Types: 1-${typesEnd}`);
console.log(`Data: ${typesEnd}-${dataEnd}`);
console.log(`Service: ${dataEnd}-${serviceEnd}`);
console.log(`Helpers: ${serviceEnd}-${hooksStart}`);
console.log(`Hook: ${hooksStart}-end`);

// Extract types section
const typesLines = lines.slice(0, typesEnd);
writeFileSync(join(currencyDir, 'types.ts'), typesLines.join('\n') + '\n');

// Extract data section (CURRENCIES + EXCHANGE_RATES_FROM_JOD)
const dataLines = lines.slice(typesEnd, dataEnd);
writeFileSync(join(currencyDir, 'data.ts'), dataLines.join('\n') + '\n');

// Extract service section (CurrencyService class)
const serviceLines = lines.slice(dataEnd, serviceEnd);
writeFileSync(join(currencyDir, 'service.ts'), serviceLines.join('\n') + '\n');

// Extract standalone helpers
const helpersLines = lines.slice(serviceEnd, hooksStart);
writeFileSync(join(currencyDir, 'helpers.ts'), helpersLines.join('\n') + '\n');

// Extract hook
const hooksLines = lines.slice(hooksStart);
writeFileSync(join(currencyDir, 'hooks.ts'), hooksLines.join('\n') + '\n');

// Create barrel index.ts
const barrel = `export type { SupportedCurrency, CurrencyConfig, Money } from './types';
export { SUPPORTED_CURRENCY_CODES, PLATFORM_CURRENCY, CURRENCIES, EXCHANGE_RATES_FROM_JOD } from './data';
export { CurrencyService } from './service';
export { formatCurrency, formatCurrencyFromJOD, getCurrencySymbol } from './helpers';
export { useCurrency } from './hooks';
`;

writeFileSync(join(currencyDir, 'index.ts'), barrel);

console.log('\n✓ Split currency.ts:');
console.log('  - types.ts');
console.log('  - data.ts');
console.log('  - service.ts');
console.log('  - helpers.ts');
console.log('  - hooks.ts');
console.log('  - index.ts (barrel)');
