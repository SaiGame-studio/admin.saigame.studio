"use client"

import { Fragment, useEffect, useState, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Plus, RefreshCw, Check, ChevronDown, ChevronRight, Loader2, Wand2,
  ZoomIn, ZoomOut, Info, X, ChevronsUpDown, Pencil, Trash2, ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/use-translation"
import { MermaidDiagram } from "@/components/MermaidDiagram"
import { CopyButton } from "@/components/CopyButton"
import {
  listEquipmentSlots,
  getEquipmentSlot,
  createEquipmentSlot,
  updateEquipmentSlot,
  deleteEquipmentSlot,
  listItemDefinitions,
  fetchItemCategories,
  getItemDefinition,
} from "@/lib/inventory-api"
import type { EquipmentSlot, ItemDefinition, ItemRarity } from "@/types/inventory"
import { RARITY_COLORS } from "@/types/inventory"
import type { PlayerEquippedItem } from "@/lib/game-user-api"

// ─── KV helpers ──────────────────────────────────────────────────────────────

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
    const next = entries.map((e, idx) => idx === i ? { ...e, [field]: val } : e)
    onChange(next)
  }
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {entries.map((e, i) => (
        <div key={i} className="flex gap-1 items-center">
          <Input className="h-7 text-xs" placeholder="key" value={e.key} onChange={(ev) => update(i, "key", ev.target.value)} />
          <span className="text-muted-foreground">=</span>
          <Input className="h-7 text-xs" placeholder="value" value={e.value} onChange={(ev) => update(i, "value", ev.target.value)} />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" type="button" onClick={() => remove(i)}>✕</Button>
        </div>
      ))}
      <Button variant="outline" size="sm" type="button" className="h-7 text-xs mt-1" onClick={addRow}>
        <Plus className="h-3 w-3 mr-1" /> Add
      </Button>
    </div>
  )
}

import { toSlugUnderscore } from "@/lib/utils"

