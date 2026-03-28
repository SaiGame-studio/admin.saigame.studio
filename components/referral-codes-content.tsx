"use client"

import { useCallback, useEffect, useState } from "react"
import { Dices, Loader2, Plus, RefreshCw, TicketPercent, TriangleAlert } from "lucide-react"
import { getReferralCodes, createReferralCode, updateReferralCode, type ReferralCode } from "@/lib/referral-api"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { CopyButton } from "@/components/CopyButton"

function generateRandomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  const block = () => Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  return `SAI-INVITE-${block()}-${block()}-${block()}`
}

export function ReferralCodesContent() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [codes, setCodes] = useState<ReferralCode[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const isSuperAdmin = !!user?.capabilities?.is_super_admin
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  async function handleToggleActive(code: ReferralCode) {
    setTogglingIds(prev => new Set(prev).add(code.id))
    try {
      await updateReferralCode(code.id, { is_active: !code.is_active })
      setCodes(prev => prev.map(c => c.id === code.id ? { ...c, is_active: !c.is_active } : c))
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" })
    } finally {
      setTogglingIds(prev => { const next = new Set(prev); next.delete(code.id); return next })
    }
  }

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getReferralCodes({ limit: 50 })
      setCodes(res.items ?? [])
    } catch {
      toast({ variant: "destructive", title: "Failed to load referral codes" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchCodes() }, [fetchCodes])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Referral Codes</h1>
          {!isSuperAdmin && (
            <div className="flex items-center gap-2 mt-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-600 dark:text-yellow-400">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              Currently only Sai can create referral codes. Please contact him if you need one.
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={fetchCodes} disabled={loading} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="sm" className="gap-1.5" disabled={!isSuperAdmin} title={!isSuperAdmin ? "Only super admins can create codes" : undefined}>
              <Plus className="h-4 w-4" /> New Code
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Create Referral Code</SheetTitle>
            </SheetHeader>
            <CreateCodeForm
              onCreated={() => { setSheetOpen(false); fetchCodes() }}
            />
          </SheetContent>
        </Sheet>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : codes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-16 text-muted-foreground">
          <TicketPercent className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No referral codes yet</p>
          <p className="text-xs mt-1">Create your first referral code to get started.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{c.code}</code>
                      <CopyButton text={c.code} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="tabular-nums text-sm">
                      {c.current_usage}
                      {c.usage_limit > 0 && (
                        <span className="text-muted-foreground"> / {c.usage_limit}</span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={c.is_active}
                      disabled={togglingIds.has(c.id)}
                      onCheckedChange={() => handleToggleActive(c)}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {c.metadata?.campaign ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(c.created_at)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric",
    })
  } catch {
    return "—"
  }
}

function CreateCodeForm({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [code, setCode] = useState(() => generateRandomCode())
  const [usageLimit, setUsageLimit] = useState("10")
  const [campaign, setCampaign] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return

    setSaving(true)
    try {
      const metadata: Record<string, string> = {}
      if (campaign.trim()) metadata.campaign = campaign.trim()

      await createReferralCode({
        code: code.trim(),
        usage_limit: Number(usageLimit) || 0,
        ...(Object.keys(metadata).length > 0 && { metadata }),
      })
      toast({ title: "Referral code created" })
      onCreated()
    } catch {
      toast({ variant: "destructive", title: "Failed to create referral code" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="rc-code">Code</Label>
        <div className="flex gap-2">
          <Input
            id="rc-code"
            placeholder="e.g. SAI-INVITE-ABC-123-XYZ"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            title="Generate random code"
            onClick={() => setCode(generateRandomCode())}
          >
            <Dices className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rc-limit">Usage Limit</Label>
        <Input
          id="rc-limit"
          type="number"
          min={0}
          value={usageLimit}
          onChange={(e) => setUsageLimit(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="rc-campaign">Campaign (optional)</Label>
        <Input
          id="rc-campaign"
          placeholder="e.g. early_access"
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={saving || !code.trim()} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {saving ? "Creating…" : "Create Code"}
      </Button>
    </form>
  )
}
