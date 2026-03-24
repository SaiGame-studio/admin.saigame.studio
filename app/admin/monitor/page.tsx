"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
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
} from "lucide-react"
import { getWorkersStatus, WorkersStatusResult, Worker } from "@/lib/admin-api"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatISORelative(iso?: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString()
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
          {worker.running ? (
            <Badge variant="default" className="bg-green-600/90 text-white flex items-center gap-1 shrink-0 mt-0.5">
              <CheckCircle2 className="h-3 w-3" />
              Running
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1 shrink-0 mt-0.5">
              <XCircle className="h-3 w-3" />
              Stopped
            </Badge>
          )}
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
// Tabs shell
// ---------------------------------------------------------------------------

const VALID_TABS = ["workers"] as const
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
  const activeTab: TabValue = VALID_TABS.includes(rawTab as TabValue) ? (rawTab as TabValue) : "workers"

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
          <TabsTrigger value="workers" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Workers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workers" className="mt-0">
          <WorkersTab />
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
