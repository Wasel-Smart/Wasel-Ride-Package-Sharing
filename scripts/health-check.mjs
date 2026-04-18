#!/usr/bin/env node

/**
 * Health Check Monitoring Script
 * 
 * Monitors application health and sends alerts if issues detected.
 * Can be run as a cron job or continuous monitoring service.
 * 
 * Usage:
 *   node scripts/health-check.mjs --url=https://wasel.jo
 *   node scripts/health-check.mjs --continuous --interval=60
 */

import https from 'https';
import http from 'http';

// Configuration
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const DEFAULT_INTERVAL = 60000; // 60 seconds
const MAX_RETRIES = 3;

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    url: process.env.VITE_APP_URL || 'http://localhost:3000',
    continuous: false,
    interval: DEFAULT_INTERVAL,
    timeout: DEFAULT_TIMEOUT,
    alertWebhook: process.env.ALERT_WEBHOOK_URL,
    alertEmail: process.env.ALERT_EMAIL,
  };

  args.forEach(arg => {
    if (arg.startsWith('--url=')) {
      config.url = arg.split('=')[1];
    } else if (arg === '--continuous') {
      config.continuous = true;
    } else if (arg.startsWith('--interval=')) {
      config.interval = parseInt(arg.split('=')[1]) * 1000;
    } else if (arg.startsWith('--timeout=')) {
      config.timeout = parseInt(arg.split('=')[1]) * 1000;
    }
  });

  return config;
}

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const req = client.request(url, {
      method: options.method || 'GET',
      timeout: options.timeout || DEFAULT_TIMEOUT,
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function checkEndpoint(url, timeout) {
  const startTime = Date.now();

  try {
    const response = await httpRequest(url, { timeout });
    const duration = Date.now() - startTime;

    return {
      success: response.statusCode >= 200 && response.statusCode < 400,
      statusCode: response.statusCode,
      duration,
      error: null,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      statusCode: 0,
      duration,
      error: error.message,
    };
  }
}

async function checkSecurityHeaders(url, timeout) {
  try {
    const response = await httpRequest(url, { timeout });
    const headers = response.headers;

    const requiredHeaders = {
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'strict-transport-security': true,
      'referrer-policy': true,
      'content-security-policy': true,
    };

    const results = {};
    for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
      const actualValue = headers[header];
      if (expectedValue === true) {
        results[header] = !!actualValue;
      } else {
        results[header] = actualValue === expectedValue;
      }
    }

    return results;
  } catch (error) {
    return null;
  }
}

async function checkSSL(url) {
  if (!url.startsWith('https://')) {
    return { valid: false, error: 'Not using HTTPS' };
  }

  try {
    await httpRequest(url, { timeout: 5000 });
    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

async function checkDNS(hostname) {
  const dns = await import('dns');
  const { promises: dnsPromises } = dns;

  try {
    const addresses = await dnsPromises.resolve4(hostname);
    return { success: true, addresses };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function sendAlert(config, message, severity = 'error') {
  log(`🚨 ALERT: ${message}`, 'red');

  // Send webhook alert
  if (config.alertWebhook) {
    try {
      await httpRequest(config.alertWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `[${severity.toUpperCase()}] Wasel Health Check Alert`,
          message,
          timestamp: new Date().toISOString(),
          url: config.url,
        }),
        timeout: 5000,
      });
      log('✓ Alert sent via webhook', 'green');
    } catch (error) {
      log(`✗ Failed to send webhook alert: ${error.message}`, 'red');
    }
  }

  // Send email alert (if configured)
  if (config.alertEmail) {
    log(`📧 Email alert would be sent to: ${config.alertEmail}`, 'yellow');
    // Implement email sending here (e.g., using SendGrid, AWS SES, etc.)
  }
}

async function performHealthCheck(config) {
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║           Wasel Health Check Monitor                      ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  const results = {
    timestamp: new Date().toISOString(),
    url: config.url,
    checks: {},
    overall: 'healthy',
  };

  // 1. Check main endpoint
  log('\n🌐 Checking main endpoint...', 'cyan');
  const mainCheck = await checkEndpoint(config.url, config.timeout);
  results.checks.main = mainCheck;

  if (mainCheck.success) {
    log(`✓ Main endpoint: ${mainCheck.statusCode} (${mainCheck.duration}ms)`, 'green');
  } else {
    log(`✗ Main endpoint failed: ${mainCheck.error}`, 'red');
    results.overall = 'unhealthy';
    await sendAlert(config, `Main endpoint is down: ${mainCheck.error}`, 'critical');
  }

  // 2. Check API health endpoint
  log('\n🔧 Checking API health...', 'cyan');
  const apiUrl = config.url.replace(/\/$/, '') + '/health';
  const apiCheck = await checkEndpoint(apiUrl, config.timeout);
  results.checks.api = apiCheck;

  if (apiCheck.success) {
    log(`✓ API health: ${apiCheck.statusCode} (${apiCheck.duration}ms)`, 'green');
  } else {
    log(`⚠️  API health check failed: ${apiCheck.error}`, 'yellow');
    results.overall = 'degraded';
  }

  // 3. Check security headers
  log('\n🔒 Checking security headers...', 'cyan');
  const securityHeaders = await checkSecurityHeaders(config.url, config.timeout);
  results.checks.securityHeaders = securityHeaders;

  if (securityHeaders) {
    let allPresent = true;
    for (const [header, present] of Object.entries(securityHeaders)) {
      if (present) {
        log(`  ✓ ${header}`, 'green');
      } else {
        log(`  ✗ ${header} missing`, 'red');
        allPresent = false;
      }
    }

    if (!allPresent) {
      log('⚠️  Some security headers are missing', 'yellow');
      results.overall = 'degraded';
    }
  } else {
    log('✗ Failed to check security headers', 'red');
  }

  // 4. Check SSL certificate
  log('\n🔐 Checking SSL certificate...', 'cyan');
  const sslCheck = await checkSSL(config.url);
  results.checks.ssl = sslCheck;

  if (sslCheck.valid) {
    log('✓ SSL certificate is valid', 'green');
  } else {
    log(`✗ SSL check failed: ${sslCheck.error}`, 'red');
    results.overall = 'unhealthy';
    await sendAlert(config, `SSL certificate issue: ${sslCheck.error}`, 'critical');
  }

  // 5. Check DNS resolution
  log('\n🌍 Checking DNS resolution...', 'cyan');
  const hostname = new URL(config.url).hostname;
  const dnsCheck = await checkDNS(hostname);
  results.checks.dns = dnsCheck;

  if (dnsCheck.success) {
    log(`✓ DNS resolved: ${dnsCheck.addresses.join(', ')}`, 'green');
  } else {
    log(`✗ DNS resolution failed: ${dnsCheck.error}`, 'red');
    results.overall = 'unhealthy';
    await sendAlert(config, `DNS resolution failed: ${dnsCheck.error}`, 'critical');
  }

  // 6. Check response time
  log('\n⏱️  Checking response time...', 'cyan');
  if (mainCheck.success) {
    if (mainCheck.duration < 500) {
      log(`✓ Response time: ${mainCheck.duration}ms (excellent)`, 'green');
    } else if (mainCheck.duration < 1000) {
      log(`✓ Response time: ${mainCheck.duration}ms (good)`, 'green');
    } else if (mainCheck.duration < 3000) {
      log(`⚠️  Response time: ${mainCheck.duration}ms (slow)`, 'yellow');
      results.overall = results.overall === 'healthy' ? 'degraded' : results.overall;
    } else {
      log(`✗ Response time: ${mainCheck.duration}ms (very slow)`, 'red');
      results.overall = 'degraded';
      await sendAlert(config, `Slow response time: ${mainCheck.duration}ms`, 'warning');
    }
  }

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('Health Check Summary:', 'cyan');
  log('='.repeat(60), 'cyan');

  const statusColor = results.overall === 'healthy' ? 'green' : 
                      results.overall === 'degraded' ? 'yellow' : 'red';
  const statusIcon = results.overall === 'healthy' ? '✅' : 
                     results.overall === 'degraded' ? '⚠️' : '❌';

  log(`\n${statusIcon} Overall Status: ${results.overall.toUpperCase()}`, statusColor);
  log(`📊 Timestamp: ${results.timestamp}`, 'cyan');
  log(`🌐 URL: ${results.url}`, 'cyan');

  if (results.overall !== 'healthy') {
    log('\n⚠️  Issues detected - review logs above for details', 'yellow');
  }

  log('');

  return results;
}

async function continuousMonitoring(config) {
  log(`🔄 Starting continuous monitoring (interval: ${config.interval / 1000}s)`, 'cyan');
  log('Press Ctrl+C to stop\n', 'yellow');

  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 3;

  while (true) {
    try {
      const results = await performHealthCheck(config);

      if (results.overall === 'unhealthy') {
        consecutiveFailures++;
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          await sendAlert(
            config,
            `Service has been unhealthy for ${consecutiveFailures} consecutive checks`,
            'critical'
          );
        }
      } else {
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          await sendAlert(config, 'Service has recovered', 'info');
        }
        consecutiveFailures = 0;
      }

      // Wait for next interval
      await new Promise(resolve => setTimeout(resolve, config.interval));
    } catch (error) {
      log(`✗ Health check error: ${error.message}`, 'red');
      consecutiveFailures++;
      await new Promise(resolve => setTimeout(resolve, config.interval));
    }
  }
}

async function main() {
  const config = parseArgs();

  if (config.continuous) {
    await continuousMonitoring(config);
  } else {
    const results = await performHealthCheck(config);
    process.exit(results.overall === 'healthy' ? 0 : 1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n\n👋 Shutting down health check monitor...', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n\n👋 Shutting down health check monitor...', 'yellow');
  process.exit(0);
});

main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
