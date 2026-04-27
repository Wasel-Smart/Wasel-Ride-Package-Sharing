#!/usr/bin/env node

/**
 * Production Build Script - Comprehensive production deployment preparation
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const REQUIRED_PROD_VARS = [
  'VITE_APP_ENV',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_PRODUCTION_APP_URL',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_SUPPORT_EMAIL',
];

const SECURITY_CHECKS = [
  { key: 'VITE_ENABLE_DEMO_DATA', expected: 'false' },
  { key: 'VITE_ENABLE_SYNTHETIC_TRIPS', expected: 'false' },
  { key: 'VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK', expected: 'false' },
];

function validateEnvironment() {
  console.log('🔍 Validating production environment...');
  
  let hasErrors = false;
  
  // Check required variables
  for (const varName of REQUIRED_PROD_VARS) {
    const value = process.env[varName];
    if (!value || value.includes('your-') || value.includes('example.com')) {
      console.log(`❌ ${varName}: Missing or contains placeholder`);
      hasErrors = true;
    }
  }
  
  // Security checks
  for (const { key, expected } of SECURITY_CHECKS) {
    const value = process.env[key];
    if (value !== expected) {
      console.log(`❌ ${key}: Should be "${expected}", got "${value}"`);
      hasErrors = true;
    }
  }
  
  // URL validation
  const appUrl = process.env.VITE_PRODUCTION_APP_URL;
  if (appUrl && !appUrl.startsWith('https://')) {
    console.log('❌ VITE_PRODUCTION_APP_URL: Must use HTTPS in production');
    hasErrors = true;
  }
  
  if (hasErrors) {
    console.log('\n❌ Environment validation failed. Fix the issues above before deploying.');
    process.exit(1);
  }
  
  console.log('✅ Environment validation passed');
}

function runSecurityAudit() {
  console.log('\n🔒 Running security audit...');
  
  try {
    execSync('npm audit --audit-level=high', { stdio: 'inherit' });
    console.log('✅ Security audit passed');
  } catch (error) {
    console.log('❌ Security audit failed. Fix vulnerabilities before deploying.');
    process.exit(1);
  }
}

function runTests() {
  console.log('\n🧪 Running tests...');
  
  try {
    execSync('npm run test:coverage', { stdio: 'inherit' });
    console.log('✅ Tests passed');
  } catch (error) {
    console.log('❌ Tests failed. Fix failing tests before deploying.');
    process.exit(1);
  }
}

function runTypeCheck() {
  console.log('\n📝 Running type check...');
  
  try {
    execSync('npm run type-check', { stdio: 'inherit' });
    console.log('✅ Type check passed');
  } catch (error) {
    console.log('❌ Type check failed. Fix type errors before deploying.');
    process.exit(1);
  }
}

function runLinting() {
  console.log('\n🔍 Running linting...');
  
  try {
    execSync('npm run lint:strict', { stdio: 'inherit' });
    console.log('✅ Linting passed');
  } catch (error) {
    console.log('❌ Linting failed. Fix linting errors before deploying.');
    process.exit(1);
  }
}

function buildApplication() {
  console.log('\n🏗️  Building application...');
  
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build completed');
  } catch (error) {
    console.log('❌ Build failed.');
    process.exit(1);
  }
}

function analyzeBundleSize() {
  console.log('\n📊 Analyzing bundle size...');
  
  const distPath = join(process.cwd(), 'dist');
  if (!existsSync(distPath)) {
    console.log('❌ Dist directory not found');
    return;
  }
  
  try {
    const { execSync } = require('child_process');
    const output = execSync('du -sh dist/', { encoding: 'utf-8' });
    const size = output.split('\t')[0];
    console.log(`📦 Total bundle size: ${size}`);
    
    // Check if bundle is too large
    const sizeNum = parseFloat(size);
    const unit = size.slice(-1);
    
    if (unit === 'M' && sizeNum > 5) {
      console.log('⚠️  Bundle size is large (>5MB). Consider optimization.');
    } else {
      console.log('✅ Bundle size is acceptable');
    }
  } catch (error) {
    console.log('💡 Bundle size analysis skipped (du command not available)');
  }
}

function generateBuildReport() {
  const buildInfo = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.VITE_APP_ENV || 'production',
    commit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    branch: process.env.VERCEL_GIT_COMMIT_REF || 'unknown',
  };
  
  const reportPath = join(process.cwd(), 'dist', 'build-info.json');
  writeFileSync(reportPath, JSON.stringify(buildInfo, null, 2));
  
  console.log('\n📋 Build report generated');
  console.log(`   Timestamp: ${buildInfo.timestamp}`);
  console.log(`   Environment: ${buildInfo.environment}`);
  console.log(`   Node: ${buildInfo.nodeVersion}`);
}

function main() {
  console.log('🚀 Starting production build process...\n');
  
  const startTime = Date.now();
  
  try {
    validateEnvironment();
    runSecurityAudit();
    runTypeCheck();
    runLinting();
    runTests();
    buildApplication();
    analyzeBundleSize();
    generateBuildReport();
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log('\n🎉 Production build completed successfully!');
    console.log(`⏱️  Total time: ${duration}s`);
    console.log('\n📦 Ready for deployment:');
    console.log('   • Upload the /dist directory to your hosting provider');
    console.log('   • Configure server to serve index.html for all routes');
    console.log('   • Enable gzip/brotli compression');
    console.log('   • Set proper cache headers for static assets');
    
  } catch (error) {
    console.log('\n❌ Production build failed');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}