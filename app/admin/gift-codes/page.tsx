"use client"

import { useCallback, useEffect, useState } from "react"
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
} from "lucide-react"

import { useCapabilities } from "@/hooks/use-capabilities"
import { CopyButton } from "@/components/CopyButton"
import {
  GiftCode,
  listGiftCodes,
  deleteGiftCode,
  adminCoinTopUp,
  type CoinTransaction,
} from "@/lib/admin-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/use-translation"

const LIMIT = 20

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
// Transactions tab (coming soon)
// ---------------------------------------------------------------------------
function TransactionsTab() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <ReceiptText className="h-14 w-14 text-muted-foreground/40" />
      <div>
        <h2 className="text-lg font-semibold">{t('adminGiftCodes.comingSoon')}</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          {t('adminGiftCodes.comingSoonDesc')}
        </p>
      </div>
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
            <Link href="/admin/gift-codes/new">
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
                            <Link href={`/admin/gift-codes/${gc.id}`}>
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

  const VALID_TABS = ["transactions", "gift-codes", "topup"] as const
  type TabValue = typeof VALID_TABS[number]
  const rawTab = searchParams.get("tab")
  const activeTab: TabValue = VALID_TABS.includes(rawTab as TabValue) ? (rawTab as TabValue) : "transactions"

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
          <ReceiptText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">{t('adminGiftCodes.pageTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('adminGiftCodes.pageSubtitle')}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="transactions" className="gap-2">
              <ReceiptText className="h-4 w-4" />
              {t('adminGiftCodes.tabTransactions')}
            </TabsTrigger>
            <TabsTrigger value="gift-codes" className="gap-2">
              <Gift className="h-4 w-4" />
              {t('adminGiftCodes.tabGiftCodes')}
            </TabsTrigger>
            <TabsTrigger value="topup" className="gap-2">
              <BadgeDollarSign className="h-4 w-4" />
              {t('adminGiftCodes.tabTopUp')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="transactions" className="mt-4">
            <TransactionsTab />
          </TabsContent>
          <TabsContent value="gift-codes" className="mt-4">
            <GiftCodesTab />
          </TabsContent>
          <TabsContent value="topup" className="mt-4">
            <CoinTopUpTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
