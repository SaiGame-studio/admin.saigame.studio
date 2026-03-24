"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
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
import { Switch } from "@/components/ui/switch"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbList,
} from "@/components/ui/breadcrumb"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Store,
  Plus,
  ArrowLeft,
  AlertCircle,
  Calendar,
  ShoppingBag,
  PackageSearch,
  Loader2,
  Eye,
  RefreshCw,
  Hammer,
  Wand2,
  ChevronsUpDown,
  Check,
} from "lucide-react"
import Link from "next/link"
import { getGame } from "@/lib/game-api"
import { listItemDefinitions } from "@/lib/inventory-api"
import type { ItemDefinition } from "@/types/inventory"
import {
  listShops,
  createShopV1,
  updateShop,
  type ShopDefinition,
  type ShopType,
  type CreateShopPayload,
} from "@/lib/shop-admin-api"
import { useTranslation } from "@/lib/i18n/use-translation"
import { GameNavButtons } from "@/components/GameNavButtons"
import { CopyButton } from "@/components/CopyButton"

const SHOP_TYPE_BADGE: Record<ShopType, string> = {
  permanent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  event: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function getEventTimeStatus(starts_at: string | null | undefined, ends_at: string | null | undefined, t: (key: string) => string): {
  label: string
  className: string
} | null {
  const now = Date.now()
  const start = starts_at ? new Date(starts_at).getTime() : null
  const end = ends_at ? new Date(ends_at).getTime() : null

  function relTime(ms: number): string {
    const abs = Math.abs(ms)
    const mins = Math.floor(abs / 60000)
    const hours = Math.floor(abs / 3600000)
    const days = Math.floor(abs / 86400000)
    if (days >= 1) return `${days}d`
    if (hours >= 1) return `${hours}h`
    return `${mins}m`
  }

  if (end && now > end) {
    return { label: t('shop.endedAgo').replace('{time}', relTime(now - end)), className: "text-muted-foreground" }
  }
  if (start && now < start) {
    return { label: t('shop.startsIn').replace('{time}', relTime(start - now)), className: "text-yellow-600 dark:text-yellow-400 font-medium" }
  }
  if ((!start || now >= start) && end && now <= end) {
    return { label: t('shop.activeEndsIn').replace('{time}', relTime(end - now)), className: "text-green-600 dark:text-green-400 font-medium" }
  }
  return null
}

const defaultForm: CreateShopPayload = {
  shop_key: "",
  name: "",
  description: "",
  shop_type: "permanent",
  is_active: true,
  starts_at: "",
  ends_at: "",
  currency_item_def_id: "",
}

export default function GameShopsPage() {
  const params = useParams() as { id: string }
  const { t } = useTranslation()

  const SHOP_TYPE_LABELS: Record<ShopType, string> = {
    permanent: t('shop.permanent'),
    event: t('shop.eventType'),
  }

  const SHOP_TYPE_NO_DATE_LABEL: Record<ShopType, string> = {
    permanent: t('shop.availableForever'),
    event: t('shop.noDatesSet'),
  }

  const [shops, setShops] = useState<ShopDefinition[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [game, setGame] = useState<any>(null)
  const hasFetched = useRef(false)
  const activeOnlyInitialized = useRef(false)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<CreateShopPayload>(defaultForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [autoSlug, setAutoSlug] = useState(true)

  // Item defs for currency picker
  const [itemDefs, setItemDefs] = useState<ItemDefinition[]>([])
  const [itemDefsLoading, setItemDefsLoading] = useState(false)
  const [currencySearch, setCurrencySearch] = useState("")
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const [showAllItemTypes, setShowAllItemTypes] = useState(false)
  const itemDefsLoaded = useRef(false)

  async function ensureItemDefs() {
    if (itemDefsLoaded.current) return
    itemDefsLoaded.current = true
    setItemDefsLoading(true)
    try {
      const resp = await listItemDefinitions({ gameId: params.id }, { limit: 200 })
      setItemDefs(resp.items ?? [])
    } catch {
      // silently fail
    } finally {
      setItemDefsLoading(false)
    }
  }

  function toSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
  }

  function toDatetimeLocal(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  // Toggle active confirm
  const [pendingToggle, setPendingToggle] = useState<{ shopId: string; newActive: boolean } | null>(null)
  const [toggling, setToggling] = useState(false)

  // Filters
  const [activeOnly, setActiveOnly] = useState(false)

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    loadData(false).then(() => {
      activeOnlyInitialized.current = true
    })
  }, [params.id])

  useEffect(() => {
    if (!activeOnlyInitialized.current) return
    loadData(activeOnly)
  }, [activeOnly])

  async function loadData(filterActiveOnly = activeOnly) {
    try {
      setLoading(true)
      const gameData = await getGame(params.id)
      setGame(gameData)
      const resp = await listShops(params.id, { activeOnly: filterActiveOnly })
      setShops(resp.shops ?? [])
      setTotal(resp.total ?? 0)
    } catch (err: any) {
      setError(err?.message ?? "Failed to load shops")
    } finally {
      setLoading(false)
    }
  }

  function setField<K extends keyof CreateShopPayload>(key: K, value: CreateShopPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validateForm(): string | null {
    if (!form.shop_key.trim()) return "Shop key is required."
    if (!/^[a-z0-9_]+$/.test(form.shop_key))
      return "Shop key may only contain lowercase letters, digits, and underscores."
    if (!form.name.trim()) return "Name is required."
    if (!form.shop_type) return "Shop type is required."
    if (!form.currency_item_def_id?.trim()) return "Currency Item Def ID is required."
    if (form.shop_type === "event") {
      if (!form.starts_at) return "Start date is required for event shops."
      if (!form.ends_at) return "End date is required for event shops."
      if (new Date(form.ends_at) <= new Date(form.starts_at!))
        return "End date must be after start date."
    }
    if (
      form.currency_item_def_id &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        form.currency_item_def_id,
      )
    )
      return "Currency Item Def ID must be a valid UUID."
    return null
  }

  async function handleCreate() {
    const err = validateForm()
    if (err) { setFormError(err); return }
    setFormError(null)
    setCreating(true)
    try {
      const payload: CreateShopPayload = {
        shop_key: form.shop_key.trim(),
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        shop_type: form.shop_type,
        is_active: form.is_active,
      }
      if (form.starts_at) payload.starts_at = new Date(form.starts_at).toISOString()
      if (form.ends_at) payload.ends_at = new Date(form.ends_at).toISOString()
      if (form.currency_item_def_id?.trim())
        payload.currency_item_def_id = form.currency_item_def_id.trim()

      await createShopV1(params.id, payload)
      setCreateOpen(false)
      setForm(defaultForm)
      hasFetched.current = false
      loadData()
    } catch (err: any) {
      setFormError(err?.message ?? "Failed to create shop")
    } finally {
      setCreating(false)
    }
  }

  function openCreate() {
    setForm(defaultForm)
    setFormError(null)
    setCreateOpen(true)
    setAutoSlug(true)
    setCurrencySearch("")
    setShowAllItemTypes(false)
    ensureItemDefs()
  }

  async function confirmToggleActive() {
    if (!pendingToggle) return
    setToggling(true)
    try {
      const updated = await updateShop(params.id, pendingToggle.shopId, { is_active: pendingToggle.newActive })
      setShops((prev) => prev.map((s) => s.id === updated.id ? updated : s))
    } catch (err: any) {
      setError(err?.message ?? "Failed to update shop")
    } finally {
      setToggling(false)
      setPendingToggle(null)
    }
  }

  const needsDates = form.shop_type === "event"

  return (
    <div className="container mx-auto py-6">
      {/* Breadcrumb */}
      {game && (
        <div className="mb-2">
          <Breadcrumb>
            <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
              <BreadcrumbItem>
                <BreadcrumbLink href="/studios">{game.studio?.name || t('common.studios')}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink href={`/games/${params.id}`}>{game.name}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>
                <span>{t('breadcrumb.shops')}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/games/${params.id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('breadcrumb.shops')}{game ? ` - ${game.name}` : ""}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              {game?.limits?.max_shops != null
                ? (() => {
                    const used = game.usage?.shops ?? 0
                    const max = game.limits.max_shops
                    const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0
                    return (
                      <>
                        <span className={used >= max ? "text-destructive font-medium" : ""}>
                          {used.toLocaleString()} / {max.toLocaleString()} {t('shop.shopsCount')}
                        </span>
                        <span className="inline-block h-1.5 w-24 rounded-full bg-muted overflow-hidden align-middle">
                          <span
                            className={`block h-full rounded-full transition-all ${
                              used >= max ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-primary"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <Link
                          href={`/games/${params.id}/plugins`}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                          title="Manage plugins / raise limits"
                        >
                          <Hammer className="h-3.5 w-3.5" />
                        </Link>
                      </>
                    )
                  })()
                : <span>{total.toLocaleString()} {t('shop.shopsCount')}</span>
              }
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <GameNavButtons gameId={params.id} active="shops" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <div>
          <h2 className="text-lg font-semibold">{t('breadcrumb.shops')}</h2>
          <p className="text-sm text-muted-foreground">
            {total > 0 ? `${total.toLocaleString()} ${total !== 1 ? t('shop.shopsDefined') : t('shop.shopDefined')}` : t('shop.noShopsYet')}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex items-center gap-2 mr-2">
            <Checkbox
              id="active_only"
              checked={activeOnly}
              onCheckedChange={(v) => setActiveOnly(!!v)}
            />
            <label htmlFor="active_only" className="text-sm cursor-pointer select-none">
              {t('shop.activeOnly')}
            </label>
          </div>
          <Button variant="outline" size="icon" onClick={() => loadData(activeOnly)} disabled={loading} title={t('common.refresh')}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            onClick={openCreate}
            disabled={
              game?.limits?.max_shops != null &&
              (game?.usage?.shops ?? 0) >= game.limits.max_shops
            }
            title={
              game?.limits?.max_shops != null &&
              (game?.usage?.shops ?? 0) >= game.limits.max_shops
                ? t('shop.shopLimitReached').replace('{used}', String(game.limits.max_shops)).replace('{max}', String(game.limits.max_shops))
                : undefined
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('shop.newShop')}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading / Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error && shops.length === 0 ? null : shops.length === 0 ? (
        <Card className="text-center p-6">
          <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
            <PackageSearch className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="font-semibold text-lg">{t('shop.noShopsYet')}</p>
              <p className="text-sm text-muted-foreground">
                {t('shop.createFirstShopDesc')}
              </p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t('shop.createShop')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shops.map((shop) => (
              <Card key={shop.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{shop.name}</CardTitle>
                      <CardDescription className="text-xs font-mono truncate">
                        {shop.shop_key}
                      </CardDescription>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-muted-foreground/60 font-mono truncate">{shop.id}</span>
                        <CopyButton text={shop.id} className="shrink-0" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={shop.is_active}
                        onCheckedChange={(checked) => setPendingToggle({ shopId: shop.id, newActive: checked })}
                        title={shop.is_active ? t('shop.deactivateShop') : t('shop.activateShop')}
                      />
                      <span className="text-xs text-muted-foreground">{shop.is_active ? t('common.active') : t('common.inactive')}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SHOP_TYPE_BADGE[shop.shop_type]}`}>
                      {SHOP_TYPE_LABELS[shop.shop_type]}
                    </span>
                  </div>
                  {shop.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 h-10 overflow-hidden">
                      {shop.description}
                    </p>
                  )}
                  {!shop.description && <div className="h-10" />}
                  {shop.shop_type === "event" && (shop.starts_at || shop.ends_at) ? (
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {formatDate(shop.starts_at)} — {formatDate(shop.ends_at)}
                      </span>
                      {(() => {
                        const s = getEventTimeStatus(shop.starts_at, shop.ends_at, t)
                        return s ? <span className={s.className}>{s.label}</span> : null
                      })()}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground italic">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {SHOP_TYPE_NO_DATE_LABEL[shop.shop_type]}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground pt-2 border-t flex justify-between items-center gap-2">
                    <div className="flex items-center gap-1">
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>{shop.item_count ?? 0} {(shop.item_count ?? 0) !== 1 ? t('shop.itemPlural') : t('shop.itemSingular')}</span>
                      {shop.item_limit != null && (
                        <span className="text-muted-foreground">/ {shop.item_limit}</span>
                      )}
                    </div>
                    <Button asChild variant="outline" size="icon" title={t('shop.viewShopDetails')}>
                      <Link href={`/games/${params.id}/shops/${shop.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ── Toggle Active Confirm ──────────────────────────────── */}
      <AlertDialog open={!!pendingToggle} onOpenChange={(open) => { if (!open) setPendingToggle(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingToggle?.newActive ? t('shop.activateShopQ') : t('shop.deactivateShopQ')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingToggle?.newActive ? t('shop.activateShopDesc') : t('shop.deactivateShopDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggling}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggleActive} disabled={toggling}>
              {toggling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Create Shop Sheet ─────────────────────────────────── */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="sm:max-w-[580px] flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle>{t('shop.createNewShop')}</SheetTitle>
            <SheetDescription>
              {t('shop.createNewShopDesc')}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="shop_name">
                {t('shop.name')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="shop_name"
                placeholder={t('shop.shopNamePlaceholder')}
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value
                  setField("name", name)
                  if (autoSlug) setField("shop_key", toSlug(name))
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shop_key">
                {t('shop.shopKey')} <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-1.5">
                <Input
                  id="shop_key"
                  placeholder={t('shop.shopKeyPlaceholder')}
                  value={form.shop_key}
                  onChange={(e) => {
                    setAutoSlug(false)
                    setField("shop_key", e.target.value.toLowerCase())
                  }}
                  className="font-mono"
                />
                <button
                  type="button"
                  title={autoSlug ? t('shop.autoSlugOn') : t('shop.autoSlugOff')}
                  onClick={() => {
                    const next = !autoSlug
                    setAutoSlug(next)
                    if (next) setField("shop_key", toSlug(form.name))
                  }}
                  className={`shrink-0 h-9 w-9 rounded-md border flex items-center justify-center transition-colors ${
                    autoSlug
                      ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                      : "bg-muted text-muted-foreground border-input hover:bg-accent"
                  }`}
                >
                  <Wand2 className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('shop.shopKeyDesc')}
                {autoSlug && <span className="text-primary ml-1">{t('shop.autoGenFromName')}</span>}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>
                {t('shop.shopType')} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.shop_type}
                onValueChange={(v) => setField("shop_type", v as ShopType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SHOP_TYPE_LABELS) as ShopType[]).map((st) => (
                    <SelectItem key={st} value={st}>
                      {SHOP_TYPE_LABELS[st]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsDates && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="starts_at">
                    {t('shop.startDate')}
                    {form.shop_type === "event" && <span className="text-destructive"> *</span>}
                  </Label>
                  <div className="flex gap-1.5">
                    <Input
                      id="starts_at"
                      type="date"
                      value={form.starts_at?.split("T")[0] ?? ""}
                      onChange={(e) => {
                        const time = form.starts_at?.split("T")[1] ?? "00:00"
                        setField("starts_at", e.target.value ? `${e.target.value}T${time}` : "")
                      }}
                      className="flex-1"
                    />
                    <Input
                      type="time"
                      lang="en-GB"
                      value={form.starts_at?.split("T")[1] ?? ""}
                      onChange={(e) => {
                        const date = form.starts_at?.split("T")[0] ?? new Date().toISOString().split("T")[0]
                        setField("starts_at", e.target.value ? `${date}T${e.target.value}` : "")
                      }}
                      className="w-[110px]"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setField("starts_at", toDatetimeLocal(new Date()))}
                    >
                      {t('shop.now')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        const d = new Date()
                        d.setMonth(d.getMonth() + 1, 1)
                        d.setHours(0, 0, 0, 0)
                        setField("starts_at", toDatetimeLocal(d))
                      }}
                    >
                      {t('shop.startOfNextMonth')}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ends_at">
                    {t('shop.endDate')}
                    {form.shop_type === "event" && <span className="text-destructive"> *</span>}
                  </Label>
                  <div className="flex gap-1.5">
                    <Input
                      id="ends_at"
                      type="date"
                      value={form.ends_at?.split("T")[0] ?? ""}
                      onChange={(e) => {
                        const time = form.ends_at?.split("T")[1] ?? "23:59"
                        setField("ends_at", e.target.value ? `${e.target.value}T${time}` : "")
                      }}
                      className="flex-1"
                    />
                    <Input
                      type="time"
                      lang="en-GB"
                      value={form.ends_at?.split("T")[1] ?? ""}
                      onChange={(e) => {
                        const date = form.ends_at?.split("T")[0] ?? new Date().toISOString().split("T")[0]
                        setField("ends_at", e.target.value ? `${date}T${e.target.value}` : "")
                      }}
                      className="w-[110px]"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        const d = new Date()
                        d.setDate(d.getDate() + 14)
                        setField("ends_at", toDatetimeLocal(d))
                      }}
                    >
                      {t('shop.twoWeeks')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        const d = new Date()
                        d.setMonth(d.getMonth() + 2, 0)
                        d.setHours(23, 59, 0, 0)
                        setField("ends_at", toDatetimeLocal(d))
                      }}
                    >
                      {t('shop.endOfNextMonth')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>
                {t('shop.currencyItemDef')} <span className="text-destructive">*</span>
              </Label>
              <Popover open={currencyOpen} onOpenChange={setCurrencyOpen} modal={false}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={currencyOpen}
                    className="w-full justify-between font-normal"
                    disabled={itemDefsLoading}
                  >
                    {itemDefsLoading ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                      </span>
                    ) : form.currency_item_def_id ? (
                      <span className="flex items-center gap-2">
                        <span>
                          {itemDefs.find((d) => d.id === form.currency_item_def_id)?.name ?? (
                            <span className="font-mono text-xs">{form.currency_item_def_id}</span>
                          )}
                        </span>
                        {itemDefs.find((d) => d.id === form.currency_item_def_id) && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {itemDefs.find((d) => d.id === form.currency_item_def_id)!.item_code}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{t('shop.selectCurrencyItem')}</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                  style={{ zIndex: 9999 }}
                >
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t('shop.searchByNameOrCode')}
                      value={currencySearch}
                      onValueChange={setCurrencySearch}
                    />
                    <CommandList>
                      <CommandEmpty>{t('shop.noItemFound')}</CommandEmpty>
                      <CommandGroup>
                        {itemDefs
                          .filter(
                            (d) =>
                              (showAllItemTypes || d.category === "currency") &&
                              (d.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
                                d.item_code.toLowerCase().includes(currencySearch.toLowerCase())),
                          )
                          .slice(0, 30)
                          .map((d) => (
                            <CommandItem
                              key={d.id}
                              value={d.id}
                              onSelect={() => {
                                setField("currency_item_def_id", d.id)
                                setCurrencyOpen(false)
                                setCurrencySearch("")
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 shrink-0 ${
                                  form.currency_item_def_id === d.id ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              <span className="flex-1">{d.name}</span>
                              <span className="ml-2 text-xs text-muted-foreground font-mono">
                                {d.item_code}
                              </span>
                              <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                                {d.category}
                              </span>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="flex items-center gap-2 pt-0.5">
                <Checkbox
                  id="show_all_types"
                  checked={showAllItemTypes}
                  onCheckedChange={(v) => setShowAllItemTypes(!!v)}
                />
                <label
                  htmlFor="show_all_types"
                  className="text-xs text-muted-foreground cursor-pointer select-none"
                >
                  {t('shop.showAllItemTypes')}
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('shop.currencyItemDesc')}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(v) => setField("is_active", v)}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                {t('shop.activeImmediately')}
              </Label>
            </div>

            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="shrink-0 border-t px-6 py-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('shop.createShop')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
