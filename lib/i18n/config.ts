import en from './translations/en.json';
import vi from './translations/vi.json';
import ja from './translations/ja.json';
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
