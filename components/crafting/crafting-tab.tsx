"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { toSlugUnderscore } from "@/lib/utils"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Plus, RefreshCw, Hammer, ExternalLink, Dices, Save, X, ChevronRight, ChevronDown, Loader2, Check, ChevronsUpDown, Wand2, ArrowDownRight, ArrowUpRight, Pencil, Trash2, History, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { CopyButton } from "@/components/CopyButton"
import { useToast } from "@/hooks/use-toast"
import { useEscapeLayer } from "@/hooks/use-escape-manager"
import { useTranslation } from "@/lib/i18n/use-translation"
import { safeGetItem, safeRemoveItem } from "@/lib/storage-utils"
import { listItemDefinitions, type TenantCtx } from "@/lib/inventory-api"
import { listCraftingRecipes, createCraftingRecipe, getCraftingRecipe, getCraftingRecipeByKey, updateCraftingRecipe, deleteCraftingRecipe } from "@/lib/crafting-api"
import type { ItemDefinition, ItemCategory } from "@/types/inventory"
import type {
  CraftingRecipe,
  CreateCraftingRecipeRequest,
  UpdateCraftingRecipeRequest,
  CraftingRecipeInput,
  CraftingRecipeOutput,
} from "@/types/crafting"
import {
  lsPendingCraftingRecipeCreate,
  lsPendingCraftingRecipeEdit,
} from "@/components/llm-conversations/conversation-panel-utils"

