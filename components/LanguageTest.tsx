'use client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { LanguageSelector } from '@/components/ui/language-selector';
export function LanguageTest() {
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    return (<div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Language Test</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Current Language:</label>
          <LanguageSelector />
        </div>
        
        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">Sample Translations:</h3>
          <ul className="space-y-1 text-sm">
            <li><strong>Loading:</strong> {t('common.loading')}</li>
            <li><strong>Save:</strong> {t('common.save')}</li>
            <li><strong>Cancel:</strong> {t('common.cancel')}</li>
            <li><strong>Shop Title:</strong> {t('shop.title')}</li>
            <li><strong>Game:</strong> {t('common.game')}</li>
            <li><strong>Settings:</strong> {t('common.settings')}</li>
          </ul>
        </div>
        
        <div className="border-t pt-4">
          <p className="text-xs text-gray-500">
            Current locale: <code>{locale}</code>
          </p>
        </div>
      </div>
    </div>);
}
