/**
 * tests/utils/sanitization-extended.test.ts
 *
 * Unit tests for src/utils/sanitization.ts
 * Covers: validateApiUrl, sanitizeLogMessage, sanitizeFilename, sanitizeArabicText,
 * isValidPersonName, sanitizeTrackingId, safeJSONParse, escapeRegExp, and more
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeEventPayload,
  validateApiUrl,
  sanitizeLogMessage,
  sanitizeFilename,
  sanitizeArabicText,
  isValidPersonName,
  sanitizeTrackingId,
  safeJSONParse,
  escapeRegExp,
} from '@/utils/sanitization';

describe('sanitizeString()', () => {
  it('removes control characters', () => {
    expect(sanitizeString('hello\x00world\x1f')).toBe('helloworld');
  });

  it('removes DEL character (127)', () => {
    expect(sanitizeString('hello\x7fworld')).toBe('helloworld');
  });

  it('preserves printable ASCII', () => {
    expect(sanitizeString('Hello World 123!@#$')).toBe('Hello World 123!@#$');
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeString(null as unknown as string)).toBe('');
    expect(sanitizeString(undefined as unknown as string)).toBe('');
    expect(sanitizeString(123 as unknown as string)).toBe('');
  });
});

describe('sanitizeEventPayload()', () => {
  it('sanitizes nested string values recursively', () => {
    const payload = { name: 'test\x00value', nested: { deep: 'bad\x7f' } };
    const result = sanitizeEventPayload(payload);
    expect(result.name).toBe('testvalue');
    expect((result.nested as Record<string, string>).deep).toBe('bad');
  });

  it('preserves non-string values', () => {
    const payload = { count: 42, flag: true, items: [1, 2, 3] };
    const result = sanitizeEventPayload(payload);
    expect(result.count).toBe(42);
    expect(result.flag).toBe(true);
    expect(result.items).toEqual([1, 2, 3]);
  });
});

describe('validateApiUrl()', () => {
  const allowedDomains = ['wasel14.online', 'api.wasel.jo'];

  it('allows HTTPS URLs on allowed domains', () => {
    expect(validateApiUrl('https://wasel14.online/api', allowedDomains)).toBe(true);
    expect(validateApiUrl('https://api.wasel14.online/v1', allowedDomains)).toBe(true);
    expect(validateApiUrl('https://api.wasel.jo/trips', allowedDomains)).toBe(true);
  });

  it('allows localhost for development', () => {
    expect(validateApiUrl('http://localhost:3000/api', allowedDomains)).toBe(true);
    expect(validateApiUrl('http://127.0.0.1:54321/api', allowedDomains)).toBe(true);
  });

  it('blocks non-HTTPS URLs for non-localhost', () => {
    expect(validateApiUrl('http://wasel14.online/api', allowedDomains)).toBe(false);
  });

  it('blocks private IP ranges', () => {
    expect(validateApiUrl('https://10.0.0.1/api', allowedDomains)).toBe(false);
    expect(validateApiUrl('https://192.168.1.1/api', allowedDomains)).toBe(false);
    expect(validateApiUrl('https://172.16.0.1/api', allowedDomains)).toBe(false);
  });

  it('blocks unknown domains', () => {
    expect(validateApiUrl('https://evil.com/api', allowedDomains)).toBe(false);
  });

  it('returns false for invalid URLs', () => {
    expect(validateApiUrl('not-a-url', allowedDomains)).toBe(false);
  });
});

describe('sanitizeLogMessage()', () => {
  it('strips control characters and replaces newlines with spaces', () => {
    expect(sanitizeLogMessage('line1\nline2\rline3')).toBe('line1 line2 line3');
    expect(sanitizeLogMessage('tab\x00here')).toBe('tabhere');
  });

  it('handles null and undefined', () => {
    expect(sanitizeLogMessage(null)).toBe('null');
    expect(sanitizeLogMessage(undefined)).toBe('undefined');
  });

  it('trims whitespace', () => {
    expect(sanitizeLogMessage('  spaced  ')).toBe('spaced');
  });
});

describe('sanitizeFilename()', () => {
  it('blocks path traversal', () => {
    expect(sanitizeFilename('../../etc/passwd')).not.toContain('..');
    expect(sanitizeFilename('../../etc/passwd')).not.toContain('/');
  });

  it('handles dot-files', () => {
    expect(sanitizeFilename('.htaccess').startsWith('_')).toBe(true);
  });

  it('truncates long names', () => {
    const long = 'a'.repeat(300) + '.txt';
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(255);
  });
});

describe('sanitizeArabicText()', () => {
  it('preserves Arabic script', () => {
    expect(sanitizeArabicText('مرحبا')).toBe('مرحبا');
  });

  it('strips control characters', () => {
    expect(sanitizeArabicText('test\x00\x1fvalue')).toBe('testvalue');
  });

  it('strips dangerous characters', () => {
    expect(sanitizeArabicText('<script>')).not.toContain('<');
    expect(sanitizeArabicText('<script>')).not.toContain('>');
  });

  it('truncates to 500 characters', () => {
    const long = 'a'.repeat(600);
    expect(sanitizeArabicText(long).length).toBeLessThanOrEqual(500);
  });
});

describe('isValidPersonName()', () => {
  it('accepts Latin names', () => {
    expect(isValidPersonName('John Doe')).toBe(true);
  });

  it('accepts Arabic names', () => {
    expect(isValidPersonName('أحمد محمد')).toBe(true);
  });

  it('rejects names with numbers', () => {
    expect(isValidPersonName('John123')).toBe(false);
  });

  it('rejects names too short', () => {
    expect(isValidPersonName('J')).toBe(false);
  });

  it('rejects names too long', () => {
    expect(isValidPersonName('A'.repeat(81))).toBe(false);
  });
});

describe('sanitizeTrackingId()', () => {
  it('keeps only alphanumeric, hyphens, underscores', () => {
    expect(sanitizeTrackingId('ride_123-abc')).toBe('ride_123-abc');
    expect(sanitizeTrackingId('ride!@#123')).toBe('ride123');
  });
});

describe('safeJSONParse()', () => {
  it('parses valid JSON', () => {
    expect(safeJSONParse('{"a":1}', null)).toEqual({ a: 1 });
  });

  it('returns fallback for invalid JSON', () => {
    expect(safeJSONParse('not-json', 'fallback')).toBe('fallback');
  });
});

describe('escapeRegExp()', () => {
  it('escapes special regex characters', () => {
    const escaped = escapeRegExp('3.5+?');
    expect(() => new RegExp(escaped)).not.toThrow();
    expect(new RegExp(escaped).test('3.5+?')).toBe(true);
  });

  it('leaves plain alphanumeric strings unchanged', () => {
    expect(escapeRegExp('wasel')).toBe('wasel');
  });
});
