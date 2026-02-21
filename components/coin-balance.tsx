"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, RefreshCw } from "lucide-react"
import Link from "next/link"

import { api } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTranslation } from "@/lib/i18n/use-translation"

interface WalletData {
  id: string
  user_id: string
  balance: number
  total_earned: number
  total_spent: number
  created_at: string
  updated_at: string
}

export function CoinBalance() {
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const { t } = useTranslation()

  const fetchWallet = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await api.get("/api/v1/coins/wallet")
      setWallet(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWallet()
  }, [fetchWallet])

  useEffect(() => {
    const handler = () => fetchWallet()
    window.addEventListener("wallet:refresh", handler)
    return () => window.removeEventListener("wallet:refresh", handler)
  }, [fetchWallet])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 rounded-md border bg-background px-2 h-10 text-sm">
        {/* Coin icon */}
        <span className="text-yellow-500" aria-hidden="true">🪙</span>

        {/* Balance */}
        <span className="min-w-[2rem] text-center font-medium tabular-nums">
          {loading ? (
            <span className="inline-block h-3 w-8 animate-pulse rounded bg-muted" />
          ) : error ? (
            <span className="text-destructive">—</span>
          ) : (
            (wallet?.balance ?? 0).toLocaleString()
          )}
        </span>

        {/* Add coins button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-yellow-500 hover:text-yellow-400"
              asChild
              aria-label="Add coins"
            >
              <Link href="/payment">
                <Plus className="h-3 w-3" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{t('payment.addCoins')}</p>
          </TooltipContent>
        </Tooltip>

        {/* Refresh button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
              onClick={fetchWallet}
              disabled={loading}
              aria-label={t('payment.refreshBalance')}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{t('payment.refreshBalance')}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
