/**
 * scripts/validate-cliq-config.mjs
 *
 * Validates CliQ (JoPACC) webhook configuration before deployment.
 * The CliQ webhook amount unit must be explicitly set to 'jod' or 'fils'
 * after confirming against an actual signed sandbox payload.
 * Until then, amount-less or unrecognized values remain uncredited.
 */

const errors = [];
const warnings = [];
const passed = [];
const strict = process.argv.includes('--strict');

function fail(msg) { errors.push(`  ✗ ${msg}`); }
function warn(msg) { warnings.push(`  ⚠ ${msg}`); }
function pass(msg) { passed.push(`  ✓ ${msg}`); }

// Validate only variables supplied by the caller (CI/deployment environment).
// Never read local dotenv files here: they may contain production credentials.
const getEnvValue = (key) => process.env[key]?.trim() || null;
const amountUnit = getEnvValue('CLIQ_WEBHOOK_AMOUNT_UNIT');

console.log('\n[CliQ Configuration Validation]');

// 1. CLIQ_WEBHOOK_AMOUNT_UNIT must be explicitly set
if (!amountUnit) {
  const message = 'CLIQ_WEBHOOK_AMOUNT_UNIT is not set — CliQ webhook amount conversion will fail closed.';
  if (strict) {
    fail(message);
    fail('Set it to "jod" or "fils" after confirming against an actual signed CliQ sandbox payload.');
  } else {
    warn(`${message} Use --strict to require it in a deployment environment.`);
  }
} else if (amountUnit === 'jod' || amountUnit === 'fils') {
  pass(`CLIQ_WEBHOOK_AMOUNT_UNIT=${amountUnit} is valid.`);
  warn('  Confirm this unit matches the actual CliQ sandbox payload format before enabling live top-ups.');
} else {
  fail(`CLIQ_WEBHOOK_AMOUNT_UNIT="${amountUnit}" is invalid — must be "jod" or "fils".`);
}

// 2. CliQ webhook endpoint must be configured
const cliqWebhookUrl = getEnvValue('CLIQ_WEBHOOK_URL');
if (!cliqWebhookUrl) {
  warn('CLIQ_WEBHOOK_URL is not set — CliQ callbacks cannot be routed.');
} else {
  try {
    const url = new URL(cliqWebhookUrl);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
      fail('CLIQ_WEBHOOK_URL must be a valid HTTPS URL without embedded credentials.');
    } else {
      pass('CLIQ_WEBHOOK_URL is configured.');
    }
  } catch {
    fail('CLIQ_WEBHOOK_URL must be a valid HTTPS URL.');
  }
}

// 3. CliQ alias must be configured
const cliqAlias = getEnvValue('CLIQ_ALIAS');
if (!cliqAlias) {
  warn('CLIQ_ALIAS is not set — CliQ deep links and QR payloads will use defaults.');
} else {
  pass(`CLIQ_ALIAS is configured.`);
}

// Summary
console.log('\n' + '─'.repeat(50));
console.log('CLIQ CONFIGURATION SUMMARY');
console.log('─'.repeat(50));

if (passed.length) {
  console.log(`\n✅ Passed (${passed.length}):`);
  passed.forEach(m => console.log(m));
}
if (warnings.length) {
  console.log(`\n⚠️  Warnings (${warnings.length}):`);
  warnings.forEach(m => console.log(m));
}
if (errors.length) {
  console.log(`\n❌ Errors (${errors.length}):`);
  errors.forEach(m => console.log(m));
}

console.log('\n' + '─'.repeat(50));

const blocked = errors.length > 0;
if (blocked) {
  console.log('\n🚫 CLIQ CONFIGURATION BLOCKED — resolve errors before enabling CliQ payments.\n');
  process.exit(1);
} else {
  console.log('\n✅ CLIQ CONFIGURATION OK.\n');
  process.exit(0);
}
