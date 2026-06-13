'use client';
import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ValidLocale } from '@/lib/i18n/config';
export default function ExamplePage() {
    const [locale, setLocale] = useState<ValidLocale>('en');
    const { t } = useTranslation(locale);
    return (<div className="p-8">
      <div className="mb-8">
        <LanguageSwitcher currentLocale={locale} onLocaleChange={setLocale}/>
      </div>

      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t('shop.title')}</h1>
        
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('shop.name')}</label>
            <input type="text" className="w-full p-2 border rounded"/>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('shop.description')}</label>
            <textarea className="w-full p-2 border rounded" rows={3}/>
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-500 text-white rounded">
              {t('common.save')}
            </button>
            <button className="px-4 py-2 bg-gray-200 rounded">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>);
}