function ItemSelector({
  value,
  onChange,
  items,
  loading,
  placeholder
}: {
  value: string;
  onChange: (v: string) => void;
  items: ItemDefinition[];
  loading: boolean;
  placeholder?: string;
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const selectedItem = items.find(i => i.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={`w-full justify-between h-8 text-xs font-normal border-dashed ${!value ? "text-muted-foreground" : ""}`}>
          <span className="truncate">{selectedItem ? selectedItem.name : (placeholder ?? t('crafting.selectComponentItem'))}</span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('crafting.searchItems')} className="h-9 text-xs" />
          <CommandList>
            <CommandEmpty>{t('crafting.noItemFound')}</CommandEmpty>
            {loading ? (
              <div className="p-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : (
              <CommandGroup>
                {items.map(it => (
                  <CommandItem
                    key={it.id}
                    value={`${it.name} ${it.id}`}
                    onSelect={() => {
                      onChange(it.id)
                      setOpen(false)
                    }}
                    className="text-xs"
                  >
                    <div className="flex-1 truncate">{it.name} <span className="text-muted-foreground">({it.id.slice(0, 8)})</span></div>
                    <Check className={`h-3 w-3 ml-2 shrink-0 transition-opacity ${value === it.id ? "opacity-100" : "opacity-0"}`} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

type PendingCraftingRecipeCreateContext = {
  turnId: string
  responseIdx: number
  craftingRecipeIdx: number
  convId?: string
}

function resolveCraftingItemRef(rawId: unknown, items: ItemDefinition[]): string {
  const value = typeof rawId === "string" ? rawId.trim() : ""
  if (!value) return ""
  if (!value.startsWith("__REF:")) return value

  const itemCode = value.slice("__REF:".length).trim()
  if (!itemCode) return ""
  const item = items.find((candidate) => candidate.item_code === itemCode)
  return item?.id ?? ""
}

function buildCraftingFormFromDraft(
  draft: Record<string, unknown>,
  items: ItemDefinition[],
): {
  form: CreateCraftingRecipeRequest
  meta: { key: string; value: string }[]
} {
  const inputs = Array.isArray(draft.inputs) ? draft.inputs : []
  const outputs = Array.isArray(draft.outputs) ? draft.outputs : []
  const metadata = draft.metadata && typeof draft.metadata === "object" && !Array.isArray(draft.metadata)
    ? draft.metadata as Record<string, unknown>
    : {}

  return {
    form: {
      recipe_key: typeof draft.recipe_key === "string" ? draft.recipe_key : "",
      name: typeof draft.name === "string" ? draft.name : "",
      description: typeof draft.description === "string" ? draft.description : "",
      category: typeof draft.category === "string" ? draft.category : "other",
      success_rate: typeof draft.success_rate === "number" ? draft.success_rate : Number(draft.success_rate ?? 10000000),
      bonus_rate: typeof draft.bonus_rate === "number" ? draft.bonus_rate : Number(draft.bonus_rate ?? 0),
      available_from: typeof draft.available_from === "string" ? draft.available_from : null,
      available_until: typeof draft.available_until === "string" ? draft.available_until : null,
      is_active: typeof draft.is_active === "boolean" ? draft.is_active : true,
      metadata,
      inputs: inputs.map((input) => {
        const entry = input as Record<string, unknown>
        return {
          item_definition_id: resolveCraftingItemRef(entry.item_definition_id, items),
          quantity: Number(entry.quantity ?? 1),
          is_consumed: typeof entry.is_consumed === "boolean" ? entry.is_consumed : true,
        }
      }),
      outputs: outputs.map((output, index) => {
        const entry = output as Record<string, unknown>
        return {
          item_definition_id: resolveCraftingItemRef(entry.item_definition_id, items),
          quantity_min: Number(entry.quantity_min ?? 1),
          quantity_max: Number(entry.quantity_max ?? entry.quantity_min ?? 1),
          output_type: String(entry.output_type ?? "main"),
          level_increment: entry.level_increment == null ? null : Number(entry.level_increment),
          properties_patch: entry.properties_patch && typeof entry.properties_patch === "object" && !Array.isArray(entry.properties_patch)
            ? entry.properties_patch as Record<string, unknown>
            : null,
          sort_order: Number(entry.sort_order ?? index + 1),
        }
      }),
    },
    meta: Object.entries(metadata).map(([key, value]) => ({ key, value: String(value) })),
  }
}

function buildCraftingFormFromRecipe(
  recipe: CraftingRecipe,
  items: ItemDefinition[],
  draft?: Record<string, unknown> | null,
): {
  form: CreateCraftingRecipeRequest
  meta: { key: string; value: string }[]
} {
  return buildCraftingFormFromDraft(
    {
      ...recipe,
      ...(draft ?? {}),
      recipe_key: recipe.recipe_key,
    },
    items,
  )
}

export function CraftingTab({ gameId, studioId }: { gameId: string; studioId: string }) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [recipeKeyQuery, setRecipeKeyQuery] = useState(() => {
    return searchParams.get("recipeKey") ?? searchParams.get("recipe_key") ?? searchParams.get("key") ?? ""
  })
  const [recipeKeyResult, setRecipeKeyResult] = useState<CraftingRecipe | null>(null)
  const [recipeKeyLoading, setRecipeKeyLoading] = useState(false)
  const [recipeKeyError, setRecipeKeyError] = useState<string | null>(null)
  const lastRecipeKeyRef = useRef<string>("")
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(
    () => searchParams.get("expanded")
  )

  const [detailCache, setDetailCache] = useState<Record<string, CraftingRecipe>>({})
  const [detailLoading, setDetailLoading] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<Record<string, string>>({})

  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>("")
  const [fieldSaving, setFieldSaving] = useState(false)

  const [editingInputs, setEditingInputs] = useState(false)
  const [draftInputs, setDraftInputs] = useState<CraftingRecipeInput[]>([])
  const [editingOutputs, setEditingOutputs] = useState(false)
  const [draftOutputs, setDraftOutputs] = useState<CraftingRecipeOutput[]>([])
  const [ioSaving, setIoSaving] = useState(false)

  const [editingMeta, setEditingMeta] = useState(false)
  const [draftMeta, setDraftMeta] = useState<{ key: string; value: string }[]>([])
  const [metaSaving, setMetaSaving] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState<{ type: "meta" | "input" | "output"; idx: number; label: string } | null>(null)
  const [deleteRecipe, setDeleteRecipe] = useState<CraftingRecipe | null>(null)
  const [deleteRecipeSaving, setDeleteRecipeSaving] = useState(false)

  async function handleDeleteRecipe(recipe: CraftingRecipe) {
    setDeleteRecipeSaving(true)
    try {
      await deleteCraftingRecipe({ gameId }, recipe.id)
      setRecipes(prev => prev.filter(r => r.id !== recipe.id))
      if (expandedRecipe === recipe.id) {
        setExpandedRecipe(null)
        const params = new URLSearchParams(searchParams.toString())
        params.delete("expanded")
        router.replace(`?${params.toString()}`, { scroll: false })
      }
      setDetailCache(prev => { const n = { ...prev }; delete n[recipe.id]; return n })
      toast({ title: t('crafting.recipeDeleted'), description: t('crafting.recipeDeletedDesc').replace('{name}', recipe.name) })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('crafting.failedToCreate')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setDeleteRecipeSaving(false)
      setDeleteRecipe(null)
    }
  }

  function toggleExpand(recipeId: string) {
    const next = expandedRecipe === recipeId ? null : recipeId
    setExpandedRecipe(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next) params.set("expanded", next)
    else params.delete("expanded")
    router.replace(`?${params.toString()}`, { scroll: false })
    if (next && !detailCache[next]) {
      setDetailLoading(next)
      getCraftingRecipe({ gameId }, next)
        .then(res => setDetailCache(prev => ({ ...prev, [next]: res })))
        .catch(err => setDetailError(prev => ({ ...prev, [next]: err.message ?? t('crafting.failedLoadDetails') })))
        .finally(() => setDetailLoading(null))
    }
  }

  // Auto-load detail for recipe expanded via URL on initial render
  useEffect(() => {
    const id = searchParams.get("expanded")
    if (id && !detailCache[id]) {
      setDetailLoading(id)
      getCraftingRecipe({ gameId }, id)
        .then(res => setDetailCache(prev => ({ ...prev, [id]: res })))
        .catch(err => setDetailError(prev => ({ ...prev, [id]: err.message ?? "Failed to load details" })))
        .finally(() => setDetailLoading(null))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [allItems, setAllItems] = useState<ItemDefinition[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [pendingCreateDraft, setPendingCreateDraft] = useState<Record<string, unknown> | null>(null)
  const [pendingCreateContext, setPendingCreateContext] = useState<PendingCraftingRecipeCreateContext | null>(null)
  const [pendingEditDraft, setPendingEditDraft] = useState<Record<string, unknown> | null>(null)
  const [pendingEditContext, setPendingEditContext] = useState<PendingCraftingRecipeCreateContext | null>(null)
  const [editingRecipe, setEditingRecipe] = useState<CraftingRecipe | null>(null)
  const [formSaving, setFormSaving] = useState(false)
  const [autoSlug, setAutoSlug] = useState(true)
  const editFormHydratedRef = useRef(false)

  function handleCreateClose() {
    setCreateOpen(false)
    setPendingCreateDraft(null)
    setPendingCreateContext(null)
  }

  function handleEditClose() {
    setEditOpen(false)
    setEditingRecipe(null)
    setPendingEditDraft(null)
    setPendingEditContext(null)
    editFormHydratedRef.current = false
  }

  function handleSheetClose() {
    handleCreateClose()
    handleEditClose()
  }

  function getDefaultForm(): CreateCraftingRecipeRequest {
    return {
      recipe_key: "",
      name: "",
      description: "",
      category: "weapons",
      success_rate: 10000000, // 100%
      bonus_rate: 0,
      is_active: true,
      metadata: {},
      inputs: [{ item_definition_id: "", quantity: 1, is_consumed: true }],
      outputs: [{ item_definition_id: "", quantity_min: 1, quantity_max: 1, output_type: "main", sort_order: 0 }],
    }
  }

  const [form, setForm] = useState<CreateCraftingRecipeRequest>(getDefaultForm())
  const [formMetaEntries, setFormMetaEntries] = useState<{ key: string; value: string }[]>([])

  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listCraftingRecipes(
        { gameId },
        {
          page,
          page_size: pageSize,
        }
      )
      setRecipes(res.recipes || [])
      setTotal(res.total || 0)
    } catch (err: any) {
      setError(err?.message || t('crafting.failedLoadRecipes'))
    } finally {
      setLoading(false)
    }
  }, [gameId, page, pageSize])

  useEffect(() => {
    fetchRecipes()
  }, [fetchRecipes])

  // Auto-open create sheet from URL params, using any pending draft passed by the LLM panel.
  useEffect(() => {
    if (searchParams.get("create") !== "1") return
    if (searchParams.get("tab") !== "crafting") return

    const pendingRaw = safeGetItem(lsPendingCraftingRecipeCreate(gameId))
    if (!pendingRaw) {
      handleCreateOpen()
      return
    }

    try {
      const pending = JSON.parse(pendingRaw) as {
        recipe?: Record<string, unknown>
        turnId?: string
        responseIdx?: number
        craftingRecipeIdx?: number
        convId?: string
      }
      if (pending.recipe && typeof pending.recipe === "object") {
        setPendingCreateDraft(pending.recipe)
        setPendingCreateContext(
          pending.turnId && pending.responseIdx != null && pending.craftingRecipeIdx != null
            ? {
                turnId: pending.turnId,
                responseIdx: Number(pending.responseIdx),
                craftingRecipeIdx: Number(pending.craftingRecipeIdx),
                convId: pending.convId,
              }
            : null
        )
      }
    } catch {
      // ignore malformed payloads and fall back to an empty sheet
    } finally {
      safeRemoveItem(lsPendingCraftingRecipeCreate(gameId))
      setForm(getDefaultForm())
      setFormMetaEntries([])
      setAutoSlug(false)
      setCreateOpen(true)
      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.delete("create")
      nextParams.delete("editFromLLM")
      const nextQuery = nextParams.toString()
      router.replace(nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname, { scroll: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, searchParams, router])

  // Auto-open edit sheet from URL params when the LLM wants to update an existing recipe.
  useEffect(() => {
    if (searchParams.get("editFromLLM") !== "1") return
    if (searchParams.get("tab") !== "crafting") return

    const pendingRaw = safeGetItem(lsPendingCraftingRecipeEdit(gameId))
    if (!pendingRaw) return

    let shouldOpenEdit = false
    try {
      const pending = JSON.parse(pendingRaw) as {
        existingRecipe?: CraftingRecipe
        recipe?: Record<string, unknown>
        turnId?: string
        responseIdx?: number
        craftingRecipeIdx?: number
        convId?: string
      }
      if (pending.existingRecipe && typeof pending.existingRecipe === "object") {
        setEditingRecipe(pending.existingRecipe)
        setPendingEditDraft(pending.recipe ?? null)
        setPendingEditContext(
          pending.turnId && pending.responseIdx != null && pending.craftingRecipeIdx != null
            ? {
                turnId: pending.turnId,
                responseIdx: Number(pending.responseIdx),
                craftingRecipeIdx: Number(pending.craftingRecipeIdx),
                convId: pending.convId,
              }
            : null
        )
        shouldOpenEdit = true
      }
    } catch {
      // Ignore malformed payloads and let the manual edit flow handle it.
    } finally {
      safeRemoveItem(lsPendingCraftingRecipeEdit(gameId))
      if (shouldOpenEdit) {
        setForm(getDefaultForm())
        setFormMetaEntries([])
        setAutoSlug(false)
        setEditOpen(true)
        const nextParams = new URLSearchParams(searchParams.toString())
        nextParams.delete("editFromLLM")
        nextParams.delete("create")
        const nextQuery = nextParams.toString()
        router.replace(nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname, { scroll: false })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, searchParams, router])

  useEffect(() => {
    if (!createOpen || !pendingCreateDraft || allItems.length === 0) return
    const { form, meta } = buildCraftingFormFromDraft(pendingCreateDraft, allItems)
    setForm(form)
    setFormMetaEntries(meta)
    setAutoSlug(false)
    setPendingCreateDraft(null)
  }, [createOpen, pendingCreateDraft, allItems])

  useEffect(() => {
    if (!editOpen || !editingRecipe || allItems.length === 0 || editFormHydratedRef.current) return
    const { form, meta } = buildCraftingFormFromRecipe(editingRecipe, allItems, pendingEditDraft)
    setForm(form)
    setFormMetaEntries(meta)
    setAutoSlug(false)
    editFormHydratedRef.current = true
    setPendingEditDraft(null)
  }, [editOpen, editingRecipe, pendingEditDraft, allItems])

  // Reset inline edit state when switching expanded recipe
  useEffect(() => {
    setEditingField(null)
    setEditValue("")
    setEditingInputs(false)
    setEditingOutputs(false)
    setEditingMeta(false)
  }, [expandedRecipe])

  // Load all items when creating for the first time or expanding
  useEffect(() => {
    if ((createOpen || editOpen || expandedRecipe) && allItems.length === 0 && !itemsLoading) {
      setItemsLoading(true)
      listItemDefinitions({ gameId, studioId }, { limit: 1000 })
        .then((res) => setAllItems(res.items ?? []))
        .catch((err) => console.error("Failed to fetch items:", err))
        .finally(() => setItemsLoading(false))
    }
  }, [createOpen, editOpen, expandedRecipe, allItems.length, itemsLoading, gameId, studioId])

  useEffect(() => {
    const key = searchParams.get("recipeKey") ?? searchParams.get("recipe_key") ?? searchParams.get("key") ?? ""
    setRecipeKeyQuery(key)
    if (key === lastRecipeKeyRef.current) return

    if (!key.trim()) {
      lastRecipeKeyRef.current = ""
      setRecipeKeyResult(null)
      setRecipeKeyError(null)
      return
    }

    void searchCraftingRecipeByKey(key, { updateUrl: false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, gameId])

  function handleCreateOpen() {
    setPendingCreateDraft(null)
    setPendingCreateContext(null)
    handleEditClose()
    setForm(getDefaultForm())
    setFormMetaEntries([])
    setAutoSlug(true)
    setCreateOpen(true)
  }

  useEscapeLayer(createOpen || editOpen, handleSheetClose)

  async function searchCraftingRecipeByKey(rawKey: string, options?: { updateUrl?: boolean }) {
    const key = rawKey.trim()
    if (!key) {
      setRecipeKeyQuery("")
      setRecipeKeyResult(null)
      setRecipeKeyError(null)
      setExpandedRecipe(null)
      lastRecipeKeyRef.current = ""
      if (options?.updateUrl !== false) {
        const params = new URLSearchParams(searchParams.toString())
        params.delete("recipeKey")
        params.delete("recipe_key")
        params.delete("key")
        params.delete("expanded")
        const query = params.toString()
        router.replace(query ? `?${query}` : window.location.pathname, { scroll: false })
      }
      await fetchRecipes()
      return
    }

    setRecipeKeyLoading(true)
    setRecipeKeyError(null)
    setRecipeKeyQuery(key)
    lastRecipeKeyRef.current = key
    try {
      const recipe = await getCraftingRecipeByKey({ gameId }, key, { suppressToast: true })
      setRecipeKeyResult(recipe)
      setDetailCache(prev => ({ ...prev, [recipe.id]: recipe }))
      setDetailError(prev => {
        if (!prev[recipe.id]) return prev
        const next = { ...prev }
        delete next[recipe.id]
        return next
      })
      setExpandedRecipe(recipe.id)
      if (options?.updateUrl !== false) {
        const params = new URLSearchParams(searchParams.toString())
        params.set("recipeKey", key)
        params.delete("recipe_key")
        params.delete("key")
        params.set("expanded", recipe.id)
        const query = params.toString()
        router.replace(query ? `?${query}` : window.location.pathname, { scroll: false })
      }
    } catch (err: any) {
      setRecipeKeyResult(null)
      setExpandedRecipe(null)
      if (err?.status !== 404) {
        setRecipeKeyError(err?.message || t('crafting.failedLoadDetails'))
      } else {
        setRecipeKeyError(null)
      }
    } finally {
      setRecipeKeyLoading(false)
    }
  }

  async function handleRecipeKeySearch() {
    await searchCraftingRecipeByKey(recipeKeyQuery)
  }

  async function handleClearRecipeKeySearch() {
    await searchCraftingRecipeByKey("")
  }

  async function handleRefreshRecipes() {
    if (recipeKeyQuery.trim()) {
      await searchCraftingRecipeByKey(recipeKeyQuery, { updateUrl: false })
      return
    }
    await fetchRecipes()
  }

  async function handleFieldSave(recipeId: string) {
    if (!editingField) return
    setFieldSaving(true)
    try {
      const payload: UpdateCraftingRecipeRequest = {}
      if (editingField === "success_rate" || editingField === "bonus_rate") {
        ;(payload as any)[editingField] = Number(editValue)
      } else if (editingField === "is_active") {
        payload.is_active = editValue === "true"
      } else {
        ;(payload as any)[editingField] = editValue
      }
      const updated = await updateCraftingRecipe({ gameId }, recipeId, payload)
      setDetailCache(prev => ({ ...prev, [recipeId]: updated }))
      setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, ...updated } : r))
      setEditingField(null)
      toast({ title: t('common.success'), description: t('crafting.recipeUpdated') })
    } catch (err: any) {
      toast({ variant: "destructive", title: t('crafting.updateFailed'), description: err?.message || t('common.unknown') })
    } finally {
      setFieldSaving(false)
    }
  }

  async function handleSaveMeta(recipeId: string) {
    setMetaSaving(true)
    try {
      const metadata: Record<string, unknown> = {}
      draftMeta.forEach(({ key, value }) => { if (key.trim()) metadata[key.trim()] = value })
      const updated = await updateCraftingRecipe({ gameId }, recipeId, { metadata })
      setDetailCache(prev => ({ ...prev, [recipeId]: updated }))
      setEditingMeta(false)
      toast({ title: t('common.success'), description: t('crafting.metadataSaved') })
    } catch (err: any) {
      toast({ variant: "destructive", title: t('crafting.updateFailed'), description: err?.message || t('common.unknown') })
    } finally {
      setMetaSaving(false)
    }
  }

  async function handleSaveInputs(recipeId: string) {
    setIoSaving(true)
    try {
      const validInputs = draftInputs.filter(i => !!i.item_definition_id)
      const updated = await updateCraftingRecipe({ gameId }, recipeId, {
        inputs: validInputs.map(i => ({
          item_definition_id: i.item_definition_id,
          quantity: Number(i.quantity),
          is_consumed: i.is_consumed,
        })),
      })
      setDetailCache(prev => ({ ...prev, [recipeId]: updated }))
      setEditingInputs(false)
      toast({ title: t('common.success'), description: t('crafting.inputsSaved') })
    } catch (err: any) {
      toast({ variant: "destructive", title: t('crafting.updateFailed'), description: err?.message || t('common.unknown') })
    } finally {
      setIoSaving(false)
    }
  }

  async function handleSaveOutputs(recipeId: string) {
    setIoSaving(true)
    try {
      const validOutputs = draftOutputs.filter(o => !!o.item_definition_id)
      const updated = await updateCraftingRecipe({ gameId }, recipeId, {
        outputs: validOutputs.map((o, idx) => ({
          item_definition_id: o.item_definition_id,
          quantity_min: Number(o.quantity_min),
          quantity_max: Number(o.quantity_max),
          output_type: o.output_type,
          sort_order: idx,
        })),
      })
      setDetailCache(prev => ({ ...prev, [recipeId]: updated }))
      setEditingOutputs(false)
      toast({ title: t('common.success'), description: t('crafting.outputsSaved') })
    } catch (err: any) {
      toast({ variant: "destructive", title: t('crafting.updateFailed'), description: err?.message || t('common.unknown') })
    } finally {
      setIoSaving(false)
    }
  }

  async function handleSaveRecipe() {
    const failureTitle = editOpen ? t('crafting.updateFailed') : t('crafting.failedToCreate')
    if (!form.name.trim() || !form.recipe_key.trim()) {
      toast({ variant: "destructive", title: t('common.error'), description: t('crafting.nameAndKeyRequired') })
      return
    }

    // Validate inputs
    const validInputs = form.inputs.filter(i => !!i.item_definition_id)
    if (validInputs.length === 0) {
      toast({ variant: "destructive", title: t('common.error'), description: t('crafting.inputRequired') })
      return
    }

    // Validate outputs
    const validOutputs = form.outputs.filter(o => !!o.item_definition_id)
    if (validOutputs.length === 0) {
      toast({ variant: "destructive", title: t('common.error'), description: t('crafting.outputRequired') })
      return
    }

    setFormSaving(true)
    try {
      const metadata: Record<string, unknown> = {}
      formMetaEntries.forEach(({ key, value }) => {
        if (key.trim()) metadata[key.trim()] = value
      })

      const basePayload = {
        ...form,
        inputs: validInputs.map(i => ({ ...i, quantity: Number(i.quantity) })),
        outputs: validOutputs.map(o => ({
          ...o,
          quantity_min: Number(o.quantity_min),
          quantity_max: Number(o.quantity_max),
          sort_order: Number(o.sort_order),
        })),
        success_rate: Number(form.success_rate),
        bonus_rate: Number(form.bonus_rate),
        metadata,
      }

      if (editOpen && editingRecipe) {
        const payload: UpdateCraftingRecipeRequest = {
          name: basePayload.name,
          description: basePayload.description,
          category: basePayload.category,
          success_rate: basePayload.success_rate,
          bonus_rate: basePayload.bonus_rate,
          is_active: basePayload.is_active,
          metadata: basePayload.metadata,
          inputs: basePayload.inputs,
          outputs: basePayload.outputs,
        }

        const updated = await updateCraftingRecipe({ gameId }, editingRecipe.id, payload)
        setRecipes(prev => prev.map(r => r.id === updated.id ? updated : r))
        setDetailCache(prev => ({ ...prev, [updated.id]: updated }))
        setRecipeKeyResult(prev => prev?.id === updated.id ? updated : prev)
        if (expandedRecipe === updated.id) {
          setExpandedRecipe(updated.id)
        }
        toast({ title: t('common.success'), description: t('crafting.recipeUpdated') })
        handleEditClose()
        if (pendingEditContext) {
          window.dispatchEvent(new CustomEvent('ss:crafting-recipe-created', {
            detail: {
              id: updated.id,
              name: updated.name,
              turnId: pendingEditContext.turnId,
              responseIdx: pendingEditContext.responseIdx,
              craftingRecipeIdx: pendingEditContext.craftingRecipeIdx,
              convId: pendingEditContext.convId,
              gameId,
            },
          }))
          setPendingEditContext(null)
        }
      } else {
        const payload: CreateCraftingRecipeRequest = basePayload
        const created = await createCraftingRecipe({ gameId }, payload)
        toast({ title: t('common.success'), description: t('crafting.recipeCreated') })
        handleCreateClose()
        if (pendingCreateContext) {
          window.dispatchEvent(new CustomEvent('ss:crafting-recipe-created', {
            detail: {
              id: created.id,
              name: created.name,
              turnId: pendingCreateContext.turnId,
              responseIdx: pendingCreateContext.responseIdx,
              craftingRecipeIdx: pendingCreateContext.craftingRecipeIdx,
              convId: pendingCreateContext.convId,
              gameId,
            },
          }))
          setPendingCreateContext(null)
        }
      }
      fetchRecipes()
    } catch (err: any) {
      toast({ variant: "destructive", title: failureTitle, description: err?.message || t('common.unknown') })
    } finally {
      setFormSaving(false)
    }
  }

  // Helpers for formatting rates
  function formatRate(rateNum: number) {
    if (rateNum === 10000000) return "100%"
    return Number((rateNum / 100000).toFixed(5)).toString() + "%"
  }

  function getItemName(id: string) {
    const item = allItems.find(i => i.id === id)
    return item ? item.name : id.slice(0, 8) + '...'
  }

  const isRecipeKeySearchActive = recipeKeyQuery.trim() !== "" && lastRecipeKeyRef.current === recipeKeyQuery.trim()
  const visibleRecipes = isRecipeKeySearchActive
    ? (recipeKeyResult ? [recipeKeyResult] : [])
    : recipes
  const totalPages = Math.ceil(total / pageSize)
  const isRecipeSheetOpen = createOpen || editOpen
  const recipeSheetSide = "right"
  const recipeSheetTitle = editOpen ? t('crafting.editRecipeTitle') : t('crafting.newRecipeTitle')
  const recipeSheetDescription = editOpen ? t('crafting.editRecipeDesc') : t('crafting.newRecipeDesc')
  const recipeSheetSubmitLabel = editOpen ? t('crafting.updateRecipe') : t('crafting.createRecipe')

  return (
    <div className="space-y-4">
      {/* TOOLBAR */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{t('crafting.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {isRecipeKeySearchActive
              ? recipeKeyResult
                ? t('crafting.keySearchFound').replace('{key}', recipeKeyQuery.trim())
                : t('crafting.keySearchNotFound').replace('{key}', recipeKeyQuery.trim())
              : total > 0
              ? `${total} ${total !== 1 ? t('crafting.recipesConfigured') : t('crafting.recipeConfigured')}`
              : t('crafting.noRecipesYet')}
          </p>
        </div>
        <div className="flex flex-wrap items-end justify-end gap-2">
          <div className="flex items-center gap-1.5">
            <div className="relative w-[220px] sm:w-[260px]">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={recipeKeyQuery}
                onChange={(e) => {
                  const next = e.target.value
                  setRecipeKeyQuery(next)
                  if (next.trim() !== lastRecipeKeyRef.current) {
                    setRecipeKeyError(null)
                    setRecipeKeyResult(null)
                    setExpandedRecipe(null)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void handleRecipeKeySearch()
                  }
                }}
                placeholder={t('crafting.searchByKey')}
                className="h-8 pl-7 pr-7 text-xs"
              />
              {recipeKeyQuery.trim() && (
                <button
                  type="button"
                  onClick={() => void handleClearRecipeKeySearch()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('crafting.clearButton')}
                  title={t('crafting.clearButton')}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <Button variant="secondary" size="sm" className="h-8 px-3 text-xs" onClick={() => void handleRecipeKeySearch()} disabled={recipeKeyLoading}>
              {recipeKeyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('crafting.searchButton')}
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={() => void handleRefreshRecipes()} title={t('common.refresh')}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleCreateOpen} disabled={!studioId}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t('crafting.newRecipe')}
          </Button>
        </div>
      </div>

      {/* RECIPE LIST */}
      {recipeKeyLoading ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin" />
            <p className="text-sm">{t('crafting.searchingRecipe')}</p>
          </CardContent>
        </Card>
      ) : recipeKeyError ? (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-destructive text-sm">{recipeKeyError}</CardContent>
        </Card>
      ) : loading && !isRecipeKeySearchActive ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-destructive text-sm">{error}</CardContent>
        </Card>
      ) : visibleRecipes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <Hammer className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {isRecipeKeySearchActive
                ? t('crafting.keySearchNoMatch').replace('{key}', recipeKeyQuery.trim())
                : t('crafting.noRecipesFound')}
            </p>
            {!isRecipeKeySearchActive && (
              <Button onClick={handleCreateOpen}><Plus className="h-4 w-4 mr-2" />{t('crafting.createFirstRecipe')}</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleRecipes.map((recipe) => {
            const isExpanded = expandedRecipe === recipe.id
            const detail = detailCache[recipe.id]
            return (
              <Card key={recipe.id} className={`transition-all ${!recipe.is_active ? "opacity-70" : ""}`}>
                {/* Header Row */}
                <div
                  className="cursor-pointer select-none border-b border-transparent"
                  onClick={() => toggleExpand(recipe.id)}
                >
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}

                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base truncate">{recipe.name}</CardTitle>
                          <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md border shrink-0">
                            <span className="truncate max-w-[160px]" title={recipe.recipe_key}>{recipe.recipe_key}</span>
                            <CopyButton text={recipe.recipe_key} size="h-3 w-3" />
                          </div>
                          <Badge variant={recipe.is_active ? "default" : "secondary"} className="text-xs shrink-0 font-normal">
                            {recipe.is_active ? t('common.active') : t('common.inactive')}
                          </Badge>
                          <Badge variant="outline" className="text-xs shrink-0 capitalize text-muted-foreground">
                            {recipe.category}
                          </Badge>
                        </div>
                      </div>

                      <div className="w-24 shrink-0 text-sm text-center">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {formatRate(recipe.success_rate)}
                        </span>
                        <p className="text-[10px] text-muted-foreground uppercase">{t('crafting.successLabel')}</p>
                      </div>

                      <div className="w-24 shrink-0 text-sm text-center">
                        <span className="font-medium text-amber-500">
                          {formatRate(recipe.bonus_rate)}
                        </span>
                        <p className="text-[10px] text-muted-foreground uppercase">{t('crafting.bonusLabel')}</p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
                        title={t('crafting.viewCraftHistory')}
                        onClick={e => { e.stopPropagation(); router.push(`/games/${gameId}/crafting/recipes/${recipe.id}/history`) }}
                      >
                        <History className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={e => { e.stopPropagation(); setDeleteRecipe(recipe) }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <>
                    <Separator />
                    <CardContent className="group/detail p-4 bg-muted/10">
                      {detailLoading === recipe.id ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">{t('crafting.loadingDetails')}</span>
                        </div>
                      ) : detailError[recipe.id] ? (
                        <div className="text-center font-medium text-sm text-destructive py-8">
                          {detailError[recipe.id]}
                        </div>
                      ) : detail ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('crafting.recipeDetails')}</p>
                              <div className="text-sm bg-background border rounded-md p-3 space-y-2">
                                <div className="grid grid-cols-[110px_1fr] gap-x-2 gap-y-2 items-center">
                                  {/* ID */}
                                  <span className="text-muted-foreground text-xs">ID:</span>
                                  <span className="font-mono text-xs">{detail.id} <CopyButton text={detail.id} /></span>

                                  {/* Name */}
                                  <span className="text-muted-foreground text-xs self-center">{t('crafting.fieldName')}</span>
                                  <div className="group flex items-center gap-1 min-w-0">
                                    {editingField === "name" ? (
                                      <>
                                        <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="h-7 text-xs py-0" disabled={fieldSaving} autoFocus onKeyDown={e => { if (e.key === "Enter") handleFieldSave(detail.id); if (e.key === "Escape") setEditingField(null) }} />
                                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleFieldSave(detail.id)} disabled={fieldSaving}>{fieldSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingField(null)} disabled={fieldSaving}><X className="h-3 w-3" /></Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="font-medium text-xs truncate">{detail.name}</span>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover/detail:opacity-100 transition-opacity shrink-0" onClick={() => { setEditValue(detail.name); setEditingField("name") }}><Pencil className="h-3 w-3" /></Button>
                                      </>
                                    )}
                                  </div>

                                  {/* Category */}
                                  <span className="text-muted-foreground text-xs self-center">{t('crafting.fieldCategory')}</span>
                                  <div className="group flex items-center gap-1 min-w-0">
                                    {editingField === "category" ? (
                                      <>
                                        <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="h-7 text-xs py-0 w-28" disabled={fieldSaving} autoFocus onKeyDown={e => { if (e.key === "Enter") handleFieldSave(detail.id); if (e.key === "Escape") setEditingField(null) }} />
                                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleFieldSave(detail.id)} disabled={fieldSaving}>{fieldSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingField(null)} disabled={fieldSaving}><X className="h-3 w-3" /></Button>
                                      </>
                                    ) : (
                                      <>
                                        <Badge variant="outline" className="text-xs capitalize font-normal">{detail.category}</Badge>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover/detail:opacity-100 transition-opacity shrink-0" onClick={() => { setEditValue(detail.category); setEditingField("category") }}><Pencil className="h-3 w-3" /></Button>
                                      </>
                                    )}
                                  </div>

                                  {/* Active */}
                                  <span className="text-muted-foreground text-xs self-center">{t('crafting.fieldActive')}</span>
                                  <div className="group flex items-center gap-1">
                                    {editingField === "is_active" ? (
                                      <>
                                        <Switch checked={editValue === "true"} onCheckedChange={c => setEditValue(String(c))} disabled={fieldSaving} />
                                        <span className="text-xs">{editValue === "true" ? t('common.active') : t('common.inactive')}</span>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleFieldSave(detail.id)} disabled={fieldSaving}>{fieldSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingField(null)} disabled={fieldSaving}><X className="h-3 w-3" /></Button>
                                      </>
                                    ) : (
                                      <>
                                        <Badge variant={detail.is_active ? "default" : "secondary"} className="text-xs font-normal">{detail.is_active ? t('common.active') : t('common.inactive')}</Badge>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover/detail:opacity-100 transition-opacity shrink-0" onClick={() => { setEditValue(String(detail.is_active)); setEditingField("is_active") }}><Pencil className="h-3 w-3" /></Button>
                                      </>
                                    )}
                                  </div>

                                  {/* Success Rate */}
                                  <span className="text-muted-foreground text-xs self-center">{t('crafting.fieldSuccessRate')}</span>
                                  <div className="group flex items-center gap-1 min-w-0">
                                    {editingField === "success_rate" ? (
                                      <>
                                        <Input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="h-7 text-xs py-0 w-28 font-mono" disabled={fieldSaving} autoFocus onKeyDown={e => { if (e.key === "Enter") handleFieldSave(detail.id); if (e.key === "Escape") setEditingField(null) }} />
                                        <span className="text-xs text-emerald-600 dark:text-emerald-400 shrink-0">= {formatRate(Number(editValue))}</span>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleFieldSave(detail.id)} disabled={fieldSaving}>{fieldSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingField(null)} disabled={fieldSaving}><X className="h-3 w-3" /></Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-emerald-600 dark:text-emerald-400 text-xs">{formatRate(detail.success_rate)}</span>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover/detail:opacity-100 transition-opacity shrink-0" onClick={() => { setEditValue(String(detail.success_rate)); setEditingField("success_rate") }}><Pencil className="h-3 w-3" /></Button>
                                      </>
                                    )}
                                  </div>

                                  {/* Bonus Rate */}
                                  <span className="text-muted-foreground text-xs self-center">{t('crafting.fieldBonusRate')}</span>
                                  <div className="group flex items-center gap-1 min-w-0">
                                    {editingField === "bonus_rate" ? (
                                      <>
                                        <Input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="h-7 text-xs py-0 w-28 font-mono" disabled={fieldSaving} autoFocus onKeyDown={e => { if (e.key === "Enter") handleFieldSave(detail.id); if (e.key === "Escape") setEditingField(null) }} />
                                        <span className="text-xs text-amber-500 shrink-0">= {formatRate(Number(editValue))}</span>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleFieldSave(detail.id)} disabled={fieldSaving}>{fieldSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingField(null)} disabled={fieldSaving}><X className="h-3 w-3" /></Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-amber-500 text-xs">{formatRate(detail.bonus_rate)}</span>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover/detail:opacity-100 transition-opacity shrink-0" onClick={() => { setEditValue(String(detail.bonus_rate)); setEditingField("bonus_rate") }}><Pencil className="h-3 w-3" /></Button>
                                      </>
                                    )}
                                  </div>

                                  {/* Description */}
                                  <span className="text-muted-foreground text-xs self-center">{t('crafting.fieldDescription')}</span>
                                  <div className="group flex items-center gap-1 min-w-0">
                                    {editingField === "description" ? (
                                      <>
                                        <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="h-7 text-xs py-0" disabled={fieldSaving} autoFocus placeholder={t('crafting.addDescriptionPlaceholder')} onKeyDown={e => { if (e.key === "Enter") handleFieldSave(detail.id); if (e.key === "Escape") setEditingField(null) }} />
                                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleFieldSave(detail.id)} disabled={fieldSaving}>{fieldSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingField(null)} disabled={fieldSaving}><X className="h-3 w-3" /></Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-muted-foreground italic text-xs truncate">{detail.description || <span className="opacity-40">{t('crafting.noDescription')}</span>}</span>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover/detail:opacity-100 transition-opacity shrink-0" onClick={() => { setEditValue(detail.description || ""); setEditingField("description") }}><Pencil className="h-3 w-3" /></Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex-1">{t('crafting.metadataSection')}</p>
                                {editingMeta ? (
                                  <>
                                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditingMeta(false)} disabled={metaSaving}><X className="h-3 w-3 mr-1" />{t('common.cancel')}</Button>
                                    <Button size="sm" className="h-6 px-2 text-xs" onClick={() => handleSaveMeta(detail.id)} disabled={metaSaving}>
                                      {metaSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}{t('common.save')}
                                    </Button>
                                  </>
                                ) : (
                                  <Button size="icon" variant="ghost" className="h-6 w-6" title={t('crafting.editMetadata')} onClick={() => {
                                    setDraftMeta(Object.entries(detail.metadata ?? {}).map(([key, value]) => ({ key, value: String(value) })))
                                    setEditingMeta(true)
                                  }}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              {editingMeta ? (
                                <div className="space-y-2 border rounded-md p-2 bg-background">
                                  {draftMeta.map((entry, idx) => (
                                    <div key={idx} className="flex gap-2">
                                      <Input className="h-8 text-xs flex-1" placeholder="key" value={entry.key} onChange={e => {
                                        const n = [...draftMeta]; n[idx] = { ...n[idx], key: e.target.value }; setDraftMeta(n)
                                      }} />
                                      <Input className="h-8 text-xs flex-1" placeholder="value" value={entry.value} onChange={e => {
                                        const n = [...draftMeta]; n[idx] = { ...n[idx], value: e.target.value }; setDraftMeta(n)
                                      }} />
                                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => {
                                        const label = entry.key.trim() || `entry #${idx + 1}`
                                        setConfirmDelete({ type: "meta", idx, label })
                                      }}><X className="h-4 w-4" /></Button>
                                    </div>
                                  ))}
                                  {draftMeta.length === 0 && <p className="text-xs text-muted-foreground italic px-1">{t('crafting.noMetadataEntries')}</p>}
                                  <Button variant="outline" size="sm" className="w-full h-7 text-xs mt-1" onClick={() => setDraftMeta([...draftMeta, { key: "", value: "" }])}>
                                    <Plus className="h-3 w-3 mr-1" /> {t('crafting.addEntry')}
                                  </Button>
                                </div>
                              ) : detail.metadata && Object.keys(detail.metadata).length > 0 ? (
                                <div className="border rounded-md overflow-hidden bg-background">
                                  {Object.entries(detail.metadata).map(([k, v]) => (
                                    <div key={k} className="grid grid-cols-[1fr_2fr] gap-2 px-3 py-1.5 text-xs border-b last:border-b-0 hover:bg-muted/30">
                                      <span className="font-mono text-muted-foreground truncate">{k}</span>
                                      <span className="font-mono truncate">{String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">{t('crafting.noMetadata')}</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <ArrowDownRight className="h-4 w-4 text-rose-500" />
                                <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide flex-1">{t('crafting.inputMaterials')}</p>
                                {editingInputs ? (
                                  <>
                                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditingInputs(false)} disabled={ioSaving}><X className="h-3 w-3 mr-1" />{t('common.cancel')}</Button>
                                    <Button size="sm" className="h-6 px-2 text-xs" onClick={() => handleSaveInputs(detail.id)} disabled={ioSaving}>
                                      {ioSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}{t('common.save')}
                                    </Button>
                                  </>
                                ) : (
                                  <Button size="icon" variant="ghost" className="h-6 w-6" title={t('crafting.editInputs')} onClick={() => { setDraftInputs(detail.inputs ?? []); setEditingInputs(true) }}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              {editingInputs ? (
                                <div className="space-y-2 border border-rose-500/20 rounded-md p-2 bg-background">
                                  {draftInputs.map((inp, idx) => (
                                    <div key={idx} className="flex gap-2 items-center bg-muted/30 p-1.5 rounded-md">
                                      <div className="flex items-center gap-1 shrink-0" title={t('crafting.isConsumed')}>
                                        <Switch className="scale-75 data-[state=checked]:bg-destructive" checked={inp.is_consumed} onCheckedChange={c => {
                                          const n = [...draftInputs]; n[idx] = { ...n[idx], is_consumed: c }; setDraftInputs(n)
                                        }} />
                                        <span className="text-[10px] text-muted-foreground w-7">{inp.is_consumed ? t('crafting.burn') : t('crafting.keep')}</span>
                                      </div>
                                      <div className="flex-1">
                                        <ItemSelector value={inp.item_definition_id} onChange={v => {
                                          const n = [...draftInputs]; n[idx] = { ...n[idx], item_definition_id: v }; setDraftInputs(n)
                                        }} items={allItems} loading={itemsLoading} />
                                      </div>
                                      <Input type="number" min={1} value={inp.quantity} className="w-14 h-8 text-xs text-center px-1" title={t('crafting.quantity')} onChange={e => {
                                        const n = [...draftInputs]; n[idx] = { ...n[idx], quantity: Number(e.target.value) }; setDraftInputs(n)
                                      }} />
                                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => {
                                        const item = allItems.find(i => i.id === inp.item_definition_id)
                                        const label = item ? item.name : inp.item_definition_id ? inp.item_definition_id.slice(0, 8) : `input #${idx + 1}`
                                        setConfirmDelete({ type: "input", idx, label })
                                      }}><X className="h-4 w-4" /></Button>
                                    </div>
                                  ))}
                                  {draftInputs.length === 0 && <p className="text-xs text-muted-foreground italic px-1 py-1">{t('crafting.noInputMaterials')}</p>}
                                  <Button variant="outline" size="sm" className="w-full h-7 text-xs mt-1" onClick={() => setDraftInputs([...draftInputs, { item_definition_id: "", quantity: 1, is_consumed: true }])}>
                                    <Plus className="h-3 w-3 mr-1" /> {t('crafting.addInput')}
                                  </Button>
                                </div>
                              ) : (
                              <div className="border border-rose-500/20 rounded-md overflow-hidden bg-background">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                                      <TableHead className="h-8 text-xs text-center w-24">{t('crafting.consumed')}</TableHead>
                                      <TableHead className="h-8 text-xs">{t('items.name')}</TableHead>
                                      <TableHead className="h-8 text-xs text-right w-16">{t('crafting.qty')}</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {detail.inputs?.map((input, idx) => {
                                      const def = allItems.find(i => i.id === input.item_definition_id)
                                      return (
                                        <TableRow key={idx}>
                                          <TableCell className="text-center py-1.5">
                                            <Badge variant={input.is_consumed ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0 font-normal">
                                              {input.is_consumed ? t('common.yes') : t('common.no')}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="py-1.5">
                                            <div className="flex items-center gap-1.5">
                                              <Link href={`/games/${gameId}/items/${input.item_definition_id}`} className="font-mono text-xs text-primary hover:underline flex items-center gap-1 truncate max-w-[200px]" title={def?.name || input.item_definition_id}>
                                                {def?.name || input.item_definition_id}
                                                <ExternalLink className="h-3 w-3 shrink-0" />
                                              </Link>
                                              <CopyButton text={input.item_definition_id} size="h-3 w-3" />
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-right py-1.5">{input.quantity}</TableCell>
                                        </TableRow>
                                      )
                                    })}
                                    {(!detail.inputs || detail.inputs.length === 0) && (
                                      <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground text-xs py-3 italic">{t('common.none')}</TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide flex-1">{t('crafting.outputResults')}</p>
                                {editingOutputs ? (
                                  <>
                                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditingOutputs(false)} disabled={ioSaving}><X className="h-3 w-3 mr-1" />{t('common.cancel')}</Button>
                                    <Button size="sm" className="h-6 px-2 text-xs" onClick={() => handleSaveOutputs(detail.id)} disabled={ioSaving}>
                                      {ioSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}{t('common.save')}
                                    </Button>
                                  </>
                                ) : (
                                  <Button size="icon" variant="ghost" className="h-6 w-6" title={t('crafting.editOutputs')} onClick={() => { setDraftOutputs(detail.outputs ?? []); setEditingOutputs(true) }}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              {editingOutputs ? (
                                <div className="space-y-2 border border-emerald-500/20 rounded-md p-2 bg-background">
                                  {draftOutputs.map((out, idx) => (
                                    <div key={idx} className="flex gap-2 items-center bg-muted/30 p-1.5 rounded-md flex-wrap">
                                      <Select value={out.output_type} onValueChange={v => {
                                        const n = [...draftOutputs]; n[idx] = { ...n[idx], output_type: v }; setDraftOutputs(n)
                                      }}>
                                        <SelectTrigger className="h-8 w-24 text-xs shrink-0"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="main">{t('crafting.mainResult')}</SelectItem>
                                          <SelectItem value="bonus">{t('crafting.bonusResult')}</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <div className="flex-1 min-w-[120px]">
                                        <ItemSelector value={out.item_definition_id} onChange={v => {
                                          const n = [...draftOutputs]; n[idx] = { ...n[idx], item_definition_id: v }; setDraftOutputs(n)
                                        }} items={allItems} loading={itemsLoading} placeholder={t('crafting.selectOutputItem')} />
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <Input type="number" min={1} value={out.quantity_min} className="w-14 h-8 text-xs text-center px-1" title={t('crafting.minQty')} onChange={e => {
                                          const n = [...draftOutputs]; n[idx] = { ...n[idx], quantity_min: Number(e.target.value) }; setDraftOutputs(n)
                                        }} />
                                        <span className="text-muted-foreground text-[10px]">-</span>
                                        <Input type="number" min={1} value={out.quantity_max} className="w-14 h-8 text-xs text-center px-1" title={t('crafting.maxQty')} onChange={e => {
                                          const n = [...draftOutputs]; n[idx] = { ...n[idx], quantity_max: Number(e.target.value) }; setDraftOutputs(n)
                                        }} />
                                      </div>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => {
                                        const item = allItems.find(i => i.id === out.item_definition_id)
                                        const label = item ? item.name : out.item_definition_id ? out.item_definition_id.slice(0, 8) : `output #${idx + 1}`
                                        setConfirmDelete({ type: "output", idx, label })
                                      }}><X className="h-4 w-4" /></Button>
                                    </div>
                                  ))}
                                  {draftOutputs.length === 0 && <p className="text-xs text-muted-foreground italic px-1 py-1">{t('crafting.noOutputItems')}</p>}
                                  <Button variant="outline" size="sm" className="w-full h-7 text-xs mt-1" onClick={() => setDraftOutputs([...draftOutputs, { item_definition_id: "", quantity_min: 1, quantity_max: 1, output_type: "main", sort_order: draftOutputs.length }])}>
                                    <Plus className="h-3 w-3 mr-1" /> {t('crafting.addOutput')}
                                  </Button>
                                </div>
                              ) : (
                              <div className="border border-emerald-500/20 rounded-md overflow-hidden bg-background">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                                      <TableHead className="h-8 text-xs w-16 text-center">{t('crafting.outputType')}</TableHead>
                                      <TableHead className="h-8 text-xs">{t('items.name')}</TableHead>
                                      <TableHead className="h-8 text-xs text-right w-20">{t('crafting.qtyRange')}</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {detail.outputs?.map((out, idx) => {
                                      const def = allItems.find(i => i.id === out.item_definition_id)
                                      return (
                                        <TableRow key={idx}>
                                          <TableCell className="text-center py-1.5">
                                            <Badge variant={out.output_type === 'main' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 font-normal capitalize">
                                              {out.output_type}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="py-1.5">
                                            <div className="flex items-center gap-1.5">
                                              <Link href={`/games/${gameId}/items/${out.item_definition_id}`} className="font-mono text-xs text-primary hover:underline flex items-center gap-1 truncate max-w-[200px]" title={def?.name || out.item_definition_id}>
                                                {def?.name || out.item_definition_id}
                                                <ExternalLink className="h-3 w-3 shrink-0" />
                                              </Link>
                                              <CopyButton text={out.item_definition_id} size="h-3 w-3" />
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-right py-1.5 text-xs text-muted-foreground font-medium">
                                            {out.quantity_min === out.quantity_max ? out.quantity_max : `${out.quantity_min} - ${out.quantity_max}`}
                                          </TableCell>
                                        </TableRow>
                                      )
                                    })}
                                    {(!detail.outputs || detail.outputs.length === 0) && (
                                      <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground text-xs py-3 italic">{t('common.none')}</TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </>
                )}
              </Card>
            )
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground px-2">
              <span>{t('crafting.pageLabel')} {page} {t('crafting.pageOf')} {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>{t('common.previous')}</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t('common.next')}</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE RECIPE SHEET */}
      <Sheet open={isRecipeSheetOpen} onOpenChange={(val) => {
        if (!val) {
          handleSheetClose()
        }
      }}>
        <SheetContent side={recipeSheetSide} className="w-full sm:max-w-2xl overflow-y-auto flex flex-col p-0">
          <SheetHeader className="p-6 pb-2 shrink-0">
            <SheetTitle>{recipeSheetTitle}</SheetTitle>
            <SheetDescription>{recipeSheetDescription}</SheetDescription>
          </SheetHeader>
          
          <div className="px-6 py-4 flex-1 overflow-y-auto space-y-6 bg-muted/5">
            {/* General Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold tracking-tight">{t('crafting.generalInfo')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('items.name')} <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.name}
                    onChange={e => {
                      const v = e.target.value
                      if (autoSlug) {
                        setForm({
                          ...form,
                          name: v,
                          recipe_key: toSlugUnderscore(v)
                        })
                      } else {
                        setForm({ ...form, name: v })
                      }
                    }}
                    placeholder={t('crafting.namePlaceholder')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('crafting.recipeKeyLabel')} <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.recipe_key}
                      onChange={e => {
                        if (editOpen) return
                        setAutoSlug(false)
                        setForm({ ...form, recipe_key: e.target.value })
                      }}
                      readOnly={editOpen}
                      placeholder={t('crafting.recipeKeyPlaceholder')}
                      className={`font-mono ${editOpen ? "bg-muted/40" : ""}`}
                    />
                    {!editOpen && (
                      <Button
                        type="button"
                        variant={autoSlug ? "default" : "outline"}
                        size="icon"
                        className="shrink-0"
                        title={autoSlug ? t('crafting.autoSlugOn') : t('crafting.autoSlugOff')}
                        onClick={() => {
                          setAutoSlug(true)
                          setForm({
                            ...form,
                            recipe_key: toSlugUnderscore(form.name)
                          })
                        }}
                      >
                        <Wand2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label>{t('crafting.descriptionLabel')}</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('crafting.descriptionPlaceholder')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('crafting.categoryLabel')}</Label>
                  <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder={t('crafting.categoryPlaceholder')} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={form.is_active} onCheckedChange={c => setForm({ ...form, is_active: c })} />
                  <Label>{t('crafting.activeLabel')}</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Rates & Limits */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold tracking-tight">{t('crafting.ratesSection')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 bg-muted/30 p-3 rounded-md border">
                  <Label className="flex justify-between items-center">
                    {t('crafting.successRateRaw')}
                    <span className="text-emerald-600 max-w-[50px] text-right font-mono tabular-nums">{formatRate(form.success_rate)}</span>
                  </Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input type="number" min={0} max={10000000} step={1} value={form.success_rate} onChange={e => setForm({ ...form, success_rate: Number(e.target.value) })} className="font-mono text-left" />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">{t('crafting.successRateDesc')}</p>
                </div>

                <div className="space-y-1.5 bg-muted/30 p-3 rounded-md border">
                  <Label className="flex justify-between items-center">
                    {t('crafting.bonusRateRaw')}
                    <span className="text-amber-500 max-w-[50px] text-right font-mono tabular-nums">{formatRate(form.bonus_rate)}</span>
                  </Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input type="number" min={0} max={10000000} step={1} value={form.bonus_rate} onChange={e => setForm({ ...form, bonus_rate: Number(e.target.value) })} className="font-mono text-left" />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">{t('crafting.bonusRateDesc')}</p>
                </div>
              </div>


            </div>

            <Separator />

            {/* Inputs */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold tracking-tight">{t('crafting.inputMaterials')} <span className="text-destructive">*</span></h3>
                <Button variant="outline" size="sm" onClick={() => setForm({ ...form, inputs: [...form.inputs, { item_definition_id: "", quantity: 1, is_consumed: true }] })}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {form.inputs.map((inp, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-background p-2 rounded-md border shadow-sm">
                    <div className="flex-1">
                      <ItemSelector
                        value={inp.item_definition_id}
                        onChange={v => {
                          const newInps = [...form.inputs]
                          newInps[idx].item_definition_id = v
                          setForm({ ...form, inputs: newInps })
                        }}
                        items={allItems}
                        loading={itemsLoading}
                        placeholder={t('crafting.selectComponentItem')}
                      />
                    </div>
                    <Input type="number" min={1} value={inp.quantity} className="w-16 h-8 text-xs text-center" onChange={e => {
                      const newInps = [...form.inputs]; newInps[idx].quantity = Number(e.target.value); setForm({ ...form, inputs: newInps })
                    }} title={t('crafting.quantity')} />
                    <div className="flex items-center gap-1.5 px-2" title={t('crafting.isConsumed')}>
                      <Switch className="scale-75 data-[state=checked]:bg-destructive" checked={inp.is_consumed} onCheckedChange={c => {
                        const newInps = [...form.inputs]; newInps[idx].is_consumed = c; setForm({ ...form, inputs: newInps })
                      }} />
                      <span className="text-[10px] text-muted-foreground w-6">{inp.is_consumed ? t('crafting.burn') : t('crafting.keep')}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => {
                      const newInps = [...form.inputs]; newInps.splice(idx, 1); setForm({ ...form, inputs: newInps })
                    }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {form.inputs.length === 0 && <p className="text-xs text-muted-foreground italic pl-2">{t('crafting.noInputMaterialsAdded')}</p>}
              </div>
            </div>

            <Separator />

            {/* Outputs */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold tracking-tight">{t('crafting.outputResults')} <span className="text-destructive">*</span></h3>
                <Button variant="outline" size="sm" onClick={() => setForm({ ...form, outputs: [...form.outputs, { item_definition_id: "", quantity_min: 1, quantity_max: 1, output_type: "main", sort_order: form.outputs.length }] })}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {form.outputs.map((out, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-background p-2 rounded-md border shadow-sm">
                    <Select 
                      value={out.output_type} 
                      onValueChange={v => {
                        const newOuts = [...form.outputs]; newOuts[idx].output_type = v; setForm({ ...form, outputs: newOuts })
                      }}
                    >
                      <SelectTrigger className="h-8 w-24 text-xs shrink-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">{t('crafting.mainResult')}</SelectItem>
                        <SelectItem value="bonus">{t('crafting.bonusResult')}</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="flex-1">
                      <ItemSelector
                        value={out.item_definition_id}
                        onChange={v => {
                          const newOuts = [...form.outputs]
                          newOuts[idx].item_definition_id = v
                          setForm({ ...form, outputs: newOuts })
                        }}
                        items={allItems}
                        loading={itemsLoading}
                        placeholder={t('crafting.selectOutputItem')}
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <Input type="number" min={1} value={out.quantity_min} className="w-14 h-8 text-xs text-center px-1" title={t('crafting.minQty')} onChange={e => {
                        const newOuts = [...form.outputs]; newOuts[idx].quantity_min = Number(e.target.value); setForm({ ...form, outputs: newOuts })
                      }} />
                      <span className="text-muted-foreground text-[10px]">-</span>
                      <Input type="number" min={1} value={out.quantity_max} className="w-14 h-8 text-xs text-center px-1" title={t('crafting.maxQty')} onChange={e => {
                        const newOuts = [...form.outputs]; newOuts[idx].quantity_max = Number(e.target.value); setForm({ ...form, outputs: newOuts })
                      }} />
                    </div>

                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => {
                      const newOuts = [...form.outputs]; newOuts.splice(idx, 1); setForm({ ...form, outputs: newOuts })
                    }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {form.outputs.length === 0 && <p className="text-xs text-muted-foreground italic pl-2">{t('crafting.noOutputItemsAdded')}</p>}
              </div>
            </div>

            <Separator />
            
            {/* Metadata KV */}
            <div className="space-y-3 pb-6">
              <h3 className="text-sm font-semibold tracking-tight">{t('crafting.metadataLabel')}</h3>
              <div className="space-y-2">
                {formMetaEntries.map((entry, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input className="h-8 text-xs" placeholder={t('crafting.metaKeyPlaceholder')} value={entry.key} onChange={e => {
                      const newM = [...formMetaEntries]; newM[idx].key = e.target.value; setFormMetaEntries(newM)
                    }} />
                    <Input className="h-8 text-xs w-2/3" placeholder={t('crafting.metaValuePlaceholder')} value={entry.value} onChange={e => {
                      const newM = [...formMetaEntries]; newM[idx].value = e.target.value; setFormMetaEntries(newM)
                    }} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => {
                      const newM = [...formMetaEntries]; newM.splice(idx, 1); setFormMetaEntries(newM)
                    }}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setFormMetaEntries([...formMetaEntries, { key: "", value: "" }])}>
                  <Plus className="h-3 w-3 mr-1" /> {t('crafting.addKeyValue')}
                </Button>
              </div>
            </div>
            
          </div>
          
          <SheetFooter className="p-4 shrink-0 border-t bg-background">
            <Button variant="outline" disabled={formSaving} onClick={handleSheetClose}>{t('common.cancel')}</Button>
            <Button disabled={formSaving || itemsLoading} onClick={handleSaveRecipe}>
              {formSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {recipeSheetSubmitLabel}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDelete} onOpenChange={open => { if (!open) setConfirmDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('crafting.confirmRemoval')}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete && (confirmDelete.type === "meta"
                ? t('crafting.removeMetaKey').replace('{label}', confirmDelete.label)
                : confirmDelete.type === "input"
                ? t('crafting.removeInputItem').replace('{label}', confirmDelete.label)
                : t('crafting.removeOutputItem').replace('{label}', confirmDelete.label))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (!confirmDelete) return
              if (confirmDelete.type === "meta") {
                const n = [...draftMeta]; n.splice(confirmDelete.idx, 1); setDraftMeta(n)
              } else if (confirmDelete.type === "input") {
                const n = [...draftInputs]; n.splice(confirmDelete.idx, 1); setDraftInputs(n)
              } else {
                const n = [...draftOutputs]; n.splice(confirmDelete.idx, 1); setDraftOutputs(n)
              }
              setConfirmDelete(null)
            }}>{t('common.remove')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteRecipe} onOpenChange={open => { if (!open && !deleteRecipeSaving) setDeleteRecipe(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('crafting.deleteRecipeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRecipe && t('crafting.deleteRecipeConfirm').replace('{name}', deleteRecipe.name)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRecipeSaving}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteRecipeSaving}
              onClick={e => { e.preventDefault(); if (deleteRecipe) handleDeleteRecipe(deleteRecipe) }}
            >
              {deleteRecipeSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
