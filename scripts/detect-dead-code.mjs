#!/usr/bin/env node

/**
 * Dead Code Detector - Identifies unused files and exports
 */

import { execSync } from 'child_process';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join, extname } from 'path';

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.codex-landing-deploy',
  'tmp_',
  'Wdoubleme',
];

function findUnusedFiles() {
  console.log('🔍 Scanning for unused files...\n');
  
  const srcDir = join(process.cwd(), 'src');
  const allFiles = getAllFiles(srcDir);
  const tsFiles = allFiles.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
  
  console.log(`📁 Found ${tsFiles.length} TypeScript files`);
  
  // Check for files that might be unused
  const potentiallyUnused = [];
  
  for (const file of tsFiles) {
    const relativePath = file.replace(process.cwd(), '');
    
    // Skip certain files that are always needed
    if (
      relativePath.includes('/main.tsx') ||
      relativePath.includes('/App.tsx') ||
      relativePath.includes('/index.ts') ||
      relativePath.includes('.test.') ||
      relativePath.includes('.spec.')
    ) {
      continue;
    }
    
    // Simple heuristic: if file is not imported anywhere, it might be unused
    const fileName = relativePath.split('/').pop()?.replace(/\.(ts|tsx)$/, '');
    if (fileName) {
      const isImported = tsFiles.some(otherFile => {
        if (otherFile === file) return false;
        const content = readFileSync(otherFile, 'utf-8');
        return content.includes(`'${fileName}'`) || content.includes(`"${fileName}"`);
      });
      
      if (!isImported) {
        potentiallyUnused.push(relativePath);
      }
    }
  }
  
  if (potentiallyUnused.length > 0) {
    console.log('\n⚠️  Potentially unused files:');
    potentiallyUnused.forEach(file => console.log(`   ${file}`));
    console.log('\n💡 Review these files manually before removing');
  } else {
    console.log('\n✅ No obviously unused files detected');
  }
}

function getAllFiles(dir) {
  const files = [];
  
  try {
    const items = readdirSync(dir);
    
    for (const item of items) {
      if (IGNORE_PATTERNS.some(pattern => item.includes(pattern))) {
        continue;
      }
      
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
  
  return files;
}

function checkDependencies() {
  console.log('\n📦 Checking for unused dependencies...');
  
  try {
    execSync('npx depcheck --ignores="@types/*,eslint-*,prettier,vitest,playwright"', { 
      stdio: 'inherit' 
    });
  } catch (error) {
    console.log('💡 Install depcheck globally: npm install -g depcheck');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  findUnusedFiles();
  checkDependencies();
}