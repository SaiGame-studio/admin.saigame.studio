'use client';

import { useLanguage } from './LanguageContext';
import { getTranslation } from './config';

export function useTranslation() {
  const { locale } = useLanguage();
  const translations = getTranslation(locale);

  return {
    t: (key: string) => {
      const keys = key.split('.');
      let value: any = translations;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return key;
        }
      }
      
      return value;
    },
    locale
  };
} 