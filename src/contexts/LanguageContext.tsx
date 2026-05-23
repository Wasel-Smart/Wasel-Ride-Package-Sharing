import * as React from 'react';
import { translations } from '../locales/translations';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);

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

  const setLanguage = React.useCallback((lang: Language) => {
    setLanguageState(lang);

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

  const toggleLanguage = React.useCallback(() => {
    setLanguage(prevLanguage => (prevLanguage === 'ar' ? 'en' : 'ar'));
  }, [setLanguage]);

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
      let value: unknown = translations[language];

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
