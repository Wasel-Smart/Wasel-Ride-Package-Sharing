const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/utils/regionConfig.ts');
const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

const countries = {
  jo: { start: 105, end: 284, name: 'JORDAN' },
  eg: { start: 288, end: 502, name: 'EGYPT' },
  sa: { start: 503, end: 651, name: 'SAUDI_ARABIA' },
  ae: { start: 652, end: 784, name: 'UAE' },
  kw: { start: 785, end: 869, name: 'KUWAIT' },
  bh: { start: 870, end: 938, name: 'BAHRAIN' },
  qa: { start: 939, end: 1023, name: 'QATAR' },
  om: { start: 1024, end: 1108, name: 'OMAN' },
  lb: { start: 1109, end: 1209, name: 'LEBANON' },
  ps: { start: 1210, end: 1278, name: 'PALESTINE' },
  ma: { start: 1279, end: 1395, name: 'MOROCCO' },
  tn: { start: 1396, end: 1496, name: 'TUNISIA' },
  iq: { start: 1497, end: 1578, name: 'IRAQ' },
};

for (const [code, config] of Object.entries(countries)) {
  const block = lines.slice(config.start - 1, config.end).join('\n');
  const content = `import type { RegionConfig } from '../types';\n\nexport const ${config.name}: RegionConfig = ${block.split('=').slice(1).join('=').trim()}`;
  
  // Actually, let me just extract the raw object
  const rawBlock = lines.slice(config.start - 1, config.end);
  const firstLine = rawBlock[0];
  const lastLine = rawBlock[rawBlock.length - 1];
  
  // Find the opening brace
  const braceIndex = firstLine.indexOf('= {');
  const prefix = firstLine.substring(0, braceIndex + 1);
  
  const fileContent = `import type { RegionConfig } from '../types';\n\nexport const ${config.name}: RegionConfig = ${rawBlock.slice(1).join('\n')}`;
  const outPath = path.join(__dirname, 'src/utils/regionConfig/countries', `${code}.ts`);
  fs.writeFileSync(outPath, fileContent);
  console.log(`Created ${code}.ts`);
}

console.log('Done');
