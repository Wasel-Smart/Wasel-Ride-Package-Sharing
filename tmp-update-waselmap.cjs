const fs = require('fs');
const path = 'src/components/WaselMap.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add MapConfig import after existing imports
const importBlock = "import { colors, typography, radii, shadows, effects, gradients } from '../styles/design-tokens';";
const mapConfigImport = "import { JORDAN_RADARS, FALLBACK_MOSQUES, MAP_CENTER, DEFAULT_ZOOM, TILE_CONFIGS } from './MapConfig';";
content = content.replace(importBlock, importBlock + '\n' + mapConfigImport);

// Replace inline TILES with TILE_CONFIGS
content = content.replace(
  /\/\* ─── Tile layer configs ─────────────────────────────────────────────── \*\/\s*const TILES = \{[\s\S]*?\} as const;\s*\/\* ─── Pre-defined data ───────────────────────────────────────────────── \*/,
  '/* ─── Tile layer configs ─────────────────────────────────────────────── */\nconst TILES = TILE_CONFIGS;\n\n/* ─── Pre-defined data ───────────────────────────────────────────────── */'
);

// Remove inline JORDAN_RADARS and FALLBACK_MOSQUES since they're imported from MapConfig
content = content.replace(
  /\/\* ─── Pre-defined data ───────────────────────────────────────────────── \*\/\s*const JORDAN_RADARS = \[[\s\S]*?\];\s*const FALLBACK_MOSQUES = \[[\s\S]*?\];\s*\/\* ─── SVG icon strings/,
  '/* ─── Pre-defined data ───────────────────────────────────────────────── */\n/* JORDAN_RADARS and FALLBACK_MOSQUES imported from MapConfig */\n\n/* ─── SVG icon strings */'
);

fs.writeFileSync(path, content);
console.log('WaselMap.tsx updated with MapConfig imports');
