"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  BadgeDollarSign,
  BarChart2,
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Zap,
} from "lucide-react"

import { api } from "@/lib/api-client"
import { getGame } from "@/lib/game-api"
import { fetchStudioWithCache } from "@/lib/studio-api"
import {
  getPluginCatalog,
  getGamePlugins,
  subscribeToPlugin,
  unsubscribeFromPlugin,
  getRemainingStacks,
  getSubscriptionCost,
  type Plugin,
  type GamePluginsResult,
} from "@/lib/plugin-api"
import type { Game } from "@/types/game"
import type { Studio } from "@/types/studio"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { useTranslation } from "@/lib/i18n/use-translation"
import { getUserTimezone } from "@/lib/utils/date-utils"
import { CopyButton } from "@/components/CopyButton"

// ---------------------------------------------------------------------------
// Materia / Gem config — inspired by FF Materia system
// ---------------------------------------------------------------------------

const GEM_TIERS = [
  {
    image: "/materias/common.png",
    gradient: "from-green-400 via-emerald-400 to-teal-500",
    glow: "shadow-green-500/70",
    glowColor: "#22c55e",
    border: "border-green-500/40",
    activeBorder: "border-green-400",
    activeGlow: "shadow-green-500/40",
    bg: "bg-green-500/10 dark:bg-green-500/5",
    text: "text-green-400",
    slotEmpty: "border-green-500/25 bg-green-500/5",
    label: "Uncommon",
    emoji: "💚",
  },
  {
    image: "/materias/rare.png",
    gradient: "from-sky-400 via-blue-400 to-cyan-500",
    glow: "shadow-blue-500/70",
    glowColor: "#3b82f6",
    border: "border-blue-500/40",
    activeBorder: "border-blue-400",
    activeGlow: "shadow-blue-500/40",
    bg: "bg-blue-500/10 dark:bg-blue-500/5",
    text: "text-blue-400",
    slotEmpty: "border-blue-500/25 bg-blue-500/5",
    label: "Rare",
    emoji: "💙",
  },
  {
    image: "/materias/epic.png",
    gradient: "from-red-400 via-rose-500 to-red-600",
    glow: "shadow-red-500/70",
    glowColor: "#ef4444",
    border: "border-red-500/40",
    activeBorder: "border-red-400",
    activeGlow: "shadow-red-500/40",
    bg: "bg-red-500/10 dark:bg-red-500/5",
    text: "text-red-400",
    slotEmpty: "border-red-500/25 bg-red-500/5",
    label: "Epic",
    emoji: "❤️",
  },
  {
    image: "/materias/legendary.png",
    gradient: "from-yellow-300 via-amber-400 to-orange-500",
    glow: "shadow-yellow-500/70",
    glowColor: "#eab308",
    border: "border-yellow-500/40",
    activeBorder: "border-yellow-400",
    activeGlow: "shadow-yellow-500/40",
    bg: "bg-yellow-500/10 dark:bg-yellow-500/5",
    text: "text-yellow-400",
    slotEmpty: "border-yellow-500/25 bg-yellow-500/5",
    label: "Legendary",
    emoji: "💛",
  },
]

