"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Plus, RefreshCw } from "lucide-react"
import Link from "next/link"

import { api } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTranslation } from "@/lib/i18n/use-translation"

const STORAGE_KEY = "gem-balance-visible"

interface SgemWallet {
  id: string
  user_id: string
  balance: number
  total_bought: number
  total_spent: number
  created_at: string
  updated_at: string
}

interface FloatItem {
  id: number
  delta: number
}

let floatIdCounter = 0

export function GemBalance() {
  const [wallet, setWallet] = useState<SgemWallet | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [visible, setVisible] = useState<boolean | null>(null)
  const [floats, setFloats] = useState<FloatItem[]>([])
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const prevBalanceRef = useRef<number | null>(null)
  const isFirstLoad = useRef(true)
  const { t } = useTranslation()

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    setVisible(stored !== "false")
  }, [])

  function toggleVisible() {
    setVisible((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  const fetchWallet = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await api.get("/api/v1/me/sgem-wallet")
      setWallet((prev) => {
        const prevBal = prevBalanceRef.current
        const newBal: number = data?.balance ?? 0
        if (!isFirstLoad.current && prevBal !== null && newBal !== prevBal) {
          const delta = newBal - prevBal
          const id = ++floatIdCounter
          setFloats((f) => [...f, { id, delta }])
          setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 5000)
        }
        isFirstLoad.current = false
        prevBalanceRef.current = newBal
        return data
      })
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
    window.addEventListener("sgem-wallet:refresh", handler)
    return () => window.removeEventListener("sgem-wallet:refresh", handler)
  }, [fetchWallet])

  return (
    <TooltipProvider delayDuration={300}>
      <style>{`
        @keyframes gem-float-down {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          15%  { opacity: 1; transform: translateY(10px) scale(1.1); }
          75%  { opacity: 1; transform: translateY(36px) scale(1.05); }
          100% { opacity: 0; transform: translateY(52px) scale(0.9); }
        }
        .gem-float { animation: gem-float-down 5s ease-out forwards; pointer-events: none; }
      `}</style>
      <div id="gem-balance-root" ref={anchorRef} className="relative flex items-center gap-1 rounded-md border bg-background px-2 h-10 text-sm">
        {/* Float texts rendered via portal to escape nav stacking context */}
        {typeof window !== "undefined" && floats.map(({ id, delta }) => {
          const rect = anchorRef.current?.getBoundingClientRect()
          const top = rect ? rect.bottom + window.scrollY + 4 : 0
          const left = rect ? rect.left + rect.width / 2 + window.scrollX : 0
          return createPortal(
            <span
              key={id}
              id={`gem-float-${id}`}
              className="gem-float fixed text-sm font-bold tabular-nums whitespace-nowrap select-none pointer-events-none"
              style={{
                top,
                left,
                transform: "translateX(-50%)",
                zIndex: 9999,
                color: delta > 0 ? "#22c55e" : "#ef4444",
                textShadow: "0 0 3px #000, 0 0 3px #000, 0 0 3px #000, 0 0 6px #000",
              }}
            >
              {delta > 0 ? `💎 +${delta.toLocaleString()}` : `💎 ${delta.toLocaleString()}`}
            </span>,
            document.body
          )
        })}

        {/* Gem icon + balance — click to toggle */}
        <button
          id="gem-balance-toggle-btn"
          onClick={toggleVisible}
          className="flex items-center gap-1 cursor-pointer select-none focus-visible:outline-none rounded px-1.5 py-0.5 transition-colors hover:bg-muted active:bg-muted/80"
          aria-label={visible ? "Hide gem balance" : "Show gem balance"}
        >
          <span id="gem-balance-icon" className="text-blue-400" aria-hidden="true">💎</span>
          <span id="gem-balance-value" className="min-w-[2rem] text-center font-medium tabular-nums">
            {loading ? (
              <span id="gem-balance-loading" className="inline-block h-3 w-8 animate-pulse rounded bg-muted" />
            ) : error ? (
              <span id="gem-balance-error" className="text-destructive">—</span>
            ) : visible ? (
              (wallet?.balance ?? 0).toLocaleString()
            ) : (
              <span id="gem-balance-hidden" className="tracking-widest text-muted-foreground">••••</span>
            )}
          </span>
        </button>

        {/* Add gems button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              id="gem-balance-add-btn"
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-blue-400 hover:text-blue-300"
              asChild
              aria-label="Buy gems"
            >
              <Link href="/payment?tab=buy-sgem">
                <Plus className="h-3 w-3" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{t("payment.tabBuySGem")}</p>
          </TooltipContent>
        </Tooltip>

        {/* Refresh button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              id="gem-balance-refresh-btn"
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
              onClick={fetchWallet}
              disabled={loading}
              aria-label={t("payment.refreshBalance")}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{t("payment.refreshBalance")}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
