/**
 * Sanitize Utilities — Unit Tests
 *
 * Covers: HTML sanitization, text escaping, URL sanitization,
 * phone/email normalization, search query cleaning,
 * filename sanitization, RegExp escaping, safe JSON parse, and markdown.
 *
 * Standard: XSS and injection prevention must be hermetically tested.
 */
import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  sanitizeURL,
  sanitizePhone,
  sanitizeEmail,
  sanitizeSearchQuery,
  sanitizeFilename,
  sanitizeNumber,
  escapeRegExp,
  safeJSONParse,
  sanitizeMarkdown,
} from '../../../src/utils/sanitize';

// ── 1. sanitizeText ───────────────────────────────────────────────────────────

describe('sanitizeText()', () => {
  it('escapes < character', () => {
    expect(sanitizeText('<div>')).toContain('&lt;');
    expect(sanitizeText('<div>')).not.toContain('<div>');
  });

  it('escapes > character', () => {
    expect(sanitizeText('>')).toContain('&gt;');
  });

  it('escapes double quotes', () => {
    expect(sanitizeText('"quoted"')).toContain('&quot;');
  });

  it('escapes single quotes', () => {
    expect(sanitizeText("it's fine")).toContain('&#x27;');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('leaves safe text unchanged', () => {
    expect(sanitizeText('Hello World 123')).toBe('Hello World 123');
  });

  it('handles XSS payload', () => {
    const xss = '<script>document.cookie</script>';
    const result = sanitizeText(xss);
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('handles nested HTML injection attempt', () => {
    const input = '<img src=x onerror="alert(1)">';
    const result = sanitizeText(input);
    expect(result).not.toContain('<img');
  });
});

// ── 2. sanitizeURL ────────────────────────────────────────────────────────────

describe('sanitizeURL()', () => {
  it('allows https URLs', () => {
    const url = 'https://wasel.jo/app/find-ride';
    expect(sanitizeURL(url)).toBe(url);
  });

  it('allows http URLs', () => {
    const url = 'http://localhost:3000';
    expect(sanitizeURL(url)).toBe(url);
  });

  it('blocks javascript: protocol', () => {
    expect(sanitizeURL('javascript:alert(1)')).toBe('');
  });

  it('blocks data: URIs', () => {
    expect(sanitizeURL('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('blocks vbscript: protocol', () => {
    expect(sanitizeURL('vbscript:msgbox(1)')).toBe('');
  });

  it('handles uppercase protocol variants', () => {
    expect(sanitizeURL('JAVASCRIPT:void(0)')).toBe('');
  });

  it('blocks control-character obfuscated javascript URLs', () => {
    expect(sanitizeURL('  java\nscript:alert(1)  ')).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeURL('')).toBe('');
  });
});

// ── 3. sanitizePhone ──────────────────────────────────────────────────────────

describe('sanitizePhone()', () => {
  it('keeps digits and leading +', () => {
    expect(sanitizePhone('+962791234567')).toBe('+962791234567');
  });

  it('removes spaces', () => {
    expect(sanitizePhone('+962 79 123 4567')).toBe('+962791234567');
  });

  it('removes dashes', () => {
    expect(sanitizePhone('+962-79-123-4567')).toBe('+962791234567');
  });

  it('removes parentheses', () => {
    expect(sanitizePhone('+1 (212) 555-1234')).toBe('+12125551234');
  });

  it('removes + characters in the middle', () => {
    expect(sanitizePhone('+962+79+123')).toBe('+96279123');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizePhone('')).toBe('');
  });
});

// ── 4. sanitizeEmail ──────────────────────────────────────────────────────────

describe('sanitizeEmail()', () => {
  it('converts to lowercase', () => {
    expect(sanitizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
  });

  it('trims whitespace', () => {
    expect(sanitizeEmail('  user@example.com  ')).toBe('user@example.com');
  });

  it('handles empty input', () => {
    expect(sanitizeEmail('')).toBe('');
  });

  it('does not modify an already-clean email', () => {
    expect(sanitizeEmail('nour@wasel.jo')).toBe('nour@wasel.jo');
  });
});

// ── 5. sanitizeSearchQuery ────────────────────────────────────────────────────

describe('sanitizeSearchQuery()', () => {
  it('trims whitespace', () => {
    expect(sanitizeSearchQuery('  Amman to Aqaba  ')).toBe('Amman to Aqaba');
  });

  it('removes < and > characters', () => {
    const result = sanitizeSearchQuery('<script>Amman</script>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('normalises multiple spaces to single space', () => {
    expect(sanitizeSearchQuery('Amman   to   Irbid')).toBe('Amman to Irbid');
  });

  it('truncates to 200 characters', () => {
    const long = 'A'.repeat(300);
    expect(sanitizeSearchQuery(long).length).toBeLessThanOrEqual(200);
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeSearchQuery('')).toBe('');
  });
});

// ── 6. sanitizeFilename ───────────────────────────────────────────────────────

describe('sanitizeFilename()', () => {
  it('preserves normal filenames', () => {
    const result = sanitizeFilename('profile-photo.jpg');
    expect(result).toContain('profile');
    expect(result).toContain('.jpg');
  });

  it('replaces forward slashes (path traversal prevention)', () => {
    const result = sanitizeFilename('../../etc/passwd');
    expect(result).not.toContain('/');
    expect(result).not.toContain('..');
  });

  it('replaces backslashes', () => {
    const result = sanitizeFilename('folder\\file.txt');
    expect(result).not.toContain('\\');
  });

  it('removes traversal dot runs after reconstruction', () => {
    const result = sanitizeFilename('..\\..\\secrets.env');
    expect(result).not.toContain('..');
  });

  it('limits to 255 characters', () => {
    const long = `${'A'.repeat(300)  }.txt`;
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(255);
  });

  it('handles empty input', () => {
    expect(sanitizeFilename('')).toBe('');
  });

  it('replaces leading dot to prevent hidden files', () => {
    const result = sanitizeFilename('.hidden');
    expect(result).not.toMatch(/^\./);
  });
});

// ── 7. sanitizeNumber ────────────────────────────────────────────────────────

describe('sanitizeNumber()', () => {
  it('keeps digits and decimal point', () => {
    expect(sanitizeNumber('12.50')).toBe('12.50');
  });

  it('removes currency symbols', () => {
    expect(sanitizeNumber('JOD 12.50')).toBe('12.50');
  });

  it('removes letters', () => {
    expect(sanitizeNumber('abc123')).toBe('123');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeNumber('')).toBe('');
  });
});

// ── 8. escapeRegExp ───────────────────────────────────────────────────────────

describe('escapeRegExp()', () => {
  it('escapes dots', () => {
    const escaped = escapeRegExp('wasel.jo');
    expect(new RegExp(escaped).test('waselXjo')).toBe(false);
    expect(new RegExp(escaped).test('wasel.jo')).toBe(true);
  });

  it('escapes special regex characters', () => {
    const specials = '.*+?^${}()|[]\\';
    const escaped = escapeRegExp(specials);
    expect(() => new RegExp(escaped)).not.toThrow();
  });

  it('handles empty string', () => {
    expect(escapeRegExp('')).toBe('');
  });
});

// ── 9. safeJSONParse ─────────────────────────────────────────────────────────

describe('safeJSONParse()', () => {
  it('parses valid JSON', () => {
    const result = safeJSONParse('{"key":"value"}', null);
    expect(result).toEqual({ key: 'value' });
  });

  it('returns fallback for invalid JSON', () => {
    const result = safeJSONParse('not json', 'fallback');
    expect(result).toBe('fallback');
  });

  it('returns fallback for empty string', () => {
    const result = safeJSONParse('', []);
    expect(result).toEqual([]);
  });

  it('parses arrays correctly', () => {
    const result = safeJSONParse('[1,2,3]', []);
    expect(result).toEqual([1, 2, 3]);
  });

  it('returns null fallback when JSON is broken', () => {
    const result = safeJSONParse('{broken', null);
    expect(result).toBeNull();
  });
});

// ── 10. sanitizeMarkdown ──────────────────────────────────────────────────────

describe('sanitizeMarkdown()', () => {
  it('removes javascript: links', () => {
    const input = '[click me](javascript:alert(1))';
    expect(sanitizeMarkdown(input)).not.toContain('javascript:');
  });

  it('removes data: links', () => {
    const input = '[click me](data:text/html,malicious)';
    expect(sanitizeMarkdown(input)).not.toContain('data:');
  });

  it('preserves safe markdown', () => {
    const safe = '# Title\n\nSome **bold** text and a [link](https://wasel.jo)';
    const result = sanitizeMarkdown(safe);
    expect(result).toContain('Title');
    expect(result).toContain('bold');
    expect(result).toContain('https://wasel.jo');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeMarkdown('')).toBe('');
  });

  it('trims whitespace', () => {
    expect(sanitizeMarkdown('  hello  ')).toBe('hello');
  });
});
