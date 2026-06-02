/**
 * Critical Integration Tests
 * Tests for CSRF protection, secure storage, and API security
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getCSRFToken, addCSRFHeader, validateCSRFToken, clearCSRFToken } from '@/utils/csrf';
import { secureStorage } from '@/utils/encryption';
import { validateApiUrl } from '@/utils/sanitization';

describe('CSRF Protection Integration', () => {
  beforeEach(() => {
    clearCSRFToken();
    sessionStorage.clear();
  });

  it('should generate CSRF token on initialization', () => {
    const token = getCSRFToken();
    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(20);
  });

  it('should add CSRF header to requests', () => {
    const headers = addCSRFHeader({ 'Content-Type': 'application/json' });
    expect(new Headers(headers).get('X-CSRF-Token')).toBeTruthy();
  });

  it('should preserve existing Headers entries when adding CSRF header', () => {
    const headers = addCSRFHeader(new Headers({ Authorization: 'Bearer token-123' }));
    const finalHeaders = new Headers(headers);

    expect(finalHeaders.get('Authorization')).toBe('Bearer token-123');
    expect(finalHeaders.get('X-CSRF-Token')).toBeTruthy();
  });

  it('should validate correct CSRF token', () => {
    const token = getCSRFToken();
    expect(validateCSRFToken(token)).toBe(true);
  });

  it('should reject invalid CSRF token', () => {
    getCSRFToken();
    expect(validateCSRFToken('invalid-token')).toBe(false);
  });
});

describe('Secure Storage Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('wasel_session_id', 'test-session-id');
  });

  it('should encrypt and store sensitive data', async () => {
    const sensitiveData = 'user-token-12345';
    await secureStorage.setItem('auth_token', sensitiveData);
    
    const stored = localStorage.getItem('secure_auth_token');
    expect(stored).toBeTruthy();
    expect(stored).not.toContain(sensitiveData);
  });

  it('should decrypt stored data correctly', async () => {
    const originalData = 'sensitive-information';
    await secureStorage.setItem('test_key', originalData);
    
    const retrieved = await secureStorage.getItem('test_key');
    expect(retrieved).toBe(originalData);
  });

   it('should clear all secure storage', async () => {
     await secureStorage.setItem('key1', 'value1');
     await secureStorage.setItem('key2', 'value2');
     
     console.log('LocalStorage before clear:', Object.keys(localStorage));
     secureStorage.clear();
     console.log('LocalStorage after clear:', Object.keys(localStorage));
     
     const retrieved1 = await secureStorage.getItem('key1');
     const retrieved2 = await secureStorage.getItem('key2');
     
     expect(retrieved1).toBeNull();
     expect(retrieved2).toBeNull();
   });
});

describe('SSRF Protection Integration', () => {
  const allowedDomains = ['supabase.co', 'wasel14.online', 'localhost'];

  it('should allow valid API URLs', () => {
    expect(validateApiUrl('https://api.supabase.co/rest/v1', allowedDomains)).toBe(true);
    expect(validateApiUrl('https://wasel14.online/api', allowedDomains)).toBe(true);
    expect(validateApiUrl('http://localhost:3000/api', allowedDomains)).toBe(true);
  });

  it('should reject malicious URLs', () => {
    expect(validateApiUrl('https://evil.com/api', allowedDomains)).toBe(false);
    expect(validateApiUrl('http://192.168.1.1/admin', allowedDomains)).toBe(false);
    expect(validateApiUrl('file:///etc/passwd', allowedDomains)).toBe(false);
  });

  it('should reject URLs with suspicious patterns', () => {
    expect(validateApiUrl('https://supabase.co.evil.com', allowedDomains)).toBe(false);
  });

  it('should handle malformed URLs', () => {
    expect(validateApiUrl('not-a-url', allowedDomains)).toBe(false);
    expect(validateApiUrl('', allowedDomains)).toBe(false);
  });
});

describe('API Request Security Integration', () => {
  it('should include CSRF token in POST requests', () => {
    const headers = addCSRFHeader({});
    expect(new Headers(headers).get('X-CSRF-Token')).toBeTruthy();
  });

  it('should validate URLs before making requests', () => {
    const validUrl = 'https://api.supabase.co/rest/v1/users';
    const invalidUrl = 'https://evil.com/steal-data';
    
    expect(validateApiUrl(validUrl, ['supabase.co'])).toBe(true);
    expect(validateApiUrl(invalidUrl, ['supabase.co'])).toBe(false);
  });

  it('should combine CSRF and URL validation', () => {
    const url = 'https://api.supabase.co/rest/v1/users';
    const headers = addCSRFHeader({ 'Content-Type': 'application/json' });

    expect(validateApiUrl(url, ['supabase.co'])).toBe(true);
    expect(new Headers(headers).get('X-CSRF-Token')).toBeTruthy();
  });
});
