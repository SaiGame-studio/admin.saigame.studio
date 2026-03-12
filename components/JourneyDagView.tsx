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
import { Loader2, Plus, Pencil, Trash2, RefreshCw, X, Wand2, PlusCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  getJourneyDag,
  saveJourneyDag,
  listNodeDefinitions,
  createNodeDefinition,
  updateNodeDefinition,
  deleteNodeDefinition,
  type JourneyDagNodeDefinition,
  type SaveJourneyDagRequest,
} from "@/lib/journey-api"

// ─── Layout ───────────────────────────────────────────────────────────────────

const NODE_W = 200
const NODE_H = 80

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

// ─── Node action context ─────────────────────────────────────────────────────

const DagNodeActionsContext = React.createContext<{
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}>({
  onEdit: () => {},
  onDelete: () => {},
})

// ─── Custom Node ──────────────────────────────────────────────────────────────

type JourneyNodeData = {
  name: string
  eventType: string
  nodeType: "start" | "end" | string
  nodeDefId?: string
}

function JourneyNode({ id, data }: NodeProps<Node<JourneyNodeData>>) {
  const { onEdit, onDelete } = useContext(DagNodeActionsContext)
  const isStart = data.nodeType === "start"
  const isEnd = data.nodeType === "end"

  return (
    <div
      className={cn(
        "group rounded-lg border bg-card text-card-foreground shadow-sm px-3 py-2 select-none relative",
        isStart && "border-green-500 ring-1 ring-green-500",
        isEnd && "border-orange-400 ring-1 ring-orange-400",
      )}
      style={{ width: NODE_W, minHeight: NODE_H }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background"
      />
      <p className="text-sm font-medium leading-tight truncate">{data.name}</p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
          {data.eventType}
        </Badge>
        {isStart && (
          <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-600 text-white hover:bg-green-600">
            Start
          </Badge>
        )}
        {isEnd && (
          <Badge className="text-[10px] px-1.5 py-0 h-4 bg-orange-500 text-white hover:bg-orange-500">
            End
          </Badge>
        )}
      </div>
      {/* Edit / Delete buttons */}
      <div className="absolute bottom-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            placeholder="key"
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
            placeholder="value"
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
        Add field
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
}

function NodeDefsPanel({ gameId, defs, loading, usedDefIds, onRefresh, onAddToDag, editDef, setEditDef }: NodeDefsPanelProps) {
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

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.node_key.trim() || !createForm.event_type.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Name, Node Key, and Event Type are required." })
      return
    }
    setCreateSaving(true)
    try {
      const meta: Record<string, string> = {}
      for (const row of createMetaRows) {
        if (row.k.trim()) meta[row.k.trim()] = row.v
      }
      await createNodeDefinition(gameId, { ...createForm, metadata: meta })
      toast({ title: "Node definition created" })
      setCreateOpen(false)
      onRefresh()
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to create node definition" })
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
      toast({ title: "Node definition updated" })
      setEditDef(null)
      onRefresh()
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to update node definition" })
    } finally {
      setEditSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteDef) return
    setDeleteSaving(true)
    try {
      await deleteNodeDefinition(gameId, deleteDef.id)
      toast({ title: "Node definition deleted" })
      setDeleteDef(null)
      onRefresh()
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete node definition" })
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
            <span className="text-sm font-medium">Node Definitions</span>
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
              onClick={() => {
                setCreateForm({ name: "", node_key: "", description: "", event_type: "arrive" })
                setCreateMetaRows([])
                setAutoSlug(true)
                setCreateOpen(true)
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              New
            </Button>
          </div>
        </div>

        {/* Drag hint */}
        {!loading && availableDefs.length > 0 && (
          <p className="px-3 py-1.5 text-[10px] text-muted-foreground border-b bg-muted/20">
            Drag onto canvas or click <PlusCircle className="inline h-3 w-3" /> to add to journey
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
              <p className="text-xs">No node definitions yet.</p>
              <p className="text-xs">Create one to start building your journey.</p>
            </div>
          ) : availableDefs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-muted-foreground gap-2">
              <p className="text-xs">All definitions are in this journey.</p>
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
                    <div className="flex gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-primary hover:text-primary"
                        title="Add to journey"
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setDeleteDef(def)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
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
            <SheetTitle>New Node Definition</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
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
                placeholder="Join Game"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Node Key <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input
                  value={createForm.node_key}
                  onChange={(e) => {
                    setCreateForm((f) => ({ ...f, node_key: e.target.value }))
                    setAutoSlug(false)
                  }}
                  placeholder="join_game"
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
                  title={autoSlug ? "Auto-slug enabled" : "Auto-slug disabled"}
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
              </div>
              {autoSlug && (
                <p className="text-xs text-muted-foreground">Node key will auto-generate from name</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Event Type <span className="text-destructive">*</span></Label>
              <Input
                value={createForm.event_type}
                onChange={(e) => setCreateForm((f) => ({ ...f, event_type: e.target.value }))}
                placeholder="join_game"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <SheetFooter className="mt-6 flex gap-2">
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
            <Button onClick={handleCreate} disabled={createSaving}>
              {createSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Create
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Edit Sheet ───────────────────────────────────────────────────────── */}
      <Sheet open={!!editDef} onOpenChange={(open) => { if (!open) setEditDef(null) }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto" side="right">
          <SheetHeader>
            <SheetTitle>Edit Node Definition</SheetTitle>
          </SheetHeader>
          {editDef && (
            <div className="space-y-4 mt-6">
              <p className="text-xs text-muted-foreground">
                Key: <code>{editDef.node_key}</code>
              </p>
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Event Type</Label>
                <Input
                  value={editForm.event_type}
                  onChange={(e) => setEditForm((f) => ({ ...f, event_type: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          )}
          <SheetFooter className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setEditDef(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={editSaving}>
              {editSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Delete Dialog ─────────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteDef} onOpenChange={(open) => { if (!open) setDeleteDef(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Node Definition</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleteDef?.name}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete
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
}

function JourneyDagInner({ gameId, journeyId }: Props) {
  const { screenToFlowPosition, fitView } = useReactFlow()
  const { toast } = useToast()

  const [rfNodes, setRfNodes] = useNodesState<Node<JourneyNodeData>>([])
  const [rfEdges, setRfEdges] = useEdgesState<Edge>([])
  const [isSaving, setIsSaving] = useState(false)
  const [dagLoading, setDagLoading] = useState(true)
  const [dagError, setDagError] = useState<string | null>(null)
  const [usedDefIds, setUsedDefIds] = useState<Set<string>>(new Set())
  const [allDefs, setAllDefs] = useState<JourneyDagNodeDefinition[]>([])
  const [defsLoading, setDefsLoading] = useState(true)
  const [editDef, setEditDef] = useState<JourneyDagNodeDefinition | null>(null)

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
        toast({ variant: "destructive", title: "Error", description: "Failed to save DAG" })
      } finally {
        setIsSaving(false)
      }
    }, 800)
  }, [gameId, journeyId, toast])

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

  const loadDag = useCallback(async () => {
    setDagLoading(true)
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
      setDagError("Failed to load DAG")
    } finally {
      setDagLoading(false)
    }
  }, [gameId, journeyId, setRfNodes, setRfEdges])

  const loadDefs = useCallback(async () => {
    setDefsLoading(true)
    try {
      const data = await listNodeDefinitions(gameId)
      setAllDefs(data)
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to load node definitions" })
    } finally {
      setDefsLoading(false)
    }
  }, [gameId, toast])

  useEffect(() => { loadDag(); loadDefs() }, [loadDag, loadDefs])

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

  const nodeActions = React.useMemo(
    () => ({
      onEdit: (nodeId: string) => {
        const node = rfNodesRef.current.find((n) => n.id === nodeId)
        if (!node?.data.nodeDefId) return
        const def = allDefs.find((d) => d.id === node.data.nodeDefId)
        if (def) setEditDef(def)
      },
      onDelete: handleDeleteNode,
    }),
    [allDefs, handleDeleteNode],
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
              fitView
              fitViewOptions={{ padding: 0.25 }}
              proOptions={{ hideAttribution: true }}
              onDragOver={onDragOver}
              onDrop={onDrop}
            >
              <Background />
              <Controls>
                <ControlButton onClick={handleAutoLayout} title="Auto layout">
                  <Wand2 className="h-3.5 w-3.5" />
                </ControlButton>
              </Controls>
              {rfNodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-xs text-muted-foreground">Drop nodes here or click + in the panel</p>
                </div>
              )}
            </ReactFlow>
            {isSaving && (
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md border">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving…
              </div>
            )}
          </>
        )}
      </div>

      {/* Node definitions panel */}
      <NodeDefsPanel
        gameId={gameId}
        defs={allDefs}
        loading={defsLoading}
        usedDefIds={usedDefIds}
        onRefresh={loadDefs}
        onAddToDag={handlePanelAddToDag}
        editDef={editDef}
        setEditDef={setEditDef}
      />

    </div>
    </DagNodeActionsContext.Provider>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

export function JourneyDagView({ gameId, journeyId }: Props) {
  return (
    <ReactFlowProvider>
      <JourneyDagInner gameId={gameId} journeyId={journeyId} />
    </ReactFlowProvider>
  )
}
