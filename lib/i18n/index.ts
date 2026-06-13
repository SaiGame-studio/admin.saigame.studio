import { en } from './translations/en';
import { vi } from './translations/vi';
export type Language = 'en' | 'vi';
export type TranslationKey = keyof typeof en;
const translations = {
    en,
    vi,
};
export const getTranslation = (key: string, lang: Language = 'en'): string => {
    const keys = key.split('.');
    let value: any = translations[lang];
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        }
        else {
            // Fallback to English if translation is missing
            value = translations.en;
            for (const fallbackKey of keys) {
                if (value && typeof value === 'object' && fallbackKey in value) {
                    value = value[fallbackKey];
                }
                else {
                    return key;
                }
            }
        }
    }
    return typeof value === 'string' ? value : key;
};
export const getAvailableLanguages = (): {
    code: Language;
    name: string;
}[] => [
    { code: 'en', name: 'English' },
    { code: 'vi', name: 'Tiếng Việt' },
];
