"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Box, ExternalLink, Grid2x2, List, Package, RefreshCw, Search, X } from "lucide-react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatISODate } from "@/lib/utils/date-utils"
import { getGame } from "@/lib/game-api"
import {
  getContainerItems,
  getGameProgressDetail,
  PlayerContainer,
  PlayerItem,
} from "@/lib/game-user-api"
import { CopyButton } from "@/components/CopyButton"
import { GameNavButtons } from "@/components/GameNavButtons"

// ─── Constants ────────────────────────────────────────────────────────────────

const LIMIT = 200 // load all for grid view

const RARITY_STYLE: Record<string, { cell: string; badge: string }> = {
  common:    { cell: "bg-gray-600/20 border-gray-500/40",     badge: "bg-gray-500/15 text-gray-400 border-gray-400/40" },
  uncommon:  { cell: "bg-green-600/20 border-green-500/40",   badge: "bg-green-500/15 text-green-500 border-green-500/40" },
  rare:      { cell: "bg-blue-600/20 border-blue-500/40",     badge: "bg-blue-500/15 text-blue-400 border-blue-400/40" },
  epic:      { cell: "bg-purple-600/20 border-purple-500/40", badge: "bg-purple-500/15 text-purple-400 border-purple-400/40" },
  legendary: { cell: "bg-yellow-600/20 border-yellow-500/40", badge: "bg-yellow-500/15 text-yellow-500 border-yellow-400/40" },
}
const CELL_PX = 64

// ─── Grid View ────────────────────────────────────────────────────────────────

