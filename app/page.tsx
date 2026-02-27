"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  BarChart2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Gamepad2,
  Layers,
  Moon,
  Plus,
  RefreshCw,
  Sparkles,
  Sunrise,
  Sunset,
  Sun,
  Users,
  Zap,
} from "lucide-react"

import { fetchUserStudios } from "@/lib/studio-api"
import { getStudioGames } from "@/lib/game-api"
import { api } from "@/lib/api-client"
import { useAuth } from "@/contexts/auth-context"
import { useTranslation } from "@/lib/i18n/use-translation"
import type { Studio } from "@/types/studio"
import type { Game } from "@/types/game"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getUserLocalHour } from "@/lib/utils/date-utils"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number | undefined | null): string {
  if (n == null) return "—"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function pct(used?: number, max?: number): number | null {
  if (used == null || max == null || max === 0) return null
  return Math.min(100, (used / max) * 100)
}

function UsageBar({ used, max }: { used?: number; max?: number }) {
  const p = pct(used, max)
  if (p == null) return null
  const barColor = p >= 90 ? "bg-destructive" : p >= 70 ? "bg-yellow-500" : "bg-primary"
  return (
    <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${p}%` }} />
    </div>
  )
}

function StatChip({
  icon, label, value, sub, href, color = "text-primary",
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  href?: string
  color?: string
}) {
  const inner = (
    <div className={`flex flex-col gap-1.5 rounded-xl border bg-card px-4 py-3 h-full transition-colors${href ? " hover:bg-muted/50 hover:border-primary/40 cursor-pointer group" : ""}`}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wide">
        <span className={color}>{icon}</span>
        <span className="flex-1">{label}</span>
        {href && <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />}
      </div>
      <div className="text-2xl font-extrabold tabular-nums leading-none">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
  if (href) return <Link href={href} className="contents">{inner}</Link>
  return inner
}

function GameStatusDot({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    released: "bg-green-500", beta: "bg-blue-500", alpha: "bg-purple-500",
    development: "bg-yellow-500", archived: "bg-gray-400",
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status ?? ""] ?? "bg-gray-400"} shrink-0`} />
}

// ---------------------------------------------------------------------------
// Studio Card
// ---------------------------------------------------------------------------

function StudioCard({ studio }: { studio: Studio }) {
  const [games, setGames] = useState<Game[]>([])
  const [loadingGames, setLoadingGames] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    getStudioGames(studio.id, 30)
      .then(setGames)
      .catch(() => setGames([]))
      .finally(() => setLoadingGames(false))
  }, [studio.id])

  const activeGames = games.filter((g) => g.is_active)
  const totalCCU = games.reduce((s, g) => s + (g.limits?.max_concurrent_users ?? 0), 0)
  const usedCCU = games.reduce((s, g) => s + (g.usage?.concurrent_users ?? 0), 0)
  const gamesUsed = studio.usage?.games ?? games.length
  const gamesMax = studio.limits?.max_games ?? null

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-extrabold text-lg select-none">
            {studio.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <Link href={`/studios/${studio.id}`} className="text-base font-bold hover:text-primary transition-colors truncate flex items-center gap-1">
              {studio.name}
              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" />
            </Link>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{studio.tier}</span>
            </div>
          </div>
        </div>
        <Link href={`/games/new?studio_id=${studio.id}`} className="shrink-0">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Game
          </Button>
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 px-5 pb-4">
        <div className="rounded-xl bg-muted/40 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Games</p>
          {loadingGames
            ? <span className="inline-block h-5 w-8 animate-pulse rounded bg-muted" />
            : <p className="text-lg font-bold tabular-nums leading-tight">
                {gamesUsed}{gamesMax != null && <span className="text-xs text-muted-foreground font-normal">/{gamesMax}</span>}
              </p>
          }
          {gamesMax && !loadingGames && <UsageBar used={gamesUsed} max={gamesMax} />}
        </div>
        <div className="rounded-xl bg-muted/40 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">CCU Cap</p>
          {loadingGames
            ? <span className="inline-block h-5 w-12 animate-pulse rounded bg-muted" />
            : <p className="text-lg font-bold tabular-nums leading-tight">{fmt(totalCCU)}</p>
          }
          {!loadingGames && usedCCU > 0 && <UsageBar used={usedCCU} max={totalCCU} />}
        </div>
        <div className="rounded-xl bg-muted/40 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Active</p>
          {loadingGames
            ? <span className="inline-block h-5 w-6 animate-pulse rounded bg-muted" />
            : <p className="text-lg font-bold tabular-nums leading-tight text-green-500">{activeGames.length}</p>
          }
        </div>
      </div>

      {/* Game list */}
      {!loadingGames && games.length > 0 && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-2 border-t border-border/40 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
          >
            <span>{expanded ? "Hide" : "Show"} {games.length} game{games.length !== 1 ? "s" : ""}</span>
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          {expanded && (
            <div className="divide-y divide-border/30 flex-1">
              {games.map((game) => {
                const p = pct(game.usage?.concurrent_users, game.limits?.max_concurrent_users)
                return (
                  <Link key={game.id} href={`/games/${game.id}`}
                    className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/30 transition-colors group"
                  >
                    <GameStatusDot status={game.status} />
                    <span className="flex-1 text-sm font-medium truncate group-hover:text-primary transition-colors">{game.name}</span>
                    {game.limits?.max_concurrent_users != null && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                        <Users className="h-3 w-3" />
                        {fmt(game.usage?.concurrent_users ?? 0)}/{fmt(game.limits.max_concurrent_users)}
                        {p != null && (
                          <span className="w-12 h-1.5 rounded-full bg-muted overflow-hidden inline-block align-middle">
                            <span className={`block h-full rounded-full ${p >= 90 ? "bg-destructive" : p >= 70 ? "bg-yellow-500" : "bg-primary"}`} style={{ width: `${p}%` }} />
                          </span>
                        )}
                      </span>
                    )}
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary shrink-0" />
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}

      {!loadingGames && games.length === 0 && (
        <div className="px-5 py-6 text-center border-t border-border/40">
          <p className="text-sm text-muted-foreground mb-3">No games yet</p>
          <Link href={`/games/new?studio_id=${studio.id}`}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Create first game
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user } = useAuth()
  const { t } = useTranslation()

  const [studios, setStudios] = useState<Studio[]>([])
  const [wallet, setWallet] = useState<{ balance: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [studiosData, walletData] = await Promise.all([
        fetchUserStudios(),
        api.get("/api/v1/coins/wallet").catch(() => null),
      ])
      setStudios(studiosData)
      setWallet(walletData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  const [greeting, setGreeting] = useState({ text: "", icon: null as React.ReactNode })
  useEffect(() => {
    const update = () => {
      const hour = getUserLocalHour()
      if (hour < 5 || hour >= 22) setGreeting({ text: "Good night", icon: <Moon className="inline h-4 w-4 mb-0.5 text-indigo-400" /> })
      else if (hour < 12) setGreeting({ text: "Good morning", icon: <Sunrise className="inline h-4 w-4 mb-0.5 text-amber-400" /> })
      else if (hour < 18) setGreeting({ text: "Good afternoon", icon: <Sun className="inline h-4 w-4 mb-0.5 text-yellow-400" /> })
      else setGreeting({ text: "Good evening", icon: <Sunset className="inline h-4 w-4 mb-0.5 text-orange-400" /> })
    }
    update()
    const interval = setInterval(update, 60_000)
    return () => clearInterval(interval)
  }, [])
  const displayName = user?.display_name || user?.username || "there"

  const totalGamesUsed = studios.reduce((s, st) => s + (st.usage?.games ?? 0), 0)
  const totalGamesMax = studios.reduce((s, st) => s + (st.limits?.max_games ?? 0), 0)
  const totalMembers = studios.reduce((s, st) => s + (st.usage?.total_members ?? 0), 0)
  const activeStudios = studios.filter((s) => s.is_active).length

  return (
    <div className="container mx-auto py-6 space-y-8">

      {/* ── Greeting ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{greeting.icon} {greeting.text} 👋</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{displayName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's an overview of your studios and games.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setRefreshKey((k) => k + 1)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/payment">
            <Button size="sm" className="gap-1.5">
              <Sparkles className="h-4 w-4" /> Buy Coins
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip
          icon={<Layers className="h-4 w-4" />}
          label="Studios"
          value={loading ? <Skeleton className="h-7 w-10 inline-block" /> : studios.length}
          sub={`${activeStudios} active`}
          href="/studios"
          color="text-primary"
        />
        <StatChip
          icon={<Gamepad2 className="h-4 w-4" />}
          label="Games"
          value={loading ? <Skeleton className="h-7 w-10 inline-block" /> : totalGamesUsed}
          sub={totalGamesMax > 0 ? `of ${totalGamesMax} capacity` : "across all studios"}
          href="/games"
          color="text-blue-500"
        />
        <StatChip
          icon={<Users className="h-4 w-4" />}
          label="Members"
          value={loading ? <Skeleton className="h-7 w-10 inline-block" /> : totalMembers}
          sub="across all studios"
          color="text-green-500"
        />
        <StatChip
          icon={<span className="text-base leading-none">🪙</span>}
          label="Coin Balance"
          value={loading || wallet === null
            ? <Skeleton className="h-7 w-16 inline-block" />
            : wallet.balance.toLocaleString()
          }
          sub="in your wallet"
          href="/payment"
          color="text-yellow-500"
        />
      </div>

      {/* ── Quick actions ── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/studios"><Button variant="outline" size="sm" className="gap-1.5"><Layers className="h-3.5 w-3.5" /> My Studios</Button></Link>
          <Link href="/games"><Button variant="outline" size="sm" className="gap-1.5"><Gamepad2 className="h-3.5 w-3.5" /> All Games</Button></Link>
          <Link href="/payment?tab=transactions"><Button variant="outline" size="sm" className="gap-1.5"><BarChart2 className="h-3.5 w-3.5" /> Transactions</Button></Link>
          <Link href="/profile"><Button variant="outline" size="sm" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Profile</Button></Link>
          {user?.capabilities?.is_super_admin && (
            <Link href="/admin/users">
              <Button variant="outline" size="sm" className="gap-1.5 border-destructive/50 text-destructive hover:text-destructive hover:bg-destructive/10">
                <Zap className="h-3.5 w-3.5" /> Admin Panel
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Studios section ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Your Studios</p>
          <div className="flex-1 h-px bg-border" />
          <Link href="/studios">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-52 w-full rounded-2xl" />)}
          </div>
        ) : studios.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center space-y-4">
            <Layers className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <div>
              <p className="font-semibold">No studios yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first studio to get started.</p>
            </div>
            <Link href="/studios">
              <Button className="gap-1.5 mt-2"><Plus className="h-4 w-4" /> Create Studio</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {studios.map((studio) => <StudioCard key={studio.id} studio={studio} />)}
          </div>
        )}
      </div>
    </div>
  )
}
