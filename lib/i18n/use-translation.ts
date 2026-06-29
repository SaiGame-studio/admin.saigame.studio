'use client';
import { useCallback, useMemo } from 'react';
import { useLanguage } from './LanguageContext';
import { getTranslation } from './config';

type TranslationParams = Record<string, string | number | boolean | null | undefined>;

function formatTranslation(template: string, params?: TranslationParams) {
    if (!params) {
        return template;
    }

    return Object.entries(params).reduce((message, [key, value]) => {
        return message.replaceAll(`{${key}}`, value == null ? '' : String(value));
    }, template);
}

export function useTranslation() {
    const { locale } = useLanguage();
    const translations = useMemo(() => getTranslation(locale), [locale]);
    const t = useCallback((key: string, params?: TranslationParams) => {
        const keys = key.split('.');
        let value: any = translations;
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            }
            else {
                return key;
            }
        }
        return typeof value === 'string' ? formatTranslation(value, params) : key;
    }, [translations]);
    return {
        t,
        locale,
    };
}
