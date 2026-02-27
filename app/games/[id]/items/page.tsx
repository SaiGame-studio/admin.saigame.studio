"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Search, RefreshCw, Package, Eye, Copy, Check, ExternalLink, Hammer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { getGame } from "@/lib/game-api"
import { ApiError } from "@/lib/api-client"
import {
  listItemDefinitions,
  createItemDefinition,
  fetchItemCategories,
  fetchItemRarities,
  type ListItemsParams,
} from "@/lib/inventory-api"
import type {
  ItemDefinition,
  ItemCategory,
  ItemRarity,
  CreateItemRequest,
} from "@/types/inventory"
import { RARITY_COLORS } from "@/types/inventory"
import { GameNavButtons } from "@/components/GameNavButtons"

function RarityBadge({ rarity }: { rarity: ItemRarity }) {
  const c = RARITY_COLORS[rarity]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${c.text} ${c.border} ${c.bg} capitalize`}>
      {rarity}
    </span>
  )
}

type KVEntry = { key: string; value: string }

function KVEditor({
  entries,
  onChange,
  label,
}: {
  entries: KVEntry[]
  onChange: (v: KVEntry[]) => void
  label: string
}) {
  const addRow = () => onChange([...entries, { key: "", value: "" }])
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i))
  const update = (i: number, field: "key" | "value", val: string) => {
    const next = entries.map((e, idx) =>
      idx === i ? { ...e, [field]: val } : e,
    )
    onChange(next)
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {entries.map((e, i) => (
        <div key={i} className="flex gap-1 items-center">
          <Input
            className="h-7 text-xs"
            placeholder="key"
            value={e.key}
            onChange={(ev) => update(i, "key", ev.target.value)}
          />
          <span className="text-muted-foreground">=</span>
          <Input
            className="h-7 text-xs"
            placeholder="value"
            value={e.value}
            onChange={(ev) => update(i, "value", ev.target.value)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-destructive"
            type="button"
            onClick={() => remove(i)}
          >
            ✕
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        type="button"
        className="h-7 text-xs mt-1"
        onClick={addRow}
      >
        <Plus className="h-3 w-3 mr-1" /> Add
      </Button>
    </div>
  )
}

function CreateItemDialog({
  open,
  studioId,
  gameId,
  onCreated,
  onClose,
  categories,
  rarities,
  initialCategory,
}: {
  open: boolean
  studioId: string
  gameId: string
  onCreated: () => void
  onClose: () => void
  categories: ItemCategory[]
  rarities: ItemRarity[]
  initialCategory?: ItemCategory
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState("")
  const [itemCode, setItemCode] = useState("")
  const [category, setCategory] = useState<ItemCategory>(initialCategory ?? "weapon")
  const [rarity, setRarity] = useState<ItemRarity>("common")
  const [isStackable, setIsStackable] = useState(false)
  const [maxStack, setMaxStack] = useState<string>("")
  const [gridW, setGridW] = useState("1")
  const [gridH, setGridH] = useState("1")
  const [stats, setStats] = useState<KVEntry[]>([])
  const [meta, setMeta] = useState<KVEntry[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  function resetForm() {
    setName("")
    setItemCode("")
    setCategory(initialCategory ?? "weapon")
    setRarity("common")
    setIsStackable(false)
    setMaxStack("")
    setGridW("1")
    setGridH("1")
    setStats([])
    setMeta([])
    setErrors({})
  }

  // reset category when dialog opens with a fresh initialCategory
  useEffect(() => {
    if (open && initialCategory) setCategory(initialCategory)
  }, [open, initialCategory])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 3) {
      e.name = "Name must be at least 3 characters"
    }
    if (isStackable && maxStack !== "" && Number(maxStack) < 1) {
      e.maxStack = "Enter a valid max stack (≥ 1)"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      const base_stats: Record<string, number> = {}
      stats.forEach(({ key, value }) => {
        if (key.trim()) base_stats[key.trim()] = Number(value) || 0
      })
      const metadata: Record<string, unknown> = {}
      meta.forEach(({ key, value }) => {
        if (key.trim()) metadata[key.trim()] = value
      })

      const body: CreateItemRequest = {
        ...(itemCode.trim() && { item_code: itemCode.trim() }),
        name: name.trim(),
        category,
        rarity,
        is_stackable: isStackable,
        grid_width: Number(gridW) || 1,
        grid_height: Number(gridH) || 1,
        base_stats,
        metadata,
      }
      if (isStackable) {
        body.max_stack_size = maxStack === "" ? null : Number(maxStack)
      }

      await createItemDefinition({ studioId, gameId }, body)
      toast({ title: "Item created", description: `"${name}" added to catalogue.` })
      resetForm()
      onCreated()
      onClose()
    } catch (err: any) {
      if (err?.status === 403) {
        toast({
          variant: "destructive",
          title: "Permission denied",
          description: "You do not have permission to create items for this game.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Failed to create item",
          description: err?.message ?? "Unknown error",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) { resetForm(); onClose() }
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Item Definition</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="item-name">Name <span className="text-destructive">*</span></Label>
            <Input
              id="item-name"
              placeholder="e.g. Iron Sword"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Item Code */}
          <div className="space-y-1">
            <Label htmlFor="item-code">Item Code <span className="text-muted-foreground text-xs">(optional, e.g. iron_sword)</span></Label>
            <Input
              id="item-code"
              placeholder="e.g. iron_sword"
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              className="font-mono"
            />
          </div>

          {/* Category + Rarity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Category <span className="text-destructive">*</span></Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ItemCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Rarity <span className="text-destructive">*</span></Label>
              <Select value={rarity} onValueChange={(v) => setRarity(v as ItemRarity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rarities.map((r) => (
                    <SelectItem key={r} value={r}><RarityBadge rarity={r} /></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stackable */}
          <div className="flex items-center gap-3">
            <Switch
              id="stackable"
              checked={isStackable}
              onCheckedChange={setIsStackable}
            />
            <Label htmlFor="stackable">Stackable</Label>
          </div>

          {isStackable && (
            <div className="space-y-1">
              <Label htmlFor="max-stack">Max Stack Size (leave blank = unlimited)</Label>
              <Input
                id="max-stack"
                type="number"
                min={1}
                placeholder="999"
                value={maxStack}
                onChange={(e) => setMaxStack(e.target.value)}
              />
              {errors.maxStack && (
                <p className="text-xs text-destructive">{errors.maxStack}</p>
              )}
            </div>
          )}

          {/* Grid size */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="grid-w">Grid Width</Label>
              <Input
                id="grid-w"
                type="number"
                min={1}
                value={gridW}
                onChange={(e) => setGridW(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="grid-h">Grid Height</Label>
              <Input
                id="grid-h"
                type="number"
                min={1}
                value={gridH}
                onChange={(e) => setGridH(e.target.value)}
              />
            </div>
          </div>

          {/* Base stats */}
          <KVEditor
            entries={stats}
            onChange={setStats}
            label="Base Stats (e.g. attack = 10)"
          />

          {/* Metadata */}
          <KVEditor
            entries={meta}
            onChange={setMeta}
            label="Metadata (e.g. icon = sword_iron)"
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={loading}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating…" : "Create Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function GameItemsPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const gameId = params.id

  const [gameName, setGameName] = useState("")
  const [studioId, setStudioId] = useState("")
  const [maxItems, setMaxItems] = useState<number | null>(null)
  const [items, setItems] = useState<ItemDefinition[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // filters
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterRarity, setFilterRarity] = useState<string>("all")
  const [searchName, setSearchName] = useState("")
  const [debouncedName, setDebouncedName] = useState("")

  // pagination
  const LIMIT = 50
  const [offset, setOffset] = useState(0)

  // modal
  const [showCreate, setShowCreate] = useState(false)
  const [createInitCategory, setCreateInitCategory] = useState<ItemCategory | undefined>(undefined)
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [rarities, setRarities] = useState<ItemRarity[]>([])

  // tab state management
  const [activeTab, setActiveTab] = useState<string>("catalogue")

  // initialize tab from URL params
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "containers" || tab === "catalogue") {
      setActiveTab(tab)
    }
  }, [searchParams])

  // update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set("tab", value)
    router.push(`${window.location.pathname}?${newParams.toString()}`)
  }

  // debounce name filter
  useEffect(() => {
    const t = setTimeout(() => setDebouncedName(searchName), 300)
    return () => clearTimeout(t)
  }, [searchName])

  // auto-open create dialog from query params e.g. ?create=1&category=currency
  useEffect(() => {
    if (searchParams.get("create") === "1") {
      const cat = searchParams.get("category") as ItemCategory | null
      setCreateInitCategory(cat ?? undefined)
      setShowCreate(true)
    }
  }, [searchParams])

  // fetch categories & rarities from API
  useEffect(() => {
    Promise.all([fetchItemCategories(), fetchItemRarities()])
      .then(([cats, rars]) => { setCategories(cats); setRarities(rars) })
      .catch(() => {})
  }, [])

  // load game info once
  useEffect(() => {
    getGame(gameId)
      .then((g) => {
        setGameName(g.name)
        setStudioId(g.studio_id ?? "")
        setMaxItems(g.limits?.max_items ?? null)
      })
      .catch(() => {
        // game failed to load — stop the skeleton
        setLoading(false)
      })
  }, [gameId])

  const fetchItems = useCallback(async () => {
    if (!studioId) return
    setLoading(true)
    setError(null)
    try {
      const params: ListItemsParams = { limit: LIMIT, offset }
      if (filterCategory !== "all") params.category = filterCategory as ItemCategory
      if (filterRarity !== "all") params.rarity = filterRarity as ItemRarity
      if (debouncedName) params.name = debouncedName

      const result = await listItemDefinitions({ studioId, gameId }, params)
      setItems(result.items ?? [])
      setTotal(result.total)
    } catch (err: any) {
      // 404 = catalogue exists but is empty — treat as empty list, not an error
      if (err instanceof ApiError && err.status === 404) {
        setItems([])
        setTotal(0)
      } else {
        setError(err?.message ?? "Failed to load items")
      }
    } finally {
      setLoading(false)
    }
  }, [studioId, gameId, filterCategory, filterRarity, debouncedName, offset])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // reset offset when filters change
  useEffect(() => {
    setOffset(0)
  }, [filterCategory, filterRarity, debouncedName])

  const totalPages = Math.ceil(total / LIMIT)
  const currentPage = Math.floor(offset / LIMIT) + 1

  return (
    <div className="container mx-auto py-6">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href="/games">Games</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}`}>{gameName || gameId}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span>Item Catalogue</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push(`/games/${gameId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Item Catalogue
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              {maxItems != null
                ? <>
                    <span className={total >= maxItems ? "text-destructive font-medium" : ""}>
                      {total.toLocaleString()} / {maxItems.toLocaleString()} items
                    </span>
                    <span className="inline-block h-1.5 w-24 rounded-full bg-muted overflow-hidden align-middle">
                      <span
                        className={`block h-full rounded-full transition-all ${
                          total >= maxItems ? "bg-destructive" : total / maxItems >= 0.8 ? "bg-amber-500" : "bg-primary"
                        }`}
                        style={{ width: `${Math.min((total / maxItems) * 100, 100)}%` }}
                      />
                    </span>
                    <Link
                      href={`/games/${gameId}/plugins`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      title="Manage plugins / raise limits"
                    >
                      <Hammer className="h-3.5 w-3.5" />
                    </Link>
                  </>
                : total > 0 ? `${total} item${total !== 1 ? "s" : ""} defined` : "No items yet"
              }
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Button variant="outline" size="icon" onClick={fetchItems} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowCreate(true)} disabled={!studioId}>
            <Plus className="h-4 w-4 mr-2" />
            New Item
          </Button>
          <div className="w-px h-6 bg-border self-center" />
          <GameNavButtons gameId={gameId} active="items" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="catalogue">Item Catalogue</TabsTrigger>
          <TabsTrigger value="containers">Containers</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogue" className="space-y-4">
          {/* Filter bar */}
          <Card className="mb-4">
            <CardContent className="pt-4 pb-3">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Search name…"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                  />
                </div>
                <Select
                  value={filterCategory}
                  onValueChange={(v) => setFilterCategory(v)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filterRarity}
                  onValueChange={(v) => setFilterRarity(v)}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Rarity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All rarities</SelectItem>
                    {rarities.map((r) => (
                      <SelectItem key={r} value={r}><RarityBadge rarity={r} /></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : error ? (
                <div className="p-6 text-center text-destructive">{error}</div>
              ) : items.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No items found</p>
                  <p className="text-sm mt-1">
                    {(filterCategory !== "all" || filterRarity !== "all" || debouncedName)
                      ? "Try clearing your filters."
                      : "Click \"New Item\" to add the first item definition."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Rarity</TableHead>
                      <TableHead>Stackable</TableHead>
                      <TableHead>Grid</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium">
                          <Link
                            href={`/games/${gameId}/items/${item.id}`}
                            className="hover:text-primary hover:underline"
                          >
                            {item.name}
                          </Link>
                          {item.item_code && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-xs font-mono text-muted-foreground">{item.item_code}</span>
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title="Copy item code"
                                onClick={() => {
                                  navigator.clipboard.writeText(item.item_code!)
                                  setCopiedId(item.id)
                                  setTimeout(() => setCopiedId(null), 1500)
                                }}
                              >
                                {copiedId === item.id
                                  ? <Check className="h-3 w-3 text-green-500" />
                                  : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <RarityBadge rarity={item.rarity} />
                        </TableCell>
                        <TableCell>
                          {item.is_stackable ? (
                            <span className="text-green-500 text-sm font-medium">
                              ✓ {item.max_stack_size != null ? item.max_stack_size.toLocaleString() : "∞"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">✗</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.grid_width}×{item.grid_height}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/games/${gameId}/items/${item.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>
                Page {currentPage} of {totalPages} — {total} items
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + LIMIT >= total}
                  onClick={() => setOffset(offset + LIMIT)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="containers" className="space-y-4">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mx-auto">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-semibold">Containers</h3>
                <p className="text-lg text-muted-foreground max-w-md mx-auto">
                  Container management functionality is coming soon. This feature will allow you to create and manage 
                  loot boxes, crates, and other container types for your game.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" disabled>
                    Coming Soon
                  </Button>
                  <Button variant="outline" disabled>
                    Feature Preview
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Item Modal */}
      {studioId && (
        <CreateItemDialog
          open={showCreate}
          studioId={studioId}
          gameId={gameId}
          onCreated={fetchItems}
          onClose={() => setShowCreate(false)}
          categories={categories}
          rarities={rarities}
          initialCategory={createInitCategory}
        />
      )}
    </div>
  )
}
