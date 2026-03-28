"use client"

import { Fragment, useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Search, RefreshCw, Package, Eye, Copy, Check, ExternalLink, Hammer, Trash2, Pencil, Dices, Save, X, ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown, Loader2, Wand2, ZoomIn, ZoomOut, Tag, Lock } from "lucide-react"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/use-translation"
import { getGame } from "@/lib/game-api"
import { ApiError } from "@/lib/api-client"
import {
  listItemDefinitions,
  createItemDefinition,
  getItemDefinition,
  updateItemDefinition,
  fetchItemCategories,
  fetchItemRarities,
  listContainerDefinitions,
  createContainerDefinition,
  getContainerDefinition,
  updateContainerDefinition,
  deleteContainerDefinition,
  listGachaPacks,
  createGachaPack,
  updateGachaPack,
  deleteGachaPack,
  setGachaPackEnabled,
  listEquipmentSlots,
  getEquipmentSlot,
  createEquipmentSlot,
  updateEquipmentSlot,
  deleteEquipmentSlot,
  listItemTags,
  getItemTag,
  createItemTag,
  updateItemTag,
  deleteItemTag,
  listPresetDefinitions,
  createPresetDefinition,
  updatePresetDefinition,
  deletePresetDefinition,
  type ListItemsParams,
  type ItemTag,
  type CreateItemTagRequest,
  type UpdateItemTagRequest,
  type PresetDefinition,
  type CreatePresetDefinitionRequest,
  type UpdatePresetDefinitionRequest,
} from "@/lib/inventory-api"
import type {
  ItemDefinition,
  ItemCategory,
  ItemRarity,
  CreateItemRequest,
  UpdateItemRequest,
  ContainerDefinition,
  ContainerType,
  CreateContainerDefinitionRequest,
  UpdateContainerDefinitionRequest,
  GachaPack,
  GachaPoolEntry,
  KeyRequirement,
  EquipmentSlot,
} from "@/types/inventory"
import { RARITY_COLORS } from "@/types/inventory"
import type { GameLimits } from "@/types/game"
import { GameNavButtons } from "@/components/GameNavButtons"
import { CopyButton } from "@/components/CopyButton"
import { CraftingTab } from "@/components/crafting/crafting-tab"

