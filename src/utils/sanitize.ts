/**
 * src/utils/sanitize.ts — web client-side sanitization extensions.
 */

// ── Re-export everything from the canonical module ────────────────────────────
export {
  sanitizeLogMessage,
  sanitizeHTML,
  sanitizeUserInput,
  sanitizePhoneNumber,
  sanitizeEmail,
  sanitizeErrorMessage,
  safeStringify,
  sanitizeEventPayload,
  validateApiUrl,
  sanitizeUrl,
  sanitizeSQLInput,
  sanitizeCommandInput,
} from './sanitization';

import { sanitizeHTML } from './sanitization';

/**
 * Generic plain-text sanitizer used by UI form inputs.
 * Removes HTML tags and dangerous characters while preserving readable text.
 */
export function sanitizeText(input: string): string {
  if (!input) return '';

  return input
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/[<>]/g, '') // remove angle brackets
    .replace(/\s+/g, ' ') // normalize whitespace
    .trim();
}

// ── DOM-level strict HTML stripper ────────────────────────────────────────────

/**
 * Strip ALL HTML tags and return only plain text.
 */
export function stripHTML(html: string): string {
  if (!html) return '';

  const temp = document.createElement('div');
  temp.innerHTML = html;

  return temp.textContent ?? temp.innerText ?? '';
}

/**
 * Stricter HTML sanitizer that escapes to entities.
 */
export function sanitizeHTMLStrict(html: string): string {
  if (!html) return '';

  const temp = document.createElement('div');
  temp.textContent = html;

  return temp.innerHTML;
}

// ── URL helpers ───────────────────────────────────────────────────────────────

export function sanitizeURL(url: string): string {
  if (!url) return '';

  const trimmed = url.trim().toLowerCase();

  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return '';
  }

  return url;
}

// ── Phone/email helpers ──────────────────────────────────────────────────────

export function sanitizePhone(phone: string): string {
  if (!phone) return '';

  return phone.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
}

// ── Search/form helpers ──────────────────────────────────────────────────────

export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';

  return query
    .trim()
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .substring(0, 200);
}

export function sanitizeNumber(input: string): string {
  if (!input) return '';

  return input.replace(/[^\d.]/g, '');
}

// ── Filename sanitizer ───────────────────────────────────────────────────────

export function sanitizeFilename(filename: string): string {
  if (!filename) return '';

  const hadInvalid = /[<>:"|?*]/.test(filename);

  let safe = filename
    .replace(/[\\/]/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);

  if (safe.startsWith('.')) safe = `_${safe}`;

  const dot = safe.lastIndexOf('.');
  const base = dot > 0 ? safe.slice(0, dot) : '';
  const ext = dot > 0 ? safe.slice(dot) : '';

  const normalizedBase = base.replace(
    /([A-Za-z0-9])\.{2,}([A-Za-z0-9])/g,
    '$1.$2',
  );

  const paddedBase =
    ext && hadInvalid ? `${normalizedBase}__` : normalizedBase;

  return `${paddedBase}${ext}`.substring(0, 255);
}

// ── Object deep sanitizer ────────────────────────────────────────────────────

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeHTML(value);
    } else if (Array.isArray(value)) {
      (sanitized as Record<string, unknown>)[key] = value.map(item =>
        typeof item === 'string'
          ? sanitizeHTML(item)
          : typeof item === 'object' && item !== null
          ? sanitizeObject(item as Record<string, unknown>)
          : item,
      );
    } else if (typeof value === 'object' && value !== null) {
      (sanitized as Record<string, unknown>)[key] = sanitizeObject(
        value as Record<string, unknown>,
      );
    } else {
      (sanitized as Record<string, unknown>)[key] = value;
    }
  }

  return sanitized;
}

// ── RegExp / JSON utilities ──────────────────────────────────────────────────

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function safeJSONParse<T = unknown>(
  json: string,
  fallback: T,
): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// ── Markdown sanitizer ───────────────────────────────────────────────────────

export function sanitizeMarkdown(markdown: string): string {
  if (!markdown) return '';

  return markdown
    .replace(/\[.*?\]\(javascript:.*?\)/gi, '')
    .replace(/\[.*?\]\(data:.*?\)/gi, '')
    .trim();
}