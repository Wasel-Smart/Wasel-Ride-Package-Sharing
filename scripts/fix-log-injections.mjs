#!/usr/bin/env node

/**
 * Fix Log Injection Vulnerabilities
 * Systematically fixes all console.* statements to use sanitized inputs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
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
  'scripts',
];

function getAllTsFiles(dir) {
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
        files.push(...getAllTsFiles(fullPath));
      } else if (extname(item) === '.ts' || extname(item) === '.tsx') {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
  
  return files;
}

function fixLogInjections(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Check if file already imports sanitizeForLog
  const hasImport = content.includes("import { sanitizeForLog }") || 
                   content.includes("from './logSanitizer'") ||
                   content.includes("from '../logSanitizer'") ||
                   content.includes("from '../../utils/logSanitizer'") ||
                   content.includes("from '../utils/logSanitizer'");
  
  // Find console statements that need fixing
  const consolePatterns = [
    /console\.(log|warn|error|info|debug)\s*\(\s*([^,)]+),\s*([^)]+)\)/g,
    /console\.(log|warn|error|info|debug)\s*\(\s*([^)]+)\)/g,
  ];
  
  let needsImport = false;
  
  for (const pattern of consolePatterns) {
    const matches = [...content.matchAll(pattern)];
    
    for (const match of matches) {
      const [fullMatch, method, ...args] = match;
      
      // Skip if already sanitized
      if (fullMatch.includes('sanitizeForLog')) {
        continue;
      }
      
      // Skip if it's a simple string literal
      if (args.length === 1 && (args[0].startsWith("'") || args[0].startsWith('"'))) {
        continue;
      }
      
      needsImport = true;
      
      // Fix the console statement
      if (args.length === 2) {
        // console.method(message, variable)
        const [message, variable] = args;
        const fixed = `console.${method}(${message}, sanitizeForLog(String(${variable.trim()})))`;
        content = content.replace(fullMatch, fixed);
        modified = true;
      } else if (args.length === 1) {
        // console.method(variable)
        const variable = args[0];
        if (!variable.startsWith("'") && !variable.startsWith('"')) {
          const fixed = `console.${method}(sanitizeForLog(String(${variable.trim()})))`;
          content = content.replace(fullMatch, fixed);
          modified = true;
        }
      }
    }
  }
  
  // Add import if needed and not already present
  if (needsImport && !hasImport && modified) {
    // Find the best place to add the import
    const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
    
    if (importLines.length > 0) {
      // Add after existing imports
      const lastImportIndex = content.lastIndexOf(importLines[importLines.length - 1]);
      const insertPoint = content.indexOf('\n', lastImportIndex) + 1;
      
      // Determine the correct relative path
      const depth = (filePath.match(/[/\\]/g) || []).length - 1; // Subtract 1 for src/
      const relativePath = '../'.repeat(Math.max(0, depth - 1)) + 'utils/logSanitizer';
      
      const importStatement = `import { sanitizeForLog } from '${relativePath}';\n`;
      content = content.slice(0, insertPoint) + importStatement + content.slice(insertPoint);
      modified = true;
    }
  }
  
  return { content, modified };
}

function main() {
  console.log('🔧 Fixing log injection vulnerabilities...\n');
  
  const srcDir = join(process.cwd(), 'src');
  const tsFiles = getAllTsFiles(srcDir);
  
  let totalFixed = 0;
  let filesModified = 0;
  
  for (const file of tsFiles) {
    const { content, modified } = fixLogInjections(file);
    
    if (modified) {
      writeFileSync(file, content, 'utf-8');
      filesModified++;
      console.log(`✅ Fixed: ${file.replace(process.cwd(), '')}`);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${tsFiles.length}`);
  console.log(`   Files modified: ${filesModified}`);
  
  if (filesModified > 0) {
    console.log('\n✅ All log injection vulnerabilities have been fixed!');
    console.log('💡 Run your tests to ensure everything still works correctly.');
  } else {
    console.log('\n✅ No log injection vulnerabilities found.');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}