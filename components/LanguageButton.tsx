'use client';
import { locales, ValidLocale } from '@/lib/i18n/config';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useState } from 'react';
interface LanguageButtonProps {
    currentLocale: ValidLocale;
    onLocaleChange: (locale: ValidLocale) => void;
}
export const LanguageButton = ({ currentLocale, onLocaleChange }: LanguageButtonProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useTranslation(currentLocale);
    const languageNames = {
        en: 'English',
        vi: 'Tiếng Việt',
        ja: '日本語'
    };
    return (<div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border hover:bg-gray-50 transition-colors">
        <span className="text-sm font-medium">{languageNames[currentLocale]}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {isOpen && (<div className="absolute right-0 mt-2 w-48 rounded-lg bg-white border shadow-lg py-1 z-50">
          {locales.map((locale) => (<button key={locale} onClick={() => {
                    onLocaleChange(locale);
                    setIsOpen(false);
                }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${currentLocale === locale ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
              {languageNames[locale]}
            </button>))}
        </div>)}
    </div>);
};
