/**
 * Security Utilities Test Suite
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkPasswordStrength,
  getPasswordStrengthLabel,
  validateEmail,
  validatePhone,
  validateURL,
  sanitizeInput,
  checkRateLimit,
  resetRateLimit,
} from '@/utils/security';

describe('Password Strength', () => {
  it('should reject weak passwords', () => {
    const result = checkPasswordStrength('123');
    expect(result.isValid).toBe(false);
    expect(result.score).toBeLessThan(3);
  });

  it('should accept strong passwords', () => {
    const result = checkPasswordStrength('MyP@ssw0rd123!');
    expect(result.isValid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  it('should detect common patterns', () => {
    const result = checkPasswordStrength('password123');
    expect(result.feedback).toContain('Avoid common patterns');
  });

  it('should require minimum length', () => {
    const result = checkPasswordStrength('Ab1!');
    expect(result.feedback).toContain('Password must be at least 8 characters');
  });

  it('should provide correct strength labels', () => {
    expect(getPasswordStrengthLabel(0)).toBe('Very Weak');
    expect(getPasswordStrengthLabel(2)).toBe('Fair');
    expect(getPasswordStrengthLabel(4)).toBe('Very Strong');
  });
});

describe('Input Validation', () => {
  it('should validate correct email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.user+tag@domain.co.uk')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
  });

  it('should validate international phone numbers', () => {
    expect(validatePhone('+962791234567')).toBe(true);
    expect(validatePhone('+14155551234')).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(validatePhone('1234567')).toBe(false);
    expect(validatePhone('invalid')).toBe(false);
  });

  it('should validate URLs', () => {
    expect(validateURL('https://example.com')).toBe(true);
    expect(validateURL('http://localhost:3000')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(validateURL('not-a-url')).toBe(false);
    expect(validateURL('javascript:alert(1)')).toBe(false);
  });
});

describe('Input Sanitization', () => {
  it('should sanitize HTML special characters', () => {
    const input = '<script>alert("XSS")</script>';
    const sanitized = sanitizeInput(input);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('&lt;script&gt;');
  });

  it('should handle quotes and apostrophes', () => {
    const input = `"Hello" and 'World'`;
    const sanitized = sanitizeInput(input);
    expect(sanitized).toContain('&quot;');
    expect(sanitized).toContain('&#x27;');
  });
});

describe('Rate Limiting', () => {
  beforeEach(() => {
    resetRateLimit('test-key');
  });

  it('should allow requests within limit', () => {
    const config = { maxRequests: 3, windowMs: 1000 };
    
    expect(checkRateLimit('test-key', config)).toBe(true);
    expect(checkRateLimit('test-key', config)).toBe(true);
    expect(checkRateLimit('test-key', config)).toBe(true);
  });

  it('should block requests exceeding limit', () => {
    const config = { maxRequests: 2, windowMs: 1000 };
    
    checkRateLimit('test-key', config);
    checkRateLimit('test-key', config);
    
    expect(checkRateLimit('test-key', config)).toBe(false);
  });

  it('should reset after time window', async () => {
    const config = { maxRequests: 1, windowMs: 100 };
    
    checkRateLimit('test-key', config);
    expect(checkRateLimit('test-key', config)).toBe(false);
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(checkRateLimit('test-key', config)).toBe(true);
  });
});
