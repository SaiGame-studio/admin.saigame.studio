"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Save, Loader2, Code2, RefreshCw, Clock, Layers, FileCode,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList,
} from "@/components/ui/breadcrumb"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CopyButton } from "@/components/CopyButton"
import { GameNavButtons } from "@/components/GameNavButtons"
import { useToast } from "@/hooks/use-toast"
import { getGame } from "@/lib/game-api"
import { getScript, updateScript, listSampleScripts } from "@/lib/script-api"
import type { Game } from "@/types/game"
import type { GameScript, SampleScript } from "@/types/script"

// ---------------------------------------------------------------------------
// Lua Editor
// ---------------------------------------------------------------------------
interface LuaEditorProps {
  value: string
  onChange: (v: string) => void
}

function LuaEditor({ value, onChange }: LuaEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumRef = useRef<HTMLDivElement>(null)

  const lines = value.split("\n")

  const syncScroll = () => {
    if (lineNumRef.current && textareaRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  return (
    <div className="flex h-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 font-mono text-sm leading-6">
      {/* Line numbers */}
      <div
        ref={lineNumRef}
        className="select-none overflow-hidden border-r border-zinc-800 bg-zinc-900/60 py-3 pr-3 pl-2 text-right text-zinc-600 shrink-0 min-w-[3rem]"
      >
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>

      {/* Editable area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
        className="flex-1 resize-none overflow-auto bg-transparent py-3 px-4 text-zinc-100 outline-none caret-primary placeholder:text-zinc-700"
        onKeyDown={e => {
          if (e.key === "Tab") {
            e.preventDefault()
            const el = e.currentTarget
            const start = el.selectionStart
            const end = el.selectionEnd
            const next = value.substring(0, start) + "  " + value.substring(end)
            onChange(next)
            requestAnimationFrame(() => {
              el.selectionStart = el.selectionEnd = start + 2
            })
          }
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ScriptEditPage() {
  const params = useParams() as { id: string; scriptId: string }
  const router = useRouter()
  const { toast } = useToast()

  const gameId = params.id
  const scriptId = params.scriptId

  const [game, setGame] = useState<Game | null>(null)
  const [script, setScript] = useState<GameScript | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Editable fields
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(false)
  const [scriptBody, setScriptBody] = useState("")

  const [savingInfo, setSavingInfo] = useState(false)
  const [savingBody, setSavingBody] = useState(false)
  const [samples, setSamples] = useState<SampleScript[]>([])
  const [samplesLoading, setSamplesLoading] = useState(true)
  const [sampleTab, setSampleTab] = useState<string>("all")
  const [appendMode, setAppendMode] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [g, s] = await Promise.all([
        getGame(gameId).catch(() => null),
        getScript(gameId, scriptId),
      ])
      if (g) setGame(g)
      setScript(s)
      setDescription(s.description)
      setIsActive(s.is_active)
      setScriptBody(s.script_body)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load script")
    } finally {
      setLoading(false)
    }
  }, [gameId, scriptId])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    setSamplesLoading(true)
    listSampleScripts()
      .then(setSamples)
      .catch(() => setSamples([]))
      .finally(() => setSamplesLoading(false))
  }, [])

  async function handleSaveInfo() {
    setSavingInfo(true)
    try {
      const updated = await updateScript(gameId, scriptId, {
        description,
        is_active: isActive,
      })
      setScript(updated)
      toast({ title: "Info saved" })
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Failed to save info", description: err instanceof Error ? err.message : undefined })
    } finally {
      setSavingInfo(false)
    }
  }

  async function handleSaveBody() {
    setSavingBody(true)
    try {
      const updated = await updateScript(gameId, scriptId, { script_body: scriptBody })
      setScript(updated)
      toast({ title: "Script saved", description: `Version bumped to v${updated.version}` })
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Failed to save script", description: err instanceof Error ? err.message : undefined })
    } finally {
      setSavingBody(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <TooltipProvider delayDuration={300}>
    <div className="flex flex-col h-[calc(100vh-60px)] overflow-hidden">
      {/* ── Top header ──────────────────────────────────────────────────── */}
      <div className="px-6 pt-4 pb-3 shrink-0">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-2">
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href="/games">Games</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}`}>{game?.name ?? gameId}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}/scripts`}>Scripts</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="font-mono">{script?.name ?? scriptId}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Title row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => router.push(`/games/${gameId}/scripts`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Code2 className="h-6 w-6 text-muted-foreground" />
                {loading ? (
                  <span className="text-muted-foreground">Loading…</span>
                ) : (
                  <span className="flex items-center gap-1.5 font-mono">
                    {script?.name}
                    {script && <CopyButton text={script.name} />}
                  </span>
                )}
              </h1>
              {script && (
                <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
                  <Badge variant="outline" className="font-mono font-normal text-xs">{script.trigger_type}</Badge>
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    v{script.version}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(script.updated_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          <GameNavButtons gameId={gameId} active="scripts" />
        </div>
      </div>

      <Separator />

      {/* ── Info bar ─────────────────────────────────────────────────────── */}
      <div className="px-6 py-3 shrink-0 bg-muted/20 border-b flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] space-y-1">
          <Label htmlFor="edit-desc" className="text-xs text-muted-foreground">Description</Label>
          <Input
            id="edit-desc"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe what this script does…"
            className="h-8 text-sm"
            disabled={loading}
          />
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <Label className="text-xs text-muted-foreground">Active</Label>
          <Switch
            checked={isActive}
            onCheckedChange={setIsActive}
            disabled={loading}
          />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSaveInfo} disabled={loading || savingInfo}>
              {savingInfo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Save info</TooltipContent>
        </Tooltip>
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" title="Refresh" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <Alert variant="destructive" className="mx-6 mt-4 shrink-0">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Main: editor + sample scripts ────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading script…</span>
        </div>
      ) : !script ? null : (
        <div className="flex flex-1 min-h-0 gap-4 px-6 py-4">
          {/* Script body editor */}
          <div className="flex flex-1 min-w-0 flex-col gap-2">
            <div className="flex items-center justify-between shrink-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Script Body
                <span className="ml-2 font-normal normal-case text-muted-foreground/60">(Lua)</span>
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" className="h-7 w-7" onClick={handleSaveBody} disabled={savingBody}>
                    {savingBody ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Save script</TooltipContent>
              </Tooltip>
            </div>
            <div className="flex-1 min-h-0">
              <LuaEditor value={scriptBody} onChange={setScriptBody} />
            </div>
          </div>

          {/* Sample scripts panel */}
          <div className="w-80 shrink-0 flex flex-col gap-2">
            <div className="flex items-center justify-between shrink-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Sample Scripts
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] cursor-pointer select-none ${appendMode ? "text-primary" : "text-muted-foreground/60"}`}
                      onClick={() => setAppendMode(v => !v)}
                    >
                      {appendMode ? "Append" : "Replace"}
                    </span>
                    <Switch checked={appendMode} onCheckedChange={setAppendMode} className="h-4 w-7 [&>span]:h-3 [&>span]:w-3" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[180px] text-center">
                  {appendMode ? "Click adds to bottom of script" : "Click replaces entire script"}
                </TooltipContent>
              </Tooltip>
            </div>
            {samplesLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : samples.length === 0 ? (
              <div className="flex-1 rounded-lg border border-dashed bg-muted/20 flex flex-col items-center justify-center gap-2 text-center p-4">
                <Code2 className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground/60">No samples available</p>
              </div>
            ) : (() => {
              const gameTypes = ["all", ...Array.from(new Set(samples.map(s => s.game_type).filter(Boolean)))]
              const filtered = sampleTab === "all" ? samples : samples.filter(s => s.game_type === sampleTab)
              return (
                <>
                  <Select value={sampleTab} onValueChange={setSampleTab}>
                    <SelectTrigger className="h-7 text-xs shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gameTypes.map(gt => (
                        <SelectItem key={gt} value={gt} className="text-xs capitalize">
                          {gt === "all" ? `All (${samples.length})` : `${gt} (${samples.filter(s => s.game_type === gt).length})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    {filtered.map(s => (
                      <button
                        key={s.name}
                        type="button"
                        className="w-full text-left rounded-md border bg-card px-3 py-2.5 hover:border-primary hover:bg-primary/5 transition-colors group"
                        onClick={() => {
                          const block = `-- ${s.name}: ${s.description}\n${s.script_body}`
                          if (appendMode) {
                            setScriptBody(prev => prev ? prev + "\n\n" + block : block)
                          } else {
                            setScriptBody(block)
                          }
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <FileCode className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0" />
                          <span className="text-xs font-semibold font-mono truncate group-hover:text-primary">{s.name}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{s.description}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Badge variant="outline" className="text-[10px] font-mono font-normal px-1 py-0">{s.trigger_type}</Badge>
                          {s.game_type && <Badge variant="secondary" className="text-[10px] font-normal px-1 py-0 capitalize">{s.game_type}</Badge>}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  )
}
