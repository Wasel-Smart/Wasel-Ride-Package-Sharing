#!/usr/bin/env node
/**
 * OAuth Configuration Verification Script
 * Validates that Google and Facebook OAuth are properly configured
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const REQUIRED_ENV_VARS = {
  client: [
    'VITE_GOOGLE_CLIENT_ID',
    'VITE_FACEBOOK_APP_ID',
    'VITE_AUTH_CALLBACK_PATH',
  ],
  server: [
    'SUPABASE_AUTH_GOOGLE_CLIENT_ID',
    'SUPABASE_AUTH_GOOGLE_CLIENT_SECRET',
    'SUPABASE_AUTH_FACEBOOK_CLIENT_ID',
    'SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET',
  ],
};

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function checkEnvFile() {
  log('\n📋 Checking .env file...', 'cyan');
  
  const envPath = join(process.cwd(), '.env');
  
  if (!existsSync(envPath)) {
    log('❌ .env file not found', 'red');
    log('   Create .env from .env.example', 'yellow');
    return false;
  }
  
  log('✅ .env file exists', 'green');
  
  const envContent = readFileSync(envPath, 'utf-8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  });
  
  let allValid = true;
  
  log('\n🔍 Checking client-side OAuth variables:', 'cyan');
  REQUIRED_ENV_VARS.client.forEach(varName => {
    const value = envVars[varName];
    const isSet = value && value !== '' && !value.startsWith('your-');
    
    if (isSet) {
      log(`✅ ${varName}`, 'green');
    } else {
      log(`❌ ${varName} - Not configured`, 'red');
      allValid = false;
    }
  });
  
  log('\n🔒 Checking server-side OAuth secrets:', 'cyan');
  REQUIRED_ENV_VARS.server.forEach(varName => {
    const value = envVars[varName];
    const isSet = value && value !== '' && !value.startsWith('your-');
    
    if (isSet) {
      log(`✅ ${varName}`, 'green');
    } else {
      log(`❌ ${varName} - Not configured`, 'red');
      allValid = false;
    }
  });
  
  return allValid;
}

function checkSupabaseConfig() {
  log('\n📋 Checking Supabase config.toml...', 'cyan');
  
  const configPath = join(process.cwd(), 'supabase', 'config.toml');
  
  if (!existsSync(configPath)) {
    log('❌ supabase/config.toml not found', 'red');
    return false;
  }
  
  log('✅ config.toml exists', 'green');
  
  const configContent = readFileSync(configPath, 'utf-8');
  
  const hasGoogleConfig = configContent.includes('[auth.external.google]');
  const hasFacebookConfig = configContent.includes('[auth.external.facebook]');
  const googleEnabled = configContent.match(/\[auth\.external\.google\][^[]*enabled\s*=\s*true/);
  const facebookEnabled = configContent.match(/\[auth\.external\.facebook\][^[]*enabled\s*=\s*true/);
  
  log('\n🔍 Checking OAuth provider configuration:', 'cyan');
  
  if (hasGoogleConfig && googleEnabled) {
    log('✅ Google OAuth enabled', 'green');
  } else if (hasGoogleConfig) {
    log('⚠️  Google OAuth configured but not enabled', 'yellow');
  } else {
    log('❌ Google OAuth not configured', 'red');
  }
  
  if (hasFacebookConfig && facebookEnabled) {
    log('✅ Facebook OAuth enabled', 'green');
  } else if (hasFacebookConfig) {
    log('⚠️  Facebook OAuth configured but not enabled', 'yellow');
  } else {
    log('❌ Facebook OAuth not configured', 'red');
  }
  
  return (hasGoogleConfig && googleEnabled) || (hasFacebookConfig && facebookEnabled);
}

function checkAuthFiles() {
  log('\n📋 Checking authentication files...', 'cyan');
  
  const files = [
    'src/contexts/AuthContext.tsx',
    'src/pages/WaselAuth.tsx',
    'src/utils/oauthErrors.ts',
    'docs/oauth-setup-guide.md',
  ];
  
  let allExist = true;
  
  files.forEach(file => {
    const filePath = join(process.cwd(), file);
    if (existsSync(filePath)) {
      log(`✅ ${file}`, 'green');
    } else {
      log(`❌ ${file} - Missing`, 'red');
      allExist = false;
    }
  });
  
  return allExist;
}

function checkOAuthImplementation() {
  log('\n📋 Checking OAuth implementation...', 'cyan');
  
  const authContextPath = join(process.cwd(), 'src/contexts/AuthContext.tsx');
  
  if (!existsSync(authContextPath)) {
    log('❌ AuthContext.tsx not found', 'red');
    return false;
  }
  
  const authContent = readFileSync(authContextPath, 'utf-8');
  
  const hasGoogleMethod = authContent.includes('signInWithGoogle');
  const hasFacebookMethod = authContent.includes('signInWithFacebook');
  const hasOAuthHelper = authContent.includes('signInWithOAuthProvider');
  const hasErrorHandling = authContent.includes('parseOAuthError') || authContent.includes('handleOAuthError');
  
  if (hasGoogleMethod) {
    log('✅ Google sign-in method implemented', 'green');
  } else {
    log('❌ Google sign-in method missing', 'red');
  }
  
  if (hasFacebookMethod) {
    log('✅ Facebook sign-in method implemented', 'green');
  } else {
    log('❌ Facebook sign-in method missing', 'red');
  }
  
  if (hasOAuthHelper) {
    log('✅ OAuth helper function present', 'green');
  } else {
    log('❌ OAuth helper function missing', 'red');
  }
  
  if (hasErrorHandling) {
    log('✅ Enhanced OAuth error handling present', 'green');
  } else {
    log('⚠️  Basic error handling only', 'yellow');
  }
  
  return hasGoogleMethod && hasFacebookMethod && hasOAuthHelper;
}

function printSummary(results) {
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 OAuth Configuration Summary', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const allPassed = Object.values(results).every(r => r);
  
  Object.entries(results).forEach(([check, passed]) => {
    const status = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`${status} ${check}`, color);
  });
  
  log('\n' + '='.repeat(60), 'cyan');
  
  if (allPassed) {
    log('🎉 All OAuth checks passed!', 'green');
    log('   Your OAuth configuration is ready for use.', 'green');
    log('\n📚 Next steps:', 'cyan');
    log('   1. Start your dev server: npm run dev', 'blue');
    log('   2. Test Google sign-in at /auth', 'blue');
    log('   3. Test Facebook sign-in at /auth', 'blue');
    log('   4. Run OAuth tests: npm run test:e2e:oauth', 'blue');
  } else {
    log('⚠️  Some OAuth checks failed', 'yellow');
    log('   Review the errors above and fix configuration.', 'yellow');
    log('\n📚 Resources:', 'cyan');
    log('   • Setup guide: docs/oauth-setup-guide.md', 'blue');
    log('   • Environment example: .env.example', 'blue');
    log('   • Supabase config: supabase/config.toml', 'blue');
  }
  
  log('='.repeat(60) + '\n', 'cyan');
  
  return allPassed;
}

function main() {
  log('\n🔐 Wasel OAuth Configuration Verification', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');
  
  const results = {
    'Environment Variables': checkEnvFile(),
    'Supabase Configuration': checkSupabaseConfig(),
    'Authentication Files': checkAuthFiles(),
    'OAuth Implementation': checkOAuthImplementation(),
  };
  
  const allPassed = printSummary(results);
  
  process.exit(allPassed ? 0 : 1);
}

main();
