import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import { translations, type Language, type TranslationNode } from '../locales/translations';
import { setCurrentLang } from '../locales/tx';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
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
      return (saved === 'en' ? 'en' : 'ar') as Language;
    } catch (error) {
      console.error('Failed to load language from localStorage:', error);
      return 'ar';
    }
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);

    // Update HTML dir attribute
    setCurrentLang(lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('wasel-language', language);
    } catch (error) {
      console.error('Failed to save language to localStorage:', error);
    }
  }, [language]);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  }, [language, setLanguage]);

  useEffect(() => {
    // Set initial dir attribute
    setCurrentLang(language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Memoized translation function
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split('.');
      let value: TranslationNode | undefined = translations[language];
      for (const k of keys) {
        value = typeof value === 'object' ? value[k] : undefined;
      }
      if (typeof value === 'string') return interpolate(value, params);

      const fallbackLang = language === 'en' ? 'ar' : 'en';
      let fallback: TranslationNode | undefined = translations[fallbackLang];
      for (const k of keys) {
        fallback = typeof fallback === 'object' ? fallback[k] : undefined;
      }
      return interpolate(typeof fallback === 'string' ? fallback : key, params);
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

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (typeof template !== 'string' || !params) return template;
  return template.replace(/\{(\w+)\}/g, (_match, name: string) =>
    params[name] !== undefined ? String(params[name]) : `{${name}}`,
  );
}
