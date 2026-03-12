"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  BarChart2,
  Check,
  ChevronDown,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
import { GameNavButtons } from "@/components/GameNavButtons"

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

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const isFuture = diffMs < 0
  const abs = Math.abs(diffMs)
  const secs = Math.floor(abs / 1000)
  const mins = Math.floor(secs / 60)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)
  let rel: string
  if (secs < 60) rel = `${secs}s`
  else if (mins < 60) rel = `${mins}m`
  else if (hours < 24) rel = `${hours}h`
  else if (days < 30) rel = `${days}d`
  else if (months < 12) rel = `${months}mo`
  else rel = `${years}y`
  return isFuture ? `in ${rel}` : `${rel} ago`
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
  const savedScrollY = useRef(0)

  const [unsubTarget, setUnsubTarget] = useState<{ plugin: Plugin; idx: number } | null>(null)
  const [unsubbing, setUnsubbing] = useState<string | null>(null)
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null)

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
  const subs = gamePlugins?.subscriptions ?? []
  const activeSubs_ = subs.filter((s) => !s.subscription.is_revoked)
  const historySubs = subs.filter((s) => s.subscription.is_revoked)
  const totalMonthlyCost = activeSubs_.filter((s) => !s.is_cancelled).reduce((sum, { subscription }) => sum + (subscription.coins_per_month ?? 0), 0)

  // Compute how much each metric will be reduced when cancelled subs expire.
  // This is derived from the frontend subscription data so it's always accurate,
  // regardless of whether the API's pending_limits field is correct.
  const cancelledSubs = activeSubs_.filter((s) => s.is_cancelled)
  const pendingReduction = cancelledSubs.length > 0
    ? cancelledSubs.reduce(
        (acc, { subscription, plugin }) => {
          const n = subscription.stack_count ?? 0
          return {
            max_concurrent_users: acc.max_concurrent_users + plugin.ccu_grant * n,
            max_profiles: acc.max_profiles + plugin.profiles_grant * n,
            max_items: acc.max_items + plugin.items_grant * n,
            max_shops: acc.max_shops + plugin.shops_grant * n,
            max_quests: acc.max_quests + (plugin.quests_grant ?? 0) * n,
          }
        },
        { max_concurrent_users: 0, max_profiles: 0, max_items: 0, max_shops: 0, max_quests: 0 }
      )
    : null
  const subsByPluginId: Record<string, typeof subs[0]["subscription"][]> = {}
  activeSubs_.forEach(({ subscription, plugin }) => {
    if (!subsByPluginId[plugin.id]) subsByPluginId[plugin.id] = []
    subsByPluginId[plugin.id].push(subscription)
  })

  // Custom (admin-granted) plugins grouped by plugin ID
  const customGrantPlugins = Object.values(
    activeSubs_
      .filter((s) => s.plugin.plugin_type === "custom")
      .reduce((acc, { plugin, subscription }) => {
        if (!acc[plugin.id]) acc[plugin.id] = { plugin, totalStacks: 0 }
        acc[plugin.id].totalStacks += subscription.stack_count ?? 0
        return acc
      }, {} as Record<string, { plugin: Plugin; totalStacks: number }>)
  )

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Breadcrumb */}
      <div className="mb-2">
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
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}`}>{game?.name ?? gameId}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem><span>{t('plugins.materia.breadcrumb')}</span></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header — synced with /games/[id] */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/games/${gameId}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight leading-tight">{game?.name ?? gameId}</h1>
            <p className="text-xs text-muted-foreground">{t('plugins.materia.socketDesc')}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-4 md:mt-0 items-end">
          <GameNavButtons gameId={gameId} active="plugins" />
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
      </div>

      {/* ──────────────────────────────────────────
          EQUIPMENT PANEL  (the "game" as weapon)
         ────────────────────────────────────────── */}
      <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden">
        {/* subtle dark gradient strip */}
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-transparent pointer-events-none" />

        <div className="relative p-5 flex flex-col gap-4">

          {/* Materia Slot Visualizer — two columns: standard tiers | admin grants */}
          {!catalogLoading && catalog.length > 0 && gamePlugins && (
            <div className="flex gap-6 flex-wrap">
              {/* Left column: standard catalog tiers */}
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
              {/* Right column: admin grant rows */}
              {customGrantPlugins.length > 0 && (
                <div className="flex flex-col gap-2 border-l border-border/30 pl-6">
                  {customGrantPlugins.map(({ plugin, totalStacks }) => (
                    <div key={plugin.id} className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-xs font-semibold text-purple-400">{plugin.display_name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 rounded-full px-2 py-0.5">×{totalStacks}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">Admin Grant</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats row */}
          {game && (
            <TooltipProvider delayDuration={200}>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1 border-t border-border/50">
                {([
                  { label: t('plugins.ccu'), max: game.limits?.max_concurrent_users ?? null, reduction: pendingReduction?.max_concurrent_users, used: game.usage?.concurrent_users, icon: "👥", grantField: (p: Plugin) => p.ccu_grant },
                  { label: t('plugins.profiles'), max: game.limits?.max_player_profiles ?? null, reduction: pendingReduction?.max_profiles, used: game.usage?.player_profiles, icon: "👤", grantField: (p: Plugin) => p.profiles_grant },
                  { label: t('plugins.items'), max: game.limits?.max_items ?? null, reduction: pendingReduction?.max_items, used: game.usage?.items, icon: "📦", grantField: (p: Plugin) => p.items_grant },
                  { label: t('plugins.shops'), max: game.limits?.max_shops ?? null, reduction: pendingReduction?.max_shops, used: game.usage?.shops, icon: "🏪", grantField: (p: Plugin) => p.shops_grant },
                  { label: t('plugins.quests'), max: game.limits?.max_quests ?? null, reduction: pendingReduction?.max_quests, used: game.usage?.quests ?? 0, icon: "📜", grantField: (p: Plugin) => p.quests_grant ?? 0 },
                ] as { label: string; max: number | null; reduction?: number; used: number | undefined; icon: string; grantField: (p: Plugin) => number }[]).map((row) => {
                  const pct = (row.used != null && row.max != null && row.max > 0) ? Math.min(100, (row.used / row.max) * 100) : null
                  const numColor = pct == null ? "" : pct >= 90 ? "text-destructive" : pct >= 70 ? "text-yellow-500" : ""
                  const hasPending = pendingReduction != null && (row.reduction ?? 0) > 0
                  const contributions = activeSubs_
                    .map(({ subscription, plugin, is_cancelled }) => ({
                      name: plugin.display_name,
                      stacks: subscription.stack_count,
                      amount: row.grantField(plugin) * (subscription.stack_count ?? 0),
                      isCancelled: is_cancelled,
                    }))
                    .filter(c => c.amount > 0)
                  const totalFromPlugins = contributions.reduce((s, c) => s + c.amount, 0)
                  const base = Math.max(0, (row.max ?? 0) - totalFromPlugins)
                  return (
                    <Tooltip key={row.label}>
                      <TooltipTrigger asChild>
                        <div className="rounded-xl bg-muted/40 px-3 py-2 cursor-default">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-sm">{row.icon}</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{row.label}</span>
                          </div>
                          <p className={`text-base font-bold tabular-nums leading-none ${numColor}`}>
                            {row.used != null ? (
                              <>{formatNumber(row.used)}<span className="text-muted-foreground font-normal text-xs"> / {row.max != null ? formatNumber(row.max) : '∞'}</span></>
                            ) : (row.max != null ? formatNumber(row.max) : '∞')}
                            {hasPending && (
                              <span className="text-[10px] text-orange-400 font-normal ml-2">{formatNumber(row.max ?? 0)} → {formatNumber((row.max ?? 0) - (row.reduction ?? 0))} {t('plugins.materia.afterExpiry')}</span>
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
                      </TooltipTrigger>
                      {(contributions.length > 0 || base > 0) && (
                        <TooltipContent side="bottom" className="p-0 overflow-hidden min-w-[200px]">
                          <div className="px-3 py-2 bg-muted/60 border-b border-border/60">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{row.label} breakdown</p>
                          </div>
                          <div className="px-3 py-2 space-y-1">
                            {base > 0 && (
                              <div className="flex items-center justify-between gap-6 text-xs">
                                <span className="text-muted-foreground">Base</span>
                                <span className="font-semibold tabular-nums">+{formatNumber(base)}</span>
                              </div>
                            )}
                            {contributions.map((c, ci) => (
                              <div key={ci} className={`flex items-center justify-between gap-6 text-xs ${c.isCancelled ? "opacity-50" : ""}`}>
                                <span className={c.isCancelled ? "line-through text-muted-foreground" : ""}>{c.name} <span className="text-muted-foreground">×{c.stacks}</span></span>
                                <span className="font-semibold tabular-nums text-green-400">+{formatNumber(c.amount)}</span>
                              </div>
                            ))}
                            <div className="border-t border-border/60 pt-1 flex items-center justify-between gap-6 text-xs">
                              <span className="text-muted-foreground font-semibold">Total</span>
                              <span className="font-bold tabular-nums">{row.max != null ? formatNumber(row.max) : '∞'}</span>
                            </div>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )
                })}
              </div>
            </TooltipProvider>
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
                        { icon: "📜", label: t('plugins.materia.labelQuests'), val: plugin.quests_grant ?? 0 },
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
                        onClick={() => { savedScrollY.current = window.scrollY; setConfirmPlugin(plugin); setConfirmPluginIdx(idx); setConfirmStacks(1) }}
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
        {/* Admin Grant plugin cards */}
        {customGrantPlugins.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Admin Grants</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {customGrantPlugins.map(({ plugin, totalStacks }) => (
                <div
                  key={plugin.id}
                  className="relative flex flex-col rounded-2xl border-2 overflow-hidden border-purple-500/40 hover:border-purple-400/70 transition-all duration-300"
                >
                  {/* Hero */}
                  <div className="flex flex-col items-center justify-center py-7 gap-3 bg-purple-500/10">
                    <div
                      className="w-24 h-24 flex items-center justify-center rounded-full bg-purple-500/20 border-2 border-purple-500/40"
                      style={{ boxShadow: "0 0 24px rgba(168,85,247,0.35)" }}
                    >
                      <Zap className="h-12 w-12 text-purple-400" style={{ filter: "drop-shadow(0 0 8px #a855f7)" }} />
                    </div>
                    <span className="text-xs font-extrabold uppercase tracking-widest text-purple-400">{plugin.display_name}</span>
                  </div>
                  {/* Admin badge */}
                  <div className="px-4 pt-3 pb-1 text-center">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 rounded-full px-3 py-1">
                      🛡️ Admin Grant
                    </span>
                  </div>
                  {/* Stack count */}
                  <div className="px-4 py-2 flex flex-col items-center gap-1">
                    <span className="text-2xl font-extrabold text-purple-400 tabular-nums">×{totalStacks}</span>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {totalStacks === 1 ? "stack granted" : "stacks granted"}
                    </p>
                  </div>
                  {/* Grants breakdown */}
                  <div className="mx-4 my-2 rounded-xl bg-muted/40 px-3 py-2 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      Grants (total ×{totalStacks})
                    </p>
                    <div className="space-y-1 text-xs">
                      {([
                        { icon: "👥", label: "CCU", val: plugin.ccu_grant },
                        { icon: "👤", label: "Profiles", val: plugin.profiles_grant },
                        { icon: "📦", label: "Items", val: plugin.items_grant },
                        { icon: "🏪", label: "Shops", val: plugin.shops_grant },
                        { icon: "📜", label: "Quests", val: plugin.quests_grant ?? 0 },
                      ] as { icon: string; label: string; val: number }[]).map((r) => (
                        <div key={r.label} className="flex items-center justify-between">
                          <span className="text-muted-foreground">{r.icon} {r.label}</span>
                          <span className={`font-semibold tabular-nums ${r.val > 0 ? "text-purple-400" : "text-muted-foreground"}`}>
                            {r.val > 0 ? `+${formatNumber(r.val * totalStacks)}` : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                    {plugin.description && (
                      <p className="mt-2 text-[10px] text-muted-foreground italic border-t border-border/40 pt-2">{plugin.description}</p>
                    )}
                  </div>
                  {/* Footer */}
                  <div className="px-4 pb-4 pt-1 text-center">
                    <p className="text-[10px] text-muted-foreground">Granted by admin · Read-only</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
            {activeSubs_.map(({ subscription, plugin, is_cancelled, status }, i) => {
              const isExpired = subscription.expires_at ? new Date(subscription.expires_at) < new Date() : false
              const isRevoked = subscription.is_revoked
              const isCancelled = is_cancelled
              const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null
              const activatedAt = new Date(subscription.activated_at)
              const cancelledAt = subscription.cancelled_at ? new Date(subscription.cancelled_at) : null
              const revokedAt = subscription.revoked_at ? new Date(subscription.revoked_at) : null
              const renewedAt = new Date(subscription.renewed_at)
              const daysLeft = expiresAt
                ? Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000)
                : null
              const isExpanded = expandedSubId === subscription.id

              return (
                <div
                  key={subscription.id}
                  className={`rounded-xl border overflow-hidden ${
                    isCancelled ? "border-orange-500/20" : isExpired ? "border-border/50" : "border-border"
                  }`}
                >
                  {/* Row header — clickable */}
                  <div
                    className={`flex items-center justify-between px-4 py-3 gap-4 cursor-pointer select-none transition-colors hover:bg-muted/40 ${
                      isCancelled ? "bg-orange-500/5" : isExpired ? "bg-muted/20 opacity-60" : "bg-card"
                    }`}
                    onClick={() => setExpandedSubId(isExpanded ? null : subscription.id)}
                  >
                    {/* Left: index + plugin name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[10px] font-mono text-muted-foreground w-5 text-right shrink-0">#{i + 1}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{plugin.display_name}</span>
                          {plugin.plugin_type === "custom" && (
                            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">Admin Grant</span>
                          )}
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

                    {/* Right: expiry info + chevron */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        {isCancelled ? (
                          <>
                            <p className="text-xs text-orange-400 font-semibold">{t('plugins.materia.willNotRenew')}</p>
                            {expiresAt && (
                              <>
                                <p className={`text-xs font-semibold ${isExpired ? "text-destructive" : daysLeft !== null && daysLeft <= 7 ? "text-yellow-400" : "text-muted-foreground"}`}>
                                  {isExpired
                                    ? `${t('plugins.materia.statusExpired')} (${Math.abs(daysLeft!) === 0 ? t('plugins.materia.today') : `${Math.abs(daysLeft!)}d ago`})`
                                    : `${daysLeft}${t('plugins.materia.daysLeft')}`}
                                </p>
                                <p className="text-[10px] text-muted-foreground">{expiresAt.toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                              </>
                            )}
                          </>
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
                      <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  {isExpanded && (
                    <div className="border-t border-border/60 bg-muted/20 px-5 py-4 space-y-4">
                      {/* Subscription details */}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Subscription</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">ID</span>
                            <span className="font-mono text-[10px] break-all">{subscription.id}</span>
                            <CopyButton text={subscription.id} size="h-3 w-3" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Plugin ID</span>
                            <span className="font-mono text-[10px] break-all">{subscription.plugin_id}</span>
                            <CopyButton text={subscription.plugin_id} size="h-3 w-3" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Stacks</span>
                            <span className="font-semibold">{subscription.stack_count}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Cost/month</span>
                            <span className="font-semibold">{subscription.coins_per_month > 0 ? `🪙 ${subscription.coins_per_month.toLocaleString()}` : "Free"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Status</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${
                              status === "active" ? "bg-green-500/15 text-green-400 border-green-500/30" :
                              status === "cancelled" ? "bg-orange-500/15 text-orange-400 border-orange-500/30" :
                              status === "revoked" ? "bg-destructive/15 text-destructive border-destructive/30" :
                              "bg-muted text-muted-foreground border-border"
                            }`}>{status ?? "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Activated by</span>
                            <span className="font-mono text-[10px]">{subscription.activated_by.slice(0, 8)}…</span>
                            <CopyButton text={subscription.activated_by} size="h-3 w-3" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Activated at</span>
                            <span>{activatedAt.toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}{" "}<span className="text-muted-foreground/60">{timeAgo(activatedAt)}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Renewed at</span>
                            <span>{renewedAt.toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}{" "}<span className="text-muted-foreground/60">{timeAgo(renewedAt)}</span></span>
                          </div>
                          {expiresAt && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground w-28 shrink-0">Expires at</span>
                              <span className={isExpired ? "text-destructive" : daysLeft !== null && daysLeft <= 7 ? "text-yellow-500" : ""}>{expiresAt.toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}{" "}<span className="text-muted-foreground/60">{timeAgo(expiresAt)}</span></span>
                            </div>
                          )}
                          {cancelledAt && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground w-28 shrink-0">Cancelled at</span>
                              <span className="text-orange-400">{cancelledAt.toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}{" "}<span className="text-muted-foreground/60">{timeAgo(cancelledAt)}</span></span>
                            </div>
                          )}
                          {revokedAt && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground w-28 shrink-0">Revoked at</span>
                              <span className="text-destructive">{revokedAt.toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}{" "}<span className="text-muted-foreground/60">{timeAgo(revokedAt)}</span></span>
                            </div>
                          )}
                          {subscription.revoked_by && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground w-28 shrink-0">Revoked by</span>
                              <span className="font-mono text-[10px]">{subscription.revoked_by.slice(0, 8)}…</span>
                              <CopyButton text={subscription.revoked_by} size="h-3 w-3" />
                            </div>
                          )}
                          {subscription.note?.trim() && (
                            <div className="flex items-center gap-1.5 col-span-2">
                              <span className="text-muted-foreground w-28 shrink-0">Note</span>
                              <span className="italic">{subscription.note}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Plugin details */}
                      <div className="border-t border-border/40 pt-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Plugin</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">ID</span>
                            <span className="font-mono text-[10px] break-all">{plugin.id}</span>
                            <CopyButton text={plugin.id} size="h-3 w-3" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Type</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${plugin.plugin_type === "standard" ? "bg-blue-500/15 text-blue-400 border-blue-500/30" : "bg-muted text-muted-foreground border-border"}`}>{plugin.plugin_type}</span>
                          </div>
                          {plugin.description?.trim() && (
                            <div className="flex items-start gap-1.5 col-span-2">
                              <span className="text-muted-foreground w-28 shrink-0">Description</span>
                              <span>{plugin.description}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">CCU grant</span>
                            <span className="font-semibold">+{formatNumber(plugin.ccu_grant)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Profiles grant</span>
                            <span className="font-semibold">+{formatNumber(plugin.profiles_grant)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Items grant</span>
                            <span className="font-semibold">+{formatNumber(plugin.items_grant)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Shops grant</span>
                            <span className="font-semibold">+{plugin.shops_grant}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Quests grant</span>
                            <span className="font-semibold">+{formatNumber(plugin.quests_grant ?? 0)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Cost coins</span>
                            <span className="font-semibold">{plugin.cost_coins > 0 ? `🪙 ${plugin.cost_coins.toLocaleString()}` : "Free"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Max stacks</span>
                            <span className="font-semibold">{plugin.max_stacks || "∞"}</span>
                          </div>
                          {plugin.is_template !== undefined && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground w-28 shrink-0">Is template</span>
                              <span className="font-semibold">{plugin.is_template ? "Yes" : "No"}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Created at</span>
                            <span>{new Date(plugin.created_at).toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}{" "}<span className="text-muted-foreground/60">{timeAgo(new Date(plugin.created_at))}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Updated at</span>
                            <span>{new Date(plugin.updated_at).toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}{" "}<span className="text-muted-foreground/60">{timeAgo(new Date(plugin.updated_at))}</span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
            {historySubs.map(({ subscription, plugin, is_cancelled, status }, i) => {
              const isRevoked = subscription.is_revoked
              const isCancelled = is_cancelled
              const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null
              const activatedAt = new Date(subscription.activated_at)
              const cancelledAt = subscription.cancelled_at ? new Date(subscription.cancelled_at) : null
              const revokedAt = subscription.revoked_at ? new Date(subscription.revoked_at) : null
              const renewedAt = new Date(subscription.renewed_at)
              const isExpanded = expandedSubId === subscription.id

              return (
                <div
                  key={subscription.id}
                  className="rounded-xl border border-border/50 overflow-hidden"
                >
                  {/* Row header — clickable */}
                  <div
                    className="flex items-center justify-between px-4 py-3 gap-4 bg-muted/10 opacity-50 hover:opacity-80 transition-opacity cursor-pointer select-none hover:bg-muted/30"
                    onClick={() => setExpandedSubId(isExpanded ? null : subscription.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[10px] font-mono text-muted-foreground w-5 text-right shrink-0">#{i + 1}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-muted-foreground">{plugin.display_name}</span>
                          {plugin.plugin_type === "custom" && (
                            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">Admin Grant</span>
                          )}
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
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        {expiresAt ? (
                          <p className="text-[10px] text-muted-foreground">{expiresAt.toLocaleDateString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric" })}</p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">{t('plugins.permanent')}</p>
                        )}
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  {isExpanded && (
                    <div className="border-t border-border/40 bg-muted/10 px-5 py-4 space-y-4">
                      {/* Subscription details */}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Subscription</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">ID</span>
                            <span className="font-mono text-[10px] break-all">{subscription.id}</span>
                            <CopyButton text={subscription.id} size="h-3 w-3" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Plugin ID</span>
                            <span className="font-mono text-[10px] break-all">{subscription.plugin_id}</span>
                            <CopyButton text={subscription.plugin_id} size="h-3 w-3" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Stacks</span>
                            <span className="font-semibold">{subscription.stack_count}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Cost/month</span>
                            <span className="font-semibold">{subscription.coins_per_month > 0 ? `🪙 ${subscription.coins_per_month.toLocaleString()}` : "Free"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Status</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${
                              status === "active" ? "bg-green-500/15 text-green-400 border-green-500/30" :
                              status === "cancelled" ? "bg-orange-500/15 text-orange-400 border-orange-500/30" :
                              status === "revoked" ? "bg-destructive/15 text-destructive border-destructive/30" :
                              "bg-muted text-muted-foreground border-border"
                            }`}>{status ?? "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Activated by</span>
                            <span className="font-mono text-[10px]">{subscription.activated_by.slice(0, 8)}…</span>
                            <CopyButton text={subscription.activated_by} size="h-3 w-3" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Activated at</span>
                            <span>{activatedAt.toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}{" "}<span className="text-muted-foreground/60">{timeAgo(activatedAt)}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Renewed at</span>
                            <span>{renewedAt.toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}{" "}<span className="text-muted-foreground/60">{timeAgo(renewedAt)}</span></span>
                          </div>
                          {expiresAt && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground w-28 shrink-0">Expires at</span>
                              <span>{expiresAt.toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}{" "}<span className="text-muted-foreground/60">{timeAgo(expiresAt)}</span></span>
                            </div>
                          )}
                          {cancelledAt && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground w-28 shrink-0">Cancelled at</span>
                              <span className="text-orange-400">{cancelledAt.toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}{" "}<span className="text-muted-foreground/60">{timeAgo(cancelledAt)}</span></span>
                            </div>
                          )}
                          {revokedAt && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground w-28 shrink-0">Revoked at</span>
                              <span className="text-destructive">{revokedAt.toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}{" "}<span className="text-muted-foreground/60">{timeAgo(revokedAt)}</span></span>
                            </div>
                          )}
                          {subscription.revoked_by && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground w-28 shrink-0">Revoked by</span>
                              <span className="font-mono text-[10px]">{subscription.revoked_by.slice(0, 8)}…</span>
                              <CopyButton text={subscription.revoked_by} size="h-3 w-3" />
                            </div>
                          )}
                          {subscription.note?.trim() && (
                            <div className="flex items-center gap-1.5 col-span-2">
                              <span className="text-muted-foreground w-28 shrink-0">Note</span>
                              <span className="italic">{subscription.note}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Plugin details */}
                      <div className="border-t border-border/40 pt-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Plugin</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">ID</span>
                            <span className="font-mono text-[10px] break-all">{plugin.id}</span>
                            <CopyButton text={plugin.id} size="h-3 w-3" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Type</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${plugin.plugin_type === "standard" ? "bg-blue-500/15 text-blue-400 border-blue-500/30" : "bg-muted text-muted-foreground border-border"}`}>{plugin.plugin_type}</span>
                          </div>
                          {plugin.description?.trim() && (
                            <div className="flex items-start gap-1.5 col-span-2">
                              <span className="text-muted-foreground w-28 shrink-0">Description</span>
                              <span>{plugin.description}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">CCU grant</span>
                            <span className="font-semibold">+{formatNumber(plugin.ccu_grant)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Profiles grant</span>
                            <span className="font-semibold">+{formatNumber(plugin.profiles_grant)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Items grant</span>
                            <span className="font-semibold">+{formatNumber(plugin.items_grant)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Shops grant</span>
                            <span className="font-semibold">+{plugin.shops_grant}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Quests grant</span>
                            <span className="font-semibold">+{formatNumber(plugin.quests_grant ?? 0)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Cost coins</span>
                            <span className="font-semibold">{plugin.cost_coins > 0 ? `🪙 ${plugin.cost_coins.toLocaleString()}` : "Free"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Max stacks</span>
                            <span className="font-semibold">{plugin.max_stacks || "∞"}</span>
                          </div>
                          {plugin.is_template !== undefined && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground w-28 shrink-0">Is template</span>
                              <span className="font-semibold">{plugin.is_template ? "Yes" : "No"}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Created at</span>
                            <span>{new Date(plugin.created_at).toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}{" "}<span className="text-muted-foreground/60">{timeAgo(new Date(plugin.created_at))}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-28 shrink-0">Updated at</span>
                            <span>{new Date(plugin.updated_at).toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}{" "}<span className="text-muted-foreground/60">{timeAgo(new Date(plugin.updated_at))}</span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
      <AlertDialog open={!!confirmPlugin} onOpenChange={(o) => { if (!o) { setConfirmPlugin(null); const y = savedScrollY.current; requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' })) } }}>
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
                      { label: t('plugins.materia.labelQuests'), val: (confirmPlugin.quests_grant ?? 0) * confirmStacks },
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
