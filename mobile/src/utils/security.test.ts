import { validateEmail, validatePhone, validateJordanPhone, validateIraqPhone, sanitizeInput, sanitizeHtml } from './security';

describe('security utilities', () => {
  describe('validateEmail', () => {
    it('accepts valid emails', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.name+tag@sub.example.com')).toBe(true);
      expect(validateEmail('a@b.co')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user@.com')).toBe(false);
    });

    it('rejects null and non-string input', () => {
      expect(validateEmail(null as unknown as string)).toBe(false);
      expect(validateEmail(undefined as unknown as string)).toBe(false);
      expect(validateEmail(123 as unknown as string)).toBe(false);
    });

    it('rejects emails over 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(validateEmail(longEmail)).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('accepts valid Jordanian mobile numbers', () => {
      expect(validatePhone('+962791234567')).toBe(true);
      expect(validatePhone('+962771234567')).toBe(true);
      expect(validatePhone('+962781234567')).toBe(true);
      expect(validatePhone('+9627912345678')).toBe(false);
    });

    it('accepts valid Jordanian landline numbers', () => {
      expect(validatePhone('+96261234567')).toBe(true);
      expect(validatePhone('+96251234567')).toBe(true);
    });

    it('accepts valid Iraqi mobile numbers', () => {
      expect(validatePhone('+9647701234567')).toBe(true);
      expect(validatePhone('+9647801234567')).toBe(true);
    });

    it('rejects invalid phone numbers', () => {
      expect(validatePhone('')).toBe(false);
      expect(validatePhone('962791234567')).toBe(false);
      expect(validatePhone('+962')).toBe(false);
      expect(validatePhone('+962123')).toBe(false);
      expect(validatePhone('+966791234567')).toBe(false);
    });

    it('rejects null and non-string input', () => {
      expect(validatePhone(null as unknown as string)).toBe(false);
      expect(validatePhone(undefined as unknown as string)).toBe(false);
    });
  });

  describe('validateJordanPhone', () => {
    it('accepts valid Jordanian mobile numbers', () => {
      expect(validateJordanPhone('+962791234567')).toBe(true);
      expect(validateJordanPhone('+962771234567')).toBe(true);
      expect(validateJordanPhone('+962781234567')).toBe(true);
    });

    it('rejects non-Jordanian numbers', () => {
      expect(validateJordanPhone('+9647701234567')).toBe(false);
      expect(validateJordanPhone('+966791234567')).toBe(false);
    });

    it('rejects malformed numbers', () => {
      expect(validateJordanPhone('+96212345678')).toBe(false);
      expect(validateJordanPhone('')).toBe(false);
    });
  });

  describe('validateIraqPhone', () => {
    it('accepts valid Iraqi mobile numbers', () => {
      expect(validateIraqPhone('+9647701234567')).toBe(true);
      expect(validateIraqPhone('+9647801234567')).toBe(true);
    });

    it('rejects non-Iraqi numbers', () => {
      expect(validateIraqPhone('+962791234567')).toBe(false);
      expect(validateIraqPhone('+966791234567')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('trims whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });

    it('truncates to maxLength', () => {
      expect(sanitizeInput('a'.repeat(600), 100)).toHaveLength(100);
    });

    it('returns empty string for non-string input', () => {
      expect(sanitizeInput(null as unknown as string)).toBe('');
      expect(sanitizeInput(undefined as unknown as string)).toBe('');
    });

    it('uses default maxLength of 500', () => {
      expect(sanitizeInput('a'.repeat(600)).length).toBe(500);
    });
  });

  describe('sanitizeHtml', () => {
    it('escapes HTML special characters', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
      );
    });

    it('escapes ampersand', () => {
      expect(sanitizeHtml('a & b')).toBe('a &amp; b');
    });

    it('escapes single quotes', () => {
      expect(sanitizeHtml("it's")).toBe('it&#x27;s');
    });
  });
});
