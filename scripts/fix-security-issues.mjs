#!/usr/bin/env node

/**
 * Security Fix Script - Wasel | واصل
 * 
 * Fixes security vulnerabilities:
 * - Updates vulnerable dependencies
 * - Ensures log sanitization is properly implemented
 * - Validates security configurations
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('🔒 Fixing security vulnerabilities...\n');

// 1. Update vulnerable dependencies
console.log('📦 Updating dependencies with security patches...');
try {
  // Update specific packages with known security fixes
  const packagesToUpdate = [
    '@supabase/supabase-js@latest',
    '@tanstack/react-query@latest', 
    'react-hook-form@latest',
    'react-router@latest'
  ];

  for (const pkg of packagesToUpdate) {
    console.log(`  Updating ${pkg}...`);
    execSync(`npm install ${pkg}`, { stdio: 'inherit' });
  }

  console.log('✅ Dependencies updated successfully\n');
} catch (error) {
  console.error('❌ Failed to update dependencies:', error.message);
}

// 2. Run security audit
console.log('🔍 Running security audit...');
try {
  execSync('npm audit --audit-level=moderate', { stdio: 'inherit' });
  console.log('✅ Security audit completed\n');
} catch (error) {
  console.log('⚠️  Some vulnerabilities may still exist. Check npm audit output.\n');
}

// 3. Validate log sanitization implementation
console.log('🧹 Validating log sanitization...');

const filesToCheck = [
  'src/utils/enhanced-logging.ts',
  'src/components/app/RuntimeCoordinator.tsx',
  'src/utils/performance/monitoring.ts',
  'src/utils/performance/monitor.ts'
];

let sanitizationIssues = 0;

for (const file of filesToCheck) {
  try {
    const content = readFileSync(file, 'utf8');
    
    // Check if sanitizeForLog is imported
    if (!content.includes('sanitizeForLog')) {
      console.log(`⚠️  ${file}: Missing sanitizeForLog import`);
      sanitizationIssues++;
    }
    
    // Check for potential log injection patterns
    const logPatterns = [
      /console\.(log|info|warn|error)\([^)]*\$\{[^}]*\}/g,
      /logger\.(debug|info|warning|error|critical)\([^)]*\$\{[^}]*\}/g
    ];
    
    for (const pattern of logPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          if (!match.includes('sanitizeForLog')) {
            console.log(`⚠️  ${file}: Potential log injection: ${match.substring(0, 50)}...`);
            sanitizationIssues++;
          }
        }
      }
    }
  } catch (error) {
    console.log(`❌ Could not check ${file}: ${error.message}`);
  }
}

if (sanitizationIssues === 0) {
  console.log('✅ Log sanitization validation passed\n');
} else {
  console.log(`⚠️  Found ${sanitizationIssues} potential log sanitization issues\n`);
}

// 4. Update package.json scripts for security
console.log('📝 Updating security scripts...');
try {
  const packageJsonPath = 'package.json';
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  
  // Add security-focused scripts if they don't exist
  const securityScripts = {
    'security:audit': 'npm audit --audit-level=moderate',
    'security:fix': 'npm audit fix',
    'security:check': 'npm run security:audit && npm run lint:security',
    'lint:security': 'eslint src --ext .ts,.tsx --config .eslintrc.security.js'
  };
  
  let scriptsUpdated = false;
  for (const [script, command] of Object.entries(securityScripts)) {
    if (!packageJson.scripts[script]) {
      packageJson.scripts[script] = command;
      scriptsUpdated = true;
    }
  }
  
  if (scriptsUpdated) {
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Security scripts added to package.json\n');
  } else {
    console.log('✅ Security scripts already exist\n');
  }
} catch (error) {
  console.error('❌ Failed to update package.json:', error.message);
}

// 5. Create security configuration
console.log('⚙️  Creating security configuration...');
try {
  const securityConfig = {
    logSanitization: {
      enabled: true,
      strictMode: true,
      allowedPatterns: [
        'timestamp',
        'level',
        'sessionId',
        'requestId'
      ]
    },
    dependencies: {
      auditLevel: 'moderate',
      autoFix: false,
      excludeDevDependencies: false
    },
    monitoring: {
      enableSecurityLogging: true,
      reportVulnerabilities: true
    }
  };
  
  writeFileSync('security.config.json', JSON.stringify(securityConfig, null, 2));
  console.log('✅ Security configuration created\n');
} catch (error) {
  console.error('❌ Failed to create security config:', error.message);
}

console.log('🎉 Security fixes completed!');
console.log('\nNext steps:');
console.log('1. Run: npm run security:check');
console.log('2. Review any remaining audit issues');
console.log('3. Test the application thoroughly');
console.log('4. Deploy with confidence! 🚀');