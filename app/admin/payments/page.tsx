"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Gift,
  Loader2,
  BadgeDollarSign,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  CreditCard,
  Building2,
  ToggleLeft,
  ToggleRight,
  Package,
  Star,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react"

import { useCapabilities } from "@/hooks/use-capabilities"
import { CopyButton } from "@/components/CopyButton"
import {
  GiftCode,
  listGiftCodes,
  deleteGiftCode,
  adminCoinTopUp,
  type CoinTransaction,
  type PaymentMethodConfig,
  listPaymentMethods,
  updatePaymentMethod,
  type SPackage,
  listSPackages,
  getSPackage,
  createSPackage,
  updateSPackage,
  deleteSPackage,
  listAdminTransactions,
  manuallyCreditTransaction,
  type AdminTransaction,
  type AdminTransactionStatus,
} from "@/lib/admin-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/use-translation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getUserTimezone } from "@/lib/utils/date-utils"

const LIMIT = 20

// ---------------------------------------------------------------------------
// Transaction helpers
// ---------------------------------------------------------------------------
type StatusFilter = AdminTransactionStatus | ""

const TX_STATUS_COLORS: Record<AdminTransactionStatus, string> = {
  completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  credit_failed: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  awaiting_payment: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  expired: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
}

function TxStatusBadge({ status }: { status: AdminTransactionStatus }) {
  const { t } = useTranslation()
  const labelKey = `adminTransactions.status${status.split("_").map((s) => s[0].toUpperCase() + s.slice(1)).join("")}` as string
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TX_STATUS_COLORS[status] ?? ""}`}>
      {t(labelKey)}
    </span>
  )
}

function formatTxAmount(amount: number, currency: string) {
  if (currency === "VND") return amount.toLocaleString("vi-VN") + " ₫"
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100)
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`
  }
}

const TX_LIMIT = 50

// ---------------------------------------------------------------------------
// Package info fetcher (with module-level cache)
// ---------------------------------------------------------------------------
const pkgCache = new Map<string, SPackage>()

