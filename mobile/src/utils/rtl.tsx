import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface RTLContextType {
  isRTL: boolean;
  language: 'en' | 'ar';
  toggleLanguage: () => void;
}

const RTLContext = createContext<RTLContextType | undefined>(undefined);

export function RTLProvider({ children }: { children: React.ReactNode }) {
  const { isRTL, language, setLanguage } = useLanguage();

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  }, [language, setLanguage]);

  const value = useMemo(
    () => ({ isRTL, language, toggleLanguage }),
    [isRTL, language, toggleLanguage],
  );

  return <RTLContext.Provider value={value}>{children}</RTLContext.Provider>;
}

export function useRTL() {
  const ctx = useContext(RTLContext);
  if (!ctx) throw new Error('useRTL must be used within RTLProvider');
  return ctx;
}
