/**
 * Security Headers & Configuration
 * Version: 1.2.0
 *
 * Implements security best practices:
 * - Content Security Policy (CSP) — env-aware
 * - Client-side request throttling hints
 * - Strong password requirements
 * - Server-verified 2FA flows
 */

import { API_URL, fetchWithRetry, getAuthDetails } from '@/services/core';
import { getConfig } from '@/utils/env';
import { logger } from '@/utils/monitoring';

const IS_DEV = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'development';

export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    ...(IS_DEV ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
    'https://js.stripe.com',
    'https://maps.googleapis.com',
  ],
  'style-src': IS_DEV
    ? ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']
    : ["'self'", 'https://fonts.googleapis.com'],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https:',
    'https://*.supabase.co',
    'https://images.unsplash.com',
    'https://api.qrserver.com',
  ],
  'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'wss://*.sentry.io',
    'https://api.stripe.com',
    'https://maps.googleapis.com',
    'https://*.sentry.io',
    ...(IS_DEV ? ['ws://localhost:*', 'http://localhost:*'] : []),
  ],
  'frame-src': ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
};

export function getCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([key, values]) => `${key} ${values.join(' ')}`.trim())
    .join('; ');
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60_000 },
): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return true;
  }

  record.count += 1;

  if (record.count > config.maxRequests) {
    logger.warning('Rate limit exceeded', { key, count: record.count, limit: config.maxRequests });
    return false;
  }

  return true;
}

export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

let _rateLimitCleanupInterval: ReturnType<typeof setInterval> | undefined;

if (typeof setInterval !== 'undefined' && !_rateLimitCleanupInterval) {
  _rateLimitCleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetAt) {
          rateLimitStore.delete(key);
        }
      }
    },
    5 * 60 * 1000,
  );
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  feedback: string[];
  isValid: boolean;
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const criteria = [
    { test: (p: string) => p.length >= 8, feedback: 'Password must be at least 8 characters' },
    { test: (p: string) => p.length >= 12, feedback: 'Great! Over 12 characters' },
    { test: (p: string) => /[a-z]/.test(p), feedback: 'Add lowercase letters' },
    { test: (p: string) => /[A-Z]/.test(p), feedback: 'Add uppercase letters' },
    { test: (p: string) => /[0-9]/.test(p), feedback: 'Add numbers' },
    {
      test: (p: string) => /[!@#$%^&*()_+\-={}[\];':"\\|,.<>/?]/.test(p),
      feedback: 'Add special characters',
    },
  ];

  const weaknesses = [
    {
      test: (p: string) => !/password|123456|qwerty|admin/i.test(p),
      feedback: 'Avoid common patterns',
    },
    { test: (p: string) => !/(.)\1{2,}/.test(p), feedback: 'Avoid repeating characters' },
  ];

  let score = 0;
  const feedback: string[] = [];

  criteria.forEach(c => {
    if (c.test(password)) {
      score++;
    } else {
      feedback.push(c.feedback);
    }
  });

  weaknesses.forEach(w => {
    if (!w.test(password)) {
      score = Math.max(0, score - 1);
      feedback.push(w.feedback);
    }
  });

  const finalScore = Math.min(4, Math.floor(score / 2)) as 0 | 1 | 2 | 3 | 4;
  const isValid = finalScore >= 3 && password.length >= 8;

  return { score: finalScore, feedback, isValid };
}

export function getPasswordStrengthLabel(score: number): string {
  return ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][score] ?? 'Very Weak';
}

export function getPasswordStrengthColor(score: number): string {
  return ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#10b981'][score] ?? '#ef4444';
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

async function getAuthenticatedHeaders(): Promise<HeadersInit> {
  const { token } = await getAuthDetails();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function callTwoFactorEndpoint<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  if (!isTwoFactorAvailable()) {
    throw new Error('Two-factor authentication is not enabled for this environment.');
  }

  const response = await fetchWithRetry(`${API_URL}${path}`, {
    method: 'POST',
    headers: await getAuthenticatedHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string'
        ? payload.error
        : 'Two-factor authentication request failed.',
    );
  }

  return payload as T;
}

export function isTwoFactorAvailable(): boolean {
  return getConfig().enableTwoFactorAuth && Boolean(API_URL);
}

export async function enable2FA(_userId: string): Promise<TwoFactorSetup> {
  const payload = await callTwoFactorEndpoint<{ setup: TwoFactorSetup }>('/auth/2fa/setup');
  logger.info('2FA setup started', { important: true });
  return payload.setup;
}

export async function verify2FACode(_userId: string, code: string): Promise<boolean> {
  if (!isTwoFactorAvailable()) {
    return false;
  }

  try {
    const payload = await callTwoFactorEndpoint<{ valid: boolean }>('/auth/2fa/verify', { code });
    return payload.valid === true;
  } catch (error) {
    logger.error('2FA verification failed', error);
    return false;
  }
}

export async function disable2FA(_userId: string, code: string): Promise<boolean> {
  if (!isTwoFactorAvailable()) {
    return false;
  }

  try {
    const payload = await callTwoFactorEndpoint<{ disabled: boolean }>('/auth/2fa/disable', {
      code,
    });
    if (payload.disabled) {
      logger.info('2FA disabled', { important: true });
    }
    return payload.disabled === true;
  } catch (error) {
    logger.error('2FA disable failed', error);
    return false;
  }
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone: string): boolean {
  // Supports Jordan (+962) and Iraq (+964) in E.164 format
  return /^\+[1-9]\d{1,14}$/.test(phone);
}

export function validateIraqPhone(phone: string): boolean {
  // Iraqi mobile: +9647xxxxxxxxx (10 digits after country code)
  // Iraqi landline: +96401xxxxxxxx or +96402xxxxxxxx etc.
  return /^\+964[0-9]{9,10}$/.test(phone);
}

export function validateJordanPhone(phone: string): boolean {
  // Jordanian mobile: +9627xxxxxxxx (8 digits after country code)
  return /^\+962[0-9]{8,9}$/.test(phone);
}

export function validateURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const Security = {
  CSP_DIRECTIVES,
  getCSPHeader,
  checkRateLimit,
  resetRateLimit,
  checkPasswordStrength,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
  enable2FA,
  isTwoFactorAvailable,
  verify2FACode,
  disable2FA,
  sanitizeInput,
  validateEmail,
  validatePhone,
  validateURL,
};

export default Security;
