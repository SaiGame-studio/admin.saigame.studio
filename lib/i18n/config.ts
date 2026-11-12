import en from './translations/en.json';
import vi from './translations/vi.json';
import ja from './translations/ja.json';
import steamEn from './translations/steam/en.json';
import steamVi from './translations/steam/vi.json';
import steamJa from './translations/steam/ja.json';
export const defaultLocale = 'en';
export const locales = ['en', 'vi', 'ja'] as const;
export type ValidLocale = typeof locales[number];
export const translations = {
    en: { ...en, steam: steamEn },
    vi: { ...vi, steam: steamVi },
    ja: { ...ja, steam: steamJa },
} as const;
export const getTranslation = (locale: ValidLocale) => {
    return translations[locale];
};
