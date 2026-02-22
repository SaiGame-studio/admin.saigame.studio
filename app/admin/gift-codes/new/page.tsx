"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Gift, Loader2, ShieldAlert, Shuffle } from "lucide-react"

import { useCapabilities } from "@/hooks/use-capabilities"
import { createGiftCode } from "@/lib/admin-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/use-translation"

type MaxUsesMode = "single" | "limited" | "unlimited"

export default function NewGiftCodePage() {
  const router = useRouter()
  const capabilities = useCapabilities()
  const { toast } = useToast()
  const { t } = useTranslation()

  const [submitting, setSubmitting] = useState(false)

  function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    const seg = () => Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
    return `SAI-GAME-${seg()}-${seg()}-${seg()}-${seg()}`
  }

  // Form state
  const [code, setCode] = useState(() => generateCode())
  const [coinsAmount, setCoinsAmount] = useState("")
  const [maxUsesMode, setMaxUsesMode] = useState<MaxUsesMode>("unlimited")
  const [limitedUses, setLimitedUses] = useState("10")
  const [description, setDescription] = useState("")
  const [activeAt, setActiveAt] = useState("")
  const [expiresAt, setExpiresAt] = useState("")

  useEffect(() => {
    if (!capabilities.is_super_admin) router.push("/")
  }, [capabilities, router])

  function getMaxUses(): number {
    if (maxUsesMode === "single") return 1
    if (maxUsesMode === "unlimited") return -1
    return parseInt(limitedUses, 10) || 2
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const body = {
        code: code.trim().toUpperCase(),
        coins_amount: parseInt(coinsAmount, 10),
        max_uses: getMaxUses(),
        description: description.trim(),
        active_at: activeAt ? new Date(activeAt).toISOString() : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      }
      const created = await createGiftCode(body)
      toast({ title: t('adminGiftCodes.createSuccess') })
      router.push(`/admin/gift-codes/${created.id}`)
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t('adminGiftCodes.createFailed'),
        description: err?.data?.error ?? err?.message,
      })
    } finally {
      setSubmitting(false)
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

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/gift-codes?tab=gift-codes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">{t('adminGiftCodes.createPageTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('adminGiftCodes.createPageSubtitle')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                {t('adminGiftCodes.createCardTitle')}
              </CardTitle>
              <CardDescription>{t('adminGiftCodes.createCardDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Code */}
              <div className="space-y-1.5">
                <Label htmlFor="code">
                  {t('adminGiftCodes.fieldCode')} <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    placeholder={t('adminGiftCodes.codeHint')}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                    spellCheck={false}
                    autoComplete="off"
                    className="font-mono"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setCode(generateCode())} title={t('adminGiftCodes.btnGenerate')}>
                    <Shuffle className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t('adminGiftCodes.codeHelper')}</p>
              </div>

              {/* Coins Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="coins">
                  {t('adminGiftCodes.fieldCoins')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="coins"
                  type="number"
                  min={1}
                  placeholder="e.g. 100"
                  value={coinsAmount}
                  onChange={(e) => setCoinsAmount(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">{t('adminGiftCodes.coinsHelper')}</p>
              </div>

              {/* Max Uses */}
              <div className="space-y-2">
                <Label>
                  {t('adminGiftCodes.fieldMaxUses')} <span className="text-destructive">*</span>
                </Label>
                <RadioGroup
                  value={maxUsesMode}
                  onValueChange={(v) => setMaxUsesMode(v as MaxUsesMode)}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="single" id="single" />
                    <Label htmlFor="single" className="cursor-pointer font-normal">{t('adminGiftCodes.radioSingle')}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="limited" id="limited" />
                    <Label htmlFor="limited" className="cursor-pointer font-normal">{t('adminGiftCodes.radioLimited')}</Label>
                    {maxUsesMode === "limited" && (
                      <Input
                        type="number"
                        min={2}
                        className="h-8 w-24"
                        value={limitedUses}
                        onChange={(e) => setLimitedUses(e.target.value)}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="unlimited" id="unlimited" />
                    <Label htmlFor="unlimited" className="cursor-pointer font-normal">{t('adminGiftCodes.radioUnlimited')}</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description">
                  {t('adminGiftCodes.fieldDescription')} <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Admin memo for this gift code…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={3}
                />
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setActiveAt(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16))}
                  >
                    Now
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('adminGiftCodes.activeAtHelper')}
                </p>
              </div>

              {/* Expires At */}
              <div className="space-y-1.5">
                <Label htmlFor="expiresAt">{t('adminGiftCodes.fieldExpiresAt')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setExpiresAt(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16))}
                  >
                    +7 days
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t('adminGiftCodes.expiresAtHelper')}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/gift-codes?tab=gift-codes">{t('common.cancel')}</Link>
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gift className="mr-2 h-4 w-4" />}
              {t('adminGiftCodes.btnCreate')}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
