/**
 * Unit tests — src/utils/sanitize.ts
 * Covers HTML sanitisation and text sanitisation helpers.
 */
import { describe, it, expect } from 'vitest';
import { sanitizeText } from '@/utils/sanitize';

describe('sanitizeText', () => {
  it('replaces < and > with HTML entities', () => {
    const result = sanitizeText('<script>evil()</script>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
  });

  it('returns empty string for falsy input', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('leaves plain text untouched', () => {
    expect(sanitizeText('Hello, World!')).toBe('Hello, World!');
  });

  it('escapes double quotes', () => {
    expect(sanitizeText('"quoted"')).toContain('&quot;');
  });
});
