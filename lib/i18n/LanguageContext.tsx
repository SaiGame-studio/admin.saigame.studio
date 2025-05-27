'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ValidLocale, defaultLocale } from './config';

interface LanguageContextType {
  locale: ValidLocale;
  setLocale: (locale: ValidLocale) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'preferred-language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<ValidLocale>(defaultLocale);

  // Load saved language preference on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem(LANGUAGE_STORAGE_KEY) as ValidLocale;
    if (savedLocale && ['en', 'vi'].includes(savedLocale)) {
      setLocale(savedLocale);
    }
  }, []);

  // Save language preference when it changes
  const handleSetLocale = (newLocale: ValidLocale) => {
    setLocale(newLocale);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLocale);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale: handleSetLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
} 