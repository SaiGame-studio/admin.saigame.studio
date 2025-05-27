import { en } from './translations/en';
import { vi } from './translations/vi';

export const defaultLocale = 'en';
export const locales = ['en', 'vi'] as const;
export type ValidLocale = typeof locales[number];

export const translations = {
  en,
  vi,
} as const;

export const getTranslation = (locale: ValidLocale) => {
  return translations[locale];
}; 