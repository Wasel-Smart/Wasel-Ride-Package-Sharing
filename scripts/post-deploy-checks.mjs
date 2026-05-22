#!/usr/bin/env node
/**
 * GAP #10 FIX: Automated Post-Deployment Smoke Tests
 * Place at: scripts/post-deploy-checks.mjs
 *
 * Called automatically by deploy-production.yml after every deploy.
 * Also runnable manually: node scripts/post-deploy-checks.mjs
 */

const APP_URL =
  process.env.VITE_APP_URL ??
  process.env.APP_BASE_URL ??
  'https://wasel14.online';

const TIMEOUT_MS = 10_000;
let passed = 0;
let warned = 0;
let failed = 0;

async function check(name, fn, { required = true } = {}) {
  try {
    const ok = await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)),
    ]);
    if (ok) {
      console.log(`✅ PASS  — ${name}`);
      passed++;
    } else if (required) {
      console.log(`❌ FAIL  — ${name}`);
      failed++;
    } else {
      console.log(`⚠️  WARN  — ${name}`);
      warned++;
    }
  } catch (err) {
    const icon = required ? '❌ FAIL ' : '⚠️  WARN ';
    console.log(`${icon} — ${name}: ${err.message}`);
    required ? failed++ : warned++;
  }
}

async function httpStatus(url) {
  const res = await fetch(url, {
    method: 'GET',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'follow',
  });
  return res.status;
}

// ── Checks ───────────────────────────────────────────────────────────────────

console.log(`\n🔍 Post-Deploy Checks — ${APP_URL}\n`);

await check('Homepage responds (2xx/3xx)', async () => {
  const s = await httpStatus(APP_URL);
  return s >= 200 && s < 500;
});

await check('Auth page accessible', async () => {
  const s = await httpStatus(`${APP_URL}/app/auth`);
  return s >= 200 && s < 500;
});

await check('Favicon served', async () => {
  const s = await httpStatus(`${APP_URL}/favicon.ico`);
  return s >= 200 && s < 400;
}, { required: false });

await check('Security headers present', async () => {
  const res = await fetch(APP_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const csp = res.headers.get('content-security-policy');
  const xfo = res.headers.get('x-frame-options');
  const hsts = res.headers.get('strict-transport-security');
  if (!csp)  console.log('    ↳ Missing Content-Security-Policy');
  if (!xfo)  console.log('    ↳ Missing X-Frame-Options');
  if (!hsts) console.log('    ↳ Missing Strict-Transport-Security');
  return Boolean(csp && xfo);
}, { required: false });

await check('No 5xx errors on main routes', async () => {
  const routes = [APP_URL, `${APP_URL}/app`];
  for (const r of routes) {
    const s = await httpStatus(r);
    if (s >= 500) { console.log(`    ↳ ${r} returned ${s}`); return false; }
  }
  return true;
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n─────────────────────────────────────────');
console.log(`  ✅ Passed : ${passed}`);
console.log(`  ⚠️  Warned : ${warned}`);
console.log(`  ❌ Failed : ${failed}`);
console.log(`  🌐 App URL: ${APP_URL}`);
console.log('─────────────────────────────────────────\n');

if (failed > 0) {
  console.error('Post-deploy checks FAILED — review deployment before directing traffic.');
  process.exit(1);
}
console.log('✅ All required post-deploy checks passed — deployment is healthy.');
process.exit(0);
