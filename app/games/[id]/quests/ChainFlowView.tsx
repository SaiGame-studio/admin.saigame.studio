"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
  type Connection,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import dagre from "dagre"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Pencil, Trash2, Loader2, Plus, Search, PanelRightClose, PanelRightOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getChainLayout,
  saveChainLayout,
  type QuestChainMember,
  type QuestDefinition,
  type ChainLayoutNodePosition,
} from "@/lib/quest-api"

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestNodeData = {
  label: string
  questType: string
  isActive: boolean
  sortOrder: number
  description?: string
  member: QuestChainMember
  onEdit: (member: QuestChainMember) => void
  onRemove: (member: QuestChainMember) => void
}

// ─── Dagre Layout ─────────────────────────────────────────────────────────────

const NODE_WIDTH = 240
const NODE_HEIGHT = 100

function getLayoutedElements(
  nodes: Node<QuestNodeData>[],
  edges: Edge[],
  direction: "TB" | "LR" = "LR",
) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 })

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

// ─── Custom Quest Node ────────────────────────────────────────────────────────

function QuestNode({ data }: NodeProps<Node<QuestNodeData>>) {
  return (
    <div className="relative rounded-lg border bg-card text-card-foreground shadow-sm w-[240px] select-none">
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background" />

      <div className="p-3 space-y-1.5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-1">
          <p className="text-sm font-medium leading-tight truncate flex-1">
            {data.label}
          </p>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-muted/80 transition-colors"
              title="Edit membership"
              onClick={(e) => { e.stopPropagation(); data.onEdit(data.member) }}
            >
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
            <button
              className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-destructive/10 transition-colors"
              title="Remove from chain"
              onClick={(e) => { e.stopPropagation(); data.onRemove(data.member) }}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </button>
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <p className="text-xs text-muted-foreground truncate">{data.description}</p>
        )}

        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            #{data.sortOrder}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            {data.questType}
          </Badge>
          {data.isActive ? (
            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-600">Active</Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Inactive</Badge>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background" />
    </div>
  )
}

