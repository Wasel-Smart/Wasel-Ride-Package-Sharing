import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeHTML } from '@/utils/sanitize';
import { sanitizeUserInput } from '@/utils/sanitization';

describe('sanitize functions probe', () => {
  it('probes all functions', () => {
    const tests = [
      '<script>evil()</script>',
      '"quoted"',
    ];
    for (const input of tests) {
      console.log(`${JSON.stringify(input)} →`, {
        sanitizeHTML: JSON.stringify(sanitizeHTML(input)),
        sanitizeUserInput: JSON.stringify(sanitizeUserInput(input)),
        sanitizeText: JSON.stringify(sanitizeText(input)),
      });
    }
    expect(true).toBe(true);
  });
});
