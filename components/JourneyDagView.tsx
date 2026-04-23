"use client"

import React, { useCallback, useContext, useEffect, useRef, useState } from "react"
import { type NodeChange, applyNodeChanges, type EdgeChange, applyEdgeChanges } from "@xyflow/react"
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  ControlButton,
  MarkerType,
  Handle,
  Position,
  SelectionMode,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type NodeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import dagre from "dagre"
import { Loader2, Plus, Pencil, Trash2, RefreshCw, X, Wand2, PlusCircle, ChevronsUpDown, Check, CalendarIcon, Users, Zap, ExternalLink, Hammer, Copy, PanelRightClose, PanelRightOpen } from "lucide-react"
import { format, subDays } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import type { DateRange } from "react-day-picker"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
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
import { cn, toSlugUnderscore } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  getJourneyDag,
  saveJourneyDag,
  listNodeDefinitions,
  createNodeDefinition,
  updateNodeDefinition,
  deleteNodeDefinition,
  getEventStats,
  getJourneyDashboard,
  type JourneyDagNodeDefinition,
  type SaveJourneyDagRequest,
  type EventStat,
  type JourneyNodeStats,
} from "@/lib/journey-api"
import { listEventTypes } from "@/lib/event-type-api"
import { getJourneySessionEvents, type JourneyEvent } from "@/lib/game-user-api"
import { CopyButton } from "@/components/CopyButton"
import { useTranslation } from "@/lib/i18n/use-translation"

// ─── EventType Combobox ──────────────────────────────────────────────────────

function EventTypeCombobox({
  value,
  onChange,
  gameId,
}: {
  value: string
  onChange: (v: string) => void
  gameId: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<string[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const loadOptions = useCallback(() => {
    setRefreshing(true)
    listEventTypes(gameId)
      .then((data) => setOptions(data.map((et) => et.event_type)))
      .catch(() => {})
      .finally(() => setRefreshing(false))
  }, [gameId])

  useEffect(() => { loadOptions() }, [loadOptions])

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))

  const select = (v: string) => {
    onChange(v)
    setOpen(false)
    setQuery("")
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="flex-1 justify-between font-normal"
          >
            <span className={value ? "" : "text-muted-foreground"}>
              {value || t("analytic.journeyDag.selectEventType")}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t("analytic.journeyDag.search")}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {filtered.length === 0 && (
                <CommandEmpty>{t("analytic.journeyDag.noResults")}</CommandEmpty>
              )}
              {filtered.length > 0 && (
                <CommandGroup>
                  {filtered.map((opt) => (
                    <CommandItem key={opt} value={opt} onSelect={() => select(opt)}>
                      <Check className={cn("mr-2 h-4 w-4", value === opt ? "opacity-100" : "opacity-0")} />
                      {opt}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        disabled={refreshing}
        onClick={loadOptions}
        title={t("analytic.journeyDag.refreshEventTypes")}
      >
        <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
      </Button>
      </div>
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => window.open(`/games/${gameId}/analytic?tab=event-types&create=1`, "_blank")}
      >
        <ExternalLink className="h-3 w-3" />
        {t("analytic.journeyDag.addNewEventType")}
      </button>
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const NODE_W = 200
const NODE_H = 130

function getLayoutedNodes(nodes: Node<JourneyNodeData>[], edges: Edge[]): Node<JourneyNodeData>[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 })

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }))
  edges.forEach((e) => g.setEdge(e.source, e.target))

  dagre.layout(g)

  return nodes.map((n) => {
    const pos = g.node(n.id)
    return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } }
  })
}

// ─── Node stats context ───────────────────────────────────────────────────────

/** Maps event_type → { playerCount, eventCount } aggregated across the selected date range */
const NodeStatsContext = React.createContext<Map<string, { playerCount: number; eventCount: number }>>(new Map())

/** Maps journey-node ID → dashboard stats (total_reached, currently_at, drop_off_rate) */
const NodeDashboardStatsContext = React.createContext<Map<string, JourneyNodeStats>>(new Map())

/** Maps event_type → events from the inspected session (in occurred_at ASC order) */
const SessionEventsContext = React.createContext<Map<string, JourneyEvent[]>>(new Map())

// ─── Node action context ─────────────────────────────────────────────────────

const DagNodeActionsContext = React.createContext<{
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onChangeType: (id: string, type: "staging" | "start" | "end") => void
}>({
  onEdit: () => {},
  onDelete: () => {},
  onChangeType: () => {},
})

// ─── Custom Node ──────────────────────────────────────────────────────────────

type JourneyNodeData = {
  name: string
  eventType: string
  nodeType: "start" | "end" | string
  nodeDefId?: string
}

const NODE_TYPE_OPTIONS = [
  { value: "staging", label: "—",     activeClass: "bg-muted text-foreground" },
  { value: "start",   label: "Start", activeClass: "bg-green-600 text-white" },
  { value: "end",     label: "End",   activeClass: "bg-orange-500 text-white" },
] as const

