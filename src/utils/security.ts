/**
 * Security Headers & Configuration
 * Version: 1.0.0
 * 
 * Implements security best practices:
 * - Content Security Policy (CSP)
 * - Rate Limiting
 * - Strong Password Requirements
 * - 2FA Support
 */

import { supabase } from '@/utils/supabase/client';
import { logger } from '@/utils/monitoring';

// ── Content Security Policy ─────────────────────────────────────────────────
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Vite dev mode
    "'unsafe-eval'", // Required for Vite dev mode
    'https://cdn.jsdelivr.net',
    'https://unpkg.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for Tailwind
    'https://fonts.googleapis.com',
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https:',
    'https://*.supabase.co',
    'https://images.unsplash.com',
  ],
  'font-src': [
    "'self'",
    'data:',
    'https://fonts.gstatic.com',
  ],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://api.stripe.com',
    'https://api.unsplash.com',
  ],
  'frame-src': [
    "'self'",
    'https://js.stripe.com',
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
};

export function getCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

// ── Rate Limiting ────────────────────────────────────────────────────────────

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }
): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  // No record or expired - allow request
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return true;
  }
  
  // Increment count
  record.count++;
  
  // Check if limit exceeded
  if (record.count > config.maxRequests) {
    logger.warning('Rate limit exceeded', {
      key,
      count: record.count,
      limit: config.maxRequests,
    });
    return false;
  }
  
  return true;
}

export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ── Password Strength ────────────────────────────────────────────────────────

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4; // 0=weak, 4=strong
  feedback: string[];
  isValid: boolean;
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;
  
  // Length check
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters');
  } else if (password.length >= 8) {
    score++;
  }
  
  if (password.length >= 12) {
    score++;
  }
  
  // Character diversity
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  if (!hasLowercase) feedback.push('Add lowercase letters');
  if (!hasUppercase) feedback.push('Add uppercase letters');
  if (!hasNumber) feedback.push('Add numbers');
  if (!hasSpecial) feedback.push('Add special characters');
  
  const diversityScore = [hasLowercase, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
  score += Math.min(diversityScore - 1, 2); // Max +2 for diversity
  
  // Common patterns
  const commonPatterns = [
    /^123456/,
    /password/i,
    /qwerty/i,
    /admin/i,
    /letmein/i,
  ];
  
  if (commonPatterns.some((pattern) => pattern.test(password))) {
    feedback.push('Avoid common patterns');
    score = Math.max(0, score - 1);
  }
  
  // Sequential characters
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('Avoid repeating characters');
    score = Math.max(0, score - 1);
  }
  
  const finalScore = Math.min(4, Math.max(0, score)) as 0 | 1 | 2 | 3 | 4;
  
  return {
    score: finalScore,
    feedback,
    isValid: finalScore >= 3 && password.length >= 8,
  };
}

export function getPasswordStrengthLabel(score: number): string {
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  return labels[score] || 'Very Weak';
}

export function getPasswordStrengthColor(score: number): string {
  const colors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#10b981'];
  return colors[score] || '#ef4444';
}

// ── Two-Factor Authentication (2FA) ──────────────────────────────────────────

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export async function enable2FA(userId: string): Promise<TwoFactorSetup> {
  try {
    // Generate TOTP secret
    const secret = generateTOTPSecret();
    
    // Generate QR code
    const qrCode = generateQRCode(secret, userId);
    
    // Generate backup codes
    const backupCodes = generateBackupCodes(10);
    
    // Save to database
    await supabase
      .from('profiles')
      .update({
        two_factor_enabled: true,
        two_factor_secret: secret,
        two_factor_backup_codes: backupCodes,
      })
      .eq('id', userId);
    
    logger.info('2FA enabled', { userId });
    
    return { secret, qrCode, backupCodes };
  } catch (error) {
    logger.error('Failed to enable 2FA', error, { userId });
    throw error;
  }
}

export async function verify2FACode(userId: string, code: string): Promise<boolean> {
  try {
    // Get user's 2FA secret
    const { data: profile } = await supabase
      .from('profiles')
      .select('two_factor_secret, two_factor_backup_codes')
      .eq('id', userId)
      .single();
    
    if (!profile) return false;
    
    // Check TOTP code
    const isValidTOTP = verifyTOTPCode(profile.two_factor_secret, code);
    
    if (isValidTOTP) {
      logger.info('2FA verified (TOTP)', { userId });
      return true;
    }
    
    // Check backup codes
    const backupCodes = profile.two_factor_backup_codes || [];
    const codeIndex = backupCodes.indexOf(code);
    
    if (codeIndex !== -1) {
      // Remove used backup code
      backupCodes.splice(codeIndex, 1);
      
      await supabase
        .from('profiles')
        .update({ two_factor_backup_codes: backupCodes })
        .eq('id', userId);
      
      logger.info('2FA verified (backup code)', { userId, remainingCodes: backupCodes.length });
      return true;
    }
    
    logger.warning('Invalid 2FA code', { userId });
    return false;
  } catch (error) {
    logger.error('2FA verification failed', error, { userId });
    return false;
  }
}

export async function disable2FA(userId: string, code: string): Promise<boolean> {
  try {
    // Verify code before disabling
    const isValid = await verify2FACode(userId, code);
    
    if (!isValid) {
      return false;
    }
    
    // Disable 2FA
    await supabase
      .from('profiles')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_backup_codes: null,
      })
      .eq('id', userId);
    
    logger.info('2FA disabled', { userId });
    return true;
  } catch (error) {
    logger.error('Failed to disable 2FA', error, { userId });
    return false;
  }
}

// ── Helper Functions ─────────────────────────────────────────────────────────

function generateTOTPSecret(): string {
  // Use crypto.getRandomValues for cryptographically secure randomness
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

function generateQRCode(secret: string, userId: string): string {
  // Generate otpauth:// URL for QR code
  const issuer = 'Wasel';
  const label = `${issuer}:${userId}`;
  const url = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
  
  // Return data URL for QR code (using a library like qrcode in production)
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
}

function generateBackupCodes(count: number): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Use crypto.getRandomValues for cryptographically secure backup codes
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
      .slice(0, 8);
    codes.push(code);
  }
  return codes;
}

function verifyTOTPCode(_secret: string, _code: string): boolean {
  // TOTP verification requires a server-side implementation (otplib).
  // Client-side TOTP verification is insecure — always delegate to the backend.
  // TODO: call POST /auth/verify-2fa with { userId, code } and return the result.
  return false;
}

// ── Security Headers for Netlify/Vercel ─────────────────────────────────────

export const SECURITY_HEADERS = `
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(self)
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: ${getCSPHeader()}
`;

// ── Input Sanitization ───────────────────────────────────────────────────────

export function sanitizeInput(input: string): string {
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Escape special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return sanitized;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  // E.164 format: +[country code][number]
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ── Export All ───────────────────────────────────────────────────────────────

export const Security = {
  CSP_DIRECTIVES,
  getCSPHeader,
  checkRateLimit,
  resetRateLimit,
  checkPasswordStrength,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
  enable2FA,
  verify2FACode,
  disable2FA,
  sanitizeInput,
  validateEmail,
  validatePhone,
  validateURL,
};

export default Security;
