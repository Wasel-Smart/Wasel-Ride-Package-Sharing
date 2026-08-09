const fs = require('fs');
const path = 'src/components/WaselMap.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  "import { JORDAN_RADARS, FALLBACK_MOSQUES, MAP_CENTER, DEFAULT_ZOOM, TILE_CONFIGS } from './MapConfig';",
  "import { JORDAN_RADARS, FALLBACK_MOSQUES, TILE_CONFIGS } from './MapConfig';"
);
fs.writeFileSync(path, content);
console.log('Removed unused imports');