function RarityBadge({ rarity }: { rarity: ItemRarity }) {
  const c = RARITY_COLORS[rarity]
  if (!c) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border text-gray-400 border-gray-400 bg-gray-400/10 capitalize w-fit">
        {rarity}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${c.text} ${c.border} ${c.bg} capitalize w-fit`}>
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
  return pct.toFixed(10).replace(/\.?0+$/, "") + "%"
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
  allItems,
  onCreated,
  onClose,
}: {
  open: boolean
  gameId: string
  allItems: ItemDefinition[]
  onCreated: () => void
  onClose: () => void
}) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [containerType, setContainerType] = useState<ContainerType>("chest")
  const [gridCols, setGridCols] = useState("9")
  const [gridRows, setGridRows] = useState("3")
  const [isPortable, setIsPortable] = useState(false)
  const [linkedItemId, setLinkedItemId] = useState("")
  const [linkedItemOpen, setLinkedItemOpen] = useState(false)
  const [linkedItemSearch, setLinkedItemSearch] = useState("")
  const [meta, setMeta] = useState<KVEntry[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  function resetForm() {
    setName("")
    setContainerType("chest")
    setGridCols("9")
    setGridRows("3")
    setIsPortable(false)
    setLinkedItemId("")
    setMeta([])
    setErrors({})
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2) e.name = t('items.nameMustBe2Chars')
    const cols = Number(gridCols)
    const rows = Number(gridRows)
    if (!cols || cols < 1 || cols > 54) e.gridCols = t('items.colsMustBe')
    if (!rows || rows < 1 || rows > 54) e.gridRows = t('items.rowsMustBe')
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
        ...(linkedItemId ? { linked_item_definition_id: linkedItemId } : {}),
        metadata,
      }
      await createContainerDefinition({ gameId }, body)
      toast({ title: t('items.containerCreated'), description: `"${name.trim()}" added.` })
      resetForm()
      onCreated()
      onClose()
    } catch (err: any) {
      if (err?.status === 403) {
        toast({ variant: "destructive", title: t('items.permissionDenied'), description: t('items.noPermissionCreateContainer') })
      } else {
        toast({ variant: "destructive", title: t('items.failedToCreate'), description: err?.message ?? "Unknown error" })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose() } }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('items.newContainerDefinition')}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
          <div className="space-y-1">
            <Label htmlFor="cd-name">{t('items.name')} <span className="text-destructive">*</span></Label>
            <Input id="cd-name" placeholder="e.g. Standard Chest" value={name} onChange={(e) => setName(e.target.value)} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('items.containerType')} <span className="text-destructive">*</span></Label>
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
              <Label htmlFor="cd-portable">{t('items.portable')}</Label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cd-cols">{t('items.gridColumns')} <span className="text-destructive">*</span></Label>
              <Input id="cd-cols" type="number" min={1} max={54} value={gridCols} onChange={(e) => setGridCols(e.target.value)} />
              {errors.gridCols && <p className="text-xs text-destructive">{errors.gridCols}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="cd-rows">{t('items.gridRows')} <span className="text-destructive">*</span></Label>
              <Input id="cd-rows" type="number" min={1} max={54} value={gridRows} onChange={(e) => setGridRows(e.target.value)} />
              {errors.gridRows && <p className="text-xs text-destructive">{errors.gridRows}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t('items.linkedItemDefinition')}</Label>
            <div className="flex items-center gap-1">
              <Popover open={linkedItemOpen} onOpenChange={setLinkedItemOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={linkedItemOpen}
                    className="w-full justify-between font-normal"
                  >
                    {linkedItemId ? (
                      <span className="truncate">
                        {allItems.find((i) => i.id === linkedItemId)?.name ?? linkedItemId.slice(0, 8) + "…"}
                        {allItems.find((i) => i.id === linkedItemId)?.item_code && (
                          <span className="ml-1 text-xs text-muted-foreground font-mono">
                            ({allItems.find((i) => i.id === linkedItemId)!.item_code})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{t('items.noLinkedItem')}</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t('items.searchByNameOrCode')}
                      value={linkedItemSearch}
                      onValueChange={setLinkedItemSearch}
                    />
                    <CommandList>
                      <CommandEmpty>{t('items.noItemFound')}</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__none__"
                          onSelect={() => {
                            setLinkedItemId("")
                            setLinkedItemOpen(false)
                            setLinkedItemSearch("")
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 shrink-0 ${!linkedItemId ? "opacity-100" : "opacity-0"}`} />
                          <span className="text-muted-foreground">{t('items.noLinkedItemOption')}</span>
                        </CommandItem>
                        {allItems
                          .filter(
                            (d) =>
                              !linkedItemSearch ||
                              d.name.toLowerCase().includes(linkedItemSearch.toLowerCase()) ||
                              (d.item_code ?? "").toLowerCase().includes(linkedItemSearch.toLowerCase()),
                          )
                          .slice(0, 50)
                          .map((d) => (
                            <CommandItem
                              key={d.id}
                              value={d.id}
                              onSelect={() => {
                                setLinkedItemId(d.id)
                                setLinkedItemOpen(false)
                                setLinkedItemSearch("")
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 shrink-0 ${linkedItemId === d.id ? "opacity-100" : "opacity-0"}`}
                              />
                              <span className="flex-1 truncate">{d.name}</span>
                              {d.item_code && (
                                <span className="ml-2 text-xs text-muted-foreground font-mono">{d.item_code}</span>
                              )}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {linkedItemId && (
                <Link href={`/games/${gameId}/items/${linkedItemId}`} target="_blank" title={t('items.goToItemDef')}>
                  <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" type="button">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('items.containerLinkDescPre')}<code className="bg-muted px-1 rounded">ensure-container</code>{t('items.containerLinkDescPost')}
            </p>
          </div>
          <KVEditor entries={meta} onChange={setMeta} label={t('items.metadataWithExample')} />
        </div>
        <SheetFooter className="pt-4">
          <Button variant="outline" disabled={loading} onClick={() => { resetForm(); onClose() }}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t('items.creating') : t('common.save')}
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
  allItems,
  onUpdated,
  onClose,
}: {
  open: boolean
  gameId: string
  definition: ContainerDefinition
  allItems: ItemDefinition[]
  onUpdated: () => void
  onClose: () => void
}) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(definition.name)
  const [gridCols, setGridCols] = useState(String(definition.grid_cols))
  const [gridRows, setGridRows] = useState(String(definition.grid_rows))
  const [linkedItemId, setLinkedItemId] = useState(definition.linked_item_definition_id ?? "")
  const [linkedItemOpen, setLinkedItemOpen] = useState(false)
  const [linkedItemSearch, setLinkedItemSearch] = useState("")
  const [meta, setMeta] = useState<KVEntry[]>(
    Object.entries(definition.metadata ?? {}).map(([key, value]) => ({ key, value: String(value) }))
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setName(definition.name)
    setGridCols(String(definition.grid_cols))
    setGridRows(String(definition.grid_rows))
    setLinkedItemId(definition.linked_item_definition_id ?? "")
    setLinkedItemSearch("")
    setMeta(Object.entries(definition.metadata ?? {}).map(([key, value]) => ({ key, value: String(value) })))
    setErrors({})
  }, [definition])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2) e.name = t('items.nameMustBe2Chars')
    const cols = Number(gridCols)
    const rows = Number(gridRows)
    if (!cols || cols < 1 || cols > 54) e.gridCols = t('items.colsMustBe')
    if (!rows || rows < 1 || rows > 54) e.gridRows = t('items.rowsMustBe')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      const metadata: Record<string, unknown> = {}
      meta.forEach(({ key, value }) => { if (key.trim()) metadata[key.trim()] = value })
      const origLinked = definition.linked_item_definition_id ?? ""
      const body: UpdateContainerDefinitionRequest = {
        name: name.trim(),
        grid_cols: Number(gridCols),
        grid_rows: Number(gridRows),
        metadata,
      }
      // Only send linked_item_definition_id if it changed
      if (linkedItemId !== origLinked) {
        // "" means unlink, UUID means set new link
        body.linked_item_definition_id = linkedItemId
      }
      await updateContainerDefinition({ gameId }, definition.id, body)
      toast({ title: t('items.containerUpdated') })
      onUpdated()
      onClose()
    } catch (err: any) {
      if (err?.status === 409) {
        toast({ variant: "destructive", title: t('items.cannotShrinkGrid'), description: t('items.itemsOutOfBounds') })
      } else {
        toast({ variant: "destructive", title: t('items.failedToUpdate'), description: err?.message ?? "Unknown error" })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('items.editContainerDefinition')}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
            <ContainerTypeBadge type={definition.container_type} />
            <span>{definition.is_portable ? t('items.portable') : t('items.fixed')}</span>
            <span className="text-xs">{t('items.immutable')}</span>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ed-name">{t('items.name')} <span className="text-destructive">*</span></Label>
            <Input id="ed-name" value={name} onChange={(e) => setName(e.target.value)} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ed-cols">{t('items.gridColumns')}</Label>
              <Input id="ed-cols" type="number" min={1} max={54} value={gridCols} onChange={(e) => setGridCols(e.target.value)} />
              {errors.gridCols && <p className="text-xs text-destructive">{errors.gridCols}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="ed-rows">{t('items.gridRows')}</Label>
              <Input id="ed-rows" type="number" min={1} max={54} value={gridRows} onChange={(e) => setGridRows(e.target.value)} />
              {errors.gridRows && <p className="text-xs text-destructive">{errors.gridRows}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t('items.linkedItemDefinition')}</Label>
            <div className="flex items-center gap-1">
              <Popover open={linkedItemOpen} onOpenChange={setLinkedItemOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={linkedItemOpen}
                    className="w-full justify-between font-normal"
                  >
                    {linkedItemId ? (
                      <span className="truncate">
                        {allItems.find((i) => i.id === linkedItemId)?.name ?? linkedItemId.slice(0, 8) + "…"}
                        {allItems.find((i) => i.id === linkedItemId)?.item_code && (
                          <span className="ml-1 text-xs text-muted-foreground font-mono">
                            ({allItems.find((i) => i.id === linkedItemId)!.item_code})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{t('items.noLinkedItem')}</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t('items.searchByNameOrCode')}
                      value={linkedItemSearch}
                      onValueChange={setLinkedItemSearch}
                    />
                    <CommandList>
                      <CommandEmpty>{t('items.noItemFound')}</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__none__"
                          onSelect={() => {
                            setLinkedItemId("")
                            setLinkedItemOpen(false)
                            setLinkedItemSearch("")
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 shrink-0 ${!linkedItemId ? "opacity-100" : "opacity-0"}`} />
                          <span className="text-muted-foreground">{t('items.noLinkedItemOption')}</span>
                        </CommandItem>
                        {allItems
                          .filter(
                            (d) =>
                              !linkedItemSearch ||
                              d.name.toLowerCase().includes(linkedItemSearch.toLowerCase()) ||
                              (d.item_code ?? "").toLowerCase().includes(linkedItemSearch.toLowerCase()),
                          )
                          .slice(0, 50)
                          .map((d) => (
                            <CommandItem
                              key={d.id}
                              value={d.id}
                              onSelect={() => {
                                setLinkedItemId(d.id)
                                setLinkedItemOpen(false)
                                setLinkedItemSearch("")
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 shrink-0 ${linkedItemId === d.id ? "opacity-100" : "opacity-0"}`}
                              />
                              <span className="flex-1 truncate">{d.name}</span>
                              {d.item_code && (
                                <span className="ml-2 text-xs text-muted-foreground font-mono">{d.item_code}</span>
                              )}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {linkedItemId && (
                <Link href={`/games/${gameId}/items/${linkedItemId}`} target="_blank" title={t('items.goToItemDef')}>
                  <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" type="button">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('items.containerLinkDescPre')}<code className="bg-muted px-1 rounded">ensure-container</code>{t('items.containerLinkDescPost')}
            </p>
          </div>
          <KVEditor entries={meta} onChange={setMeta} label={t('items.metadata')} />
        </div>
        <SheetFooter className="pt-4">
          <Button variant="outline" disabled={loading} onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t('items.saving') : t('items.saveChanges')}
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
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState("")
  const [itemCode, setItemCode] = useState("")
  const [autoSlug, setAutoSlug] = useState(true)
  const [category, setCategory] = useState<ItemCategory>(initialCategory ?? "weapon")
  const [rarity, setRarity] = useState<ItemRarity>("common")
  const [isStackable, setIsStackable] = useState(false)
  const [maxStack, setMaxStack] = useState<string>("99")
  const [gridW, setGridW] = useState("1")
  const [gridH, setGridH] = useState("1")
  const [stats, setStats] = useState<KVEntry[]>([])
  const [meta, setMeta] = useState<KVEntry[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [clientWritable, setClientWritable] = useState(false)
  const [allowClientUpdateQty, setAllowClientUpdateQty] = useState(false)

  // Generator config
  interface GenPoolEntry { item_definition_id: string; drop_rate: string; quantity_min: string; quantity_max: string; collect_cap: string; initial_output: string }
  const [genOutputPool, setGenOutputPool] = useState<GenPoolEntry[]>([{ item_definition_id: "", drop_rate: "1", quantity_min: "1", quantity_max: "1", collect_cap: "5", initial_output: "0" }])
  const [genInterval, setGenInterval] = useState("3600")
  const [genTickCapacity, setGenTickCapacity] = useState("24")

  // All items for generator output dropdown
  const [genAllItems, setGenAllItems] = useState<ItemDefinition[]>([])
  const [genItemsLoading, setGenItemsLoading] = useState(false)
  const [genPoolOpen, setGenPoolOpen] = useState<Record<number, boolean>>({})
  const [genPoolSearch, setGenPoolSearch] = useState<Record<number, string>>({})

  // Fetch all items when category switches to generator
  useEffect(() => {
    if (category === "generator" && open && genAllItems.length === 0) {
      setGenItemsLoading(true)
      listItemDefinitions({ studioId, gameId }, { limit: 200 })
        .then((res) => setGenAllItems(res.items ?? []))
        .catch(() => {})
        .finally(() => setGenItemsLoading(false))
    }
  }, [category, open, studioId, gameId])

  function resetForm() {
    setName("")
    setItemCode("")
    setAutoSlug(true)
    setCategory(initialCategory ?? "weapon")
    setRarity("common")
    setIsStackable(false)
    setMaxStack("99")
    setGridW("1")
    setGridH("1")
    setStats([])
    setMeta([])
    setErrors({})
    setClientWritable(false)
    setAllowClientUpdateQty(false)
    setGenOutputPool([{ item_definition_id: "", drop_rate: "1", quantity_min: "1", quantity_max: "1", collect_cap: "5", initial_output: "0" }])
    setGenInterval("3600")
    setGenTickCapacity("24")
    setGenAllItems([])
  }

  // reset category when dialog opens with a fresh initialCategory
  useEffect(() => {
    if (open && initialCategory) setCategory(initialCategory)
  }, [open, initialCategory])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 3) {
      e.name = t('items.nameMustBe3Chars')
    }
    if (isStackable && maxStack !== "" && Number(maxStack) < 1) {
      e.maxStack = t('items.maxStackInvalid')
    }
    if (category === "generator") {
      const validPoolEntries = genOutputPool.filter(p => p.item_definition_id.trim())
      if (validPoolEntries.length === 0) {
        e.genOutputPool = t('items.outputPoolRequired')
      }
      if (!genInterval || Number(genInterval) < 1) {
        e.genInterval = t('items.intervalMustBe')
      }
      if (!genTickCapacity || Number(genTickCapacity) < 1) {
        e.genTickCapacity = t('items.tickCapMustBe')
      }
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

      // Inject generator_config into metadata
      if (category === "generator") {
        metadata.generator_config = {
          production_interval_seconds: Number(genInterval) || 3600,
          tick_capacity: Number(genTickCapacity) || 24,
          output_pool: genOutputPool
            .filter(p => p.item_definition_id.trim())
            .map(p => ({
              item_definition_id: p.item_definition_id.trim(),
              drop_rate: Number(p.drop_rate) || 1,
              quantity_min: Number(p.quantity_min) || 1,
              quantity_max: Number(p.quantity_max) || 1,
              collect_cap: Number(p.collect_cap) || 5,
              initial_output: Number(p.initial_output) || 0,
            })),
        }
      }

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
        client_writable: clientWritable,
        allow_client_update_qty: allowClientUpdateQty,
      }
      if (isStackable) {
        body.max_stack_size = maxStack === "" ? null : Number(maxStack)
      }

      await createItemDefinition({ studioId, gameId }, body)
      toast({ title: t('items.itemCreated'), description: `"${name}" added to catalogue.` })
      resetForm()
      onCreated()
      onClose()
    } catch (err: any) {
      if (err?.status === 403) {
        toast({
          variant: "destructive",
          title: t('items.permissionDenied'),
          description: "You do not have permission to create items for this game.",
        })
      } else {
        toast({
          variant: "destructive",
          title: t('items.failedToCreateItem'),
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
      <SheetContent side="right" className="sm:max-w-[560px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>{t('items.newItemDefinition')}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="item-name">{t('items.name')} <span className="text-destructive">*</span></Label>
            <Input
              id="item-name"
              placeholder="e.g. Iron Sword"
              value={name}
              onChange={(e) => {
                const v = e.target.value
                setName(v)
                if (autoSlug) {
                  setItemCode(
                    v.trim()
                      .toUpperCase()
                      .replace(/[^A-Z0-9]+/g, "_")
                      .replace(/^_|_$/g, "")
                  )
                }
              }}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Item Code */}
          <div className="space-y-1">
            <Label htmlFor="item-code">{t('items.itemCode')} <span className="text-muted-foreground text-xs">({t('items.itemCodeHint')})</span></Label>
            <div className="flex gap-2">
              <Input
                id="item-code"
                placeholder="e.g. IRON_SWORD"
                value={itemCode}
                onChange={(e) => {
                  setAutoSlug(false)
                  setItemCode(e.target.value)
                }}
                className="font-mono"
              />
              <Button
                type="button"
                variant={autoSlug ? "default" : "outline"}
                size="icon"
                className="shrink-0"
                title={autoSlug ? t('items.autoSlugOn') : t('items.autoSlugOff')}
                onClick={() => {
                  setAutoSlug(true)
                  setItemCode(
                    name.trim()
                      .toUpperCase()
                      .replace(/[^A-Z0-9]+/g, "_")
                      .replace(/^_|_$/g, "")
                  )
                }}
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Category + Rarity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('items.category')} <span className="text-destructive">*</span></Label>
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
              <Label>{t('items.rarity')} <span className="text-destructive">*</span></Label>
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

          {/* Grid size */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="grid-w">{t('items.gridWidth')}</Label>
                <Input
                  id="grid-w"
                  type="number"
                  min={0}
                  value={gridW}
                  onChange={(e) => setGridW(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="grid-h">{t('items.gridHeight')}</Label>
                <Input
                  id="grid-h"
                  type="number"
                  min={0}
                  value={gridH}
                  onChange={(e) => setGridH(e.target.value)}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground pl-1">
              {(Number(gridW) || 0) === 0 || (Number(gridH) || 0) === 0
                ? t('items.gridHintVirtual')
                : (Number(gridW) || 1) === 1 && (Number(gridH) || 1) === 1
                  ? t('items.gridHintSingle')
                  : `${Number(gridW) || 1}×${Number(gridH) || 1} — item occupies ${(Number(gridW) || 1) * (Number(gridH) || 1)} cells in the inventory grid.`}
            </p>
          </div>

          {/* Stackable */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <Switch
                id="stackable"
                checked={isStackable}
                onCheckedChange={setIsStackable}
              />
              <Label htmlFor="stackable">{t('items.stackable')}</Label>
              {isStackable && (
                <div className="relative">
                  <Input
                    id="max-stack"
                    type="number"
                    min={1}
                    value={maxStack}
                    onChange={(e) => setMaxStack(e.target.value)}
                    className="h-8 w-36 pr-8"
                  />
                  {maxStack && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setMaxStack("")}
                      title="Clear"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground pl-1">
              {!isStackable
                ? t('items.stackableHintNo')
                : maxStack === "" || maxStack === "0"
                  ? t('items.stackableHintInfinite')
                  : Number(maxStack) === 1
                    ? t('items.stackableHintOne')
                    : `Stackable up to ${Number(maxStack).toLocaleString()} per slot.`}
            </p>
            {errors.maxStack && (
              <p className="text-xs text-destructive pl-1">{errors.maxStack}</p>
            )}
          </div>

          {/* Client Writable */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Switch
                id="client-writable"
                checked={clientWritable}
                onCheckedChange={setClientWritable}
              />
              <Label htmlFor="client-writable">{t('items.allowClientWriteProps')}</Label>
            </div>
            {clientWritable && (
              <p className="text-xs text-muted-foreground pl-1">
                When enabled, the game client can update <code className="font-mono text-[11px] bg-muted px-1 rounded">public_properties</code> on inventory items owned by the player (e.g. skin, nickname). Max 50 properties total including nested keys.
              </p>
            )}
          </div>

          {/* Allow Client Update Qty */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Switch
                id="allow-client-update-qty"
                checked={allowClientUpdateQty}
                onCheckedChange={setAllowClientUpdateQty}
              />
              <Label htmlFor="allow-client-update-qty">{t('items.allowClientUpdateQty')}</Label>
            </div>
            {allowClientUpdateQty && (
              <p className="text-xs text-muted-foreground pl-1">
                When enabled, the game client can update the quantity of this item in the player's inventory.
              </p>
            )}
          </div>

          {/* Generator Config */}
          {category === "generator" && (
            <div className="space-y-4 rounded-lg border p-5">
              <Label className="text-sm font-semibold">{t('items.generatorConfig')}</Label>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="gen-interval">{t('items.intervalLabel')} <span className="text-destructive">*</span></Label>
                  <Input
                    id="gen-interval"
                    type="number"
                    min={1}
                    value={genInterval}
                    onChange={(e) => setGenInterval(e.target.value)}
                  />
                  {errors.genInterval && <p className="text-xs text-destructive">{errors.genInterval}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gen-tick-capacity">{t('items.tickCapacity')} <span className="text-destructive">*</span></Label>
                  <Input
                    id="gen-tick-capacity"
                    type="number"
                    min={1}
                    value={genTickCapacity}
                    onChange={(e) => setGenTickCapacity(e.target.value)}
                  />
                  {errors.genTickCapacity && <p className="text-xs text-destructive">{errors.genTickCapacity}</p>}
                </div>
              </div>

              {/* Offline calculation hint */}
              {(() => {
                const interval = parseInt(genInterval) || 0
                const ticks = parseInt(genTickCapacity) || 0
                const maxSeconds = interval * ticks
                if (interval > 0 && ticks > 0) {
                  const hours = Math.floor(maxSeconds / 3600)
                  const mins = Math.floor((maxSeconds % 3600) / 60)
                  const timeStr = hours > 0
                    ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}`
                    : `${mins}m`
                  return (
                    <div className="rounded-md bg-muted/50 border border-dashed px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                      <p className="font-medium text-foreground/80">⏱ Offline Calculation</p>
                      <p>Max offline duration = <span className="font-mono font-medium text-foreground">{interval}s</span> × <span className="font-mono font-medium text-foreground">{ticks}</span> ticks = <span className="font-semibold text-foreground">{maxSeconds.toLocaleString()}s ({timeStr})</span></p>
                      <p>After being offline for up to <span className="font-medium text-foreground">{timeStr}</span>, the player can collect up to <span className="font-mono font-medium text-foreground">{ticks}</span> ticks worth of output.</p>
                    </div>
                  )
                }
                return null
              })()}

              {/* Output Pool */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('items.outputPool')} <span className="text-destructive">*</span></Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => setGenOutputPool([...genOutputPool, { item_definition_id: "", drop_rate: "1", quantity_min: "1", quantity_max: "1", collect_cap: "5", initial_output: "0" }])}
                  >
                    <Plus className="h-3.5 w-3.5" /> {t('items.addEntry')}
                  </Button>
                </div>

                {genOutputPool.map((entry, idx) => {
                  const selectedItem = genAllItems.find((i) => i.id === entry.item_definition_id)
                  return (
                    <div key={idx} className="rounded-lg border bg-muted/20 p-4 space-y-3 relative">
                      {/* Entry header with delete */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Entry #{idx + 1}</span>
                        {genOutputPool.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setGenOutputPool(genOutputPool.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Item Definition - searchable combobox */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('items.itemDefinition')} <span className="text-destructive">*</span></Label>
                        <Popover
                          open={genPoolOpen[idx] ?? false}
                          onOpenChange={(o) => setGenPoolOpen((prev) => ({ ...prev, [idx]: o }))}
                          modal={true}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={genPoolOpen[idx] ?? false}
                              className="w-full justify-between font-normal h-9"
                            >
                              {entry.item_definition_id ? (
                                <span className="truncate">
                                  {selectedItem?.name ?? entry.item_definition_id.slice(0, 12) + "…"}
                                  {selectedItem?.item_code && (
                                    <span className="ml-1.5 text-xs text-muted-foreground font-mono">({selectedItem.item_code})</span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Select item…</span>
                              )}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput
                                placeholder={t('items.searchByNameOrCode')}
                                value={genPoolSearch[idx] ?? ""}
                                onValueChange={(v) => setGenPoolSearch((prev) => ({ ...prev, [idx]: v }))}
                              />
                              <CommandList>
                                <CommandEmpty>{genItemsLoading ? t('items.loadingDots') : t('items.noItemFound')}</CommandEmpty>
                                <CommandGroup>
                                  {genAllItems
                                    .filter((d) => {
                                      const q = (genPoolSearch[idx] ?? "").toLowerCase()
                                      return !q || d.name.toLowerCase().includes(q) || (d.item_code ?? "").toLowerCase().includes(q)
                                    })
                                    .slice(0, 50)
                                    .map((d) => (
                                      <CommandItem
                                        key={d.id}
                                        value={d.id}
                                        onSelect={() => {
                                          const pool = [...genOutputPool]
                                          pool[idx] = { ...pool[idx], item_definition_id: d.id }
                                          setGenOutputPool(pool)
                                          setGenPoolOpen((prev) => ({ ...prev, [idx]: false }))
                                          setGenPoolSearch((prev) => ({ ...prev, [idx]: "" }))
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 shrink-0 ${entry.item_definition_id === d.id ? "opacity-100" : "opacity-0"}`}
                                        />
                                        <span className="flex-1 truncate">{d.name}</span>
                                        {d.item_code && (
                                          <span className="ml-2 text-xs text-muted-foreground font-mono">{d.item_code}</span>
                                        )}
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Numeric fields in a grid */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{t('items.dropRate')}</Label>
                          <Input
                            className="h-10 text-sm"
                            type="number"
                            step="0.01"
                            min={0}
                            max={1}
                            value={entry.drop_rate}
                            onChange={(e) => {
                              const pool = [...genOutputPool]
                              pool[idx] = { ...pool[idx], drop_rate: e.target.value }
                              setGenOutputPool(pool)
                            }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{t('items.qtyMin')}</Label>
                          <Input
                            className="h-10 text-sm"
                            type="number"
                            min={1}
                            value={entry.quantity_min}
                            onChange={(e) => {
                              const pool = [...genOutputPool]
                              pool[idx] = { ...pool[idx], quantity_min: e.target.value }
                              setGenOutputPool(pool)
                            }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{t('items.qtyMax')}</Label>
                          <Input
                            className="h-10 text-sm"
                            type="number"
                            min={1}
                            value={entry.quantity_max}
                            onChange={(e) => {
                              const pool = [...genOutputPool]
                              pool[idx] = { ...pool[idx], quantity_max: e.target.value }
                              setGenOutputPool(pool)
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{t('items.collectCap')}</Label>
                          <Input
                            className="h-10 text-sm"
                            type="number"
                            min={0}
                            value={entry.collect_cap}
                            onChange={(e) => {
                              const pool = [...genOutputPool]
                              pool[idx] = { ...pool[idx], collect_cap: e.target.value }
                              setGenOutputPool(pool)
                            }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{t('items.initialOutput')}</Label>
                          <Input
                            className="h-10 text-sm"
                            type="number"
                            min={0}
                            value={entry.initial_output}
                            onChange={(e) => {
                              const pool = [...genOutputPool]
                              pool[idx] = { ...pool[idx], initial_output: e.target.value }
                              setGenOutputPool(pool)
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}

                {errors.genOutputPool && <p className="text-xs text-destructive">{errors.genOutputPool}</p>}
              </div>
            </div>
          )}

          {/* Base stats */}
          <KVEditor
            entries={stats}
            onChange={setStats}
            label={t('items.baseStatsLabel')}
          />

          {/* Metadata */}
          <KVEditor
            entries={meta}
            onChange={setMeta}
            label={t('items.metadataLabel')}
          />

        </div>

        <div className="shrink-0 border-t px-6 py-4 flex justify-end gap-2">
          <Button variant="outline" disabled={loading} onClick={() => { resetForm(); onClose() }}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t('items.creating') : t('items.createItem')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Equipment Slot Sheet (Create / Edit) ─────────────────────────────────────
function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function emptySlotForm() {
  return {
    slot_key: "",
    name: "",
    description: "",
    allowed_categories: [] as string[],
    allowed_item_definition_ids: [] as string[],
    is_active: true,
    meta: [] as KVEntry[],
  }
}

function EquipmentSlotSheet({
  open,
  gameId,
  editing,
  onSaved,
  onClose,
}: {
  open: boolean
  gameId: string
  editing: EquipmentSlot | null
  onSaved: (slot: EquipmentSlot) => void
  onClose: () => void
}) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptySlotForm())
  const [autoSlug, setAutoSlug] = useState(true)
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [catOpen, setCatOpen] = useState(false)
  const [catSearch, setCatSearch] = useState("")
  // item def multi-select
  const [itemDefOpen, setItemDefOpen] = useState(false)
  const [itemDefSearch, setItemDefSearch] = useState("")
  const [itemDefResults, setItemDefResults] = useState<ItemDefinition[]>([])
  const [itemDefLoading, setItemDefLoading] = useState(false)
  const [itemDefCache, setItemDefCache] = useState<Record<string, ItemDefinition>>({})
  const itemDefSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    fetchItemCategories().then(setAllCategories).catch(() => {})
    // pre-load first page of items for the picker
    setItemDefLoading(true)
    listItemDefinitions({ gameId }, { limit: 30 })
      .then((res) => {
        const items = res.items ?? []
        setItemDefResults(items)
        setItemDefCache((prev) => { const n = { ...prev }; items.forEach((d) => { n[d.id] = d }); return n })
      })
      .catch(() => {})
      .finally(() => setItemDefLoading(false))
    if (editing) {
      setAutoSlug(false)
      setForm({
        slot_key: editing.slot_key,
        name: editing.name,
        description: editing.description ?? "",
        allowed_categories: editing.allowed_categories ?? [],
        allowed_item_definition_ids: editing.allowed_item_definition_ids ?? [],
        is_active: editing.is_active,
        meta: Object.entries(editing.metadata ?? {}).map(([key, value]) => ({ key, value: String(value) })),
      })
    } else {
      setAutoSlug(true)
      setForm(emptySlotForm())
    }
  }, [open, editing]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleItemDefSearch(q: string) {
    setItemDefSearch(q)
    if (itemDefSearchRef.current) clearTimeout(itemDefSearchRef.current)
    itemDefSearchRef.current = setTimeout(() => {
      setItemDefLoading(true)
      listItemDefinitions({ gameId }, { limit: 30, name: q || undefined })
        .then((res) => {
          const items = res.items ?? []
          setItemDefResults(items)
          setItemDefCache((prev) => { const n = { ...prev }; items.forEach((d) => { n[d.id] = d }); return n })
        })
        .catch(() => {})
        .finally(() => setItemDefLoading(false))
    }, 300)
  }

  function patch<K extends keyof ReturnType<typeof emptySlotForm>>(key: K, value: ReturnType<typeof emptySlotForm>[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleNameChange(value: string) {
    if (autoSlug && !editing) {
      setForm((f) => ({ ...f, name: value, slot_key: slugify(value) }))
    } else {
      patch("name", value)
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { toast({ variant: "destructive", title: t('items.nameRequired') }); return }
    if (!editing && !form.slot_key.trim()) { toast({ variant: "destructive", title: t('items.slotKeyRequired') }); return }
    const metadata: Record<string, unknown> = {}
    form.meta.forEach(({ key, value }) => { if (key.trim()) metadata[key.trim()] = value })
    setSaving(true)
    try {
      let result: EquipmentSlot
      if (editing) {
        result = await updateEquipmentSlot({ gameId }, editing.slot_key, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          allowed_categories: form.allowed_categories,
          allowed_item_definition_ids: form.allowed_item_definition_ids.length > 0 ? form.allowed_item_definition_ids : null,
          is_active: form.is_active,
          metadata,
        })
        toast({ title: t('items.equipmentSlotUpdated') })
      } else {
        result = await createEquipmentSlot({ gameId }, {
          slot_key: form.slot_key.trim(),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          allowed_categories: form.allowed_categories,
          allowed_item_definition_ids: form.allowed_item_definition_ids.length > 0 ? form.allowed_item_definition_ids : undefined,
          metadata,
        })
        toast({ title: t('items.equipmentSlotCreated') })
      }
      onSaved(result)
      onClose()
    } catch (err: any) {
      toast({ variant: "destructive", title: editing ? t('items.failedToUpdate') : t('items.failedToCreate'), description: err?.message ?? "Unknown error" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader>
          <SheetTitle>{editing ? `${t('items.editSlotPrefix')}: ${editing.name}` : t('items.newEquipmentSlot')}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="eq-name">{t('items.name')} <span className="text-destructive">*</span></Label>
            <Input
              id="eq-name"
              placeholder="e.g. Helmet"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={saving}
            />
          </div>

          {/* Slot Key — immutable on edit, auto-slug on create */}
          <div className="space-y-1">
            <Label htmlFor="eq-slot-key">{t('items.slotKey')} {!editing && <span className="text-destructive">*</span>}</Label>
            <div className="flex gap-1">
              <Input
                id="eq-slot-key"
                placeholder="e.g. helmet"
                value={form.slot_key}
                onChange={(e) => { setAutoSlug(false); patch("slot_key", e.target.value) }}
                disabled={!!editing || saving}
                className={editing ? "font-mono bg-muted flex-1" : "font-mono flex-1"}
              />
              {!editing && (
                <Button
                  type="button"
                  variant={autoSlug ? "default" : "outline"}
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  title={autoSlug ? t('items.autoSlugEnabledClick') : t('items.autoSlugDisabledClick')}
                  onClick={() => setAutoSlug((v) => !v)}
                  disabled={saving}
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {editing
              ? <p className="text-xs text-muted-foreground">{t('items.slotKeyImmutable')}</p>
              : <p className="text-xs text-muted-foreground">{autoSlug ? t('items.autoGeneratedFromName') : t('items.manualInput')}</p>
            }
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="eq-desc">{t('items.description')}</Label>
            <Input
              id="eq-desc"
              placeholder="e.g. Head armour slot."
              value={form.description}
              onChange={(e) => patch("description", e.target.value)}
              disabled={saving}
            />
          </div>

          {/* Allowed Categories */}
          <div className="space-y-1">
            <Label>{t('items.allowedCategories')}</Label>
            <Popover open={catOpen} onOpenChange={setCatOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  disabled={saving}
                  className="w-full justify-between font-normal h-auto min-h-10 py-2"
                >
                  <div className="flex flex-wrap gap-1 flex-1">
                    {form.allowed_categories.length > 0 ? (
                      form.allowed_categories.map((cat) => (
                        <span
                          key={cat}
                          className="inline-flex items-center gap-1 rounded bg-secondary text-secondary-foreground text-xs px-1.5 py-0.5 capitalize"
                        >
                          {cat}
                          <button
                            type="button"
                            className="hover:text-destructive"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation()
                              patch("allowed_categories", form.allowed_categories.filter((c) => c !== cat))
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground">{t('items.anyCategoryAllowed')}</span>
                    )}
                  </div>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t('items.searchByName')}
                    value={catSearch}
                    onValueChange={setCatSearch}
                  />
                  <CommandList>
                    <CommandEmpty>{t('items.noCategoryFound')}</CommandEmpty>
                    <CommandGroup>
                      {allCategories
                        .filter((c) => !catSearch || c.toLowerCase().includes(catSearch.toLowerCase()))
                        .map((cat) => {
                          const selected = form.allowed_categories.includes(cat)
                          return (
                            <CommandItem
                              key={cat}
                              value={cat}
                              onSelect={() => {
                                patch(
                                  "allowed_categories",
                                  selected
                                    ? form.allowed_categories.filter((c) => c !== cat)
                                    : [...form.allowed_categories, cat],
                                )
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 shrink-0 ${selected ? "opacity-100" : "opacity-0"}`} />
                              <span className="capitalize">{cat}</span>
                            </CommandItem>
                          )
                        })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Allowed Item Definitions */}
          <div className="space-y-1">
            <Label>{t('items.allowedItems')}</Label>
            <Popover open={itemDefOpen} onOpenChange={setItemDefOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  disabled={saving}
                  className="w-full justify-between font-normal h-auto min-h-10 py-2"
                >
                  <div className="flex flex-wrap gap-1 flex-1">
                    {form.allowed_item_definition_ids.length > 0 ? (
                      form.allowed_item_definition_ids.map((id) => {
                        const def = itemDefCache[id]
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded bg-secondary text-secondary-foreground text-xs px-1.5 py-0.5"
                          >
                            <span className="font-medium">{def?.name ?? id}</span>
                            {def?.item_code && <span className="text-muted-foreground font-mono">({def.item_code})</span>}
                            <button
                              type="button"
                              className="hover:text-destructive"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation()
                                patch("allowed_item_definition_ids", form.allowed_item_definition_ids.filter((i) => i !== id))
                              }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        )
                      })
                    ) : (
                      <span className="text-muted-foreground">{t('items.anyItemDefAllowed')}</span>
                    )}
                  </div>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t('items.searchByNameOrCode')}
                    value={itemDefSearch}
                    onValueChange={handleItemDefSearch}
                  />
                  <CommandList>
                    <CommandEmpty>{itemDefLoading ? t('items.loadingDots') : t('items.noItemFound')}</CommandEmpty>
                    <CommandGroup>
                      {itemDefResults.map((def) => {
                        const selected = form.allowed_item_definition_ids.includes(def.id)
                        return (
                          <CommandItem
                            key={def.id}
                            value={def.id}
                            onSelect={() => {
                              patch(
                                "allowed_item_definition_ids",
                                selected
                                  ? form.allowed_item_definition_ids.filter((i) => i !== def.id)
                                  : [...form.allowed_item_definition_ids, def.id],
                              )
                              setItemDefCache((prev) => ({ ...prev, [def.id]: def }))
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 shrink-0 ${selected ? "opacity-100" : "opacity-0"}`} />
                            <span className="flex-1 truncate">{def.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground font-mono capitalize">{def.category}</span>
                            {def.item_code && <span className="ml-2 text-xs text-muted-foreground font-mono">{def.item_code}</span>}
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Is Active — only shown when editing */}
          {editing && (
            <div className="flex items-center gap-3">
              <Switch
                id="eq-active"
                checked={form.is_active}
                onCheckedChange={(v) => patch("is_active", v)}
                disabled={saving}
              />
              <Label htmlFor="eq-active">{t('common.active')}</Label>
            </div>
          )}

          {/* Metadata */}
          <KVEditor entries={form.meta} onChange={(v) => patch("meta", v)} label={t('items.metadataLabel')} />
        </div>

        <SheetFooter className="pt-4">
          <Button variant="outline" disabled={saving} onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{editing ? t('items.saving') : t('items.creating')}</> : editing ? t('items.saveChanges') : t('items.createSlot')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Equipments Tab ──────────────────────────────────────────────────────────
function EquipmentsTab({
  gameId,
  slots,
  setSlots,
  loading,
  setLoading,
  error,
  setError,
  activeTab,
}: {
  gameId: string
  slots: EquipmentSlot[]
  setSlots: (v: EquipmentSlot[]) => void
  loading: boolean
  setLoading: (v: boolean) => void
  error: string | null
  setError: (v: string | null) => void
  activeTab: string
}) {
  const { t } = useTranslation()
  const [expandedSlotKey, setExpandedSlotKey] = useState<string | null>(null)
  const [detailCache, setDetailCache] = useState<Record<string, EquipmentSlot>>({})
  const [detailLoading, setDetailLoading] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<Record<string, string>>({})
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<EquipmentSlot | null>(null)
  const [itemInfoCache, setItemInfoCache] = useState<Record<string, ItemDefinition>>({})
  const [subTab, setSubTab] = useState<"grid" | "list">("grid")
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [snapBonds, setSnapBonds] = useState<Record<string, string[]>>({}) // adjacency list: slotKey -> bonded keys
  const [draggingPos, setDraggingPos] = useState<Record<string, { x: number; y: number }> | null>(null)
  const dragRef = useRef<{ slotKey: string; startX: number; startY: number; origPositions: Record<string, { x: number; y: number }> } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [gridZoom, setGridZoom] = useState<number>(1)

  useEffect(() => {
    if (!gameId) return
    try {
      const raw = localStorage.getItem(`eq-slots-pos-${gameId}`)
      if (raw) setPositions(JSON.parse(raw))
      const z = localStorage.getItem(`eq-slots-zoom-${gameId}`)
      if (z) setGridZoom(parseFloat(z))
      const bonds = localStorage.getItem(`eq-slots-bonds-${gameId}`)
      if (bonds) setSnapBonds(JSON.parse(bonds))
    } catch {}
  }, [gameId])

  function changeZoom(delta: number) {
    setGridZoom((prev) => {
      const next = Math.min(2, Math.max(0.4, parseFloat((prev + delta).toFixed(2))))
      try { localStorage.setItem(`eq-slots-zoom-${gameId}`, String(next)) } catch {}
      return next
    })
  }

  function fetchItemNames(ids: string[] | null | undefined) {
    if (!ids || ids.length === 0) return
    const missing = ids.filter((id) => !itemInfoCache[id])
    if (missing.length === 0) return
    Promise.all(missing.map((id) => getItemDefinition({ gameId }, id).catch(() => null)))
      .then((results) => {
        const updates: Record<string, ItemDefinition> = {}
        results.forEach((r) => { if (r) updates[r.item.id] = r.item })
        if (Object.keys(updates).length > 0)
          setItemInfoCache((prev) => ({ ...prev, ...updates }))
      })
  }

  const fetchSlots = useCallback(() => {
    if (!gameId) return
    setLoading(true)
    setError(null)
    listEquipmentSlots({ gameId }, { limit: 100, offset: 0, is_active: true })
      .then((res) => setSlots(res.slots ?? []))
      .catch((e) => setError(e?.message ?? t('items.failedLoadEquipSlots')))
      .finally(() => setLoading(false))
  }, [gameId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== "equipments" || !gameId) return
    if (slots.length > 0 || loading) return
    fetchSlots()
  }, [activeTab, gameId]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleRowClick(slot: EquipmentSlot) {
    const key = slot.slot_key
    if (expandedSlotKey === key) {
      setExpandedSlotKey(null)
      return
    }
    setExpandedSlotKey(key)
    if (detailCache[key]) return
    setDetailLoading(key)
    setDetailError((prev) => { const n = { ...prev }; delete n[key]; return n })
    getEquipmentSlot({ gameId }, key)
      .then((data) => {
        setDetailCache((prev) => ({ ...prev, [key]: data }))
        fetchItemNames(data.allowed_item_definition_ids)
      })
      .catch((e) => setDetailError((prev) => ({ ...prev, [key]: e?.message ?? t('items.failedLoadSlotDetail') })))
      .finally(() => setDetailLoading(null))
  }

  function openCreate() {
    setEditingSlot(null)
    setSheetOpen(true)
  }

  function openEdit(slot: EquipmentSlot, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingSlot(slot)
    setSheetOpen(true)
  }

  const [pendingDeleteSlot, setPendingDeleteSlot] = useState<string | null>(null)
  const [deleteSlotLoading, setDeleteSlotLoading] = useState(false)

  function handleDelete(slotKey: string, e: React.MouseEvent) {
    e.stopPropagation()
    setPendingDeleteSlot(slotKey)
  }

  function confirmDeleteSlot() {
    if (!pendingDeleteSlot) return
    const slotKey = pendingDeleteSlot
    setDeleteSlotLoading(true)
    deleteEquipmentSlot({ gameId }, slotKey)
      .then(() => {
        setSlots(slots.filter((s) => s.slot_key !== slotKey))
        setDetailCache((prev) => { const n = { ...prev }; delete n[slotKey]; return n })
        setPositions((prev) => { const n = { ...prev }; delete n[slotKey]; return n })
        setSnapBonds((prev) => {
          const n = { ...prev }
          ;(n[slotKey] ?? []).forEach((b) => { n[b] = (n[b] ?? []).filter((k) => k !== slotKey); if (!n[b].length) delete n[b] })
          delete n[slotKey]
          try { localStorage.setItem(`eq-slots-bonds-${gameId}`, JSON.stringify(n)) } catch {}
          return n
        })
        setPendingDeleteSlot(null)
      })
      .catch((err: unknown) => alert((err as Error)?.message ?? t('items.failedDeleteSlot')))
      .finally(() => setDeleteSlotLoading(false))
  }

  function handleSaved(saved: EquipmentSlot) {
    // update detail cache
    setDetailCache((prev) => ({ ...prev, [saved.slot_key]: saved }))
    fetchItemNames(saved.allowed_item_definition_ids)
    // update list
    setSlots(
      slots.some((s) => s.slot_key === saved.slot_key)
        ? slots.map((s) => s.slot_key === saved.slot_key ? { ...s, ...saved } : s)
        : [saved, ...slots]
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">{t('items.loadingEquipmentSlots')}</span>
      </div>
    )
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchSlots} disabled={loading} title={t('common.refresh')}>
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      </Button>
      <Button size="sm" className="h-8" onClick={openCreate}>
        <Plus className="h-4 w-4 mr-1" />
        {t('items.newEquipmentSlot')}
      </Button>
    </div>
  )

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">{headerActions}</div>
        <div className="text-center py-12 text-sm text-destructive">{error}</div>
        <EquipmentSlotSheet open={sheetOpen} gameId={gameId} editing={editingSlot} onSaved={handleSaved} onClose={() => setSheetOpen(false)} />
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">{headerActions}</div>
        <div className="text-center py-12 text-sm text-muted-foreground">
          {t('items.noActiveSlots')}
        </div>
        <EquipmentSlotSheet open={sheetOpen} gameId={gameId} editing={editingSlot} onSaved={handleSaved} onClose={() => setSheetOpen(false)} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('items.equipmentSlotsTitle')}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span className={slots.length >= 5000 ? "text-destructive font-medium" : ""}>
              {slots.length} / 5000
            </span>
            {" "}{t('items.slotsDefined')}
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/50">
              <Lock className="h-3 w-3" />
              {t('items.systemMaximum')}
            </span>
          </p>
        </div>
        {headerActions}
      </div>

      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as "grid" | "list")}>
        <TabsList className="mb-2">
          <TabsTrigger value="grid">{t('items.gridView')}</TabsTrigger>
          <TabsTrigger value="list">{t('items.listView')}</TabsTrigger>
        </TabsList>

        {/* ── Grid (drag-and-drop canvas) ── */}
        <TabsContent value="grid" className="mt-0">
          {(() => {
            const CARD_W = 116
            const CARD_H_EST = 80
            const GAP = 12
            const COLS = 6
            const getDefaultPos = (idx: number) => ({
              x: (idx % COLS) * (CARD_W + GAP) + GAP,
              y: Math.floor(idx / COLS) * (CARD_H_EST + GAP) + GAP,
            })
            const SNAP_DIST = 24
            const getGroupMembers = (startKey: string): string[] => {
              const visited = new Set<string>(); const queue = [startKey]
              while (queue.length) { const k = queue.shift()!; if (visited.has(k)) continue; visited.add(k); for (const b of snapBonds[k] ?? []) if (!visited.has(b)) queue.push(b) }
              return [...visited]
            }
            const getBondedNeighbor = (slotKey: string, dir: "left" | "right" | "top" | "bottom"): string | null => {
              const si = slots.findIndex((s) => s.slot_key === slotKey)
              const posA = draggingPos?.[slotKey] ?? positions[slotKey] ?? getDefaultPos(si)
              for (const bKey of snapBonds[slotKey] ?? []) {
                const bi = slots.findIndex((s) => s.slot_key === bKey)
                const posB = draggingPos?.[bKey] ?? positions[bKey] ?? getDefaultPos(bi)
                const dx = posB.x - posA.x, dy = posB.y - posA.y
                if (dx === 0 && dy === 0) continue
                if (dir === "right"  && dx > 0 && Math.abs(dx) >= Math.abs(dy)) return bKey
                if (dir === "left"   && dx < 0 && Math.abs(dx) >= Math.abs(dy)) return bKey
                if (dir === "bottom" && dy > 0 && Math.abs(dy) >  Math.abs(dx)) return bKey
                if (dir === "top"    && dy < 0 && Math.abs(dy) >  Math.abs(dx)) return bKey
              }
              return null
            }
            const detachBond = (a: string, b: string) => {
              setSnapBonds((prev) => {
                const n = { ...prev }
                n[a] = (n[a] ?? []).filter((k) => k !== b); n[b] = (n[b] ?? []).filter((k) => k !== a)
                if (!n[a].length) delete n[a]; if (!n[b].length) delete n[b]
                try { localStorage.setItem(`eq-slots-bonds-${gameId}`, JSON.stringify(n)) } catch {}
                return n
              })
            }
            const rawCanvasH = Math.max(400, ...slots.map((s, i) => {
              const p = draggingPos?.[s.slot_key] ?? (positions[s.slot_key] ?? getDefaultPos(i))
              return p.y + CARD_H_EST + GAP
            }))
            const canvasH = rawCanvasH * gridZoom
            const startDrag = (e: React.PointerEvent<HTMLDivElement>, slotKey: string, idx: number) => {
              e.preventDefault()
              e.currentTarget.setPointerCapture(e.pointerId)
              const members = getGroupMembers(slotKey)
              const origPositions: Record<string, { x: number; y: number }> = {}
              members.forEach((k) => {
                const si = slots.findIndex((s) => s.slot_key === k)
                origPositions[k] = positions[k] ?? getDefaultPos(si < 0 ? idx : si)
              })
              dragRef.current = { slotKey, startX: e.clientX, startY: e.clientY, origPositions }
            }
            const onDragMove = (e: React.PointerEvent<HTMLDivElement>, slotKey: string) => {
              if (!dragRef.current || dragRef.current.slotKey !== slotKey) return
              const dx = (e.clientX - dragRef.current.startX) / gridZoom
              const dy = (e.clientY - dragRef.current.startY) / gridZoom
              const next: Record<string, { x: number; y: number }> = {}
              Object.entries(dragRef.current.origPositions).forEach(([k, orig]) => {
                next[k] = { x: Math.max(0, orig.x + dx), y: Math.max(0, orig.y + dy) }
              })
              setDraggingPos(next)
            }
            const onDragEnd = (e: React.PointerEvent<HTMLDivElement>, slotKey: string) => {
              if (!dragRef.current || dragRef.current.slotKey !== slotKey) return
              const dx = (e.clientX - dragRef.current.startX) / gridZoom
              const dy = (e.clientY - dragRef.current.startY) / gridZoom
              const draggingKeys = new Set(Object.keys(dragRef.current.origPositions))
              const movedPos: Record<string, { x: number; y: number }> = {}
              Object.entries(dragRef.current.origPositions).forEach(([k, orig]) => {
                movedPos[k] = { x: Math.max(0, orig.x + dx), y: Math.max(0, orig.y + dy) }
              })
              if (!draggingKeys.has(slotKey)) { dragRef.current = null; setDraggingPos(null); return }
              // find nearest static card to snap to
              const primary = movedPos[slotKey]
              let snapOffset = { x: 0, y: 0 }
              let snapTarget: string | null = null
              for (let si = 0; si < slots.length && snapTarget === null; si++) {
                const s = slots[si]
                if (draggingKeys.has(s.slot_key)) continue
                const cp = positions[s.slot_key] ?? getDefaultPos(si)
                const candidates = [
                  { x: cp.x + CARD_W + GAP, y: cp.y },
                  { x: cp.x - CARD_W - GAP, y: cp.y },
                  { x: cp.x, y: cp.y + CARD_H_EST + GAP },
                  { x: cp.x, y: cp.y - CARD_H_EST - GAP },
                ]
                for (const c of candidates) {
                  if (Math.abs(primary.x - c.x) < SNAP_DIST && Math.abs(primary.y - c.y) < SNAP_DIST) {
                    snapOffset = { x: c.x - primary.x, y: c.y - primary.y }
                    snapTarget = s.slot_key
                    break
                  }
                }
              }
              const finalPos: Record<string, { x: number; y: number }> = {}
              draggingKeys.forEach((k) => {
                finalPos[k] = { x: Math.max(0, movedPos[k].x + snapOffset.x), y: Math.max(0, movedPos[k].y + snapOffset.y) }
              })
              dragRef.current = null
              setDraggingPos(null)
              setPositions((prev) => {
                const next = { ...prev, ...finalPos }
                try { localStorage.setItem(`eq-slots-pos-${gameId}`, JSON.stringify(next)) } catch {}
                return next
              })
              if (snapTarget !== null) {
                setSnapBonds((prev) => {
                  const n = { ...prev }
                  if (!(n[slotKey] ?? []).includes(snapTarget!)) n[slotKey] = [...(n[slotKey] ?? []), snapTarget!]
                  if (!(n[snapTarget!] ?? []).includes(slotKey)) n[snapTarget!] = [...(n[snapTarget!] ?? []), slotKey]
                  try { localStorage.setItem(`eq-slots-bonds-${gameId}`, JSON.stringify(n)) } catch {}
                  return n
                })
              }
            }
            return (
              <>
                {/* toolbar */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => changeZoom(-0.1)} disabled={gridZoom <= 0.4} title={t('items.zoomOut')}>
                      <ZoomOut className="h-3.5 w-3.5" />
                    </Button>
                    <button
                      className="text-xs tabular-nums w-11 text-center text-muted-foreground hover:text-foreground transition-colors"
                      title={t('items.resetZoom')}
                      onClick={() => {
                        setGridZoom(1)
                        try { localStorage.setItem(`eq-slots-zoom-${gameId}`, "1") } catch {}
                      }}
                    >
                      {Math.round(gridZoom * 100)}%
                    </button>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => changeZoom(0.1)} disabled={gridZoom >= 2} title={t('items.zoomIn')}>
                      <ZoomIn className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button
                    variant="outline" size="sm" className="h-7 text-xs"
                    onClick={() => {
                      const reset: Record<string, { x: number; y: number }> = {}
                      // preserve pinned positions and bonded positions
                      const locked = new Set<string>()
                      Object.entries(snapBonds).forEach(([k, v]) => { if (v.length > 0) locked.add(k) })
                      locked.forEach((key) => { if (positions[key]) reset[key] = positions[key] })
                      // fill non-locked slots sequentially from position 0
                      let freeIdx = 0
                      slots.forEach((s) => {
                        if (!locked.has(s.slot_key)) {
                          reset[s.slot_key] = {
                            x: (freeIdx % COLS) * (CARD_W + GAP) + GAP,
                            y: Math.floor(freeIdx / COLS) * (CARD_H_EST + GAP) + GAP,
                          }
                          freeIdx++
                        }
                      })
                      setPositions(reset)
                      try { localStorage.setItem(`eq-slots-pos-${gameId}`, JSON.stringify(reset)) } catch {}
                    }}
                  >
                    {t('items.resetPositions')}
                  </Button>
                </div>

                {/* canvas */}
                <div
                  ref={canvasRef}
                  className="relative border rounded-md bg-muted/10 overflow-auto"
                  style={{ height: canvasH }}
                >
                  <div
                    className="absolute top-0 left-0"
                    style={{ transform: `scale(${gridZoom})`, transformOrigin: "top left", width: `${100 / gridZoom}%` }}
                  >
                    {slots.map((slot, i) => {
                      const isDragging = !!draggingPos?.[slot.slot_key]
                      const pos = draggingPos?.[slot.slot_key] ?? (positions[slot.slot_key] ?? getDefaultPos(i))
                      const bondedEdges = {
                        top: getBondedNeighbor(slot.slot_key, "top"),
                        right: getBondedNeighbor(slot.slot_key, "right"),
                        bottom: getBondedNeighbor(slot.slot_key, "bottom"),
                        left: getBondedNeighbor(slot.slot_key, "left"),
                      }
                      const hasBond = Object.values(bondedEdges).some(Boolean)
                      return (
                        <div
                          key={slot.id}
                          className={`absolute touch-none select-none${isDragging ? " opacity-90" : ""}`}
                          style={{ left: pos.x, top: pos.y, width: CARD_W, zIndex: isDragging ? 50 : 1 }}
                          onPointerDown={(e) => startDrag(e, slot.slot_key, i)}
                          onPointerMove={(e) => onDragMove(e, slot.slot_key)}
                          onPointerUp={(e) => onDragEnd(e, slot.slot_key)}
                          onPointerCancel={() => { dragRef.current = null; setDraggingPos(null) }}
                        >
                          {/* Bond edge detach indicators */}
                          {(Object.entries(bondedEdges) as ["top"|"right"|"bottom"|"left", string|null][]).map(([dir, neighbor]) => {
                            if (!neighbor) return null
                            const edgeStyle: React.CSSProperties = dir === "top"
                              ? { position: "absolute", top: -5, left: "50%", transform: "translateX(-50%)", zIndex: 20 }
                              : dir === "right"
                              ? { position: "absolute", top: "50%", right: -5, transform: "translateY(-50%)", zIndex: 20 }
                              : dir === "bottom"
                              ? { position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)", zIndex: 20 }
                              : { position: "absolute", top: "50%", left: -5, transform: "translateY(-50%)", zIndex: 20 }
                            return (
                              <button
                                key={dir}
                                style={edgeStyle}
                                className="w-2.5 h-2.5 rounded-full bg-blue-400 hover:bg-red-400 cursor-pointer transition-colors border border-background"
                                title={`${t('items.detachFrom')} ${neighbor}`}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); detachBond(slot.slot_key, neighbor) }}
                              />
                            )
                          })}
                          <Card className={`cursor-grab active:cursor-grabbing shadow-sm transition-shadow${isDragging ? " shadow-xl ring-2 ring-primary/40" : ""}${hasBond ? " ring-1 ring-blue-400/50" : ""}`} style={{ height: CARD_H_EST }}>
                            <CardContent className="p-1.5">
                              <div className="flex gap-0.5">
                                {/* left: main info */}
                                <div className="min-w-0 flex-1 space-y-1">
                                  {/* name + status */}
                                  <div className="flex items-start gap-0.5">
                                    {slot.is_active
                                      ? <span className="text-[8px] text-green-500 font-medium leading-none mt-0.5 shrink-0">●</span>
                                      : <span className="text-[8px] text-muted-foreground leading-none mt-0.5 shrink-0">○</span>}
                                    <p className="text-[10px] font-semibold truncate leading-tight">{slot.name}</p>
                                  </div>
                                  <code className="text-[8px] bg-muted px-0.5 py-px rounded font-mono inline-block leading-tight truncate max-w-full">
                                    {slot.slot_key}
                                  </code>
                                  {/* categories */}
                                  <div className="flex flex-wrap gap-0.5">
                                    {slot.allowed_categories && slot.allowed_categories.length > 0
                                      ? slot.allowed_categories.length === 1
                                        ? <Badge variant="outline" className="text-[8px] capitalize px-0.5 py-0 leading-tight">{slot.allowed_categories[0]}</Badge>
                                        : <span className="text-[8px] text-muted-foreground">{slot.allowed_categories.length}× {t('items.typesCount')}</span>
                                      : <span className="text-[8px] text-muted-foreground italic">{t('items.anyType')}</span>}
                                  </div>
                                  {/* items */}
                                  <div className="flex text-[8px] text-muted-foreground">
                                    <span>
                                      {slot.allowed_item_definition_ids && slot.allowed_item_definition_ids.length > 0
                                        ? `${slot.allowed_item_definition_ids.length}× ${t('items.itemsUnit')}`
                                        : t('items.anyItems')}
                                    </span>
                                  </div>
                                </div>
                                {/* right: action buttons column */}
                                <div className="flex flex-col items-center justify-between shrink-0">
                                  <Button
                                    variant="ghost" size="icon" className="h-4 w-4"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); openEdit(detailCache[slot.slot_key] ?? slot, e) }}
                                  >
                                    <Pencil className="h-2 w-2" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="icon" className="h-4 w-4 text-destructive hover:text-destructive"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); handleDelete(slot.slot_key, e) }}
                                    disabled={deleteSlotLoading && pendingDeleteSlot === slot.slot_key}
                                  >
                                    {deleteSlotLoading && pendingDeleteSlot === slot.slot_key
                                      ? <Loader2 className="h-2 w-2 animate-spin" />
                                      : <Trash2 className="h-2 w-2" />}
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )
          })()}
        </TabsContent>

        {/* ── List ── */}
        <TabsContent value="list" className="mt-0">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-6" />
                    <TableHead>{t('items.name')}</TableHead>
                    <TableHead>{t('items.slotKeyHeader')}</TableHead>
                    <TableHead>{t('items.allowedCategoriesHeader')}</TableHead>
                    <TableHead>{t('items.allowedItemsHeader')}</TableHead>
                    <TableHead>{t('items.status')}</TableHead>
                    <TableHead className="text-right">{t('items.actionsHeader')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.map((slot) => {
                    const isExpanded = expandedSlotKey === slot.slot_key
                    const detail = detailCache[slot.slot_key]
                    const isLoadingDetail = detailLoading === slot.slot_key
                    const detailErr = detailError[slot.slot_key]
                    return (
                      <Fragment key={slot.id}>
                        <TableRow
                          className={`hover:bg-muted/40 cursor-pointer ${isExpanded ? "bg-muted/30" : ""}`}
                          onClick={() => handleRowClick(slot)}
                        >
                          <TableCell className="pr-0">
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </TableCell>
                          <TableCell className="font-medium">
                            {slot.name}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                              {slot.slot_key}
                            </code>
                          </TableCell>
                          <TableCell>
                            {slot.allowed_categories && slot.allowed_categories.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {slot.allowed_categories.map((cat) => (
                                  <Badge key={cat} variant="outline" className="text-xs capitalize">{cat}</Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">{t('items.anyType')}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {slot.allowed_item_definition_ids && slot.allowed_item_definition_ids.length > 0 ? (
                              <span>{slot.allowed_item_definition_ids.length} {t('items.itemsUnit')}</span>
                            ) : (
                              <span className="italic">{t('items.anyItems')}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {slot.is_active ? (
                              <span className="text-green-500 text-sm font-medium">{t('common.active')}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">{t('common.inactive')}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              title={t('common.edit')}
                              onClick={(e) => openEdit(detail ?? slot, e)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                              title={t('common.delete')}
                              onClick={(e) => handleDelete(slot.slot_key, e)}
                              disabled={deleteSlotLoading && pendingDeleteSlot === slot.slot_key}
                            >
                              {deleteSlotLoading && pendingDeleteSlot === slot.slot_key
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={8} className="p-0">
                              <div className="px-6 py-4 space-y-4">
                                {isLoadingDetail ? (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {t('items.loadingSlotDetail')}
                                  </div>
                                ) : detailErr ? (
                                  <p className="text-sm text-destructive">{detailErr}</p>
                                ) : detail ? (
                                  <>
                                    {/* IDs */}
                                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-foreground">{t('items.slotIdLabel')}:</span>
                                        <span className="text-xs font-mono text-muted-foreground">{detail.id}</span>
                                        <CopyButton text={detail.id} />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-foreground">{t('items.slotKey')}:</span>
                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{detail.slot_key}</code>
                                        <CopyButton text={detail.slot_key} />
                                      </div>
                                    </div>

                                    {/* Description */}
                                    {detail.description && (
                                      <div className="space-y-0.5">
                                        <p className="text-xs font-semibold text-foreground">{t('items.description')}</p>
                                        <p className="text-sm text-muted-foreground">{detail.description}</p>
                                      </div>
                                    )}

                                    {/* Core info grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                                      <div>
                                        <span className="text-muted-foreground">{t('items.status')}: </span>
                                        <span className={detail.is_active ? "text-green-500 font-medium" : "font-medium"}>
                                          {detail.is_active ? t('common.active') : t('common.inactive')}
                                        </span>
                                      </div>
                                      <div className="col-span-2">
                                        <span className="text-muted-foreground">{t('items.createdByLabel')}: </span>
                                        <span className="font-mono">{detail.created_by}</span>
                                      </div>
                                    </div>

                                    {/* Allowed Categories */}
                                    <div className="space-y-1">
                                      <p className="text-xs font-semibold text-foreground">{t('items.allowedCategories')}</p>
                                      {detail.allowed_categories && detail.allowed_categories.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                          {detail.allowed_categories.map((cat) => (
                                            <Badge key={cat} variant="outline" className="text-xs capitalize">{cat}</Badge>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-muted-foreground italic">{t('items.anyCategoryAllowed')}</span>
                                      )}
                                    </div>

                                    {/* Allowed Item Definition IDs */}
                                    <div className="space-y-1">
                                      <p className="text-xs font-semibold text-foreground">{t('items.allowedItems')}</p>
                                      {detail.allowed_item_definition_ids && detail.allowed_item_definition_ids.length > 0 ? (
                                        <div className="flex flex-col gap-1">
                                          {detail.allowed_item_definition_ids.map((id) => {
                                            const def = itemInfoCache[id]
                                            return (
                                              <div key={id} className="flex items-center gap-2">
                                                <Link
                                                  href={`/games/${gameId}/items/${id}`}
                                                  className="text-sm font-medium text-primary hover:underline"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  {def?.name ?? <span className="font-mono text-xs">{id}</span>}
                                                </Link>
                                                {def?.item_code && (
                                                  <span className="text-xs text-muted-foreground font-mono">({def.item_code})</span>
                                                )}
                                                {def?.category && (
                                                  <Badge variant="outline" className="text-xs capitalize">{def.category}</Badge>
                                                )}
                                                <CopyButton text={id} />
                                              </div>
                                            )
                                          })}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-muted-foreground italic">{t('items.anyItemDefAllowed')}</span>
                                      )}
                                    </div>

                                    {/* Metadata */}
                                    {detail.metadata && Object.keys(detail.metadata).length > 0 && (
                                      <div className="space-y-1">
                                        <p className="text-xs font-semibold text-foreground">{t('items.metadata')}</p>
                                        <pre className="text-[11px] font-mono bg-background/60 border rounded-md p-2 overflow-auto max-h-[200px] whitespace-pre-wrap">
                                          {JSON.stringify(detail.metadata, null, 2)}
                                        </pre>
                                      </div>
                                    )}

                                    {/* Timestamps */}
                                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                                      <span>{t('items.createdAtLabel')}: {new Date(detail.created_at).toLocaleString()}</span>
                                      <span>{t('items.updatedAtLabel')}: {new Date(detail.updated_at).toLocaleString()}</span>
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EquipmentSlotSheet
        open={sheetOpen}
        gameId={gameId}
        editing={editingSlot}
        onSaved={handleSaved}
        onClose={() => setSheetOpen(false)}
      />

      <AlertDialog open={!!pendingDeleteSlot} onOpenChange={(o) => { if (!o && !deleteSlotLoading) setPendingDeleteSlot(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('items.deleteSlot')} "{pendingDeleteSlot}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {t('items.deleteSlotDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSlotLoading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={confirmDeleteSlot}
              disabled={deleteSlotLoading}
            >
              {deleteSlotLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Tags Tab ─────────────────────────────────────────────────────────────────
function TagsTab({
  gameId,
  tags,
  setTags,
  loading,
  setLoading,
  error,
  setError,
  activeTab,
}: {
  gameId: string
  tags: ItemTag[]
  setTags: (v: ItemTag[]) => void
  loading: boolean
  setLoading: (v: boolean) => void
  error: string | null
  setError: (v: string | null) => void
  activeTab: string
}) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<ItemTag | null>(null)
  const [deletingTag, setDeletingTag] = useState<ItemTag | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<{ tag_key: string; label: string; color: string; metadata: string }>({
    tag_key: "", label: "", color: "#A855F7", metadata: "{}",
  })
  const [autoSlug, setAutoSlug] = useState(true)
  const [formErr, setFormErr] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const fetchTags = useCallback(() => {
    if (!gameId) return
    setLoading(true)
    setError(null)
    listItemTags({ gameId }, { limit: 100, offset: 0 })
      .then((res) => setTags(res.tags ?? []))
      .catch((e) => setError(e?.message ?? "Failed to load item tags"))
      .finally(() => setLoading(false))
  }, [gameId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== "tags" || !gameId) return
    if (tags.length > 0 || loading) return
    fetchTags()
  }, [activeTab, gameId]) // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditingTag(null)
    setForm({ tag_key: "", label: "", color: "#A855F7", metadata: "{}" })
    setAutoSlug(true)
    setFormErr(null)
    setSheetOpen(true)
  }

  function openEdit(tag: ItemTag, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingTag(tag)
    setForm({
      tag_key: tag.tag_key,
      label: tag.label,
      color: tag.color ?? "#A855F7",
      metadata: tag.metadata ? JSON.stringify(tag.metadata, null, 2) : "{}",
    })
    setAutoSlug(false)
    setFormErr(null)
    setSheetOpen(true)
  }

  const TAG_KEY_RE = /^[a-z0-9][a-z0-9\-]*[a-z0-9]$|^[a-z0-9]{1}$/

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setFormErr(null)

    if (!editingTag) {
      const key = form.tag_key
      if (form.label.trim().length > 20) { setFormErr(t('items.tagLabelTooLong')); return }
      if (key.length < 2) { setFormErr(t('items.tagKeyTooShort')); return }
      if (key.length > 20) { setFormErr(t('items.tagKeyTooLong')); return }
      if (!/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/.test(key)) {
        setFormErr(t('items.tagKeyInvalid')); return
      }
      if (tags.length >= 50) { setFormErr(t('items.tagMaxReached')); return }
    }

    let parsedMeta: Record<string, unknown> = {}
    try {
      parsedMeta = JSON.parse(form.metadata || "{}")
    } catch {
      setFormErr("Metadata must be valid JSON")
      return
    }
    setSaving(true)
    try {
      if (editingTag) {
        const updated = await updateItemTag({ gameId }, editingTag.id, {
          label: form.label,
          color: form.color,
          metadata: parsedMeta,
        })
        setTags(tags.map((tag) => (tag.id === updated.id ? updated : tag)))
        toast({ title: t('items.tagUpdated') })
      } else {
        const created = await createItemTag({ gameId }, {
          tag_key: form.tag_key,
          label: form.label,
          color: form.color,
          metadata: parsedMeta,
        })
        setTags([...tags, created])
        toast({ title: t('items.tagCreated') })
      }
      setSheetOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save tag"
      setFormErr(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingTag) return
    setDeleteLoading(true)
    try {
      await deleteItemTag({ gameId }, deletingTag.id)
      setTags(tags.filter((tag) => tag.id !== deletingTag.id))
      toast({ title: t('items.tagDeleted') })
      setDeletingTag(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('items.failedToDelete')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setDeleteLoading(false)
    }
  }

  const filtered = search
    ? tags.filter(
        (tag) =>
          tag.tag_key.toLowerCase().includes(search.toLowerCase()) ||
          tag.label.toLowerCase().includes(search.toLowerCase()),
      )
    : tags

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">{t('items.itemTagsTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {tags.length > 0
              ? <><span className={tags.length >= 50 ? "text-destructive font-medium" : ""}>{tags.length}</span><span className="text-muted-foreground">/50 {t('items.tagsLabel')}</span></>
              : t('items.noTagsYet')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder={t('items.searchTagsPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-44 rounded-md border border-input bg-background pl-8 pr-7 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            {search && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch("")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={fetchTags} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={openCreate} disabled={tags.length >= 50}>
            <Plus className="h-3.5 w-3.5 mr-1" /> {t('items.newTag')}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Tag className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {search ? t('items.noTagsMatchSearch') : t('items.noTagsCreate')}
          </p>
          {!search && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5 mr-1" /> {t('items.newTag')}
            </Button>
          )}
        </div>
      )}

      {/* Tags grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((tag) => (
            <Card key={tag.id} className="relative group">
              {/* actions — top right */}
              <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => openEdit(tag, e)}
                  title={t('common.edit')}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setDeletingTag(tag) }}
                  title={t('common.delete')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <CardContent className="pt-4 pb-4 px-4 space-y-2">
                {/* Color swatch + label */}
                <div className="flex items-center gap-2 pr-16">
                  <span
                    className="inline-block h-4 w-4 rounded-full shrink-0 border border-black/10"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="font-semibold text-sm truncate">{tag.label}</span>
                </div>
                {/* tag_key */}
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-xs font-mono px-1.5 py-0">
                    {tag.tag_key}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">{tag.item_count} {t('items.itemsUnit')}</span>
                </div>
                {/* metadata preview */}
                {tag.metadata && Object.keys(tag.metadata).length > 0 && (
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {JSON.stringify(tag.metadata)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingTag ? t('items.editTag') : t('items.createTag')}</SheetTitle>
            <SheetDescription>
              {editingTag ? `${t('items.editTagDesc')} "${editingTag.label}"` : t('items.createTagDesc')}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            {/* Tag Key Rules info */}
            <div className="rounded-md border border-muted bg-muted/30 px-3 py-2.5 text-xs space-y-1 text-muted-foreground">
              <p className="font-semibold text-foreground flex items-center gap-1.5"><Tag className="h-3 w-3" /> {t('items.tagKeyRules')}</p>
              <ul className="space-y-0.5 pl-1">
                <li>• Format: <code className="font-mono bg-muted rounded px-1">^[a-z0-9][a-z0-9\-]*[a-z0-9]$</code></li>
                <li>• {t('items.tagRuleLower')}</li>
                <li>• {t('items.tagRuleStart')}</li>
                <li>• {t('items.tagRuleLength')}</li>
                <li>• <span className="text-amber-500 font-medium">{t('items.tagImmutableNote')}</span></li>
                <li>• {t('items.tagRuleMax')}</li>
              </ul>
            </div>
            {!editingTag && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="label">{t('items.label')} <span className="text-destructive">*</span></Label>
                  <Input
                    id="label"
                    placeholder="e.g. Rare"
                    value={form.label}
                    maxLength={20}
                    onChange={(e) => {
                      const label = e.target.value
                      setForm((f) => ({
                        ...f,
                        label,
                        ...(autoSlug ? { tag_key: label.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "").replace(/^-+|-+$/g, "").slice(0, 20) } : {}),
                      }))
                    }}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tag_key">{t('items.tagKey')} <span className="text-destructive">*</span></Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="tag_key"
                      placeholder="e.g. rare-starter"
                      value={form.tag_key}
                      maxLength={20}
                      onChange={(e) => {
                        setAutoSlug(false)
                        setForm((f) => ({ ...f, tag_key: e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, "") }))
                      }}
                      required
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant={autoSlug ? "default" : "outline"}
                      className="h-9 w-9 shrink-0"
                      title={autoSlug ? t('items.tagAutoSlugOn') : t('items.tagAutoSlugOff')}
                      onClick={() => setAutoSlug((v) => !v)}
                    >
                      <Wand2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{autoSlug ? <span className="text-primary">{t('items.tagAutoGenerating')}</span> : <span>{t('items.tagAutoLowercaseOnly')}</span>}</span>
                    <span className={form.tag_key.length > 18 ? "text-amber-500" : ""}>{form.tag_key.length}/20</span>
                  </div>
                </div>
              </>
            )}
            {editingTag && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="label">{t('items.label')} <span className="text-destructive">*</span></Label>
                  <Input
                    id="label"
                    placeholder="e.g. Rare"
                    value={form.label}
                    maxLength={20}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('items.tagKey')}</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono text-muted-foreground">{editingTag.tag_key}</code>
                    <span className="text-[11px] text-amber-500 font-medium whitespace-nowrap">{t('items.tagImmutable')}</span>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="color">{t('items.color')}</Label>
              <div className="flex items-center gap-2">
                <input
                  id="color"
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-9 w-14 cursor-pointer rounded-md border border-input p-1"
                />
                <Input
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  placeholder="#A855F7"
                  className="font-mono"
                />
              </div>
            </div>
            {formErr && (
              <p className="text-sm text-destructive">{formErr}</p>
            )}
            <SheetFooter className="gap-2 flex-wrap">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {editingTag ? t('items.saveChanges') : t('items.createTag')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                {t('common.cancel')}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingTag} onOpenChange={(open) => { if (!open) setDeletingTag(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('items.deleteTag')} "{deletingTag?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {t('items.deleteTagDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Generator Tab ────────────────────────────────────────────────────────────
function GeneratorTab({
  studioId,
  gameId,
  generatorItems,
  setGeneratorItems,
  generatorLoading,
  setGeneratorLoading,
  generatorError,
  setGeneratorError,
  activeTab,
  onAddGenerator,
}: {
  studioId: string
  gameId: string
  generatorItems: ItemDefinition[]
  setGeneratorItems: (items: ItemDefinition[]) => void
  generatorLoading: boolean
  setGeneratorLoading: (v: boolean) => void
  generatorError: string | null
  setGeneratorError: (v: string | null) => void
  activeTab: string
  onAddGenerator: () => void
}) {
  const { t } = useTranslation()
  const [poolNames, setPoolNames] = useState<Record<string, string>>({})

  // Fetch generators
  const fetchGenerators = useCallback(() => {
    if (!gameId) return
    setGeneratorLoading(true)
    setGeneratorError(null)
    setPoolNames({})
    listItemDefinitions({ studioId, gameId }, { category: "generator", limit: 500 })
      .then((res) => {
        setGeneratorItems(res.items ?? [])
        const ids = new Set<string>()
        ;(res.items ?? []).forEach((item) => {
          const gc = item.metadata?.generator_config as Record<string, unknown> | undefined
          if (!gc) return
          const pool = Array.isArray(gc.output_pool) ? gc.output_pool as Array<Record<string, unknown>> : []
          pool.forEach((e) => {
            const id = String(e.item_definition_id ?? "")
            if (id) ids.add(id)
          })
        })
        ids.forEach((id) => {
          getItemDefinition({ studioId, gameId }, id)
            .then((r) => setPoolNames((prev) => ({ ...prev, [id]: r.item?.name ?? id })))
            .catch(() => {})
        })
      })
      .catch((e) => setGeneratorError(e?.message ?? t('items.failedLoadGenerators')))
      .finally(() => setGeneratorLoading(false))
  }, [gameId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch on first activation
  useEffect(() => {
    if (activeTab !== "generators" || !gameId) return
    if (generatorItems.length > 0 || generatorLoading) return
    fetchGenerators()
  }, [activeTab, gameId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (generatorLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">{t('items.loadingGenerators')}</span>
      </div>
    )
  }

  if (generatorError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchGenerators} disabled={generatorLoading} title={t('common.refresh')}>
            <RefreshCw className={`h-4 w-4 ${generatorLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" className="h-8" onClick={onAddGenerator}>
            <Plus className="h-4 w-4 mr-1" />
            {t('items.addGenerator')}
          </Button>
        </div>
        <div className="text-center py-12 text-sm text-destructive">{generatorError}</div>
      </div>
    )
  }

  if (generatorItems.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchGenerators} disabled={generatorLoading} title={t('common.refresh')}>
            <RefreshCw className={`h-4 w-4 ${generatorLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" className="h-8" onClick={onAddGenerator}>
            <Plus className="h-4 w-4 mr-1" />
            {t('items.addGenerator')}
          </Button>
        </div>
        <div className="text-center py-12 text-sm text-muted-foreground">
          {t('items.noGeneratorItems')}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('items.generatorsTitle')}</h2>
          <p className="text-sm text-muted-foreground">{generatorItems.length} {t('items.generatorsDefined')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchGenerators} disabled={generatorLoading} title={t('common.refresh')}>
            <RefreshCw className={`h-4 w-4 ${generatorLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" className="h-8" onClick={onAddGenerator}>
            <Plus className="h-4 w-4 mr-1" />
            {t('items.addGenerator')}
          </Button>
        </div>
      </div>

      {/* Concept explanation */}
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p><span className="font-semibold text-foreground">{t('items.generatorIntervalShort')}</span> {t('items.generatorIntervalDescPre')} <code className="bg-muted px-1 rounded">interval</code> {t('items.generatorIntervalDescPost')}</p>
        <p><span className="font-semibold text-foreground">{t('items.tickCapacity')}</span> {t('items.generatorTickCapDescPre')} <code className="bg-muted px-1 rounded">interval × tick_cap</code> {t('items.generatorTickCapDescPost')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {generatorItems.map((item) => {
          const gc = (item.metadata?.generator_config ?? {}) as Record<string, unknown>
          const interval = Number(gc.production_interval_seconds) || 0
          const ticks = Number(gc.tick_capacity) || 0
          const maxSeconds = interval * ticks
          const hours = Math.floor(maxSeconds / 3600)
          const mins = Math.floor((maxSeconds % 3600) / 60)
          const timeStr = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}` : `${mins}m`
          const outputPool = Array.isArray(gc.output_pool) ? gc.output_pool as Array<Record<string, unknown>> : []

          return (
            <Card key={item.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold truncate">{item.name}</CardTitle>
                  <Badge variant="outline" className="text-[10px] shrink-0">{item.rarity}</Badge>
                </div>
                {item.item_code && (
                  <p className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    {item.item_code} <CopyButton text={item.item_code} />
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex-1 space-y-3 text-xs">
                {/* Timing */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border px-3 py-2 text-center">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wide">{t('items.generatorIntervalShort')}</p>
                    <p className="font-semibold text-sm">{interval}s</p>
                  </div>
                  <div className="rounded-md border px-3 py-2 text-center">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wide">{t('items.generatorTickCap')}</p>
                    <p className="font-semibold text-sm">{ticks}</p>
                  </div>
                </div>

                {/* Offline hint */}
                {interval > 0 && ticks > 0 && (
                  <div className="rounded-md bg-muted/50 border border-dashed px-3 py-1.5 text-[11px] text-muted-foreground">
                    ⏱ {t('items.maxOffline')}: <span className="font-semibold text-foreground">{timeStr}</span>
                    <span className="mx-1">·</span>
                    <span className="font-mono">{interval}s × {ticks}</span> = {maxSeconds.toLocaleString()}s
                  </div>
                )}

                {/* Output Pool */}
                {outputPool.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground font-medium">{t('items.outputPoolCount')} ({outputPool.length})</p>
                    <div className="space-y-1">
                      {outputPool.map((entry, idx) => {
                        const defId = String(entry.item_definition_id ?? "")
                        const name = poolNames[defId]
                        const dropPct = entry.drop_rate != null ? `${(Number(entry.drop_rate) * 100).toFixed(1)}%` : "—"
                        return (
                          <div key={idx} className="flex items-center gap-2 rounded border px-2.5 py-2 bg-background">
                            <div className="flex-1 min-w-0 flex items-center gap-1">
                              <Link
                                href={`/games/${gameId}/items/${defId}`}
                                className="inline-flex items-center gap-1 text-xs font-medium hover:text-primary transition-colors"
                                title={defId}
                              >
                                <span className="truncate max-w-[160px]">{name || defId.slice(0, 16) + "…"}</span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </Link>
                              {defId && <CopyButton text={defId} />}
                            </div>
                            <span className="text-muted-foreground shrink-0">{dropPct}</span>
                            <span className="text-muted-foreground shrink-0 font-mono text-[10px]">{String(entry.quantity_min ?? 1)}–{String(entry.quantity_max ?? 1)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
              <div className="px-6 pb-4 flex justify-end">
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild title={t('common.edit')}>
                  <Link href={`/games/${gameId}/items/${item.id}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default function GameItemsPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { t } = useTranslation()
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
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [copiedPackId, setCopiedPackId] = useState(false)

  // filters
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterRarity, setFilterRarity] = useState<string>("all")
  const [searchName, setSearchName] = useState("")
  const [debouncedName, setDebouncedName] = useState("")
  const [selectedTagKeys, setSelectedTagKeys] = useState<string[]>([])
  const [tagFilterOpen, setTagFilterOpen] = useState(false)
  const [filterAllowClientUpdateQty, setFilterAllowClientUpdateQty] = useState<string>("all")

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
  const [deletingContainer, setDeletingContainer] = useState<ContainerDefinition | null>(null)
  const [deleteContainerLoading, setDeleteContainerLoading] = useState(false)
  const [containerSearch, setContainerSearch] = useState("")
  const [containerSearchDebounced, setContainerSearchDebounced] = useState("")
  const [containerAllItems, setContainerAllItems] = useState<ItemDefinition[]>([])
  const [expandedContainerId, setExpandedContainerId] = useState<string | null>(null)
  const [containerDetailCache, setContainerDetailCache] = useState<Record<string, ContainerDefinition>>({})
  const [containerDetailLoading, setContainerDetailLoading] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<{ id: string, field: string } | null>(null)
  const [editValue, setEditValue] = useState<string>("")
  const [editValue2, setEditValue2] = useState<string>("") // for dimensions
  const [metadataRows, setMetadataRows] = useState<{ k: string, v: string }[]>([])

  // generator tab state
  const [generatorItems, setGeneratorItems] = useState<ItemDefinition[]>([])
  const [generatorLoading, setGeneratorLoading] = useState(false)
  const [generatorError, setGeneratorError] = useState<string | null>(null)

  // equipments tab state
  const [equipmentSlots, setEquipmentSlots] = useState<EquipmentSlot[]>([])
  const [equipmentLoading, setEquipmentLoading] = useState(false)
  const [equipmentError, setEquipmentError] = useState<string | null>(null)

  // tags tab state
  const [itemTags, setItemTags] = useState<ItemTag[]>([])
  const [tagsLoading, setTagsLoading] = useState(false)
  const [tagsError, setTagsError] = useState<string | null>(null)

  // track which item is being updated
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)

  // explanation panel state
  const [showExplanationPanel, setShowExplanationPanel] = useState(false)
  const [explanationTopic, setExplanationTopic] = useState<'write_props' | 'update_qty' | null>(null)

  // preset tab state
  const [presetDefs, setPresetDefs] = useState<PresetDefinition[]>([])
  const [presetLoading, setPresetLoading] = useState(false)
  const [presetError, setPresetError] = useState<string | null>(null)
  const [presetSearch, setPresetSearch] = useState("")
  const [presetSearchDebounced, setPresetSearchDebounced] = useState("")
  const [showCreatePreset, setShowCreatePreset] = useState(false)
  const [editingPreset, setEditingPreset] = useState<PresetDefinition | null>(null)
  const [deletingPreset, setDeletingPreset] = useState<PresetDefinition | null>(null)
  const [deletePresetLoading, setDeletePresetLoading] = useState(false)

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
    if (tab === "containers" || tab === "catalogue" || tab === "gacha" || tab === "generators" || tab === "equipments" || tab === "tags" || tab === "preset" || tab === "crafting") {
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

  // debounce preset search
  useEffect(() => {
    const t = setTimeout(() => setPresetSearchDebounced(presetSearch), 250)
    return () => clearTimeout(t)
  }, [presetSearch])

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

  // fetch categories, rarities & tags from API on mount
  useEffect(() => {
    Promise.all([fetchItemCategories(), fetchItemRarities()])
      .then(([cats, rars]) => { setCategories(cats); setRarities(rars) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!gameId) return
    listItemTags({ gameId }, { limit: 200, offset: 0 })
      .then((res) => setItemTags(res.tags ?? []))
      .catch(() => {})
  }, [gameId]) // eslint-disable-line react-hooks/exhaustive-deps

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
    setLoading(true)
    setError(null)
    try {
      const params: ListItemsParams = { limit: LIMIT, offset }
      if (filterCategory !== "all") params.category = filterCategory as ItemCategory
      if (filterRarity !== "all") params.rarity = filterRarity as ItemRarity
      if (debouncedName) params.name = debouncedName
      if (selectedTagKeys.length > 0) params.tags = selectedTagKeys
      if (filterAllowClientUpdateQty !== "all") params.allow_client_update_qty = filterAllowClientUpdateQty === "true"

      const result = await listItemDefinitions({ gameId }, params)
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
  }, [gameId, filterCategory, filterRarity, debouncedName, selectedTagKeys, filterAllowClientUpdateQty, offset])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // reset offset when filters change
  useEffect(() => {
    setOffset(0)
  }, [filterCategory, filterRarity, debouncedName, selectedTagKeys, filterAllowClientUpdateQty])

  // handle updating a single item field
  const handleUpdateItemField = useCallback(async (itemId: string, patch: Partial<ItemDefinition>) => {
    setUpdatingItemId(itemId)
    try {
      const updated = await updateItemDefinition({ gameId }, itemId, patch as UpdateItemRequest)
      // update local state
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, ...updated.item } : item
        )
      )
      toast({ title: t('items.itemUpdated') })
    } catch (err: any) {
      toast({ variant: "destructive", title: t('items.failedToUpdateItem'), description: err?.message ?? "Unknown error" })
    } finally {
      setUpdatingItemId(null)
    }
  }, [gameId, toast])

  // ─── Containers ──────────────────────────────────────────────────────────────
  const fetchContainerDefs = useCallback(async () => {
    setContainerLoading(true)
    setContainerError(null)
    try {
      const ctx = { gameId }
      const [result, itemsRes] = await Promise.all([
        listContainerDefinitions(ctx, { limit: CONTAINER_LIMIT, offset: containerOffset }),
        listItemDefinitions(ctx, { limit: 200 }),
      ])
      setContainerDefs(result.container_definitions ?? [])
      setContainerTotal(result.total)
      setContainerAllItems(itemsRes.items ?? [])
    } catch (err: any) {
      setContainerError(err?.message ?? 'Failed to load container definitions')
    } finally {
      setContainerLoading(false)
    }
  }, [gameId, containerOffset])

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
      toast({ title: t('items.containerDeleted') })
      setDeletingContainer(null)
      fetchContainerDefs()
      loadGameInfo()
    } catch (err: any) {
      if (err?.status === 403) {
        toast({ variant: "destructive", title: t('items.cannotDelete'), description: t('items.systemContainerCannotDelete') })
      } else if (err?.status === 409) {
        toast({ variant: "destructive", title: t('items.cannotDelete'), description: t('items.containerHasActiveRefs') })
      } else {
        toast({ variant: "destructive", title: t('items.failedToDelete'), description: err?.message ?? "Unknown error" })
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

  function getItemName(id: string | null | undefined): string {
    if (!id) return t('items.noLinkedItem')
    const it = containerAllItems.find((i) => i.id === id) || items.find((i) => i.id === id)
    return it ? (it.name + (it.item_code ? ` (${it.item_code})` : "")) : id.slice(0, 8) + "…"
  }

  const handleContainerRowClick = (def: ContainerDefinition) => {
    if (expandedContainerId === def.id) {
      setExpandedContainerId(null)
      return
    }
    setExpandedContainerId(def.id)
    setEditingField(null) // Reset inline edit state

    // Initialize metadata rows immediately from cache or basic def
    const base = containerDetailCache[def.id] || def
    const rows = Object.entries(base.metadata || {}).map(([k, v]) => ({
      k,
      v: typeof v === 'object' ? JSON.stringify(v) : String(v)
    }))
    setMetadataRows(rows.length > 0 ? rows : [{ k: "", v: "" }])

    if (containerDetailCache[def.id]) return

    setContainerDetailLoading(def.id)
    getContainerDefinition({ gameId }, def.id)
      .then((res: { container_definition: ContainerDefinition }) => {
        setContainerDetailCache((prev) => ({ ...prev, [def.id]: res.container_definition }))
        // Update rows with fetched data if the user hasn't started editing yet
        if (!editingField || editingField.id !== def.id) {
          const fetchedRows = Object.entries(res.container_definition.metadata || {}).map(([k, v]) => ({
            k,
            v: typeof v === 'object' ? JSON.stringify(v) : String(v)
          }))
          setMetadataRows(fetchedRows.length > 0 ? fetchedRows : [{ k: "", v: "" }])
        }
      })
      .catch(() => {
        setContainerDetailCache((prev) => ({ ...prev, [def.id]: def }))
      })
      .finally(() => setContainerDetailLoading(null))
  }

  const [updatingContainerId, setUpdatingContainerId] = useState<string | null>(null)
  const handleUpdateContainerField = useCallback(async (definitionId: string, patch: UpdateContainerDefinitionRequest) => {
    setUpdatingContainerId(definitionId)
    try {
      const { container_definition: updated } = await updateContainerDefinition({ gameId }, definitionId, patch)
      // Update the main list
      setContainerDefs((prev) => prev.map((d) => d.id === definitionId ? updated : d))
      // Update the detail cache
      setContainerDetailCache((prev) => ({ ...prev, [definitionId]: updated }))
      toast({ title: t('items.containerUpdated') })
    } catch (err: any) {
      toast({ variant: "destructive", title: t('items.failedToUpdate'), description: err?.message ?? "Unknown error" })
    } finally {
      setUpdatingContainerId(null)
    }
  }, [gameId, t, toast])

  const handleSaveInlineEdit = async () => {
    if (!editingField) return
    const { id, field } = editingField
    const patch: UpdateContainerDefinitionRequest = {}
    
    if (field === 'name') {
      if (!editValue.trim()) { toast({ variant: "destructive", title: t('items.nameRequired') }); return }
      patch.name = editValue.trim()
    }
    if (field === 'linked_item_id') patch.linked_item_definition_id = editValue
    if (field === 'grid') {
      const cols = parseInt(editValue)
      const rows = parseInt(editValue2)
      if (isNaN(cols) || cols < 1 || cols > 54) { toast({ variant: "destructive", title: t('items.colsMustBe') }); return }
      if (isNaN(rows) || rows < 1 || rows > 54) { toast({ variant: "destructive", title: t('items.rowsMustBe') }); return }
      patch.grid_cols = cols
      patch.grid_rows = rows
    }
    if (field === 'metadata') {
      const metadata: Record<string, any> = {}
      metadataRows.forEach(row => {
        const key = row.k.trim()
        if (key) {
          let val: any = row.v.trim()
          // Basic type inference
          if (val.toLowerCase() === 'true') val = true
          else if (val.toLowerCase() === 'false') val = false
          else if (!isNaN(Number(val)) && val !== "") val = Number(val)
          
          metadata[key] = val
        }
      })
      patch.metadata = metadata
    }
    
    await handleUpdateContainerField(id, patch)
    setEditingField(null)
  }

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
    if (!gachaForm.name.trim()) { toast({ variant: "destructive", title: t('items.nameRequired') }); return }
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
        toast({ title: t('items.packUpdated') })
      } else {
        const res = await createGachaPack(ctx, {
          name: gachaForm.name.trim(),
          is_enabled: gachaForm.is_enabled,
          item_pool,
          key_requirements,
        })
        setGachaPacks((prev) => [res.pack, ...prev])
        toast({ title: t('items.packCreated') })
        loadGameInfo()
      }
      gachaCloseSheet()
    } catch (err: any) {
      toast({ variant: "destructive", title: t('items.saveFailed'), description: err?.message ?? "Unknown error" })
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
      toast({ variant: "destructive", title: t('items.failedToTogglePack'), description: err?.message })
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
      toast({ title: t('items.packDeleted') })
      setDeletingPack(null)
      loadGameInfo()
    } catch (err: any) {
      toast({ variant: "destructive", title: t('items.failedToDelete'), description: err?.message })
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

  // ─── Preset Definitions ──────────────────────────────────────────────────────
  const fetchPresetDefs = useCallback(async () => {
    if (!gameId) return
    setPresetLoading(true)
    setPresetError(null)
    try {
      const result = await listPresetDefinitions({ gameId })
      setPresetDefs(result.definitions ?? [])
    } catch (err: any) {
      setPresetError(err?.message ?? 'Failed to load preset definitions')
    } finally {
      setPresetLoading(false)
    }
  }, [gameId])

  useEffect(() => {
    if (activeTab === 'preset') {
      fetchPresetDefs()
    }
  }, [activeTab, fetchPresetDefs])

  const filteredPresetDefs = presetSearchDebounced
    ? presetDefs.filter(
        (d) =>
          d.name.toLowerCase().includes(presetSearchDebounced.toLowerCase()) ||
          d.preset_type.toLowerCase().includes(presetSearchDebounced.toLowerCase()) ||
          d.id.toLowerCase().includes(presetSearchDebounced.toLowerCase()),
      )
    : presetDefs

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
              <span>{t('items.itemsContainers')}</span>
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
              {t('items.itemCatalogue')}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              {maxItems != null
                ? (() => {
                    const used = itemUsage ?? total
                    return <>
                    <span className={used >= maxItems ? "text-destructive font-medium" : ""}>
                      {used.toLocaleString()} / {maxItems.toLocaleString()} {t('items.itemsUnit')}
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
                : total > 0 ? `${total} ${t('items.itemsDefined')}` : t('items.noItemsYet')
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
            <TabsTrigger value="catalogue">{t('items.tabItems')}</TabsTrigger>
            <TabsTrigger value="tags">{t('items.tabTags')}</TabsTrigger>
            <TabsTrigger value="containers">{t('items.tabContainers')}</TabsTrigger>
            <TabsTrigger value="gacha">{t('items.tabGacha')}</TabsTrigger>
            <TabsTrigger value="generators">{t('items.tabGenerators')}</TabsTrigger>
            <TabsTrigger value="equipments">{t('items.tabEquipmentSlots')}</TabsTrigger>
            <TabsTrigger value="preset">{t('items.tabPreset')}</TabsTrigger>
            <TabsTrigger value="crafting">{t('items.tabCrafting')}</TabsTrigger>
          </TabsList>

        <TabsContent value="crafting" className="space-y-4">
          <CraftingTab gameId={gameId} studioId={studioId} />
        </TabsContent>

        <TabsContent value="catalogue" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">{t('items.itemDefinitions')}</h2>
              <p className="text-sm text-muted-foreground">
                {total > 0 ? `${total.toLocaleString()} ${t('items.itemsDefined')}` : t('items.noItemsYet')}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Name search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder={t('items.searchByName')}
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="h-8 w-44 rounded-md border border-input bg-background pl-8 pr-7 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
                {searchName && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchName("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {/* Category */}
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm capitalize"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">{t('items.allCategories')}</option>
                {categories.map((c) => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
              {/* Rarity */}
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm capitalize"
                value={filterRarity}
                onChange={(e) => setFilterRarity(e.target.value)}
              >
                <option value="all">{t('items.allRarities')}</option>
                {rarities.map((r) => (
                  <option key={r} value={r} className="capitalize">{r}</option>
                ))}
              </select>
              {/* Allow Client Update Qty */}
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                value={filterAllowClientUpdateQty}
                onChange={(e) => setFilterAllowClientUpdateQty(e.target.value)}
              >
                <option value="all">{t('items.allQtyPermissions')}</option>
                <option value="true">{t('items.canUpdateQty')}</option>
                <option value="false">{t('items.cannotUpdateQty')}</option>
              </select>
              {/* Tags filter */}
              {itemTags.length > 0 && (
                <Popover open={tagFilterOpen} onOpenChange={setTagFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5">
                      <Tag className="h-3.5 w-3.5" />
                      {t('items.tabTags')}
                      {selectedTagKeys.length > 0 && (
                        <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-semibold">
                          {selectedTagKeys.length}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0" align="start">
                    <Command>
                      <CommandInput placeholder={t('items.searchTagsIn')} />
                      <CommandList>
                        <CommandEmpty>{t('items.noTagsFound')}</CommandEmpty>
                        <CommandGroup>
                          {itemTags.map((tag) => {
                            const active = selectedTagKeys.includes(tag.tag_key)
                            return (
                              <CommandItem
                                key={tag.tag_key}
                                value={tag.label || tag.tag_key}
                                onSelect={() => {
                                  setSelectedTagKeys((prev) =>
                                    active ? prev.filter((k) => k !== tag.tag_key) : [...prev, tag.tag_key]
                                  )
                                }}
                              >
                                <span
                                  className="mr-2 h-3 w-3 shrink-0 rounded-full border"
                                  style={{ background: tag.color ?? "#A855F7", borderColor: tag.color ?? "#A855F7" }}
                                />
                                <span className="flex-1 truncate">{tag.label || tag.tag_key}</span>
                                {active && <Check className="h-3.5 w-3.5 ml-1 shrink-0" />}
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              {/* Clear all */}
              {(searchName || filterCategory !== "all" || filterRarity !== "all" || filterAllowClientUpdateQty !== "all" || selectedTagKeys.length > 0) && (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  onClick={() => { setSearchName(""); setFilterCategory("all"); setFilterRarity("all"); setFilterAllowClientUpdateQty("all"); setSelectedTagKeys([]) }}
                >
                  Clear
                </button>
              )}
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchItems} disabled={loading} title="Refresh">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button size="sm" className="h-8" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t('items.newItem')}
              </Button>
            </div>
          </div>

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
                  <p className="text-lg font-medium">{t('items.noItemsFound')}</p>
                  <p className="text-sm mt-1">
                    {(filterCategory !== "all" || filterRarity !== "all" || debouncedName || selectedTagKeys.length > 0)
                      ? t('items.noItemsDesc')
                      : t('items.noItemsNewDesc')}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('items.name')}</TableHead>
                      <TableHead>{t('items.itemCode')}</TableHead>
                      <TableHead className="text-center">{t('items.category')}</TableHead>
                      <TableHead className="text-center">{t('items.rarity')}</TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{t('items.writePropsHeader')}</span>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setExplanationTopic('write_props')
                              setShowExplanationPanel(true)
                            }}
                            title="Learn more about Write Props"
                          >
                            <span className="text-[10px] font-bold">?</span>
                          </button>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{t('items.updateQtyHeader')}</span>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setExplanationTopic('update_qty')
                              setShowExplanationPanel(true)
                            }}
                            title="Learn more about Update Qty"
                          >
                            <span className="text-[10px] font-bold">?</span>
                          </button>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">{t('items.stackable')}</TableHead>
                      <TableHead className="text-center">{t('items.gridHeader')}</TableHead>
                      <TableHead className="text-center">{t('items.actionsHeader')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-0.5">
                            <Link
                              href={`/games/${gameId}/items/${item.id}`}
                              className="hover:text-primary hover:underline font-medium"
                            >
                              {item.name}
                            </Link>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-mono text-muted-foreground">{item.id}</span>
                              <CopyButton text={item.id} size="h-3 w-3" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.item_code ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-mono text-muted-foreground">{item.item_code}</span>
                              <CopyButton text={item.item_code} size="h-3 w-3" />
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="capitalize text-xs w-fit mx-auto">
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <RarityBadge rarity={item.rarity} />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center cursor-pointer hover:opacity-80"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUpdateItemField(item.id, { client_writable: !item.client_writable })
                            }}
                          >
                            <span className={`inline-flex h-6 w-10 items-center rounded-full border px-0.5 transition-all ${
                              updatingItemId === item.id ? 'opacity-50' : ''
                            } ${item.client_writable ? 'bg-green-100 border-green-300' : 'bg-muted border-muted-foreground'}`}>
                              <span className={`h-5 w-5 rounded-full transition-all ${item.client_writable ? 'ml-auto bg-green-500' : 'bg-muted-foreground'}`} />
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center cursor-pointer hover:opacity-80"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUpdateItemField(item.id, { allow_client_update_qty: !item.allow_client_update_qty })
                            }}
                          >
                            <span className={`inline-flex h-6 w-10 items-center rounded-full border px-0.5 transition-all ${
                              updatingItemId === item.id ? 'opacity-50' : ''
                            } ${item.allow_client_update_qty ? 'bg-blue-100 border-blue-300' : 'bg-muted border-muted-foreground'}`}>
                              <span className={`h-5 w-5 rounded-full transition-all ${item.allow_client_update_qty ? 'ml-auto bg-blue-500' : 'bg-muted-foreground'}`} />
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.is_stackable ? (
                            <span className="text-green-500 text-sm font-medium">
                              ✓ {item.max_stack_size != null ? item.max_stack_size.toLocaleString() : "∞"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">✗</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {item.grid_width}×{item.grid_height}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" asChild title="View">
                              <Link href={`/games/${gameId}/items/${item.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" asChild title="Edit">
                              <Link href={`/games/${gameId}/items/${item.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
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
                  {t('common.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + LIMIT >= total}
                  onClick={() => setOffset(offset + LIMIT)}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="containers" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">{t('items.containerDefinitions')}</h2>
              <p className="text-sm text-muted-foreground">
                {containerTotal > 0
                  ? `${containerSearchDebounced ? `${filteredContainerDefs.length} ${t('items.of')} ` : ""}${containerTotal} ${containerTotal !== 1 ? t('items.definitions') : t('items.definition')}`
                  : t('items.noContainerDefs')}
              </p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={t('items.searchByNameOrId')}
                  value={containerSearch}
                  onChange={(e) => setContainerSearch(e.target.value)}
                  className="pl-8 h-8 w-56 text-sm"
                />
                {containerSearch && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setContainerSearch("")}
                    title={t('items.clearSearch')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button variant="outline" size="icon" onClick={fetchContainerDefs} title={t('common.refresh')}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={() => setShowCreateContainer(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('items.newContainer')}
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
                    {containerSearchDebounced ? t('items.noMatchingContainers') : t('items.noContainerDefs')}
                  </p>
                  <p className="text-sm mt-1">
                    {containerSearchDebounced
                      ? t('items.noContainersMatchSearch').replace('{query}', containerSearchDebounced)
                      : t('items.clickNewContainerToCreate')}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('items.name')}</TableHead>
                      <TableHead>{t('items.type')}</TableHead>
                      <TableHead>{t('items.grid')}</TableHead>
                      <TableHead>{t('items.portable')}</TableHead>
                      <TableHead>{t('items.linkedItemDefinition')}</TableHead>
                      <TableHead className="text-right">{t('items.actionsHeader')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContainerDefs.map((def) => {
                      const isExpanded = expandedContainerId === def.id
                      const detail = containerDetailCache[def.id]
                      const isLoadingDetail = containerDetailLoading === def.id

                      return (
                        <Fragment key={def.id}>
                          <TableRow
                            className={`hover:bg-muted/40 cursor-pointer ${isExpanded ? "bg-muted/30" : ""}`}
                            onClick={() => handleContainerRowClick(def)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                )}
                                <span>{def.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <ContainerTypeBadge type={def.container_type} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {def.grid_cols} × {def.grid_rows}
                              <span className="text-xs ml-1">({def.grid_cols * def.grid_rows} {t('items.slots')})</span>
                            </TableCell>
                            <TableCell>
                              {def.is_portable ? (
                                <span className="text-green-500 text-sm font-medium">✓ {t('items.portable')}</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">✗ {t('items.fixed')}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm max-w-[180px]">
                              {def.linked_item_definition_id ? (
                                <span className="flex items-center gap-1">
                                  <span className="text-primary font-medium truncate" title={def.linked_item_definition_id}>
                                    {getItemName(def.linked_item_definition_id)}
                                  </span>
                                  <Link href={`/games/${gameId}/items/${def.linked_item_definition_id}`} title={t('items.goToItemDef')}>
                                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary shrink-0 transition-colors" />
                                  </Link>
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                {def.container_type !== 'inventory' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title={t('common.delete')}
                                    className="text-destructive hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDeletingContainer(def)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>

                          {isExpanded && (
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableCell colSpan={6} className="p-0">
                                <div className="px-10 py-4 space-y-4 border-l-2 border-primary/20 bg-primary/5 group/expand">
                                  {isLoadingDetail ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      {t('items.loadingDetailDots')}
                                    </div>
                                  ) : (
                                    <>
                                      {/* ID & Name information */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('items.containerIdLabel')}</p>
                                          <div className="flex items-center gap-2 group/id">
                                            <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded font-mono break-all">{def.id}</code>
                                            <CopyButton text={def.id} />
                                          </div>
                                        </div>

                                        <div className="space-y-1">
                                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('items.name')}</p>
                                          <div className="flex items-center gap-1.5">
                                            {editingField?.id === def.id && editingField?.field === 'name' ? (
                                              <div className="flex items-center gap-1 min-w-0 flex-1">
                                                <Input
                                                  value={editValue}
                                                  onChange={(e) => setEditValue(e.target.value)}
                                                  className="h-7 text-xs flex-1"
                                                  autoFocus
                                                />
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={handleSaveInlineEdit}>
                                                  <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingField(null)}>
                                                  <X className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-1.5 group/edit">
                                                <span className="text-sm font-medium">{def.name}</span>
                                                <Button
                                                  size="icon"
                                                  variant="ghost"
                                                  className="h-6 w-6 opacity-0 group-hover/expand:opacity-100 transition-opacity"
                                                  onClick={() => { setEditingField({ id: def.id, field: 'name' }); setEditValue(def.name) }}
                                                >
                                                  <Pencil className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <Separator />

                                      {/* Details grid */}
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                        <div className="space-y-0.5">
                                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('items.containerType')}</p>
                                          <p className="text-sm font-medium capitalize">{def.container_type}</p>
                                        </div>
                                        
                                        <div className="space-y-0.5">
                                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('items.dimensionsHeader')}</p>
                                          <div className="flex items-center gap-1.5 min-h-[20px]">
                                            {editingField?.id === def.id && editingField?.field === 'grid' ? (
                                              <div className="flex items-center gap-1">
                                                <Input
                                                  type="number"
                                                  value={editValue}
                                                  onChange={(e) => setEditValue(e.target.value)}
                                                  className="h-7 w-12 text-xs text-center px-1"
                                                />
                                                <span className="text-xs text-muted-foreground">×</span>
                                                <Input
                                                  type="number"
                                                  value={editValue2}
                                                  onChange={(e) => setEditValue2(e.target.value)}
                                                  className="h-7 w-12 text-xs text-center px-1"
                                                />
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={handleSaveInlineEdit}>
                                                  <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingField(null)}>
                                                  <X className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-1.5 group/edit">
                                                <p className="text-sm font-medium">{def.grid_cols} × {def.grid_rows} ({def.grid_cols * def.grid_rows} {t('items.totalSlots')})</p>
                                                <Button
                                                  size="icon"
                                                  variant="ghost"
                                                  className="h-6 w-6 opacity-0 group-hover/expand:opacity-100 transition-opacity"
                                                  onClick={() => {
                                                    setEditingField({ id: def.id, field: 'grid' })
                                                    setEditValue(String(def.grid_cols))
                                                    setEditValue2(String(def.grid_rows))
                                                  }}
                                                >
                                                  <Pencil className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="space-y-0.5">
                                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('items.portable')}</p>
                                          <p className="text-sm font-medium">{def.is_portable ? t('common.yes') : t('common.no')}</p>
                                        </div>
                                        
                                        {detail && (
                                          <div className="space-y-0.5">
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('items.updatedAtLabel')}</p>
                                            <p className="text-[11px] text-muted-foreground">{new Date(detail.updated_at).toLocaleString()}</p>
                                          </div>
                                        )}
                                      </div>

                                      <Separator />

                                      {/* Linked Item */}
                                      <div className="space-y-1.5">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('items.linkedItemDefinition')}</p>
                                        <div className="flex items-center gap-1.5">
                                          {editingField?.id === def.id && editingField?.field === 'linked_item_id' ? (
                                            <div className="flex items-center gap-1 flex-1">
                                              <div className="relative flex-1">
                                                <Select
                                                  value={editValue || "none"}
                                                  onValueChange={(v) => setEditValue(v === "none" ? "" : v)}
                                                >
                                                  <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder={t('items.selectItem')} />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="none">{t('items.noLinkedItemOption')}</SelectItem>
                                                    {containerAllItems.filter(i => i.category === 'container' || i.category === 'other').map(item => (
                                                      <SelectItem key={item.id} value={item.id}>
                                                        {item.name} {item.item_code ? `(${item.item_code})` : ""}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={handleSaveInlineEdit}>
                                                <Check className="h-4 w-4" />
                                              </Button>
                                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingField(null)}>
                                                <X className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2 group/edit">
                                              {def.linked_item_definition_id ? (
                                                <div className="flex items-center gap-2">
                                                  <span className="text-sm font-medium text-primary">
                                                    {getItemName(def.linked_item_definition_id)}
                                                  </span>
                                                  <code className="text-xs text-muted-foreground bg-muted/40 px-1 rounded">{def.linked_item_definition_id}</code>
                                                  <CopyButton text={def.linked_item_definition_id} size="h-3 w-3" />
                                                </div>
                                              ) : (
                                                <span className="text-sm text-muted-foreground italic">{t('items.noLinkedItem')}</span>
                                              )}
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 opacity-0 group-hover/expand:opacity-100 transition-opacity"
                                                onClick={() => {
                                                  setEditingField({ id: def.id, field: 'linked_item_id' })
                                                  setEditValue(def.linked_item_definition_id || "")
                                                }}
                                              >
                                                <Pencil className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Metadata */}
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between group/meta-header">
                                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('items.fullMetadata')}</p>
                                          {editingField?.id === def.id && editingField?.field === 'metadata' && (
                                            <div className="flex items-center gap-1">
                                              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => {
                                                setEditingField(null)
                                                // Reset to cached version
                                                const current = containerDetailCache[def.id] || def
                                                const rows = Object.entries(current.metadata || {}).map(([k, v]) => ({
                                                  k,
                                                  v: typeof v === 'object' ? JSON.stringify(v) : String(v)
                                                }))
                                                setMetadataRows(rows.length > 0 ? rows : [{ k: "", v: "" }])
                                              }}>{t('common.cancel')}</Button>
                                              <Button size="sm" className="h-6 text-[10px]" onClick={handleSaveInlineEdit}>{t('common.save')}</Button>
                                            </div>
                                          )}
                                        </div>
                                        
                                        <div className="space-y-1.5 py-1">
                                          {metadataRows.map((row, i) => (
                                            <div key={i} className="flex gap-1.5 items-center group/meta-row">
                                              <Input
                                                placeholder="Key"
                                                value={row.k}
                                                onChange={e => {
                                                  const next = [...metadataRows]
                                                  next[i] = { ...next[i], k: e.target.value }
                                                  setMetadataRows(next)
                                                  setEditingField({ id: def.id, field: 'metadata' }) // set as dirty
                                                }}
                                                className="w-[140px] h-7 text-[11px] font-mono bg-background/30"
                                              />
                                              <span className="text-muted-foreground text-[10px]">:</span>
                                              <Input
                                                placeholder="Value"
                                                value={row.v}
                                                onChange={e => {
                                                  const next = [...metadataRows]
                                                  next[i] = { ...next[i], v: e.target.value }
                                                  setMetadataRows(next)
                                                  setEditingField({ id: def.id, field: 'metadata' }) // set as dirty
                                                }}
                                                className="flex-1 h-7 text-[11px] font-mono bg-background/30"
                                              />
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 shrink-0 text-destructive opacity-0 group-hover/meta-row:opacity-100 transition-opacity"
                                                onClick={() => {
                                                  setMetadataRows(metadataRows.filter((_, idx) => idx !== i))
                                                  setEditingField({ id: def.id, field: 'metadata' })
                                                }}
                                              >
                                                <X className="h-3.5 w-3.5" />
                                              </Button>
                                            </div>
                                          ))}
                                          
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                                            onClick={() => {
                                              setMetadataRows([...metadataRows, { k: "", v: "" }])
                                              setEditingField({ id: def.id, field: 'metadata' })
                                            }}
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            {t('common.add' as any)}
                                          </Button>
                                        </div>
                                      </div>

                                      {/* Created At */}
                                      {detail && (
                                        <div className="text-[11px] text-muted-foreground pt-1">
                                          <span>{t('items.createdAtLabel')}: {new Date(detail.created_at).toLocaleString()}</span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {containerTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>
                {t('crafting.pageLabel')} {containerCurrentPage} {t('crafting.pageOf')} {containerTotalPages} — {containerTotal} {t('items.definitions')}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={containerOffset === 0}
                  onClick={() => setContainerOffset(Math.max(0, containerOffset - CONTAINER_LIMIT))}
                >
                  {t('common.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={containerOffset + CONTAINER_LIMIT >= containerTotal}
                  onClick={() => setContainerOffset(containerOffset + CONTAINER_LIMIT)}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="gacha" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">{t('items.gachaPacksTitle')}</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {gameLimits?.max_gacha_packs != null
                  ? <>
                      <span className={gachaPacks.length >= gameLimits.max_gacha_packs ? "text-destructive font-medium" : ""}>
                        {gachaPacks.length} / {gameLimits.max_gacha_packs} {t('items.gachaPacksUnit')}
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
                        title={t('items.managePlugins')}
                      >
                        <Hammer className="h-3.5 w-3.5" />
                      </Link>
                    </>
                  : `${gachaPacks.length} ${t('items.gachaPacksConfigured')}`
                }
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={fetchGachaData} title={t('common.refresh')}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={gachaOpenCreate}
                disabled={!!(gameLimits?.max_gacha_packs != null && gachaPacks.length >= gameLimits.max_gacha_packs)}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                {t('items.newGachaPack')}
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
                <p className="text-muted-foreground">{t('items.noGachaPacks')}</p>
                <Button onClick={gachaOpenCreate}><Plus className="h-4 w-4 mr-2" />{t('items.createFirstPack')}</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {gachaPacks.map((pack) => {
                const totalWeight = pack.item_pool.reduce((s, e) => s + e.weight, 0)
                const isExpanded = expandedPack === pack.id
                return (
                  <Card key={pack.id} className={`transition-all ${!pack.is_enabled ? "opacity-60" : ""}`}>
                    {/* ── Clickable header row ── */}
                    <div
                      className="cursor-pointer select-none"
                      onClick={() => setExpandedPack(isExpanded ? null : pack.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          {/* Chevron */}
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}

                          {/* Col 1: Name + ID */}
                          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-base truncate">{pack.name}</CardTitle>
                              <Badge variant={pack.is_enabled ? "default" : "secondary"} className="text-xs shrink-0">
                                {pack.is_enabled ? t('items.enabled') : t('items.disabled')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                              <span>ID: {pack.id}</span>
                              <CopyButton text={pack.id} size="h-3 w-3" />
                            </div>
                          </div>

                          {/* Col 2: Keys */}
                          <div className="w-52 shrink-0 text-sm text-muted-foreground">
                            {(pack.key_requirements ?? []).length === 0 ? (
                              <span className="italic text-xs">{t('items.noKeyRequired')}</span>
                            ) : pack.key_requirements.length === 1 ? (
                              <span>🔑 <strong className="text-foreground">{pack.key_requirements[0].quantity}×</strong> {gachaItemShortName(pack.key_requirements[0].item_definition_id)}</span>
                            ) : (
                              <span>🔑 {pack.key_requirements.length} {t('items.gachaKeysCount')}</span>
                            )}
                          </div>

                          {/* Col 3: Items in pool */}
                          <div className="w-28 shrink-0 text-sm text-muted-foreground">
                            🎲 {pack.item_pool.length} {t('items.itemsUnit')}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Switch
                              checked={pack.is_enabled}
                              onCheckedChange={() => handleGachaToggle(pack)}
                              disabled={togglingId === pack.id}
                              title={pack.is_enabled ? t('items.disablePack') : t('items.enablePack')}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); gachaOpenEdit(pack) }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon" variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); setDeletingPack(pack) }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </div>

                    {/* ── Expanded detail ── */}
                    {isExpanded && (
                      <>
                        <Separator />
                        <CardContent className="pt-4 pb-4">
                          <div className="flex gap-4 items-start">
                            {/* Col 1 — Key Requirements (narrow, fixed width) */}
                            {(pack.key_requirements ?? []).length > 0 && (
                              <div className="w-[300px] shrink-0">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">🔑 {t('items.keyRequirements')}</p>
                                <div className="rounded-md border overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/50">
                                        <TableHead className="text-xs h-8">{t('items.name')}</TableHead>
                                        <TableHead className="text-xs h-8 text-right w-12">{t('items.quantity')}</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {pack.key_requirements.map((kr, i) => {
                                        const item = gachaAllItems.find((x) => x.id === kr.item_definition_id)
                                        return (
                                          <TableRow key={i}>
                                            <TableCell className="text-xs py-2">
                                              {item ? (
                                                <div className="space-y-0.5">
                                                  <span className="font-medium block">{item.name}</span>
                                                  <div className="flex items-center gap-1 flex-wrap">
                                                    {item.item_code && <code className="text-muted-foreground font-mono text-[11px]">{item.item_code}</code>}
                                                    {item.rarity && <RarityBadge rarity={item.rarity} />}
                                                  </div>
                                                </div>
                                              ) : (
                                                <code className="font-mono text-[11px] text-muted-foreground">{kr.item_definition_id.slice(0, 8)}…</code>
                                              )}
                                            </TableCell>
                                            <TableCell className="text-xs py-2 text-right font-semibold tabular-nums">{kr.quantity}×</TableCell>
                                          </TableRow>
                                        )
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}

                            {/* Col 2 — Drop Table (takes remaining width) */}
                            {pack.item_pool.length > 0 && (
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">🎲 {t('items.dropTable')}</p>
                                <div className="rounded-md border overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/50">
                                        <TableHead className="text-xs h-8">{t('items.name')}</TableHead>
                                        <TableHead className="text-xs h-8 w-24">{t('items.rarityHeader')}</TableHead>
                                        <TableHead className="text-xs h-8">{t('items.dropRate')}</TableHead>
                                        <TableHead className="text-xs h-8 text-right w-24">{t('items.weight')}</TableHead>
                                        <TableHead className="text-xs h-8 text-right w-14">{t('items.quantity')}</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {[...pack.item_pool]
                                        .sort((a, b) => b.weight - a.weight)
                                        .map((entry, i) => {
                                          const item = gachaAllItems.find((x) => x.id === entry.item_definition_id)
                                          const pct = totalWeight > 0 ? (entry.weight / totalWeight) * 100 : 0
                                          const rarity = entry.rarity ?? item?.rarity
                                          return (
                                            <TableRow key={i}>
                                              <TableCell className="text-xs py-2">
                                                {item ? (
                                                  <div>
                                                    <span className="font-medium">{item.name}</span>
                                                    {item.item_code && <code className="ml-1.5 text-muted-foreground font-mono text-[11px]">{item.item_code}</code>}
                                                  </div>
                                                ) : (
                                                  <code className="font-mono text-[11px] text-muted-foreground">{entry.item_definition_id.slice(0, 8)}…</code>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-xs py-2">
                                                {rarity ? <RarityBadge rarity={rarity} /> : <span className="text-muted-foreground">—</span>}
                                              </TableCell>
                                              <TableCell className="text-xs py-2">
                                                <div className="flex items-center gap-2">
                                                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                                                  </div>
                                                  <span className="tabular-nums text-muted-foreground w-16 text-right shrink-0">{formatPct(pct)}</span>
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-xs py-2 text-right tabular-nums text-muted-foreground">{entry.weight.toLocaleString()}</TableCell>
                                              <TableCell className="text-xs py-2 text-right tabular-nums font-medium">
                                                {entry.quantity_min === entry.quantity_max
                                                  ? entry.quantity_min
                                                  : `${entry.quantity_min}–${entry.quantity_max}`}
                                              </TableCell>
                                            </TableRow>
                                          )
                                        })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══════════ GENERATORS TAB ═══════════ */}
        <TabsContent value="generators" className="space-y-4">
          <GeneratorTab
            studioId={studioId}
            gameId={gameId}
            generatorItems={generatorItems}
            setGeneratorItems={setGeneratorItems}
            generatorLoading={generatorLoading}
            setGeneratorLoading={setGeneratorLoading}
            generatorError={generatorError}
            setGeneratorError={setGeneratorError}
            activeTab={activeTab}
            onAddGenerator={() => {
              setCreateInitCategory("generator" as ItemCategory)
              setShowCreate(true)
            }}
          />
        </TabsContent>

        {/* ═══════════ EQUIPMENTS TAB ═══════════ */}
        <TabsContent value="equipments" className="space-y-4">
          <EquipmentsTab
            gameId={gameId}
            slots={equipmentSlots}
            setSlots={setEquipmentSlots}
            loading={equipmentLoading}
            setLoading={setEquipmentLoading}
            error={equipmentError}
            setError={setEquipmentError}
            activeTab={activeTab}
          />
        </TabsContent>

        {/* ═══════════ TAGS TAB ═══════════ */}
        <TabsContent value="tags" className="space-y-4">
          <TagsTab
            gameId={gameId}
            tags={itemTags}
            setTags={setItemTags}
            loading={tagsLoading}
            setLoading={setTagsLoading}
            error={tagsError}
            setError={setTagsError}
            activeTab={activeTab}
          />
        </TabsContent>

        <TabsContent value="preset" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">{t('items.presetsTitle')}</h2>
              {(() => {
                const used = presetDefs.length
                const max = 500
                const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0
                return (
                  <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span className={used >= max ? "text-destructive font-medium" : ""}>
                      {used.toLocaleString()} / {max.toLocaleString()}
                    </span>
                    <span className="inline-block h-1.5 w-24 rounded-full bg-muted overflow-hidden align-middle">
                      <span
                        className={`block h-full rounded-full transition-all ${
                          used >= max ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-primary"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="text-xs text-muted-foreground">{t('items.fixedLimitNoUpgrade')}</span>
                    {presetSearchDebounced && (
                      <span className="text-xs text-muted-foreground">({filteredPresetDefs.length} {t('items.matching')})</span>
                    )}
                  </p>
                )
              })()}
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={t('items.searchByNameTypeOrId')}
                  value={presetSearch}
                  onChange={(e) => setPresetSearch(e.target.value)}
                  className="pl-8 h-8 w-64 text-sm"
                />
                {presetSearch && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setPresetSearch("")}
                    title={t('items.clearSearch')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button variant="outline" size="icon" onClick={fetchPresetDefs} title={t('common.refresh')}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={() => setShowCreatePreset(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('items.newPresetDefinition')}
              </Button>
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {presetLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : presetError ? (
                <div className="p-6 text-center text-destructive">{presetError}</div>
              ) : filteredPresetDefs.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">
                    {presetSearchDebounced ? t('items.noMatchingPresets') : t('items.noPresetDefs')}
                  </p>
                  <p className="text-sm mt-1">
                    {presetSearchDebounced
                      ? t('items.noPresetsMatchSearch').replace('{query}', presetSearchDebounced)
                      : t('items.clickNewPresetToCreate')}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('items.name')}</TableHead>
                      <TableHead>{t('items.presetType')}</TableHead>
                      <TableHead>{t('items.maxSlots')}</TableHead>
                      <TableHead>{t('items.metadata')}</TableHead>
                      <TableHead className="text-right">{t('items.actionsHeader')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPresetDefs.map((def) => (
                      <TableRow key={def.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium">
                          {def.name}
                          <div
                            className="text-xs font-mono text-muted-foreground mt-0.5 flex items-center gap-0.5"
                            title={def.id}
                          >
                            <span className="truncate max-w-[180px]">{def.id}</span>
                            <CopyButton text={def.id} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border bg-blue-500/15 text-blue-400 border-blue-400/40 capitalize">
                            {def.preset_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {def.max_slots}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {Object.keys(def.metadata ?? {}).length > 0
                            ? Object.entries(def.metadata).map(([k, v]) => `${k}: ${v}`).join(", ")
                            : <span className="italic">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t('common.edit')}
                              onClick={() => setEditingPreset(def)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t('common.delete')}
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingPreset(def)}
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
        </TabsContent>
      </Tabs>

      {/* Create Item Modal */}
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

      {/* Create Container Definition Modal */}
      <CreateContainerDefinitionDialog
        open={showCreateContainer}
        gameId={gameId}
        allItems={containerAllItems}
        onCreated={() => { fetchContainerDefs(); loadGameInfo() }}
        onClose={() => setShowCreateContainer(false)}
      />


      {/* Delete Container Definition Confirmation */}
      {deletingContainer && (
        <Dialog open={!!deletingContainer} onOpenChange={(v) => { if (!v) setDeletingContainer(null) }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('items.deleteContainerTitle')}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {t('items.deleteContainerConfirm')}{" "}
              <span className="font-semibold text-foreground">"{deletingContainer.name}"</span>?
              {t('items.cannotUndone')}
            </p>
            {deletingContainer.container_type === 'inventory' && (
              <p className="text-xs text-destructive mt-1">{t('items.systemContainerCannotDelete')}</p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={deleteContainerLoading}>{t('common.cancel')}</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleDeleteContainer}
                disabled={deleteContainerLoading || deletingContainer.container_type === 'inventory'}
              >
                {deleteContainerLoading ? t('items.deleting') : t('common.delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Gacha Create / Edit Sheet ───────────────────────────────────────── */}
      <Sheet open={gachaSheetOpen} onOpenChange={(open) => { if (!open) gachaCloseSheet() }}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{editingPack ? `${t('items.editPackPrefix')}: ${editingPack.name}` : t('items.newGachaPack')}</SheetTitle>
            <SheetDescription className="text-xs">
              {t('items.gachaSheetDesc')}
            </SheetDescription>
            {editingPack && (
              <div className="flex items-center gap-1 pt-1">
                <p className="text-xs font-mono text-muted-foreground">
                  ID: {editingPack.id}
                </p>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title={t('items.copyId')}
                  onClick={(event) => {
                    const text = editingPack.id
                    console.log('[CopyPackId] clicked, text:', text)
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(text)
                        .then(() => console.log('[CopyPackId] Clipboard API success'))
                        .catch((err) => console.warn('[CopyPackId] Clipboard API failed:', err))
                    } else {
                      const sheetContent = (event.currentTarget as HTMLElement).closest('[role="dialog"]') ?? document.body
                      console.log('[CopyPackId] container:', sheetContent)
                      const el = document.createElement('textarea')
                      el.value = text
                      el.style.position = 'fixed'
                      el.style.top = '0'
                      el.style.left = '0'
                      el.style.opacity = '0'
                      el.style.pointerEvents = 'none'
                      sheetContent.appendChild(el)
                      el.focus()
                      el.select()
                      console.log('[CopyPackId] selectionStart:', el.selectionStart, 'selectionEnd:', el.selectionEnd)
                      const result = document.execCommand('copy')
                      console.log('[CopyPackId] execCommand result:', result)
                      sheetContent.removeChild(el)
                    }
                    setCopiedPackId(true)
                    setTimeout(() => setCopiedPackId(false), 1500)
                  }}
                >
                  {copiedPackId
                    ? <Check className="h-3 w-3 text-green-500" />
                    : <Copy className="h-3 w-3" />}
                </button>
              </div>
            )}
          </SheetHeader>

          <div className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>{t('items.name')} <span className="text-destructive">*</span></Label>
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
                  <Label className="text-base">{t('items.keyRequirements')}</Label>
                  <p className="text-xs text-muted-foreground">{t('items.keyReqDesc')}</p>
                </div>
                <Button size="sm" variant="outline" type="button" onClick={addKeyReqRow} disabled={formSaving}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> {t('items.addKey')}
                </Button>
              </div>
              {gachaForm.keyReqs.length > 0 && (
                <div className="text-xs text-muted-foreground grid grid-cols-[24px_1fr_80px_32px] gap-1.5 px-1 font-medium">
                  <span />
                  <span>{t('items.name')}</span>
                  <span>{t('items.quantity')}</span>
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
                <p className="text-xs text-muted-foreground italic">{t('items.noKeyItems')}</p>
              )}
              <Link
                href={`/games/${gameId}/items?create=1&category=key`}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                {t('items.createNewItem')}
              </Link>
            </div>

            {/* Enabled */}
            <div className="flex items-center gap-3">
              <Switch
                id="gacha-enabled"
                checked={gachaForm.is_enabled}
                onCheckedChange={(v) => setGachaForm((f) => ({ ...f, is_enabled: v }))}
                disabled={formSaving}
              />
              <Label htmlFor="gacha-enabled" className="cursor-pointer">{t('items.enabled')}</Label>
              <span className="text-xs text-muted-foreground">{t('items.playersCanOpen')}</span>
            </div>

            <Separator />

            {/* Item Pool */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">{t('items.itemPoolLabel')}</Label>
                  {formTotalWeight > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t('items.totalWeight')}: {formTotalWeight.toLocaleString()}
                      {formTotalWeight === 1_000_000 && " ✓ (1M = % notation)"}
                    </p>
                  )}
                </div>
                <Button size="sm" variant="outline" type="button" onClick={addPoolRow} disabled={formSaving}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> {t('items.addItem')}
                </Button>
              </div>
              {gachaForm.pool.length > 0 && (
                <div className="text-xs text-muted-foreground grid grid-cols-[1fr_110px_60px_60px_32px] gap-1.5 px-1 font-medium">
                  <span>{t('items.name')}</span>
                  <span>{t('items.weight')}</span>
                  <span>{t('items.min')}</span>
                  <span>{t('items.max')}</span>
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
                  <p className="text-xs font-medium text-muted-foreground mb-2">{t('items.dropRatePreview')}</p>
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
                  {t('items.noItemsPool')}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-6 mt-4 border-t">
            <Button variant="outline" onClick={() => gachaCloseSheet()} disabled={formSaving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleGachaSave} disabled={formSaving}>
              {formSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editingPack ? t('items.saveChanges') : t('items.createPack')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Gacha Delete Confirmation ────────────────────────────────────────── */}
      <AlertDialog open={!!deletingPack} onOpenChange={(o) => { if (!o) setDeletingPack(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('items.deletePack')} "{deletingPack?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {t('items.deletePackDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePackLoading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleGachaDelete}
              disabled={deletePackLoading}
            >
              {deletePackLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Preset Create Sheet ──────────────────────────────────────────────── */}
      <CreatePresetDefinitionSheet
        open={showCreatePreset}
        gameId={gameId}
        onCreated={fetchPresetDefs}
        onClose={() => setShowCreatePreset(false)}
      />

      {/* ── Preset Edit Sheet ────────────────────────────────────────────────── */}
      {editingPreset && (
        <EditPresetDefinitionSheet
          open={!!editingPreset}
          gameId={gameId}
          definition={editingPreset}
          onUpdated={fetchPresetDefs}
          onClose={() => setEditingPreset(null)}
        />
      )}

      {/* ── Preset Delete Confirmation ───────────────────────────────────────── */}
      <AlertDialog open={!!deletingPreset} onOpenChange={(o) => { if (!o) setDeletingPreset(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('items.deletePreset')} "{deletingPreset?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {t('items.deletePresetDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePresetLoading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={async () => {
                if (!deletingPreset) return
                setDeletePresetLoading(true)
                try {
                  await deletePresetDefinition({ gameId }, deletingPreset.id)
                  toast({ title: t('items.presetDeleted') })
                  setDeletingPreset(null)
                  fetchPresetDefs()
                } catch (err: any) {
                  if (err?.status === 403) {
                    toast({ variant: "destructive", title: t('items.permissionDenied'), description: t('items.noPermissionDeletePreset') })
                  } else {
                    toast({ variant: "destructive", title: t('items.failedToDelete'), description: err?.message ?? "Unknown error" })
                  }
                } finally {
                  setDeletePresetLoading(false)
                }
              }}
              disabled={deletePresetLoading}
            >
              {deletePresetLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Explanation Panel ───────────────────────────────────────────────── */}
      <Sheet open={showExplanationPanel} onOpenChange={setShowExplanationPanel}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto flex flex-col">
          <SheetHeader>
            <SheetTitle>
              {explanationTopic === 'write_props' 
                ? t('items.explanation.writeProps.title')
                : explanationTopic === 'update_qty' 
                ? t('items.explanation.updateQty.title')
                : t('common.support')}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4 flex-1 overflow-y-auto">
            {explanationTopic === 'write_props' && (
              <div className="space-y-3 text-sm">
                <div>
                  <h3 className="font-semibold text-foreground mb-1.5">{t('items.explanation.writeProps.title')}</h3>
                  <p className="text-muted-foreground">
                    {t('items.explanation.writeProps.description')}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-1">{t('items.explanation.writeProps.whenEnabled')}</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                    <li>{t('items.explanation.writeProps.enabled1')}</li>
                    <li>{t('items.explanation.writeProps.enabled2')}</li>
                    <li>{t('items.explanation.writeProps.enabled3')}</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-1">{t('items.explanation.writeProps.whenDisabled')}</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                    <li>{t('items.explanation.writeProps.disabled1')}</li>
                    <li>{t('items.explanation.writeProps.disabled2')}</li>
                    <li>{t('items.explanation.writeProps.disabled3')}</li>
                  </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-2 text-xs text-blue-800 dark:text-blue-200">
                  💡 <strong>{t('items.explanation.writeProps.tip')}</strong> {t('items.explanation.writeProps.tipContent')}
                </div>
              </div>
            )}

            {explanationTopic === 'update_qty' && (
              <div className="space-y-3 text-sm">
                <div>
                  <h3 className="font-semibold text-foreground mb-1.5">{t('items.explanation.updateQty.title')}</h3>
                  <p className="text-muted-foreground">
                    {t('items.explanation.updateQty.description')}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-1">{t('items.explanation.updateQty.whenEnabled')}</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                    <li>{t('items.explanation.updateQty.enabled1')}</li>
                    <li>{t('items.explanation.updateQty.enabled2')}</li>
                    <li>{t('items.explanation.updateQty.enabled3')}</li>
                    <li>{t('items.explanation.updateQty.enabled4')}</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-1">{t('items.explanation.updateQty.whenDisabled')}</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                    <li>{t('items.explanation.updateQty.disabled1')}</li>
                    <li>{t('items.explanation.updateQty.disabled2')}</li>
                    <li>{t('items.explanation.updateQty.disabled3')}</li>
                    <li>{t('items.explanation.updateQty.disabled4')}</li>
                  </ul>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded p-2 text-xs text-amber-800 dark:text-amber-200">
                  ⚠️ <strong>{t('items.explanation.updateQty.warning')}</strong> {t('items.explanation.updateQty.warningContent')}
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setShowExplanationPanel(false)}>{t('common.close')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Create Preset Definition Sheet ──────────────────────────────────────────
function CreatePresetDefinitionSheet({
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
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [containerType, setContainerType] = useState("")
  const [maxSlots, setMaxSlots] = useState("20")
  const [meta, setMeta] = useState<{ key: string; value: string }[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  function resetForm() {
    setName("")
    setContainerType("")
    setMaxSlots("20")
    setMeta([])
    setErrors({})
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2) e.name = t('items.nameMustBe2Chars')
    if (!containerType.trim()) e.containerType = t('items.containerTypeRequired')
    const slots = Number(maxSlots)
    if (!maxSlots || !slots || slots < 1) e.maxSlots = t('items.maxSlotsInvalid')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      const metadata: Record<string, unknown> = {}
      meta.forEach(({ key, value }) => { if (key.trim()) metadata[key.trim()] = value })
      const body: CreatePresetDefinitionRequest = {
        preset_type: containerType.trim(),
        name: name.trim(),
        max_slots: Number(maxSlots),
        metadata,
      }
      await createPresetDefinition({ gameId }, body)
      toast({ title: t('items.presetCreated'), description: `"${name.trim()}" added.` })
      resetForm()
      onCreated()
      onClose()
    } catch (err: any) {
      if (err?.status === 403) {
        toast({ variant: "destructive", title: t('items.permissionDenied'), description: t('items.noPermissionCreatePreset') })
      } else {
        toast({ variant: "destructive", title: t('items.failedToCreate'), description: err?.message ?? "Unknown error" })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose() } }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('items.newPresetDefinition')}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
          <div className="space-y-1">
            <Label htmlFor="pd-name">{t('items.name')} <span className="text-destructive">*</span></Label>
            <Input id="pd-name" placeholder="e.g. Standard Deck" value={name} onChange={(e) => setName(e.target.value)} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="pd-type">{t('items.presetType')} <span className="text-destructive">*</span></Label>
            <Input id="pd-type" placeholder="e.g. deck, party" value={containerType} onChange={(e) => setContainerType(e.target.value)} />
            {errors.containerType && <p className="text-xs text-destructive">{errors.containerType}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="pd-slots">{t('items.maxSlots')} <span className="text-destructive">*</span></Label>
            <Input id="pd-slots" type="number" min={1} placeholder="e.g. 20" value={maxSlots} onChange={(e) => setMaxSlots(e.target.value)} />
            {errors.maxSlots && <p className="text-xs text-destructive">{errors.maxSlots}</p>}
          </div>
          <div className="space-y-1">
            <KVEditor entries={meta} onChange={setMeta} label={t('items.metadataOptional')} />
          </div>
        </div>
        <SheetFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => { resetForm(); onClose() }} disabled={loading}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {t('common.submit')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Edit Preset Definition Sheet ────────────────────────────────────────────
function EditPresetDefinitionSheet({
  open,
  gameId,
  definition,
  onUpdated,
  onClose,
}: {
  open: boolean
  gameId: string
  definition: PresetDefinition
  onUpdated: () => void
  onClose: () => void
}) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(definition.name)
  const [maxSlots, setMaxSlots] = useState(String(definition.max_slots))
  const [meta, setMeta] = useState<{ key: string; value: string }[]>(
    Object.entries(definition.metadata ?? {}).map(([key, value]) => ({ key, value: String(value) }))
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2) e.name = t('items.nameMustBe2Chars')
    const slots = Number(maxSlots)
    if (!maxSlots || !slots || slots < 1) e.maxSlots = t('items.maxSlotsInvalid')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      const metadata: Record<string, unknown> = {}
      meta.forEach(({ key, value }) => { if (key.trim()) metadata[key.trim()] = value })
      const body: UpdatePresetDefinitionRequest = {
        name: name.trim(),
        max_slots: Number(maxSlots),
        metadata,
      }
      await updatePresetDefinition({ gameId }, definition.id, body)
      toast({ title: t('items.presetUpdated'), description: `"${name.trim()}" saved.` })
      onUpdated()
      onClose()
    } catch (err: any) {
      if (err?.status === 403) {
        toast({ variant: "destructive", title: t('items.permissionDenied'), description: t('items.noPermissionUpdatePreset') })
      } else {
        toast({ variant: "destructive", title: t('items.failedToUpdate'), description: err?.message ?? "Unknown error" })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('items.editPresetDefinition')}</SheetTitle>
          <p className="text-xs font-mono text-muted-foreground truncate">{definition.id}</p>
        </SheetHeader>
        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
          <div className="space-y-1">
            <Label htmlFor="epd-name">{t('items.name')} <span className="text-destructive">*</span></Label>
            <Input id="epd-name" value={name} onChange={(e) => setName(e.target.value)} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label>{t('items.presetType')}</Label>
            <Input value={definition.preset_type} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground">{t('items.presetTypeImmutable')}</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="epd-slots">{t('items.maxSlots')} <span className="text-destructive">*</span></Label>
            <Input id="epd-slots" type="number" min={1} value={maxSlots} onChange={(e) => setMaxSlots(e.target.value)} />
            {errors.maxSlots && <p className="text-xs text-destructive">{errors.maxSlots}</p>}
          </div>
          <div className="space-y-1">
            <KVEditor entries={meta} onChange={setMeta} label={t('items.metadataOptional')} />
          </div>
        </div>
        <SheetFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {t('items.saveChanges')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
