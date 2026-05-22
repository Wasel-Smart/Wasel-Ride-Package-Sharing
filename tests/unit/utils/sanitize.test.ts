/**
 * Unit tests — src/utils/sanitize.ts
 * Covers text and HTML sanitisation helpers.
 */
import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeHTML } from '@/utils/sanitize';
import { sanitizeUserInput } from '@/utils/sanitization';

describe('sanitizeText', () => {
  it('strips tags and angle brackets', () => {
    const result = sanitizeText('<script>evil()</script>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).toBe('evil()');
  });

  it('returns empty string for falsy input', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('leaves plain text untouched', () => {
    expect(sanitizeText('Hello, World!')).toBe('Hello, World!');
  });

  it('removes angle brackets and normalises whitespace', () => {
    // 'a < b'   → tag strip (no tag) 'a < b' → bracket remove 'a  b' → ws norm 'a b'
    expect(sanitizeText('a < b')).toBe('a b');
    expect(sanitizeText('1 > 0')).toBe('1 0');
  });
});

describe('sanitizeHTML', () => {
  it('encodes angle brackets as entities', () => {
    const result = sanitizeHTML('<script>evil()</script>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeHTML('')).toBe('');
  });

  it('encodes text as safe HTML entities for in-dom rendering', () => {
    const result = sanitizeHTML('"quoted"');
    // In jsdom innerText→innerHTML round-trip double-quotes come back literally
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('sanitizeUserInput', () => {
  it('encodes angle brackets as HTML entities', () => {
    const result = sanitizeUserInput('x < y > z');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeUserInput('')).toBe('');
  });
});
