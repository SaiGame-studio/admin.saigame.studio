"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Copy, Check, Package, Pencil, Save, X, Lock, Plus, Trash2, ExternalLink } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getGame } from "@/lib/game-api"
import { getItemDefinition, updateItemDefinition, deleteItemDefinition, fetchItemCategories, fetchItemRarities, getGachaPack } from "@/lib/inventory-api"
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
import type { ItemDefinition, ItemCategory, ItemRarity, UpdateItemRequest, GachaPack } from "@/types/inventory"
import { RARITY_COLORS } from "@/types/inventory"
import { GameNavButtons } from "@/components/GameNavButtons"

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

  useEffect(() => {
    Promise.all([fetchItemCategories(), fetchItemRarities()])
      .then(([cats, rars]) => { setCategories(cats); setRarities(rars) })
      .catch(() => {})
  }, [])

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
      } catch (err: any) {
        setError(err?.message ?? "Failed to load item")
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
      toast({ title: "Saved" })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save failed", description: err?.message ?? "Unknown error" })
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
  const RESERVED_META_KEYS = ["gacha_pack_ids", "gacha_pack_id"]

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
      toast({ title: "Item deleted" })
      router.push(`/games/${gameId}/items`)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete failed", description: err?.message ?? "Unknown error" })
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
          <CardContent className="pt-6 text-destructive">{error ?? "Item not found"}</CardContent>
        </Card>
      </div>
    )
  }

  const c = RARITY_COLORS[item.rarity]
  const linkedPackIds = (Array.isArray(item.metadata?.gacha_pack_ids) ? item.metadata.gacha_pack_ids : []) as string[]

  return (
    <div className="container mx-auto py-6">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem><BreadcrumbLink href="/games">Games</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem><BreadcrumbLink href={`/games/${gameId}`}>{gameName || gameId}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem><BreadcrumbLink href={`/games/${gameId}/items`}>Item Catalogue</BreadcrumbLink></BreadcrumbItem>
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
            <h1 className="text-2xl font-bold">{item.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <RarityBadge rarity={item.rarity} />
              <Badge variant="outline" className="capitalize text-xs">{item.category}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <GameNavButtons gameId={gameId} active="items" />
          <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon" disabled={deleting}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{item.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the item definition and cannot be undone.
                Any inventory entries referencing this item may be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ── Identity ────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">

            <div className="group flex justify-between items-center py-1.5">
              <span className="text-muted-foreground shrink-0">Item ID</span>
              <CopyUUID value={item.id} />
            </div>
            <div className="flex justify-between items-start gap-4">
              <span className="text-muted-foreground shrink-0">Studio ID</span>
              <CopyUUID value={item.studio_id} />
            </div>
            <div className="flex justify-between items-start gap-4">
              <span className="text-muted-foreground shrink-0">Game ID</span>
              <CopyUUID value={item.game_id} />
            </div>
            {item.item_code && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-muted-foreground shrink-0 flex items-center gap-1">
                  Item Code
                  <Lock className="h-3 w-3 text-muted-foreground/60" title="Read-only — cannot be changed after creation" />
                </span>
                <CopyUUID value={item.item_code} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Properties ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">

            {/* Name */}
            <div className="group flex justify-between items-center py-1.5">
              <span className="text-muted-foreground shrink-0">Name</span>
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
              <span className="text-muted-foreground shrink-0">Category</span>
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
              <span className="text-muted-foreground shrink-0">Rarity</span>
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

            {/* Stackable — immediate toggle, no pencil confirm needed */}
            <div className="flex justify-between items-center py-1.5">
              <span className="text-muted-foreground shrink-0">Stackable</span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={item.is_stackable}
                  onCheckedChange={(checked) =>
                    saveField({ is_stackable: checked, max_stack_size: checked ? (item.max_stack_size ?? null) : null })
                  }
                  disabled={saving}
                />
                <span className={item.is_stackable ? "text-green-500 text-xs font-medium" : "text-muted-foreground text-xs"}>
                  {item.is_stackable ? "Yes" : "No"}
                </span>
              </div>
            </div>

            {/* Max Stack */}
            {item.is_stackable && (
              <div className="group flex justify-between items-center py-1.5">
                <span className="text-muted-foreground shrink-0">Max Stack</span>
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
                    <span>{item.max_stack_size != null ? item.max_stack_size.toLocaleString() : "Unlimited (∞)"}</span>
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
              <span className="text-muted-foreground shrink-0">Grid Size</span>
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

            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Created</span>
              <span className="text-xs">{new Date(item.created_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Updated</span>
              <span className="text-xs">{new Date(item.updated_at).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* ── Base Stats ────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Base Stats</CardTitle>
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
                  <Plus className="h-3 w-3 mr-1" /> Add stat
                </Button>
              </div>
            ) : Object.keys(item.base_stats ?? {}).length === 0 ? (
              <p className="text-sm text-muted-foreground">No base stats defined.</p>
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
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Metadata</CardTitle>
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
                            {pack.is_enabled ? "Enabled" : "Disabled"}
                          </span>
                        )}
                        <Link
                          href={`/games/${gameId}/items?tab=gacha&editPack=${packId}`}
                          title="Open gacha pack editor"
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
                  <Plus className="h-3 w-3 mr-1" /> Add entry
                </Button>
              </div>
            ) : Object.keys(item.metadata ?? {}).filter((k) => !RESERVED_META_KEYS.includes(k)).length === 0 ? (
              <p className="text-sm text-muted-foreground">No metadata defined.</p>
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

      </div>
    </div>
  )
}

