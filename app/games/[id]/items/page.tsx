"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Search, RefreshCw, Package, Eye, Copy, Check, ExternalLink, Hammer, Trash2, Pencil, Dices, Save, X, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
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
  listGachaPacks,
  createGachaPack,
  updateGachaPack,
  deleteGachaPack,
  setGachaPackEnabled,
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
  GachaPack,
  GachaPoolEntry,
  KeyRequirement,
} from "@/types/inventory"
import { RARITY_COLORS } from "@/types/inventory"
import type { GameLimits } from "@/types/game"
import { GameNavButtons } from "@/components/GameNavButtons"
import { CopyButton } from "@/components/CopyButton"

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

// ─── Gacha helpers ────────────────────────────────────────────────────────────

function formatPct(pct: number): string {
  if (pct === 0) return "0%"
  if (pct >= 1) return pct.toFixed(2) + "%"
  if (pct >= 0.01) return pct.toFixed(4) + "%"
  if (pct >= 0.0001) return pct.toFixed(6) + "%"
  return pct.toExponential(2) + "%"
}

function DropBar({ weight, total }: { weight: number; total: number }) {
  const pct = total > 0 ? Math.min((weight / total) * 100, 100) : 0
  return (
    <div className="flex items-center gap-1.5 min-w-[110px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">
        {formatPct(pct)}
      </span>
    </div>
  )
}

interface PoolRow {
  item_definition_id: string
  weight: string
  quantity_min: string
  quantity_max: string
}

const EMPTY_ROW = (): PoolRow => ({
  item_definition_id: "",
  weight: "700000",
  quantity_min: "1",
  quantity_max: "1",
})

interface KeyReqRow {
  item_definition_id: string
  quantity: string
}

const EMPTY_KEY_ROW = (): KeyReqRow => ({
  item_definition_id: "",
  quantity: "1",
})

