'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ValidLocale } from "@/lib/i18n/config";
import ReactCountryFlag from "react-country-flag";

const languages = [
  {
    code: 'en' as ValidLocale,
    name: 'English',
    countryCode: 'US',
    nativeName: 'English',
  },
  {
    code: 'vi' as ValidLocale,
    name: 'Vietnamese',
    countryCode: 'VN',
    nativeName: 'Tiếng Việt',
  },
  {
    code: 'ja' as ValidLocale,
    name: 'Japanese',
    countryCode: 'JP',
    nativeName: '日本語',
  },
  // Các ngôn ngữ có thể thêm trong tương lai
  // {
  //   code: 'zh' as ValidLocale,
  //   name: 'Chinese (Simplified)',
  //   countryCode: 'CN',
  //   nativeName: '简体中文',
  //   region: 'China'
  // },
  // {
  //   code: 'zh-tw' as ValidLocale,
  //   name: 'Chinese (Traditional)',
  //   countryCode: 'TW',
  //   nativeName: '繁體中文',
  //   region: 'Taiwan'
  // },
  // {
  //   code: 'ko' as ValidLocale,
  //   name: 'Korean',
  //   countryCode: 'KR',
  //   nativeName: '한국어',
  //   region: 'South Korea'
  // },
  // {
  //   code: 'th' as ValidLocale,
  //   name: 'Thai',
  //   countryCode: 'TH',
  //   nativeName: 'ไทย',
  //   region: 'Thailand'
  // },
  // {
  //   code: 'fr' as ValidLocale,
  //   name: 'French',
  //   countryCode: 'FR',
  //   nativeName: 'Français',
  //   region: 'France'
  // }
];

export function LanguageSelector() {
  const { locale, setLocale } = useLanguage();

  const currentLanguage = languages.find(lang => lang.code === locale);

  const handleLanguageChange = (value: string) => {
    setLocale(value as ValidLocale);
  };

  return (
    <Select value={locale} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select language">
          {currentLanguage && (
            <div className="flex items-center gap-3">
              <ReactCountryFlag
                countryCode={currentLanguage.countryCode}
                svg
                style={{
                  width: '1.25em',
                  height: '1.25em',
                }}
                title={currentLanguage.name}
              />
              <div className="flex flex-col text-left">
                <span className="text-sm font-medium">{currentLanguage.nativeName}</span>
              </div>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {languages.map((language) => (
          <SelectItem key={language.code} value={language.code} className="cursor-pointer">
            <div className="flex items-center gap-3 w-full py-1">
              <ReactCountryFlag
                countryCode={language.countryCode}
                svg
                style={{
                  width: '1.25em',
                  height: '1.25em',
                }}
                title={language.name}
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{language.nativeName}</span>
                <span className="text-xs text-muted-foreground">{language.name}</span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 