const nodeTypes: NodeTypes = {
  questNode: QuestNode,
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ChainFlowViewProps {
  studioId: string
  gameId: string
  chainId: string
  members: QuestChainMember[]
  questDefsMap: Record<string, QuestDefinition>
  /** Quest definitions NOT already in the chain — shown in the quick-add sidebar */
  availableQuests: QuestDefinition[]
  /** Quick-add a quest to this chain (by quest definition id) */
  onQuickAdd: (questDefinitionId: string) => Promise<void>
  onEditMember: (member: QuestChainMember) => void
  onRemoveMember: (member: QuestChainMember) => void
  /** Called when user drags a new edge (source → target). Parent should call updateChainMember API. */
  onConnectQuests: (sourceQuestId: string, targetQuestId: string) => Promise<void>
  /** Called when user deletes an edge. Parent should call updateChainMember API. */
  onDisconnectQuests: (sourceQuestId: string, targetQuestId: string) => Promise<void>
}

export function ChainFlowView(props: ChainFlowViewProps) {
  return (
    <ReactFlowProvider>
      <ChainFlowViewContent {...props} />
    </ReactFlowProvider>
  )
}

function ChainFlowViewContent({
  studioId,
  gameId,
  chainId,
  members,
  questDefsMap,
  availableQuests,
  onQuickAdd,
  onEditMember,
  onRemoveMember,
  onConnectQuests,
  onDisconnectQuests,
}: ChainFlowViewProps) {
  const { getNodes } = useReactFlow()
  const [connecting, setConnecting] = useState(false)
  const [layoutLoaded, setLayoutLoaded] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarSearch, setSidebarSearch] = useState("")
  const [addingQuestId, setAddingQuestId] = useState<string | null>(null)

  // Build raw nodes and edges from members (without layout)
  const { rawNodes, rawEdges } = useMemo(() => {
    const memberQuestIds = new Set(members.map((m) => m.quest_definition_id))

    const nodes: Node<QuestNodeData>[] = members.map((member) => {
      const def = questDefsMap[member.quest_definition_id]
      return {
        id: member.quest_definition_id,
        type: "questNode",
        position: { x: 0, y: 0 },
        data: {
          label: def?.name ?? member.quest_definition_id.slice(0, 8) + "…",
          questType: def?.quest_type ?? "unknown",
          isActive: def?.is_active ?? false,
          sortOrder: member.sort_order,
          description: def?.description,
          member,
          onEdit: onEditMember,
          onRemove: onRemoveMember,
        },
      }
    })

    const edges: Edge[] = []
    for (const member of members) {
      for (const unlockId of member.unlock_quest_ids) {
        if (memberQuestIds.has(unlockId)) {
          edges.push({
            id: `${member.quest_definition_id}->${unlockId}`,
            source: member.quest_definition_id,
            target: unlockId,
            animated: true,
            style: { strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 16,
              height: 16,
            },
          })
        }
      }
    }

    return { rawNodes: nodes, rawEdges: edges }
  }, [members, questDefsMap, onEditMember, onRemoveMember])

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<QuestNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Load saved layout from API, fall back to dagre auto-layout
  useEffect(() => {
    let cancelled = false
    async function loadLayout() {
      let posMap: Record<string, { x: number; y: number }> | null = null
      try {
        const layout = await getChainLayout(studioId, gameId, chainId)
        if (layout?.positions?.length) {
          posMap = {}
          for (const p of layout.positions) {
            posMap[p.id] = { x: p.x, y: p.y }
          }
        }
      } catch {
        // No saved layout — will use dagre
      }

      if (cancelled) return

      if (posMap) {
        // Apply saved positions; new nodes not in saved layout get dagre positions
        const { nodes: dagreNodes } = getLayoutedElements(rawNodes, rawEdges, "LR")
        const positioned = rawNodes.map((node) => {
          const saved = posMap![node.id]
          const fallback = dagreNodes.find((n) => n.id === node.id)
          return {
            ...node,
            position: saved ?? fallback?.position ?? { x: 0, y: 0 },
          }
        })
        setNodes(positioned)
      } else {
        const { nodes: layouted } = getLayoutedElements(rawNodes, rawEdges, "LR")
        setNodes(layouted)
      }
      setEdges(rawEdges)
      setLayoutLoaded(true)
    }
    setLayoutLoaded(false)
    loadLayout()
    return () => { cancelled = true }
  }, [studioId, gameId, chainId, rawNodes, rawEdges, setNodes, setEdges])

  // Save layout to API (debounced)
  const persistLayout = useCallback(
    (currentNodes: Node<QuestNodeData>[]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        const positions: ChainLayoutNodePosition[] = currentNodes.map((n) => ({
          id: n.id,
          x: Math.round(n.position.x),
          y: Math.round(n.position.y),
        }))
        try {
          await saveChainLayout(studioId, gameId, chainId, { positions })
        } catch {
          // silent — layout save is non-critical
        }
      }, 500)
    },
    [studioId, gameId, chainId],
  )

  // When a node drag ends, save the layout (use getNodes() to get ALL current nodes)
  const handleNodeDragStop = useCallback(
    () => {
      persistLayout(getNodes() as Node<QuestNodeData>[])
    },
    [persistLayout, getNodes],
  )

  // Handle new connection: user drags from source handle to target handle
  const handleConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target) return

      // Optimistically add edge
      const newEdge: Edge = {
        id: `${connection.source}->${connection.target}`,
        source: connection.source,
        target: connection.target,
        animated: true,
        style: { strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      }
      setEdges((eds) => addEdge(newEdge, eds))

      // Call API
      setConnecting(true)
      try {
        await onConnectQuests(connection.source, connection.target)
      } catch {
        // Revert on failure
        setEdges((eds) => eds.filter((e) => e.id !== newEdge.id))
      } finally {
        setConnecting(false)
      }
    },
    [onConnectQuests, setEdges],
  )

  // Handle edge deletion: user selects edge and presses delete, or uses backspace
  const handleEdgesDelete = useCallback(
    async (deletedEdges: Edge[]) => {
      setConnecting(true)
      try {
        for (const edge of deletedEdges) {
          await onDisconnectQuests(edge.source, edge.target)
        }
      } catch {
        // Revert — re-add deleted edges
        setEdges((eds) => [...eds, ...deletedEdges])
      } finally {
        setConnecting(false)
      }
    },
    [onDisconnectQuests, setEdges],
  )

  // Filter available quests by search
  const filteredAvailable = useMemo(() => {
    if (!sidebarSearch.trim()) return availableQuests
    const q = sidebarSearch.toLowerCase()
    return availableQuests.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        (d.quest_type && d.quest_type.toLowerCase().includes(q)),
    )
  }, [availableQuests, sidebarSearch])

  const handleQuickAdd = useCallback(
    async (questId: string) => {
      setAddingQuestId(questId)
      try {
        await onQuickAdd(questId)
      } finally {
        setAddingQuestId(null)
      }
    },
    [onQuickAdd],
  )

  return (
    <div className="flex gap-0 h-[500px] w-full rounded-md border bg-background/50 overflow-hidden">
      {/* ── Graph area ───────────────────────────────────── */}
      <div className="relative flex-1 min-w-0">
        {connecting && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-md bg-primary/90 text-primary-foreground px-3 py-1 text-xs shadow-lg">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </div>
        )}
        {/* Toggle sidebar button */}
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 z-10 h-7 w-7"
          onClick={() => setSidebarOpen((v) => !v)}
          title={sidebarOpen ? "Hide quest list" : "Show quest list"}
        >
          {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </Button>

        {members.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No quests in this chain yet. Add quests from the panel on the right.
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onEdgesDelete={handleEdgesDelete}
            onNodeDragStop={handleNodeDragStop}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
            minZoom={0.3}
            maxZoom={2}
            deleteKeyCode={["Backspace", "Delete"]}
            defaultEdgeOptions={{
              animated: true,
              style: { strokeWidth: 2 },
            }}
          >
            <Background gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
              className="!bg-background/80"
            />
          </ReactFlow>
        )}
      </div>

      {/* ── Quick-add sidebar ────────────────────────────── */}
      {sidebarOpen && (
        <div className="w-[260px] shrink-0 border-l flex flex-col bg-background">
          <div className="px-3 py-2 border-b space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Available Quests</p>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search quests…"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className="h-7 pl-7 text-xs"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {filteredAvailable.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                {availableQuests.length === 0 ? "All quests are already in this chain" : "No matching quests"}
              </p>
            ) : (
              <div className="p-1.5 space-y-0.5">
                {filteredAvailable.map((quest) => (
                  <button
                    key={quest.id}
                    disabled={addingQuestId !== null}
                    onClick={() => handleQuickAdd(quest.id)}
                    className={cn(
                      "w-full text-left rounded-md px-2.5 py-2 hover:bg-accent/60 transition-colors group",
                      "flex items-start gap-2",
                      addingQuestId === quest.id && "opacity-70 pointer-events-none",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-tight truncate">{quest.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-3.5">{quest.quest_type}</Badge>
                        {quest.is_active ? (
                          <Badge className="text-[10px] px-1 py-0 h-3.5 bg-green-600">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-3.5">Inactive</Badge>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 mt-0.5">
                      {addingQuestId === quest.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