function getGemTier(idx: number) {
  return GEM_TIERS[idx % GEM_TIERS.length]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function ExpiryBadge({ expiresAt }: { expiresAt?: string | null }) {
  const { t } = useTranslation()
  if (!expiresAt) return <span className="text-xs text-muted-foreground">{t('plugins.permanent')}</span>
  const d = new Date(expiresAt)
  const now = new Date()
  const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isExpired = daysLeft <= 0
  const color = isExpired ? "text-destructive" : daysLeft <= 7 ? "text-destructive" : daysLeft <= 30 ? "text-yellow-500" : "text-muted-foreground"
  const daysAgo = isExpired ? Math.abs(daysLeft) : 0
  return (
    <span className={`text-xs ${color}`}>
      {d.toLocaleDateString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric" })}
      {isExpired
        ? ` (${daysAgo === 0 ? t('plugins.materia.today') : `${daysAgo}d ago`})`
        : ` (${daysLeft}${t('plugins.materia.daysLeft')})`}
    </span>
  )
}

/** Visual materia orb — filled or empty slot */
function MateriaOrb({
  filled,
  cancelled,
  gem,
  size = "sm",
}: {
  filled: boolean
  cancelled?: boolean
  gem: (typeof GEM_TIERS)[number]
  size?: "sm" | "md"
}) {
  const dim = size === "md" ? "w-8 h-8" : "w-5 h-5"
  if (filled && !cancelled) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={gem.image}
        alt={gem.label}
        className={`inline-block ${dim} rounded-full object-contain drop-shadow-md`}
        style={{ filter: `drop-shadow(0 0 5px ${gem.glowColor})` }}
      />
    )
  }
  if (filled && cancelled) {
    return (
      <span className={`relative inline-flex ${dim}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={gem.image}
          alt={gem.label}
          className={`${dim} rounded-full object-contain`}
          style={{ filter: "grayscale(0.6) brightness(0.7)", opacity: 0.6 }}
        />
        <span className="absolute inset-0 rounded-full border-2 border-orange-400/70" />
      </span>
    )
  }
  return (
    <span
      className={`inline-block ${dim} rounded-full border-2 ${gem.slotEmpty}`}
    />
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GamePluginsPage() {
  const params = useParams<{ id: string }>()
  const gameId = params.id
  const { toast } = useToast()
  const { t } = useTranslation()

  const [game, setGame] = useState<Game | null>(null)
  const [studio, setStudio] = useState<Studio | null>(null)
  const [gamePlugins, setGamePlugins] = useState<GamePluginsResult | null>(null)
  const [catalog, setCatalog] = useState<Plugin[]>([])
  const [walletBalance, setWalletBalance] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)

  const [confirmPlugin, setConfirmPlugin] = useState<Plugin | null>(null)
  const [confirmPluginIdx, setConfirmPluginIdx] = useState(0)
  const [confirmStacks, setConfirmStacks] = useState(1)

  const [unsubTarget, setUnsubTarget] = useState<{ plugin: Plugin; idx: number } | null>(null)
  const [unsubbing, setUnsubbing] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [gameData, pluginsData, walletData] = await Promise.all([
        getGame(gameId),
        getGamePlugins(gameId),
        api.get("/api/v1/coins/wallet").catch(() => null),
      ])
      setGame(gameData)
      setGamePlugins(pluginsData)
      if (walletData) setWalletBalance(walletData.balance ?? null)
      if (gameData.studio_id) {
        const studioData = await fetchStudioWithCache(gameData.studio_id).catch(() => null)
        if (studioData) setStudio(studioData)
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: t('plugins.materia.toastFailedLoad'), description: err?.message })
    } finally {
      setLoading(false)
    }
  }, [gameId, toast])

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true)
    try {
      const plugins = await getPluginCatalog()
      setCatalog(plugins.filter((p) => p.max_stacks > 0).sort((a, b) => a.sort_order - b.sort_order))
    } catch { /* silent */ } finally {
      setCatalogLoading(false)
    }
  }, [])

  useEffect(() => { loadAll(); loadCatalog() }, [loadAll, loadCatalog])

  async function handleUnsubConfirm() {
    if (!unsubTarget) return
    const { plugin } = unsubTarget
    setUnsubbing(plugin.id)
    setUnsubTarget(null)
    try {
      await unsubscribeFromPlugin(gameId, plugin.id)
      toast({ title: `🔮 ${plugin.display_name} ${t('plugins.materia.toastRemoved')}` })
      window.dispatchEvent(new Event("wallet:refresh"))
      await loadAll()
    } catch (err: any) {
      toast({ variant: "destructive", title: err?.data?.error ?? err?.message ?? t('plugins.materia.toastUnsubFailed') })
    } finally {
      setUnsubbing(null)
    }
  }

  async function handleSubscribeConfirm() {
    if (!confirmPlugin) return
    const pluginId = confirmPlugin.id
    setSubscribing(pluginId)
    setConfirmPlugin(null)
    try {
      await subscribeToPlugin(gameId, pluginId, confirmStacks)
      toast({ title: `✨ ${t('plugins.materia.toastSocketed')} ${confirmPlugin.display_name} × ${confirmStacks}` })
      window.dispatchEvent(new Event("wallet:refresh"))
      await loadAll()
    } catch (err: any) {
      const status = err?.status
      let msg = err?.data?.error ?? err?.message ?? t('plugins.materia.toastSubFailed')
      if (status === 402) msg = `${t('plugins.materia.toastNotEnoughCoins')} 🪙 ${getSubscriptionCost(confirmPlugin, confirmStacks).toLocaleString()}`
      else if (status === 400 && msg.includes("max stacks")) msg = t('plugins.materia.toastMaxStacks')
      toast({ variant: "destructive", title: msg })
    } finally {
      setSubscribing(null)
    }
  }

  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-2xl" />)}
        </div>
      </div>
    )
  }

  const lim = gamePlugins?.effective_limits
  const pending = gamePlugins?.pending_limits
  const subs = gamePlugins?.subscriptions ?? []
  const activeSubs_ = subs.filter((s) => !s.subscription.is_revoked)
  const historySubs = subs.filter((s) => s.subscription.is_revoked)
  const totalMonthlyCost = activeSubs_.reduce((sum, { subscription }) => sum + (subscription.coins_per_month ?? 0), 0)
  const subsByPluginId: Record<string, typeof subs[0]["subscription"][]> = {}
  activeSubs_.forEach(({ subscription, plugin }) => {
    if (!subsByPluginId[plugin.id]) subsByPluginId[plugin.id] = []
    subsByPluginId[plugin.id].push(subscription)
  })

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
          <BreadcrumbItem><BreadcrumbLink href="/studios">{t('common.studios')}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          {game?.studio_id && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink href={`/studios/${game.studio_id}`}>{studio?.name ?? game.studio_id}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
            </>
          )}
          <BreadcrumbItem><BreadcrumbLink href={`/games/${gameId}`}>{game?.name ?? gameId}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <BreadcrumbItem><span>{t('plugins.materia.breadcrumb')}</span></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* ──────────────────────────────────────────
          EQUIPMENT PANEL  (the "game" as weapon)
         ────────────────────────────────────────── */}
      <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden">
        {/* subtle dark gradient strip */}
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-transparent pointer-events-none" />

        <div className="relative p-5 flex flex-col gap-4">
          {/* top row */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" asChild>
                <Link href={`/games/${gameId}`}><ArrowLeft className="h-4 w-4" /></Link>
              </Button>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t('plugins.materia.equipment')}</p>
                <h1 className="text-2xl font-extrabold tracking-tight leading-tight">{game?.name ?? gameId}</h1>
                <p className="text-xs text-muted-foreground">{t('plugins.materia.socketDesc')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {gamePlugins && (
                <div className="flex items-center gap-1.5 rounded-xl border bg-muted/40 px-3 py-1.5 text-sm">
                  <span className="text-muted-foreground text-xs">{t('plugins.materia.monthly')}</span>
                  {totalMonthlyCost === 0 ? (
                    <span className="font-bold text-green-400">Free</span>
                  ) : (
                    <span className="font-bold text-yellow-400">🪙 {totalMonthlyCost.toLocaleString()}</span>
                  )}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Materia Slot Visualizer — one row per catalog tier */}
          {!catalogLoading && catalog.length > 0 && gamePlugins && (
            <div className="flex flex-col gap-2">
              {catalog.map((plugin, idx) => {
                const gem = getGemTier(idx)
                const remaining = getRemainingStacks(plugin, subs)
                const owned = plugin.max_stacks - remaining
                const cancelledOwned2 = subs
                  .filter((s) => s.plugin.id === plugin.id && s.is_cancelled && !s.subscription.is_revoked)
                  .reduce((sum, s) => sum + (s.subscription.stack_count ?? 0), 0)
                const activeOwned2 = owned - cancelledOwned2
                return (
                  <div key={plugin.id} className="flex items-center gap-2">
                    <span className={`w-20 shrink-0 text-xs font-semibold ${gem.text}`}>{plugin.display_name}</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {Array.from({ length: plugin.max_stacks }).map((_, si) => (
                        <MateriaOrb key={si} filled={si < owned} cancelled={si >= activeOwned2 && si < owned} gem={gem} size="sm" />
                      ))}
                    </div>
                    {owned > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">{owned}/{plugin.max_stacks}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Stats row */}
          {game && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1 border-t border-border/50">
              {([
                { label: t('plugins.ccu'), max: game.limits?.max_concurrent_users ?? null, pending: pending?.max_concurrent_users, used: game.usage?.concurrent_users, icon: "👥" },
                { label: t('plugins.profiles'), max: game.limits?.max_player_profiles ?? null, pending: pending?.max_profiles, used: game.usage?.player_profiles, icon: "👤" },
                { label: t('plugins.items'), max: game.limits?.max_items ?? null, pending: pending?.max_items, used: game.usage?.items, icon: "📦" },
                { label: t('plugins.shops'), max: game.limits?.max_shops ?? null, pending: pending?.max_shops, used: game.usage?.shops, icon: "🏪" },
                { label: "Gacha Packs", max: game.limits?.max_gacha_packs ?? null, pending: undefined, used: game.usage?.gacha_packs, icon: "🎲" },
              ] as { label: string; max: number | null; pending?: number; used: number | undefined; icon: string }[]).map((row) => {
                const pct = (row.used != null && row.max != null && row.max > 0) ? Math.min(100, (row.used / row.max) * 100) : null
                const numColor = pct == null ? "" : pct >= 90 ? "text-destructive" : pct >= 70 ? "text-yellow-500" : ""
                const hasCancelled = subs.some((s) => s.is_cancelled && !s.subscription.is_revoked)
                const hasPending = hasCancelled && row.pending != null && row.pending !== row.max
                return (
                  <div key={row.label} className="rounded-xl bg-muted/40 px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">{row.icon}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{row.label}</span>
                    </div>
                    <p className={`text-base font-bold tabular-nums leading-none ${numColor}`}>
                      {row.used != null ? (
                        <>{formatNumber(row.used)}<span className="text-muted-foreground font-normal text-xs"> / {row.max != null ? formatNumber(row.max) : '∞'}</span></>
                      ) : (row.max != null ? formatNumber(row.max) : '∞')}
                      {hasPending && (
                        <span className="text-[10px] text-orange-400 font-normal ml-2">→ {formatNumber(row.pending!)} {t('plugins.materia.afterExpiry')}</span>
                      )}
                    </p>
                    {pct != null && (
                      <div className="mt-1.5 w-full h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-yellow-500" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────
          MATERIA CATALOG
         ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t('plugins.materia.availableMateria')}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {catalogLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {catalog.map((plugin, idx) => {
              const gem = getGemTier(idx)
              const remaining = gamePlugins ? getRemainingStacks(plugin, subs) : plugin.max_stacks
              const owned = plugin.max_stacks - remaining
              const cancelledOwned = subs
                .filter((s) => s.plugin.id === plugin.id && s.is_cancelled && !s.subscription.is_revoked)
                .reduce((sum, s) => sum + (s.subscription.stack_count ?? 0), 0)
              const activeOwned = owned - cancelledOwned
              const cost = plugin.cost_coins
              const canAfford = walletBalance !== null ? walletBalance >= cost : true
              const atCap = remaining <= 0
              const activeSubs = subsByPluginId[plugin.id] ?? []
              const isSpinning = subscribing === plugin.id

              return (
                <div
                  key={plugin.id}
                  className={`relative flex flex-col rounded-2xl border-2 overflow-hidden transition-all duration-300
                    ${atCap
                      ? `${gem.activeBorder} shadow-[0_0_28px_-6px] ${gem.activeGlow}`
                      : `${gem.border} hover:${gem.activeBorder} hover:shadow-lg`
                    }`}
                >
                  {/* Gem Hero */}
                  <div className={`flex flex-col items-center justify-center py-7 gap-3 ${gem.bg}`}>
                    {/* Large orb image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gem.image}
                      alt={gem.label}
                      className="w-24 h-24 object-contain"
                      style={{ filter: `drop-shadow(0 0 20px ${gem.glowColor}) drop-shadow(0 0 8px ${gem.glowColor})` }}
                    />
                    <span className={`text-xs font-extrabold uppercase tracking-widest ${gem.text}`}>
                      {plugin.display_name}
                    </span>
                  </div>

                  {/* Cost */}
                  <div className="px-4 pt-3 pb-1 text-center">
                    {cost === 0 ? (
                      <span className="text-2xl font-extrabold text-green-400">Free</span>
                    ) : (
                      <span className="text-2xl font-extrabold text-yellow-400 tabular-nums">🪙 {cost.toLocaleString()}</span>
                    )}
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('plugins.materia.costSubtitle')}</p>
                  </div>

                  {/* Stack slots */}
                  <div className="px-4 py-2 flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                      {Array.from({ length: plugin.max_stacks }).map((_, si) => (
                        <MateriaOrb
                          key={si}
                          filled={si < owned}
                          cancelled={si >= activeOwned && si < owned}
                          gem={gem}
                          size="md"
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {activeOwned} / {plugin.max_stacks} {t('plugins.materia.slotsFilled')}
                      {cancelledOwned > 0 && (
                        <span className="text-orange-400 ml-1">(+{cancelledOwned} {t('plugins.materia.expiring')})</span>
                      )}
                    </p>
                  </div>

                  {/* Per-stack grants */}
                  <div className="mx-4 my-2 rounded-xl bg-muted/40 px-3 py-2 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{t('plugins.materia.perStack')}</p>
                    <div className="space-y-1 text-xs">
                      {[
                        { icon: "👥", label: t('plugins.materia.labelCcu'), val: plugin.ccu_grant },
                        { icon: "👤", label: t('plugins.materia.labelProfiles'), val: plugin.profiles_grant },
                        { icon: "📦", label: t('plugins.materia.labelItems'), val: plugin.items_grant },
                        { icon: "🏪", label: t('plugins.materia.labelShops'), val: plugin.shops_grant },
                      ].map((r) => (
                        <div key={r.label} className="flex items-center justify-between">
                          <span className="text-muted-foreground">{r.icon} {r.label}</span>
                          <span className="font-semibold tabular-nums">+{formatNumber(r.val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="px-4 pb-4 pt-1 flex flex-row gap-2">
                    {atCap ? (
                      <Button className="w-full" size="sm" disabled variant="outline">
                        <Check className="mr-1.5 h-4 w-4 text-green-400" /> {t('plugins.materia.allSlotsFilled')}
                      </Button>
                    ) : (
                      <button
                        disabled={isSpinning || !canAfford}
                        onClick={() => { setConfirmPlugin(plugin); setConfirmPluginIdx(idx); setConfirmStacks(1) }}
                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-1.5
                          ${!canAfford || isSpinning
                            ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground border border-border"
                            : `bg-gradient-to-r ${gem.gradient} text-white shadow-lg hover:brightness-110 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`
                          }`}
                      >
                        {isSpinning ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        {!canAfford ? t('plugins.materia.noCoins') : t('plugins.materia.addSocket')}
                      </button>
                    )}
                    {owned > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-destructive hover:text-destructive hover:border-destructive/60"
                        disabled={unsubbing === plugin.id}
                        onClick={() => setUnsubTarget({ plugin, idx })}
                      >
                        {unsubbing === plugin.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {t('plugins.materia.remove')}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Admin custom grants */}
      {subs.some((s) => s.plugin.plugin_type === "custom") && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BadgeDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t('plugins.adminGrants')}</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="space-y-2">
            {subs.filter((s) => s.plugin.plugin_type === "custom").map(({ subscription, plugin }) => (
              <div key={subscription.id} className="flex items-center justify-between rounded-xl border px-4 py-3 bg-muted/30">
                <div>
                  <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-full">{t('plugins.materia.customBadge')}</span>
                    <span className="font-medium text-sm">{plugin.display_name}</span>
                  </div>
                  {subscription.note?.trim() && <p className="text-xs text-muted-foreground mt-0.5">{subscription.note}</p>}
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {plugin.ccu_grant > 0 && <span>+{formatNumber(plugin.ccu_grant)} CCU</span>}
                    {plugin.profiles_grant > 0 && <span>+{formatNumber(plugin.profiles_grant)} profiles</span>}
                    {plugin.items_grant > 0 && <span>+{formatNumber(plugin.items_grant)} items</span>}
                    {plugin.shops_grant > 0 && <span>+{plugin.shops_grant} shops</span>}
                  </div>
                </div>
                <ExpiryBadge expiresAt={subscription.expires_at} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────
          ACTIVE SUBSCRIPTIONS LIST
         ────────────────────────────────────────── */}
      {activeSubs_.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t('plugins.activeSubscriptions')}</span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground">{activeSubs_.length} {t('plugins.activeSubscriptions').toLowerCase()}</span>
          </div>
          <div className="space-y-2">
            {activeSubs_.map(({ subscription, plugin, is_cancelled }, i) => {
              const isExpired = subscription.expires_at ? new Date(subscription.expires_at) < new Date() : false
              const isRevoked = subscription.is_revoked
              const isCancelled = is_cancelled
              const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null
              const activatedAt = new Date(subscription.activated_at)
              const cancelledAt = subscription.cancelled_at ? new Date(subscription.cancelled_at) : null
              const daysLeft = expiresAt
                ? Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000)
                : null

              return (
                <div
                  key={subscription.id}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 gap-4 ${
                    isCancelled ? "bg-orange-500/5 border-orange-500/20" : isExpired ? "bg-muted/20 opacity-60" : "bg-card"
                  }`}
                >
                  {/* Left: index + plugin name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[10px] font-mono text-muted-foreground w-5 text-right shrink-0">#{i + 1}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{plugin.display_name}</span>
                        {isCancelled && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">{t('plugins.materia.statusCancelled')}</span>
                        )}
                        {!isCancelled && isExpired && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border">{t('plugins.materia.statusExpired')}</span>
                        )}
                        {subscription.coins_per_month > 0 && (
                          <span className="text-[10px] text-yellow-400 font-semibold">🪙 {formatNumber(subscription.coins_per_month)}{t('plugins.perMonth')}</span>
                        )}
                      </div>
                      <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        <span>{t('plugins.materia.labelId')}: <span className="font-mono text-[10px]">{subscription.id.slice(0, 8)}…</span><CopyButton text={subscription.id} size="h-3 w-3" /></span>
                        <span>{t('plugins.materia.labelActivated')}: {activatedAt.toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        {cancelledAt && <span className="text-orange-400">{t('plugins.materia.labelCancelledAt')}: {cancelledAt.toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                        {subscription.note?.trim() && <span className="italic">{subscription.note}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right: expiry info */}
                  <div className="text-right shrink-0">
                    {isCancelled ? (
                      <p className="text-xs text-orange-400 font-semibold">{t('plugins.materia.willNotRenew')}</p>
                    ) : expiresAt ? (
                      <>
                        <p className={`text-xs font-semibold ${isExpired ? "text-destructive" : daysLeft !== null && daysLeft <= 7 ? "text-yellow-400" : "text-foreground"}`}>
                          {isExpired
                            ? `${t('plugins.materia.statusExpired')} (${Math.abs(daysLeft!) === 0 ? t('plugins.materia.today') : `${Math.abs(daysLeft!)}d ago`})`
                            : `${daysLeft}${t('plugins.materia.daysLeft')}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{expiresAt.toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      </>
                    ) : (
                      <p className="text-xs text-green-400 font-semibold">{t('plugins.permanent')}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────
          SUBSCRIPTION HISTORY (cancelled / revoked)
         ────────────────────────────────────────── */}
      {historySubs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t('plugins.history') ?? 'History'}</span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground">{historySubs.length}</span>
          </div>
          <div className="space-y-2">
            {historySubs.map(({ subscription, plugin, is_cancelled }, i) => {
              const isRevoked = subscription.is_revoked
              const isCancelled = is_cancelled
              const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null
              const activatedAt = new Date(subscription.activated_at)
              const cancelledAt = subscription.cancelled_at ? new Date(subscription.cancelled_at) : null

              return (
                <div
                  key={subscription.id}
                  className="flex items-center justify-between rounded-xl border px-4 py-3 gap-4 bg-muted/10 opacity-50 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[10px] font-mono text-muted-foreground w-5 text-right shrink-0">#{i + 1}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-muted-foreground">{plugin.display_name}</span>
                        {isCancelled && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">{t('plugins.materia.statusCancelled')}</span>
                        )}
                        {isRevoked && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30">{t('plugins.materia.statusRevoked')}</span>
                        )}
                        {subscription.coins_per_month > 0 && (
                          <span className="text-[10px] text-muted-foreground font-semibold">🪙 {formatNumber(subscription.coins_per_month)}{t('plugins.perMonth')}</span>
                        )}
                      </div>
                      <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        <span>{t('plugins.materia.labelId')}: <span className="font-mono text-[10px]">{subscription.id.slice(0, 8)}…</span><CopyButton text={subscription.id} size="h-3 w-3" /></span>
                        <span>{t('plugins.materia.labelActivated')}: {activatedAt.toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        {cancelledAt && <span>{t('plugins.materia.labelCancelledAt')}: {cancelledAt.toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                        {subscription.note?.trim() && <span className="italic">{subscription.note}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {expiresAt ? (
                      <p className="text-[10px] text-muted-foreground">{expiresAt.toLocaleDateString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric" })}</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">{t('plugins.permanent')}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────
          REMOVE MATERIA CONFIRMATION DIALOG
         ────────────────────────────────────────── */}
      <AlertDialog open={!!unsubTarget} onOpenChange={(o) => !o && setUnsubTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {unsubTarget && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getGemTier(unsubTarget.idx).image}
                  alt={getGemTier(unsubTarget.idx).label}
                  className="w-6 h-6 object-contain"
                  style={{ filter: `drop-shadow(0 0 6px ${getGemTier(unsubTarget.idx).glowColor})` }}
                />
              )}
              Remove {unsubTarget?.plugin.display_name} {t('plugins.materia.removeConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('plugins.materia.removeConfirmDescPart1')} <strong>{unsubTarget?.plugin.display_name}</strong> {t('plugins.materia.removeConfirmDescPart2')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleUnsubConfirm}
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> {t('plugins.materia.removeAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ──────────────────────────────────────────
          SOCKET CONFIRMATION DIALOG
         ────────────────────────────────────────── */}
      <AlertDialog open={!!confirmPlugin} onOpenChange={(o) => !o && setConfirmPlugin(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmPlugin && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getGemTier(confirmPluginIdx).image}
                  alt={getGemTier(confirmPluginIdx).label}
                  className="w-6 h-6 object-contain"
                  style={{ filter: `drop-shadow(0 0 6px ${getGemTier(confirmPluginIdx).glowColor})` }}
                />
              )}
              Socket {confirmPlugin?.display_name} {t('plugins.materia.socketConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Costs <strong>🪙 {confirmPlugin ? getSubscriptionCost(confirmPlugin, confirmStacks).toLocaleString() : 0}</strong> {t('plugins.materia.socketConfirmCost')}
                </p>
                {confirmPlugin && (
                  <div className="rounded-xl border bg-muted/30 p-3 text-sm space-y-1.5">
                    {[
                      { label: t('plugins.materia.labelCcu'), val: (confirmPlugin.ccu_grant ?? 0) * confirmStacks },
                      { label: t('plugins.materia.labelProfiles'), val: (confirmPlugin.profiles_grant ?? 0) * confirmStacks },
                      { label: t('plugins.materia.labelItems'), val: (confirmPlugin.items_grant ?? 0) * confirmStacks },
                      { label: t('plugins.materia.labelShops'), val: (confirmPlugin.shops_grant ?? 0) * confirmStacks },
                    ].map((r) => (
                      <div key={r.label} className="flex justify-between">
                        <span className="text-muted-foreground">{r.label}</span>
                        <span className="font-semibold">+{formatNumber(r.val)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {confirmPlugin && walletBalance !== null && walletBalance < getSubscriptionCost(confirmPlugin, confirmStacks) && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      You have 🪙 {walletBalance.toLocaleString()} — need 🪙 {getSubscriptionCost(confirmPlugin, confirmStacks).toLocaleString()}.{" "}
                      <Link href="/payment" className="underline">{t('plugins.materia.topUp')}</Link>.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubscribeConfirm}
              disabled={
                confirmPlugin !== null &&
                walletBalance !== null &&
                walletBalance < getSubscriptionCost(confirmPlugin, confirmStacks)
              }
            >
              {t('plugins.materia.socketNow')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
