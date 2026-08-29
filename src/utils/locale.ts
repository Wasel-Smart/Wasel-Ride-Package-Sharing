/**
 * Locale-aware formatting utilities.
 *
 * Uses the native Intl API so dates, numbers, and lists
 * automatically respect the active language direction and conventions.
 */

export function formatCurrency(amount: number, currencyCode: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currencyCode === 'JOD' ? 3 : 2,
      maximumFractionDigits: currencyCode === 'JOD' ? 3 : 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

export function formatNumber(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return String(value);
  }
}

export function formatDate(date: Date | string | number, locale: string): string {
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return String(date);
  }
}

export function formatTime(date: Date | string | number, locale: string): string {
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(d);
  } catch {
    return String(date);
  }
}

export function formatDateTime(date: Date | string | number, locale: string): string {
  return `${formatDate(date, locale)} ${formatTime(date, locale)}`.trim();
}

export function getLocale(language: 'en' | 'ar'): string {
  return language === 'ar' ? 'ar-JO' : 'en-US';
}

export function getDirection(language: 'en' | 'ar'): 'ltr' | 'rtl' {
  return language === 'ar' ? 'rtl' : 'ltr';
}