function PackageInfoRow({ packageId }: { packageId: string }) {
  const [pkg, setPkg] = useState<SPackage | null>(() => pkgCache.get(packageId) ?? null)
  const [loading, setLoading] = useState(!pkgCache.has(packageId))

  useEffect(() => {
    if (pkgCache.has(packageId)) return
    getSPackage(packageId)
      .then((p) => { pkgCache.set(packageId, p); setPkg(p) })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-0.5 sm:col-span-2 lg:col-span-3 rounded-md border border-border/50 bg-muted/20 px-3 py-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Package</p>
      {loading ? (
        <Skeleton className="h-4 w-48" />
      ) : pkg ? (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <span className="font-medium">{pkg.name}</span>
          <span className="text-muted-foreground font-mono">{pkg.package_key}</span>
          <span>🪙 {pkg.scoin_amount.toLocaleString()}{pkg.bonus_scoin > 0 ? <span className="text-green-500 ml-1">+{pkg.bonus_scoin.toLocaleString()} bonus</span> : null}</span>
          <span className="font-semibold">{formatTxAmount(pkg.price_amount, pkg.price_currency)}</span>
        </div>
      ) : (
        <p className="font-mono text-xs text-muted-foreground break-all">{packageId}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Manually Credit Button (inline in expanded row)
// ---------------------------------------------------------------------------
function ManuallyCreditButton({ txId, onSuccess }: { txId: string; onSuccess: () => void }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("Thank you for your payment. We have manually credited your sCoin balance.")
  const [submitting, setSubmitting] = useState(false)

  async function handleConfirm() {
    if (!reason.trim()) return
    setSubmitting(true)
    try {
      await manuallyCreditTransaction(txId, reason.trim())
      toast({ title: "Manually credited successfully." })
      setOpen(false)
      setReason("")
      onSuccess()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to manually credit."
      toast({ variant: "destructive", title: msg })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="destructive"
        className="h-7 gap-1 text-xs"
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
      >
        Manually Credit
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Manually Credit Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              This will force-credit sCoin for transaction <span className="font-mono text-xs break-all">{txId}</span>. Provide a reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            className="mt-2 min-h-[80px]"
            placeholder="e.g. coin service timeout, confirmed payment with provider…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!reason.trim() || submitting}
              onClick={handleConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// Status logic
// ---------------------------------------------------------------------------
type GiftCodeStatus = "Draft" | "Scheduled" | "Expired" | "Exhausted" | "Active"

function getStatus(gc: GiftCode): GiftCodeStatus {
  const now = new Date()
  if (!gc.active_at) return "Draft"
  if (new Date(gc.active_at) > now) return "Scheduled"
  if (gc.expires_at && new Date(gc.expires_at) < now) return "Expired"
  if (gc.max_uses !== -1 && gc.used_count >= gc.max_uses) return "Exhausted"
  return "Active"
}

const STATUS_CLASSES: Record<GiftCodeStatus, string> = {
  Draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  Expired: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  Exhausted: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  Active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
}

function StatusBadge({ gc }: { gc: GiftCode }) {
  const { t } = useTranslation()
  const status = getStatus(gc)
  const STATUS_LABELS: Record<GiftCodeStatus, string> = {
    Draft: t('adminGiftCodes.statusDraft'),
    Scheduled: t('adminGiftCodes.statusScheduled'),
    Expired: t('adminGiftCodes.statusExpired'),
    Exhausted: t('adminGiftCodes.statusExhausted'),
    Active: t('adminGiftCodes.statusActive'),
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function formatDt(iso: string | null, neverLabel = "Never") {
  if (!iso) return neverLabel
  return new Date(iso).toLocaleString(undefined, {
    timeZone: getUserTimezone(),
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function usesLabel(max_uses: number, unlimitedLabel = "\u221e Unlimited", singleLabel = "1 (single)") {
  if (max_uses === -1) return unlimitedLabel
  if (max_uses === 1) return singleLabel
  return String(max_uses)
}

// ---------------------------------------------------------------------------
// Payment method icon helper
// ---------------------------------------------------------------------------
function MethodIcon({ providerKey, iconUrl }: { providerKey: string; iconUrl?: string }) {
  if (iconUrl) {
    return <img src={iconUrl} alt={providerKey} className="h-7 w-7 object-contain" />
  }
  if (providerKey === "bank_transfer_vn") return <Building2 className="h-5 w-5" />
  return <CreditCard className="h-5 w-5" />
}

// ---------------------------------------------------------------------------
// Edit Payment Method Dialog
// ---------------------------------------------------------------------------
interface EditMethodDialogProps {
  method: PaymentMethodConfig | null
  open: boolean
  onClose: () => void
  onSaved: (updated: PaymentMethodConfig) => void
}

function EditMethodDialog({ method, open, onClose, onSaved }: EditMethodDialogProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [displayName, setDisplayName] = useState("")
  const [description, setDescription] = useState("")
  const [iconUrl, setIconUrl] = useState("")
  const [isActive, setIsActive] = useState(false)
  const [supportsSubscription, setSupportsSubscription] = useState(false)
  const [webhookSuffix, setWebhookSuffix] = useState("")
  const [configJson, setConfigJson] = useState("{}")
  const [configError, setConfigError] = useState("")
  const [sortOrder, setSortOrder] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (method) {
      setDisplayName(method.display_name)
      setDescription(method.description)
      setIconUrl(method.icon_url ?? "")
      setIsActive(method.is_active)
      setSupportsSubscription(method.supports_subscription)
      setWebhookSuffix(method.webhook_endpoint_suffix ?? "")
      setConfigJson(JSON.stringify(method.config ?? {}, null, 2))
      setConfigError("")
      setSortOrder(String(method.sort_order))
    }
  }, [method])

  function validateConfig(val: string) {
    try { JSON.parse(val); setConfigError("") }
    catch { setConfigError(t('adminPayments.configInvalid')) }
  }

  async function handleSave() {
    if (!method) return
    let parsedConfig: Record<string, unknown> = {}
    try { parsedConfig = JSON.parse(configJson) }
    catch { setConfigError(t('adminPayments.configInvalid')); return }
    setSaving(true)
    try {
      const updated = await updatePaymentMethod(method.id, {
        display_name: displayName.trim(),
        description: description.trim(),
        icon_url: iconUrl.trim(),
        is_active: isActive,
        supports_subscription: supportsSubscription,
        webhook_endpoint_suffix: webhookSuffix.trim(),
        config: parsedConfig,
        sort_order: parseInt(sortOrder, 10) || 0,
      })
      toast({ title: t('adminPayments.saveSuccess') })
      onSaved(updated)
      onClose()
    } catch (err: any) {
      toast({ variant: "destructive", title: t('adminPayments.saveFailed'), description: err?.data?.error ?? err?.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{t('adminPayments.editTitle')}</SheetTitle>
          <SheetDescription className="font-mono text-xs">{method?.provider_key}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Display Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-display-name">{t('adminPayments.fieldDisplayName')}</Label>
            <Input
              id="edit-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={saving}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-description">{t('adminPayments.fieldDescription')}</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Icon URL */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-icon-url">{t('adminPayments.fieldIconUrl')}</Label>
            <div className="flex gap-2">
              <Input
                id="edit-icon-url"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                disabled={saving}
                placeholder="https://cdn.example.com/icons/method.png"
              />
              {iconUrl && (
                <img src={iconUrl} alt="icon preview" className="h-9 w-9 flex-shrink-0 rounded border object-contain p-1" />
              )}
            </div>
          </div>

          {/* Webhook Suffix */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-webhook">{t('adminPayments.fieldWebhookSuffix')}</Label>
            <Input
              id="edit-webhook"
              value={webhookSuffix}
              onChange={(e) => setWebhookSuffix(e.target.value)}
              disabled={saving}
              placeholder="/webhooks/payment/method_key"
              className="font-mono text-sm"
            />
          </div>

          {/* Sort Order */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-sort-order">{t('adminPayments.fieldSortOrder')}</Label>
            <Input
              id="edit-sort-order"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              disabled={saving}
            />
          </div>

          {/* Toggles */}
          <div className="rounded-lg border bg-muted/40 divide-y">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{t('adminPayments.fieldIsActive')}</p>
                <p className="text-xs text-muted-foreground">{t('adminPayments.fieldIsActiveDesc')}</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} disabled={saving} />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{t('adminPayments.fieldSupportsSubscription')}</p>
                <p className="text-xs text-muted-foreground">{t('adminPayments.fieldSupportsSubscriptionDesc')}</p>
              </div>
              <Switch checked={supportsSubscription} onCheckedChange={setSupportsSubscription} disabled={saving} />
            </div>
          </div>

          {/* Config JSON */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-config">{t('adminPayments.fieldConfig')}</Label>
            <Textarea
              id="edit-config"
              value={configJson}
              onChange={(e) => { setConfigJson(e.target.value); validateConfig(e.target.value) }}
              disabled={saving}
              rows={5}
              spellCheck={false}
              className="font-mono text-xs resize-none"
            />
            {configError && <p className="text-xs text-destructive">{configError}</p>}
          </div>
        </div>

        <SheetFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !displayName.trim() || !!configError}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Payment Methods tab
// ---------------------------------------------------------------------------
function PaymentMethodsTab() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [methods, setMethods] = useState<PaymentMethodConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<PaymentMethodConfig | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listPaymentMethods()
      setMethods((res.methods ?? []).sort((a, b) => a.sort_order - b.sort_order))
    } catch {
      toast({ variant: "destructive", title: t('adminPayments.loadFailed') })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  async function handleToggle(method: PaymentMethodConfig) {
    setToggling(method.id)
    try {
      const updated = await updatePaymentMethod(method.id, { is_active: !method.is_active })
      setMethods((prev) => prev.map((m) => m.id === updated.id ? updated : m))
      toast({ title: updated.is_active ? t('adminPayments.enabledSuccess') : t('adminPayments.disabledSuccess') })
    } catch (err: any) {
      toast({ variant: "destructive", title: t('adminPayments.toggleFailed'), description: err?.data?.error ?? err?.message })
    } finally {
      setToggling(null)
    }
  }

  function handleSaved(updated: PaymentMethodConfig) {
    setMethods((prev) => prev.map((m) => m.id === updated.id ? updated : m))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {methods.length} {t('adminPayments.methodsTotal')}
        </p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t('adminGiftCodes.refresh')}
        </Button>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-72" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : methods.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {t('adminPayments.noMethods')}
            </CardContent>
          </Card>
        ) : (
          methods.map((method) => (
            <Card key={method.id} className={method.is_active ? "" : "opacity-60"}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border bg-background shadow-sm">
                    <MethodIcon providerKey={method.provider_key} iconUrl={method.icon_url} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{method.display_name}</p>
                      <Badge variant="outline" className="text-xs font-mono">{method.provider_key}</Badge>
                      {method.supports_subscription && (
                        <Badge variant="secondary" className="text-xs">{t('payment.supportsSubscription')}</Badge>
                      )}
                      <Badge variant={method.is_active ? "default" : "secondary"} className="text-xs">
                        {method.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{method.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('adminPayments.sortOrder')}: {method.sort_order}
                      {method.webhook_endpoint_suffix && (
                        <span className="ml-3 font-mono">{method.webhook_endpoint_suffix}</span>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      {toggling === method.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Switch
                          checked={method.is_active}
                          onCheckedChange={() => handleToggle(method)}
                          aria-label="Toggle active"
                        />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditTarget(method)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <EditMethodDialog
        method={editTarget}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={handleSaved}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Package Form Sheet (Create / Edit)
// ---------------------------------------------------------------------------
interface PackageSheetProps {
  pkg: SPackage | null         // null = create mode
  open: boolean
  onClose: () => void
  onSaved: (pkg: SPackage) => void
}

function PackageSheet({ pkg, open, onClose, onSaved }: PackageSheetProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const isEdit = !!pkg

  const [packageKey, setPackageKey] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [scoinAmount, setScoinAmount] = useState("")
  const [bonusScoin, setBonusScoin] = useState("0")
  const [priceAmount, setPriceAmount] = useState("")
  const [priceCurrency, setPriceCurrency] = useState("USD")
  const [sortOrder, setSortOrder] = useState("1")
  const [isActive, setIsActive] = useState(true)
  const [isFeatured, setIsFeatured] = useState(false)
  const [metadataJson, setMetadataJson] = useState("{}")
  const [metadataError, setMetadataError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (pkg) {
        setPackageKey(pkg.package_key)
        setName(pkg.name)
        setDescription(pkg.description)
        setScoinAmount(String(pkg.scoin_amount))
        setBonusScoin(String(pkg.bonus_scoin))
        setPriceAmount(String(pkg.price_amount))
        setPriceCurrency(pkg.price_currency)
        setSortOrder(String(pkg.sort_order))
        setIsActive(pkg.is_active)
        setIsFeatured(pkg.is_featured)
        setMetadataJson(JSON.stringify(pkg.metadata ?? {}, null, 2))
        setMetadataError("")
      } else {
        setPackageKey("")
        setName("")
        setDescription("")
        setScoinAmount("")
        setBonusScoin("0")
        setPriceAmount("")
        setPriceCurrency("USD")
        setSortOrder("1")
        setIsActive(true)
        setIsFeatured(false)
        setMetadataJson("{}")
        setMetadataError("")
      }
    }
  }, [open, pkg])

  function validateMeta(val: string) {
    try { JSON.parse(val); setMetadataError("") }
    catch { setMetadataError(t('adminPackages.metadataInvalid')) }
  }

  async function handleSave() {
    let parsedMeta: Record<string, unknown> = {}
    try { parsedMeta = JSON.parse(metadataJson) }
    catch { setMetadataError(t('adminPackages.metadataInvalid')); return }
    setSaving(true)
    try {
      let saved: SPackage
      if (isEdit && pkg) {
        saved = await updateSPackage(pkg.id, {
          name: name.trim(),
          description: description.trim(),
          scoin_amount: parseInt(scoinAmount, 10) || 0,
          bonus_scoin: parseInt(bonusScoin, 10) || 0,
          price_amount: parseInt(priceAmount, 10) || 0,
          price_currency: priceCurrency.trim(),
          is_active: isActive,
          is_featured: isFeatured,
          sort_order: parseInt(sortOrder, 10) || 0,
          metadata: parsedMeta,
        })
      } else {
        saved = await createSPackage({
          package_key: packageKey.trim(),
          name: name.trim(),
          description: description.trim(),
          scoin_amount: parseInt(scoinAmount, 10) || 0,
          bonus_scoin: parseInt(bonusScoin, 10) || 0,
          price_amount: parseInt(priceAmount, 10) || 0,
          price_currency: priceCurrency.trim(),
          is_active: isActive,
          is_featured: isFeatured,
          sort_order: parseInt(sortOrder, 10) || 0,
          metadata: parsedMeta,
        })
      }
      toast({ title: t('adminPackages.saveSuccess') })
      onSaved(saved)
      onClose()
    } catch (err: any) {
      toast({ variant: "destructive", title: t('adminPackages.saveFailed'), description: err?.data?.error ?? err?.message })
    } finally {
      setSaving(false)
    }
  }

  const isFormValid = !!(name.trim() && (isEdit || packageKey.trim()) && scoinAmount && priceAmount && !metadataError)

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{isEdit ? t('adminPackages.editTitle') : t('adminPackages.createTitle')}</SheetTitle>
          {isEdit && <SheetDescription className="font-mono text-xs">{pkg?.package_key}</SheetDescription>}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Package Key – only on create */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="pkg-key">{t('adminPackages.fieldPackageKey')}</Label>
              <Input
                id="pkg-key"
                value={packageKey}
                onChange={(e) => setPackageKey(e.target.value)}
                disabled={saving}
                placeholder={t('adminPackages.fieldPackageKeyHint')}
                className="font-mono"
              />
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="pkg-name">{t('adminPackages.fieldName')}</Label>
            <Input id="pkg-name" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="pkg-desc">{t('adminPackages.fieldDescription')}</Label>
            <Textarea id="pkg-desc" value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} rows={2} className="resize-none" />
          </div>

          {/* sCoin + Bonus */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pkg-scoin">{t('adminPackages.fieldSCoinAmount')}</Label>
              <Input id="pkg-scoin" type="number" min={0} value={scoinAmount} onChange={(e) => setScoinAmount(e.target.value)} disabled={saving} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-bonus">{t('adminPackages.fieldBonusSCoin')}</Label>
              <Input id="pkg-bonus" type="number" min={0} value={bonusScoin} onChange={(e) => setBonusScoin(e.target.value)} disabled={saving} />
            </div>
          </div>

          {/* Price + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pkg-price">{t('adminPackages.fieldPriceAmount')}</Label>
              <Input id="pkg-price" type="number" min={0} value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} disabled={saving} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-currency">{t('adminPackages.fieldPriceCurrency')}</Label>
              <Input id="pkg-currency" value={priceCurrency} onChange={(e) => setPriceCurrency(e.target.value.toUpperCase())} disabled={saving} placeholder="USD" className="font-mono" />
            </div>
          </div>

          {/* Sort Order */}
          <div className="space-y-1.5">
            <Label htmlFor="pkg-sort">{t('adminPackages.fieldSortOrder')}</Label>
            <Input id="pkg-sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} disabled={saving} />
          </div>

          {/* Toggles */}
          <div className="rounded-lg border bg-muted/40 divide-y">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{t('adminPackages.fieldIsActive')}</p>
                <p className="text-xs text-muted-foreground">{t('adminPackages.fieldIsActiveDesc')}</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} disabled={saving} />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{t('adminPackages.fieldIsFeatured')}</p>
                <p className="text-xs text-muted-foreground">{t('adminPackages.fieldIsFeaturedDesc')}</p>
              </div>
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} disabled={saving} />
            </div>
          </div>

          {/* Metadata JSON */}
          <div className="space-y-1.5">
            <Label htmlFor="pkg-meta">{t('adminPackages.fieldMetadata')}</Label>
            <Textarea
              id="pkg-meta"
              value={metadataJson}
              onChange={(e) => { setMetadataJson(e.target.value); validateMeta(e.target.value) }}
              disabled={saving}
              rows={3}
              spellCheck={false}
              className="font-mono text-xs resize-none"
            />
            {metadataError && <p className="text-xs text-destructive">{metadataError}</p>}
          </div>
        </div>

        <SheetFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving || !isFormValid}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Packages tab
// ---------------------------------------------------------------------------
function PackagesTab() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [packages, setPackages] = useState<SPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SPackage | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SPackage | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listSPackages()
      setPackages((res.packages ?? []).sort((a, b) => a.sort_order - b.sort_order))
    } catch {
      toast({ variant: "destructive", title: t('adminPackages.loadFailed') })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditTarget(null)
    setSheetOpen(true)
  }

  function openEdit(pkg: SPackage) {
    setEditTarget(pkg)
    setSheetOpen(true)
  }

  function handleSaved(saved: SPackage) {
    setPackages((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next.sort((a, b) => a.sort_order - b.sort_order)
      }
      return [...prev, saved].sort((a, b) => a.sort_order - b.sort_order)
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteSPackage(deleteTarget.id)
      toast({ title: t('adminPackages.deleteSuccess') })
      setPackages((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: any) {
      toast({ variant: "destructive", title: t('adminPackages.deleteFailed'), description: err?.data?.error ?? err?.message })
    } finally {
      setDeleting(false)
    }
  }

  async function handleToggle(pkg: SPackage) {
    setToggling(pkg.id)
    try {
      const updated = await updateSPackage(pkg.id, { is_active: !pkg.is_active })
      setPackages((prev) => prev.map((p) => p.id === updated.id ? updated : p))
    } catch (err: any) {
      toast({ variant: "destructive", title: t('adminPackages.saveFailed'), description: err?.data?.error ?? err?.message })
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('adminPackages.totalPackages').replace('{n}', String(packages.length))}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t('adminPackages.btnCreate')}
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('adminPackages.colName')}</TableHead>
                <TableHead>{t('adminPackages.colSCoin')}</TableHead>
                <TableHead>{t('adminPackages.colPrice')}</TableHead>
                <TableHead>{t('adminPackages.colFeatured')}</TableHead>
                <TableHead>{t('adminPackages.colStatus')}</TableHead>
                <TableHead className="text-right">{t('adminPackages.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    {t('adminPackages.noPackages')}
                  </TableCell>
                </TableRow>
              ) : (
                packages.map((pkg) => (
                  <TableRow key={pkg.id} className={pkg.is_active ? "" : "opacity-60"}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{pkg.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{pkg.package_key}</p>
                        {pkg.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{pkg.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-semibold">🪙 {pkg.scoin_amount.toLocaleString()}</span>
                        {pkg.bonus_scoin > 0 && (
                          <span className="ml-1.5 text-xs text-green-600 dark:text-green-400">+{pkg.bonus_scoin.toLocaleString()}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">
                        {(pkg.price_amount / 100).toFixed(2)} {pkg.price_currency}
                      </span>
                    </TableCell>
                    <TableCell>
                      {pkg.is_featured ? (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ) : (
                        <Star className="h-4 w-4 text-muted-foreground/30" />
                      )}
                    </TableCell>
                    <TableCell>
                      {toggling === pkg.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Switch
                          checked={pkg.is_active}
                          onCheckedChange={() => handleToggle(pkg)}
                          aria-label="Toggle active"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(pkg)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(pkg)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sheet */}
      <PackageSheet
        pkg={editTarget}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={handleSaved}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('adminPackages.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('adminPackages.deleteDesc').replace('{key}', deleteTarget?.package_key ?? '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Transactions Tab
// ---------------------------------------------------------------------------
function TransactionsTab() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [transactions, setTransactions] = useState<AdminTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    () => (searchParams.get("tx_status") as AdminTransactionStatus) ?? ""
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchId, setSearchId] = useState(() => searchParams.get("tx_id") ?? "")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (status: StatusFilter, id?: string) => {
    setLoading(true)
    try {
      const res = await listAdminTransactions({
        limit: TX_LIMIT,
        status: status || undefined,
        id: id?.trim() || undefined,
      })
      const txs = res.transactions ?? []
      setTransactions(txs)
      if (id?.trim() && txs.length === 1) setExpandedId(txs[0].id)
    } catch {
      toast({ variant: "destructive", title: "Failed to load transactions." })
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load(statusFilter, searchId) }, [load, statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchChange(value: string) {
    setSearchId(value)
    const params = new URLSearchParams(window.location.search)
    if (value) { params.set("tx_id", value) } else { params.delete("tx_id") }
    router.replace(`?${params.toString()}`, { scroll: false })
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { load(statusFilter, value) }, 400)
  }

  const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: "_all", label: t("adminTransactions.filterAll") },
    { value: "awaiting_payment", label: t("adminTransactions.filterAwaitingPayment") },
    { value: "processing", label: t("adminTransactions.filterProcessing") },
    { value: "completed", label: t("adminTransactions.filterCompleted") },
    { value: "failed", label: t("adminTransactions.filterFailed") },
    { value: "credit_failed", label: t("adminTransactions.filterCreditFailed") },
    { value: "expired", label: t("adminTransactions.filterExpired") },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{transactions.length} / {TX_LIMIT}</p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              className="flex h-9 w-80 rounded-md border border-input bg-background px-3 py-1 pl-8 pr-7 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
              placeholder="Search transaction ID…"
              value={searchId}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {searchId && (
              <button
                type="button"
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                onClick={() => handleSearchChange("")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select
            value={statusFilter === "" ? "_all" : statusFilter}
            onValueChange={(v) => {
              const next = v === "_all" ? "" : v as AdminTransactionStatus
              setStatusFilter(next)
              const params = new URLSearchParams(window.location.search)
              if (next) { params.set("tx_status", next) } else { params.delete("tx_status") }
              router.replace(`?${params.toString()}`, { scroll: false })
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("adminTransactions.filterAll")} />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => load(statusFilter)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("adminTransactions.colId")}</TableHead>
                <TableHead>{t("adminTransactions.colUser")}</TableHead>
                <TableHead>{t("adminTransactions.colProvider")}</TableHead>
                <TableHead>{t("adminTransactions.colAmount")}</TableHead>
                <TableHead>{t("adminTransactions.colSCoin")}</TableHead>
                <TableHead>{t("adminTransactions.colStatus")}</TableHead>
                <TableHead>{t("adminTransactions.colCreatedAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    {t("adminTransactions.noTransactions")}
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  const isExpanded = expandedId === tx.id
                  return (
                    <>
                      <TableRow
                        key={tx.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {isExpanded
                              ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            }
                            <div className="font-mono text-xs max-w-[150px]">
                              <span className="truncate block">{tx.id}</span>
                            </div>
                            <CopyButton text={tx.id} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 font-mono text-xs max-w-[140px]">
                            <span className="truncate">{tx.user_id}</span>
                            <CopyButton text={tx.user_id} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">{tx.provider_key}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {formatTxAmount(tx.amount, tx.currency)}
                        </TableCell>
                        <TableCell className="text-sm">🪙 {tx.scoin_amount.toLocaleString()}</TableCell>
                        <TableCell><TxStatusBadge status={tx.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleString(undefined, {
                            timeZone: getUserTimezone(),
                            year: "numeric", month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${tx.id}-detail`} className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Transaction ID</p>
                                <p className="font-mono text-xs break-all flex items-center gap-1">{tx.id}<CopyButton text={tx.id} /></p>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Idempotency Key</p>
                                <p className="font-mono text-xs break-all">{tx.idempotency_key}</p>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">User ID</p>
                                <p className="font-mono text-xs break-all flex items-center gap-1">{tx.user_id}<CopyButton text={tx.user_id} /></p>
                              </div>
                              <PackageInfoRow packageId={tx.scoin_package_id} />
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment Method ID</p>
                                <p className="font-mono text-xs break-all">{tx.payment_method_config_id}</p>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Provider</p>
                                <Badge variant="outline" className="font-mono text-xs">{tx.provider_key}</Badge>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Amount</p>
                                <p className="font-semibold">{formatTxAmount(tx.amount, tx.currency)}</p>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">sCoin</p>
                                <p className="font-semibold">🪙 {tx.scoin_amount.toLocaleString()}</p>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                                <TxStatusBadge status={tx.status} />
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Created At</p>
                                <p className="text-xs">{new Date(tx.created_at).toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Updated At</p>
                                <p className="text-xs">{new Date(tx.updated_at).toLocaleString(undefined, { timeZone: getUserTimezone(), year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                              </div>
                              {tx.provider_data?.transfer_info != null && (
                                <div className="space-y-0.5 sm:col-span-2 lg:col-span-3">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Transfer Info</p>
                                  <p className="font-mono text-xs break-all">{String(tx.provider_data.transfer_info)}</p>
                                </div>
                              )}
                              {tx.provider_data?.status_reason != null && (
                                <div className="space-y-0.5 sm:col-span-2 lg:col-span-3">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Status Reason</p>
                                  <p className="text-xs break-all">{String(tx.provider_data.status_reason)}</p>
                                </div>
                              )}
                            </div>
                            {tx.status !== "completed" && (
                              <div className="mt-3 flex justify-end">
                                <ManuallyCreditButton txId={tx.id} onSuccess={() => load(statusFilter, searchId)} />
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Gift Codes tab
// ---------------------------------------------------------------------------
function GiftCodesTab() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const capabilities = useCapabilities()

  const [codes, setCodes] = useState<GiftCode[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<GiftCode | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async (off = 0) => {
    if (!capabilities.is_super_admin) return
    setLoading(true)
    try {
      const res = await listGiftCodes(LIMIT, off)
      setCodes(res.gift_codes ?? [])
      setTotal(res.total)
      setOffset(off)
    } catch {
      toast({ variant: "destructive", title: t('adminGiftCodes.loadFailed') })
    } finally {
      setLoading(false)
    }
  }, [capabilities.is_super_admin, toast])

  useEffect(() => { load(0) }, [load])

  const filtered = codes.filter(
    (gc) =>
      gc.code.toLowerCase().includes(search.toLowerCase()) ||
      gc.description.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteGiftCode(deleteTarget.id)
      toast({ title: t('adminGiftCodes.deleteSuccess') })
      setDeleteTarget(null)
      load(offset)
    } catch (err: any) {
      toast({ variant: "destructive", title: t('adminGiftCodes.deleteFailed'), description: err?.data?.error ?? err?.message })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{t('adminGiftCodes.codesTotal').replace('{n}', String(total))}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load(offset)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t('adminGiftCodes.refresh')}
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/payments/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('adminGiftCodes.create')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder={t('adminGiftCodes.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('adminGiftCodes.colCode')}</TableHead>
                  <TableHead>{t('adminGiftCodes.colAmount')}</TableHead>
                  <TableHead>{t('adminGiftCodes.colMaxUses')}</TableHead>
                  <TableHead>{t('adminGiftCodes.colUsed')}</TableHead>
                  <TableHead>{t('adminGiftCodes.colStatus')}</TableHead>
                  <TableHead>{t('adminGiftCodes.colActiveAt')}</TableHead>
                  <TableHead>{t('adminGiftCodes.colExpiresAt')}</TableHead>
                  <TableHead className="text-right">{t('adminGiftCodes.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      {t('adminGiftCodes.noCodes')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((gc) => (
                    <TableRow key={gc.id}>
                      <TableCell>
                        <span className="flex items-center font-mono text-sm">
                          {gc.code}
                          <CopyButton text={gc.code} />
                        </span>
                      </TableCell>
                      <TableCell>🪙 {gc.coins_amount.toLocaleString()} coins</TableCell>
                      <TableCell>{usesLabel(gc.max_uses, t('adminGiftCodes.unlimited'), t('adminGiftCodes.singleUse'))}</TableCell>
                      <TableCell>
                        {gc.used_count} / {gc.max_uses === -1 ? "∞" : gc.max_uses}
                      </TableCell>
                      <TableCell><StatusBadge gc={gc} /></TableCell>
                      <TableCell className="text-sm">{formatDt(gc.active_at, t('adminGiftCodes.never'))}</TableCell>
                      <TableCell className="text-sm">{formatDt(gc.expires_at, t('adminGiftCodes.never'))}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/admin/payments/${gc.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(gc)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      {/* Pagination */}
      {total > LIMIT && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0 || loading} onClick={() => load(offset - LIMIT)}>
              {t('adminGiftCodes.previous') || t('common.previous')}
            </Button>
            <Button variant="outline" size="sm" disabled={offset + LIMIT >= total || loading} onClick={() => load(offset + LIMIT)}>
              {t('adminGiftCodes.next') || t('common.next')}
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('adminGiftCodes.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('adminGiftCodes.deleteDesc').replace('{code}', deleteTarget?.code ?? '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Coin Top-Up tab
// ---------------------------------------------------------------------------
function CoinTopUpTab() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<CoinTransaction | null>(null)
  const [userId, setUserId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)
    try {
      const res = await adminCoinTopUp({
        user_id: userId.trim(),
        amount: parseInt(amount, 10),
        description: description.trim(),
      })
      setResult(res)
      toast({ title: `🪙 ${amount} coins added to ${userId}` })
    } catch (err: any) {
      toast({ variant: "destructive", title: t('adminGiftCodes.topupFailed'), description: err?.data?.error ?? err?.message })
    } finally {
      setSubmitting(false)
    }
  }

  function handleReset() {
    setUserId("")
    setAmount("")
    setDescription("")
    setResult(null)
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgeDollarSign className="h-5 w-5 text-primary" />
            {t('adminGiftCodes.topupCardTitle')}
          </CardTitle>
          <CardDescription>
            {t('adminGiftCodes.topupCardDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="topup-userId">
                {t('adminGiftCodes.fieldUserId')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="topup-userId"
                placeholder="e.g. user_abc123"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topup-amount">
                {t('adminGiftCodes.fieldAmount')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="topup-amount"
                type="number"
                min={1}
                placeholder="e.g. 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topup-desc">
                {t('adminGiftCodes.fieldTopupDescription')} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="topup-desc"
                placeholder="Reason for top-up…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3">
              {result && (
                <Button type="button" variant="outline" onClick={handleReset}>
                  {t('adminGiftCodes.btnNewTopup')}
                </Button>
              )}
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BadgeDollarSign className="mr-2 h-4 w-4" />}
                {t('adminGiftCodes.btnAddCoins')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-green-600 dark:text-green-400">{t('adminGiftCodes.resultTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">{t('adminGiftCodes.resultTxId')}</span>
              <span className="font-mono text-right break-all max-w-xs">{result.id}<CopyButton text={result.id} /></span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('adminGiftCodes.resultUser')}</span>
              <span className="font-mono">{result.user_id}<CopyButton text={result.user_id} /></span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('adminGiftCodes.resultAmount')}</span>
              <span className="font-semibold">🪙 {result.amount} coins</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('adminGiftCodes.resultStatus')}</span>
              <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
                {result.status}
              </Badge>
            </div>
            {result.description && (
              <>
                <Separator />
                <div className="flex items-start justify-between">
                  <span className="text-muted-foreground">{t('adminGiftCodes.resultDesc')}</span>
                  <span className="text-right max-w-xs">{result.description}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function GiftCodesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const capabilities = useCapabilities()
  const { t } = useTranslation()

  const VALID_TABS = ["payments", "packages", "gift-codes", "topup", "transactions"] as const
  type TabValue = typeof VALID_TABS[number]
  const rawTab = searchParams.get("tab")
  const activeTab: TabValue = VALID_TABS.includes(rawTab as TabValue) ? (rawTab as TabValue) : "payments"

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    if (!capabilities.is_super_admin) router.push("/")
  }, [capabilities, router])

  if (!capabilities.is_super_admin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-destructive">
          <ShieldAlert className="h-5 w-5" />
          <span>Admin access required</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-8">
        <div className="flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">{t('adminGiftCodes.pageTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('adminGiftCodes.pageSubtitle')}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="h-4 w-4" />
              {t('adminPayments.tabPayments')}
            </TabsTrigger>
            <TabsTrigger value="packages" className="gap-2">
              <Package className="h-4 w-4" />
              {t('adminPackages.tab')}
            </TabsTrigger>
            <TabsTrigger value="gift-codes" className="gap-2">
              <Gift className="h-4 w-4" />
              {t('adminGiftCodes.tabGiftCodes')}
            </TabsTrigger>
            <TabsTrigger value="topup" className="gap-2">
              <BadgeDollarSign className="h-4 w-4" />
              {t('adminGiftCodes.tabTopUp')}
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <ReceiptText className="h-4 w-4" />
              {t('adminGiftCodes.tabTransactions')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="payments" className="mt-4">
            <PaymentMethodsTab />
          </TabsContent>
          <TabsContent value="packages" className="mt-4">
            <PackagesTab />
          </TabsContent>
          <TabsContent value="gift-codes" className="mt-4">
            <GiftCodesTab />
          </TabsContent>
          <TabsContent value="topup" className="mt-4">
            <CoinTopUpTab />
          </TabsContent>
          <TabsContent value="transactions" className="mt-4">
            <TransactionsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
