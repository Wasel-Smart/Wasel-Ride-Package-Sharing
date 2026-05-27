import * as React from 'react';
import { translations } from '../locales/translations';
import { normalizeTextTree } from '../utils/textEncoding';

type Language = 'en' | 'ar';
const normalizedTranslations = normalizeTextTree(translations);

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);

// Context hook exports are intentional for provider ergonomics.
// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => {
  const context = React.useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = React.useState<Language>('en');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = window.localStorage.getItem('wasel-language');
      if (saved === 'ar') {
        setLanguageState('ar');
      }
    } catch {
      // Ignore storage failures in private mode or restricted browsers.
    }
  }, []);

  const persistLanguage = React.useCallback((lang: Language) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('wasel-language', lang);
      } catch {
        // Ignore storage failures in private mode.
      }

      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  }, []);

  const setLanguage = React.useCallback(
    (lang: Language) => {
      setLanguageState(lang);
      persistLanguage(lang);
    },
    [persistLanguage],
  );

  const toggleLanguage = React.useCallback(() => {
    setLanguageState(prev => {
      const next = prev === 'ar' ? 'en' : 'ar';
      persistLanguage(next);
      return next;
    });
  }, [persistLanguage]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    }
  }, [language]);

  // Memoized translation function
  const t = React.useCallback(
    (key: string): string => {
      const keys = key.split('.');
      let value: unknown = normalizedTranslations[language];

      for (const k of keys) {
        if (typeof value !== 'object' || value === null) {
          return key;
        }
        value = (value as Record<string, unknown>)[k];
      }

      return typeof value === 'string' ? value : key;
    },
    [language],
  );

  const dir: LanguageContextType['dir'] = language === 'ar' ? 'rtl' : 'ltr';

  // Memoize the context value
  const value = React.useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
      dir,
    }),
    [language, setLanguage, toggleLanguage, t, dir],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
