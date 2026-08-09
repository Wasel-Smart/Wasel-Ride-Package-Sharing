/**
 * tests/utils/sanitize.test.ts
 *
 * Unit tests for src/utils/sanitize.ts
 * Covers: URL, phone, email, search query, filename, number, JSON, markdown
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeURL,
  sanitizePhone,
  sanitizeEmail,
  sanitizeSearchQuery,
  sanitizeFilename,
  sanitizeNumber,
  safeJSONParse,
  sanitizeMarkdown,
  escapeRegExp,
} from '@/utils/sanitize';

// ── sanitizeURL ───────────────────────────────────────────────────────────────

describe('sanitizeURL()', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeURL('')).toBe('');
  });

  it('blocks javascript: protocol', () => {
    expect(sanitizeURL('javascript:alert(1)')).toBe('');
  });

  it('blocks javascript: with mixed case', () => {
    expect(sanitizeURL('JavaScript:alert(1)')).toBe('');
  });

  it('blocks data: URIs', () => {
    expect(sanitizeURL('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('blocks vbscript: protocol', () => {
    expect(sanitizeURL('vbscript:msgbox(1)')).toBe('');
  });

  it('allows https:// URLs', () => {
    const url = 'https://wasel.jo/trips';
    expect(sanitizeURL(url)).toBe(url);
  });

  it('allows http:// URLs', () => {
    const url = 'http://localhost:3000';
    expect(sanitizeURL(url)).toBe(url);
  });

  it('allows relative paths', () => {
    expect(sanitizeURL('/dashboard')).toBe('/dashboard');
  });
});

// ── sanitizePhone ─────────────────────────────────────────────────────────────

describe('sanitizePhone()', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizePhone('')).toBe('');
  });

  it('preserves + at the start', () => {
    expect(sanitizePhone('+962791234567')).toBe('+962791234567');
  });

  it('strips spaces and dashes', () => {
    expect(sanitizePhone('+962 79 123-4567')).toBe('+962791234567');
  });

  it('removes + in the middle of the number', () => {
    expect(sanitizePhone('+962+79+1234')).toBe('+962791234');
  });

  it('removes non-numeric characters except leading +', () => {
    expect(sanitizePhone('(+962) 79 abc 123')).toBe('+96279123');
  });
});

// ── sanitizeEmail ─────────────────────────────────────────────────────────────

describe('sanitizeEmail()', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeEmail('')).toBe('');
  });

  it('lowercases the email', () => {
    expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com');
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizeEmail('  user@example.com  ')).toBe('user@example.com');
  });
});

// ── sanitizeSearchQuery ───────────────────────────────────────────────────────

describe('sanitizeSearchQuery()', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeSearchQuery('')).toBe('');
  });

  it('removes angle brackets', () => {
    expect(sanitizeSearchQuery('<script>alert(1)</script>')).not.toContain('<');
    expect(sanitizeSearchQuery('<script>alert(1)</script>')).not.toContain('>');
  });

  it('normalises multiple spaces to a single space', () => {
    expect(sanitizeSearchQuery('Amman   to   Aqaba')).toBe('Amman to Aqaba');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeSearchQuery('  Amman  ')).toBe('Amman');
  });

  it('truncates to 200 characters', () => {
    const long = 'a'.repeat(300);
    expect(sanitizeSearchQuery(long).length).toBe(200);
  });
});

// ── sanitizeFilename ──────────────────────────────────────────────────────────

describe('sanitizeFilename()', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeFilename('')).toBe('');
  });

  it('replaces directory separators with underscores', () => {
    expect(sanitizeFilename('../../etc/passwd')).not.toContain('/');
    expect(sanitizeFilename('..\\windows\\system32')).not.toContain('\\');
  });

  it('replaces < > with underscores', () => {
    const result = sanitizeFilename('file<name>.txt');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('preserves valid filenames', () => {
    const result = sanitizeFilename('wasel-invoice-2024.pdf');
    expect(result).toContain('wasel');
    expect(result).toContain('.pdf');
  });

  it('truncates to 255 characters', () => {
    const long = 'a'.repeat(300) + '.txt';
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(255);
  });

  it('prefixes dot-files so they are non-hidden', () => {
    const result = sanitizeFilename('.htaccess');
    expect(result.startsWith('_')).toBe(true);
  });
});

// ── sanitizeNumber ────────────────────────────────────────────────────────────

describe('sanitizeNumber()', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeNumber('')).toBe('');
  });

  it('strips non-numeric characters', () => {
    expect(sanitizeNumber('JOD 3.50')).toBe('3.50');
  });

  it('preserves decimal point', () => {
    expect(sanitizeNumber('3.5')).toBe('3.5');
  });

  it('strips letters and symbols', () => {
    expect(sanitizeNumber('abc123def')).toBe('123');
  });
});

// ── safeJSONParse ─────────────────────────────────────────────────────────────

describe('safeJSONParse()', () => {
  it('parses valid JSON', () => {
    expect(safeJSONParse('{"a":1}', null)).toEqual({ a: 1 });
  });

  it('returns the fallback for invalid JSON', () => {
    expect(safeJSONParse('not-json', 'fallback')).toBe('fallback');
  });

  it('returns null fallback for corrupted JSON', () => {
    expect(safeJSONParse('{broken', null)).toBeNull();
  });

  it('handles arrays', () => {
    expect(safeJSONParse('[1,2,3]', [])).toEqual([1, 2, 3]);
  });
});

// ── sanitizeMarkdown ──────────────────────────────────────────────────────────

describe('sanitizeMarkdown()', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeMarkdown('')).toBe('');
  });

  it('removes javascript: links from markdown', () => {
    const md = '[Click me](javascript:alert(1))';
    expect(sanitizeMarkdown(md)).not.toContain('javascript:');
  });

  it('removes data: links from markdown', () => {
    const md = '[XSS](data:text/html,<h1>XSS</h1>)';
    expect(sanitizeMarkdown(md)).not.toContain('data:');
  });

  it('preserves safe markdown content', () => {
    const md = '**Hello** from [Wasel](https://wasel.jo)';
    expect(sanitizeMarkdown(md)).toContain('**Hello**');
    expect(sanitizeMarkdown(md)).toContain('https://wasel.jo');
  });

  it('trims whitespace', () => {
    expect(sanitizeMarkdown('  hello  ')).toBe('hello');
  });
});

// ── escapeRegExp ──────────────────────────────────────────────────────────────

describe('escapeRegExp()', () => {
  it('escapes dot so it matches only a literal dot', () => {
    const escaped = escapeRegExp('3.5');
    const re = new RegExp(escaped);
    expect(re.test('3.5')).toBe(true);
    expect(re.test('3X5')).toBe(false);
  });

  it('escapes special regex characters', () => {
    const special = '.*+?^${}()|[]\\';
    expect(() => new RegExp(escapeRegExp(special))).not.toThrow();
  });

  it('leaves plain alphanumeric strings unchanged', () => {
    expect(escapeRegExp('wasel')).toBe('wasel');
  });
});