function emptyGachaForm() {
  return {
    name: "",
    is_enabled: true,
    pool: [EMPTY_ROW()],
    keyReqs: [EMPTY_KEY_ROW()],
  }
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
    <Sheet open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose() } }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader>
          <SheetTitle>New Container Definition</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
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
        <SheetFooter className="pt-4">
          <Button variant="outline" disabled={loading} onClick={() => { resetForm(); onClose() }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating…" : "Create"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
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
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader>
          <SheetTitle>Edit Container Definition</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
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
        <SheetFooter className="pt-4">
          <Button variant="outline" disabled={loading} onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving…" : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
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
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) { resetForm(); onClose() }
      }}
    >
      <SheetContent side="right" className="sm:max-w-[520px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>New Item Definition</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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

        <div className="shrink-0 border-t px-6 py-4 flex justify-end gap-2">
          <Button variant="outline" disabled={loading} onClick={() => { resetForm(); onClose() }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating…" : "Create Item"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
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
  const [itemUsage, setItemUsage] = useState<number | null>(null)
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
  const [containerSearch, setContainerSearch] = useState("")
  const [containerSearchDebounced, setContainerSearchDebounced] = useState("")

  // gacha tab state
  const [gachaPacks, setGachaPacks] = useState<GachaPack[]>([])
  const [gachaAllItems, setGachaAllItems] = useState<ItemDefinition[]>([])
  const [gachaLoading, setGachaLoading] = useState(false)
  const [gachaError, setGachaError] = useState<string | null>(null)
  const [gameLimits, setGameLimits] = useState<GameLimits | null>(null)
  const [expandedPack, setExpandedPack] = useState<string | null>(null)
  const [gachaSheetOpen, setGachaSheetOpen] = useState(false)
  const [editingPack, setEditingPack] = useState<GachaPack | null>(null)
  const [formSaving, setFormSaving] = useState(false)
  const [gachaForm, setGachaForm] = useState(emptyGachaForm())
  const [deletingPack, setDeletingPack] = useState<GachaPack | null>(null)
  const [deletePackLoading, setDeletePackLoading] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // initialize tab from URL params
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "containers" || tab === "catalogue" || tab === "gacha") {
      setActiveTab(tab)
    }
    // initialize container search from URL `q` param
    const q = searchParams.get("q")
    if (q) setContainerSearch(q)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // debounce container search
  useEffect(() => {
    const t = setTimeout(() => setContainerSearchDebounced(containerSearch), 250)
    return () => clearTimeout(t)
  }, [containerSearch])

  // sync container search to URL
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams.toString())
    if (containerSearchDebounced) {
      newParams.set("q", containerSearchDebounced)
    } else {
      newParams.delete("q")
    }
    router.replace(`${window.location.pathname}?${newParams.toString()}`, { scroll: false })
  }, [containerSearchDebounced]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // load game info — also used to refresh usage after mutations
  const loadGameInfo = useCallback(async () => {
    try {
      const g = await getGame(gameId)
      setGameName(g.name)
      setStudioId(g.studio_id ?? "")
      setMaxItems(g.limits?.max_items ?? null)
      setItemUsage(g.usage?.items ?? null)
      setGameLimits(g.limits ?? null)
    } catch {
      // game failed to load — stop the skeleton
      setLoading(false)
    }
  }, [gameId])

  useEffect(() => {
    loadGameInfo()
  }, [loadGameInfo])

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
      loadGameInfo()
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

  // client-side filter by name or id
  const filteredContainerDefs = containerSearchDebounced
    ? containerDefs.filter(
        (d) =>
          d.name.toLowerCase().includes(containerSearchDebounced.toLowerCase()) ||
          d.id.toLowerCase().includes(containerSearchDebounced.toLowerCase()),
      )
    : containerDefs

  // ─── Gacha ───────────────────────────────────────────────────────────────────
  const fetchGachaData = useCallback(async () => {
    setGachaLoading(true)
    setGachaError(null)
    try {
      const ctx = { gameId }
      const [packsRes, itemsRes] = await Promise.all([
        listGachaPacks(ctx),
        listItemDefinitions(ctx, { limit: 200 }),
      ])
      setGachaPacks(packsRes.packs ?? [])
      setGachaAllItems(itemsRes.items ?? [])
    } catch (err: any) {
      setGachaError(err?.message ?? "Failed to load gacha data")
    } finally {
      setGachaLoading(false)
    }
  }, [gameId])

  useEffect(() => {
    if (activeTab === 'gacha') {
      fetchGachaData()
    }
  }, [activeTab, fetchGachaData])

  // auto-open edit sheet when ?editPack=<id> is in the URL (keep param so F5 re-opens)
  useEffect(() => {
    const packId = searchParams.get("editPack")
    if (!packId || gachaLoading || gachaPacks.length === 0) return
    const pack = gachaPacks.find((p) => p.id === packId)
    if (pack) {
      gachaOpenEdit(pack)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gachaPacks, gachaLoading])

  function gachaCloseSheet() {
    setGachaSheetOpen(false)
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.delete("editPack")
    router.replace(`${window.location.pathname}?${newParams.toString()}`)
  }

  function gachaOpenCreate() {
    setEditingPack(null)
    setGachaForm(emptyGachaForm())
    setGachaSheetOpen(true)
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.delete("editPack")
    router.replace(`${window.location.pathname}?${newParams.toString()}`)
  }

  function gachaOpenEdit(pack: GachaPack) {
    setEditingPack(pack)
    setGachaForm({
      name: pack.name,
      is_enabled: pack.is_enabled,
      pool: pack.item_pool.length > 0
        ? pack.item_pool.map((e) => ({
            item_definition_id: e.item_definition_id,
            weight: String(e.weight),
            quantity_min: String(e.quantity_min),
            quantity_max: String(e.quantity_max),
          }))
        : [EMPTY_ROW()],
      keyReqs: (pack.key_requirements ?? []).length > 0
        ? pack.key_requirements.map((r) => ({
            item_definition_id: r.item_definition_id,
            quantity: String(r.quantity),
          }))
        : [EMPTY_KEY_ROW()],
    })
    setGachaSheetOpen(true)
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set("editPack", pack.id)
    router.replace(`${window.location.pathname}?${newParams.toString()}`)
  }

  function updateKeyReqRow(index: number, patch: Partial<KeyReqRow>) {
    setGachaForm((f) => ({ ...f, keyReqs: f.keyReqs.map((r, i) => i === index ? { ...r, ...patch } : r) }))
  }
  function addKeyReqRow() {
    setGachaForm((f) => ({ ...f, keyReqs: [...f.keyReqs, EMPTY_KEY_ROW()] }))
  }
  function removeKeyReqRow(index: number) {
    setGachaForm((f) => ({ ...f, keyReqs: f.keyReqs.filter((_, i) => i !== index) }))
  }
  function updatePoolRow(index: number, patch: Partial<PoolRow>) {
    setGachaForm((f) => ({ ...f, pool: f.pool.map((r, i) => i === index ? { ...r, ...patch } : r) }))
  }
  function addPoolRow() {
    setGachaForm((f) => ({ ...f, pool: [...f.pool, EMPTY_ROW()] }))
  }
  function removePoolRow(index: number) {
    setGachaForm((f) => ({ ...f, pool: f.pool.filter((_, i) => i !== index) }))
  }

  async function handleGachaSave() {
    if (!gachaForm.name.trim()) { toast({ variant: "destructive", title: "Name is required" }); return }
    const item_pool: GachaPoolEntry[] = gachaForm.pool
      .filter((r) => r.item_definition_id.trim())
      .map((r) => ({
        item_definition_id: r.item_definition_id.trim(),
        weight: Math.max(1, Number(r.weight) || 1),
        quantity_min: Math.max(1, Number(r.quantity_min) || 1),
        quantity_max: Math.max(Number(r.quantity_min) || 1, Number(r.quantity_max) || 1),
      }))
    const key_requirements: KeyRequirement[] = gachaForm.keyReqs
      .filter((r) => r.item_definition_id.trim())
      .map((r) => ({
        item_definition_id: r.item_definition_id.trim(),
        quantity: Math.max(1, Number(r.quantity) || 1),
      }))
    setFormSaving(true)
    try {
      const ctx = { gameId }
      if (editingPack) {
        const res = await updateGachaPack(ctx, editingPack.id, {
          name: gachaForm.name.trim(),
          is_enabled: gachaForm.is_enabled,
          item_pool,
          key_requirements,
        })
        setGachaPacks((prev) => prev.map((p) => p.id === editingPack.id ? res.pack : p))
        toast({ title: "Pack updated" })
      } else {
        const res = await createGachaPack(ctx, {
          name: gachaForm.name.trim(),
          is_enabled: gachaForm.is_enabled,
          item_pool,
          key_requirements,
        })
        setGachaPacks((prev) => [res.pack, ...prev])
        toast({ title: "Pack created" })
        loadGameInfo()
      }
      gachaCloseSheet()
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save failed", description: err?.message ?? "Unknown error" })
    } finally {
      setFormSaving(false)
    }
  }

  async function handleGachaToggle(pack: GachaPack) {
    setTogglingId(pack.id)
    try {
      const res = await setGachaPackEnabled({ gameId }, pack.id, !pack.is_enabled)
      setGachaPacks((prev) => prev.map((p) => p.id === pack.id ? { ...p, is_enabled: res.is_enabled } : p))
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to toggle pack", description: err?.message })
    } finally {
      setTogglingId(null)
    }
  }

  async function handleGachaDelete() {
    if (!deletingPack) return
    setDeletePackLoading(true)
    try {
      await deleteGachaPack({ gameId }, deletingPack.id)
      setGachaPacks((prev) => prev.filter((p) => p.id !== deletingPack.id))
      toast({ title: "Pack deleted" })
      setDeletingPack(null)
      loadGameInfo()
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete failed", description: err?.message })
    } finally {
      setDeletePackLoading(false)
    }
  }

  const formTotalWeight = gachaForm.pool.reduce((s, r) => s + (Number(r.weight) || 0), 0)

  function gachaItemName(id: string) {
    const it = gachaAllItems.find((i) => i.id === id)
    if (!it) return <code className="text-xs">{id.slice(0, 8)}…</code>
    return <span>{it.name} <span className="text-muted-foreground text-xs">({it.item_code || it.id.slice(0, 6)})</span></span>
  }

  function gachaItemShortName(id: string) {
    const it = gachaAllItems.find((i) => i.id === id)
    return it ? (it.name + (it.item_code ? ` (${it.item_code})` : "")) : id.slice(0, 8) + "…"
  }

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
              <span>Items - Containers</span>
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
                ? (() => {
                    const used = itemUsage ?? total
                    return <>
                    <span className={used >= maxItems ? "text-destructive font-medium" : ""}>
                      {used.toLocaleString()} / {maxItems.toLocaleString()} items
                    </span>
                    <span className="inline-block h-1.5 w-24 rounded-full bg-muted overflow-hidden align-middle">
                      <span
                        className={`block h-full rounded-full transition-all ${
                          used >= maxItems ? "bg-destructive" : used / maxItems >= 0.8 ? "bg-amber-500" : "bg-primary"
                        }`}
                        style={{ width: `${Math.min((used / maxItems) * 100, 100)}%` }}
                      />
                    </span>
                    <Link
                      href={`/games/${gameId}/plugins`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      title="Manage plugins / raise limits"
                    >
                      <Hammer className="h-3.5 w-3.5" />
                    </Link>
                  </>
                  })()
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
            <TabsTrigger value="catalogue">Items</TabsTrigger>
            <TabsTrigger value="containers">Containers</TabsTrigger>
            <TabsTrigger value="gacha">Gacha</TabsTrigger>
          </TabsList>

        <TabsContent value="catalogue" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Item Definitions</h2>
              <p className="text-sm text-muted-foreground">
                {total > 0 ? `${total.toLocaleString()} item${total !== 1 ? "s" : ""} defined` : "No items yet"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={fetchItems} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={() => setShowCreate(true)} disabled={!studioId}>
                <Plus className="h-4 w-4 mr-2" />
                New Item
              </Button>
            </div>
          </div>

          {/* Filter bar */}
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8 border-none"
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
                              <Pencil className="h-4 w-4" />
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
                  ? `${containerSearchDebounced ? `${filteredContainerDefs.length} of ` : ""}${containerTotal} definition${containerTotal !== 1 ? "s" : ""}`
                  : "No container definitions yet"}
              </p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by name or ID…"
                  value={containerSearch}
                  onChange={(e) => setContainerSearch(e.target.value)}
                  className="pl-8 h-8 w-56 text-sm"
                />
                {containerSearch && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setContainerSearch("")}
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
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
              ) : filteredContainerDefs.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">
                    {containerSearchDebounced ? "No matching containers" : "No container definitions"}
                  </p>
                  <p className="text-sm mt-1">
                    {containerSearchDebounced
                      ? `No containers match "${containerSearchDebounced}". Try a different keyword.`
                      : `Click "New Container" to create the first container definition.`}
                  </p>
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
                    {filteredContainerDefs.map((def) => (
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
                            {def.container_type !== 'inventory' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Delete"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeletingContainer(def)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
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

        <TabsContent value="gacha" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Gacha Packs</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {gameLimits?.max_gacha_packs != null
                  ? <>
                      <span className={gachaPacks.length >= gameLimits.max_gacha_packs ? "text-destructive font-medium" : ""}>
                        {gachaPacks.length} / {gameLimits.max_gacha_packs} packs
                      </span>
                      <span className="inline-block h-1.5 w-24 rounded-full bg-muted overflow-hidden align-middle">
                        <span
                          className={`block h-full rounded-full transition-all ${
                            gachaPacks.length >= gameLimits.max_gacha_packs ? "bg-destructive" : gachaPacks.length / gameLimits.max_gacha_packs >= 0.8 ? "bg-amber-500" : "bg-primary"
                          }`}
                          style={{ width: `${Math.min((gachaPacks.length / (gameLimits.max_gacha_packs || 1)) * 100, 100)}%` }}
                        />
                      </span>
                      <Link
                        href={`/games/${gameId}/plugins`}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                        title="Manage plugins / raise limits"
                      >
                        <Hammer className="h-3.5 w-3.5" />
                      </Link>
                    </>
                  : `${gachaPacks.length} pack${gachaPacks.length !== 1 ? "s" : ""} configured`
                }
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={fetchGachaData} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={gachaOpenCreate}
                disabled={!!(gameLimits?.max_gacha_packs != null && gachaPacks.length >= gameLimits.max_gacha_packs)}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                New Pack
              </Button>
            </div>
          </div>

          {/* Loading / Error */}
          {gachaLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : gachaError ? (
            <Card className="border-destructive">
              <CardContent className="pt-6 text-destructive text-sm">{gachaError}</CardContent>
            </Card>
          ) : gachaPacks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
                <Dices className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-muted-foreground">No gacha packs yet</p>
                <Button onClick={gachaOpenCreate}><Plus className="h-4 w-4 mr-2" />Create first pack</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {gachaPacks.map((pack) => {
                const totalWeight = pack.item_pool.reduce((s, e) => s + e.weight, 0)
                const isExpanded = expandedPack === pack.id
                return (
                  <Card key={pack.id} className={`transition-all ${!pack.is_enabled ? "opacity-60" : ""}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base truncate">{pack.name}</CardTitle>
                            <Badge
                              variant={pack.is_enabled ? "default" : "secondary"}
                              className="text-xs shrink-0"
                            >
                              {pack.is_enabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                            <span>ID: {pack.id}</span>
                            <CopyButton text={pack.id} size="h-3 w-3" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Switch
                            checked={pack.is_enabled}
                            onCheckedChange={() => handleGachaToggle(pack)}
                            disabled={togglingId === pack.id}
                            title={pack.is_enabled ? "Disable pack" : "Enable pack"}
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => gachaOpenEdit(pack)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeletingPack(pack)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {(pack.key_requirements ?? []).length > 0 ? (
                          <span>🔑 Keys: {pack.key_requirements.map((kr, i) => (
                            <span key={i}>
                              {i > 0 && <span className="mx-1">+</span>}
                              <strong className="text-foreground">{kr.quantity}×</strong> {gachaItemShortName(kr.item_definition_id)}
                            </span>
                          ))}</span>
                        ) : (
                          <span className="italic text-xs">No key required</span>
                        )}
                        <span>🎲 {pack.item_pool.length} item{pack.item_pool.length !== 1 ? "s" : ""} in pool</span>
                        {totalWeight > 0 && (
                          <span className="text-xs">total weight {totalWeight.toLocaleString()}</span>
                        )}
                      </div>
                    </CardHeader>
                    {pack.item_pool.length > 0 && (
                      <>
                        <Separator />
                        <CardContent className="pt-3 pb-2">
                          <button
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
                            onClick={() => setExpandedPack(isExpanded ? null : pack.id)}
                          >
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            Drop table
                          </button>
                          {isExpanded && (
                            <div className="space-y-1.5">
                              <div className="grid grid-cols-[1fr_1fr_auto] gap-x-3 text-xs text-muted-foreground font-medium pb-1 border-b">
                                <span>Item</span>
                                <span>Drop rate</span>
                                <span className="text-right">Qty</span>
                              </div>
                              {[...pack.item_pool]
                                .sort((a, b) => b.weight - a.weight)
                                .map((entry, i) => (
                                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-x-3 items-center text-sm">
                                    <span className="truncate text-xs">{gachaItemName(entry.item_definition_id)}</span>
                                    <DropBar weight={entry.weight} total={totalWeight} />
                                    <span className="text-xs text-muted-foreground text-right tabular-nums">
                                      {entry.quantity_min === entry.quantity_max
                                        ? entry.quantity_min
                                        : `${entry.quantity_min}–${entry.quantity_max}`}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </CardContent>
                      </>
                    )}
                  </Card>
                )
              })}
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
          onCreated={() => { fetchItems(); loadGameInfo() }}
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
        onCreated={() => { fetchContainerDefs(); loadGameInfo() }}
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

      {/* ── Gacha Create / Edit Sheet ───────────────────────────────────────── */}
      <Sheet open={gachaSheetOpen} onOpenChange={(open) => { if (!open) gachaCloseSheet() }}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{editingPack ? `Edit: ${editingPack.name}` : "New Gacha Pack"}</SheetTitle>
            <SheetDescription className="text-xs">
              Configure pack name, key requirements (items consumed on open), and item drop pool weights.
            </SheetDescription>
            {editingPack && (
              <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground pt-1">
                <span>ID: {editingPack.id}</span>
                <CopyButton text={editingPack.id} size="h-3 w-3" />
              </div>
            )}
          </SheetHeader>

          <div className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Standard Pack"
                value={gachaForm.name}
                onChange={(e) => setGachaForm((f) => ({ ...f, name: e.target.value }))}
                disabled={formSaving}
              />
            </div>

            {/* Key Requirements */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Key Requirements</Label>
                  <p className="text-xs text-muted-foreground">Items consumed when opening this pack. Leave empty for a free pack.</p>
                </div>
                <Button size="sm" variant="outline" type="button" onClick={addKeyReqRow} disabled={formSaving}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add key
                </Button>
              </div>
              {gachaForm.keyReqs.length > 0 && (
                <div className="text-xs text-muted-foreground grid grid-cols-[24px_1fr_80px_32px] gap-1.5 px-1 font-medium">
                  <span />
                  <span>Item</span>
                  <span>Quantity</span>
                  <span />
                </div>
              )}
              <div className="space-y-2">
                {gachaForm.keyReqs.map((row, i) => (
                  <div key={i} className="grid grid-cols-[24px_1fr_80px_32px] gap-1.5 items-center">
                    {row.item_definition_id ? (
                      <Link href={`/games/${params.id}/items/${row.item_definition_id}`} title="View item">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                      </Link>
                    ) : (
                      <span />
                    )}
                    <Select
                      value={row.item_definition_id}
                      onValueChange={(v) => updateKeyReqRow(i, { item_definition_id: v })}
                      disabled={formSaving}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select item…" />
                      </SelectTrigger>
                      <SelectContent>
                        {gachaAllItems.map((it) => (
                          <SelectItem key={it.id} value={it.id} className="text-xs">
                            {it.name}{it.item_code && <span className="text-muted-foreground"> ({it.item_code})</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      className="h-8 text-xs text-center font-mono"
                      value={row.quantity}
                      onChange={(e) => updateKeyReqRow(i, { quantity: e.target.value })}
                      disabled={formSaving}
                    />
                    <Button
                      size="icon" variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeKeyReqRow(i)}
                      disabled={formSaving}
                      type="button"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              {gachaForm.keyReqs.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No key items — pack is free to open.</p>
              )}
            </div>

            {/* Enabled */}
            <div className="flex items-center gap-3">
              <Switch
                id="gacha-enabled"
                checked={gachaForm.is_enabled}
                onCheckedChange={(v) => setGachaForm((f) => ({ ...f, is_enabled: v }))}
                disabled={formSaving}
              />
              <Label htmlFor="gacha-enabled" className="cursor-pointer">Enabled</Label>
              <span className="text-xs text-muted-foreground">Players can open this pack when enabled.</span>
            </div>

            <Separator />

            {/* Item Pool */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Item Pool</Label>
                  {formTotalWeight > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Total weight: {formTotalWeight.toLocaleString()}
                      {formTotalWeight === 1_000_000 && " ✓ (1M = % notation)"}
                    </p>
                  )}
                </div>
                <Button size="sm" variant="outline" type="button" onClick={addPoolRow} disabled={formSaving}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add item
                </Button>
              </div>
              {gachaForm.pool.length > 0 && (
                <div className="text-xs text-muted-foreground grid grid-cols-[1fr_110px_60px_60px_32px] gap-1.5 px-1 font-medium">
                  <span>Item</span>
                  <span>Weight</span>
                  <span>Min</span>
                  <span>Max</span>
                  <span />
                </div>
              )}
              <div className="space-y-2">
                {gachaForm.pool.map((row, i) => {
                  const pct = formTotalWeight > 0 ? ((Number(row.weight) || 0) / formTotalWeight * 100) : 0
                  return (
                    <div key={i} className="grid grid-cols-[1fr_110px_60px_60px_32px] gap-1.5 items-center">
                      <Select
                        value={row.item_definition_id}
                        onValueChange={(v) => updatePoolRow(i, { item_definition_id: v })}
                        disabled={formSaving}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select item…" />
                        </SelectTrigger>
                        <SelectContent>
                          {gachaAllItems.map((it) => (
                            <SelectItem key={it.id} value={it.id} className="text-xs">
                              {it.name} {it.item_code && <span className="text-muted-foreground">({it.item_code})</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative">
                        <Input
                          type="text"
                          inputMode="numeric"
                          className="h-8 text-xs pr-1 font-mono"
                          value={row.weight ? Number(row.weight).toLocaleString() : ""}
                          onChange={(e) => updatePoolRow(i, { weight: e.target.value.replace(/[^0-9]/g, "") })}
                          disabled={formSaving}
                          title={pct > 0 ? `≈ ${formatPct(pct)}` : ""}
                        />
                      </div>
                      <Input
                        type="number"
                        min={1}
                        className="h-8 text-xs text-center"
                        value={row.quantity_min}
                        onChange={(e) => updatePoolRow(i, { quantity_min: e.target.value })}
                        disabled={formSaving}
                      />
                      <Input
                        type="number"
                        min={1}
                        className="h-8 text-xs text-center"
                        value={row.quantity_max}
                        onChange={(e) => updatePoolRow(i, { quantity_max: e.target.value })}
                        disabled={formSaving}
                      />
                      <Button
                        size="icon" variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removePoolRow(i)}
                        disabled={formSaving}
                        type="button"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
              {gachaForm.pool.some((r) => r.item_definition_id && Number(r.weight) > 0) && (
                <div className="mt-3 rounded border bg-muted/40 p-3 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Drop rate preview</p>
                  {[...gachaForm.pool]
                    .filter((r) => r.item_definition_id)
                    .sort((a, b) => (Number(b.weight) || 0) - (Number(a.weight) || 0))
                    .map((row, i) => {
                      const item = gachaAllItems.find((it) => it.id === row.item_definition_id)
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="flex-1 truncate">{item?.name ?? row.item_definition_id.slice(0, 8)}</span>
                          <DropBar weight={Number(row.weight) || 0} total={formTotalWeight} />
                        </div>
                      )
                    })}
                </div>
              )}
              {gachaForm.pool.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  No items added. The pack can be saved with an empty pool.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-6 mt-4 border-t">
            <Button variant="outline" onClick={() => gachaCloseSheet()} disabled={formSaving}>
              Cancel
            </Button>
            <Button onClick={handleGachaSave} disabled={formSaving}>
              {formSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editingPack ? "Save changes" : "Create pack"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Gacha Delete Confirmation ────────────────────────────────────────── */}
      <AlertDialog open={!!deletingPack} onOpenChange={(o) => { if (!o) setDeletingPack(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete pack "{deletingPack?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the gacha pack configuration. Historical transaction records
              are not affected. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePackLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleGachaDelete}
              disabled={deletePackLoading}
            >
              {deletePackLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
