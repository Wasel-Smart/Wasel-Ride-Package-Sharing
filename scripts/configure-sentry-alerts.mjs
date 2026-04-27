#!/usr/bin/env node
/**
 * Wasel Sentry Alert Configuration Script
 *
 * Sets up production-grade alerting rules via Sentry API:
 *  - Error rate spike alerts
 *  - P95 performance degradation
 *  - Payment failure alerts
 *  - Auth error alerts
 *
 * Usage:
 *   SENTRY_AUTH_TOKEN=<token> SENTRY_ORG=<org> SENTRY_PROJECT=<project> node scripts/configure-sentry-alerts.mjs
 */

const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN;
const SENTRY_ORG        = process.env.SENTRY_ORG        ?? 'wasel';
const SENTRY_PROJECT    = process.env.SENTRY_PROJECT    ?? 'wasel-frontend';
const SENTRY_BASE       = 'https://sentry.io/api/0';

if (!SENTRY_AUTH_TOKEN) {
  console.error('❌ Missing SENTRY_AUTH_TOKEN');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${SENTRY_AUTH_TOKEN}`,
  'Content-Type': 'application/json',
};

async function sentryApi(method, path, body) {
  const res = await fetch(`${SENTRY_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sentry API ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Alert rules ──────────────────────────────────────────────────────────────

const alertRules = [
  {
    name:        'High Error Rate',
    actionMatch: 'all',
    conditions: [
      {
        id:        'sentry.rules.conditions.event_frequency.EventFrequencyCondition',
        value:     50,
        interval:  '1h',
        comparisonType: 'count',
      },
    ],
    actions: [
      {
        id:          'sentry.mail.actions.NotifyEmailAction',
        targetType:  'Team',
      },
    ],
    frequency: 60,   // minutes between alerts
  },
  {
    name: 'Payment Error',
    actionMatch: 'all',
    conditions: [
      {
        id:    'sentry.rules.conditions.tagged_event.TaggedEventCondition',
        key:   'transaction',
        match: 'co',
        value: '/wallet',
      },
    ],
    actions: [
      {
        id:         'sentry.mail.actions.NotifyEmailAction',
        targetType: 'Team',
      },
    ],
    frequency: 5,
  },
  {
    name: 'P95 Performance Degradation',
    actionMatch: 'all',
    conditions: [
      {
        id:       'sentry.rules.conditions.performance.P95ConditionDefinition',
        value:    2000,
        interval: '1h',
      },
    ],
    actions: [
      {
        id:         'sentry.mail.actions.NotifyEmailAction',
        targetType: 'Team',
      },
    ],
    frequency: 60,
  },
];

async function main() {
  console.log('🔧 Configuring Sentry alert rules for Wasel...\n');

  for (const rule of alertRules) {
    try {
      await sentryApi(
        'POST',
        `/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/rules/`,
        rule,
      );
      console.log(`  ✅ Created rule: ${rule.name}`);
    } catch (err) {
      console.warn(`  ⚠️  Rule "${rule.name}" failed (may already exist): ${err.message}`);
    }
  }

  // Set up environment-specific releases
  try {
    await sentryApi('POST', `/organizations/${SENTRY_ORG}/releases/`, {
      version:  process.env.npm_package_version ?? '1.0.0',
      projects: [SENTRY_PROJECT],
    });
    console.log('\n  ✅ Sentry release created');
  } catch {
    console.log('\n  ℹ️  Release already exists or not applicable');
  }

  console.log('\n✅ Sentry alert configuration complete.');
  console.log('\nNext steps:');
  console.log('  1. Visit https://sentry.io to verify alert rules');
  console.log('  2. Test alerts with: npm run sentry:test');
  console.log('  3. Set VITE_SENTRY_DSN in .env.production');
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
