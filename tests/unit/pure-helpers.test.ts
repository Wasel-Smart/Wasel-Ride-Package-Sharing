/**
 * Tests for supabase/functions/make-server-0b1f4071/_shared/pure-helpers.ts
 * These pure functions have no existing test coverage.
 * We import via the $deno alias configured in vitest.config.ts.
 */
import { describe, it, expect } from 'vitest';
import {
  parseWalletRoute,
  parseEntityRoute,
  formatDate,
  formatTime,
  toIsoFromUnix,
  sanitizePlainText,
  normalizeProviderStatus,
  isSuccessfulProviderStatus,
  isFailedProviderStatus,
  isWebhookRoute,
  mapSubscriptionPlan,
} from '$deno/make-server-0b1f4071/_shared/pure-helpers.ts';

// ── parseWalletRoute ──────────────────────────────────────────────────────────

describe('parseWalletRoute', () => {
  it('parses /wallet/:userId', () => {
    const r = parseWalletRoute('/wallet/user-123');
    expect(r).not.toBeNull();
    expect(r!.userId).toBe('user-123');
    expect(r!.action).toBe('');
    expect(r!.resourceId).toBeNull();
  });

  it('parses /wallet/:userId/:action', () => {
    const r = parseWalletRoute('/wallet/user-123/topup');
    expect(r!.action).toBe('topup');
    expect(r!.resourceId).toBeNull();
  });

  it('parses /wallet/:userId/:action/:resourceId', () => {
    const r = parseWalletRoute('/wallet/user-123/transactions/tx-456');
    expect(r!.resourceId).toBe('tx-456');
  });

  it('returns null for non-wallet paths', () => {
    expect(parseWalletRoute('/trips/123')).toBeNull();
    expect(parseWalletRoute('/wallet')).toBeNull();
  });

  it('URL-decodes percent-encoded segments', () => {
    const r = parseWalletRoute('/wallet/user%20123');
    expect(r!.userId).toBe('user 123');
  });
});

// ── parseEntityRoute ──────────────────────────────────────────────────────────

describe('parseEntityRoute', () => {
  it('parses /trips/:id', () => {
    const r = parseEntityRoute('/trips/trip-999', 'trips');
    expect(r!.id).toBe('trip-999');
    expect(r!.action).toBeNull();
  });

  it('parses /trips/:id/:action', () => {
    const r = parseEntityRoute('/trips/trip-999/cancel', 'trips');
    expect(r!.action).toBe('cancel');
  });

  it('returns null for mismatched prefix', () => {
    expect(parseEntityRoute('/bookings/b-1', 'trips')).toBeNull();
  });
});

// ── formatDate ────────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formats an ISO date string to YYYY-MM-DD', () => {
    expect(formatDate('2026-11-19T10:30:00Z')).toBe('2026-11-19');
  });

  it('returns fallback for invalid input', () => {
    expect(formatDate('not-a-date', '2000-01-01')).toBe('2000-01-01');
  });

  it('uses today as default fallback', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(formatDate(null)).toBe(today);
  });
});

// ── formatTime ────────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('passes already-valid HH:MM strings', () => {
    expect(formatTime('09:30')).toBe('09:30');
    expect(formatTime('23:59')).toBe('23:59');
  });

  it('extracts HH:MM from ISO datetime', () => {
    const result = formatTime('2026-11-19T14:35:00Z');
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('returns 08:00 for invalid input', () => {
    expect(formatTime(null)).toBe('08:00');
    expect(formatTime('not-a-time')).toBe('08:00');
  });
});

// ── toIsoFromUnix ─────────────────────────────────────────────────────────────

describe('toIsoFromUnix', () => {
  it('converts a unix timestamp to ISO string', () => {
    const result = toIsoFromUnix(1700000000);
    expect(result).toContain('2023-');
  });

  it('returns null for 0 or negative', () => {
    expect(toIsoFromUnix(0)).toBeNull();
    expect(toIsoFromUnix(-1)).toBeNull();
  });

  it('returns null for non-finite values', () => {
    expect(toIsoFromUnix(NaN)).toBeNull();
    expect(toIsoFromUnix(Infinity)).toBeNull();
  });
});

