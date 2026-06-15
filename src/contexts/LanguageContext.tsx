import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { translations, type Language } from '../locales/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
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
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('wasel-language');
      return (saved === 'ar' ? 'ar' : 'en') as Language;
    } catch (error) {
      console.error('Failed to load language from localStorage:', error);
      return 'en';
    }
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('wasel-language', lang);
    } catch (error) {
      console.error('Failed to save language to localStorage:', error);
    }

    // Update HTML dir attribute
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  }, [language, setLanguage]);

  useEffect(() => {
    // Set initial dir attribute
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Memoized translation function
  const t = useCallback(
    (key: string): string => {
      const keys = key.split('.');
      let value: any = translations[language];

      for (const k of keys) {
        value = value?.[k];
      }

      return value || key;
    },
    [language],
  );

  const dir: LanguageContextType['dir'] = language === 'ar' ? 'rtl' : 'ltr';

  // Memoize the context value
  const value = useMemo(
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