function JourneyNode({ id, data }: NodeProps<Node<JourneyNodeData>>) {
  const { t } = useTranslation()
  const { onEdit, onDelete, onChangeType } = useContext(DagNodeActionsContext)
  const statsMap = useContext(NodeStatsContext)
  const dashboardStatsMap = useContext(NodeDashboardStatsContext)
  const sessionEventsMap = useContext(SessionEventsContext)
  const isStart = data.nodeType === "start"
  const isEnd = data.nodeType === "end"
  const stats = statsMap.get(data.eventType)
  const dashboardStats = dashboardStatsMap.get(id)
  const sessionEvents = sessionEventsMap.get(data.eventType)
  const sessionHit = !!sessionEvents && sessionEvents.length > 0
  const [copied, setCopied] = useState(false)
  const [eventsOpen, setEventsOpen] = useState(false)

  const handleCopyEventType = (e: React.MouseEvent) => {
    e.stopPropagation()
    const text = data.eventType
    const doCopy = () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(doCopy).catch(() => {
        const el = document.createElement("textarea")
        el.value = text
        document.body.appendChild(el)
        el.select()
        document.execCommand("copy")
        document.body.removeChild(el)
        doCopy()
      })
    } else {
      const el = document.createElement("textarea")
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
      doCopy()
    }
  }

  return (
    <div
      className={cn(
        "group rounded-lg border bg-card text-card-foreground shadow-sm px-3 py-2 select-none relative",
        isStart && "border-green-500 ring-1 ring-green-500",
        isEnd && "border-orange-400 ring-1 ring-orange-400",
        sessionHit && !isStart && !isEnd && "border-sky-500 ring-2 ring-sky-400/70",
        sessionHit && (isStart || isEnd) && "ring-2 ring-sky-400/70",
      )}
      style={{ width: NODE_W, minHeight: NODE_H }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background"
      />
      {sessionHit && (
        <Popover open={eventsOpen} onOpenChange={setEventsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEventsOpen((v) => !v) }}
              className="absolute -top-2.5 -right-2.5 z-10 flex items-center gap-0.5 bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-md border border-white dark:border-background"
              title={`${sessionEvents!.length} event${sessionEvents!.length !== 1 ? "s" : ""} in this session`}
            >
              <Zap className="h-3 w-3" />
              {sessionEvents!.length}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[320px] p-0" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b">
              <p className="text-sm font-medium leading-tight">{data.name}</p>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{data.eventType}</p>
            </div>
            <div className="max-h-[320px] overflow-auto p-2 space-y-1.5">
              {sessionEvents!.map((ev, idx) => (
                <div key={ev.id} className="rounded border bg-muted/30 p-2">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>#{idx + 1}</span>
                    <span>{new Date(ev.occurred_at).toLocaleString()}</span>
                  </div>
                  {ev.event_data && Object.keys(ev.event_data).length > 0 ? (
                    <pre className="text-[10px] font-mono whitespace-pre-wrap break-all max-h-40 overflow-auto">
                      {JSON.stringify(ev.event_data, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
      {stats && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 whitespace-nowrap">
          <div
            className="flex items-center gap-0.5 bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-md"
            title={`${stats.playerCount.toLocaleString()} ${t("analytic.journeyDag.uniquePlayers")}`}
          >
            <Users className="h-3 w-3" />
            {stats.playerCount.toLocaleString()}
          </div>
          <div
            className="flex items-center gap-0.5 bg-violet-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-md"
            title={`${stats.eventCount.toLocaleString()} ${t("analytic.journeyDag.events")}`}
          >
            <Zap className="w-3 h-3" />
            {stats.eventCount.toLocaleString()}
          </div>
        </div>
      )}
      <p className="text-sm font-medium leading-tight truncate">{data.name}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight flex items-center gap-0.5">
        <span className="font-medium">{t("analytic.journeyDag.eventLabel")}</span>
        <span className="truncate">{data.eventType}</span>
        <button
          onClick={handleCopyEventType}
          className="shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          title={t("analytic.journeyDag.copyEventType")}
        >
          {copied
            ? <Check className="h-2.5 w-2.5 text-green-500" />
            : <Copy className="h-2.5 w-2.5" />}
        </button>
      </p>
      {/* Dashboard stats row */}
      {dashboardStats && (
        <div className="grid grid-cols-3 gap-0.5 mt-1.5">
          <div className="flex flex-col items-center rounded px-1 py-0.5 bg-blue-500/10" title={t("analytic.journeyDag.totalPlayersReachedThisNode")}>
            <span className="text-[9px] text-muted-foreground leading-tight">{t("analytic.journeyDag.reached")}</span>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 leading-tight">{dashboardStats.total_reached}</span>
          </div>
          <div className="flex flex-col items-center rounded px-1 py-0.5 bg-emerald-500/10" title={t("analytic.journeyDag.playersCurrentlyAtThisNode")}>
            <span className="text-[9px] text-muted-foreground leading-tight">{t("analytic.journeyDag.here")}</span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 leading-tight">{dashboardStats.currently_at}</span>
          </div>
          <div className="flex flex-col items-center rounded px-1 py-0.5 bg-orange-500/10" title={t("analytic.journeyDag.dropOffRateFromThisNode")}>
            <span className="text-[9px] text-muted-foreground leading-tight">{t("analytic.journeyDag.drop")}</span>
            <span className={cn("text-[10px] font-bold leading-tight", dashboardStats.drop_off_rate > 0.5 ? "text-destructive" : "text-orange-500 dark:text-orange-400")}>
              {(dashboardStats.drop_off_rate * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
      {/* Node type toggle + Edit / Delete */}
      <div className="mt-1.5 flex gap-1 items-center">
        <span className="text-[10px] text-muted-foreground mr-0.5">{t("analytic.journeyDag.typeLabel")}</span>
        {NODE_TYPE_OPTIONS.map((opt) => {
          const active = data.nodeType === opt.value
          const label =
            opt.value === "start"
              ? t("analytic.journeyDag.start")
              : opt.value === "end"
                ? t("analytic.journeyDag.end")
                : opt.label
          return (
            <button
              key={opt.value}
              onClick={(e) => { e.stopPropagation(); onChangeType(id, opt.value) }}
              title={opt.value}
              className={cn(
                "text-[10px] font-bold rounded px-1.5 py-0 h-4 leading-4 transition-colors border",
                active
                  ? cn(opt.activeClass, "border-transparent")
                  : "bg-background text-muted-foreground border-border hover:border-foreground/40",
              )}
            >
              {label}
            </button>
          )
        })}
        <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(id) }}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(id) }}
            className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background"
      />
    </div>
  )
}

const nodeTypes: NodeTypes = { journeyNode: JourneyNode }

// ─── Metadata row editor ──────────────────────────────────────────────────────

function MetaRows({
  rows,
  onChange,
}: {
  rows: { k: string; v: string }[]
  onChange: (rows: { k: string; v: string }[]) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            placeholder={t("analytic.metaPlaceholderKey")}
            value={row.k}
            onChange={(e) => {
              const next = [...rows]
              next[i] = { ...next[i], k: e.target.value }
              onChange(next)
            }}
            className="w-1/3 h-8 text-xs"
          />
          <span className="text-muted-foreground text-xs">:</span>
          <Input
            placeholder={t("analytic.metaPlaceholderValue")}
            value={row.v}
            onChange={(e) => {
              const next = [...rows]
              next[i] = { ...next[i], v: e.target.value }
              onChange(next)
            }}
            className="flex-1 h-8 text-xs"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-destructive"
            onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        type="button"
        className="h-7 text-xs"
        onClick={() => onChange([...rows, { k: "", v: "" }])}
      >
        <Plus className="h-3 w-3 mr-1" />
        {t("analytic.metaAddField")}
      </Button>
    </div>
  )
}

// ─── Node Definitions Panel ───────────────────────────────────────────────────

interface NodeDefsPanelProps {
  gameId: string
  defs: JourneyDagNodeDefinition[]
  loading: boolean
  usedDefIds: Set<string>
  onRefresh: () => void
  onAddToDag: (def: JourneyDagNodeDefinition) => void
  editDef: JourneyDagNodeDefinition | null
  setEditDef: (def: JourneyDagNodeDefinition | null) => void
  maxNodeDefinitions?: number
}

function NodeDefsPanel({ gameId, defs, loading, usedDefIds, onRefresh, onAddToDag, editDef, setEditDef, maxNodeDefinitions }: NodeDefsPanelProps) {
  const { t } = useTranslation()
  const { toast } = useToast()

  // Create
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: "",
    node_key: "",
    description: "",
    event_type: "arrive",
  })
  const [createMetaRows, setCreateMetaRows] = useState<{ k: string; v: string }[]>([])
  const [createSaving, setCreateSaving] = useState(false)
  const [autoSlug, setAutoSlug] = useState(true)

  // Edit
  const [editForm, setEditForm] = useState({ name: "", description: "", event_type: "" })
  const [editMetaRows, setEditMetaRows] = useState<{ k: string; v: string }[]>([])
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    if (editDef) {
      setEditForm({ name: editDef.name, description: editDef.description ?? "", event_type: editDef.event_type })
      setEditMetaRows(Object.entries(editDef.metadata ?? {}).map(([k, v]) => ({ k, v: String(v) })))
    }
  }, [editDef])

  // Delete
  const [deleteDef, setDeleteDef] = useState<JourneyDagNodeDefinition | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)

  const slugify = (text: string) => toSlugUnderscore(text)

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.node_key.trim() || !createForm.event_type.trim()) {
      toast({ variant: "destructive", title: t("analytic.toastValidation"), description: t("analytic.journeyDag.nameNodeKeyEventTypeRequired") })
      return
    }
    setCreateSaving(true)
    try {
      const meta: Record<string, string> = {}
      for (const row of createMetaRows) {
        if (row.k.trim()) meta[row.k.trim()] = row.v
      }
      await createNodeDefinition(gameId, { ...createForm, metadata: meta })
      toast({ title: t("analytic.journeyDag.journeyNodeCreated") })
      setCreateOpen(false)
      onRefresh()
    } catch {
      toast({ variant: "destructive", title: t("analytic.toastError"), description: t("analytic.journeyDag.failedCreateJourneyNode") })
    } finally {
      setCreateSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!editDef) return
    setEditSaving(true)
    try {
      const meta: Record<string, string> = {}
      for (const row of editMetaRows) {
        if (row.k.trim()) meta[row.k.trim()] = row.v
      }
      await updateNodeDefinition(gameId, editDef.id, { ...editForm, metadata: meta })
      toast({ title: t("analytic.journeyDag.journeyNodeUpdated") })
      setEditDef(null)
      onRefresh()
    } catch {
      toast({ variant: "destructive", title: t("analytic.toastError"), description: t("analytic.journeyDag.failedUpdateJourneyNode") })
    } finally {
      setEditSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteDef) return
    setDeleteSaving(true)
    try {
      await deleteNodeDefinition(gameId, deleteDef.id)
      toast({ title: t("analytic.journeyDag.journeyNodeDeleted") })
      setDeleteDef(null)
      onRefresh()
    } catch {
      toast({ variant: "destructive", title: t("analytic.toastError"), description: t("analytic.journeyDag.failedDeleteJourneyNode") })
    } finally {
      setDeleteSaving(false)
    }
  }

  const availableDefs = defs.filter((d) => !usedDefIds.has(d.id))

  return (
    <>
      <div className="w-72 border-l flex flex-col bg-background shrink-0">
        {/* Header */}
        <div className="px-3 py-2 border-b flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium">{t("analytic.journeyDag.journeyNode")}</span>
            {!loading && availableDefs.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {availableDefs.length}
              </Badge>
            )}
          </div>
          <div className="flex gap-1 items-center">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs px-2"
              disabled={maxNodeDefinitions != null && defs.length >= maxNodeDefinitions}
              title={maxNodeDefinitions != null && defs.length >= maxNodeDefinitions ? `${t("analytic.journeyDag.limitReached")} (${maxNodeDefinitions})` : undefined}
              onClick={() => {
                setCreateForm({ name: "", node_key: "", description: "", event_type: "arrive" })
                setCreateMetaRows([])
                setAutoSlug(true)
                setCreateOpen(true)
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t("analytic.journeyDag.new")}
            </Button>
          </div>
        </div>

        {/* Usage bar */}
        {maxNodeDefinitions != null && (
          <div className="px-3 py-1.5 border-b bg-muted/10">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span className="flex items-center gap-1">
                {t("analytic.journeyDag.usage")}
                <a
                  href={`/games/${gameId}/plugins`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                  title={t("analytic.managePluginsTitle")}
                >
                  <Hammer className="h-2.5 w-2.5" />
                </a>
              </span>
              <span className={defs.length >= maxNodeDefinitions ? "text-destructive font-semibold" : ""}>
                {defs.length} / {maxNodeDefinitions}
              </span>
            </div>
            <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  defs.length >= maxNodeDefinitions ? "bg-destructive" :
                  defs.length / maxNodeDefinitions >= 0.7 ? "bg-yellow-500" : "bg-primary"
                }`}
                style={{ width: `${Math.min(100, (defs.length / maxNodeDefinitions) * 100)}%` }}
              />
            </div>
          </div>
        )}
        {/* Drag hint */}
        {!loading && availableDefs.length > 0 && (
          <p className="px-3 py-1.5 text-[10px] text-muted-foreground border-b bg-muted/20">
            {t("analytic.journeyDag.dragOntoCanvasOrClick")}&nbsp;<PlusCircle className="inline h-3 w-3" />&nbsp;{t("analytic.journeyDag.toAddToJourney")}
          </p>
        )}

        {/* List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : defs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-muted-foreground gap-2">
              <p className="text-xs">{t("analytic.journeyDag.noJourneyNodesYet")}</p>
              <p className="text-xs">{t("analytic.journeyDag.createOneToStartBuilding")}</p>
            </div>
          ) : availableDefs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-muted-foreground gap-2">
              <p className="text-xs">{t("analytic.journeyDag.allDefinitionsAreInThisJourney")}</p>
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              {availableDefs.map((def) => (
                <div
                  key={def.id}
                  className="group rounded-md border bg-card px-3 py-2 hover:bg-muted/40 transition-colors cursor-grab active:cursor-grabbing"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/journey-node-def", def.id)
                    e.dataTransfer.effectAllowed = "move"
                  }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{def.name}</p>
                      <code className="text-[10px] text-muted-foreground block truncate">
                        {def.node_key}
                      </code>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-3.5 mt-1 font-normal">
                        {def.event_type}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-primary hover:text-primary"
                        title={t("analytic.journeyDag.addToJourney")}
                        onClick={() => onAddToDag(def)}
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          setEditDef(def)
                          setEditForm({
                            name: def.name,
                            description: def.description ?? "",
                            event_type: def.event_type,
                          })
                          setEditMetaRows(
                            Object.entries(def.metadata ?? {}).map(([k, v]) => ({ k, v: String(v) })),
                          )
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {!["ending1", "join_game"].includes(def.event_type) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setDeleteDef(def)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── Create Sheet ─────────────────────────────────────────────────────── */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto" side="right">
          <SheetHeader>
            <SheetTitle>{t("analytic.journeyDag.newJourneyNode")}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label>{t("analytic.labelName")} <span className="text-destructive">*</span></Label>
              <Input
                value={createForm.name}
                onChange={(e) => {
                  const newName = e.target.value
                  setCreateForm((f) => ({
                    ...f,
                    name: newName,
                    node_key: autoSlug ? slugify(newName) : f.node_key,
                  }))
                }}
                placeholder={t("analytic.journeyDag.placeholderNodeName")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("analytic.journeyDag.nodeKey")} <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input
                  value={createForm.node_key}
                  onChange={(e) => {
                    setCreateForm((f) => ({ ...f, node_key: e.target.value }))
                    setAutoSlug(false)
                  }}
                  placeholder={t("analytic.journeyDag.placeholderNodeKey")}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant={autoSlug ? "default" : "outline"}
                  size="icon"
                  className="shrink-0"
                  onClick={() => {
                    const next = !autoSlug
                    setAutoSlug(next)
                    if (next) setCreateForm((f) => ({ ...f, node_key: slugify(f.name) }))
                  }}
                  title={autoSlug ? t("analytic.autoSlugEnabled") : t("analytic.autoSlugDisabled")}
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
              </div>
              {autoSlug && (
                <p className="text-xs text-muted-foreground">{t("analytic.journeyDag.nodeKeyWillAutoGenerateFromName")}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("analytic.labelEventType")} <span className="text-destructive">*</span></Label>
              <EventTypeCombobox
                value={createForm.event_type}
                onChange={(v) => setCreateForm((f) => ({ ...f, event_type: v }))}
                gameId={gameId}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("analytic.labelDescription")}</Label>
              <Textarea
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <SheetFooter className="mt-6 flex gap-2">
            <SheetClose asChild>
              <Button variant="outline">{t("analytic.btnCancel")}</Button>
            </SheetClose>
            <Button onClick={handleCreate} disabled={createSaving}>
              {createSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {t("analytic.btnCreate")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Edit Sheet ───────────────────────────────────────────────────────── */}
      <Sheet open={!!editDef} onOpenChange={(open) => { if (!open) setEditDef(null) }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto" side="right">
          <SheetHeader>
            <SheetTitle>{t("analytic.journeyDag.editJourneyNode")}</SheetTitle>
          </SheetHeader>
          {editDef && (
            <div className="space-y-4 mt-6">
              <p className="text-xs text-muted-foreground">
                {t("analytic.tableHeaderKey")}: <code>{editDef.node_key}</code>
              </p>
              <div className="space-y-1.5">
                <Label>{t("analytic.labelName")}</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("analytic.labelEventType")}</Label>
                <EventTypeCombobox
                  value={editForm.event_type}
                  onChange={(v) => setEditForm((f) => ({ ...f, event_type: v }))}
                  gameId={gameId}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("analytic.labelDescription")}</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          )}
          <SheetFooter className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setEditDef(null)}>{t("analytic.btnCancel")}</Button>
            <Button onClick={handleEdit} disabled={editSaving}>
              {editSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {t("analytic.btnSave")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Delete Dialog ─────────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteDef} onOpenChange={(open) => { if (!open) setDeleteDef(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("analytic.journeyDag.deleteJourneyNode")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("analytic.journeyDag.deleteJourneyNodeDesc")}{" "}
              <span className="font-semibold">{deleteDef?.name}</span>
              {t("analytic.journeyDag.deleteJourneyNodeDescSuffix")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("analytic.btnCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {t("analytic.btnDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ─── Main component (inside ReactFlowProvider) ────────────────────────────────

interface Props {
  gameId: string
  journeyId: string
  description?: string
  maxNodeDefinitions?: number
  /** Optional initial session ID to inspect (events will be fetched and highlighted on DAG). */
  initialSessionId?: string
}

function JourneyDagInner({ gameId, journeyId, description, maxNodeDefinitions, initialSessionId }: Props) {
  const { t } = useTranslation()
  const { screenToFlowPosition, fitView } = useReactFlow()
  const { toast } = useToast()
  const tRef = useRef(t)
  const toastRef = useRef(toast)
  tRef.current = t
  toastRef.current = toast

  const [rfNodes, setRfNodes] = useNodesState<Node<JourneyNodeData>>([])
  const [rfEdges, setRfEdges] = useEdgesState<Edge>([])
  const [isSaving, setIsSaving] = useState(false)
  const [dagLoading, setDagLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  const [dagError, setDagError] = useState<string | null>(null)
  const [usedDefIds, setUsedDefIds] = useState<Set<string>>(new Set())
  const [allDefs, setAllDefs] = useState<JourneyDagNodeDefinition[]>([])
  const [defsLoading, setDefsLoading] = useState(true)
  const [editDef, setEditDef] = useState<JourneyDagNodeDefinition | null>(null)

  // Event stats
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  })
  const [nodeStatsMap, setNodeStatsMap] = useState<Map<string, { playerCount: number; eventCount: number }>>(new Map())
  const [statsLoading, setStatsLoading] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  // Journey dashboard stats
  const [dashboardStatsMap, setDashboardStatsMap] = useState<Map<string, JourneyNodeStats>>(new Map())
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardRefreshedAt, setDashboardRefreshedAt] = useState<string | null>(null)

  // Session inspection (given a session_id, fetch its events and map by event_type)
  const [sessionIdInput, setSessionIdInput] = useState(initialSessionId ?? "")
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId ?? null)
  const [sessionEventsMap, setSessionEventsMap] = useState<Map<string, JourneyEvent[]>>(new Map())
  const [sessionEventsLoading, setSessionEventsLoading] = useState(false)
  const [sessionEventsError, setSessionEventsError] = useState<string | null>(null)
  const [sessionEventsTotal, setSessionEventsTotal] = useState<number | null>(null)

  // Refs updated inline each render — lets the debounced callback read fresh state
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rfNodesRef = useRef(rfNodes)
  const rfEdgesRef = useRef(rfEdges)
  rfNodesRef.current = rfNodes
  rfEdgesRef.current = rfEdges

  // Cleanup pending timer on unmount
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }, [])

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const nodes = rfNodesRef.current
      const edges = rfEdgesRef.current
      setIsSaving(true)
      try {
        const nodeDefMap = new Map(nodes.map((n) => [n.id, n.data.nodeDefId]))
        const payload: SaveJourneyDagRequest = {
          nodes: nodes.map((n) => ({
            definition_id: n.data.nodeDefId!,
            node_type: n.data.nodeType,
            position_x: Math.round(n.position.x),
            position_y: Math.round(n.position.y),
          })),
          edges: edges.map((e) => ({
            from_definition_id: nodeDefMap.get(e.source)!,
            to_definition_id: nodeDefMap.get(e.target)!,
          })),
        }
        await saveJourneyDag(gameId, journeyId, payload)
      } catch {
        toastRef.current({
          variant: "destructive",
          title: tRef.current("analytic.toastError"),
          description: tRef.current("analytic.journeyDag.failedSaveDag"),
        })
      } finally {
        setIsSaving(false)
      }
    }, 800)
  }, [gameId, journeyId])

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      setRfEdges((eds) => applyEdgeChanges(changes, eds))
      if (changes.some((c) => c.type === "remove")) {
        scheduleSave()
      }
    },
    [setRfEdges, scheduleSave],
  )

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<JourneyNodeData>>[]) => {
      const removals = changes.filter((c) => c.type === "remove")
      if (removals.length > 0) {
        setRfNodes((nds) => {
          const removedIds = new Set(removals.map((c) => c.id))
          const removedDefIds = nds
            .filter((n) => removedIds.has(n.id))
            .map((n) => n.data.nodeDefId)
            .filter(Boolean) as string[]
          if (removedDefIds.length > 0) {
            setUsedDefIds((prev) => {
              const next = new Set(prev)
              removedDefIds.forEach((id) => next.delete(id))
              return next
            })
          }
          return applyNodeChanges(changes, nds)
        })
        scheduleSave()
        return
      }
      setRfNodes((nds) => applyNodeChanges(changes, nds))
      if (changes.some((c) => c.type === "position" && !c.dragging)) {
        scheduleSave()
      }
    },
    [setRfNodes, setUsedDefIds, scheduleSave],
  )

  const loadDag = useCallback(async (silent = false) => {
    if (!silent) setDagLoading(true)
    setDagError(null)
    try {
      const dag = await getJourneyDag(gameId, journeyId)
      const rawNodes = dag.nodes ?? []
      const rawEdges = dag.edges ?? []
      const nodes: Node<JourneyNodeData>[] = rawNodes.map((n) => ({
        id: n.id,
        type: "journeyNode",
        position: { x: n.position_x, y: n.position_y },
        data: { name: n.definition.name, eventType: n.definition.event_type, nodeType: n.node_type, nodeDefId: n.node_definition_id },
      }))
      const edges: Edge[] = rawEdges.map((e) => ({
        id: e.id,
        source: e.from_node_id,
        target: e.to_node_id,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 1.5 },
      }))
      const hasPositions = rawNodes.some((n) => n.position_x !== 0 || n.position_y !== 0)
      setRfNodes(hasPositions ? nodes : getLayoutedNodes(nodes, edges))
      setRfEdges(edges)
      setUsedDefIds(new Set(rawNodes.map((n) => n.node_definition_id)))
    } catch {
      setDagError(tRef.current("analytic.journeyDag.failedLoadDag"))
    } finally {
      if (!silent) setDagLoading(false)
    }
  }, [gameId, journeyId, setRfNodes, setRfEdges])

  const loadDefs = useCallback(async () => {
    setDefsLoading(true)
    try {
      const data = await listNodeDefinitions(gameId)
      setAllDefs(data)
    } catch {
      toastRef.current({ variant: "destructive", title: tRef.current("analytic.toastError"), description: tRef.current("analytic.journeyDag.failedLoadJourneyNodes") })
    } finally {
      setDefsLoading(false)
    }
  }, [gameId])

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const params: { from?: string; to?: string } = {}
      if (dateRange?.from) params.from = format(dateRange.from, "yyyy-MM-dd")
      if (dateRange?.to) params.to = format(dateRange.to, "yyyy-MM-dd")
      const res = await getEventStats(gameId, params)
      const agg = new Map<string, { playerCount: number; eventCount: number }>()
      for (const s of res.stats) {
        const prev = agg.get(s.event_type) ?? { playerCount: 0, eventCount: 0 }
        agg.set(s.event_type, {
          playerCount: prev.playerCount + s.player_count,
          eventCount: prev.eventCount + s.event_count,
        })
      }
      setNodeStatsMap(agg)
    } catch {
      // silently ignore — stats are non-critical
    } finally {
      setStatsLoading(false)
    }
  }, [gameId, dateRange])

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true)
    try {
      const data = await getJourneyDashboard(gameId, journeyId)
      const map = new Map<string, JourneyNodeStats>()
      for (const node of data.nodes) {
        map.set(node.id, node.stats)
      }
      setDashboardStatsMap(map)
      setDashboardRefreshedAt(data.refreshed_at)
    } catch {
      // silently ignore — dashboard stats are non-critical
    } finally {
      setDashboardLoading(false)
    }
  }, [gameId, journeyId])

  useEffect(() => { loadDag(); loadDefs() }, [loadDag, loadDefs])
  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { loadDashboard() }, [loadDashboard])

  const loadSessionEvents = useCallback(async (sessionId: string) => {
    setSessionEventsLoading(true)
    setSessionEventsError(null)
    try {
      const res = await getJourneySessionEvents(gameId, sessionId, { limit: 500, offset: 0 })
      const events = (res.events ?? [])
        .slice()
        .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime())
      const map = new Map<string, JourneyEvent[]>()
      for (const ev of events) {
        const arr = map.get(ev.event_type) ?? []
        arr.push(ev)
        map.set(ev.event_type, arr)
      }
      setSessionEventsMap(map)
      setSessionEventsTotal(res.total ?? events.length)
    } catch (err: any) {
      setSessionEventsError(err?.message ?? "Failed to load session events")
      setSessionEventsMap(new Map())
      setSessionEventsTotal(null)
    } finally {
      setSessionEventsLoading(false)
    }
  }, [gameId])

  // Auto-fetch when activeSessionId changes
  useEffect(() => {
    if (activeSessionId) {
      loadSessionEvents(activeSessionId)
    } else {
      setSessionEventsMap(new Map())
      setSessionEventsTotal(null)
      setSessionEventsError(null)
    }
  }, [activeSessionId, loadSessionEvents])

  const addNodeToDag = useCallback(
    (def: JourneyDagNodeDefinition, x: number, y: number) => {
      const newNode: Node<JourneyNodeData> = {
        id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: "journeyNode",
        position: { x, y },
        data: { name: def.name, eventType: def.event_type, nodeType: "staging", nodeDefId: def.id },
      }
      setRfNodes((ns) => [...ns, newNode])
      setUsedDefIds((prev) => new Set([...prev, def.id]))
      scheduleSave()
    },
    [setRfNodes, scheduleSave],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      setRfEdges((eds) =>
        addEdge({ ...connection, markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 1.5 } }, eds),
      )
      scheduleSave()
    },
    [setRfEdges, scheduleSave],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const defId = e.dataTransfer.getData("application/journey-node-def")
      if (!defId) return
      const def = allDefs.find((d) => d.id === defId)
      if (!def) return
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      addNodeToDag(def, pos.x, pos.y)
    },
    [allDefs, screenToFlowPosition, addNodeToDag],
  )

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setRfNodes((nds) => {
        const target = nds.find((n) => n.id === nodeId)
        if (target?.data.nodeDefId) {
          setUsedDefIds((prev) => {
            const next = new Set(prev)
            next.delete(target.data.nodeDefId!)
            return next
          })
        }
        return nds.filter((n) => n.id !== nodeId)
      })
      setRfEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
      scheduleSave()
    },
    [setRfNodes, setUsedDefIds, setRfEdges, scheduleSave],
  )

  const handleChangeNodeType = useCallback(
    (nodeId: string, newType: "staging" | "start" | "end") => {
      setRfNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, nodeType: newType } } : n,
        ),
      )
      scheduleSave()
    },
    [setRfNodes, scheduleSave],
  )

  const nodeActions = React.useMemo(
    () => ({
      onEdit: (nodeId: string) => {
        const node = rfNodesRef.current.find((n) => n.id === nodeId)
        if (!node?.data.nodeDefId) return
        const def = allDefs.find((d) => d.id === node.data.nodeDefId)
        if (def) setEditDef(def)
      },
      onDelete: handleDeleteNode,
      onChangeType: handleChangeNodeType,
    }),
    [allDefs, handleDeleteNode, handleChangeNodeType],
  )

  const handleAutoLayout = useCallback(() => {
    setRfNodes((nds) => getLayoutedNodes(nds, rfEdgesRef.current))
    setTimeout(() => fitView({ padding: 0.25, duration: 300 }), 50)
    scheduleSave()
  }, [setRfNodes, fitView, scheduleSave])

  const handlePanelAddToDag = useCallback(
    (def: JourneyDagNodeDefinition) => {
      const avgX = rfNodes.length > 0 ? rfNodes.reduce((s, n) => s + n.position.x, 0) / rfNodes.length : 0
      const maxY = rfNodes.length > 0 ? Math.max(...rfNodes.map((n) => n.position.y + NODE_H)) : 0
      addNodeToDag(def, avgX, maxY + 80)
    },
    [rfNodes, addNodeToDag],
  )

  return (
    <DagNodeActionsContext.Provider value={nodeActions}>
    <NodeStatsContext.Provider value={nodeStatsMap}>
    <NodeDashboardStatsContext.Provider value={dashboardStatsMap}>
    <SessionEventsContext.Provider value={sessionEventsMap}>
    <div className="space-y-2">
      {/* Journey description */}
      <p className="text-sm text-muted-foreground">{description || t("analytic.journeyDag.noDescription")}</p>

      {/* Journey ID + Session inspector (same row) */}
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground h-8">
          <span>Journey ID:</span>
          <code className="text-xs bg-muted px-1 py-0.5 rounded">{journeyId}</code>
          <CopyButton text={journeyId} />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs font-medium">Session ID:</Label>
            <Input
              value={sessionIdInput}
              onChange={(e) => setSessionIdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  setActiveSessionId(sessionIdInput.trim() || null)
                }
              }}
              placeholder="session UUID"
              className="h-8 text-xs font-mono w-[360px] max-w-full"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setActiveSessionId(sessionIdInput.trim() || null)}
              disabled={sessionEventsLoading || !sessionIdInput.trim()}
            >
              {sessionEventsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Load"}
            </Button>
            {activeSessionId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => { setSessionIdInput(""); setActiveSessionId(null) }}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
          {sessionEventsError ? (
            <span className="text-[11px] text-destructive">{sessionEventsError}</span>
          ) : activeSessionId && sessionEventsTotal != null ? (
            <span className="text-[11px] text-muted-foreground">
              {sessionEventsTotal} event{sessionEventsTotal !== 1 ? "s" : ""} matched on {sessionEventsMap.size} event type{sessionEventsMap.size !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">Paste a session UUID to highlight events on the DAG.</span>
          )}
        </div>
        <div className="ml-auto self-end flex items-center h-8">
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>{format(dateRange.from, "MMM d, yyyy")} – {format(dateRange.to, "MMM d, yyyy")}</>
                  ) : (
                    format(dateRange.from, "MMM d, yyyy")
                  )
                ) : (
                  t("analytic.journeyDag.pickDateRange")
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                defaultMonth={dateRange?.from}
                disabled={{ after: new Date() }}
              />
              <div className="flex gap-1 px-3 pb-3">
                {[7, 14, 30].map((d) => (
                  <Button
                    key={d}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex-1"
                    onClick={() => {
                      setDateRange({ from: subDays(new Date(), d), to: new Date() })
                      setDatePickerOpen(false)
                    }}
                  >
                    {d}d
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex h-[480px] w-full rounded-md border bg-muted/10 overflow-hidden">
      {/* DAG canvas */}
      <div className="flex-1 min-w-0 relative">
        {dagLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : dagError ? (
          <div className="flex items-center justify-center h-full text-sm text-destructive">
            {dagError}
          </div>
        ) : (
          <>
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              onConnect={onConnect}
              deleteKeyCode={["Delete", "Backspace"]}
              selectionOnDrag
              panOnDrag={[1, 2]}
              selectionMode={SelectionMode.Partial}
              multiSelectionKeyCode={["Meta", "Control"]}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              minZoom={0.01}
              proOptions={{ hideAttribution: true }}
              onDragOver={onDragOver}
              onDrop={onDrop}
            >
              <Background />
              <Controls>
                <ControlButton onClick={handleAutoLayout} title={t("analytic.journeyDag.autoLayout")}>
                  <Wand2 className="h-3.5 w-3.5" />
                </ControlButton>
              </Controls>
              {rfNodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-xs text-muted-foreground">{t("analytic.journeyDag.dropNodesHereOrClickInPanel")}</p>
                </div>
              )}
            </ReactFlow>
            {/* Top-right action buttons */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 bg-background/80 backdrop-blur-sm"
                onClick={() => { loadDag(true); loadDefs(); loadStats(); loadDashboard() }}
                title={t("analytic.journeyDag.refreshDag")}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 bg-background/80 backdrop-blur-sm"
                onClick={() => setPanelOpen((v) => !v)}
                title={panelOpen ? t("analytic.journeyDag.hidePanel") : t("analytic.journeyDag.showPanel")}
              >
                {panelOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {isSaving && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md border">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("analytic.journeyDag.saving")}
              </div>
            )}
          </>
        )}
      </div>

      {/* Node definitions panel */}
      {panelOpen && (
        <NodeDefsPanel
          gameId={gameId}
          defs={allDefs}
          loading={defsLoading}
          usedDefIds={usedDefIds}
          onRefresh={loadDefs}
          onAddToDag={handlePanelAddToDag}
          editDef={editDef}
          setEditDef={setEditDef}
          maxNodeDefinitions={maxNodeDefinitions}
        />
      )}

    </div>
    </div>
    </SessionEventsContext.Provider>
    </NodeDashboardStatsContext.Provider>
    </NodeStatsContext.Provider>
    </DagNodeActionsContext.Provider>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

export function JourneyDagView({ gameId, journeyId, description, maxNodeDefinitions, initialSessionId }: Props) {
  return (
    <ReactFlowProvider>
      <JourneyDagInner
        gameId={gameId}
        journeyId={journeyId}
        description={description}
        maxNodeDefinitions={maxNodeDefinitions}
        initialSessionId={initialSessionId}
      />
    </ReactFlowProvider>
  )
}