function slugify(str: string): string {
  return toSlugUnderscore(str)
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

// ─── EquipmentSlotSheet ───────────────────────────────────────────────────────

export function EquipmentSlotSheet({
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
  const [itemDefOpen, setItemDefOpen] = useState(false)
  const [itemDefSearch, setItemDefSearch] = useState("")
  const [itemDefResults, setItemDefResults] = useState<ItemDefinition[]>([])
  const [itemDefLoading, setItemDefLoading] = useState(false)
  const [itemDefCache, setItemDefCache] = useState<Record<string, ItemDefinition>>({})
  const itemDefSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    fetchItemCategories().then(setAllCategories).catch(() => {})
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
          <div className="space-y-1">
            <Label htmlFor="eq-name">{t('items.name')} <span className="text-destructive">*</span></Label>
            <Input id="eq-name" placeholder="e.g. Helmet" value={form.name} onChange={(e) => handleNameChange(e.target.value)} disabled={saving} />
          </div>

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

          <div className="space-y-1">
            <Label htmlFor="eq-desc">{t('items.description')}</Label>
            <Input id="eq-desc" placeholder="e.g. Head armour slot." value={form.description} onChange={(e) => patch("description", e.target.value)} disabled={saving} />
          </div>

          <div className="space-y-1">
            <Label>{t('items.allowedCategories')}</Label>
            <Popover open={catOpen} onOpenChange={setCatOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" role="combobox" disabled={saving} className="w-full justify-between font-normal h-auto min-h-10 py-2">
                  <div className="flex flex-wrap gap-1 flex-1">
                    {form.allowed_categories.length > 0 ? (
                      form.allowed_categories.map((cat) => (
                        <span key={cat} className="inline-flex items-center gap-1 rounded bg-secondary text-secondary-foreground text-xs px-1.5 py-0.5 capitalize">
                          {cat}
                          <button type="button" className="hover:text-destructive" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); patch("allowed_categories", form.allowed_categories.filter((c) => c !== cat)) }}>
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
                  <CommandInput placeholder={t('items.searchByName')} value={catSearch} onValueChange={setCatSearch} />
                  <CommandList>
                    <CommandEmpty>{t('items.noCategoryFound')}</CommandEmpty>
                    <CommandGroup>
                      {allCategories.filter((c) => !catSearch || c.toLowerCase().includes(catSearch.toLowerCase())).map((cat) => {
                        const selected = form.allowed_categories.includes(cat)
                        return (
                          <CommandItem key={cat} value={cat} onSelect={() => patch("allowed_categories", selected ? form.allowed_categories.filter((c) => c !== cat) : [...form.allowed_categories, cat])}>
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

          <div className="space-y-1">
            <Label>{t('items.allowedItems')}</Label>
            <Popover open={itemDefOpen} onOpenChange={setItemDefOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" role="combobox" disabled={saving} className="w-full justify-between font-normal h-auto min-h-10 py-2">
                  <div className="flex flex-wrap gap-1 flex-1">
                    {form.allowed_item_definition_ids.length > 0 ? (
                      form.allowed_item_definition_ids.map((id) => {
                        const def = itemDefCache[id]
                        return (
                          <span key={id} className="inline-flex items-center gap-1 rounded bg-secondary text-secondary-foreground text-xs px-1.5 py-0.5">
                            <span className="font-medium">{def?.name ?? id}</span>
                            {def?.item_code && <span className="text-muted-foreground font-mono">({def.item_code})</span>}
                            <button type="button" className="hover:text-destructive" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); patch("allowed_item_definition_ids", form.allowed_item_definition_ids.filter((i) => i !== id)) }}>
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
                  <CommandInput placeholder={t('items.searchByNameOrCode')} value={itemDefSearch} onValueChange={handleItemDefSearch} />
                  <CommandList>
                    <CommandEmpty>{itemDefLoading ? t('items.loadingDots') : t('items.noItemFound')}</CommandEmpty>
                    <CommandGroup>
                      {itemDefResults.map((def) => {
                        const selected = form.allowed_item_definition_ids.includes(def.id)
                        return (
                          <CommandItem key={def.id} value={def.id} onSelect={() => { patch("allowed_item_definition_ids", selected ? form.allowed_item_definition_ids.filter((i) => i !== def.id) : [...form.allowed_item_definition_ids, def.id]); setItemDefCache((prev) => ({ ...prev, [def.id]: def })) }}>
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

          {editing && (
            <div className="flex items-center gap-3">
              <Switch id="eq-active" checked={form.is_active} onCheckedChange={(v) => patch("is_active", v)} disabled={saving} />
              <Label htmlFor="eq-active">{t('common.active')}</Label>
            </div>
          )}

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

function getRarityClass(rarity: string): string {
  const c = RARITY_COLORS[rarity as ItemRarity]
  return c ? c.text : "text-muted-foreground"
}

// ─── EquipmentsTab ────────────────────────────────────────────────────────────

export function EquipmentsTab({
  gameId,
  slots,
  setSlots,
  loading,
  setLoading,
  error,
  setError,
  activeTab,
  maxEquipmentSlots,
  equipmentSlotsUsage,
  onLoadGameInfo,
  equippedItems,
  equippedLoading,
  onRefreshEquipped,
  readOnly,
  playerProgressId,
}: {
  gameId: string
  slots: EquipmentSlot[]
  setSlots: (v: EquipmentSlot[]) => void
  loading: boolean
  setLoading: (v: boolean) => void
  error: string | null
  setError: (v: string | null) => void
  activeTab: string
  maxEquipmentSlots: number | null
  equipmentSlotsUsage: number | null
  onLoadGameInfo: () => void
  equippedItems?: PlayerEquippedItem[]
  equippedLoading?: boolean
  onRefreshEquipped?: () => void
  /** When true: hides create/edit/delete actions (used in player context) */
  readOnly?: boolean
  /** Player progress ID — when provided, equipped item names link to ?tab=items&item_iid=... */
  playerProgressId?: string
}) {
  // Build a map of slot_key → equipped item for fast lookup
  const equippedMap = equippedItems
    ? Object.fromEntries(equippedItems.map((e) => [e.slot_key, e]))
    : null
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [expandedSlotKey, setExpandedSlotKey] = useState<string | null>(null)
  const [detailCache, setDetailCache] = useState<Record<string, EquipmentSlot>>({})
  const [detailLoading, setDetailLoading] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<Record<string, string>>({})
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<EquipmentSlot | null>(null)
  const [itemInfoCache, setItemInfoCache] = useState<Record<string, ItemDefinition>>({})
  const [subTab, setSubTab] = useState<"grid" | "list" | "character_slot">(() => {
    const st = searchParams.get("subtab")
    return (st === "grid" || st === "list" || st === "character_slot") ? st : "grid"
  })

  function handleSubTabChange(v: string) {
    const value = v as "grid" | "list" | "character_slot"
    setSubTab(value)
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set("subtab", value)
    router.push(`${window.location.pathname}?${newParams.toString()}`)
  }
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [snapBonds, setSnapBonds] = useState<Record<string, string[]>>({})
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
    if (expandedSlotKey === key) { setExpandedSlotKey(null); return }
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

  function openCreate() { setEditingSlot(null); setSheetOpen(true) }

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
        onLoadGameInfo()
      })
      .catch((err: unknown) => alert((err as Error)?.message ?? t('items.failedDeleteSlot')))
      .finally(() => setDeleteSlotLoading(false))
  }

  function handleSaved(saved: EquipmentSlot) {
    setDetailCache((prev) => ({ ...prev, [saved.slot_key]: saved }))
    fetchItemNames(saved.allowed_item_definition_ids)
    const isNew = !slots.some((s) => s.slot_key === saved.slot_key)
    setSlots(isNew ? [saved, ...slots] : slots.map((s) => s.slot_key === saved.slot_key ? { ...s, ...saved } : s))
    if (isNew) onLoadGameInfo()
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
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { fetchSlots(); onRefreshEquipped?.() }} disabled={loading || equippedLoading} title={t('common.refresh')}>
        <RefreshCw className={`h-4 w-4 ${(loading || equippedLoading) ? "animate-spin" : ""}`} />
      </Button>
      {!readOnly && (
        <Button size="sm" className="h-8" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          {t('items.newEquipmentSlot')}
        </Button>
      )}
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
            <span className={maxEquipmentSlots != null && (equipmentSlotsUsage ?? slots.length) >= maxEquipmentSlots ? "text-destructive font-medium" : ""}>
              {equipmentSlotsUsage ?? slots.length}{maxEquipmentSlots != null ? ` / ${maxEquipmentSlots}` : ""}
            </span>
            {" "}{t('items.slotsDefined')}
          </p>
        </div>
        {headerActions}
      </div>

      <Tabs value={subTab} onValueChange={handleSubTabChange}>
        <TabsList className="mb-2">
          <TabsTrigger value="grid">{t('items.gridView')}</TabsTrigger>
          <TabsTrigger value="list">{t('items.listView')}</TabsTrigger>
          <TabsTrigger value="character_slot">{t('items.characterSlotView')}</TabsTrigger>
        </TabsList>

        {/* ── Grid ── */}
        <TabsContent value="grid" className="mt-0">
          {(() => {
            const CARD_W = 116
            const CARD_H_EST = 100
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
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => changeZoom(-0.1)} disabled={gridZoom <= 0.4} title={t('items.zoomOut')}>
                      <ZoomOut className="h-3.5 w-3.5" />
                    </Button>
                    <button
                      className="text-xs tabular-nums w-11 text-center text-muted-foreground hover:text-foreground transition-colors"
                      title={t('items.resetZoom')}
                      onClick={() => { setGridZoom(1); try { localStorage.setItem(`eq-slots-zoom-${gameId}`, "1") } catch {} }}
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
                      const locked = new Set<string>()
                      Object.entries(snapBonds).forEach(([k, v]) => { if (v.length > 0) locked.add(k) })
                      locked.forEach((key) => { if (positions[key]) reset[key] = positions[key] })
                      let freeIdx = 0
                      slots.forEach((s) => {
                        if (!locked.has(s.slot_key)) {
                          reset[s.slot_key] = { x: (freeIdx % COLS) * (CARD_W + GAP) + GAP, y: Math.floor(freeIdx / COLS) * (CARD_H_EST + GAP) + GAP }
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

                <div ref={canvasRef} className="relative border rounded-md bg-muted/10 overflow-auto" style={{ height: canvasH }}>
                  <div className="absolute top-0 left-0" style={{ transform: `scale(${gridZoom})`, transformOrigin: "top left", width: `${100 / gridZoom}%` }}>
                    {slots.map((slot, i) => {
                      const isDragging = !!draggingPos?.[slot.slot_key]
                      const pos = draggingPos?.[slot.slot_key] ?? (positions[slot.slot_key] ?? getDefaultPos(i))
                      const equippedInSlot = equippedMap?.[slot.slot_key] ?? null
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
                              <button key={dir} style={edgeStyle} className="w-2.5 h-2.5 rounded-full bg-blue-400 hover:bg-red-400 cursor-pointer transition-colors border border-background" title={`${t('items.detachFrom')} ${neighbor}`} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); detachBond(slot.slot_key, neighbor) }} />
                            )
                          })}
                          <Card className={`relative cursor-grab active:cursor-grabbing shadow-sm transition-shadow${isDragging ? " shadow-xl ring-2 ring-primary/40" : ""}${hasBond ? " ring-1 ring-blue-400/50" : ""}${equippedInSlot ? " ring-1 ring-emerald-400/60" : ""}`} style={{ height: CARD_H_EST }}>
                            <CardContent className="p-1.5">
                              <div className="flex gap-0.5">
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-start gap-0.5">
                                    {slot.is_active
                                      ? <span className="text-[8px] text-green-500 font-medium leading-none mt-0.5 shrink-0">●</span>
                                      : <span className="text-[8px] text-muted-foreground leading-none mt-0.5 shrink-0">○</span>}
                                    <p className="text-[10px] font-semibold truncate leading-tight">{slot.name}</p>
                                  </div>
                                  <code className="text-[8px] bg-muted px-0.5 py-px rounded font-mono inline-block leading-tight truncate max-w-full">
                                    {slot.slot_key}
                                  </code>
                                  <div className="flex flex-wrap gap-0.5">
                                    {slot.allowed_categories && slot.allowed_categories.length > 0
                                      ? slot.allowed_categories.length === 1
                                        ? <Badge variant="outline" className="text-[8px] capitalize px-0.5 py-0 leading-tight">{slot.allowed_categories[0]}</Badge>
                                        : <span className="text-[8px] text-muted-foreground">{slot.allowed_categories.length}× {t('items.typesCount')}</span>
                                      : <span className="text-[8px] text-muted-foreground italic">{t('items.anyType')}</span>}
                                  </div>
                                  {/* Equipped item row */}
                                  {equippedMap !== null ? (
                                    <div className={`flex items-center gap-0.5 border-t pt-0.5 mt-0.5 ${equippedLoading ? "opacity-50" : ""}`}>
                                      {equippedInSlot ? (
                                        <>
                                          <ExternalLink className="h-2 w-2 text-emerald-500 shrink-0" />
                                          {playerProgressId ? (
                                            <a
                                              href={`/games/${gameId}/players/${playerProgressId}?tab=items&item_iid=${equippedInSlot.item_id}`}
                                              className={`text-[8px] truncate font-medium hover:underline ${getRarityClass(equippedInSlot.rarity)}`}
                                              onPointerDown={(e) => e.stopPropagation()}
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {equippedInSlot.item_name}
                                            </a>
                                          ) : (
                                            <span className={`text-[8px] truncate font-medium ${getRarityClass(equippedInSlot.rarity)}`}>
                                              {equippedInSlot.item_name}
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-[8px] text-muted-foreground/50 italic">empty</span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-0.5 border-t pt-0.5 mt-0.5">
                                      <span className="text-[8px] text-muted-foreground/40 italic">no item</span>
                                    </div>
                                  )}
                                </div>
                                {!readOnly && (
                                <div className="shrink-0">
                                  <Button variant="ghost" size="icon" className="h-4 w-4" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); openEdit(detailCache[slot.slot_key] ?? slot, e) }}>
                                    <Pencil className="h-2 w-2" />
                                  </Button>
                                </div>
                                )}
                              </div>
                            </CardContent>
                            {!readOnly && (
                              <Button variant="ghost" size="icon" className="absolute bottom-0.5 right-0.5 h-4 w-4 text-destructive hover:text-destructive" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleDelete(slot.slot_key, e) }} disabled={deleteSlotLoading && pendingDeleteSlot === slot.slot_key}>
                                {deleteSlotLoading && pendingDeleteSlot === slot.slot_key ? <Loader2 className="h-2 w-2 animate-spin" /> : <Trash2 className="h-2 w-2" />}
                              </Button>
                            )}
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
                    {equippedMap !== null && <TableHead>Equipped Item</TableHead>}
                    <TableHead>{t('items.status')}</TableHead>
                    {!readOnly && <TableHead className="text-right">{t('items.actionsHeader')}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.map((slot) => {
                    const isExpanded = expandedSlotKey === slot.slot_key
                    const detail = detailCache[slot.slot_key]
                    const isLoadingDetail = detailLoading === slot.slot_key
                    const detailErr = detailError[slot.slot_key]
                    const equippedInSlot = equippedMap?.[slot.slot_key] ?? null
                    return (
                      <Fragment key={slot.id}>
                        <TableRow className={`hover:bg-muted/40 cursor-pointer ${isExpanded ? "bg-muted/30" : ""}`} onClick={() => handleRowClick(slot)}>
                          <TableCell className="pr-0">
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </TableCell>
                          <TableCell className="font-medium">{slot.name}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{slot.slot_key}</code>
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
                          {equippedMap !== null && (
                            <TableCell>
                              {equippedLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                              ) : equippedInSlot ? (
                                <div className="flex items-center gap-1.5">
                                  <ExternalLink className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                  <div className="min-w-0">
                                    {playerProgressId ? (
                                      <a
                                        href={`/games/${gameId}/players/${playerProgressId}?tab=items&item_iid=${equippedInSlot.item_id}`}
                                        className={`text-xs font-medium hover:underline ${getRarityClass(equippedInSlot.rarity)}`}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {equippedInSlot.item_name}
                                      </a>
                                    ) : (
                                      <span className={`text-xs font-medium ${getRarityClass(equippedInSlot.rarity)}`}>
                                        {equippedInSlot.item_name}
                                      </span>
                                    )}
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">{equippedInSlot.category}</Badge>
                                      <span className={`text-[10px] capitalize font-medium ${getRarityClass(equippedInSlot.rarity)}`}>{equippedInSlot.rarity}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">—</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            {slot.is_active ? (
                              <span className="text-green-500 text-sm font-medium">{t('common.active')}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">{t('common.inactive')}</span>
                            )}
                          </TableCell>
                          {!readOnly && (
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title={t('common.edit')} onClick={(e) => openEdit(detail ?? slot, e)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title={t('common.delete')} onClick={(e) => handleDelete(slot.slot_key, e)} disabled={deleteSlotLoading && pendingDeleteSlot === slot.slot_key}>
                              {deleteSlotLoading && pendingDeleteSlot === slot.slot_key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          )}
                        </TableRow>

                        {isExpanded && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={equippedMap !== null ? 9 : 8} className="p-0">
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
                                    {/* Equipped item detail panel */}
                                    {equippedInSlot && (
                                      <div className="rounded-md border border-emerald-400/30 bg-emerald-50/10 dark:bg-emerald-950/20 p-3 space-y-2">
                                        <div className="flex items-center gap-2">
                                          <ExternalLink className="h-4 w-4 text-emerald-500 shrink-0" />
                                          <span className="text-xs font-semibold text-foreground">Equipped Item</span>
                                        </div>
                                        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
                                          <div>
                                            <span className="text-muted-foreground">Name: </span>
                                            <Link href={`/games/${gameId}/items/${equippedInSlot.item_definition_id}`} className={`font-medium hover:underline ${getRarityClass(equippedInSlot.rarity)}`} onClick={(e) => e.stopPropagation()}>
                                              {equippedInSlot.item_name}
                                            </Link>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Category: </span>
                                            <span className="capitalize font-medium">{equippedInSlot.category}</span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Rarity: </span>
                                            <span className={`capitalize font-medium ${getRarityClass(equippedInSlot.rarity)}`}>{equippedInSlot.rarity}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="text-muted-foreground">Item ID: </span>
                                            <span className="font-mono">{equippedInSlot.item_id.slice(0, 12)}…</span>
                                            <CopyButton text={equippedInSlot.item_id} />
                                          </div>
                                        </div>
                                        {equippedInSlot.slot_data && Object.keys(equippedInSlot.slot_data).length > 0 && (
                                          <div className="space-y-0.5">
                                            <p className="text-xs font-semibold text-foreground">Slot Data</p>
                                            <pre className="text-[11px] font-mono bg-background/60 border rounded-md p-2 overflow-auto max-h-[120px] whitespace-pre-wrap">
                                              {JSON.stringify(equippedInSlot.slot_data, null, 2)}
                                            </pre>
                                          </div>
                                        )}
                                      </div>
                                    )}
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

                                    {detail.description && (
                                      <div className="space-y-0.5">
                                        <p className="text-xs font-semibold text-foreground">{t('items.description')}</p>
                                        <p className="text-sm text-muted-foreground">{detail.description}</p>
                                      </div>
                                    )}

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

                                    <div className="space-y-1">
                                      <p className="text-xs font-semibold text-foreground">{t('items.allowedItems')}</p>
                                      {detail.allowed_item_definition_ids && detail.allowed_item_definition_ids.length > 0 ? (
                                        <div className="flex flex-col gap-1">
                                          {detail.allowed_item_definition_ids.map((id) => {
                                            const def = itemInfoCache[id]
                                            return (
                                              <div key={id} className="flex items-center gap-2">
                                                <Link href={`/games/${gameId}/items/${id}`} className="text-sm font-medium text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                                                  {def?.name ?? <span className="font-mono text-xs">{id}</span>}
                                                </Link>
                                                {def?.item_code && <span className="text-xs text-muted-foreground font-mono">({def.item_code})</span>}
                                                {def?.category && <Badge variant="outline" className="text-xs capitalize">{def.category}</Badge>}
                                                <CopyButton text={id} />
                                              </div>
                                            )
                                          })}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-muted-foreground italic">{t('items.anyItemDefAllowed')}</span>
                                      )}
                                    </div>

                                    {detail.metadata && Object.keys(detail.metadata).length > 0 && (
                                      <div className="space-y-1">
                                        <p className="text-xs font-semibold text-foreground">{t('items.metadata')}</p>
                                        <pre className="text-[11px] font-mono bg-background/60 border rounded-md p-2 overflow-auto max-h-[200px] whitespace-pre-wrap">
                                          {JSON.stringify(detail.metadata, null, 2)}
                                        </pre>
                                      </div>
                                    )}

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

        {/* ── Character Slot Guide ── */}
        <TabsContent value="character_slot" className="mt-0">
          <Card>
            <CardContent className="p-6 space-y-6 max-w-4xl">
              <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                <Info className="h-4 w-4 shrink-0"/>
                <span>{t('items.charSlotSetupNote')}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">{t('items.charSlotGuideTitle')}</h2>
                <p className="text-sm text-muted-foreground">{t('items.charSlotGuideIntro')}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold">{t('items.charSlotDiagramTitle')}</h3>
                <div className="border rounded-md p-4 bg-muted/20 overflow-x-auto">
                  <MermaidDiagram chart={(isDark) => `flowchart LR
  subgraph SETUP["⚙️ STUDIO SETUP"]
    direction TB
    A["📦 ItemDefinition\\n─────────────\\ncategory: character\\nmetadata.equipment_slots:\\n  warrior__main_hand\\n  warrior__armor\\n  warrior__accessory"]
    B["🔧 EquipmentSlotDef\\n─────────────\\nslot_key: warrior__main_hand\\nallowed_categories: weapon\\nmetadata.character_definition_id:\\n  uuid-of-warrior-def"]
    A -- "declares via equipment_slots[ ] →" --> B
    B -. "character_definition_id (reverse ref)" .-> A
  end

  subgraph RUNTIME["▶️ PLAYER RUNTIME"]
    direction TB
    C["🦸 InventoryItem\\n─────────────\\nid: uuid-of-my-warrior\\nitem_definition_id:\\n  uuid-of-warrior-def"]
    D["⚔️ InventoryItem\\n─────────────\\nitem: sword\\nequipped_slot_key:\\n  warrior__main_hand\\nslot_data.character_item_id:\\n  uuid-of-my-warrior"]
    D -- "slot_data.character_item_id →" --> C
    D -. "equipped_slot_key" .-> B
  end

  style A fill:${isDark ? "#1e3a5f" : "#eff6ff"},stroke:${isDark ? "#60a5fa" : "#93c5fd"},color:${isDark ? "#bfdbfe" : "#1e40af"}
  style B fill:${isDark ? "#431407" : "#fff7ed"},stroke:${isDark ? "#f97316" : "#fb923c"},color:${isDark ? "#fed7aa" : "#9a3412"}
  style C fill:${isDark ? "#052e16" : "#f0fdf4"},stroke:${isDark ? "#4ade80" : "#86efac"},color:${isDark ? "#bbf7d0" : "#166534"}
  style D fill:${isDark ? "#2e1065" : "#faf5ff"},stroke:${isDark ? "#a855f7" : "#c4b5fd"},color:${isDark ? "#e9d5ff" : "#6b21a8"}
  style SETUP fill:${isDark ? "#1c1c1e" : "#f8fafc"},stroke:${isDark ? "#374151" : "#e2e8f0"}
  style RUNTIME fill:${isDark ? "#1c1c1e" : "#f8fafc"},stroke:${isDark ? "#374151" : "#e2e8f0"}`} className="[&_svg]:max-w-full [&_svg]:h-auto" />
                  <p className="text-xs text-muted-foreground text-center mt-2 italic">{t('items.charSlotDiagramCaption')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold">{t('items.charSlotStep1Title')}</h3>
                <p className="text-sm text-muted-foreground">{t('items.charSlotStep1Desc')}</p>
                <pre className="text-[12px] font-mono bg-muted border rounded-md p-3 overflow-x-auto whitespace-pre">{`warrior__main_hand    (AllowedCategories: ["weapon"])
warrior__armor        (AllowedCategories: ["armor"])
warrior__accessory    (AllowedCategories: ["decoration"])

mage__main_hand       (AllowedCategories: ["weapon"])
mage__off_hand        (AllowedCategories: ["weapon", "shield"])
mage__robe            (AllowedCategories: ["armor"])`}</pre>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold">{t('items.charSlotStep2Title')}</h3>
                <p className="text-sm text-muted-foreground">{t('items.charSlotStep2Desc')}</p>
                <pre className="text-[12px] font-mono bg-muted border rounded-md p-3 overflow-x-auto whitespace-pre">{`// warrior
{
  "item_code": "warrior",
  "category": "character",
  "metadata": {
    "equipment_slots": ["warrior__main_hand", "warrior__armor", "warrior__accessory"]
  }
}

// mage
{
  "item_code": "mage",
  "category": "character",
  "metadata": {
    "equipment_slots": ["mage__main_hand", "mage__off_hand", "mage__robe"]
  }
}`}</pre>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold">{t('items.charSlotStep3Title')}</h3>
                <p className="text-sm text-muted-foreground">{t('items.charSlotStep3Desc')}</p>
                <pre className="text-[12px] font-mono bg-muted border rounded-md p-3 overflow-x-auto whitespace-pre">{`POST /api/v1/games/{game_id}/inventory/equip

{
  "item_id": "uuid-of-sword-inventory-item",
  "slot_key": "warrior__main_hand",
  "slot_data": {
    "character_item_id": "uuid-of-warrior-inventory-item"
  }
}`}</pre>
                <p className="text-xs text-muted-foreground font-mono">{t('items.charSlotStep3Response')}</p>
                <p className="text-sm text-muted-foreground">{t('items.charSlotStep3ApiNote')}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold">{t('items.charSlotStep4Title')}</h3>
                <p className="text-sm text-muted-foreground">{t('items.charSlotStep4DescCreate')}</p>
                <pre className="text-[12px] font-mono bg-muted border rounded-md p-3 overflow-x-auto whitespace-pre">{`POST /api/v1/games/{game_id}/equipment-slots

{
  "slot_key": "warrior__main_hand",
  "name": "Warrior - Main Hand",
  "allowed_categories": ["weapon"],
  "metadata": {
    "character_definition_id": "uuid-of-warrior-item-definition"
  }
}`}</pre>
                <p className="text-sm text-muted-foreground">{t('items.charSlotStep4DescUpdate')}</p>
                <pre className="text-[12px] font-mono bg-muted border rounded-md p-3 overflow-x-auto whitespace-pre">{`PUT /api/v1/games/{game_id}/equipment-slots/warrior__main_hand

{
  "metadata": {
    "character_definition_id": "uuid-of-warrior-item-definition"
  }
}`}</pre>
                <p className="text-xs text-muted-foreground font-mono">{t('items.charSlotStep4Response')}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold">{t('items.charSlotFlowTitle')}</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground pl-1">
                  <li>{t('items.charSlotFlowStep1')}</li>
                  <li>{t('items.charSlotFlowStep2')}</li>
                  <li>{t('items.charSlotFlowStep3')}</li>
                  <li>{t('items.charSlotFlowStep4')}</li>
                </ol>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold">{t('items.charSlotLimitTitle')}</h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-semibold w-1/2">{t('items.charSlotIssueCol')}</th>
                        <th className="text-left p-3 font-semibold w-1/2">{t('items.charSlotSolutionCol')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-3 align-top text-muted-foreground">{t('items.charSlotLimitIssue1')}</td>
                        <td className="p-3 align-top">{t('items.charSlotLimitSol1')}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3 align-top text-muted-foreground">{t('items.charSlotLimitIssue2')}</td>
                        <td className="p-3 align-top">{t('items.charSlotLimitSol2')}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3 align-top text-muted-foreground">{t('items.charSlotLimitIssue3')}</td>
                        <td className="p-3 align-top">{t('items.charSlotLimitSol3')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <h3 className="text-base font-semibold">{t('items.charSlotSummaryTitle')}</h3>
                <p className="text-sm text-muted-foreground">{t('items.charSlotSummaryDesc')}</p>
                <ul className="list-disc list-inside space-y-1 text-sm pl-1">
                  <li><span className="font-mono font-semibold">SlotKey</span> — {t('items.charSlotSummaryPoint1')}</li>
                  <li><span className="font-mono font-semibold">ItemDefinition.Metadata</span> — {t('items.charSlotSummaryPoint2')}</li>
                  <li><span className="font-mono font-semibold">SlotData</span> — {t('items.charSlotSummaryPoint3')}</li>
                  <li><span className="font-mono font-semibold">EquipmentSlotDefinition.Metadata</span> — {t('items.charSlotSummaryPoint4')}</li>
                </ul>
                <p className="text-sm text-muted-foreground italic">{t('items.charSlotSummaryFooter')}</p>
              </div>
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
