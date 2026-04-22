"use client"

import { Monitor } from "lucide-react"
import { useTranslation } from "@/lib/i18n/use-translation"

export function DesktopRecommendedBanner() {
  const { t } = useTranslation()

  return (
    <div className="mt-8 rounded-lg border border-amber-400/50 bg-amber-50 p-4 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/30 lg:hidden">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
          <Monitor className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            {t('game.desktopRecommendedTitle')}
          </p>
          <p className="text-xs mt-1 leading-relaxed text-amber-800/80 dark:text-amber-200/70">
            {t('game.desktopRecommendedDesc')}
          </p>
        </div>
      </div>
    </div>
  )
}
