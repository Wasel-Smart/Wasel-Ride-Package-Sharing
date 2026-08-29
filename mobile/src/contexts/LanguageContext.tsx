import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, Platform } from 'react-native';
import { useTranslation, type TranslationKey } from '../utils/i18n';

interface LanguageContextValue {
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
  t: (key: TranslationKey, replacements?: Record<string, string | number>) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
const LANGUAGE_STORAGE_KEY = 'wasel-language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<'en' | 'ar'>('ar');

  const value = useTranslation(language);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then(stored => {
      if (active && (stored === 'en' || stored === 'ar')) setLanguage(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const isRTL = language === 'ar';
    I18nManager.allowRTL(true);
    if (I18nManager.isRTL !== isRTL) I18nManager.forceRTL(isRTL);

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    }
  }, [language]);

  const updateLanguage = useCallback((nextLanguage: 'en' | 'ar') => {
    setLanguage(nextLanguage);
    void AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }, []);

  return (
    <LanguageContext.Provider value={{ ...value, language, setLanguage: updateLanguage, isRTL: language === 'ar' }}>
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
