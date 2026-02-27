"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Search, RefreshCw, Package, Eye, Copy, Check, ExternalLink, Hammer, Trash2, Pencil } from "lucide-react"
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
  listContainerDefinitions,
  createContainerDefinition,
  updateContainerDefinition,
  deleteContainerDefinition,
  type ListItemsParams,
} from "@/lib/inventory-api"
import type {
  ItemDefinition,
  ItemCategory,
  ItemRarity,
  CreateItemRequest,
  ContainerDefinition,
  ContainerType,
  CreateContainerDefinitionRequest,
  UpdateContainerDefinitionRequest,
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

// ─── Container Definition helpers ────────────────────────────────────────────

const CONTAINER_TYPE_META: Record<ContainerType, { label: string; className: string }> = {
  inventory:   { label: 'Inventory',   className: 'bg-gray-500/15 text-gray-400 border-gray-400/40' },
  chest:       { label: 'Chest',       className: 'bg-amber-500/15 text-amber-500 border-amber-500/40' },
  bag:         { label: 'Bag',         className: 'bg-green-500/15 text-green-500 border-green-500/40' },
  vault:       { label: 'Vault',       className: 'bg-purple-500/15 text-purple-500 border-purple-500/40' },
  shulker_box: { label: 'Shulker Box', className: 'bg-pink-500/15 text-pink-500 border-pink-500/40' },
}

function ContainerTypeBadge({ type }: { type: ContainerType }) {
  const m = CONTAINER_TYPE_META[type] ?? { label: type, className: 'bg-muted text-muted-foreground border-border' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${m.className}`}>
      {m.label}
    </span>
  )
}

function CreateContainerDefinitionDialog({
  open,
  gameId,
  onCreated,
  onClose,
}: {
  open: boolean
  gameId: string
  onCreated: () => void
  onClose: () => void
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [containerType, setContainerType] = useState<ContainerType>("chest")
  const [gridCols, setGridCols] = useState("9")
  const [gridRows, setGridRows] = useState("3")
  const [isPortable, setIsPortable] = useState(false)
  const [meta, setMeta] = useState<KVEntry[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  function resetForm() {
    setName("")
    setContainerType("chest")
    setGridCols("9")
    setGridRows("3")
    setIsPortable(false)
    setMeta([])
    setErrors({})
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2) e.name = "Name must be at least 2 characters"
    const cols = Number(gridCols)
    const rows = Number(gridRows)
    if (!cols || cols < 1 || cols > 54) e.gridCols = "Cols must be 1–54"
    if (!rows || rows < 1 || rows > 54) e.gridRows = "Rows must be 1–54"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      const metadata: Record<string, unknown> = {}
      meta.forEach(({ key, value }) => { if (key.trim()) metadata[key.trim()] = value })
      const body: CreateContainerDefinitionRequest = {
        name: name.trim(),
        container_type: containerType,
        grid_cols: Number(gridCols),
        grid_rows: Number(gridRows),
        is_portable: isPortable,
        metadata,
      }
      await createContainerDefinition({ gameId }, body)
      toast({ title: "Container definition created", description: `"${name.trim()}" added.` })
      resetForm()
      onCreated()
      onClose()
    } catch (err: any) {
      if (err?.status === 403) {
        toast({ variant: "destructive", title: "Permission denied", description: "You do not have permission to create container definitions." })
      } else {
        toast({ variant: "destructive", title: "Failed to create", description: err?.message ?? "Unknown error" })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose() } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Container Definition</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="cd-name">Name <span className="text-destructive">*</span></Label>
            <Input id="cd-name" placeholder="e.g. Standard Chest" value={name} onChange={(e) => setName(e.target.value)} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Container Type <span className="text-destructive">*</span></Label>
              <Select value={containerType} onValueChange={(v) => setContainerType(v as ContainerType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CONTAINER_TYPE_META) as ContainerType[]).map((t) => (
                    <SelectItem key={t} value={t}>{CONTAINER_TYPE_META[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch id="cd-portable" checked={isPortable} onCheckedChange={setIsPortable} />
              <Label htmlFor="cd-portable">Portable</Label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cd-cols">Grid Columns <span className="text-destructive">*</span></Label>
              <Input id="cd-cols" type="number" min={1} max={54} value={gridCols} onChange={(e) => setGridCols(e.target.value)} />
              {errors.gridCols && <p className="text-xs text-destructive">{errors.gridCols}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="cd-rows">Grid Rows <span className="text-destructive">*</span></Label>
              <Input id="cd-rows" type="number" min={1} max={54} value={gridRows} onChange={(e) => setGridRows(e.target.value)} />
              {errors.gridRows && <p className="text-xs text-destructive">{errors.gridRows}</p>}
            </div>
          </div>
          <KVEditor entries={meta} onChange={setMeta} label="Metadata (e.g. icon = chest_wood)" />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={loading}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditContainerDefinitionDialog({
  open,
  gameId,
  definition,
  onUpdated,
  onClose,
}: {
  open: boolean
  gameId: string
  definition: ContainerDefinition
  onUpdated: () => void
  onClose: () => void
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(definition.name)
  const [gridCols, setGridCols] = useState(String(definition.grid_cols))
  const [gridRows, setGridRows] = useState(String(definition.grid_rows))
  const [meta, setMeta] = useState<KVEntry[]>(
    Object.entries(definition.metadata ?? {}).map(([key, value]) => ({ key, value: String(value) }))
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setName(definition.name)
    setGridCols(String(definition.grid_cols))
    setGridRows(String(definition.grid_rows))
    setMeta(Object.entries(definition.metadata ?? {}).map(([key, value]) => ({ key, value: String(value) })))
    setErrors({})
  }, [definition])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2) e.name = "Name must be at least 2 characters"
    const cols = Number(gridCols)
    const rows = Number(gridRows)
    if (!cols || cols < 1 || cols > 54) e.gridCols = "Cols must be 1–54"
    if (!rows || rows < 1 || rows > 54) e.gridRows = "Rows must be 1–54"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      const metadata: Record<string, unknown> = {}
      meta.forEach(({ key, value }) => { if (key.trim()) metadata[key.trim()] = value })
      const body: UpdateContainerDefinitionRequest = {
        name: name.trim(),
        grid_cols: Number(gridCols),
        grid_rows: Number(gridRows),
        metadata,
      }
      await updateContainerDefinition({ gameId }, definition.id, body)
      toast({ title: "Container definition updated" })
      onUpdated()
      onClose()
    } catch (err: any) {
      if (err?.status === 409) {
        toast({ variant: "destructive", title: "Cannot shrink grid", description: "Items would go out of bounds. Remove items first." })
      } else {
        toast({ variant: "destructive", title: "Failed to update", description: err?.message ?? "Unknown error" })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Container Definition</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
            <ContainerTypeBadge type={definition.container_type} />
            <span>{definition.is_portable ? 'Portable' : 'Fixed'}</span>
            <span className="text-xs">(immutable)</span>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ed-name">Name <span className="text-destructive">*</span></Label>
            <Input id="ed-name" value={name} onChange={(e) => setName(e.target.value)} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ed-cols">Grid Columns</Label>
              <Input id="ed-cols" type="number" min={1} max={54} value={gridCols} onChange={(e) => setGridCols(e.target.value)} />
              {errors.gridCols && <p className="text-xs text-destructive">{errors.gridCols}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="ed-rows">Grid Rows</Label>
              <Input id="ed-rows" type="number" min={1} max={54} value={gridRows} onChange={(e) => setGridRows(e.target.value)} />
              {errors.gridRows && <p className="text-xs text-destructive">{errors.gridRows}</p>}
            </div>
          </div>
          <KVEditor entries={meta} onChange={setMeta} label="Metadata" />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={loading}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

  // containers tab state
  const CONTAINER_LIMIT = 50
  const [containerDefs, setContainerDefs] = useState<ContainerDefinition[]>([])
  const [containerTotal, setContainerTotal] = useState(0)
  const [containerLoading, setContainerLoading] = useState(false)
  const [containerError, setContainerError] = useState<string | null>(null)
  const [containerOffset, setContainerOffset] = useState(0)
  const [showCreateContainer, setShowCreateContainer] = useState(false)
  const [editingContainer, setEditingContainer] = useState<ContainerDefinition | null>(null)
  const [deletingContainer, setDeletingContainer] = useState<ContainerDefinition | null>(null)
  const [deleteContainerLoading, setDeleteContainerLoading] = useState(false)

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

  // ─── Containers ──────────────────────────────────────────────────────────────
  const fetchContainerDefs = useCallback(async () => {
    if (!studioId) return
    setContainerLoading(true)
    setContainerError(null)
    try {
      const result = await listContainerDefinitions(
        { gameId },
        { limit: CONTAINER_LIMIT, offset: containerOffset },
      )
      setContainerDefs(result.container_definitions ?? [])
      setContainerTotal(result.total)
    } catch (err: any) {
      setContainerError(err?.message ?? 'Failed to load container definitions')
    } finally {
      setContainerLoading(false)
    }
  }, [studioId, gameId, containerOffset])

  useEffect(() => {
    if (activeTab === 'containers') {
      fetchContainerDefs()
    }
  }, [activeTab, fetchContainerDefs])

  async function handleDeleteContainer() {
    if (!deletingContainer) return
    setDeleteContainerLoading(true)
    try {
      await deleteContainerDefinition({ gameId }, deletingContainer.id)
      toast({ title: "Container definition deleted" })
      setDeletingContainer(null)
      fetchContainerDefs()
    } catch (err: any) {
      if (err?.status === 403) {
        toast({ variant: "destructive", title: "Cannot delete", description: "System inventory containers cannot be deleted." })
      } else if (err?.status === 409) {
        toast({ variant: "destructive", title: "Cannot delete", description: "Active containers still reference this definition." })
      } else {
        toast({ variant: "destructive", title: "Failed to delete", description: err?.message ?? "Unknown error" })
      }
    } finally {
      setDeleteContainerLoading(false)
    }
  }

  const containerTotalPages = Math.ceil(containerTotal / CONTAINER_LIMIT)
  const containerCurrentPage = Math.floor(containerOffset / CONTAINER_LIMIT) + 1

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
                <div className="ml-auto flex gap-2 items-center">
                  <div className="w-px h-6 bg-border" />
                  <Button variant="outline" size="icon" onClick={fetchItems} title="Refresh">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => setShowCreate(true)} disabled={!studioId}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Item
                  </Button>
                </div>
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
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Container Definitions</h2>
              <p className="text-sm text-muted-foreground">
                {containerTotal > 0
                  ? `${containerTotal} definition${containerTotal !== 1 ? "s" : ""}`
                  : "No container definitions yet"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={fetchContainerDefs} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={() => setShowCreateContainer(true)} disabled={!studioId}>
                <Plus className="h-4 w-4 mr-2" />
                New Container
              </Button>
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {containerLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : containerError ? (
                <div className="p-6 text-center text-destructive">{containerError}</div>
              ) : containerDefs.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No container definitions</p>
                  <p className="text-sm mt-1">Click "New Container" to create the first container definition.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Grid</TableHead>
                      <TableHead>Portable</TableHead>
                      <TableHead>Metadata</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {containerDefs.map((def) => (
                      <TableRow key={def.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium">
                          {def.name}
                          <div
                            className="text-xs font-mono text-muted-foreground mt-0.5 max-w-[160px] truncate"
                            title={def.id}
                          >
                            {def.id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ContainerTypeBadge type={def.container_type} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {def.grid_cols} × {def.grid_rows}
                          <span className="text-xs ml-1">({def.grid_cols * def.grid_rows} slots)</span>
                        </TableCell>
                        <TableCell>
                          {def.is_portable ? (
                            <span className="text-green-500 text-sm font-medium">✓ Portable</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">✗ Fixed</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                          {Object.keys(def.metadata ?? {}).length > 0
                            ? Object.entries(def.metadata).map(([k, v]) => `${k}: ${v}`).join(", ")
                            : <span className="italic">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit"
                              onClick={() => setEditingContainer(def)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingContainer(def)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {containerTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>
                Page {containerCurrentPage} of {containerTotalPages} — {containerTotal} definitions
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={containerOffset === 0}
                  onClick={() => setContainerOffset(Math.max(0, containerOffset - CONTAINER_LIMIT))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={containerOffset + CONTAINER_LIMIT >= containerTotal}
                  onClick={() => setContainerOffset(containerOffset + CONTAINER_LIMIT)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
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

      {/* Create Container Definition Modal */}
      <CreateContainerDefinitionDialog
        open={showCreateContainer}
        gameId={gameId}
        onCreated={fetchContainerDefs}
        onClose={() => setShowCreateContainer(false)}
      />

      {/* Edit Container Definition Modal */}
      {editingContainer && (
        <EditContainerDefinitionDialog
          open={!!editingContainer}
          gameId={gameId}
          definition={editingContainer}
          onUpdated={fetchContainerDefs}
          onClose={() => setEditingContainer(null)}
        />
      )}

      {/* Delete Container Definition Confirmation */}
      {deletingContainer && (
        <Dialog open={!!deletingContainer} onOpenChange={(v) => { if (!v) setDeletingContainer(null) }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Container Definition</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">"{deletingContainer.name}"</span>?
              This action cannot be undone.
            </p>
            {deletingContainer.container_type === 'inventory' && (
              <p className="text-xs text-destructive mt-1">System inventory types cannot be deleted.</p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={deleteContainerLoading}>Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleDeleteContainer}
                disabled={deleteContainerLoading || deletingContainer.container_type === 'inventory'}
              >
                {deleteContainerLoading ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
