"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Copy, Check, Package, Pencil, Save, X, Lock, Plus, Trash2, ExternalLink, Loader2, ChevronsUpDown, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getGame } from "@/lib/game-api"
import { getItemDefinition, updateItemDefinition, deleteItemDefinition, fetchItemCategories, fetchItemRarities, getGachaPack, getContainerDefinition, listItemDefinitions, listItemTags, getItemDefinitionTags, assignTagsToItemDefinition, removeTagsFromItemDefinition, type ItemTag } from "@/lib/inventory-api"
import { useTranslation } from "@/lib/i18n/use-translation"
import { getCraftingRecipe } from "@/lib/crafting-api"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import type { ItemDefinition, ItemCategory, ItemRarity, UpdateItemRequest, GachaPack, ContainerDefinition } from "@/types/inventory"
import { RARITY_COLORS } from "@/types/inventory"
import { GameNavButtons } from "@/components/GameNavButtons"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ─── helpers ─────────────────────────────────────────────────────────────────

function RarityBadge({ rarity }: { rarity: ItemRarity }) {
  const c = RARITY_COLORS[rarity]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${c.text} ${c.border} ${c.bg} capitalize`}>
      {rarity}
    </span>
  )
}

function CopyUUID({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value)
    } else {
      const textarea = document.createElement("textarea")
      textarea.value = value
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="inline-flex items-center gap-1.5 group" title="Copy">
      <code className="text-xs font-mono bg-muted px-2 py-1 rounded break-all">{value}</code>
      {copied
        ? <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
        : <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />}
    </button>
  )
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function ItemDefinitionDetailPage() {
  const params = useParams() as { id: string; itemId: string }
  const router = useRouter()
  const { t } = useTranslation()
  const { toast } = useToast()
  const { id: gameId, itemId } = params

  const [item, setItem] = useState<ItemDefinition | null>(null)
  const [gameName, setGameName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // which scalar field is actively being edited
  const [editingField, setEditingField] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // temp values per field
  const [tmpName, setTmpName] = useState("")
  const [tmpCategory, setTmpCategory] = useState<ItemCategory>("weapon")
  const [tmpRarity, setTmpRarity] = useState<ItemRarity>("common")
  const [tmpGridW, setTmpGridW] = useState("1")
  const [tmpGridH, setTmpGridH] = useState("1")
  const [tmpMaxStack, setTmpMaxStack] = useState("")

  // KV card editing
  const [editingStats, setEditingStats] = useState(false)
  const [editingMeta, setEditingMeta] = useState(false)
  const [tmpStats, setTmpStats] = useState<{ key: string; value: string }[]>([])
  const [tmpMeta, setTmpMeta] = useState<{ key: string; value: string }[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [rarities, setRarities] = useState<ItemRarity[]>([])

  // gacha pack info resolved from gacha_pack_ids
  const [gachaPackInfo, setGachaPackInfo] = useState<Record<string, { name: string; is_enabled: boolean }>>({})

  // crafting recipe info resolved from craft_recipe_input_ids / craft_recipe_output_ids
  const [craftRecipeInfo, setCraftRecipeInfo] = useState<Record<string, { name: string; recipe_key: string }>>({})

  // linked container definition info resolved from metadata.linked_container_definition_id
  const [linkedContainerInfo, setLinkedContainerInfo] = useState<{ id: string; name: string } | null>(null)

  // generator output pool resolved names
  const [genPoolNames, setGenPoolNames] = useState<Record<string, string>>({})
  const [genPoolLoading, setGenPoolLoading] = useState(false)

  // tags
  const [itemTagsList, setItemTagsList] = useState<ItemTag[]>([])
  const [allTags, setAllTags] = useState<ItemTag[]>([])
  const [tagsLoading, setTagsLoading] = useState(false)
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const [tagPickerSearch, setTagPickerSearch] = useState("")
  const [tagActionLoading, setTagActionLoading] = useState<string | null>(null)

  // generator config editing
  interface GenPoolEntry { item_definition_id: string; drop_rate: string; quantity_min: string; quantity_max: string; collect_cap: string; initial_output: string }
  const [editingGenConfig, setEditingGenConfig] = useState(false)
  const [genInterval, setGenInterval] = useState("")
  const [genTickCapacity, setGenTickCapacity] = useState("")
  const [genCollectDestination, setGenCollectDestination] = useState<"mailbox" | "inventory">("mailbox")
  const [genMailboxTitle, setGenMailboxTitle] = useState("")
  const [genMailboxBody, setGenMailboxBody] = useState("")
  const [genOutputPool, setGenOutputPool] = useState<GenPoolEntry[]>([])
  const [genAllItems, setGenAllItems] = useState<ItemDefinition[]>([])
  const [genItemsLoading, setGenItemsLoading] = useState(false)
  const [genPoolOpen, setGenPoolOpen] = useState<Record<number, boolean>>({})
  const [genPoolSearch, setGenPoolSearch] = useState<Record<number, string>>({})
  const [savingGenConfig, setSavingGenConfig] = useState(false)

  // explanation panel state
  const [showExplanationPanel, setShowExplanationPanel] = useState(false)
  const [explanationTopic, setExplanationTopic] = useState<'write_props' | 'update_qty' | null>(null)

  useEffect(() => {
    Promise.all([fetchItemCategories(), fetchItemRarities()])
      .then(([cats, rars]) => { setCategories(cats); setRarities(rars) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!gameId || !itemId) return
    setTagsLoading(true)
    Promise.all([
      getItemDefinitionTags({ gameId }, itemId),
      listItemTags({ gameId }, { limit: 100 }),
    ])
      .then(([assigned, catalogue]) => {
        setItemTagsList(assigned.tags ?? [])
        setAllTags(catalogue.tags ?? [])
      })
      .catch(() => {})
      .finally(() => setTagsLoading(false))
  }, [gameId, itemId])

  async function handleAddTag(tag: ItemTag) {
    if (tagActionLoading) return
    const alreadyAssigned = itemTagsList.some((t) => t.tag_key === tag.tag_key)
    if (alreadyAssigned) return
    if (itemTagsList.length >= 20) {
      toast({ variant: "destructive", title: "Tag limit reached", description: "Maximum 20 tags per item." })
      return
    }
    setTagActionLoading(tag.tag_key)
    try {
      const res = await assignTagsToItemDefinition({ gameId }, itemId, [tag.tag_key])
      setItemTagsList((prev) => [...prev, ...(res.tags ?? []).filter((t) => !prev.some((p) => p.tag_key === t.tag_key))])
      setTagPickerOpen(false)
      setTagPickerSearch("")
      toast({ title: `Tag "${tag.label}" added` })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to add tag", description: err?.message })
    } finally {
      setTagActionLoading(null)
    }
  }

  async function handleRemoveTag(tag: ItemTag) {
    if (tagActionLoading) return
    setTagActionLoading(tag.tag_key)
    try {
      await removeTagsFromItemDefinition({ gameId }, itemId, [tag.tag_key])
      setItemTagsList((prev) => prev.filter((t) => t.tag_key !== tag.tag_key))
      toast({ title: `Tag "${tag.label}" removed` })
    } catch (err: any) {
      toast({ variant: "destructive", title: t('items.failedToRemoveTag'), description: err?.message })
    } finally {
      setTagActionLoading(null)
    }
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const game = await getGame(gameId)
        setGameName(game.name)
        const data = await getItemDefinition({ gameId }, itemId)
        setItem(data.item)
        // resolve gacha pack names
        const packIds = Array.isArray(data.item.metadata?.gacha_pack_ids)
          ? (data.item.metadata.gacha_pack_ids as string[])
          : []
        if (packIds.length > 0) {
          const info: Record<string, { name: string; is_enabled: boolean }> = {}
          await Promise.allSettled(
            packIds.map((pid) =>
              getGachaPack({ gameId }, pid).then((res) => {
                info[pid] = { name: res.pack.name, is_enabled: res.pack.is_enabled }
              })
            )
          )
          setGachaPackInfo(info)
        }
        // resolve crafting recipe names
        const inputRecipeIds = Array.isArray(data.item.metadata?.craft_recipe_input_ids)
          ? (data.item.metadata.craft_recipe_input_ids as string[])
          : []
        const outputRecipeIds = Array.isArray(data.item.metadata?.craft_recipe_output_ids)
          ? (data.item.metadata.craft_recipe_output_ids as string[])
          : []
        const allRecipeIds = [...new Set([...inputRecipeIds, ...outputRecipeIds])]
        if (allRecipeIds.length > 0) {
          const info: Record<string, { name: string; recipe_key: string }> = {}
          await Promise.allSettled(
            allRecipeIds.map((rid) =>
              getCraftingRecipe({ gameId }, rid).then((res) => {
                info[rid] = { name: res.name, recipe_key: res.recipe_key }
              })
            )
          )
          setCraftRecipeInfo(info)
        }
        // resolve linked container definition
        const linkedContainerId = typeof data.item.metadata?.linked_container_definition_id === "string"
          ? data.item.metadata.linked_container_definition_id
          : null
        if (linkedContainerId) {
          try {
            const cRes = await getContainerDefinition({ gameId }, linkedContainerId)
            setLinkedContainerInfo({ id: linkedContainerId, name: cRes.container_definition.name })
          } catch {
            setLinkedContainerInfo({ id: linkedContainerId, name: "" })
          }
        } else {
          setLinkedContainerInfo(null)
        }
        // resolve generator output pool names
        if (data.item.category === "generator" && data.item.metadata?.generator_config) {
          const gc = data.item.metadata.generator_config as Record<string, unknown>
          const pool = Array.isArray(gc.output_pool) ? gc.output_pool as Array<Record<string, unknown>> : []
          const ids = new Set<string>()
          pool.forEach((e) => { const id = String(e.item_definition_id ?? ""); if (id) ids.add(id) })
          if (ids.size > 0) {
            setGenPoolLoading(true)
            const names: Record<string, string> = {}
            await Promise.allSettled(
              Array.from(ids).map((id) =>
                getItemDefinition({ gameId }, id)
                  .then((r) => { names[id] = r.item?.name ?? id })
                  .catch(() => { names[id] = id })
              )
            )
            setGenPoolNames(names)
            setGenPoolLoading(false)
          }
        }
      } catch (err: any) {
        setError(err?.message ?? t('items.failedToLoadItem'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [gameId, itemId])

  function startEdit(field: string) {
    if (!item) return
    setEditingField(field)
    if (field === "name") setTmpName(item.name)
    if (field === "category") setTmpCategory(item.category)
    if (field === "rarity") setTmpRarity(item.rarity)
    if (field === "grid") { setTmpGridW(String(item.grid_width)); setTmpGridH(String(item.grid_height)) }
    if (field === "max_stack_size") setTmpMaxStack(item.max_stack_size != null ? String(item.max_stack_size) : "")
  }

  async function saveField(patch: UpdateItemRequest) {
    if (!item) return
    setSaving(true)
    try {
      const res = await updateItemDefinition({ gameId }, itemId, patch)
      setItem(res.item)
      setEditingField(null)
      setEditingStats(false)
      setEditingMeta(false)
      toast({ title: t('common.saved') })
    } catch (err: any) {
      toast({ variant: "destructive", title: t('items.saveFailed'), description: err?.message ?? t('common.unknown') })
    } finally {
      setSaving(false)
    }
  }

  function startEditStats() {
    if (!item) return
    setTmpStats(Object.entries(item.base_stats ?? {}).map(([key, value]) => ({ key, value: String(value) })))
    setEditingStats(true)
  }

  // Keys managed separately (read-only in the UI)
  const RESERVED_META_KEYS = ["gacha_pack_ids", "gacha_pack_id", "linked_container_definition_id", "generator_config", "craft_recipe_input_ids", "craft_recipe_output_ids"]

  function startEditGenConfig() {
    if (!item) return
    const gc = (item.metadata?.generator_config ?? {}) as Record<string, unknown>
    setGenInterval(String(gc.production_interval_seconds ?? "3600"))
    setGenTickCapacity(String(gc.tick_capacity ?? "24"))
    setGenCollectDestination((gc.collect_destination as "mailbox" | "inventory") ?? "mailbox")
    setGenMailboxTitle(typeof gc.mailbox_title === "string" ? gc.mailbox_title : "")
    setGenMailboxBody(typeof gc.mailbox_body === "string" ? gc.mailbox_body : "")
    const pool = Array.isArray(gc.output_pool) ? gc.output_pool as Array<Record<string, unknown>> : []
    setGenOutputPool(pool.length > 0
      ? pool.map((e) => ({
          item_definition_id: String(e.item_definition_id ?? ""),
          drop_rate: String(e.drop_rate ?? "1"),
          quantity_min: String(e.quantity_min ?? "1"),
          quantity_max: String(e.quantity_max ?? "1"),
          collect_cap: String(e.collect_cap ?? "5"),
          initial_output: String(e.initial_output ?? "0"),
        }))
      : [{ item_definition_id: "", drop_rate: "1", quantity_min: "1", quantity_max: "1", collect_cap: "5", initial_output: "0" }]
    )
    setEditingGenConfig(true)
    // Load all items for combobox
    if (genAllItems.length === 0) {
      setGenItemsLoading(true)
      listItemDefinitions({ gameId }, { limit: 500 })
        .then((res) => setGenAllItems(res.items ?? []))
        .catch(() => {})
        .finally(() => setGenItemsLoading(false))
    }
  }

  async function saveGenConfig() {
    if (!item) return
    setSavingGenConfig(true)
    try {
      const metadata: Record<string, unknown> = { ...(item.metadata ?? {}) }
      const generatorConfig: Record<string, unknown> = {
        production_interval_seconds: Number(genInterval) || 3600,
        tick_capacity: Number(genTickCapacity) || 24,
        collect_destination: genCollectDestination,
        output_pool: genOutputPool
          .filter((e) => e.item_definition_id.trim())
          .map((e) => ({
            item_definition_id: e.item_definition_id,
            drop_rate: Number(e.drop_rate) || 0,
            quantity_min: Number(e.quantity_min) || 1,
            quantity_max: Number(e.quantity_max) || 1,
            collect_cap: Number(e.collect_cap) || 0,
            initial_output: Number(e.initial_output) || 0,
          })),
      }
      if (genCollectDestination === "mailbox") {
        if (genMailboxTitle.trim()) generatorConfig.mailbox_title = genMailboxTitle.trim()
        if (genMailboxBody.trim()) generatorConfig.mailbox_body = genMailboxBody.trim()
      }
      metadata.generator_config = generatorConfig
      const res = await updateItemDefinition({ gameId }, itemId, { metadata })
      setItem(res.item)
      setEditingGenConfig(false)
      toast({ title: t('items.generatorConfigSaved') })
      // Re-resolve pool names
      const gc = res.item.metadata?.generator_config as Record<string, unknown>
      const pool = Array.isArray(gc?.output_pool) ? gc.output_pool as Array<Record<string, unknown>> : []
      const ids = new Set<string>()
      pool.forEach((e) => { const id = String(e.item_definition_id ?? ""); if (id) ids.add(id) })
      ids.forEach((id) => {
        getItemDefinition({ gameId }, id)
          .then((r) => setGenPoolNames((prev) => ({ ...prev, [id]: r.item?.name ?? id })))
          .catch(() => {})
      })
    } catch (err: any) {
      toast({ variant: "destructive", title: t('items.saveFailed'), description: err?.message ?? t('common.unknown') })
    } finally {
      setSavingGenConfig(false)
    }
  }

  function startEditMeta() {
    if (!item) return
    setTmpMeta(
      Object.entries(item.metadata ?? {})
        .filter(([key]) => !RESERVED_META_KEYS.includes(key))
        .map(([key, value]) => ({ key, value: String(value) }))
    )
    setEditingMeta(true)
  }

  async function saveStats() {
    const base_stats: Record<string, number> = {}
    tmpStats.forEach(({ key, value }) => { if (key.trim()) base_stats[key.trim()] = Number(value) || 0 })
    await saveField({ base_stats })
    setEditingStats(false)
  }

  async function saveMeta() {
    const metadata: Record<string, unknown> = {}
    // preserve reserved keys from original metadata
    RESERVED_META_KEYS.forEach((rk) => {
      if (item?.metadata?.[rk] !== undefined) metadata[rk] = item.metadata[rk]
    })
    tmpMeta.forEach(({ key, value }) => { if (key.trim()) metadata[key.trim()] = value })
    await saveField({ metadata })
    setEditingMeta(false)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteItemDefinition({ gameId }, itemId)
      toast({ title: t('items.itemDeleted') })
      router.push(`/games/${gameId}/items`)
    } catch (err: any) {
      toast({ variant: "destructive", title: t('items.failedToDelete'), description: err?.message ?? t('common.unknown') })
    } finally {
      setDeleting(false)
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive">
          <CardContent className="pt-6 text-destructive">{error ?? t('items.itemNotFound')}</CardContent>
        </Card>
      </div>
    )
  }

  const c = RARITY_COLORS[item.rarity]
  const linkedPackIds = (Array.isArray(item.metadata?.gacha_pack_ids) ? item.metadata.gacha_pack_ids : []) as string[]
  const craftInputIds = (Array.isArray(item.metadata?.craft_recipe_input_ids) ? item.metadata.craft_recipe_input_ids : []) as string[]
  const craftOutputIds = (Array.isArray(item.metadata?.craft_recipe_output_ids) ? item.metadata.craft_recipe_output_ids : []) as string[]

  return (
    <div className="container mx-auto py-6">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem><BreadcrumbLink href="/games">{t('common.games')}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem><BreadcrumbLink href={`/games/${gameId}`}>{gameName || gameId}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem><BreadcrumbLink href={`/games/${gameId}/items`}>{t('items.itemCatalogue')}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem><span>{item.name}</span></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg border ${c.border} ${c.bg}`}>
            <Package className={`h-6 w-6 ${c.text}`} />
          </div>
          <div>
            {editingField === "name" ? (
              <div className="flex items-center gap-2">
                <Input
                  className="h-9 text-lg font-bold w-64"
                  value={tmpName}
                  onChange={(e) => setTmpName(e.target.value)}
                  disabled={saving}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") saveField({ name: tmpName.trim() }); if (e.key === "Escape") setEditingField(null) }}
                />
                <Button size="sm" variant="default" className="gap-1.5" disabled={saving} onClick={() => saveField({ name: tmpName.trim() })}>
                  <Save className="h-4 w-4" />
                  {saving ? t('common.saving') : t('common.save')}
                </Button>
                <Button size="sm" variant="outline" disabled={saving} onClick={() => setEditingField(null)}>
                  {t('common.cancel')}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group/title">
                <h1 className="text-2xl font-bold">{item.name}</h1>
                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover/title:opacity-100 transition-opacity" onClick={() => startEdit("name")}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <RarityBadge rarity={item.rarity} />
              <Badge variant="outline" className="capitalize text-xs">{item.category}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <GameNavButtons gameId={gameId} active="items" />
        </div>
      </div>

      {/* Item sub-tabs */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <Tabs value="catalogue">
          <TabsList>
            <TabsTrigger value="catalogue" asChild>
              <Link href={`/games/${gameId}/items?tab=catalogue`}>{t('items.tabItems')}</Link>
            </TabsTrigger>
            <TabsTrigger value="containers" asChild>
              <Link href={`/games/${gameId}/items?tab=containers`}>{t('items.tabContainers')}</Link>
            </TabsTrigger>
            <TabsTrigger value="gacha" asChild>
              <Link href={`/games/${gameId}/items?tab=gacha`}>{t('items.tabGacha')}</Link>
            </TabsTrigger>
            <TabsTrigger value="generators" asChild>
              <Link href={`/games/${gameId}/items?tab=generators`}>{t('items.tabGenerators')}</Link>
            </TabsTrigger>
            <TabsTrigger value="equipments" asChild>
              <Link href={`/games/${gameId}/items?tab=equipments`}>{t('items.tabEquipmentSlots')}</Link>
            </TabsTrigger>
            <TabsTrigger value="tags" asChild>
              <Link href={`/games/${gameId}/items?tab=tags`}>{t('items.tabTags')}</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon" disabled={deleting}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('items.deleteItemConfirmTitle')} "{item.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                {t('items.deleteItemConfirmDesc1')}
                {" "}
                {t('items.deleteItemConfirmDesc2')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? t('items.deleting') : t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ── Identity ────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('items.detailIdentity')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">

            <div className="group flex justify-between items-center py-1.5">
              <span className="text-muted-foreground shrink-0">{t('items.detailItemId')}</span>
              <CopyUUID value={item.id} />
            </div>
            <div className="flex justify-between items-start gap-4">
              <span className="text-muted-foreground shrink-0">{t('items.detailStudioId')}</span>
              <CopyUUID value={item.studio_id} />
            </div>
            <div className="flex justify-between items-start gap-4">
              <span className="text-muted-foreground shrink-0">{t('items.detailGameId')}</span>
              <CopyUUID value={item.game_id} />
            </div>
            {item.item_code && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-muted-foreground shrink-0 flex items-center gap-1">
                  {t('items.itemCode')}
                  <Lock className="h-3 w-3 text-muted-foreground/60" />
                </span>
                <CopyUUID value={item.item_code} />
              </div>
            )}

            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">{t('items.createdAtLabel')}</span>
              <span className="text-xs">{new Date(item.created_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">{t('items.updatedAtLabel')}</span>
              <span className="text-xs">{new Date(item.updated_at).toLocaleString()}</span>
            </div>

            {/* Tags */}
            <div className="pt-2 border-t border-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <Tag className="h-3 w-3" /> {t('items.tabTags')}
                  {itemTagsList.length > 0 && (
                    <span className={`text-[11px] font-mono ${itemTagsList.length >= 20 ? "text-destructive" : "text-muted-foreground"}`}>
                      {itemTagsList.length}/20
                    </span>
                  )}
                </span>
                <Popover open={tagPickerOpen} onOpenChange={setTagPickerOpen} modal>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2" disabled={tagsLoading || itemTagsList.length >= 20}>
                      <Plus className="h-3 w-3" /> {t('common.add')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="end">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder={t('items.searchTagsPlaceholder')}
                        value={tagPickerSearch}
                        onValueChange={setTagPickerSearch}
                      />
                      <CommandList>
                        <CommandEmpty>{t('items.noTagsFound')}</CommandEmpty>
                        <CommandGroup>
                          {allTags
                            .filter((t) => {
                              const q = tagPickerSearch.toLowerCase()
                              return (!q || t.label.toLowerCase().includes(q) || t.tag_key.toLowerCase().includes(q))
                                && !itemTagsList.some((a) => a.tag_key === t.tag_key)
                            })
                            .map((tag) => (
                              <CommandItem
                                key={tag.tag_key}
                                value={tag.tag_key}
                                onSelect={() => handleAddTag(tag)}
                                disabled={tagActionLoading === tag.tag_key}
                                className="gap-2"
                              >
                                {tagActionLoading === tag.tag_key
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                                  : <span className="inline-block h-3 w-3 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: tag.color }} />
                                }
                                <span className="flex-1 truncate">{tag.label}</span>
                                <span className="text-xs font-mono text-muted-foreground">{tag.tag_key}</span>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {tagsLoading ? (
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              ) : itemTagsList.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">{t('items.noTagsAssigned')}</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {itemTagsList.map((tag) => (
                    <span
                      key={tag.tag_key}
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
                      style={{ borderColor: tag.color + "80", backgroundColor: tag.color + "20", color: tag.color }}
                    >
                      {tag.label}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        disabled={tagActionLoading === tag.tag_key}
                        className="rounded-full hover:opacity-70 disabled:opacity-40 transition-opacity"
                        title={`Remove tag "${tag.label}"`}
                      >
                        {tagActionLoading === tag.tag_key
                          ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          : <X className="h-2.5 w-2.5" />
                        }
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Properties ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('items.detailProperties')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">

            {/* Name */}
            <div className="group flex justify-between items-center py-1.5">
              <span className="text-muted-foreground shrink-0">{t('items.name')}</span>
              {editingField === "name" ? (
                <div className="flex items-center gap-1">
                  <Input
                    className="h-7 text-xs w-40"
                    value={tmpName}
                    onChange={(e) => setTmpName(e.target.value)}
                    disabled={saving}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving}
                    onClick={() => saveField({ name: tmpName.trim() })}>
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving}
                    onClick={() => setEditingField(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="font-medium">{item.name}</span>
                  <Button size="icon" variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => startEdit("name")}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Category */}
            <div className="group flex justify-between items-center py-1.5">
              <span className="text-muted-foreground shrink-0">{t('items.category')}</span>
              {editingField === "category" ? (
                <div className="flex items-center gap-1">
                  <Select value={tmpCategory} onValueChange={(v) => setTmpCategory(v as ItemCategory)} disabled={saving}>
                    <SelectTrigger className="h-7 text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="capitalize text-xs">{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving}
                    onClick={() => saveField({ category: tmpCategory })}>
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving}
                    onClick={() => setEditingField(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="capitalize text-xs">{item.category}</Badge>
                  <Button size="icon" variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => startEdit("category")}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Rarity */}
            <div className="group flex justify-between items-center py-1.5">
              <span className="text-muted-foreground shrink-0">{t('items.rarity')}</span>
              {editingField === "rarity" ? (
                <div className="flex items-center gap-1">
                  <Select value={tmpRarity} onValueChange={(v) => setTmpRarity(v as ItemRarity)} disabled={saving}>
                    <SelectTrigger className="h-7 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {rarities.map((r) => (
                        <SelectItem key={r} value={r} className="text-xs">
                          <RarityBadge rarity={r} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving}
                    onClick={() => saveField({ rarity: tmpRarity })}>
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving}
                    onClick={() => setEditingField(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <RarityBadge rarity={item.rarity} />
                  <Button size="icon" variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => startEdit("rarity")}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Allow Client Write Player Properties */}
            <div className="flex justify-between items-center py-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground shrink-0">{t('items.allowClientWriteProps')}</span>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setExplanationTopic('write_props')
                    setShowExplanationPanel(true)
                  }}
                  title={t('items.detailLearnMoreWriteProps')}
                >
                  <span className="text-[10px] font-bold">?</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={item.client_writable ?? false}
                  onCheckedChange={(checked) =>
                    saveField({ client_writable: checked })
                  }
                  disabled={saving}
                />
                <span className={item.client_writable ? "text-green-500 text-xs font-medium" : "text-muted-foreground text-xs"}>
                  {item.client_writable ? t('common.yes') : t('common.no')}
                </span>
              </div>
            </div>

            {/* Allow Client Update Qty */}
            <div className="flex justify-between items-center py-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground shrink-0">{t('items.allowClientUpdateQty')}</span>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setExplanationTopic('update_qty')
                    setShowExplanationPanel(true)
                  }}
                  title={t('items.detailLearnMoreUpdateQty')}
                >
                  <span className="text-[10px] font-bold">?</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={item.allow_client_update_qty ?? false}
                  onCheckedChange={(checked) =>
                    saveField({ allow_client_update_qty: checked })
                  }
                  disabled={saving}
                />
                <span className={item.allow_client_update_qty ? "text-green-500 text-xs font-medium" : "text-muted-foreground text-xs"}>
                  {item.allow_client_update_qty ? t('common.yes') : t('common.no')}
                </span>
              </div>
            </div>

            {/* Stackable — immediate toggle, no pencil confirm needed */}
            <div className="flex justify-between items-center py-1.5">
              <span className="text-muted-foreground shrink-0">{t('items.stackable')}</span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={item.is_stackable}
                  onCheckedChange={(checked) =>
                    saveField({ is_stackable: checked, max_stack_size: checked ? (item.max_stack_size ?? null) : null })
                  }
                  disabled={saving}
                />
                <span className={item.is_stackable ? "text-green-500 text-xs font-medium" : "text-muted-foreground text-xs"}>
                  {item.is_stackable ? t('common.yes') : t('common.no')}
                </span>
              </div>
            </div>

            {/* Max Stack */}
            {item.is_stackable && (
              <div className="group flex justify-between items-center py-1.5">
                <span className="text-muted-foreground shrink-0">{t('items.detailMaxStack')}</span>
                {editingField === "max_stack_size" ? (
                  <div className="flex items-center gap-1">
                    <Input
                      className="h-7 text-xs w-24"
                      type="number"
                      min={1}
                      placeholder="∞"
                      value={tmpMaxStack}
                      onChange={(e) => setTmpMaxStack(e.target.value)}
                      disabled={saving}
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving}
                      onClick={() => saveField({ max_stack_size: tmpMaxStack === "" ? null : Number(tmpMaxStack) })}>
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving}
                      onClick={() => setEditingField(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span>{item.max_stack_size != null ? item.max_stack_size.toLocaleString() : t('items.detailUnlimited')}</span>
                    <Button size="icon" variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => startEdit("max_stack_size")}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Grid Size */}
            <div className="group flex justify-between items-center py-1.5">
              <span className="text-muted-foreground shrink-0">{t('items.detailGridSize')}</span>
              {editingField === "grid" ? (
                <div className="flex items-center gap-1">
                  <Input
                    className="h-7 text-xs w-12 text-center"
                    type="number"
                    min={1}
                    value={tmpGridW}
                    onChange={(e) => setTmpGridW(e.target.value)}
                    disabled={saving}
                    autoFocus
                  />
                  <span className="text-muted-foreground text-xs">×</span>
                  <Input
                    className="h-7 text-xs w-12 text-center"
                    type="number"
                    min={1}
                    value={tmpGridH}
                    onChange={(e) => setTmpGridH(e.target.value)}
                    disabled={saving}
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving}
                    onClick={() => saveField({ grid_width: Number(tmpGridW) || 1, grid_height: Number(tmpGridH) || 1 })}>
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving}
                    onClick={() => setEditingField(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span>{item.grid_width} × {item.grid_height}</span>
                  <Button size="icon" variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => startEdit("grid")}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

          </CardContent>
        </Card>

        {/* ── Base Stats ────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('items.baseStats')}</CardTitle>
            {!editingStats ? (
              <Button size="icon" variant="ghost" className="h-7 w-7 opacity-60 hover:opacity-100" onClick={startEditStats}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={saveStats}>
                  <Save className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => setEditingStats(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {editingStats ? (
              <div className="space-y-2">
                {tmpStats.map((entry, i) => (
                  <div key={i} className="flex gap-1 items-center">
                    <Input className="h-7 text-xs flex-1" placeholder="key" value={entry.key}
                      onChange={(e) => { const a = [...tmpStats]; a[i] = { ...a[i], key: e.target.value }; setTmpStats(a) }} />
                    <span className="text-muted-foreground text-xs">=</span>
                    <Input className="h-7 text-xs w-20" placeholder="0" type="number" value={entry.value}
                      onChange={(e) => { const a = [...tmpStats]; a[i] = { ...a[i], value: e.target.value }; setTmpStats(a) }} />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setTmpStats(tmpStats.filter((_, j) => j !== i))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="h-7 text-xs mt-1 w-full"
                  onClick={() => setTmpStats([...tmpStats, { key: "", value: "0" }])}>
                  <Plus className="h-3 w-3 mr-1" /> {t('items.detailAddStat')}
                </Button>
              </div>
            ) : Object.keys(item.base_stats ?? {}).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('items.detailNoBaseStats')}</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(item.base_stats).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Metadata ──────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('items.metadata')}</CardTitle>
            {!editingMeta ? (
              <Button size="icon" variant="ghost" className="h-7 w-7 opacity-60 hover:opacity-100" onClick={startEditMeta}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={saveMeta}>
                  <Save className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => setEditingMeta(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {/* ── Linked Container Definition (read-only) ────────── */}
            {linkedContainerInfo && (
              <div className="mb-3 border-b border-muted/50 pb-2 space-y-1">
                <span className="text-muted-foreground font-mono text-xs">linked_container_definition_id</span>
                <div className="flex items-center gap-1.5 ml-1">
                  <Link
                    href={`/games/${gameId}/items?tab=containers&q=${linkedContainerInfo.id}`}
                    title={t('items.goToItemDef')}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="font-medium">{linkedContainerInfo.name || t('items.detailUnknownContainer')}</span>
                    <span className="font-mono text-[10px] opacity-60">{linkedContainerInfo.id.slice(0, 8)}…</span>
                  </Link>
                </div>
              </div>
            )}
            {/* ── Craft Recipe Input IDs (read-only) ──────────────── */}
            {craftInputIds.length > 0 && (
              <div className="mb-3 border-b border-muted/50 pb-2 space-y-1">
                <span className="text-muted-foreground font-mono text-xs">craft_recipe_input_ids</span>
                <div className="flex flex-col gap-1 ml-1">
                  {craftInputIds.map((rid) => {
                    const recipe = craftRecipeInfo[rid]
                    return (
                      <div key={rid} className="inline-flex items-center gap-1.5 text-xs">
                        <Link
                          href={`/games/${gameId}/items?tab=crafting&expanded=${rid}`}
                          title={t('items.detailOpenRecipe')}
                          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="font-medium">{recipe?.name || "…"}</span>
                          <span className="font-mono text-[10px] opacity-60">{rid.slice(0, 8)}…</span>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {/* ── Craft Recipe Output IDs (read-only) ─────────────── */}
            {craftOutputIds.length > 0 && (
              <div className="mb-3 border-b border-muted/50 pb-2 space-y-1">
                <span className="text-muted-foreground font-mono text-xs">craft_recipe_output_ids</span>
                <div className="flex flex-col gap-1 ml-1">
                  {craftOutputIds.map((rid) => {
                    const recipe = craftRecipeInfo[rid]
                    return (
                      <div key={rid} className="inline-flex items-center gap-1.5 text-xs">
                        <Link
                          href={`/games/${gameId}/items?tab=crafting&expanded=${rid}`}
                          title={t('items.detailOpenRecipe')}
                          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="font-medium">{recipe?.name || "…"}</span>
                          <span className="font-mono text-[10px] opacity-60">{rid.slice(0, 8)}…</span>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {/* ── Gacha Pack IDs (read-only) ────────────────────────── */}
            {linkedPackIds.length > 0 && (
              <div className="mb-3 border-b border-muted/50 pb-2 space-y-1">
                <span className="text-muted-foreground font-mono text-xs">gacha_pack_ids</span>
                <div className="flex flex-col gap-1 ml-1">
                  {linkedPackIds.map((packId) => {
                    const pack = gachaPackInfo[packId]
                    return (
                      <div key={packId} className="inline-flex items-center gap-1.5 text-xs">
                        {pack && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            pack.is_enabled
                              ? "bg-green-500/15 text-green-500 border border-green-500/30"
                              : "bg-red-500/15 text-red-500 border border-red-500/30"
                          }`}>
                            {pack.is_enabled ? t('items.enabled') : t('items.disabled')}
                          </span>
                        )}
                        <Link
                          href={`/games/${gameId}/items?tab=gacha&editPack=${packId}`}
                          title={t('items.detailOpenGachaPackEditor')}
                          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="font-medium">{pack?.name || "…"}</span>
                          <span className="font-mono text-[10px] opacity-60">{packId.slice(0, 8)}…</span>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {editingMeta ? (
              <div className="space-y-2">
                {tmpMeta.map((entry, i) => (
                  <div key={i} className="flex gap-1 items-center">
                    <Input className="h-7 text-xs flex-1 font-mono" placeholder="key" value={entry.key}
                      onChange={(e) => { const a = [...tmpMeta]; a[i] = { ...a[i], key: e.target.value }; setTmpMeta(a) }} />
                    <span className="text-muted-foreground text-xs">=</span>
                    <Input className="h-7 text-xs flex-1" placeholder="value" value={entry.value}
                      onChange={(e) => { const a = [...tmpMeta]; a[i] = { ...a[i], value: e.target.value }; setTmpMeta(a) }} />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setTmpMeta(tmpMeta.filter((_, j) => j !== i))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="h-7 text-xs mt-1 w-full"
                  onClick={() => setTmpMeta([...tmpMeta, { key: "", value: "" }])}>
                  <Plus className="h-3 w-3 mr-1" /> {t('items.addEntry')}
                </Button>
              </div>
            ) : Object.keys(item.metadata ?? {}).filter((k) => !RESERVED_META_KEYS.includes(k)).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('items.detailNoMetadata')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                {Object.entries(item.metadata)
                  .filter(([key]) => !RESERVED_META_KEYS.includes(key))
                  .map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm border-b border-muted/50 pb-1.5">
                    <span className="text-muted-foreground font-mono text-xs">{key}</span>
                    <span className="text-xs font-medium max-w-[200px] truncate text-right" title={String(value)}>
                      {typeof value === "boolean" ? (value ? "true" : "false") : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Generator Config (for generator items) ──────────────────── */}
        {item.category === "generator" && (() => {
          const gc = (item.metadata?.generator_config ?? {}) as Record<string, unknown>
          const interval = Number(gc.production_interval_seconds) || 0
          const ticks = Number(gc.tick_capacity) || 0
          const maxSeconds = interval * ticks
          const hours = Math.floor(maxSeconds / 3600)
          const mins = Math.floor((maxSeconds % 3600) / 60)
          const timeStr = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}` : `${mins}m`
          const outputPool = Array.isArray(gc.output_pool) ? gc.output_pool as Array<Record<string, unknown>> : []
          return (
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('items.generatorConfig')}</CardTitle>
                {!editingGenConfig ? (
                  <Button size="icon" variant="ghost" className="h-7 w-7 opacity-60 hover:opacity-100" onClick={startEditGenConfig}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" className="gap-1.5" disabled={savingGenConfig} onClick={saveGenConfig}>
                      <Save className="h-3.5 w-3.5" />
                      {savingGenConfig ? t('common.saving') : t('common.save')}
                    </Button>
                    <Button size="sm" variant="outline" disabled={savingGenConfig} onClick={() => setEditingGenConfig(false)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {editingGenConfig ? (
                  /* ── Edit mode ────────────────────────── */
                  <div className="space-y-5">
                    {/* Top: Collect Destination/Mailbox (col 1) + Production Timing (col 2) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Section 1: Collect Destination + Mailbox */}
                      <section className="space-y-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('items.collectDestination')}</p>
                        <Select value={genCollectDestination} onValueChange={(v) => setGenCollectDestination(v as "mailbox" | "inventory")} disabled={savingGenConfig}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mailbox">{t('items.collectDestinationMailbox')}</SelectItem>
                            <SelectItem value="inventory">{t('items.collectDestinationInventory')}</SelectItem>
                          </SelectContent>
                        </Select>
                        {genCollectDestination === "inventory" && (
                          <p className="text-xs text-muted-foreground">{t('items.generatorInventoryHint')}</p>
                        )}

                        {genCollectDestination === "mailbox" && (
                          <div className="space-y-3 pt-1">
                            <div className="space-y-1.5">
                              <Label className="text-xs">{t('items.generatorMailboxTitle')}</Label>
                              <Input
                                value={genMailboxTitle}
                                onChange={(e) => setGenMailboxTitle(e.target.value)}
                                placeholder={t('items.generatorMailboxTitlePlaceholder')}
                                disabled={savingGenConfig}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">{t('items.generatorMailboxBody')}</Label>
                              <Textarea
                                value={genMailboxBody}
                                onChange={(e) => setGenMailboxBody(e.target.value)}
                                placeholder={t('items.generatorMailboxBodyPlaceholder')}
                                disabled={savingGenConfig}
                                rows={3}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">{t('items.generatorMailboxHint')}</p>
                          </div>
                        )}
                      </section>

                      {/* Section 2: Interval + Tick Capacity */}
                      <section className="space-y-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('items.generatorTiming')}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">{t('items.intervalLabel')} <span className="text-destructive">*</span></Label>
                            <Input type="number" min={1} value={genInterval} onChange={(e) => setGenInterval(e.target.value)} disabled={savingGenConfig} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">{t('items.tickCapacity')} <span className="text-destructive">*</span></Label>
                            <Input type="number" min={1} value={genTickCapacity} onChange={(e) => setGenTickCapacity(e.target.value)} disabled={savingGenConfig} />
                          </div>
                        </div>

                        {(() => {
                          const iv = parseInt(genInterval) || 0
                          const tk = parseInt(genTickCapacity) || 0
                          const ms = iv * tk
                          if (iv > 0 && tk > 0) {
                            const h = Math.floor(ms / 3600)
                            const m = Math.floor((ms % 3600) / 60)
                            const ts = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`
                            return (
                              <p className="text-xs text-muted-foreground">
                                ⏱ {t('items.detailMaxOfflineLabel')} = <span className="font-mono font-medium text-foreground">{iv}s</span> × <span className="font-mono font-medium text-foreground">{tk}</span> = <span className="font-semibold text-foreground">{ms.toLocaleString()}s ({ts})</span>
                              </p>
                            )
                          }
                          return null
                        })()}
                      </section>
                    </div>

                    <Separator />

                    {/* Section 3: Output Pool editor */}
                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('items.outputPool')}</p>
                        <Button
                          type="button" variant="outline" size="sm" className="h-7 text-xs gap-1"
                          disabled={savingGenConfig}
                          onClick={() => setGenOutputPool([...genOutputPool, { item_definition_id: "", drop_rate: "1", quantity_min: "1", quantity_max: "1", collect_cap: "5", initial_output: "0" }])}
                        >
                          <Plus className="h-3 w-3" /> {t('items.addEntry')}
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {genOutputPool.map((entry, idx) => {
                          const selectedItem = genAllItems.find((i) => i.id === entry.item_definition_id)
                          return (
                            <div key={idx} className="rounded-lg border bg-muted/20 p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-muted-foreground">Entry #{idx + 1}</span>
                                {genOutputPool.length > 1 && (
                                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" disabled={savingGenConfig}
                                    onClick={() => setGenOutputPool(genOutputPool.filter((_, i) => i !== idx))}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                              {/* Item Definition combobox */}
                              <div className="space-y-1.5">
                                <Label className="text-xs">{t('items.itemDefinition')} <span className="text-destructive">*</span></Label>
                                <Popover open={genPoolOpen[idx] ?? false} onOpenChange={(o) => setGenPoolOpen((prev) => ({ ...prev, [idx]: o }))} modal={true}>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" aria-expanded={genPoolOpen[idx] ?? false} className="w-full justify-between font-normal h-9" disabled={savingGenConfig}>
                                      {entry.item_definition_id ? (
                                        <span className="truncate">
                                          {selectedItem?.name ?? entry.item_definition_id.slice(0, 12) + "…"}
                                          {selectedItem?.item_code && <span className="ml-1.5 text-xs text-muted-foreground font-mono">({selectedItem.item_code})</span>}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">{t('items.selectItem')}</span>
                                      )}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command shouldFilter={false}>
                                      <CommandInput placeholder={t('items.searchByNameOrCode')} value={genPoolSearch[idx] ?? ""} onValueChange={(v) => setGenPoolSearch((prev) => ({ ...prev, [idx]: v }))} />
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
                                              <CommandItem key={d.id} value={d.id} onSelect={() => {
                                                const pool = [...genOutputPool]; pool[idx] = { ...pool[idx], item_definition_id: d.id }; setGenOutputPool(pool)
                                                setGenPoolOpen((prev) => ({ ...prev, [idx]: false })); setGenPoolSearch((prev) => ({ ...prev, [idx]: "" }))
                                              }}>
                                                <Check className={`mr-2 h-4 w-4 shrink-0 ${entry.item_definition_id === d.id ? "opacity-100" : "opacity-0"}`} />
                                                <span className="flex-1 truncate">{d.name}</span>
                                                {d.item_code && <span className="ml-2 text-xs text-muted-foreground font-mono">{d.item_code}</span>}
                                              </CommandItem>
                                            ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              </div>
                              {/* Numeric fields — stacked 2-col for narrow entry width */}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1"><Label className="text-xs">{t('items.dropRate')}</Label><Input className="h-9 text-sm" type="number" step="0.01" min={0} max={1} value={entry.drop_rate} disabled={savingGenConfig} onChange={(e) => { const p = [...genOutputPool]; p[idx] = { ...p[idx], drop_rate: e.target.value }; setGenOutputPool(p) }} /></div>
                                <div className="space-y-1"><Label className="text-xs">{t('items.collectCap')}</Label><Input className="h-9 text-sm" type="number" min={0} value={entry.collect_cap} disabled={savingGenConfig} onChange={(e) => { const p = [...genOutputPool]; p[idx] = { ...p[idx], collect_cap: e.target.value }; setGenOutputPool(p) }} /></div>
                                <div className="space-y-1"><Label className="text-xs">{t('items.qtyMin')}</Label><Input className="h-9 text-sm" type="number" min={1} value={entry.quantity_min} disabled={savingGenConfig} onChange={(e) => { const p = [...genOutputPool]; p[idx] = { ...p[idx], quantity_min: e.target.value }; setGenOutputPool(p) }} /></div>
                                <div className="space-y-1"><Label className="text-xs">{t('items.qtyMax')}</Label><Input className="h-9 text-sm" type="number" min={1} value={entry.quantity_max} disabled={savingGenConfig} onChange={(e) => { const p = [...genOutputPool]; p[idx] = { ...p[idx], quantity_max: e.target.value }; setGenOutputPool(p) }} /></div>
                                <div className="space-y-1 col-span-2"><Label className="text-xs">{t('items.initialOutput')}</Label><Input className="h-9 text-sm" type="number" min={0} value={entry.initial_output} disabled={savingGenConfig} onChange={(e) => { const p = [...genOutputPool]; p[idx] = { ...p[idx], initial_output: e.target.value }; setGenOutputPool(p) }} /></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  </div>
                ) : (
                  /* ── View mode ────────────────────────── */
                  <div className="space-y-5">
                    {/* Top: Collect Destination/Mailbox (col 1) + Production Timing (col 2) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Section 1: Collect Destination + Mailbox */}
                      <section className="space-y-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('items.collectDestination')}</p>
                        <div>
                          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${gc.collect_destination === "inventory" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"}`}>
                            {gc.collect_destination === "inventory" ? "Inventory" : "Mailbox"}
                          </span>
                        </div>
                        {gc.collect_destination === "inventory" && (
                          <p className="text-xs text-muted-foreground">{t('items.generatorInventoryHint')}</p>
                        )}
                        {(() => {
                          const mailboxTitle = typeof gc.mailbox_title === "string" ? gc.mailbox_title : ""
                          const mailboxBody = typeof gc.mailbox_body === "string" ? gc.mailbox_body : ""
                          if (gc.collect_destination !== "mailbox") return null
                          if (!mailboxTitle && !mailboxBody) {
                            return <p className="text-xs text-muted-foreground italic">{t('items.generatorMailboxHint')}</p>
                          }
                          return (
                            <div className="space-y-3 pt-1">
                              {mailboxTitle && (
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('items.generatorMailboxTitle')}</p>
                                  <p className="text-sm font-medium">{mailboxTitle}</p>
                                </div>
                              )}
                              {mailboxBody && (
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('items.generatorMailboxBody')}</p>
                                  <p className="text-sm whitespace-pre-wrap">{mailboxBody}</p>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </section>

                      {/* Section 2: Production Timing */}
                      <section className="space-y-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('items.generatorTiming')}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-md border px-3 py-2 text-center">
                            <p className="text-muted-foreground text-[10px] uppercase tracking-wide">{t('items.generatorIntervalShort')}</p>
                            <p className="font-semibold text-sm">{interval}s</p>
                          </div>
                          <div className="rounded-md border px-3 py-2 text-center">
                            <p className="text-muted-foreground text-[10px] uppercase tracking-wide">{t('items.tickCapacity')}</p>
                            <p className="font-semibold text-sm">{ticks}</p>
                          </div>
                        </div>
                        {interval > 0 && ticks > 0 && (
                          <p className="text-xs text-muted-foreground">
                            ⏱ {t('items.detailMaxOfflineLabel')} = <span className="font-mono font-medium text-foreground">{interval}s</span> × <span className="font-mono font-medium text-foreground">{ticks}</span> = <span className="font-semibold text-foreground">{maxSeconds.toLocaleString()}s ({timeStr})</span>
                          </p>
                        )}
                      </section>
                    </div>

                    <Separator />

                    {/* Section 3: Output Pool */}
                    <section className="space-y-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('items.outputPool')} {outputPool.length > 0 && <span className="text-muted-foreground">({outputPool.length})</span>}</p>
                      {outputPool.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('items.detailNoOutputPool')}</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {outputPool.map((entry, idx) => {
                            const defId = String(entry.item_definition_id ?? "")
                            const resolvedName = genPoolNames[defId]
                            return (
                              <div key={idx} className="rounded-lg border bg-muted/20 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-muted-foreground">Entry #{idx + 1}</span>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">{t('items.itemDefinition')}</Label>
                                  <div className="flex items-center gap-1">
                                    <Link
                                      href={`/games/${gameId}/items/${defId}`}
                                      className="inline-flex items-center gap-1 text-xs font-medium hover:text-primary transition-colors min-w-0"
                                      title={defId}
                                    >
                                      <span className="truncate">
                                        {genPoolLoading ? "…" : resolvedName || (defId ? defId.slice(0, 20) + "…" : "—")}
                                      </span>
                                      <ExternalLink className="h-3 w-3 shrink-0" />
                                    </Link>
                                    {defId && <CopyUUID value={defId} />}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs">{t('items.dropRate')}</Label>
                                    <p className="text-sm font-mono">{entry.drop_rate != null ? `${(Number(entry.drop_rate) * 100).toFixed(1)}%` : "—"}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">{t('items.collectCap')}</Label>
                                    <p className="text-sm font-mono">{String(entry.collect_cap ?? "—")}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">{t('items.qtyMin')}</Label>
                                    <p className="text-sm font-mono">{String(entry.quantity_min ?? "—")}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">{t('items.qtyMax')}</Label>
                                    <p className="text-sm font-mono">{String(entry.quantity_max ?? "—")}</p>
                                  </div>
                                  <div className="space-y-1 col-span-2">
                                    <Label className="text-xs">{t('items.initialOutput')}</Label>
                                    <p className="text-sm font-mono">{String(entry.initial_output ?? "—")}</p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </section>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })()}

      </div>

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

