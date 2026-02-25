"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, ShieldAlert, Trash2, Save } from "lucide-react"
import { CopyButton } from "@/components/CopyButton"

import { useCapabilities } from "@/hooks/use-capabilities"
import {
  getGiftCode,
  updateGiftCode,
  deleteGiftCode,
  listGiftCodeRedemptions,
  type GiftCode,
  type GiftCodeRedemption,
} from "@/lib/admin-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/use-translation"

const LIMIT = 20

function toLocalDatetime(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getStatus(gc: GiftCode) {
  const now = Date.now()
  const activeTs = gc.active_at ? new Date(gc.active_at).getTime() : null
  const expiresTs = gc.expires_at ? new Date(gc.expires_at).getTime() : null
  if (!gc.active_at) return { label: "Draft", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" }
  if (activeTs && activeTs > now) return { label: "Scheduled", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" }
  if (expiresTs && expiresTs < now) return { label: "Expired", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" }
  if (gc.max_uses !== -1 && gc.used_count >= gc.max_uses) return { label: "Exhausted", className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" }
  return { label: "Active", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" }
}

export default function GiftCodeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const capabilities = useCapabilities()
  const { toast } = useToast()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [gc, setGc] = useState<GiftCode | null>(null)

  // Edit form state
  const [description, setDescription] = useState("")
  const [maxUses, setMaxUses] = useState("")
  const [activeAt, setActiveAt] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [neverExpires, setNeverExpires] = useState(false)

  // Redemptions
  const [redemptions, setRedemptions] = useState<GiftCodeRedemption[]>([])
  const [redemptionsTotal, setRedemptionsTotal] = useState(0)
  const [redemptionsOffset, setRedemptionsOffset] = useState(0)
  const [redemptionsLoading, setRedemptionsLoading] = useState(false)

  useEffect(() => {
    if (!capabilities.is_super_admin) router.push("/")
  }, [capabilities, router])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getGiftCode(id)
      .then((data) => {
        setGc(data)
        setDescription(data.description ?? "")
        setMaxUses(data.max_uses === -1 ? "-1" : String(data.max_uses))
        setActiveAt(toLocalDatetime(data.active_at))
        if (data.expires_at) {
          setExpiresAt(toLocalDatetime(data.expires_at))
          setNeverExpires(false)
        } else {
          setExpiresAt("")
          setNeverExpires(true)
        }
      })
      .catch(() => {
        toast({ variant: "destructive", title: t('adminGiftCodes.loadFailed') })
      })
      .finally(() => setLoading(false))
  }, [id])

  async function fetchRedemptions(offset: number) {
    if (!id) return
    setRedemptionsLoading(true)
    try {
      const res = await listGiftCodeRedemptions(id, LIMIT, offset)
      setRedemptions(res.redemptions ?? [])
      setRedemptionsTotal(res.total ?? 0)
      setRedemptionsOffset(offset)
    } catch {
      toast({ variant: "destructive", title: t('adminGiftCodes.loadRedemptionsFailed') })
    } finally {
      setRedemptionsLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchRedemptions(0)
  }, [id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!gc) return
    setSaving(true)
    try {
      const body: any = {
        description: description.trim(),
        max_uses: parseInt(maxUses, 10),
        active_at: activeAt ? new Date(activeAt).toISOString() : null,
        expires_at: neverExpires || !expiresAt ? null : new Date(expiresAt).toISOString(),
      }
      const updated = await updateGiftCode(gc.id, body)
      setGc(updated)
      toast({ title: t('adminGiftCodes.saveSuccess') })
    } catch (err: any) {
      toast({ variant: "destructive", title: t('adminGiftCodes.saveFailed'), description: err?.data?.error ?? err?.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!gc) return
    setDeleting(true)
    try {
      await deleteGiftCode(gc.id)
      toast({ title: t('adminGiftCodes.deleteEditSuccess') })
      router.push("/admin/gift-codes?tab=gift-codes")
    } catch (err: any) {
      toast({ variant: "destructive", title: t('adminGiftCodes.deleteEditFailed'), description: err?.data?.error ?? err?.message })
      setDeleting(false)
    }
  }

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!gc) {
    return (
      <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">{t('adminGiftCodes.giftCodeNotFound')}</p>
      </div>
    )
  }

  const status = getStatus(gc)

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8 max-w-[1600px] w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/admin/gift-codes?tab=gift-codes">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold md:text-2xl font-mono">{gc.code}</h1>
                <CopyButton text={gc.code} />
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
              </div>
              <p className="text-sm text-muted-foreground">ID: {gc.id} <CopyButton text={gc.id} /></p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                {t('common.delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('adminGiftCodes.deleteEditTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('adminGiftCodes.deleteEditDesc').replace('{code}', gc.code)}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
                  {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.2fr] gap-6 items-start">
          {/* ── Left: Overview + Edit ─────────────────────────────────── */}
          <div className="space-y-6">
          {/* Read-only info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('adminGiftCodes.overviewTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">{t('adminGiftCodes.coinsValue')}</p>
                <p className="font-semibold">🪙 {gc.coins_amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('adminGiftCodes.usedMax')}</p>
                <p className="font-semibold">
                  {gc.used_count} / {gc.max_uses === -1 ? "∞" : gc.max_uses}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('adminGiftCodes.createdAt')}</p>
                <p className="text-sm">{gc.created_at ? new Date(gc.created_at).toLocaleString() : "—"}</p>
              </div>
              {gc.created_by && (
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-xs text-muted-foreground">{t('adminGiftCodes.createdBy')}</p>
                  <p className="text-sm font-mono">{gc.created_by}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit form */}
          <Card>
            <CardHeader>
              <CardTitle>{t('adminGiftCodes.editTitle')}</CardTitle>
              <CardDescription>{t('adminGiftCodes.editSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-5">
                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="desc">{t('adminGiftCodes.fieldDescription')}</Label>
                  <Textarea
                    id="desc"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Max Uses */}
                <div className="space-y-1.5">
                  <Label htmlFor="maxUses">{t('adminGiftCodes.fieldMaxUses')}</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min={-1}
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('adminGiftCodes.maxUsesHint').replace('{count}', String(gc.used_count))}
                  </p>
                </div>

                {/* Active At */}
                <div className="space-y-1.5">
                  <Label htmlFor="activeAt">{t('adminGiftCodes.fieldActiveAt')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="activeAt"
                      type="datetime-local"
                      value={activeAt}
                      onChange={(e) => setActiveAt(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => setActiveAt(toLocalDatetime(new Date().toISOString()))}>
                      {t('adminGiftCodes.btnNow')}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setActiveAt("")}>
                      {t('adminGiftCodes.btnClear')}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('adminGiftCodes.clearHelper')}</p>
                </div>

                {/* Expires At */}
                <div className="space-y-1.5">
                  <Label htmlFor="expiresAt">{t('adminGiftCodes.fieldExpiresAt')}</Label>
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      id="neverExpires"
                      checked={neverExpires}
                      onCheckedChange={(v) => setNeverExpires(!!v)}
                    />
                    <Label htmlFor="neverExpires" className="cursor-pointer font-normal">{t('adminGiftCodes.neverExpires')}</Label>
                  </div>
                  {!neverExpires && (
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {t('adminGiftCodes.btnSave')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          </div>

          {/* ── Right: Redemptions ────────────────────────────────────── */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">{t('adminGiftCodes.redemptionsTitle')} ({redemptionsTotal})</h2>
            <Card>
              <CardContent className="p-0">
                {redemptionsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : redemptions.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">{t('adminGiftCodes.noRedemptions')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('adminGiftCodes.colUserId')}</TableHead>
                        <TableHead>{t('adminGiftCodes.colRedeemedAt')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {redemptions.map((r, i) => (
                        <TableRow key={r.user_id ?? i}>
                          <TableCell>
                            <span className="font-mono text-sm">{r.user_id}</span>
                            <CopyButton text={r.user_id} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {r.redeemed_at ? new Date(r.redeemed_at).toLocaleString() : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            {redemptionsTotal > LIMIT && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={redemptionsOffset === 0 || redemptionsLoading}
                  onClick={() => fetchRedemptions(Math.max(0, redemptionsOffset - LIMIT))}
                >
                  {t('common.previous')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {redemptionsOffset + 1}–{Math.min(redemptionsOffset + LIMIT, redemptionsTotal)} of {redemptionsTotal}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={redemptionsOffset + LIMIT >= redemptionsTotal || redemptionsLoading}
                  onClick={() => fetchRedemptions(redemptionsOffset + LIMIT)}
                >
                  {t('common.next')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
