"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Dices, Package, Plus, Pencil, Trash2, Save, X,
  ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { getGame } from "@/lib/game-api"
import {
  listGachaPacks, createGachaPack, updateGachaPack, deleteGachaPack, setGachaPackEnabled,
  listCurrencyItems, listItemDefinitions,
} from "@/lib/inventory-api"
import type { GachaPack, ItemDefinition, GachaPoolEntry } from "@/types/inventory"
import { GameNavButtons } from "@/components/GameNavButtons"

// ─── helpers ─────────────────────────────────────────────────────────────────

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

// ─── pool row form state ──────────────────────────────────────────────────────

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

function emptyForm() {
  return {
    name: "",
    currency_item_definition_id: "",
    cost: "100",
    is_enabled: true,
    pool: [EMPTY_ROW()],
  }
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function GameGachaPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const { toast } = useToast()
  const gameId = params.id

  const [gameName, setGameName] = useState("")
  const [packs, setPacks] = useState<GachaPack[]>([])
  const [currencies, setCurrencies] = useState<ItemDefinition[]>([])
  const [allItems, setAllItems] = useState<ItemDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // pack expansion state
  const [expandedPack, setExpandedPack] = useState<string | null>(null)

  // sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingPack, setEditingPack] = useState<GachaPack | null>(null)
  const [formSaving, setFormSaving] = useState(false)
  const [form, setForm] = useState(emptyForm())

  // delete dialog state
  const [deletingPack, setDeletingPack] = useState<GachaPack | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // toggling enabled state (by pack id)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // ── load ───────────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const game = await getGame(gameId)
      setGameName(game.name)
      const ctx = { gameId }
      const [packsRes, curRes, itemsRes] = await Promise.all([
        listGachaPacks(ctx),
        listCurrencyItems(ctx),
        listItemDefinitions(ctx, { limit: 200 }),
      ])
      setPacks(packsRes.packs ?? [])
      setCurrencies(curRes)
      setAllItems(itemsRes.items ?? [])
    } catch (err: any) {
      setError(err?.message ?? "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [gameId])

  useEffect(() => { loadAll() }, [loadAll])

  // ── sheet helpers ──────────────────────────────────────────────────────────

  function openCreate() {
    setEditingPack(null)
    setForm(emptyForm())
    setSheetOpen(true)
  }

  function openEdit(pack: GachaPack) {
    setEditingPack(pack)
    setForm({
      name: pack.name,
      currency_item_definition_id: pack.currency_item_definition_id,
      cost: String(pack.cost),
      is_enabled: pack.is_enabled,
      pool: pack.item_pool.length > 0
        ? pack.item_pool.map((e) => ({
            item_definition_id: e.item_definition_id,
            weight: String(e.weight),
            quantity_min: String(e.quantity_min),
            quantity_max: String(e.quantity_max),
          }))
        : [EMPTY_ROW()],
    })
    setSheetOpen(true)
  }

  function updatePoolRow(index: number, patch: Partial<PoolRow>) {
    setForm((f) => ({ ...f, pool: f.pool.map((r, i) => i === index ? { ...r, ...patch } : r) }))
  }

  function addPoolRow() {
    setForm((f) => ({ ...f, pool: [...f.pool, EMPTY_ROW()] }))
  }

  function removePoolRow(index: number) {
    setForm((f) => ({ ...f, pool: f.pool.filter((_, i) => i !== index) }))
  }

  // ── save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.name.trim()) { toast({ variant: "destructive", title: "Name is required" }); return }
    if (!form.currency_item_definition_id) { toast({ variant: "destructive", title: "Select a currency item" }); return }
    const costNum = Number(form.cost)
    if (!costNum || costNum <= 0) { toast({ variant: "destructive", title: "Cost must be > 0" }); return }

    const item_pool: GachaPoolEntry[] = form.pool
      .filter((r) => r.item_definition_id.trim())
      .map((r) => ({
        item_definition_id: r.item_definition_id.trim(),
        weight: Math.max(1, Number(r.weight) || 1),
        quantity_min: Math.max(1, Number(r.quantity_min) || 1),
        quantity_max: Math.max(Number(r.quantity_min) || 1, Number(r.quantity_max) || 1),
      }))

    setFormSaving(true)
    try {
      const ctx = { gameId }
      if (editingPack) {
        const res = await updateGachaPack(ctx, editingPack.id, {
          name: form.name.trim(),
          currency_item_definition_id: form.currency_item_definition_id,
          cost: costNum,
          is_enabled: form.is_enabled,
          item_pool,
        })
        setPacks((prev) => prev.map((p) => p.id === editingPack.id ? res.pack : p))
        toast({ title: "Pack updated" })
      } else {
        const res = await createGachaPack(ctx, {
          name: form.name.trim(),
          currency_item_definition_id: form.currency_item_definition_id,
          cost: costNum,
          is_enabled: form.is_enabled,
          item_pool,
        })
        setPacks((prev) => [res.pack, ...prev])
        toast({ title: "Pack created" })
      }
      setSheetOpen(false)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save failed", description: err?.message ?? "Unknown error" })
    } finally {
      setFormSaving(false)
    }
  }

  // ── toggle enabled ─────────────────────────────────────────────────────────

  async function handleToggle(pack: GachaPack) {
    setTogglingId(pack.id)
    try {
      const res = await setGachaPackEnabled({ gameId }, pack.id, !pack.is_enabled)
      setPacks((prev) => prev.map((p) => p.id === pack.id ? { ...p, is_enabled: res.is_enabled } : p))
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to toggle pack", description: err?.message })
    } finally {
      setTogglingId(null)
    }
  }

  // ── delete ─────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deletingPack) return
    setDeleteLoading(true)
    try {
      await deleteGachaPack({ gameId }, deletingPack.id)
      setPacks((prev) => prev.filter((p) => p.id !== deletingPack.id))
      toast({ title: "Pack deleted" })
      setDeletingPack(null)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete failed", description: err?.message })
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── pool total weight (for form preview) ──────────────────────────────────

  const formTotalWeight = form.pool.reduce((s, r) => s + (Number(r.weight) || 0), 0)

  // ── item lookup by id ──────────────────────────────────────────────────────

  function itemName(id: string) {
    const it = allItems.find((i) => i.id === id)
    if (!it) return <code className="text-xs">{id.slice(0, 8)}…</code>
    return <span>{it.name} <span className="text-muted-foreground text-xs">({it.item_code || it.id.slice(0, 6)})</span></span>
  }

  function currencyName(id: string) {
    return currencies.find((c) => c.id === id)?.name ?? id.slice(0, 8) + "…"
  }

  // ── render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive">
          <CardContent className="pt-6 text-destructive">{error}</CardContent>
        </Card>
      </div>
    )
  }

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
            <BreadcrumbItem><span>Loot Box Packs</span></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Loot Box Packs
            </h1>
            <p className="text-muted-foreground">{packs.length} pack{packs.length !== 1 ? "s" : ""} configured</p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Pack
          </Button>
          <div className="w-px h-6 bg-border" />
          <GameNavButtons gameId={gameId} active="gacha" />
        </div>
      </div>

      {/* Empty state */}
      {packs.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <Dices className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No loot box packs yet</p>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create first pack</Button>
          </CardContent>
        </Card>
      )}

      {/* Pack cards */}
      <div className="space-y-4">
        {packs.map((pack) => {
          const totalWeight = pack.item_pool.reduce((s, e) => s + e.weight, 0)
          const isExpanded = expandedPack === pack.id
          return (
            <Card key={pack.id} className={`transition-all ${!pack.is_enabled ? "opacity-60" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <CardTitle className="text-base truncate">{pack.name}</CardTitle>
                    <Badge
                      variant={pack.is_enabled ? "default" : "secondary"}
                      className="text-xs shrink-0"
                    >
                      {pack.is_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={pack.is_enabled}
                      onCheckedChange={() => handleToggle(pack)}
                      disabled={togglingId === pack.id}
                      title={pack.is_enabled ? "Disable pack" : "Enable pack"}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(pack)}>
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

                {/* Summary row */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span>💰 Cost: <strong className="text-foreground">{pack.cost.toLocaleString()}</strong> {currencyName(pack.currency_item_definition_id)}</span>
                  <span>🎲 {pack.item_pool.length} item{pack.item_pool.length !== 1 ? "s" : ""} in pool</span>
                  {totalWeight > 0 && (
                    <span className="text-xs">total weight {totalWeight.toLocaleString()}</span>
                  )}
                </div>
              </CardHeader>

              {/* Pool preview — collapse/expand */}
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
                              <span className="truncate text-xs">{itemName(entry.item_definition_id)}</span>
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

      {/* ── Create / Edit Sheet ──────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{editingPack ? `Edit: ${editingPack.name}` : "New Loot Box Pack"}</SheetTitle>
            <SheetDescription className="text-xs">
              Configure pack name, cost currency, and item drop pool weights.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Standard Pack"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                disabled={formSaving}
              />
            </div>

            {/* Currency + Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Currency Item <span className="text-destructive">*</span></Label>
                <Select
                  value={form.currency_item_definition_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, currency_item_definition_id: v }))}
                  disabled={formSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency…" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.length === 0 ? (
                      <SelectItem value="__none" disabled>No currency items found</SelectItem>
                    ) : (
                      currencies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cost <span className="text-destructive">*</span></Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="100"
                  className="font-mono"
                  value={form.cost ? Number(form.cost).toLocaleString() : ""}
                  onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value.replace(/[^0-9]/g, "") }))}
                  disabled={formSaving}
                />
              </div>
            </div>

            {/* Enabled */}
            <div className="flex items-center gap-3">
              <Switch
                id="enabled"
                checked={form.is_enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_enabled: v }))}
                disabled={formSaving}
              />
              <Label htmlFor="enabled" className="cursor-pointer">Enabled</Label>
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

              {/* Header row */}
              {form.pool.length > 0 && (
                <div className="text-xs text-muted-foreground grid grid-cols-[1fr_110px_60px_60px_32px] gap-1.5 px-1 font-medium">
                  <span>Item</span>
                  <span>Weight</span>
                  <span>Min</span>
                  <span>Max</span>
                  <span />
                </div>
              )}

              <div className="space-y-2">
                {form.pool.map((row, i) => {
                  const pct = formTotalWeight > 0 ? ((Number(row.weight) || 0) / formTotalWeight * 100) : 0
                  return (
                    <div key={i} className="grid grid-cols-[1fr_110px_60px_60px_32px] gap-1.5 items-center">
                      {/* Item select */}
                      <Select
                        value={row.item_definition_id}
                        onValueChange={(v) => updatePoolRow(i, { item_definition_id: v })}
                        disabled={formSaving}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select item…" />
                        </SelectTrigger>
                        <SelectContent>
                          {allItems.map((it) => (
                            <SelectItem key={it.id} value={it.id} className="text-xs">
                              {it.name} {it.item_code && <span className="text-muted-foreground">({it.item_code})</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Weight */}
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
                      {/* Qty min */}
                      <Input
                        type="number"
                        min={1}
                        className="h-8 text-xs text-center"
                        value={row.quantity_min}
                        onChange={(e) => updatePoolRow(i, { quantity_min: e.target.value })}
                        disabled={formSaving}
                      />
                      {/* Qty max */}
                      <Input
                        type="number"
                        min={1}
                        className="h-8 text-xs text-center"
                        value={row.quantity_max}
                        onChange={(e) => updatePoolRow(i, { quantity_max: e.target.value })}
                        disabled={formSaving}
                      />
                      {/* Delete */}
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

              {/* Drop rate mini preview */}
              {form.pool.some((r) => r.item_definition_id && Number(r.weight) > 0) && (
                <div className="mt-3 rounded border bg-muted/40 p-3 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Drop rate preview</p>
                  {[...form.pool]
                    .filter((r) => r.item_definition_id)
                    .sort((a, b) => (Number(b.weight) || 0) - (Number(a.weight) || 0))
                    .map((row, i) => {
                      const item = allItems.find((it) => it.id === row.item_definition_id)
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="flex-1 truncate">{item?.name ?? row.item_definition_id.slice(0, 8)}</span>
                          <DropBar weight={Number(row.weight) || 0} total={formTotalWeight} />
                        </div>
                      )
                    })}
                </div>
              )}

              {form.pool.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  No items added. The pack can be saved with an empty pool (players cannot open it until items are added).
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-6 mt-4 border-t">
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={formSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={formSaving}>
              {formSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editingPack ? "Save changes" : "Create pack"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Delete confirmation ──────────────────────────────────────────────── */}
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
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