// ── sanitizePlainText ─────────────────────────────────────────────────────────

describe('sanitizePlainText', () => {
  it('strips HTML tags', () => {
    expect(sanitizePlainText('<b>hello</b>')).toBe('hello');
    expect(sanitizePlainText('<script>alert(1)</script>')).not.toContain('<script>');
  });

  it('removes javascript: protocol', () => {
    expect(sanitizePlainText('javascript:alert(1)')).not.toContain('javascript:');
  });

  it('removes data: protocol', () => {
    expect(sanitizePlainText('data:text/html,<h1>x</h1>')).not.toContain('data:');
  });

  it('trims and collapses whitespace', () => {
    expect(sanitizePlainText('  hello   world  ')).toBe('hello world');
  });

  it('truncates to maxLength', () => {
    const result = sanitizePlainText('a'.repeat(600), 100);
    expect(result.length).toBe(100);
  });

  it('handles null/undefined gracefully', () => {
    expect(sanitizePlainText(null)).toBe('');
    expect(sanitizePlainText(undefined)).toBe('');
  });
});

// ── normalizeProviderStatus ───────────────────────────────────────────────────

describe('normalizeProviderStatus', () => {
  it('lowercases and replaces spaces/dashes with underscores', () => {
    expect(normalizeProviderStatus('Payment Failed')).toBe('payment_failed');
    expect(normalizeProviderStatus('SUCCEEDED')).toBe('succeeded');
    expect(normalizeProviderStatus('in-progress')).toBe('in_progress');
  });

  it('handles null', () => expect(normalizeProviderStatus(null)).toBe(''));
});

// ── isSuccessfulProviderStatus ────────────────────────────────────────────────

describe('isSuccessfulProviderStatus', () => {
  const successes = ['success', 'succeeded', 'paid', 'posted', 'completed', 'complete', 'approved', 'verified'];
  for (const s of successes) {
    it(`recognizes "${s}"`, () => expect(isSuccessfulProviderStatus(s)).toBe(true));
  }

  it('returns false for a failure status', () => {
    expect(isSuccessfulProviderStatus('failed')).toBe(false);
  });
});

// ── isFailedProviderStatus ────────────────────────────────────────────────────

describe('isFailedProviderStatus', () => {
  const failures = ['failed', 'failure', 'rejected', 'declined', 'cancelled', 'canceled', 'expired'];
  for (const f of failures) {
    it(`recognizes "${f}"`, () => expect(isFailedProviderStatus(f)).toBe(true));
  }

  it('returns false for success status', () => {
    expect(isFailedProviderStatus('succeeded')).toBe(false);
  });
});

// ── isWebhookRoute ────────────────────────────────────────────────────────────

describe('isWebhookRoute', () => {
  it('recognizes /stripe/webhook', () => expect(isWebhookRoute('/stripe/webhook')).toBe(true));
  it('recognizes /payments/webhooks/cliq', () => expect(isWebhookRoute('/payments/webhooks/cliq')).toBe(true));
  it('recognizes /v1/payments/webhooks/cliq (strips /v1 prefix)', () => {
    expect(isWebhookRoute('/v1/payments/webhooks/cliq')).toBe(true);
  });
  it('returns false for non-webhook routes', () => {
    expect(isWebhookRoute('/trips/123')).toBe(false);
  });
});

// ── mapSubscriptionPlan ───────────────────────────────────────────────────────

describe('mapSubscriptionPlan', () => {
  it('maps "enterprise" plans', () => {
    expect(mapSubscriptionPlan('Enterprise Annual')).toBe('enterprise');
    expect(mapSubscriptionPlan('ENTERPRISE')).toBe('enterprise');
  });

  it('maps "basic" / "starter" plans', () => {
    expect(mapSubscriptionPlan('Basic Monthly')).toBe('basic');
    expect(mapSubscriptionPlan('starter')).toBe('basic');
  });

  it('maps everything else to premium', () => {
    expect(mapSubscriptionPlan('pro')).toBe('premium');
    expect(mapSubscriptionPlan('')).toBe('premium');
  });
});
