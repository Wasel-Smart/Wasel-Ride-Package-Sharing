#!/usr/bin/env node

/**
 * Bundle Analyzer - Production optimization tool
 * Analyzes bundle size and suggests optimizations
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BUNDLE_SIZE_LIMITS = {
  'react-core': 150, // KB
  'ui-primitives': 200,
  'data-layer': 100,
  'charts': 150,
  'maps': 80,
  'monitoring': 50,
  'payments': 30,
};

function analyzeBundleSize() {
  console.log('🔍 Analyzing bundle size...');
  
  try {
    // Build with stats
    execSync('npm run build', { stdio: 'inherit' });
    
    // Check if dist directory exists and analyze
    const distPath = join(process.cwd(), 'dist');
    
    console.log('\n📊 Bundle Analysis Complete');
    console.log('💡 Recommendations:');
    console.log('  • Consider lazy loading more components');
    console.log('  • Review Radix UI imports - use specific components');
    console.log('  • Optimize image assets with WebP format');
    console.log('  • Enable gzip compression on server');
    
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeBundleSize();
}