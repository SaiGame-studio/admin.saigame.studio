"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check, Loader2, RefreshCw, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api-client"
import { useTranslation } from "@/lib/i18n/use-translation"

// ---------------------------------------------------------------------------
// Hardcoded packages from guide
// ---------------------------------------------------------------------------

interface TokenPackage {
  key: string
  tokens: number
  sgem: number
  badge: string | null
  badgeVariant: "default" | "secondary" | "outline"
}

const TOKEN_PACKAGES: TokenPackage[] = [
  { key: "trial",   tokens: 50_000,     sgem: 50,     badge: null,           badgeVariant: "outline"    },
  { key: "starter", tokens: 200_000,    sgem: 200,    badge: null,           badgeVariant: "outline"    },
  { key: "growth",  tokens: 1_000_000,  sgem: 1_000,  badge: "Popular",      badgeVariant: "default"    },
  { key: "scale",      tokens: 5_000_000,   sgem: 4_500,  badge: "10% off",      badgeVariant: "secondary"  },
  { key: "pro",        tokens: 20_000_000,  sgem: 17_000, badge: "15% off",      badgeVariant: "secondary"  },
  { key: "enterprise", tokens: 100_000_000, sgem: 80_000, badge: "20% off",      badgeVariant: "secondary"  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("en-US")}M`
  if (n >= 1_000) return `${(n / 1_000).toLocaleString("en-US")}K`
  return n.toLocaleString("en-US")
}

// ---------------------------------------------------------------------------
// Package Card — click to select, no buy button
// ---------------------------------------------------------------------------

interface PackageCardProps {
  pkg: TokenPackage
  sgemBalance: number | null
  selected: boolean
  onSelect: () => void
}

function PackageCard({ pkg, sgemBalance, selected, onSelect }: PackageCardProps) {
  const { t } = useTranslation()
  const canAfford = sgemBalance === null || sgemBalance >= pkg.sgem

  return (
    <button
      id={`llm-purchase-card-${pkg.key}`}
      type="button"
      disabled={!canAfford}
      onClick={onSelect}
      className={`relative rounded-lg border px-4 py-3 flex flex-col gap-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected
          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
          : canAfford
          ? "border-border hover:border-primary/50 hover:bg-muted/40"
          : "border-border opacity-40 cursor-not-allowed"
      }`}
    >
      {/* Badge — absolute top-right so it never affects card size */}
      {pkg.badge && (
        <Badge
          id={`llm-purchase-card-badge-${pkg.key}`}
          variant="outline"
          className="badge-blink absolute top-2 right-2 text-xs leading-none"
        >
          {pkg.badge === "Popular" ? t("llmTokenPurchase.badgePopular") : pkg.badge}
        </Badge>
      )}

      {/* Selected check — sits left of badge when both present */}
      {selected && (
        <span
          id={`llm-purchase-card-check-${pkg.key}`}
          className={`absolute top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground ${pkg.badge ? "right-[calc(theme(spacing.2)+3rem)]" : "right-2"}`}
        >
          <Check className="h-2.5 w-2.5" />
        </span>
      )}

      {/* Top row: name only */}
      <div id={`llm-purchase-card-header-${pkg.key}`} className="flex items-center">
        <span id={`llm-purchase-card-name-${pkg.key}`} className="text-sm font-semibold capitalize">{pkg.key}</span>
      </div>

      {/* Token amount */}
      <div id={`llm-purchase-card-tokens-${pkg.key}`} className="flex items-baseline gap-1">
        <span id={`llm-purchase-card-tokens-val-${pkg.key}`} className="text-2xl font-bold tabular-nums">{fmt(pkg.tokens)}</span>
        <span id={`llm-purchase-card-tokens-unit-${pkg.key}`} className="text-xs text-muted-foreground">{t("llmTokenPurchase.tokensUnit")}</span>
      </div>

      {/* sGem cost */}
      <div id={`llm-purchase-card-cost-${pkg.key}`} className="flex items-center gap-1 text-sm text-muted-foreground">
        <span id={`llm-purchase-card-cost-icon-${pkg.key}`} aria-hidden="true">💎</span>
        <span id={`llm-purchase-card-cost-val-${pkg.key}`} className="font-medium text-foreground">{pkg.sgem.toLocaleString("en-US")}</span>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main Dialog
// ---------------------------------------------------------------------------

interface Props {
  gameId: string
  compact?: boolean
}

let _premFloatId = 0

export function LLMTokenPurchaseDialog({ gameId, compact = false }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [sgemBalance, setSgemBalance] = useState<number | null>(null)
  const [loadingWallet, setLoadingWallet] = useState(false)
  const [freeRemaining, setFreeRemaining] = useState<number | null>(null)
  const [premiumRemaining, setPremiumRemaining] = useState<number | null>(null)
  const [loadingTokens, setLoadingTokens] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const premiumAnchorRef = useRef<HTMLDivElement | null>(null)
  const prevPremiumRef = useRef<number | null>(null)
  const [premiumFloats, setPremiumFloats] = useState<{ id: number; delta: number; x: number; y: number }[]>([])

  const loadWallet = async () => {
    setLoadingWallet(true)
    try {
      const data = await api.get("/api/v1/me/sgem-wallet")
      setSgemBalance(data.balance ?? null)
    } catch {
      // silent
    } finally {
      setLoadingWallet(false)
    }
  }

  const loadTokenBalance = async () => {
    setLoadingTokens(true)
    try {
      const data = await api.get(`/api/v1/games/${gameId}/llm-tokens/balance`)
      const newPremium: number = data.premium_tokens_remaining ?? null
      if (prevPremiumRef.current !== null && newPremium !== null && newPremium !== prevPremiumRef.current) {
        const delta = newPremium - prevPremiumRef.current
        const rect = premiumAnchorRef.current?.getBoundingClientRect()
        const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
        const y = rect ? rect.top - 4 : 100
        const floatId = ++_premFloatId
        setPremiumFloats((f) => [...f, { id: floatId, delta, x, y }])
        setTimeout(() => setPremiumFloats((f) => f.filter((fl) => fl.id !== floatId)), 3000)
      }
      prevPremiumRef.current = newPremium
      setFreeRemaining(data.free_tokens_remaining ?? null)
      setPremiumRemaining(newPremium)
    } catch {
      // silent
    } finally {
      setLoadingTokens(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadWallet()
      loadTokenBalance()
      setSelectedKey(null)
    }
  }, [open])

  async function handleConfirmPurchase() {
    if (!selectedKey) return
    const pkg = TOKEN_PACKAGES.find((p) => p.key === selectedKey)!

    setPurchasing(true)
    try {
      const data = await api.post(`/api/v1/games/${gameId}/llm-tokens/purchase`, { package: pkg.key })
      const tokensAdded: number = data.tokens_purchased ?? pkg.tokens
      toast({
        title: t("llmTokenPurchase.toastSuccessTitle"),
        description: `+${tokensAdded.toLocaleString("en-US")} ${t("llmTokenPurchase.toastSuccessDesc")}`,
      })
      await Promise.all([loadWallet(), loadTokenBalance()])
      window.dispatchEvent(new CustomEvent("sgem-wallet:refresh"))
      setSelectedKey(null)
    } catch (err: unknown) {
      const e = err as { status?: number; data?: { detail?: string } }
      if (e?.status === 402) {
        toast({
          title: t("llmTokenPurchase.toastInsufficientTitle"),
          description: t("llmTokenPurchase.toastInsufficientDesc"),
          variant: "destructive",
        })
      } else {
        const msg = e?.data?.detail ?? t("llmTokenPurchase.toastFailedDesc")
        toast({ title: t("llmTokenPurchase.toastFailedTitle"), description: msg, variant: "destructive" })
      }
    } finally {
      setPurchasing(false)
    }
  }

  const triggerButton = (
    <Button
      id={`llm-purchase-trigger-${gameId}`}
      variant="outline"
      size={compact ? "icon" : "sm"}
      className={compact ? "h-8 w-8" : "flex items-center gap-1.5"}
      onClick={() => { setOpen(true); setSelectedKey(null) }}
    >
      <Zap className="h-4 w-4" />
      {!compact && t("llmTokenPurchase.triggerLabel")}
    </Button>
  )

  return (
    <>
      {compact ? (
        <Tooltip>
          <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
          <TooltipContent side="top">{t("llmTokenPurchase.triggerLabel")}</TooltipContent>
        </Tooltip>
      ) : triggerButton}

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); setSelectedKey(null) }}>
        <SheetContent id={`llm-purchase-sheet-${gameId}`} side="right" className="w-full sm:max-w-[622px] flex flex-col overflow-y-auto p-0 top-14 lg:top-[60px] h-[calc(100%-3.5rem)] lg:h-[calc(100%-60px)]" overlayClassName="top-14 lg:top-[60px]">
          {/* Scrollable area */}
          <style>{`
            @keyframes prem-float-up {
              0%   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
              15%  { opacity: 1; transform: translateX(-50%) translateY(-10px) scale(1.1); }
              75%  { opacity: 1; transform: translateX(-50%) translateY(-32px) scale(1.05); }
              100% { opacity: 0; transform: translateX(-50%) translateY(-48px) scale(0.9); }
            }
            .prem-float { animation: prem-float-up 3s ease-out forwards; pointer-events: none; }
            @keyframes badge-blink {
              0%, 100% { opacity: 0.15; }
              50%       { opacity: 0.7; }
            }
            .badge-blink { animation: badge-blink 2.4s ease-in-out infinite; }
          `}</style>
          {typeof window !== "undefined" && premiumFloats.map(({ id, delta, x, y }) =>
            createPortal(
              <span
                key={id}
                id={`llm-prem-float-${id}`}
                className="prem-float fixed text-sm font-bold tabular-nums whitespace-nowrap select-none"
                style={{
                  top: y,
                  left: x,
                  zIndex: 9999,
                  color: delta > 0 ? "#22c55e" : "#ef4444",
                  textShadow: "0 0 3px #000, 0 0 3px #000, 0 0 6px #000",
                }}
              >
                {delta > 0 ? `+${fmt(delta)}` : fmt(delta)}
              </span>,
              document.body
            )
          )}
          <div id={`llm-purchase-scroll-${gameId}`} className="flex flex-col gap-3 flex-1 overflow-y-auto px-6 pt-6 pb-4">
            <SheetHeader>
              <SheetTitle id={`llm-purchase-title-${gameId}`} className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                {t("llmTokenPurchase.title")}
              </SheetTitle>
              <SheetDescription id={`llm-purchase-desc-${gameId}`}>
                {t("llmTokenPurchase.description")}
              </SheetDescription>
            </SheetHeader>

            <div id={`llm-purchase-body-${gameId}`} className="flex flex-col gap-3 mt-2">

        {/* sGem balance bar */}
          <div id={`llm-purchase-wallet-${gameId}`} className="flex items-center justify-between rounded-md bg-muted/50 border px-3 py-2 text-sm">
          <div id={`llm-purchase-wallet-label-${gameId}`} className="flex items-center gap-1.5 text-muted-foreground">
            <span id={`llm-purchase-wallet-icon-${gameId}`} aria-hidden="true">💎</span>
            <span id={`llm-purchase-wallet-text-${gameId}`}>{t("llmTokenPurchase.sgemBalance")}</span>
          </div>
          <div id={`llm-purchase-wallet-value-${gameId}`} className="flex items-center gap-2">
            {loadingWallet ? (
              <Skeleton id={`llm-purchase-wallet-skel-${gameId}`} className="h-4 w-16" />
            ) : (
              <span id={`llm-purchase-wallet-num-${gameId}`} className="font-semibold tabular-nums">
                {sgemBalance !== null ? sgemBalance.toLocaleString("en-US") : "—"}
              </span>
            )}
            <Button
              id={`llm-purchase-wallet-refresh-${gameId}`}
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={loadWallet}
              disabled={loadingWallet}
            >
              <RefreshCw className={`h-3 w-3 ${loadingWallet ? "animate-spin" : ""}`} />
            </Button>
          </div>
          </div>

          {/* Token balances */}
          <div id={`llm-purchase-token-balances-${gameId}`} className="grid grid-cols-2 gap-2">
          <div id={`llm-purchase-premium-bal-${gameId}`} ref={premiumAnchorRef} className="flex flex-col gap-0.5 rounded-md border px-3 py-2">
            <span id={`llm-purchase-premium-bal-label-${gameId}`} className="text-xs text-muted-foreground">{t("llmTokenPurchase.premiumTokensRemaining")}</span>
            {loadingTokens ? (
              <Skeleton id={`llm-purchase-premium-bal-skel-${gameId}`} className="h-5 w-20" />
            ) : (
              <span id={`llm-purchase-premium-bal-val-${gameId}`} className="font-semibold tabular-nums text-sm">
                {premiumRemaining !== null ? premiumRemaining.toLocaleString("en-US") : "—"}
              </span>
            )}
          </div>
          <div id={`llm-purchase-free-bal-${gameId}`} className="flex flex-col gap-0.5 rounded-md border px-3 py-2">
            <span id={`llm-purchase-free-bal-label-${gameId}`} className="text-xs text-muted-foreground">{t("llmTokenPurchase.freeTokensRemaining")}</span>
            {loadingTokens ? (
              <Skeleton id={`llm-purchase-free-bal-skel-${gameId}`} className="h-5 w-20" />
            ) : (
              <span id={`llm-purchase-free-bal-val-${gameId}`} className="font-semibold tabular-nums text-sm">
                {freeRemaining !== null ? freeRemaining.toLocaleString("en-US") : "—"}
              </span>
            )}
          </div>
          </div>

          {/* Non-refundable notice */}
          <p id={`llm-purchase-notice-${gameId}`} className="text-xs text-muted-foreground">
            {t("llmTokenPurchase.nonRefundable")}
          </p>

          {/* Package grid */}
          <div id={`llm-purchase-grid-${gameId}`} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TOKEN_PACKAGES.map((pkg) => (
              <PackageCard
                key={pkg.key}
                pkg={pkg}
                sgemBalance={sgemBalance}
                selected={selectedKey === pkg.key}
                onSelect={() => setSelectedKey(selectedKey === pkg.key ? null : pkg.key)}
              />
            ))}
          </div>

          <p id={`llm-purchase-select-hint-${gameId}`} className="text-xs text-center text-muted-foreground">
            {t("llmTokenPurchase.selectHint")}
          </p>
            </div>
          </div>

          {/* Sticky confirm footer — slides in when a package is selected */}
          <div
            id={`llm-purchase-footer-${gameId}`}
            className={`border-t bg-background px-6 py-4 flex flex-col gap-3 transition-all duration-200 ${
              selectedKey ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
            }`}
          >
            {(() => {
              const pkg = TOKEN_PACKAGES.find((p) => p.key === selectedKey)
              if (!pkg) return null
              return (
                <>
                  <div id={`llm-purchase-footer-summary-${gameId}`} className="flex items-center justify-between text-sm">
                    <div id={`llm-purchase-footer-pkg-${gameId}`} className="flex flex-col gap-0.5">
                      <span id={`llm-purchase-footer-pkg-name-${gameId}`} className="font-semibold capitalize">{pkg.key}</span>
                      <span id={`llm-purchase-footer-pkg-tokens-${gameId}`} className="text-muted-foreground">+{fmt(pkg.tokens)} {t("llmTokenPurchase.tokensUnit")}</span>
                    </div>
                    <div id={`llm-purchase-footer-pkg-cost-${gameId}`} className="flex items-center gap-1 text-base font-bold">
                      <span aria-hidden="true">💎</span>
                      <span id={`llm-purchase-footer-pkg-cost-val-${gameId}`}>{pkg.sgem.toLocaleString("en-US")}</span>
                      <span id={`llm-purchase-footer-pkg-cost-unit-${gameId}`} className="text-xs font-normal text-muted-foreground">sGem</span>
                      {/* sGem is a proper brand name — not translated */}
                    </div>
                  </div>
                  <p id={`llm-purchase-footer-warning-${gameId}`} className="text-xs text-muted-foreground">
                    {t("llmTokenPurchase.nonRefundable")}
                  </p>
                  <div id={`llm-purchase-footer-actions-${gameId}`} className="flex gap-2">
                    <Button
                      id={`llm-purchase-footer-cancel-${gameId}`}
                      variant="outline"
                      className="flex-1"
                      disabled={purchasing}
                      onClick={() => setSelectedKey(null)}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      id={`llm-purchase-footer-confirm-${gameId}`}
                      className="flex-1"
                      disabled={purchasing}
                      onClick={handleConfirmPurchase}
                    >
                      {purchasing ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("llmTokenPurchase.processing")}</>
                      ) : (
                        <>{t("llmTokenPurchase.confirmPay")} 💸 {pkg.sgem.toLocaleString("en-US")}</>
                      )}
                    </Button>
                  </div>
                </>
              )
            })()}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
