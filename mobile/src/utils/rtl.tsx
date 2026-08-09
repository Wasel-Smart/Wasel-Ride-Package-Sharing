import React, { createContext, useContext, useMemo } from 'react';
import { I18nManager } from 'react-native';

interface RTLContextType {
  isRTL: boolean;
  language: 'en' | 'ar';
  toggleLanguage: () => void;
}

const RTLContext = createContext<RTLContextType | undefined>(undefined);

export function RTLProvider({ children }: { children: React.ReactNode }) {
  const isRTL = true;
  const language = 'ar' as const;

  const toggleLanguage = () => {
    const next = language === 'ar' ? 'en' : 'ar';
    I18nManager.forceRTL(next === 'ar');
  };

  const value = useMemo(
    () => ({ isRTL, language, toggleLanguage }),
    [language],
  );

  return <RTLContext.Provider value={value}>{children}</RTLContext.Provider>;
}

export function useRTL() {
  const ctx = useContext(RTLContext);
  if (!ctx) throw new Error('useRTL must be used within RTLProvider');
  return ctx;
}