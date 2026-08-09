import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation, type TranslationKey } from '../utils/i18n';

interface LanguageContextValue {
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
  t: (key: TranslationKey, replacements?: Record<string, string | number>) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<'en' | 'ar'>('ar');

  const value = useTranslation(language);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ ...value, language, setLanguage, isRTL: language === 'ar' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  const fallback = useTranslation('ar');
  
  if (!context) {
    return { ...fallback, language: 'ar' as const, setLanguage: () => {}, isRTL: true };
  }
  return { ...context };
}
