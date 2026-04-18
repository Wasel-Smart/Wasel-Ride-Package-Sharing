#!/usr/bin/env node

/**
 * FIND A RIDE SERVICE - COMPLETION SCRIPT
 * Automates the remaining refactoring work to unify design system
 */

const fs = require('fs');
const path = require('path');

const WASEL_REPLACEMENTS = [
  // Replace NEURAL_COLORS with WASEL.colors
  { from: /NEURAL_COLORS\.primary\[100\]/g, to: 'WASEL.colors.border' },
  { from: /NEURAL_COLORS\.primary\[200\]/g, to: 'WASEL.colors.borderStrong' },
  { from: /NEURAL_COLORS\.primary\[300\]/g, to: 'WASEL.colors.cyan' },
  { from: /NEURAL_COLORS\.primary\[500\]/g, to: 'WASEL.colors.cyan' },
  { from: /NEURAL_COLORS\.primary\[700\]/g, to: 'WASEL.colors.text' },
  { from: /NEURAL_COLORS\.neutral\[200\]/g, to: 'WASEL.colors.border' },
  { from: /NEURAL_COLORS\.neutral\[500\]/g, to: 'WASEL.colors.textMuted' },
  { from: /NEURAL_COLORS\.neutral\[600\]/g, to: 'WASEL.colors.textSecondary' },
  { from: /NEURAL_COLORS\.neutral\[700\]/g, to: 'WASEL.colors.text' },
  
  // Replace SPACING with WASEL.spacing
  { from: /SPACING\[(\d+)\]/g, to: 'WASEL.spacing[$1]' },
  
  // Replace TYPOGRAPHY with WASEL
  { from: /TYPOGRAPHY\.fontSize\.xs\[0\]/g, to: 'WASEL.fontSize.xs' },
  { from: /TYPOGRAPHY\.fontSize\.sm\[0\]/g, to: 'WASEL.fontSize.sm' },
  { from: /TYPOGRAPHY\.fontSize\.base\[0\]/g, to: 'WASEL.fontSize.base' },
  { from: /TYPOGRAPHY\.fontSize\.lg\[0\]/g, to: 'WASEL.fontSize.lg' },
  { from: /TYPOGRAPHY\.fontWeight\.bold/g, to: 'WASEL.fontWeight.bold' },
  { from: /TYPOGRAPHY\.fontWeight\.black/g, to: 'WASEL.fontWeight.black' },
  { from: /TYPOGRAPHY\.fontWeight\.medium/g, to: 'WASEL.fontWeight.medium' },
  { from: /TYPOGRAPHY\.fontFamily\.sans\.join\(', '\)/g, to: 'WASEL.fonts.sans' },
  { from: /TYPOGRAPHY\.fontFamily\.display\.join\(', '\)/g, to: 'WASEL.fonts.display' },
  
  // Replace SHADOWS with WASEL.shadows
  { from: /SHADOWS\.lg/g, to: 'WASEL.shadows.lg' },
  { from: /SHADOWS\.md/g, to: 'WASEL.shadows.md' },
  { from: /SHADOWS\.sm/g, to: 'WASEL.shadows.sm' },
  
  // Replace RADIUS with WASEL.radius
  { from: /RADIUS\.xl/g, to: 'WASEL.radius.xl' },
  { from: /RADIUS\['2xl'\]/g, to: 'WASEL.radius[\'2xl\']' },
  { from: /RADIUS\['3xl'\]/g, to: 'WASEL.radius[\'3xl\']' },
];

const files = [
  'src/features/rides/components/FindRideRideTab.tsx',
  'src/features/rides/components/AdvancedFindRideCard.tsx',
  'src/features/rides/components/FindRideCard.tsx',
  'src/features/rides/components/FindRidePackagePanel.tsx',
  'src/features/rides/components/FindRideTripDetailModal.tsx',
];

console.log('🚀 Starting Find a Ride Service Refactoring...\n');

files.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipping ${filePath} (not found)`);
    return;
  }
  
  console.log(`📝 Processing ${filePath}...`);
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let changeCount = 0;
  
  // Apply all replacements
  WASEL_REPLACEMENTS.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      changeCount += matches.length;
      content = content.replace(from, to);
    }
  });
  
  // Update imports
  if (content.includes('advanced-design-tokens')) {
    content = content.replace(
      /import.*from.*advanced-design-tokens.*;/g,
      "import { WASEL, r, pillStyle, cardStyle } from '../../../styles/unified-design-tokens';"
    );
    changeCount++;
  }
  
  // Write back
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ Updated ${filePath} (${changeCount} changes)\n`);
});

console.log('✨ Refactoring complete!\n');
console.log('📋 Next steps:');
console.log('1. Run: npm run type-check');
console.log('2. Run: npm run test');
console.log('3. Run: npm run build');
console.log('4. Visual QA testing');
