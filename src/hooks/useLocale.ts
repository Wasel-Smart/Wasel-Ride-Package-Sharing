import { useCallback, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export function useLocale() {
  const { language } = useLanguage();
  const locale = useMemo(() => (language === 'ar' ? 'ar-JO' : 'en-US'), [language]);
  const dir = useMemo(() => (language === 'ar' ? 'rtl' : 'ltr'), [language]);

  const formatCurrency = useCallback(
    (amount: number, currencyCode: string): string => {
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
    },
    [locale],
  );

  const formatNumber = useCallback(
    (value: number): string => {
      try {
        return new Intl.NumberFormat(locale).format(value);
      } catch {
        return String(value);
      }
    },
    [locale],
  );

  const formatDate = useCallback(
    (date: Date | string | number): string => {
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
    },
    [locale],
  );

  const formatTime = useCallback(
    (date: Date | string | number): string => {
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
    },
    [locale],
  );

  return {
    language,
    locale,
    dir,
    formatCurrency,
    formatNumber,
    formatDate,
    formatTime,
  };
}
