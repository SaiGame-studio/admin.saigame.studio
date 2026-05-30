"use client"

import { Fragment, Suspense, useEffect, useState, useCallback, useMemo } from "react"
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
  TrendingUp,
  Search,
  Globe,
  MapPin,
  BadgeCheck,
  ChevronLeft,
  Brush,
  Gamepad2,
  ExternalLink,
  BotMessageSquare,
  Plus,
  Pencil,
  Eye,
  Lock,
} from "lucide-react"
import {
  getWorkersStatus,
  WorkersStatusResult,
  Worker,
  WorkerState,
  triggerWorker,
  triggerSystemMonitorNotify,
  triggerPlatformReport,
  triggerReportBackfill,
  getAllUsersAdmin,
  AdminUser,
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
  updateUserActiveStatus,
  updateGameActiveStatus,
  listDefaultSystemPrompts,
  createDefaultSystemPrompt,
  updateDefaultSystemPrompt,
  SystemPrompt,
  SystemPromptType,
  SystemPromptProvider,
  CreateSystemPromptBody,
  UpdateSystemPromptBody,
} from "@/lib/admin-api"
import { listRequestTypes } from "@/lib/llm-conversation-api"
import { useTranslation } from "@/lib/i18n/use-translation"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import Link from "next/link"
import { formatTimestamp, formatISODate } from "@/lib/utils/date-utils"
import { CopyButton } from "@/components/CopyButton"
import { AdminStudioLimitsDialog } from "@/components/AdminStudioLimitsDialog"
import { AdminGameLimitsDialog } from "@/components/AdminGameLimitsDialog"
import { TokenStatsTab } from "@/components/TokenStatsTab"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatISORelative(iso?: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

/** Returns a human-readable relative string like "15 minutes ago" */
function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const diffMs = Date.now() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86400)}d ago`
}

/** Returns a countdown string like "Next alert in 42 min" */
function formatCountdown(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const diffMs = d.getTime() - Date.now()
  if (diffMs <= 0) return "Imminent"
  const diffMin = Math.ceil(diffMs / 60000)
  if (diffMin < 60) return `Next alert in ${diffMin} min`
  return `Next alert in ${Math.ceil(diffMin / 60)}h`
}

// ---------------------------------------------------------------------------
// Worker state badge
// ---------------------------------------------------------------------------

function WorkerStateBadge({ state }: { state?: WorkerState }) {
  switch (state) {
    case "running":
      return (
        <Badge id="worker-state-badge-running" className="bg-green-500 text-white flex items-center gap-1 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-white inline-block" />
          Running
        </Badge>
      )
    case "idle":
      return (
        <Badge id="worker-state-badge-idle" className="bg-blue-400 text-white flex items-center gap-1 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-white inline-block" />
          Idle
        </Badge>
      )
    case "pending":
      return (
        <Badge id="worker-state-badge-pending" className="bg-amber-400 text-white flex items-center gap-1 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-white inline-block" />
          Pending
        </Badge>
      )
    case "disabled":
      return (
        <Badge id="worker-state-badge-disabled" variant="secondary" className="text-gray-400 flex items-center gap-1 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-400 inline-block" />
          Disabled
        </Badge>
      )
    default:
      return (
        <Badge id="worker-state-badge-unknown" variant="secondary" className="flex items-center gap-1 shrink-0">
          <XCircle className="h-3 w-3" />
          Unknown
        </Badge>
      )
  }
}

// ---------------------------------------------------------------------------
// Worker name → API trigger mapping
// ---------------------------------------------------------------------------

const SPECIFIC_TRIGGER_WORKERS: Record<string, { label: string; type: "simple" | "date" | "backfill" }> = {
  system_monitor: { label: "Send Notify", type: "simple" },
  activity_summary: { label: "Send Report", type: "date" },
  aggregation_cron: { label: "Backfill", type: "backfill" },
}

function getSpecificTriggerConfig(workerName: string) {
  const key = workerName.toLowerCase().replace(/[\s-]+/g, "_")
  for (const [pattern, config] of Object.entries(SPECIFIC_TRIGGER_WORKERS)) {
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
    <Button id={`worker-trigger-simple-${workerName}`} variant="outline" size="sm" onClick={handleTrigger} disabled={loading} className="flex items-center gap-1.5">
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
        <Button id={`worker-trigger-date-${workerName}`} variant="outline" size="sm" className="flex items-center gap-1.5">
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
          <Button id="report-date-send-btn" onClick={handleTrigger} disabled={loading} className="flex items-center gap-2">
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
        <Button id={`worker-trigger-backfill-${workerName}`} variant="outline" size="sm" className="flex items-center gap-1.5">
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
          <div id="backfill-studio-field" className="space-y-1.5">
            <Label>Studio</Label>
            <Popover open={studioOpen} onOpenChange={setStudioOpen}>
              <PopoverTrigger asChild>
                <Button id="backfill-studio-trigger" variant="outline" role="combobox" aria-expanded={studioOpen} className="w-full justify-between font-normal">
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
          <div id="backfill-game-field" className="space-y-1.5">
            <Label>Game</Label>
            <Popover open={gameOpen} onOpenChange={setGameOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="backfill-game-trigger"
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
          <div id="backfill-dates-field" className="space-y-1.5">
            <Label htmlFor="backfill-dates">Dates (comma-separated, YYYY-MM-DD)</Label>
            <Input id="backfill-dates" placeholder="2026-03-25, 2026-03-24" value={dates} onChange={(e) => setDates(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button id="backfill-trigger-btn" onClick={handleTrigger} disabled={loading} className="flex items-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Trigger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Generic "Run Now" button using meta.no_trigger_reason
function GenericTriggerButton({ worker }: { worker: Worker }) {
  const [loading, setLoading] = useState(false)
  const noTriggerReason = worker.meta?.no_trigger_reason

  // non-empty reason → locked
  if (noTriggerReason !== "") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span id={`worker-trigger-locked-${worker.name}`} className="inline-flex items-center gap-1 text-muted-foreground cursor-default text-sm">
              <Lock className="h-4 w-4" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] text-xs">
            {noTriggerReason}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  async function handleRunNow() {
    setLoading(true)
    try {
      await triggerWorker(worker.name)
      toast({ title: "Triggered", description: `${worker.name} run initiated.` })
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button id={`worker-trigger-run-${worker.name}`} variant="outline" size="sm" onClick={handleRunNow} disabled={loading} className="flex items-center gap-1.5">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
      Run Now
    </Button>
  )
}

function WorkerTriggerButton({ worker }: { worker: Worker }) {
  const specificConfig = getSpecificTriggerConfig(worker.name)

  if (specificConfig) {
    switch (specificConfig.type) {
      case "simple":
        return <SimpleTriggerButton workerName={worker.name} />
      case "date":
        return <DateTriggerButton workerName={worker.name} />
      case "backfill":
        return <BackfillTriggerButton workerName={worker.name} />
    }
  }

  // Fall back to generic trigger based on meta.no_trigger_reason
  if (worker.meta?.no_trigger_reason !== undefined) {
    return <GenericTriggerButton worker={worker} />
  }

  return null
}

function WorkerCard({ worker }: { worker: Worker }) {
  const details = worker.details
  const meta = worker.meta
  const detailEntries = details ? Object.entries(details) : []
  const lastRunLabel = worker.last_run ?? worker.last_event_at
  const countdown = formatCountdown(worker.next_notify_at)

  return (
    <Card id={`worker-card-${worker.name}`} className="flex flex-col">
      {/* Header: name + status badge */}
      <CardHeader className="pb-3">
        <div id={`worker-card-header-${worker.name}`} className="flex items-start justify-between gap-2">
          <div id={`worker-card-title-wrap-${worker.name}`} className="min-w-0">
            <CardTitle className="text-base font-semibold font-mono">{worker.name}</CardTitle>
            <div id={`worker-card-meta-${worker.name}`} className="flex flex-col gap-0.5 mt-1">
              <CardDescription id={`worker-card-last-run-${worker.name}`} className="flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3 shrink-0" />
                Last run:&nbsp;
                {lastRunLabel ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span id={`worker-last-run-rel-${worker.name}`} className="cursor-default underline-offset-2 decoration-dotted underline">
                          {formatRelativeTime(lastRunLabel)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs font-mono">
                        {new Date(lastRunLabel).toISOString().replace("T", " ").slice(0, 19)} UTC
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <span id={`worker-last-run-never-${worker.name}`}>Never</span>
                )}
              </CardDescription>
              {countdown && (
                <CardDescription id={`worker-card-next-notify-${worker.name}`} className="flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3 shrink-0 text-blue-400" />
                  {countdown}
                </CardDescription>
              )}
            </div>
          </div>
          <div id={`worker-card-actions-${worker.name}`} className="flex items-center gap-2 shrink-0 mt-0.5">
            <WorkerTriggerButton worker={worker} />
            <WorkerStateBadge state={worker.state} />
          </div>
        </div>
      </CardHeader>

      <CardContent id={`worker-card-content-${worker.name}`} className="pt-0 flex flex-col gap-4">

        {/* Description */}
        {meta?.description && (
          <p id={`worker-desc-${worker.name}`} className="text-sm text-muted-foreground leading-relaxed">{meta.description}</p>
        )}

        {/* Runtime details key-value */}
        {detailEntries.length > 0 && (
          <div id={`worker-details-${worker.name}`}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Runtime Details</p>
            <div id={`worker-details-grid-${worker.name}`} className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md bg-muted/40 px-3 py-2 text-xs font-mono">
              {detailEntries.map(([k, v]) => (
                <div key={k} className="contents">
                  <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                  <span className="text-foreground break-all">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collects data */}
        {meta?.collects_data && meta.collects_data.length > 0 && (
          <div id={`worker-data-sources-${worker.name}`}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Database className="h-3 w-3" /> Data Sources
            </p>
            <ul id={`worker-data-sources-list-${worker.name}`} className="space-y-1">
              {meta.collects_data.map((item, i) => (
                <li key={i} id={`worker-data-source-${worker.name}-${i}`} className="flex items-start gap-1.5 text-xs">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                  <span className="text-muted-foreground font-mono">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Telegram preview */}
        {meta?.telegram_preview && (
          <div id={`worker-telegram-${worker.name}`}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Telegram Preview
              <span id={`worker-telegram-chat-${worker.name}`} className="ml-1 font-mono font-normal normal-case text-muted-foreground/60">{meta.telegram_preview.chat_id}</span>
            </p>
            <pre id={`worker-telegram-text-${worker.name}`} className="whitespace-pre-wrap break-words rounded-md bg-muted/50 border px-3 py-2 text-xs leading-relaxed font-mono text-foreground/80">
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

const WORKERS_POLL_INTERVAL = 30_000 // 30 seconds

function WorkersTab() {
  const [data, setData] = useState<WorkersStatusResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getWorkersStatus()
      setData(result)
      setLastUpdatedAt(Date.now())
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

  // Auto-poll every 30 seconds, pause when tab is hidden
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null

    function startPolling() {
      if (intervalId) return
      intervalId = setInterval(() => {
        if (!document.hidden) load()
      }, WORKERS_POLL_INTERVAL)
    }

    function stopPolling() {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stopPolling()
      } else {
        load()
        startPolling()
      }
    }

    startPolling()
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      stopPolling()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [load])

  // Tick "last updated X seconds ago"
  useEffect(() => {
    if (lastUpdatedAt === null) return
    const tick = setInterval(() => {
      setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdatedAt) / 1000))
    }, 5000)
    setSecondsSinceUpdate(0)
    return () => clearInterval(tick)
  }, [lastUpdatedAt])

  const [stateFilter, setStateFilter] = useState<"all" | WorkerState>("all")

  const countByState = useMemo(() => {
    const counts: Record<string, number> = { running: 0, idle: 0, pending: 0, disabled: 0 }
    data?.workers.forEach((w) => {
      const s = w.state ?? (w.running ? "running" : "idle")
      counts[s] = (counts[s] ?? 0) + 1
    })
    return counts
  }, [data])

  const filteredWorkers = useMemo(() => {
    if (!data) return []
    if (stateFilter === "all") return data.workers
    return data.workers.filter((w) => (w.state ?? (w.running ? "running" : "idle")) === stateFilter)
  }, [data, stateFilter])

  return (
    <div id="workers-tab-root" className="space-y-4">
      {/* Header row */}
      <div id="workers-tab-header" className="flex flex-wrap items-center justify-between gap-3">
        <div id="workers-tab-header-left" className="flex items-center gap-3">
          <h2 id="workers-tab-title" className="text-lg font-semibold">Worker Status</h2>
          {data && !loading && (
            <span id="workers-tab-collected-at" className="text-xs text-muted-foreground">
              {secondsSinceUpdate !== null
                ? `Last updated ${secondsSinceUpdate === 0 ? "just now" : `${secondsSinceUpdate}s ago`}`
                : `Collected at ${formatISORelative(data.collected_at)}`}
            </span>
          )}
        </div>
        <Button id="workers-tab-refresh-btn" variant="outline" size="sm" onClick={load} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* State filter tabs */}
      {!loading && !error && data && (
        <div id="workers-state-filter" className="flex flex-wrap gap-1.5">
          <button
            id="workers-filter-all"
            onClick={() => setStateFilter("all")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
              stateFilter === "all"
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
            }`}
          >
            <Server className="h-3 w-3" />
            All
            <span id="workers-filter-all-count" className={`ml-0.5 rounded-full px-1.5 py-0 text-[10px] font-semibold ${stateFilter === "all" ? "bg-background/20" : "bg-muted"}`}>
              {data.workers.length}
            </span>
          </button>

          {(["running", "idle", "pending", "disabled"] as const).map((state) => {
            if (countByState[state] === 0) return null
            const activeClass: Record<string, string> = {
              running: "bg-green-500 text-white border-green-500",
              idle: "bg-blue-400 text-white border-blue-400",
              pending: "bg-amber-400 text-white border-amber-400",
              disabled: "bg-muted text-gray-400 border-border",
            }
            const dotClass: Record<string, string> = {
              running: "bg-white",
              idle: "bg-white",
              pending: "bg-white",
              disabled: "bg-gray-400",
            }
            const inactiveClass = "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
            const isActive = stateFilter === state
            return (
              <button
                key={state}
                id={`workers-filter-${state}`}
                onClick={() => setStateFilter(isActive ? "all" : state)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border capitalize ${
                  isActive ? activeClass[state] : inactiveClass
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full inline-block ${isActive ? dotClass[state] : "bg-current"}`} />
                {state}
                <span id={`workers-filter-${state}-count`} className={`ml-0.5 rounded-full px-1.5 py-0 text-[10px] font-semibold ${isActive ? "bg-white/20" : "bg-muted"}`}>
                  {countByState[state]}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card id="workers-tab-error" className="border-destructive/50">
          <CardContent className="pt-4 text-destructive text-sm">{error}</CardContent>
        </Card>
      )}

      {/* Skeleton */}
      {loading && (
        <div id="workers-tab-skeleton" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} id={`workers-skeleton-card-${i}`}>
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
        <div id="workers-tab-grid" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredWorkers.length === 0 ? (
            <p id="workers-empty-state" className="col-span-2 py-12 text-center text-sm text-muted-foreground">
              No workers in <span className="font-medium capitalize">{stateFilter}</span> state.
            </p>
          ) : (
            filteredWorkers.map((worker) => (
              <WorkerCard key={worker.name} worker={worker} />
            ))
          )}
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
// Users Tab
// ---------------------------------------------------------------------------

const USERS_PAGE_SIZE = 20

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const [idFilter, setIdFilter] = useState("")
  const [emailFilter, setEmailFilter] = useState("")
  const [usernameFilter, setUsernameFilter] = useState("")
  const [displayNameFilter, setDisplayNameFilter] = useState("")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const [searchParams, setSearchParams] = useState<{
    id?: string; email?: string; username?: string; display_name?: string
  }>({})

  const [confirmDialog, setConfirmDialog] = useState<{ user: AdminUser; newStatus: boolean } | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const loadUsers = useCallback(async (p: number, params: typeof searchParams) => {
    try {
      setLoading(true)
      const result = await getAllUsersAdmin({
        page: p, page_size: USERS_PAGE_SIZE,
        id: params.id || undefined,
        email: params.email || undefined,
        username: params.username || undefined,
        display_name: params.display_name || undefined,
      })
      setUsers(result.users)
      setTotalCount(result.total_count)
      setError(null)
    } catch {
      setError("Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers(page, searchParams)
  }, [page, searchParams, loadUsers])

  const handleConfirmToggle = useCallback(async () => {
    if (!confirmDialog) return
    const { user, newStatus } = confirmDialog
    setConfirmDialog(null)
    setToggling(user.id)
    try {
      await updateUserActiveStatus(user.id, newStatus)
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u))
    } catch {
      console.error("Failed to update user status")
    } finally {
      setToggling(null)
    }
  }, [confirmDialog])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearchParams({
      id: idFilter || undefined,
      email: emailFilter || undefined,
      username: usernameFilter || undefined,
      display_name: displayNameFilter || undefined,
    })
  }

  const hasActiveFilters = !!(searchParams.id || searchParams.email || searchParams.username || searchParams.display_name)

  const handleClearFilters = () => {
    setIdFilter("")
    setEmailFilter("")
    setUsernameFilter("")
    setDisplayNameFilter("")
    setPage(1)
    setSearchParams({})
  }

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / USERS_PAGE_SIZE))

  const formatGeoTimestamp = (ts: number) => new Date(ts * 1000).toLocaleString()

  const renderGeoInfo = (label: string, geo: Record<string, unknown>) => (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
      <div className="space-y-1 text-sm">
        <div className="font-medium">{label}</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-muted-foreground">
          <span>IP: <span className="font-mono text-foreground">{String(geo.ip)}</span></span>
          <span>City: <span className="text-foreground">{String(geo.city_name)}</span></span>
          <span>Country: <span className="text-foreground">{String(geo.country_name)} ({String(geo.country_code)})</span></span>
          <span>Continent: <span className="text-foreground">{String(geo.continent_code)}</span></span>
          {geo.detected_at && <span>Detected: <span className="text-foreground">{formatGeoTimestamp(geo.detected_at as number)}</span></span>}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">All Users</h2>
          {!loading && <span className="text-xs text-muted-foreground">{totalCount} user{totalCount !== 1 ? "s" : ""}</span>}
        </div>
        <Button variant="outline" size="sm" onClick={() => loadUsers(page, searchParams)} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Search Filters */}
      <form onSubmit={handleSearch}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Search Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">User ID</label>
                <Input placeholder="Exact UUID..." value={idFilter} onChange={(e) => setIdFilter(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input placeholder="Search by email..." value={emailFilter} onChange={(e) => setEmailFilter(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input placeholder="Search by username..." value={usernameFilter} onChange={(e) => setUsernameFilter(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Display Name</label>
                <Input placeholder="Search by display name..." value={displayNameFilter} onChange={(e) => setDisplayNameFilter(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm"><Search className="h-4 w-4 mr-2" />Search</Button>
              {hasActiveFilters && <Button type="button" variant="outline" size="sm" onClick={handleClearFilters}>Clear Filters</Button>}
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/4" /></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-destructive">
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => loadUsers(page, searchParams)}>Try Again</Button>
            </div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No users found</p>
              {hasActiveFilters && <Button variant="outline" size="sm" className="mt-4" onClick={handleClearFilters}>Clear Filters</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const isExpanded = expandedRows.has(user.id)
                    const customData = user.custom_data || {}
                    const registeredGeo = customData.registered_geo as Record<string, unknown> | undefined
                    const lastLoginGeo = customData.last_login_geo as Record<string, unknown> | undefined
                    const googleAuth = customData.google_auth as Record<string, unknown> | undefined
                    return (
                      <Fragment key={user.id}>
                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(user.id)}>
                          <TableCell className="w-8 px-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium flex items-center gap-1.5">
                                {user.display_name}
                                {lastLoginGeo?.country_code ? (
                                  <img
                                    src={`https://flagcdn.com/16x12/${String(lastLoginGeo.country_code).toLowerCase()}.png`}
                                    alt={String(lastLoginGeo.country_name)}
                                    title={`${String(lastLoginGeo.city_name)}, ${String(lastLoginGeo.country_name)}`}
                                    className="inline-block" width={16} height={12}
                                  />
                                ) : (
                                  <Globe className="h-4 w-4 text-muted-foreground" title="Unknown location" />
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">{user.username}</div>
                              <div className="text-xs text-muted-foreground font-mono flex items-center">{user.id}<CopyButton text={user.id} /></div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm flex items-center gap-1">
                              {user.email}
                              {user.is_verified ? (
                                <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" title="Email verified" />
                              ) : (
                                <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" title="Email not verified" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Switch
                                checked={user.is_active}
                                disabled={toggling === user.id}
                                onCheckedChange={(checked) => setConfirmDialog({ user, newStatus: checked })}
                              />
                              <span className="text-sm text-muted-foreground">{user.is_active ? "Active" : "Banned"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {user.last_login_at ? formatISODate(user.last_login_at) : "Never"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatTimestamp(user.created_at)}</div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/30 p-4">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-medium"><Globe className="h-4 w-4" />User Details</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {registeredGeo && renderGeoInfo("Registered Location", registeredGeo)}
                                  {lastLoginGeo && renderGeoInfo("Last Login Location", lastLoginGeo)}
                                </div>
                                {googleAuth && (
                                  <div className="p-3 rounded-lg bg-muted/50">
                                    <div className="text-sm font-medium mb-2">Google Auth</div>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                                      <span>Name: <span className="text-foreground">{String(googleAuth.name)}</span></span>
                                      <span>Email: <span className="text-foreground">{String(googleAuth.email)}</span></span>
                                      {googleAuth.last_login_at && (
                                        <span>Last Login: <span className="text-foreground">{formatGeoTimestamp(googleAuth.last_login_at as number)}</span></span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground">Updated: {formatTimestamp(user.updated_at)}</div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)}>
              Next<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!confirmDialog} onOpenChange={(open) => { if (!open) setConfirmDialog(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmDialog?.newStatus ? "unban" : "ban"} user <strong>{confirmDialog?.user.display_name}</strong> ({confirmDialog?.user.email})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmToggle}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Studios Tab
// ---------------------------------------------------------------------------

function StudiosTab() {
  const [studios, setStudios] = useState<AdminStudio[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nameFilter, setNameFilter] = useState("")
  const [nameSearch, setNameSearch] = useState("")

  const loadStudios = useCallback(async (name?: string) => {
    try {
      setLoading(true)
      const result = await getAllStudiosAdmin({ name: name || undefined })
      setStudios(result.studios)
      setTotalCount(result.count)
      setError(null)
    } catch {
      setError("Failed to load studios")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadStudios() }, [loadStudios])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setNameSearch(nameFilter)
    loadStudios(nameFilter)
  }

  const handleClearFilters = () => {
    setNameFilter("")
    setNameSearch("")
    loadStudios("")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">All Studios</h2>
          {!loading && <span className="text-xs text-muted-foreground">{totalCount} studio{totalCount !== 1 ? "s" : ""}</span>}
        </div>
        <Button variant="outline" size="sm" onClick={() => loadStudios(nameSearch)} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <form onSubmit={handleSearch}>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Search Filters</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Studio Name</label>
                <Input placeholder="Search by studio name..." value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm"><Search className="h-4 w-4 mr-2" />Search</Button>
              {nameSearch && <Button type="button" variant="outline" size="sm" onClick={handleClearFilters}>Clear Filters</Button>}
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/2" /></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-destructive">
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => loadStudios(nameSearch)}>Try Again</Button>
            </div>
          ) : studios.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Brush className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No studios found</p>
              {nameSearch && <Button variant="outline" size="sm" className="mt-4" onClick={handleClearFilters}>Clear Filters</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Studio</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Games</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studios.map((studio) => (
                    <TableRow key={studio.id}>
                      <TableCell>
                        <div className="font-medium">{studio.name}</div>
                        <div className="text-xs text-muted-foreground font-mono flex items-center">{studio.id}<CopyButton text={studio.id} /></div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-md truncate">{studio.description || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1"><Gamepad2 className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{studio.game_count}</span></div>
                      </TableCell>
                      <TableCell>
                        {studio.is_active ? (
                          <Badge variant="default" className="w-fit"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="w-fit"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell><div className="text-sm">{formatTimestamp(studio.created_at)}</div></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AdminStudioLimitsDialog studio={studio} />
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/studios/${studio.id}`} className="flex items-center gap-1"><ExternalLink className="h-3.5 w-3.5" />View</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Games Tab
// ---------------------------------------------------------------------------

function GamesTab() {
  const [games, setGames] = useState<AdminGame[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nameFilter, setNameFilter] = useState("")
  const [nameSearch, setNameSearch] = useState("")
  const [confirmDialog, setConfirmDialog] = useState<{ game: AdminGame; newStatus: boolean } | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const loadGames = useCallback(async (name?: string) => {
    try {
      setLoading(true)
      const result = await getAllGamesAdmin({ name: name || undefined })
      setGames(result.games)
      setTotalCount(result.count)
      setError(null)
    } catch {
      setError("Failed to load games")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadGames() }, [loadGames])

  const handleConfirmToggle = useCallback(async () => {
    if (!confirmDialog) return
    const { game, newStatus } = confirmDialog
    setConfirmDialog(null)
    setToggling(game.id)
    try {
      await updateGameActiveStatus(game.id, newStatus)
      setGames(prev => prev.map(g => g.id === game.id ? { ...g, is_active: newStatus } : g))
    } catch {
      console.error("Failed to update game status")
    } finally {
      setToggling(null)
    }
  }, [confirmDialog])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setNameSearch(nameFilter)
    loadGames(nameFilter)
  }

  const handleClearFilters = () => {
    setNameFilter("")
    setNameSearch("")
    loadGames("")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">All Games</h2>
          {!loading && <span className="text-xs text-muted-foreground">{totalCount} game{totalCount !== 1 ? "s" : ""}</span>}
        </div>
        <Button variant="outline" size="sm" onClick={() => loadGames(nameSearch)} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <form onSubmit={handleSearch}>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Search Filters</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Game Name</label>
                <Input placeholder="Search by game name..." value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm"><Search className="h-4 w-4 mr-2" />Search</Button>
              {nameSearch && <Button type="button" variant="outline" size="sm" onClick={handleClearFilters}>Clear Filters</Button>}
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="space-y-2 flex-1"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/2" /></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-destructive">
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => loadGames(nameSearch)}>Try Again</Button>
            </div>
          ) : games.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Gamepad2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No games found</p>
              {nameSearch && <Button variant="outline" size="sm" className="mt-4" onClick={handleClearFilters}>Clear Filters</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Game</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Studio</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {games.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell>
                        <div className="font-medium">{game.name}</div>
                        <div className="text-xs text-muted-foreground font-mono flex items-center">{game.id}<CopyButton text={game.id} /></div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-xs truncate">{game.description || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Brush className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          {game.studio_name ? (
                            <Link href={`/studios/${game.studio_id}`} className="hover:underline truncate max-w-[140px]">{game.studio_name}</Link>
                          ) : (
                            <span className="font-mono text-xs text-muted-foreground truncate max-w-[140px]">{game.studio_id}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={game.is_active} disabled={toggling === game.id} onCheckedChange={(checked) => setConfirmDialog({ game, newStatus: checked })} />
                          <span className="text-sm text-muted-foreground">{game.is_active ? "Active" : "Inactive"}</span>
                        </div>
                      </TableCell>
                      <TableCell><div className="text-sm">{formatTimestamp(game.created_at)}</div></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AdminGameLimitsDialog game={game} />
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/games/${game.id}`} className="flex items-center gap-1"><ExternalLink className="h-3.5 w-3.5" />View</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmDialog} onOpenChange={(open) => { if (!open) setConfirmDialog(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmDialog?.newStatus ? "activate" : "deactivate"} game <strong>{confirmDialog?.game.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmToggle}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Growth Chart Tab
// ---------------------------------------------------------------------------

function tsToDateStr(ts: number): string {
  const ms = ts < 1e12 ? ts * 1000 : ts
  return new Date(ms).toISOString().slice(0, 10)
}

function tsToHourStr(ts: number): string {
  const ms = ts < 1e12 ? ts * 1000 : ts
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, "0")}:00`
}

const growthChartConfig = {
  users: { label: "Users", color: "hsl(221, 83%, 53%)" },
  studios: { label: "Studios", color: "hsl(160, 60%, 45%)" },
  games: { label: "Games", color: "hsl(30, 80%, 55%)" },
} satisfies ChartConfig

const TIME_RANGES = [
  { label: "Today", value: "1", days: 1 },
  { label: "7 days", value: "7", days: 7 },
  { label: "30 days", value: "30", days: 30 },
  { label: "90 days", value: "90", days: 90 },
  { label: "All", value: "all", days: 0 },
] as const

function GrowthChartTab() {
  const PAGE_SIZE = 500
  const [timeRange, setTimeRange] = useState<string>("30")

  const [users, setUsers] = useState<AdminUser[]>([])
  const [userTotal, setUserTotal] = useState(0)
  const [userLoading, setUserLoading] = useState(false)

  const [studios, setStudios] = useState<AdminStudio[]>([])
  const [studioTotal, setStudioTotal] = useState(0)
  const [studioLoading, setStudioLoading] = useState(false)

  const [games, setGames] = useState<AdminGame[]>([])
  const [gameTotal, setGameTotal] = useState(0)
  const [gameLoading, setGameLoading] = useState(false)

  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMoreUsers = useCallback(async () => {
    const nextPage = Math.floor(users.length / PAGE_SIZE) + 1
    setUserLoading(true)
    try {
      const result = await getAllUsersAdmin({ page: nextPage, page_size: PAGE_SIZE })
      setUsers(prev => [...prev, ...result.users])
      setUserTotal(result.total_count)
    } catch {
      setError("Failed to load more users")
    } finally {
      setUserLoading(false)
    }
  }, [users.length])

  const loadMoreStudios = useCallback(async () => {
    const nextPage = Math.floor(studios.length / PAGE_SIZE) + 1
    setStudioLoading(true)
    try {
      const result = await getAllStudiosAdmin({ page: nextPage, page_size: PAGE_SIZE })
      setStudios(prev => [...prev, ...result.studios])
      setStudioTotal(result.count)
    } catch {
      setError("Failed to load more studios")
    } finally {
      setStudioLoading(false)
    }
  }, [studios.length])

  const loadMoreGames = useCallback(async () => {
    const nextPage = Math.floor(games.length / PAGE_SIZE) + 1
    setGameLoading(true)
    try {
      const result = await getAllGamesAdmin({ page: nextPage, page_size: PAGE_SIZE })
      setGames(prev => [...prev, ...result.games])
      setGameTotal(result.count)
    } catch {
      setError("Failed to load more games")
    } finally {
      setGameLoading(false)
    }
  }, [games.length])

  // Load first page of all resources, then render chart immediately
  useEffect(() => {
    async function init() {
      setInitialLoading(true)
      setError(null)
      try {
        const [uRes, sRes, gRes] = await Promise.all([
          getAllUsersAdmin({ page: 1, page_size: PAGE_SIZE }),
          getAllStudiosAdmin({ page: 1, page_size: PAGE_SIZE }),
          getAllGamesAdmin({ page: 1, page_size: PAGE_SIZE }),
        ])
        setUsers(uRes.users)
        setUserTotal(uRes.total_count)
        setStudios(sRes.studios)
        setStudioTotal(sRes.count)
        setGames(gRes.games)
        setGameTotal(gRes.count)
      } catch {
        setError("Failed to load initial data")
      } finally {
        setInitialLoading(false)
      }
    }
    init()
  }, [])

  // Auto-load remaining pages in background for all resources
  useEffect(() => {
    if (initialLoading) return
    let cancelled = false

    async function loadRemainingUsers() {
      if (users.length === 0 || users.length >= userTotal) return
      let all = [...users]
      const totalPages = Math.ceil(userTotal / PAGE_SIZE)
      const currentPage = Math.floor(all.length / PAGE_SIZE)
      for (let p = currentPage + 1; p <= totalPages; p++) {
        if (cancelled) break
        await new Promise(r => setTimeout(r, 500))
        if (cancelled) break
        try {
          const res = await getAllUsersAdmin({ page: p, page_size: PAGE_SIZE })
          all = [...all, ...res.users]
          setUsers([...all])
        } catch { break }
      }
    }

    async function loadRemainingStudios() {
      if (studios.length === 0 || studios.length >= studioTotal) return
      let all = [...studios]
      const totalPages = Math.ceil(studioTotal / PAGE_SIZE)
      const currentPage = Math.floor(all.length / PAGE_SIZE)
      for (let p = currentPage + 1; p <= totalPages; p++) {
        if (cancelled) break
        await new Promise(r => setTimeout(r, 500))
        if (cancelled) break
        try {
          const res = await getAllStudiosAdmin({ page: p, page_size: PAGE_SIZE })
          all = [...all, ...res.studios]
          setStudios([...all])
        } catch { break }
      }
    }

    async function loadRemainingGames() {
      if (games.length === 0 || games.length >= gameTotal) return
      let all = [...games]
      const totalPages = Math.ceil(gameTotal / PAGE_SIZE)
      const currentPage = Math.floor(all.length / PAGE_SIZE)
      for (let p = currentPage + 1; p <= totalPages; p++) {
        if (cancelled) break
        await new Promise(r => setTimeout(r, 500))
        if (cancelled) break
        try {
          const res = await getAllGamesAdmin({ page: p, page_size: PAGE_SIZE })
          all = [...all, ...res.games]
          setGames([...all])
        } catch { break }
      }
    }

    loadRemainingUsers()
    loadRemainingStudios()
    loadRemainingGames()
    return () => { cancelled = true }
  }, [initialLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // Daily chart data (for 7d / 30d / 90d / all)
  const dailyChartData = useMemo(() => {
    const dateMap = new Map<string, { users: number; studios: number; games: number }>()

    for (const u of users) {
      if (!u.created_at) continue
      const date = tsToDateStr(u.created_at)
      const entry = dateMap.get(date) || { users: 0, studios: 0, games: 0 }
      entry.users++
      dateMap.set(date, entry)
    }
    for (const s of studios) {
      if (!s.created_at) continue
      const date = tsToDateStr(s.created_at)
      const entry = dateMap.get(date) || { users: 0, studios: 0, games: 0 }
      entry.studios++
      dateMap.set(date, entry)
    }
    for (const g of games) {
      if (!g.created_at) continue
      const date = tsToDateStr(g.created_at)
      const entry = dateMap.get(date) || { users: 0, studios: 0, games: 0 }
      entry.games++
      dateMap.set(date, entry)
    }

    const sorted = [...dateMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))

    let cumU = userTotal - users.length
    let cumS = studioTotal - studios.length
    let cumG = gameTotal - games.length
    return sorted.map(([date, counts]) => {
      cumU += counts.users
      cumS += counts.studios
      cumG += counts.games
      return { date, users: cumU, studios: cumS, games: cumG }
    })
  }, [users, studios, games, userTotal, studioTotal, gameTotal])

  // Hourly chart data (for today)
  const hourlyChartData = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const hourMap = new Map<string, { users: number; studios: number; games: number }>()

    // Init all 24 hours
    for (let h = 0; h < 24; h++) {
      hourMap.set(`${String(h).padStart(2, "0")}:00`, { users: 0, studios: 0, games: 0 })
    }

    for (const u of users) {
      if (!u.created_at) continue
      if (tsToDateStr(u.created_at) !== todayStr) continue
      const hour = tsToHourStr(u.created_at)
      const entry = hourMap.get(hour)!
      entry.users++
    }
    for (const s of studios) {
      if (!s.created_at) continue
      if (tsToDateStr(s.created_at) !== todayStr) continue
      const hour = tsToHourStr(s.created_at)
      const entry = hourMap.get(hour)!
      entry.studios++
    }
    for (const g of games) {
      if (!g.created_at) continue
      if (tsToDateStr(g.created_at) !== todayStr) continue
      const hour = tsToHourStr(g.created_at)
      const entry = hourMap.get(hour)!
      entry.games++
    }

    const sorted = [...hourMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))

    let cumU = 0, cumS = 0, cumG = 0
    return sorted.map(([hour, counts]) => {
      cumU += counts.users
      cumS += counts.studios
      cumG += counts.games
      return { date: hour, users: cumU, studios: cumS, games: cumG }
    })
  }, [users, studios, games])

  const filteredChartData = useMemo(() => {
    if (timeRange === "1") return hourlyChartData
    if (timeRange === "all") return dailyChartData

    const days = TIME_RANGES.find(r => r.value === timeRange)?.days ?? 30
    const today = new Date()
    const cutoff = new Date()
    cutoff.setDate(today.getDate() - days)

    // Build a lookup from dailyChartData
    const dataByDate = new Map(dailyChartData.map(d => [d.date, d]))

    // Generate all dates in range
    const result: typeof dailyChartData = []
    const cursor = new Date(cutoff)
    while (cursor <= today) {
      const dateStr = cursor.toISOString().slice(0, 10)
      const existing = dataByDate.get(dateStr)
      if (existing) {
        result.push(existing)
      } else {
        // Find the last known cumulative values
        const prev = result.length > 0 ? result[result.length - 1] : null
        // Or find from full data: the latest entry before this date
        let users = prev?.users ?? 0
        let studios = prev?.studios ?? 0
        let games = prev?.games ?? 0
        if (!prev) {
          // Find the last entry before cutoff from full data
          for (let i = dailyChartData.length - 1; i >= 0; i--) {
            if (dailyChartData[i].date < dateStr) {
              users = dailyChartData[i].users
              studios = dailyChartData[i].studios
              games = dailyChartData[i].games
              break
            }
          }
        }
        result.push({ date: dateStr, users, studios, games })
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    return result
  }, [dailyChartData, hourlyChartData, timeRange])

  const hasMoreUsers = users.length < userTotal
  const hasMoreStudios = studios.length < studioTotal
  const hasMoreGames = games.length < gameTotal
  const hasMore = hasMoreUsers || hasMoreStudios || hasMoreGames

  const handleLoadAll = useCallback(async () => {
    const promises: Promise<void>[] = []
    if (hasMoreUsers) promises.push(loadMoreUsers())
    if (hasMoreStudios) promises.push(loadMoreStudios())
    if (hasMoreGames) promises.push(loadMoreGames())
    await Promise.all(promises)
  }, [hasMoreUsers, hasMoreStudios, hasMoreGames, loadMoreUsers, loadMoreStudios, loadMoreGames])

  const anyLoading = userLoading || studioLoading || gameLoading

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Growth Overview</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border bg-muted p-0.5">
            {TIME_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setTimeRange(r.value)}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
                  timeRange === r.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {hasMore && (
            <Button variant="outline" size="sm" onClick={handleLoadAll} disabled={anyLoading} className="flex items-center gap-2">
              {anyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Load More
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {!initialLoading && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Users</p>
              <p className="text-2xl font-bold">{userTotal.toLocaleString()}</p>
              {filteredChartData.length > 0 && timeRange !== "all" && (
                <p className="text-xs text-green-500">+{(filteredChartData[filteredChartData.length - 1].users - filteredChartData[0].users).toLocaleString()} in period</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Studios</p>
              <p className="text-2xl font-bold">{studioTotal.toLocaleString()}</p>
              {filteredChartData.length > 0 && timeRange !== "all" && (
                <p className="text-xs text-green-500">+{(filteredChartData[filteredChartData.length - 1].studios - filteredChartData[0].studios).toLocaleString()} in period</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Games</p>
              <p className="text-2xl font-bold">{gameTotal.toLocaleString()}</p>
              {filteredChartData.length > 0 && timeRange !== "all" && (
                <p className="text-xs text-green-500">+{(filteredChartData[filteredChartData.length - 1].games - filteredChartData[0].games).toLocaleString()} in period</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-4 text-destructive text-sm">{error}</CardContent>
        </Card>
      )}

      {initialLoading && (
        <Card>
          <CardContent className="pt-4">
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      )}

      {!initialLoading && !error && filteredChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cumulative Growth by Day</CardTitle>
            <CardDescription>
              {timeRange === "all" ? "All time" : `Last ${TIME_RANGES.find(r => r.value === timeRange)?.label.toLowerCase()}`} — total users, studios, and games
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={growthChartConfig} className="h-[400px] w-full">
              <LineChart data={filteredChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(v) => timeRange === "1" ? v : v.slice(5)}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="users" stroke="var(--color-users)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="studios" stroke="var(--color-studios)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="games" stroke="var(--color-games)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {!initialLoading && !error && filteredChartData.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">No data available yet.</CardContent>
        </Card>
      )}

      {/* Per-resource load more */}
      {hasMore && !initialLoading && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {hasMoreUsers && (
            <Button variant="outline" size="sm" onClick={loadMoreUsers} disabled={userLoading}>
              {userLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Load More Users ({users.length}/{userTotal})
            </Button>
          )}
          {hasMoreStudios && (
            <Button variant="outline" size="sm" onClick={loadMoreStudios} disabled={studioLoading}>
              {studioLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Load More Studios ({studios.length}/{studioTotal})
            </Button>
          )}
          {hasMoreGames && (
            <Button variant="outline" size="sm" onClick={loadMoreGames} disabled={gameLoading}>
              {gameLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Load More Games ({games.length}/{gameTotal})
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// System Prompts Tab
// ---------------------------------------------------------------------------

interface SystemPromptFormState {
  name: string
  prompt_type: SystemPromptType
  description: string
  is_active: boolean
  content: string
  max_input_tokens: string
  max_output_tokens: string
  temperature: string
  provider: SystemPromptProvider | "none"
  model: string
}

const DEFAULT_FORM: SystemPromptFormState = {
  name: "",
  prompt_type: "",
  description: "",
  is_active: true,
  content: "",
  max_input_tokens: "8192",
  max_output_tokens: "4096",
  temperature: "0.7",
  provider: "none",
  model: "",
}

function SystemPromptFormDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  title,
  promptTypes,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Partial<SystemPromptFormState>
  onSave: (data: SystemPromptFormState) => Promise<void>
  title: string
  promptTypes: string[]
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState<SystemPromptFormState>({ ...DEFAULT_FORM, ...initial })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm({ ...DEFAULT_FORM, ...initial })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof SystemPromptFormState>(k: K, v: SystemPromptFormState[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  async function handleSubmit() {
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sp-name">Name <span className="text-destructive">*</span></Label>
              <Input id="sp-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="default-lore-writer" />
            </div>
            <div className="space-y-1.5">
              <Label>Type <span className="text-destructive">*</span></Label>
              <Select value={form.prompt_type} onValueChange={(v) => set("prompt_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {promptTypes.map((k) => (
                    <SelectItem key={k} value={k}>{t(`llmConversation.requestTypes.${k}`) || k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="sp-desc">Description</Label>
            <Input id="sp-desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Platform default for..." />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label htmlFor="sp-content">Content <span className="text-destructive">*</span></Label>
            <textarea
              id="sp-content"
              className="flex min-h-[180px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono resize-y"
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="You are a..."
            />
          </div>

          {/* Tokens + Temperature */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sp-max-in">Max Input Tokens</Label>
              <Input id="sp-max-in" type="number" min={0} value={form.max_input_tokens} onChange={(e) => set("max_input_tokens", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-max-out">Max Output Tokens</Label>
              <Input id="sp-max-out" type="number" min={0} value={form.max_output_tokens} onChange={(e) => set("max_output_tokens", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-temp">Temperature</Label>
              <Input id="sp-temp" type="number" min={0} max={2} step={0.05} value={form.temperature} onChange={(e) => set("temperature", e.target.value)} />
            </div>
          </div>

          {/* Provider + Model */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={form.provider} onValueChange={(v) => set("provider", v as SystemPromptProvider | "none")}>
                <SelectTrigger><SelectValue placeholder="Platform default" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Platform default</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-model">Model</Label>
              <Input id="sp-model" value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="e.g. gemini-2.0-flash" />
            </div>
          </div>

          {/* Active */}
          <div className="flex items-center gap-3">
            <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} id="sp-active" />
            <Label htmlFor="sp-active">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.name.trim() || !form.content.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SystemPromptsTab() {
  const { t } = useTranslation()
  const [prompts, setPrompts] = useState<SystemPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [promptTypes, setPromptTypes] = useState<string[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editPrompt, setEditPrompt] = useState<SystemPrompt | null>(null)
  const [viewPrompt, setViewPrompt] = useState<SystemPrompt | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    listRequestTypes().then(setPromptTypes).catch(() => {})
  }, [])

  const load = useCallback(async (type?: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await listDefaultSystemPrompts(
        type && type !== "all" ? { prompt_type: type } : undefined
      )
      setPrompts(result.data ?? [])
    } catch (err) {
      setError("Failed to load system prompts")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(typeFilter) }, [load, typeFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(form: SystemPromptFormState) {
    const body: CreateSystemPromptBody = {
      name: form.name,
      prompt_type: form.prompt_type,
      description: form.description || undefined,
      is_active: form.is_active,
      content: form.content,
      max_input_tokens: Number(form.max_input_tokens) || undefined,
      max_output_tokens: Number(form.max_output_tokens) || undefined,
      temperature: Number(form.temperature),
      provider: (form.provider !== "none" ? form.provider as SystemPromptProvider : null),
      model: form.model || null,
    }
    try {
      await createDefaultSystemPrompt(body)
      toast({ title: "Created", description: `System prompt "${form.name}" created.` })
      setCreateOpen(false)
      load(typeFilter)
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" })
      throw err
    }
  }

  async function handleEdit(form: SystemPromptFormState) {
    if (!editPrompt) return
    const body: UpdateSystemPromptBody = {
      name: form.name,
      prompt_type: form.prompt_type,
      description: form.description,
      is_active: form.is_active,
      content: form.content,
      max_input_tokens: Number(form.max_input_tokens) || undefined,
      max_output_tokens: Number(form.max_output_tokens) || undefined,
      temperature: Number(form.temperature),
      provider: (form.provider !== "none" ? form.provider as SystemPromptProvider : ""),
      model: form.model || null,
    }
    try {
      const updated = await updateDefaultSystemPrompt(editPrompt.id, body)
      toast({ title: "Updated", description: `System prompt "${form.name}" updated.` })
      setEditPrompt(null)
      setPrompts((prev) => prev.map((p) => p.id === updated.id ? updated : p))
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" })
      throw err
    }
  }

  async function handleToggleActive(prompt: SystemPrompt) {
    setTogglingId(prompt.id)
    try {
      const updated = await updateDefaultSystemPrompt(prompt.id, { is_active: !prompt.is_active })
      setPrompts((prev) => prev.map((p) => p.id === updated.id ? updated : p))
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" })
    } finally {
      setTogglingId(null)
    }
  }

  function promptToForm(p: SystemPrompt): SystemPromptFormState {
    return {
      name: p.name,
      prompt_type: p.prompt_type,
      description: p.description ?? "",
      is_active: p.is_active,
      content: p.content,
      max_input_tokens: String(p.max_input_tokens ?? 8192),
      max_output_tokens: String(p.max_output_tokens ?? 4096),
      temperature: String(p.temperature ?? 0.7),
      provider: p.provider ?? "none",
      model: p.model ?? "",
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">System Prompts</h2>
          {!loading && <span className="text-xs text-muted-foreground">{prompts.length} prompt{prompts.length !== 1 ? "s" : ""}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {promptTypes.map((k) => (
                <SelectItem key={k} value={k}>{t(`llmConversation.requestTypes.${k}`) || k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="flex items-center gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Prompt
          </Button>
          <Button variant="outline" size="sm" onClick={() => load(typeFilter)} disabled={loading} className="flex items-center gap-2">
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
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <Card>
          <CardContent className="p-0">
            {prompts.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <BotMessageSquare className="h-12 w-12 mx-auto mb-2 opacity-40" />
                <p>No system prompts found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Provider / Model</TableHead>
                      <TableHead className="text-right">Temp</TableHead>
                      <TableHead className="text-right">In / Out Tokens</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prompts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.name}</div>
                          {p.description && <div className="text-xs text-muted-foreground max-w-xs truncate">{p.description}</div>}
                          <div className="text-xs text-muted-foreground font-mono flex items-center gap-1">{p.id}<CopyButton text={p.id} /></div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">{t(`llmConversation.requestTypes.${p.prompt_type}`) || p.prompt_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {p.provider ? (
                            <div>
                              <div className="text-xs font-medium capitalize">{p.provider}</div>
                              {p.model && <div className="text-xs text-muted-foreground font-mono">{p.model}</div>}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Platform default</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{p.temperature}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {(p.max_input_tokens ?? "—")} / {(p.max_output_tokens ?? "—")}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={p.is_active}
                            disabled={togglingId === p.id}
                            onCheckedChange={() => handleToggleActive(p)}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatISORelative(p.updated_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setViewPrompt(p)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditPrompt(p)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create dialog */}
      <SystemPromptFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create System Prompt"
        onSave={handleCreate}
        promptTypes={promptTypes}
      />

      {/* Edit dialog */}
      {editPrompt && (
        <SystemPromptFormDialog
          open={!!editPrompt}
          onOpenChange={(v) => { if (!v) setEditPrompt(null) }}
          title={`Edit — ${editPrompt.name}`}
          initial={promptToForm(editPrompt)}
          onSave={handleEdit}
          promptTypes={promptTypes}
        />
      )}

      {/* View content dialog */}
      <Dialog open={!!viewPrompt} onOpenChange={(v) => { if (!v) setViewPrompt(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewPrompt?.name}</DialogTitle>
            <DialogDescription>{viewPrompt?.description}</DialogDescription>
          </DialogHeader>
          {viewPrompt && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">{t(`llmConversation.requestTypes.${viewPrompt.prompt_type}`) || viewPrompt.prompt_type}</Badge>
                {viewPrompt.provider && <Badge variant="secondary" className="capitalize">{viewPrompt.provider}{viewPrompt.model ? ` / ${viewPrompt.model}` : ""}</Badge>}
                <span className="text-muted-foreground">temp: {viewPrompt.temperature}</span>
                <span className="text-muted-foreground">in: {viewPrompt.max_input_tokens} / out: {viewPrompt.max_output_tokens}</span>
              </div>
              <pre className="whitespace-pre-wrap break-words rounded-md bg-muted/50 border px-4 py-3 text-xs leading-relaxed font-mono text-foreground/80 max-h-[500px] overflow-y-auto">
                {viewPrompt.content}
              </pre>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewPrompt(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tabs shell
// ---------------------------------------------------------------------------

const VALID_TABS = ["ccu", "workers", "mailblock", "users", "studios", "games", "charts", "sysprompts", "tokenstats"] as const
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
        <TabsList className="w-auto inline-flex mb-4">
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
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="studios" className="flex items-center gap-2">
            <Brush className="h-4 w-4" />
            Studios
          </TabsTrigger>
          <TabsTrigger value="games" className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4" />
            Games
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Charts
          </TabsTrigger>
          <TabsTrigger value="sysprompts" className="flex items-center gap-2">
            <BotMessageSquare className="h-4 w-4" />
            Sys Prompts
          </TabsTrigger>
          <TabsTrigger value="tokenstats" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Token Stats
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
        <TabsContent value="users" className="mt-0">
          <UsersTab />
        </TabsContent>
        <TabsContent value="studios" className="mt-0">
          <StudiosTab />
        </TabsContent>
        <TabsContent value="games" className="mt-0">
          <GamesTab />
        </TabsContent>
        <TabsContent value="charts" className="mt-0">
          <GrowthChartTab />
        </TabsContent>
        <TabsContent value="sysprompts" className="mt-0">
          <SystemPromptsTab />
        </TabsContent>
        <TabsContent value="tokenstats" className="mt-0">
          <TokenStatsTab />
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
