#!/usr/bin/env node

/**
 * Wiring Verification Script
 * Validates all frontend-backend connection points
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function checkmark() {
  return `${COLORS.green}✓${COLORS.reset}`;
}

function crossmark() {
  return `${COLORS.red}✗${COLORS.reset}`;
}

function warning() {
  return `${COLORS.yellow}⚠${COLORS.reset}`;
}

// Check if file exists and contains expected content
function checkFile(path, checks = []) {
  try {
    const content = readFileSync(join(rootDir, path), 'utf-8');
    const results = checks.map(check => ({
      name: check.name,
      passed: check.test(content),
      message: check.message,
    }));
    return { exists: true, content, results };
  } catch {
    return { exists: false, results: [] };
  }
}

// Verification checks
const checks = {
  viteConfig: () => {
    log('\n📦 Checking Vite Configuration...', 'cyan');
    const result = checkFile('vite.config.ts', [
      {
        name: 'Port 5173',
        test: content => content.includes('port: 5173'),
        message: 'Dev server port matches Supabase auth callback',
      },
      {
        name: 'Strict Port Disabled',
        test: content => content.includes('strictPort: false'),
        message: 'Allows fallback to alternative port if 5173 is busy',
      },
    ]);

    if (!result.exists) {
      log(`${crossmark()} vite.config.ts not found`, 'red');
      return false;
    }

    let allPassed = true;
    result.results.forEach(check => {
      if (check.passed) {
        log(`  ${checkmark()} ${check.name}: ${check.message}`, 'green');
      } else {
        log(`  ${crossmark()} ${check.name}: ${check.message}`, 'red');
        allPassed = false;
      }
    });

    return allPassed;
  },

  supabaseConfig: () => {
    log('\n🔐 Checking Supabase Configuration...', 'cyan');
    const result = checkFile('supabase/config.toml', [
      {
        name: 'Auth Site URL',
        test: content => content.includes('site_url = "http://localhost:5173"'),
        message: 'Auth callback URL configured correctly',
      },
      {
        name: 'Google OAuth',
        test: content => content.includes('[auth.external.google]'),
        message: 'Google OAuth provider configured',
      },
      {
        name: 'Facebook OAuth',
        test: content => content.includes('[auth.external.facebook]'),
        message: 'Facebook OAuth provider configured',
      },
    ]);

    if (!result.exists) {
      log(`${crossmark()} supabase/config.toml not found`, 'red');
      return false;
    }

    let allPassed = true;
    result.results.forEach(check => {
      if (check.passed) {
        log(`  ${checkmark()} ${check.name}: ${check.message}`, 'green');
      } else {
        log(`  ${crossmark()} ${check.name}: ${check.message}`, 'red');
        allPassed = false;
      }
    });

    return allPassed;
  },

  healthCheck: () => {
    log('\n🏥 Checking Health Check Implementation...', 'cyan');
    const result = checkFile('src/utils/healthCheck.ts', [
      {
        name: 'Health Check Function',
        test: content => content.includes('performHealthCheck'),
        message: 'Health check function implemented',
      },
      {
        name: 'Backend Verification',
        test: content => content.includes('verifyBackendConnection'),
        message: 'Backend connection verification available',
      },
      {
        name: 'Monitoring',
        test: content => content.includes('startHealthCheckMonitoring'),
        message: 'Periodic health monitoring implemented',
      },
    ]);

    if (!result.exists) {
      log(`${crossmark()} src/utils/healthCheck.ts not found`, 'red');
      return false;
    }

    let allPassed = true;
    result.results.forEach(check => {
      if (check.passed) {
        log(`  ${checkmark()} ${check.name}: ${check.message}`, 'green');
      } else {
        log(`  ${crossmark()} ${check.name}: ${check.message}`, 'red');
        allPassed = false;
      }
    });

    return allPassed;
  },

  edgeFunctionConfig: () => {
    log('\n⚡ Checking Edge Function Configuration...', 'cyan');
    const result = checkFile('src/utils/edgeFunctionConfig.ts', [
      {
        name: 'Edge Function Config',
        test: content => content.includes('WASEL_EDGE_FUNCTION'),
        message: 'Edge function configuration defined',
      },
      {
        name: 'Versioning',
        test: content => content.includes('version:'),
        message: 'Edge function versioning implemented',
      },
      {
        name: 'URL Builder',
        test: content => content.includes('buildEdgeFunctionUrl'),
        message: 'Edge function URL builder available',
      },
    ]);

    if (!result.exists) {
      log(`${crossmark()} src/utils/edgeFunctionConfig.ts not found`, 'red');
      return false;
    }

    let allPassed = true;
    result.results.forEach(check => {
      if (check.passed) {
        log(`  ${checkmark()} ${check.name}: ${check.message}`, 'green');
      } else {
        log(`  ${crossmark()} ${check.name}: ${check.message}`, 'red');
        allPassed = false;
      }
    });

    return allPassed;
  },

  fallbackStrategy: () => {
    log('\n🔄 Checking Fallback Strategy...', 'cyan');
    const result = checkFile('src/utils/fallbackStrategy.ts', [
      {
        name: 'Fallback Config',
        test: content => content.includes('getFallbackConfig'),
        message: 'Fallback configuration function defined',
      },
      {
        name: 'Fallback Validation',
        test: content => content.includes('isFallbackAllowed'),
        message: 'Fallback permission checking implemented',
      },
      {
        name: 'Fallback Logging',
        test: content => content.includes('logFallbackUsage'),
        message: 'Fallback usage logging available',
      },
    ]);

    if (!result.exists) {
      log(`${crossmark()} src/utils/fallbackStrategy.ts not found`, 'red');
      return false;
    }

    let allPassed = true;
    result.results.forEach(check => {
      if (check.passed) {
        log(`  ${checkmark()} ${check.name}: ${check.message}`, 'green');
      } else {
        log(`  ${crossmark()} ${check.name}: ${check.message}`, 'red');
        allPassed = false;
      }
    });

    return allPassed;
  },

  dockerCompose: () => {
    log('\n🐳 Checking Docker Configuration...', 'cyan');
    const prodResult = checkFile('docker-compose.yml', [
      {
        name: 'Production Service',
        test: content => content.includes('wasel-web'),
        message: 'Production web service defined',
      },
      {
        name: 'Health Check',
        test: content => content.includes('healthcheck:'),
        message: 'Container health check configured',
      },
    ]);

    const devResult = checkFile('docker-compose.dev.yml', [
      {
        name: 'Development Stack',
        test: content => content.includes('supabase-db'),
        message: 'Full Supabase stack for development',
      },
      {
        name: 'Hot Reload',
        test: content => content.includes('wasel-web-dev'),
        message: 'Development container with hot reload',
      },
    ]);

    let allPassed = true;

    if (!prodResult.exists) {
      log(`  ${crossmark()} docker-compose.yml not found`, 'red');
      allPassed = false;
    } else {
      prodResult.results.forEach(check => {
        if (check.passed) {
          log(`  ${checkmark()} ${check.name}: ${check.message}`, 'green');
        } else {
          log(`  ${warning()} ${check.name}: ${check.message}`, 'yellow');
        }
      });
    }

    if (!devResult.exists) {
      log(`  ${warning()} docker-compose.dev.yml not found (optional)`, 'yellow');
    } else {
      devResult.results.forEach(check => {
        if (check.passed) {
          log(`  ${checkmark()} ${check.name}: ${check.message}`, 'green');
        } else {
          log(`  ${warning()} ${check.name}: ${check.message}`, 'yellow');
        }
      });
    }

    return allPassed;
  },

  mainEntry: () => {
    log('\n🚀 Checking Application Entry Point...', 'cyan');
    const result = checkFile('src/main.tsx', [
      {
        name: 'Health Check Import',
        test: content => content.includes('verifyBackendConnection'),
        message: 'Health check imported in main entry',
      },
      {
        name: 'Startup Verification',
        test: content => content.includes('verifyBackendConnection()'),
        message: 'Backend verification runs on startup',
      },
      {
        name: 'Health Monitoring',
        test: content => content.includes('startHealthCheckMonitoring'),
        message: 'Periodic health monitoring started',
      },
    ]);

    if (!result.exists) {
      log(`${crossmark()} src/main.tsx not found`, 'red');
      return false;
    }

    let allPassed = true;
    result.results.forEach(check => {
      if (check.passed) {
        log(`  ${checkmark()} ${check.name}: ${check.message}`, 'green');
      } else {
        log(`  ${crossmark()} ${check.name}: ${check.message}`, 'red');
        allPassed = false;
      }
    });

    return allPassed;
  },

  documentation: () => {
    log('\n📚 Checking Documentation...', 'cyan');
    const result = checkFile('docs/WIRING_ARCHITECTURE.md', [
      {
        name: 'Architecture Docs',
        test: content => content.includes('Application Wiring Documentation'),
        message: 'Wiring architecture documented',
      },
      {
        name: 'Connection Points',
        test: content => content.includes('Connection Points'),
        message: 'Connection points documented',
      },
      {
        name: 'Troubleshooting',
        test: content => content.includes('Troubleshooting'),
        message: 'Troubleshooting guide included',
      },
    ]);

    if (!result.exists) {
      log(`  ${warning()} docs/WIRING_ARCHITECTURE.md not found`, 'yellow');
      return true; // Non-critical
    }

    result.results.forEach(check => {
      if (check.passed) {
        log(`  ${checkmark()} ${check.name}: ${check.message}`, 'green');
      } else {
        log(`  ${warning()} ${check.name}: ${check.message}`, 'yellow');
      }
    });

    return true;
  },
};

// Run all checks
async function main() {
  log('\n╔════════════════════════════════════════════════════════╗', 'blue');
  log('║        Wasel Application Wiring Verification          ║', 'blue');
  log('╚════════════════════════════════════════════════════════╝', 'blue');

  const results = {
    viteConfig: checks.viteConfig(),
    supabaseConfig: checks.supabaseConfig(),
    healthCheck: checks.healthCheck(),
    edgeFunctionConfig: checks.edgeFunctionConfig(),
    fallbackStrategy: checks.fallbackStrategy(),
    dockerCompose: checks.dockerCompose(),
    mainEntry: checks.mainEntry(),
    documentation: checks.documentation(),
  };

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  log('\n' + '═'.repeat(60), 'blue');
  log(`\n📊 Results: ${passed}/${total} checks passed\n`, 'cyan');

  if (passed === total) {
    log(`${checkmark()} All wiring checks passed! Application is properly wired.`, 'green');
    process.exit(0);
  } else {
    log(`${crossmark()} Some wiring checks failed. Review the output above.`, 'red');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Verification script failed:', error);
  process.exit(1);
});
