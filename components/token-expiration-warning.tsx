"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Clock } from "lucide-react"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { useTranslation } from "@/lib/i18n/useTranslation"

export function TokenExpirationWarning() {
  const { timeUntilExpiration, logout, renewSession } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>("")
  const { locale } = useLanguage()
  const { t } = useTranslation(locale)

  useEffect(() => {
    if (timeUntilExpiration) {
      // Show warning if less than 30 minutes (1800000 ms) remaining
      const shouldShow = timeUntilExpiration < 1800000 && timeUntilExpiration > 0
      setShowWarning(shouldShow)

      if (shouldShow) {
        // Update time display every second
        const interval = setInterval(() => {
          const remaining = timeUntilExpiration - (Date.now() % 60000)
          if (remaining <= 0) {
            setShowWarning(false)
            clearInterval(interval)
            return
          }

          const minutes = Math.floor(remaining / 60000)
          const seconds = Math.floor((remaining % 60000) / 1000)
          setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
        }, 1000)

        return () => clearInterval(interval)
      }
    } else {
      setShowWarning(false)
    }
  }, [timeUntilExpiration])

  if (!showWarning) return null

  return (
    <Alert className="mb-4 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-200">
        {t('auth.sessionExpiring')}
      </AlertTitle>
      <AlertDescription className="text-yellow-700 dark:text-yellow-300">
        <div className="flex items-center justify-between">
          <span>
            {t('auth.sessionExpiringDesc')} {timeLeft && (
              <span className="font-mono font-semibold">
                <Clock className="inline h-3 w-3 mr-1" />
                {timeLeft}
              </span>
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => renewSession()}
            className="ml-4 border-yellow-300 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-600 dark:text-yellow-200 dark:hover:bg-yellow-800"
          >
            {t('auth.renewSession')}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
} 