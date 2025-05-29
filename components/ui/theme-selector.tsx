'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Palette, Sunrise, Sunset } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";

const themeOptions = [
  {
    value: 'light',
    label: 'Light',
    labelKey: 'settings.themes.light',
    icon: Sun,
    description: 'settings.themes.lightDesc',
    category: 'light'
  },
  {
    value: 'light-soft',
    label: 'Soft Light',
    labelKey: 'settings.themes.lightSoft',
    icon: Sunrise,
    description: 'settings.themes.lightSoftDesc',
    category: 'light'
  },
  {
    value: 'light-warm',
    label: 'Warm Light',
    labelKey: 'settings.themes.lightWarm',
    icon: Sun,
    description: 'settings.themes.lightWarmDesc',
    category: 'light'
  },
  {
    value: 'dark',
    label: 'Dark',
    labelKey: 'settings.themes.dark',
    icon: Moon,
    description: 'settings.themes.darkDesc',
    category: 'dark'
  },
  {
    value: 'dark-blue',
    label: 'Dark Blue',
    labelKey: 'settings.themes.darkBlue',
    icon: Moon,
    description: 'settings.themes.darkBlueDesc',
    category: 'dark'
  },
  {
    value: 'dark-purple',
    label: 'Dark Purple',
    labelKey: 'settings.themes.darkPurple',
    icon: Moon,
    description: 'settings.themes.darkPurpleDesc',
    category: 'dark'
  },
  {
    value: 'dark-green',
    label: 'Dark Green',
    labelKey: 'settings.themes.darkGreen',
    icon: Moon,
    description: 'settings.themes.darkGreenDesc',
    category: 'dark'
  },
  {
    value: 'midnight',
    label: 'Midnight',
    labelKey: 'settings.themes.midnight',
    icon: Sunset,
    description: 'settings.themes.midnightDesc',
    category: 'dark'
  },
  {
    value: 'system',
    label: 'System',
    labelKey: 'settings.themes.system',
    icon: Monitor,
    description: 'settings.themes.systemDesc',
    category: 'auto'
  }
];

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const currentTheme = themeOptions.find(option => option.value === theme) || themeOptions[0];

  const handleThemeChange = (value: string) => {
    setTheme(value);
  };

  const getThemesByCategory = (category: string) => {
    return themeOptions.filter(option => option.category === category);
  };

  return (
    <Select value={theme} onValueChange={handleThemeChange}>
      <SelectTrigger className="w-[240px]">
        <SelectValue placeholder="Select theme">
          {currentTheme && (
            <div className="flex items-center gap-3">
              <currentTheme.icon className="h-4 w-4" />
              <div className="flex flex-col text-left">
                <span className="text-sm font-medium">{t(currentTheme.labelKey)}</span>
                <span className="text-xs text-muted-foreground">{t(currentTheme.description)}</span>
              </div>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="w-[280px]">
        {/* Light Themes */}
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {t('settings.lightModes')}
        </div>
        {getThemesByCategory('light').map((option) => (
          <SelectItem key={option.value} value={option.value} className="cursor-pointer">
            <div className="flex items-center gap-3 w-full py-1">
              <option.icon className="h-4 w-4 flex-shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium">{t(option.labelKey)}</span>
                <span className="text-xs text-muted-foreground truncate">{t(option.description)}</span>
              </div>
            </div>
          </SelectItem>
        ))}
        
        {/* Dark Themes */}
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
          {t('settings.darkModes')}
        </div>
        {getThemesByCategory('dark').map((option) => (
          <SelectItem key={option.value} value={option.value} className="cursor-pointer">
            <div className="flex items-center gap-3 w-full py-1">
              <option.icon className="h-4 w-4 flex-shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium">{t(option.labelKey)}</span>
                <span className="text-xs text-muted-foreground truncate">{t(option.description)}</span>
              </div>
            </div>
          </SelectItem>
        ))}

        {/* System Theme */}
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
          {t('settings.systemTheme')}
        </div>
        {getThemesByCategory('auto').map((option) => (
          <SelectItem key={option.value} value={option.value} className="cursor-pointer">
            <div className="flex items-center gap-3 w-full py-1">
              <option.icon className="h-4 w-4 flex-shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium">{t(option.labelKey)}</span>
                <span className="text-xs text-muted-foreground truncate">{t(option.description)}</span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 