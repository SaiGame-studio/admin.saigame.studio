"use client";
import { Globe, Palette } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LanguageSelector } from "@/components/ui/language-selector";
import { ThemeSelector } from "@/components/ui/theme-selector";
import { useTranslation } from "@/lib/i18n/use-translation";
export function SettingsContent() {
    const { t, locale } = useTranslation();
    return (<div className="space-y-6 max-w-4xl">
      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5"/>
            {t('settings.languageSettings')}
          </CardTitle>
          <CardDescription>
            {t('settings.languageSettingsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-0.5 min-w-0">
              <Label className="text-base">{t('settings.interfaceLanguage')}</Label>
              <div className="text-sm text-muted-foreground">
                {t('settings.current')}: {locale === 'en' ? 'English' : 'Tiếng Việt'}
              </div>
            </div>
            <LanguageSelector />
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5"/>
            {t('settings.appearance')}
          </CardTitle>
          <CardDescription>
            {t('settings.appearanceDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-0.5 min-w-0">
              <Label className="text-base">{t('settings.themeMode')}</Label>
              <div className="text-sm text-muted-foreground">
                {t('settings.themeModeDesc')}
              </div>
            </div>
            <ThemeSelector />
          </div>
        </CardContent>
      </Card>
    </div>);
}
