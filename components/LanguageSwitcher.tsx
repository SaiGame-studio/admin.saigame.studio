import { locales, ValidLocale } from '@/lib/i18n/config';
import { useTranslation } from '@/lib/i18n/useTranslation';
interface LanguageSwitcherProps {
    currentLocale: ValidLocale;
    onLocaleChange: (locale: ValidLocale) => void;
}
export const LanguageSwitcher = ({ currentLocale, onLocaleChange }: LanguageSwitcherProps) => {
    const { t } = useTranslation(currentLocale);
    return (<div className="flex items-center gap-2">
      {locales.map((locale) => (<button key={locale} onClick={() => onLocaleChange(locale)} className={`px-3 py-1 rounded ${currentLocale === locale
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'}`}>
          {locale.toUpperCase()}
        </button>))}
    </div>);
};
