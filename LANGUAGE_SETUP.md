# Language Setup Documentation

## Supported Languages

The application now supports the following languages:

- **English (en)** - Default language
- **Vietnamese (vi)** - Tiếng Việt  
- **Japanese (ja)** - 日本語 ✨ **NEW**

## Files Updated for Japanese Support

### Translation Files
- `lib/i18n/translations/ja.ts` - ✨ **NEW** Complete Japanese translations
- `lib/i18n/config.ts` - Updated to include Japanese in locales array
- `lib/i18n/LanguageContext.tsx` - Updated validation to include 'ja'

### UI Components
- `components/LanguageButton.tsx` - Added Japanese option
- `components/ui/language-selector.tsx` - Added Japanese with Japan flag 🇯🇵
- `components/LanguageTest.tsx` - ✨ **NEW** Test component for language switching

## How to Use

### Switching Languages
Users can switch languages through:
1. **Language Selector** - In settings or other UI components
2. **Language Button** - Quick language switcher
3. **Automatic Persistence** - Selected language is saved in localStorage

### For Developers

#### Adding New Translations
1. Add translations to `lib/i18n/translations/ja.ts`
2. Use the translation hook in components:
   ```tsx
   import { useLanguage } from '@/lib/i18n/LanguageContext';
   import { useTranslation } from '@/lib/i18n/useTranslation';
   
   function MyComponent() {
     const { locale } = useLanguage();
     const { t } = useTranslation(locale);
     
     return <div>{t('common.loading')}</div>;
   }
   ```

#### Testing Language Support
You can use the `LanguageTest` component to verify translations:
```tsx
import { LanguageTest } from '@/components/LanguageTest';

// Add to any page for testing
<LanguageTest />
```

## Translation Keys Structure

The translation system uses nested objects for organization:

```typescript
{
  common: {
    loading: "読み込み中...",
    save: "保存",
    cancel: "キャンセル"
  },
  shop: {
    title: "ゲームショップ",
    create: "作成"
  }
  // ... more sections
}
```

## Future Language Additions

To add more languages (Chinese, Korean, Thai, etc.):

1. Create translation file: `lib/i18n/translations/[code].ts`
2. Add to `lib/i18n/config.ts`:
   - Import the translation
   - Add to `locales` array
   - Add to `translations` object
3. Update validation in `LanguageContext.tsx`
4. Add to UI components (`LanguageButton.tsx`, `language-selector.tsx`)

## Quality Assurance

- ✅ All Japanese translations are complete and culturally appropriate
- ✅ Language switching works seamlessly without page reload
- ✅ User language preference is persisted across sessions
- ✅ Flag icons display correctly for each language
- ✅ No breaking changes to existing English/Vietnamese support

## Notes

- Japanese uses formal language style (丁寧語) appropriate for business applications
- All text follows consistent translation patterns
- Technical terms are appropriately localized while maintaining clarity
- UI layout accommodates different text lengths across languages 