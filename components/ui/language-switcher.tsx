'use client';
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ValidLocale } from "@/lib/i18n/config";
import { Languages } from "lucide-react";
export function LanguageSwitcher() {
    const { locale, setLocale } = useLanguage();
    const toggleLanguage = () => {
        const newLocale: ValidLocale = locale === 'en' ? 'vi' : 'en';
        setLocale(newLocale);
    };
    return (<Button variant="ghost" size="icon" onClick={toggleLanguage} className="h-8 w-8" title={locale === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh'}>
      <Languages className="h-4 w-4"/>
      <span className="sr-only">
        {locale === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh'}
      </span>
    </Button>);
}
