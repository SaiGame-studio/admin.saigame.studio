"use client"

import { Fragment, Suspense, useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCapabilities } from "@/hooks/use-capabilities"
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  Database,
  MessageSquare,
  Send,
  Loader2,
  CalendarDays,
  MailX,
  ShieldCheck,
  Users,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import {
  getWorkersStatus,
  WorkersStatusResult,
  Worker,
  triggerSystemMonitorNotify,
  triggerPlatformReport,
  triggerReportBackfill,
  getAllStudiosAdmin,
  getAllGamesAdmin,
  AdminStudio,
  AdminGame,
  listEmailBlacklist,
  updateEmailBlacklistStatus,
  addEmailToBlacklist,
  EmailBlacklistEntry,
  getCCUOverview,
  CCUOverviewResult,
  CCUGameEntry,
} from "@/lib/admin-api"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatISORelative(iso?: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

// ---------------------------------------------------------------------------
// Worker name → API trigger mapping
// ---------------------------------------------------------------------------

const TRIGGERABLE_WORKERS: Record<string, { label: string; type: "simple" | "date" | "backfill" }> = {
  system_monitor: { label: "Send Notify", type: "simple" },
  activity_summary: { label: "Send Report", type: "date" },
  aggregation_cron: { label: "Backfill", type: "backfill" },
}

function getTriggerConfig(workerName: string) {
  const key = workerName.toLowerCase().replace(/[\s-]+/g, "_")
  for (const [pattern, config] of Object.entries(TRIGGERABLE_WORKERS)) {
    if (key.includes(pattern)) return config
  }
  return null
}

// Simple trigger button (System Monitor)
function SimpleTriggerButton({ workerName }: { workerName: string }) {
  const [loading, setLoading] = useState(false)

  async function handleTrigger() {
    setLoading(true)
    try {
      await triggerSystemMonitorNotify()
      toast({ title: "Triggered", description: `${workerName} notification sent.` })
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleTrigger} disabled={loading} className="flex items-center gap-1.5">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
      Send Notify
    </Button>
  )
}

// Date trigger button (Platform Notification)
function DateTriggerButton({ workerName }: { workerName: string }) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  async function handleTrigger() {
    setLoading(true)
    try {
      await triggerPlatformReport(date || undefined)
      toast({ title: "Triggered", description: `Platform report${date ? ` for ${date}` : ""} sent.` })
      setOpen(false)
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          Send Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Platform Report</DialogTitle>
          <DialogDescription>Send platform overview report via Telegram. Leave date empty for today.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="report-date">Date (optional)</Label>
            <Input id="report-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleTrigger} disabled={loading} className="flex items-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Backfill trigger dialog (Report Aggregation)
function BackfillTriggerButton({ workerName }: { workerName: string }) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [dates, setDates] = useState(() => new Date().toISOString().slice(0, 10))

  // Studios
  const [studios, setStudios] = useState<AdminStudio[]>([])
  const [selectedStudio, setSelectedStudio] = useState<AdminStudio | null>(null)
  const [studioOpen, setStudioOpen] = useState(false)

  // Games (filtered by selected studio)
  const [games, setGames] = useState<AdminGame[]>([])
  const [selectedGame, setSelectedGame] = useState<AdminGame | null>(null)
  const [gameOpen, setGameOpen] = useState(false)

  // Load studios when dialog opens
  useEffect(() => {
    if (!open) return
    getAllStudiosAdmin().then((r) => setStudios(r.studios)).catch(() => {})
  }, [open])

  // Load games when studio changes
  useEffect(() => {
    setSelectedGame(null)
    setGames([])
    if (!selectedStudio) return
    getAllGamesAdmin({ studio_id: selectedStudio.id }).then((r) => setGames(r.games)).catch(() => {})
  }, [selectedStudio])

  async function handleTrigger() {
    const dateList = dates
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean)
    if (!selectedStudio || !selectedGame || dateList.length === 0) {
      toast({ title: "Validation", description: "Studio, Game and at least 1 date required.", variant: "destructive" })
      return
    }
    if (dateList.length > 7) {
      toast({ title: "Validation", description: "Max 7 dates per request.", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      await triggerReportBackfill({ studio_id: selectedStudio.id, game_id: selectedGame.id, dates: dateList })
      toast({ title: "Triggered", description: `Backfill started for ${dateList.length} date(s).` })
      setOpen(false)
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5" />
          Backfill
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Trigger Report Backfill</DialogTitle>
          <DialogDescription>Run aggregation for specific dates (max 7 dates per request).</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {/* Studio searchable dropdown */}
          <div className="space-y-1.5">
            <Label>Studio</Label>
            <Popover open={studioOpen} onOpenChange={setStudioOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={studioOpen} className="w-full justify-between font-normal">
                  {selectedStudio ? selectedStudio.name : "Select a studio..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search studios..." />
                  <CommandList>
                    <CommandEmpty>No studios found.</CommandEmpty>
                    <CommandGroup>
                      {studios.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={`${s.name} ${s.id}`}
                          onSelect={() => {
                            setSelectedStudio(s)
                            setStudioOpen(false)
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${selectedStudio?.id === s.id ? "opacity-100" : "opacity-0"}`} />
                          <span>{s.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground font-mono">{s.id.slice(0, 8)}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Game searchable dropdown */}
          <div className="space-y-1.5">
            <Label>Game</Label>
            <Popover open={gameOpen} onOpenChange={setGameOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={gameOpen}
                  disabled={!selectedStudio}
                  className="w-full justify-between font-normal"
                >
                  {selectedGame ? selectedGame.name : "Select a game..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search games..." />
                  <CommandList>
                    <CommandEmpty>No games found.</CommandEmpty>
                    <CommandGroup>
                      {games.map((g) => (
                        <CommandItem
                          key={g.id}
                          value={`${g.name} ${g.id}`}
                          onSelect={() => {
                            setSelectedGame(g)
                            setGameOpen(false)
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${selectedGame?.id === g.id ? "opacity-100" : "opacity-0"}`} />
                          <span>{g.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground font-mono">{g.id.slice(0, 8)}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Dates */}
          <div className="space-y-1.5">
            <Label htmlFor="backfill-dates">Dates (comma-separated, YYYY-MM-DD)</Label>
            <Input id="backfill-dates" placeholder="2026-03-25, 2026-03-24" value={dates} onChange={(e) => setDates(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleTrigger} disabled={loading} className="flex items-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Trigger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function WorkerTriggerButton({ worker }: { worker: Worker }) {
  const config = getTriggerConfig(worker.name)
  if (!config) return null

  switch (config.type) {
    case "simple":
      return <SimpleTriggerButton workerName={worker.name} />
    case "date":
      return <DateTriggerButton workerName={worker.name} />
    case "backfill":
      return <BackfillTriggerButton workerName={worker.name} />
    default:
      return null
  }
}

function WorkerCard({ worker }: { worker: Worker }) {
  const details = worker.details
  const meta = worker.meta
  const detailEntries = details ? Object.entries(details) : []

  return (
    <Card className="flex flex-col">
      {/* Header: name + status badge */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold font-mono">{worker.name}</CardTitle>
            <div className="flex flex-col gap-0.5 mt-1">
              {(worker.last_run ?? worker.last_event_at) && (
                <CardDescription className="flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3 shrink-0" />
                  Last run: {formatISORelative(worker.last_run ?? worker.last_event_at)}
                </CardDescription>
              )}
              {worker.next_notify_at && (
                <CardDescription className="flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3 shrink-0 text-blue-400" />
                  Next notify: {formatISORelative(worker.next_notify_at)}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <WorkerTriggerButton worker={worker} />
            {worker.running ? (
              <Badge variant="default" className="bg-green-600/90 text-white flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Running
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Stopped
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex flex-col gap-4">

        {/* Description */}
        {meta?.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{meta.description}</p>
        )}

        {/* Runtime details key-value */}
        {detailEntries.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Runtime Config</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md bg-muted/40 px-3 py-2 text-xs font-mono">
              {detailEntries.map(([k, v]) => (
                <div key={k} className="contents">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-foreground break-all">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collects data */}
        {meta?.collects_data && meta.collects_data.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Database className="h-3 w-3" /> Data Sources
            </p>
            <ul className="space-y-1">
              {meta.collects_data.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                  <span className="text-muted-foreground font-mono">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Telegram preview */}
        {meta?.telegram_preview && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Telegram Preview
              <span className="ml-1 font-mono font-normal normal-case text-muted-foreground/60">{meta.telegram_preview.chat_id}</span>
            </p>
            <pre className="whitespace-pre-wrap break-words rounded-md bg-muted/50 border px-3 py-2 text-xs leading-relaxed font-mono text-foreground/80">
              {meta.telegram_preview.text}
            </pre>
          </div>
        )}

      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// CCU Tab
// ---------------------------------------------------------------------------

function CCUTab() {
  const [data, setData] = useState<CCUOverviewResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getCCUOverview()
      setData(result)
    } catch (err) {
      console.error("Failed to load CCU overview", err)
      setError("Failed to load CCU overview")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function tierColor(tier: string) {
    switch (tier) {
      case "legendary": return "bg-yellow-500/90 text-white"
      case "epic": return "bg-purple-600/90 text-white"
      case "rare": return "bg-blue-600/90 text-white"
      case "common": return "bg-gray-500/90 text-white"
      default: return ""
    }
  }

  function utilizationColor(pct: number) {
    if (pct >= 90) return "bg-red-500"
    if (pct >= 70) return "bg-yellow-500"
    return "bg-green-500"
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">CCU Overview</h2>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      {!loading && !error && data && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Games</p>
              <p className="text-2xl font-bold">{data.total_games}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total CCU</p>
              <p className="text-2xl font-bold">{data.total_ccu.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Capacity</p>
              <p className="text-2xl font-bold">{data.total_capacity.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Utilization</p>
              <p className="text-2xl font-bold">{data.total_utilization_pct.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-4 text-destructive text-sm">{error}</CardContent>
        </Card>
      )}

      {loading && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-4"><Skeleton className="h-10 w-full" /></CardContent></Card>
            ))}
          </div>
          <Card><CardContent className="pt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent></Card>
        </div>
      )}

      {/* Games table */}
      {!loading && !error && data && (
        <Card>
          <CardContent className="pt-4 p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Game</th>
                    <th className="px-4 py-2 font-medium">Tier</th>
                    <th className="px-4 py-2 font-medium text-right">CCU</th>
                    <th className="px-4 py-2 font-medium text-right">Limit</th>
                    <th className="px-4 py-2 font-medium text-right">Utilization</th>
                    <th className="px-4 py-2 font-medium w-[200px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.games.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No games found.</td>
                    </tr>
                  )}
                  {data.games.map((game) => (
                    <tr key={game.game_id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-2">
                        <div className="font-medium text-sm">{game.game_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{game.game_id.slice(0, 8)}</div>
                      </td>
                      <td className="px-4 py-2">
                        <Badge className={`text-xs capitalize ${tierColor(game.plugin_tier)}`}>{game.plugin_tier}</Badge>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-sm">{game.current_ccu.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right font-mono text-sm text-muted-foreground">{game.limit.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right font-mono text-sm">{game.utilization_pct.toFixed(1)}%</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${utilizationColor(game.utilization_pct)}`}
                              style={{ width: `${Math.min(100, game.utilization_pct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Workers Tab
// ---------------------------------------------------------------------------

function WorkersTab() {
  const [data, setData] = useState<WorkersStatusResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getWorkersStatus()
      setData(result)
    } catch (err) {
      console.error("Failed to load workers status", err)
      setError("Failed to load worker status")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const running = data?.workers.filter((w) => w.running).length ?? 0
  const stopped = data?.workers.filter((w) => !w.running).length ?? 0

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Worker Status</h2>
          {data && !loading && (
            <span className="text-xs text-muted-foreground">
              Collected at {formatISORelative(data.collected_at)}
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary badges */}
      {!loading && !error && data && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1 text-xs">
            <Server className="h-3 w-3" />
            {data.workers.length} workers
          </Badge>
          <Badge variant="default" className="bg-green-600/90 text-white flex items-center gap-1 text-xs">
            <CheckCircle2 className="h-3 w-3" />
            {running} running
          </Badge>
          {stopped > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <XCircle className="h-3 w-3" />
              {stopped} stopped
            </Badge>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-4 text-destructive text-sm">{error}</CardContent>
        </Card>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24 mt-1" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Workers grid */}
      {!loading && !error && data && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {data.workers.map((worker) => (
            <WorkerCard key={worker.name} worker={worker} />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mail Block Tab
// ---------------------------------------------------------------------------

function MailBlockTab() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialStatus = searchParams.get("status") || "all"
  const initialPage = Number(searchParams.get("page")) || 1

  const [entries, setEntries] = useState<EmailBlacklistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(initialPage)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [allowingId, setAllowingId] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addEmail, setAddEmail] = useState("")
  const [addReason, setAddReason] = useState("")
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [searchDebounced, setSearchDebounced] = useState(search)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  // Sync filter state to URL
  const updateUrl = useCallback((p: number, status: string, s?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("status", status)
    params.set("page", String(p))
    if (s !== undefined) {
      if (s) params.set("search", s)
      else params.delete("search")
    }
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])
  const pageSize = 20

  const load = useCallback(async (p: number, status: string, searchTerm?: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await listEmailBlacklist({ status: status === "all" ? undefined : status, search: searchTerm || undefined, page: p, page_size: pageSize })
      setEntries(result.data ?? [])
      setTotal(result.total ?? 0)
    } catch (err) {
      console.error("Failed to load email blacklist", err)
      setError("Failed to load email blacklist")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(page, statusFilter, searchDebounced)
    updateUrl(page, statusFilter, searchDebounced)
  }, [load, page, statusFilter, searchDebounced])

  async function handleToggleStatus(entry: EmailBlacklistEntry) {
    const newStatus = entry.status === "blocked" ? "allowed" : "blocked"
    setAllowingId(entry.id)
    try {
      await updateEmailBlacklistStatus(entry.id, newStatus)
      toast({ title: newStatus === "allowed" ? "Allowed" : "Blocked", description: `${entry.email} is now ${newStatus}.` })
      setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: newStatus } : e))
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" })
    } finally {
      setAllowingId(null)
    }
  }

  async function handleAddEmail() {
    if (!addEmail.trim()) return
    setAdding(true)
    try {
      await addEmailToBlacklist(addEmail.trim(), addReason.trim() || undefined)
      toast({ title: "Added", description: `${addEmail.trim()} added to blacklist.` })
      setAddEmail("")
      setAddReason("")
      setAddDialogOpen(false)
      load(page, statusFilter, searchDebounced)
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" })
    } finally {
      setAdding(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Email Blacklist</h2>
          {!loading && (
            <span className="text-xs text-muted-foreground">{total} entries</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-[200px] h-8 text-xs" />
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="allowed">Allowed</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-2">
                <MailX className="h-4 w-4" />
                Add Email
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Email to Blacklist</DialogTitle>
                <DialogDescription>Block an email address from the system.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="blacklist-email">Email</Label>
                  <Input id="blacklist-email" type="email" placeholder="user@example.com" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blacklist-reason">Reason (optional)</Label>
                  <Input id="blacklist-reason" placeholder="spam" value={addReason} onChange={(e) => setAddReason(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={adding}>Cancel</Button>
                <Button onClick={handleAddEmail} disabled={adding || !addEmail.trim()}>
                  {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add to Blacklist
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={() => load(page, statusFilter, searchDebounced)} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-4 text-destructive text-sm">{error}</CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <Card>
          <CardContent className="pt-4 p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Email</th>
                    <th className="px-4 py-2 font-medium">Domain</th>
                    <th className="px-4 py-2 font-medium">Reason</th>
                    <th className="px-4 py-2 font-medium">Created At</th>
                    <th className="px-4 py-2 font-medium text-center">Allowed</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No blocked emails found.
                      </td>
                    </tr>
                  )}
                  {entries.map((entry) => {
                    const isExpanded = expandedId === entry.id
                    const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0
                    return (
                      <Fragment key={entry.id}>
                        <tr
                          className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        >
                          <td className="px-4 py-2 font-mono text-xs">
                            <div className="flex items-center gap-1">
                              {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                              {entry.email}
                            </div>
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{entry.domain}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground max-w-[200px] truncate">{entry.reason || "—"}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{formatISORelative(entry.created_at)}</td>
                          <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={entry.status === "allowed"}
                              disabled={allowingId === entry.id}
                              onCheckedChange={() => handleToggleStatus(entry)}
                            />
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b last:border-0 bg-muted/30">
                            <td colSpan={5} className="px-4 py-3">
                              {hasMetadata ? (
                                <div className="ml-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-1 text-xs">
                                  {Object.entries(entry.metadata).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-2">
                                      <span className="text-muted-foreground">{key}:</span>
                                      <span className="font-mono">{String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="ml-4 text-xs text-muted-foreground">No metadata</span>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); updateUrl(p, statusFilter) }}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); updateUrl(p, statusFilter) }}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tabs shell
// ---------------------------------------------------------------------------

const VALID_TABS = ["ccu", "workers", "mailblock"] as const
type TabValue = (typeof VALID_TABS)[number]

function MonitorTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const capabilities = useCapabilities()

  useEffect(() => {
    if (!capabilities.is_super_admin) {
      router.push("/")
    }
  }, [capabilities, router])

  const rawTab = searchParams.get("tab")
  const activeTab: TabValue = VALID_TABS.includes(rawTab as TabValue) ? (rawTab as TabValue) : "ccu"

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  if (!capabilities.is_super_admin) return null

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">System Monitor</h1>
          <p className="text-sm text-muted-foreground">Real-time status of backend workers and services</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="ccu" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            CCU
          </TabsTrigger>
          <TabsTrigger value="workers" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Workers
          </TabsTrigger>
          <TabsTrigger value="mailblock" className="flex items-center gap-2">
            <MailX className="h-4 w-4" />
            Mail Block
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ccu" className="mt-0">
          <CCUTab />
        </TabsContent>
        <TabsContent value="workers" className="mt-0">
          <WorkersTab />
        </TabsContent>
        <TabsContent value="mailblock" className="mt-0">
          <MailBlockTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function MonitorPage() {
  return (
    <Suspense>
      <MonitorTabs />
    </Suspense>
  )
}