function GridView({ container, items }: { container: PlayerContainer; items: PlayerItem[] }) {
  const cols = container.definition?.grid_cols ?? 1
  const rows = container.definition?.grid_rows ?? 1
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)

  const totalUsed = items.reduce((acc, i) => acc + (i.definition?.grid_width ?? 1) * (i.definition?.grid_height ?? 1), 0)

  return (
    <div className="space-y-4">
      {/* Info bar */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{container.definition?.name || "Container"}</span>
        <span>{cols} × {rows} grid</span>
        <span>{items.length} item{items.length !== 1 ? "s" : ""} placed</span>
        <span>{cols * rows - totalUsed} cells free</span>
        {container.definition?.is_portable && <Badge variant="outline" className="text-xs h-5">Portable</Badge>}
      </div>

      {/* Grid */}
      <div className="overflow-auto pb-2 w-[90%] max-h-[50vh]">
        <div
          className="relative border border-border rounded-md bg-muted/10 p-px"
          style={{
            width: `${cols * CELL_PX + (cols - 1)}px`,
            height: `${rows * CELL_PX + (rows - 1)}px`,
          }}
        >
          {/* Empty cell grid — single CSS background instead of N×M DOM nodes */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: [
                `linear-gradient(hsl(var(--border) / 0.4) 1px, transparent 1px)`,
                `linear-gradient(to right, hsl(var(--border) / 0.4) 1px, hsl(var(--muted) / 0.2) 1px)`,
              ].join(", "),
              backgroundSize: `${CELL_PX + 1}px ${CELL_PX + 1}px`,
            }}
          />

          {/* Items */}
          {items.map((item) => {
            const w = item.definition?.grid_width ?? 1
            const h = item.definition?.grid_height ?? 1
            const rarity = item.definition?.rarity ?? "common"
            const s = RARITY_STYLE[rarity] ?? RARITY_STYLE.common
            const isHov = hovered === item.id
            const isPinned = pinned === item.id
            return (
              <div
                key={item.id}
                className={`absolute rounded border-2 flex flex-col items-center justify-center p-1 cursor-pointer transition-shadow select-none ${s.cell} ${isPinned ? "ring-2 ring-amber-400 ring-offset-background ring-offset-1 z-30 shadow-xl" : isHov ? "ring-2 ring-primary ring-offset-background ring-offset-1 z-20 shadow-lg" : "z-10"}`}
                style={{
                  left: item.grid_x * (CELL_PX + 1),
                  top: item.grid_y * (CELL_PX + 1),
                  width: w * CELL_PX + (w - 1),
                  height: h * CELL_PX + (h - 1),
                }}
                onMouseEnter={() => setHovered(item.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setPinned(prev => prev === item.id ? null : item.id)}
              >
                <span className="text-[10px] font-semibold text-center leading-tight line-clamp-3 break-words w-full text-center px-0.5">
                  {item.definition?.name ?? item.item_definition_id.slice(0, 8)}
                </span>
                {item.quantity > 1 && (
                  <span className="text-[9px] text-muted-foreground font-mono mt-0.5">×{item.quantity}</span>
                )}
                {item.level > 1 && (
                  <span className="text-[9px] text-amber-400 font-mono">Lv{item.level}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Rarity legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(RARITY_STYLE).map(([rarity, s]) => (
          <span key={rarity} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border capitalize ${s.badge}`}>
            {rarity}
          </span>
        ))}
      </div>

      {/* Hover / Pinned detail card */}
      {(pinned ?? hovered) && (() => {
        const activeId = pinned ?? hovered
        const item = items.find(i => i.id === activeId)
        if (!item) return null
        const rarity = item.definition?.rarity
        return (
          <Card className={pinned ? "border-amber-400/50" : ""}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {item.definition?.name ?? "Item"}
                {rarity && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border capitalize ${(RARITY_STYLE[rarity] ?? RARITY_STYLE.common).badge}`}>
                    {rarity}
                  </span>
                )}
                {pinned === item.id && (
                  <span className="ml-auto text-xs text-amber-400 font-normal">&#x1F4CC; Pinned — click item to unpin</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><p className="text-muted-foreground text-xs">Code</p><p className="font-mono text-xs">{item.definition?.item_code ?? "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Category</p><p className="capitalize">{item.definition?.category ?? "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Qty</p><p className="font-mono">{item.quantity}</p></div>
              <div><p className="text-muted-foreground text-xs">Level</p><p>{item.level}</p></div>
              <div><p className="text-muted-foreground text-xs">Position</p><p className="font-mono">({item.grid_x}, {item.grid_y})</p></div>
              <div><p className="text-muted-foreground text-xs">Size</p><p className="font-mono">{item.definition?.grid_width ?? 1}×{item.definition?.grid_height ?? 1}</p></div>
              <div><p className="text-muted-foreground text-xs">Stackable</p><p>{item.definition?.is_stackable ? `Yes${item.definition.max_stack_size != null ? ` / ${item.definition.max_stack_size}` : ""}` : "No"}</p></div>
              {item.definition?.base_stats && Object.keys(item.definition.base_stats).length > 0 && (
                <div className="col-span-2 md:col-span-4">
                  <p className="text-muted-foreground text-xs mb-1">Base stats</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(item.definition.base_stats).map(([k, v]) => (
                      <span key={k} className="text-xs bg-muted rounded px-2 py-0.5 font-mono">{k}: {v}</span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContainerItemsPage({
  params,
}: {
  params: { id: string; progressId: string; containerId: string }
}) {
  const { id: gameId, progressId, containerId } = params
  const router = useRouter()
  const searchParams = useSearchParams()

  // tab state — initialize from URL then sync via useEffect (same pattern as items page)
  const [activeTab, setActiveTab] = useState<string>("list")

  useEffect(() => {
    const view = searchParams.get("view")
    if (view === "grid" || view === "list") setActiveTab(view)
  }, [searchParams])

  const [game, setGame] = useState<any>(null)
  const [playerName, setPlayerName] = useState<string>("")
  const [container, setContainer] = useState<PlayerContainer | null>(null)
  const [items, setItems] = useState<PlayerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterText, setFilterText] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [filterRarity, setFilterRarity] = useState("")

  const itemCategories = useMemo(() => {
    const s = new Set<string>()
    items.forEach((i) => { if (i.definition?.category) s.add(i.definition.category) })
    return Array.from(s).sort()
  }, [items])

  const itemRarities = useMemo(() => {
    const s = new Set<string>()
    items.forEach((i) => { if (i.definition?.rarity) s.add(i.definition.rarity) })
    return Array.from(s).sort()
  }, [items])

  const filteredItems = useMemo(() => {
    let result = items
    const q = filterText.trim().toLowerCase()
    if (q) result = result.filter((item) =>
      (item.definition?.name ?? "").toLowerCase().includes(q) ||
      (item.definition?.item_code ?? "").toLowerCase().includes(q) ||
      item.item_definition_id.toLowerCase().includes(q)
    )
    if (filterCategory) result = result.filter((item) => item.definition?.category === filterCategory)
    if (filterRarity) result = result.filter((item) => item.definition?.rarity === filterRarity)
    return result
  }, [items, filterText, filterCategory, filterRarity])

  // Build container from URL params passed by the containers list page.
  // useEffect so it runs client-side only after hydration (same as items page tab sync).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const cols = Number(p.get("def_cols")) || 0
    const rows = Number(p.get("def_rows")) || 0
    if (!cols || !rows) return
    setContainer({
      id: containerId,
      container_type: p.get("ctype") ?? "",
      created_at: "",
      updated_at: "",
      definition: {
        name: p.get("def_name") ?? "",
        grid_cols: cols,
        grid_rows: rows,
        is_portable: p.get("def_portable") === "1",
      } as any,
    })
  }, [containerId])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [gameRes, detailRes, itemsRes] = await Promise.all([
        game ? Promise.resolve(game) : getGame(gameId),
        !playerName ? getGameProgressDetail(progressId) : Promise.resolve(null),
        getContainerItems(progressId, containerId, { limit: LIMIT, offset: 0 }),
      ])
      if (!game) setGame(gameRes)
      if (detailRes) setPlayerName(detailRes.user_display_name ?? "")
      setItems(itemsRes.items ?? [])
    } catch (err: any) {
      setError(err?.message ?? "Failed to load container items")
    } finally {
      setLoading(false)
    }
  }, [gameId, progressId, containerId, game, playerName])

  useEffect(() => { loadData() }, [loadData])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const newParams = new URLSearchParams(searchParams.toString())
    if (value === "list") newParams.delete("view")
    else newParams.set("view", value)
    router.push(`${window.location.pathname}${newParams.toString() ? `?${newParams.toString()}` : ""}`)
  }

  const gridCols = container?.definition?.grid_cols
  const gridRows = container?.definition?.grid_rows

  return (
    <div className="container mx-auto py-6">
      {/* Breadcrumb */}
      <div className="mb-2">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            {game ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/studios">{game.studio?.name || "Studios"}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/games/${gameId}`}>{game.name}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/games/${gameId}/players`}>Players</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/games/${gameId}/players/${progressId}?tab=containers`}>
                    {playerName || progressId.slice(0, 8)}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                <BreadcrumbItem>
                  <span>{container?.definition?.name || <span className="font-mono text-xs">{containerId.slice(0, 8)}…</span>}</span>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem><span>Loading…</span></BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-start gap-3">
          <Button
            variant="outline" size="icon" className="mt-1 shrink-0"
            onClick={() => router.push(`/games/${gameId}/players/${progressId}?tab=containers`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">
              {container?.definition?.name || "Container Items"}
            </h1>
            <p className="text-sm text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
              {containerId}
              <CopyButton text={containerId} />
            </p>
            {container?.definition && (
              <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                <span className="capitalize">{container.container_type}</span>
                {gridCols && gridRows && <span>{gridCols} × {gridRows} grid</span>}
                {container.definition.is_portable && <Badge variant="outline" className="text-xs h-4">Portable</Badge>}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-4 md:mt-0 items-end">
          <GameNavButtons gameId={gameId} active="players" />
          <Button variant="outline" size="icon" onClick={loadData} disabled={loading} title="Refresh" className="shrink-0">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <p className="text-destructive text-sm mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={loadData}>Try Again</Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="h-3.5 w-3.5" />
              List
              {items.length > 0 && (
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">{items.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="grid" className="gap-1.5" disabled={!gridCols || !gridRows}>
              <Grid2x2 className="h-3.5 w-3.5" />
              Grid
              {gridCols && gridRows && (
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">{gridCols}×{gridRows}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── List Tab ── */}
          <TabsContent value="list" className="mt-0">
            {items.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No items</p>
                <p className="text-sm mt-1">This container has no items.</p>
              </div>
            ) : (
              <>
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                  <div>
                    <h2 className="text-lg font-semibold">Container Items</h2>
                    <p className="text-sm text-muted-foreground">
                      {filteredItems.length !== items.length
                        ? `${filteredItems.length} of ${items.length} items`
                        : `${items.length} item${items.length !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search by name…"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="h-8 w-44 rounded-md border border-input bg-background pl-8 pr-7 text-sm outline-none focus:ring-1 focus:ring-ring"
                      />
                      {filterText && (
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setFilterText("")}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {itemCategories.length > 0 && (
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm capitalize"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                      >
                        <option value="">All Categories</option>
                        {itemCategories.map((c) => (
                          <option key={c} value={c} className="capitalize">{c}</option>
                        ))}
                      </select>
                    )}
                    {itemRarities.length > 0 && (
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm capitalize"
                        value={filterRarity}
                        onChange={(e) => setFilterRarity(e.target.value)}
                      >
                        <option value="">All Rarities</option>
                        {itemRarities.map((r) => (
                          <option key={r} value={r} className="capitalize">{r}</option>
                        ))}
                      </select>
                    )}
                    {(filterText || filterCategory || filterRarity) && (
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                        onClick={() => { setFilterText(""); setFilterCategory(""); setFilterRarity("") }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Rarity</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Lv</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Stackable</TableHead>
                        <TableHead>Base Stats</TableHead>
                        <TableHead>Acquired</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-10 text-muted-foreground text-sm">
                            No items match the current filters
                          </TableCell>
                        </TableRow>
                      ) : filteredItems.map((item) => {
                        const rarity = item.definition?.rarity
                        const badgeStyle = rarity ? (RARITY_STYLE[rarity]?.badge ?? "") : ""
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium whitespace-nowrap flex items-center gap-1">
                                {item.definition?.name ?? item.item_definition_id.slice(0, 8)}
                                <a
                                  href={`/games/${gameId}/items/${item.item_definition_id}`}
                                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                  title="Open item definition"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </div>
                              {item.definition?.item_code && (
                                <div className="text-xs text-muted-foreground font-mono">{item.definition.item_code}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              {rarity ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border capitalize ${badgeStyle}`}>
                                  {rarity}
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="capitalize text-sm">{item.definition?.category ?? "—"}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-right text-sm">{item.level}</TableCell>
                            <TableCell className="text-sm font-mono text-muted-foreground">
                              {item.definition ? `${item.definition.grid_width}×${item.definition.grid_height}` : "—"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Box className="h-3.5 w-3.5 shrink-0" />
                                ({item.grid_x}, {item.grid_y})
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {item.definition == null ? "—" : item.definition.is_stackable
                                ? <span className="text-green-500">Yes{item.definition.max_stack_size != null ? ` / ${item.definition.max_stack_size}` : ""}</span>
                                : <span className="text-muted-foreground">No</span>}
                            </TableCell>
                            <TableCell className="text-xs">
                              {item.definition?.base_stats && Object.keys(item.definition.base_stats).length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(item.definition.base_stats).map(([k, v]) => (
                                    <span key={k} className="bg-muted rounded px-1.5 py-0.5 font-mono whitespace-nowrap">{k}: {v}</span>
                                  ))}
                                </div>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {item.acquired_at ? formatISODate(item.acquired_at) : "—"}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              </>
            )}
          </TabsContent>

          {/* ── Grid Tab ── */}
          <TabsContent value="grid" className="mt-0">
            {container && gridCols && gridRows ? (
              items.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Empty container</p>
                  <p className="text-sm mt-1">No items placed in this container.</p>
                </div>
              ) : (
                <GridView container={container} items={items} />
              )
            ) : (
              <div className="p-12 text-center text-muted-foreground text-sm">
                Container definition not available — cannot render grid.
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
