 
import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from 'react';
import { translations, type Language } from '../locales/translations';
import {
  formatLocaleDate,
  formatLocaleNumber,
  formatLocaleTime,
  getDirectionForLanguage,
  getInitialLanguage,
  getLocaleConfig,
  persistLanguage,
} from '../utils/locale';
import { repairLikelyMojibake } from '../utils/textEncoding';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
  locale: 'en-JO' | 'ar-JO';
  region: 'JO';
  currency: 'JOD';
  timezone: 'Asia/Amman';
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => getInitialLanguage());

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    persistLanguage(lang);

    const localeConfig = getLocaleConfig(lang);
    document.documentElement.dir = localeConfig.direction;
    document.documentElement.lang = localeConfig.locale;
    document.documentElement.dataset.locale = localeConfig.locale;
    document.documentElement.dataset.region = localeConfig.region.toLowerCase();
    document.body?.setAttribute('dir', localeConfig.direction);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  }, [language, setLanguage]);

  useEffect(() => {
    const localeConfig = getLocaleConfig(language);
    document.documentElement.dir = localeConfig.direction;
    document.documentElement.lang = localeConfig.locale;
    document.documentElement.dataset.locale = localeConfig.locale;
    document.documentElement.dataset.region = localeConfig.region.toLowerCase();
    document.body?.setAttribute('dir', localeConfig.direction);
  }, [language]);

  // Memoized translation function
  const t = useCallback((key: string): string => {
    const keys = key.split('.');
    let value: unknown = translations[language];

    for (const k of keys) {
      if (!value || typeof value !== 'object') {
        return key;
      }
      value = (value as Record<string, unknown>)[k];
    }

    return typeof value === 'string' ? repairLikelyMojibake(value) : key;
  }, [language]);

  const localeConfig = useMemo(() => getLocaleConfig(language), [language]);
  const dir: LanguageContextType['dir'] = getDirectionForLanguage(language);

  const formatNumber = useCallback<LanguageContextType['formatNumber']>(
    (value, options) => formatLocaleNumber(language, value, options),
    [language],
  );
  const formatDate = useCallback<LanguageContextType['formatDate']>(
    (value, options) => formatLocaleDate(language, value, options),
    [language],
  );
  const formatTime = useCallback<LanguageContextType['formatTime']>(
    (value, options) => formatLocaleTime(language, value, options),
    [language],
  );

  // Memoize the context value
  const value = useMemo(() => ({
    language,
    setLanguage,
    toggleLanguage,
    t,
    dir,
    locale: localeConfig.locale,
    region: localeConfig.region,
    currency: localeConfig.currency,
    timezone: localeConfig.timezone,
    formatNumber,
    formatDate,
    formatTime,
  }), [dir, formatDate, formatNumber, formatTime, language, localeConfig.currency, localeConfig.locale, localeConfig.region, localeConfig.timezone, setLanguage, t, toggleLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
