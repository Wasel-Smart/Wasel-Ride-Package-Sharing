import { readFileSync } from 'fs';

const filePath = new URL('../src/utils/regionConfig.ts', import.meta.url);
const lines = readFileSync(filePath, 'utf-8').split('\n');

const countries = ['JORDAN', 'EGYPT', 'SAUDI_ARABIA', 'UAE', 'KUWAIT', 'BAHRAIN', 'QATAR', 'OMAN', 'LEBANON', 'PALESTINE', 'MOROCCO', 'TUNISIA', 'IRAQ'];

for (const country of countries) {
  const lineNum = lines.findIndex(l => l.includes(`const ${country}: RegionConfig`));
  if (lineNum >= 0) {
    console.log(`${country}: line ${lineNum + 1}`);
  }
}
