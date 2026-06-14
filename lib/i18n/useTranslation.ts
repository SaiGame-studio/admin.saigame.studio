import { useCallback } from 'react';
import { getTranslation, ValidLocale } from './config';
export const useTranslation = (locale: ValidLocale = 'en') => {
    const t = useCallback((key: string) => {
        const keys = key.split('.');
        let value: any = getTranslation(locale);
        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            }
            else {
                return key;
            }
        }
        return value || key;
    }, [locale]);
    return { t };
};
