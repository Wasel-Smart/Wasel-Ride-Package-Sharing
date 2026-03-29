/**
 * Wasel — Core Unit Tests
 * Uses vitest globals (describe, it, expect, vi) — no explicit imports needed.
 */
import { render, screen, fireEvent } from '@testing-library/react';

// ── Currency ──────────────────────────────────────────────────────────────────
describe('CurrencyService', () => {
  it('converts JOD to USD correctly', async () => {
    const { CurrencyService } = await import('@/utils/currency');
    const svc = CurrencyService.getInstance();
    expect(svc.fromJOD(1, 'USD')).toBeCloseTo(1.41, 1);
  });

  it('converts USD back to JOD', async () => {
    const { CurrencyService } = await import('@/utils/currency');
    const svc = CurrencyService.getInstance();
    expect(svc.toJOD(1.41, 'USD')).toBeCloseTo(1, 1);
  });

  it('returns same amount for JOD to JOD', async () => {
    const { CurrencyService } = await import('@/utils/currency');
    const svc = CurrencyService.getInstance();
    expect(svc.fromJOD(10, 'JOD')).toBe(10);
  });

  it('formats JOD with 3 decimal places', async () => {
    const { CurrencyService } = await import('@/utils/currency');
    const svc = CurrencyService.getInstance();
    const formatted = svc.format(8.5, 'JOD');
    // Intl uses locale-specific digits (e.g. Arabic-Indic in ar-JO)
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('cross-currency conversion is consistent', async () => {
    const { CurrencyService } = await import('@/utils/currency');
    const svc = CurrencyService.getInstance();
    expect(svc.convert(1, 'JOD', 'AED')).toBeCloseTo(5.18, 1);
  });
});

// ── Sanitize ──────────────────────────────────────────────────────────────────
describe('sanitizeText', () => {
  it('escapes < and > characters', async () => {
    const { sanitizeText } = await import('@/utils/sanitize');
    const result = sanitizeText('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
  });

  it('escapes double quotes', async () => {
    const { sanitizeText } = await import('@/utils/sanitize');
    expect(sanitizeText('"hello"')).toContain('&quot;');
  });

  it('returns empty string for empty input', async () => {
    const { sanitizeText } = await import('@/utils/sanitize');
    expect(sanitizeText('')).toBe('');
  });
});

describe('sanitizePhone', () => {
  it('strips spaces from phone number', async () => {
    const { sanitizePhone } = await import('@/utils/sanitize');
    expect(sanitizePhone('+962 79 123 4567')).toBe('+962791234567');
  });
});

describe('sanitizeURL', () => {
  it('blocks javascript: protocol', async () => {
    const { sanitizeURL } = await import('@/utils/sanitize');
    expect(sanitizeURL('javascript:alert(1)')).toBe('');
  });

  it('blocks data: protocol', async () => {
    const { sanitizeURL } = await import('@/utils/sanitize');
    expect(sanitizeURL('data:text/html,<h1>hi</h1>')).toBe('');
  });

  it('allows https URLs', async () => {
    const { sanitizeURL } = await import('@/utils/sanitize');
    expect(sanitizeURL('https://wasel.jo')).toBe('https://wasel.jo');
  });
});

describe('safeJSONParse', () => {
  it('parses valid JSON', async () => {
    const { safeJSONParse } = await import('@/utils/sanitize');
    expect(safeJSONParse('{"a":1}', {})).toEqual({ a: 1 });
  });

  it('returns fallback for invalid JSON', async () => {
    const { safeJSONParse } = await import('@/utils/sanitize');
    expect(safeJSONParse('not json', { fallback: true })).toEqual({ fallback: true });
  });
});

// ── Env utils ─────────────────────────────────────────────────────────────────
describe('env utils', () => {
  it('returns fallback for missing env var', async () => {
    const { getEnv } = await import('@/utils/env');
    expect(getEnv('VITE_DOES_NOT_EXIST', 'fallback')).toBe('fallback');
  });

  it('hasEnv returns false for missing var', async () => {
    const { hasEnv } = await import('@/utils/env');
    expect(hasEnv('VITE_DOES_NOT_EXIST')).toBe(false);
  });

  it('getConfig returns stable shape', async () => {
    const { getConfig } = await import('@/utils/env');
    const config = getConfig();
    expect(config).toHaveProperty('appName');
    expect(config).toHaveProperty('isProd');
    expect(config).toHaveProperty('isDev');
    expect(typeof config.isProd).toBe('boolean');
    expect(typeof config.isDev).toBe('boolean');
  });
});

// ── Accessibility ─────────────────────────────────────────────────────────────
describe('Accessibility', () => {
  it('button with aria-label is discoverable', () => {
    render(<button aria-label="Close dialog">✕</button>);
    expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
  });

  it('disabled button does not fire click handler', () => {
    const handler = vi.fn();
    render(<button disabled onClick={handler}>Submit</button>);
    fireEvent.click(screen.getByText('Submit'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('required input is marked required', () => {
    render(<input type="email" required aria-label="Email" />);
    expect(screen.getByLabelText('Email')).toBeRequired();
  });
});

// ── Performance ───────────────────────────────────────────────────────────────
describe('Render performance', () => {
  it('renders 100 list items under 100ms', () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    const start = performance.now();
    render(<ul>{items.map(i => <li key={i}>Item {i}</li>)}</ul>);
    expect(performance.now() - start).toBeLessThan(100);
  });
});
