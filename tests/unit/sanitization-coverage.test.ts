/**
 * Branch coverage for src/utils/sanitization.ts.
 * The existing sanitization-extended.test.ts covers sanitizeString and
 * sanitizeLogMessage; this file fills gaps in validateApiUrl and
 * sanitizeEventPayload.
 */
import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeEventPayload,
  validateApiUrl,
  sanitizeHtml,
  sanitizeLogMessage,
} from '../../src/utils/sanitization';

// ── sanitizeString ───────────────────────────────────────────────────────────

describe('sanitizeString', () => {
  it('removes control characters (< 32)', () => {
    expect(sanitizeString('hello\x00world')).toBe('helloworld');
    expect(sanitizeString('line1\nline2')).toBe('line1line2');
    expect(sanitizeString('tab\there')).toBe('tabhere');
  });

  it('removes DEL character (127)', () => {
    expect(sanitizeString('del\x7fchar')).toBe('delchar');
  });

  it('preserves printable ASCII', () => {
    const printable = 'Hello, World! 1234 #$%^&*()';
    expect(sanitizeString(printable)).toBe(printable);
  });

  it('preserves high-codepoint characters (Arabic)', () => {
    // sanitizeString filters only the range 0–31 and 127; Arabic codepoints are
    // above 127 and pass through unchanged.
    const arabic = 'مرحبا';
    expect(sanitizeString(arabic)).toBe(arabic);
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeString(null as unknown as string)).toBe('');
    expect(sanitizeString(42 as unknown as string)).toBe('');
  });
});

// ── sanitizeEventPayload ─────────────────────────────────────────────────────

describe('sanitizeEventPayload', () => {
  it('sanitizes string values in the payload', () => {
    const result = sanitizeEventPayload({ message: 'hello\nworld', code: 42 });
    expect(result.message).toBe('helloworld');
    expect(result.code).toBe(42);
  });

  it('recursively sanitizes nested objects', () => {
    const result = sanitizeEventPayload({ nested: { text: 'bad\x00char' } });
    expect((result.nested as Record<string, string>).text).toBe('badchar');
  });

  it('leaves non-string, non-object values untouched', () => {
    const result = sanitizeEventPayload({ count: 5, flag: true, nothing: null });
    expect(result.count).toBe(5);
    expect(result.flag).toBe(true);
    expect(result.nothing).toBeNull();
  });

  it('leaves arrays untouched (not recursed)', () => {
    const result = sanitizeEventPayload({ items: ['a\nb', 'c'] });
    expect(result.items).toEqual(['a\nb', 'c']);
  });
});

// ── validateApiUrl ───────────────────────────────────────────────────────────

describe('validateApiUrl', () => {
  const allowedDomains = ['wasel14.online', 'api.wasel14.online'];

  it('passes HTTPS URLs on allowed domains', () => {
    expect(validateApiUrl('https://wasel14.online/api', allowedDomains)).toBe(true);
  });

  it('passes HTTPS URLs on allowed subdomains', () => {
    expect(validateApiUrl('https://api.wasel14.online/v1', allowedDomains)).toBe(true);
  });

  it('rejects HTTP on non-localhost domains', () => {
    expect(validateApiUrl('http://wasel14.online/api', allowedDomains)).toBe(false);
  });

  it('allows HTTP on localhost', () => {
    expect(validateApiUrl('http://localhost:3000/api', allowedDomains)).toBe(true);
  });

  it('allows HTTP on 127.0.0.1', () => {
    expect(validateApiUrl('http://127.0.0.1:3000/api', allowedDomains)).toBe(true);
  });

  it('rejects private IP ranges', () => {
    expect(validateApiUrl('https://10.0.0.1/api', allowedDomains)).toBe(false);
    expect(validateApiUrl('https://192.168.1.1/api', allowedDomains)).toBe(false);
    expect(validateApiUrl('https://172.16.0.1/api', allowedDomains)).toBe(false);
    expect(validateApiUrl('https://169.254.1.1/api', allowedDomains)).toBe(false);
  });

  it('rejects domains not on allowlist', () => {
    expect(validateApiUrl('https://evil.com/api', allowedDomains)).toBe(false);
  });

  it('rejects an invalid URL', () => {
    expect(validateApiUrl('not-a-url', allowedDomains)).toBe(false);
  });

  it('rejects with empty allowlist', () => {
    expect(validateApiUrl('https://wasel14.online/api', [])).toBe(false);
  });
});

// ── sanitizeHtml ─────────────────────────────────────────────────────────────

describe('sanitizeHtml', () => {
  it('encodes < and > characters', () => {
    const result = sanitizeHtml('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
  });

  it('encodes double quotes', () => {
    expect(sanitizeHtml('"quoted"')).toContain('&quot;');
  });

  it('encodes ampersands', () => {
    expect(sanitizeHtml('a & b')).toContain('&amp;');
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeHtml(null as unknown as string)).toBe('');
  });

  it('preserves safe text', () => {
    expect(sanitizeHtml('Hello World')).toBe('Hello World');
  });
});

// ── sanitizeLogMessage ───────────────────────────────────────────────────────

describe('sanitizeLogMessage', () => {
  it('converts null to string "null"', () => {
    expect(sanitizeLogMessage(null)).toBe('null');
  });

  it('converts undefined to string "undefined"', () => {
    expect(sanitizeLogMessage(undefined)).toBe('undefined');
  });

  it('strips newlines and carriage returns from log messages', () => {
    const result = sanitizeLogMessage('line1\nline2\r\nline3');
    expect(result).not.toContain('\n');
    expect(result).not.toContain('\r');
  });

  it('converts numbers to their string representation', () => {
    expect(sanitizeLogMessage(42)).toBe('42');
  });

  it('serializes objects by converting via String()', () => {
    const result = sanitizeLogMessage({ key: 'value' });
    expect(typeof result).toBe('string');
    expect(result).toContain('object');
  });
});
