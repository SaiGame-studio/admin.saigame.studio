import { en } from './translations/en';
import { vi } from './translations/vi';
import { ja } from './translations/ja';
export const defaultLocale = 'en';
export const locales = ['en', 'vi', 'ja'] as const;
export type ValidLocale = typeof locales[number];
export const translations = {
    en,
    vi,
    ja,
} as const;
export const getTranslation = (locale: ValidLocale) => {
    return translations[locale];
};
