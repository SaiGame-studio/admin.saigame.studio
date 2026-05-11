"use client"

import { useEffect, useState } from "react"
import { fetchUserStudios, createStudio } from "@/lib/studio-api"
import type { Studio } from "@/types/studio"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, CheckCircle2, Loader2, Plus, ShieldOff, TicketPercent, X, ExternalLink, Lock } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Input } from "@/components/ui/input"
import { useTranslation } from '@/lib/i18n/use-translation'
import { useAuth } from "@/contexts/auth-context"
import { activateReferralCode } from "@/lib/referral-api"
import { fetchServerConfig } from "@/lib/server-config-api"
import Link from "next/link"

export default function StudiosPage() {
  const [studios, setStudios] = useState<Studio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newStudioName, setNewStudioName] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [referralCodeRequired, setReferralCodeRequired] = useState<boolean | null>(null)
  const { t } = useTranslation()
  const { user, refreshUser } = useAuth()

  const maxStudios = user?.limits?.max_studios ?? null
  const usedStudios = user?.usage?.studios ?? 0
  const atLimit = maxStudios !== null && usedStudios >= maxStudios
  const STUDIO_COST = 50
  const isFirstStudio = studios.length === 0
  const isActivated = user?.is_activated ?? false
  const isVerified = user?.is_verified ?? false

  async function loadStudios() {
    try {
      setLoading(true)
      const data = await fetchUserStudios()
      setStudios(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load studios")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStudios()
    fetchServerConfig()
      .then(config => setReferralCodeRequired(config.features.referral_code_required))
      .catch(() => setReferralCodeRequired(true))
  }, [])

  async function handleCreateStudio() {
    if (!newStudioName.trim()) {
      setCreateError("Please enter a studio name");
      return;
    }
    if (atLimit) {
      setCreateError(`You have reached your studio limit (${usedStudios} / ${maxStudios}).`);
      return;
    }
    setCreateError(null);
    if (isFirstStudio) {
      await doCreateStudio();
      return;
    }
    setShowConfirm(true);
  }

  async function doCreateStudio() {
    setCreating(true);
    setCreateError(null);
    try {
      const studio = await createStudio({ name: newStudioName.trim() });
      setStudios(prev => [studio, ...prev]);
      setNewStudioName("");
      window.dispatchEvent(new Event("wallet:refresh"));
    } catch (err: any) {
      setCreateError(err.message || "Failed to create studio");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
    <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('studio.confirmCreationTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('studio.confirmCreationDesc1')} <span className="font-semibold text-foreground">&ldquo;{newStudioName}&rdquo;</span> {t('studio.confirmCreationDesc2')}{" "}
            <span className="font-semibold text-foreground">🪙 {STUDIO_COST} coins</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={doCreateStudio}>
            {t('studio.confirmCreationPay')} {STUDIO_COST} coins
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t('common.studios')}</h1>
          <p className="text-sm sm:text-base">{t('studio.manageTitle')}</p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {!isVerified && (
            <div className="flex items-center gap-1.5 text-sm">
              <ShieldOff className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
              <span className="text-yellow-500 font-medium">{t('studio.emailNotVerified')}</span>
            </div>
          )}
          {isVerified && !isActivated && (
            <div className="flex items-center gap-1.5 text-sm">
              <ShieldOff className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
              <span className="text-yellow-500 font-medium">{t('studio.notActivated')}</span>
            </div>
          )}
          {maxStudios !== null && (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">{t('studio.studiosUsed')}</span>
              <Badge variant={atLimit ? "destructive" : "secondary"}>
                {usedStudios} / {maxStudios}
              </Badge>
              {atLimit && <Lock className="h-3.5 w-3.5 text-destructive shrink-0" />}
            </div>
          )}
          <div className="flex flex-col gap-1 sm:items-end">
            <div className="flex items-center gap-2">
              <Input
                value={newStudioName}
                onChange={e => setNewStudioName(e.target.value)}
                placeholder={t('studio.newName')}
                className="flex-1 sm:w-48 sm:flex-none"
                disabled={creating || atLimit || !isActivated || !isVerified}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !creating && !atLimit && isActivated && isVerified) {
                    handleCreateStudio();
                  }
                }}
              />
              <Button
                onClick={handleCreateStudio}
                disabled={creating || atLimit || !isActivated || !isVerified}
                variant="default"
                className="shrink-0"
                title={!isVerified ? t('studio.verifyEmailToCreate') : !isActivated ? t('studio.activateToCreate') : atLimit ? `${t('studio.studioLimitTitle')} (${usedStudios} / ${maxStudios})` : undefined}
              >
                {creating ? t('common.loading') : t('studio.create')}
              </Button>
            </div>
            {!atLimit && isActivated && isVerified && (
              <p className="text-xs text-muted-foreground">
                {t('studio.createCostHintPt1')}<span className="text-green-500 font-medium">{t('studio.createCostHintFree')}</span>{t('studio.createCostHintPt2')}<span className="text-yellow-500 font-medium">🪙 {STUDIO_COST} coins</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {atLimit && (
        <Alert variant="destructive" className="mb-6">
          <Lock className="h-4 w-4" />
          <AlertTitle>{t('studio.studioLimitTitle')}</AlertTitle>
          <AlertDescription>
            {t('studio.studioLimitDesc1')} {usedStudios} {t('studio.studioLimitDesc2')} {maxStudios} {t('studio.studioLimitDesc3')}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {createError && (
        <Alert variant="destructive" className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <div>
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{createError}</AlertDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCreateError(null)}>
            <X className="w-4 h-4" />
          </Button>
        </Alert>
      )}

      {loading ? (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/3 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : studios.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="mb-4">{t('studio.noStudios')}</p>
            {!isActivated && referralCodeRequired && (
              <ReferralCodeInput onActivated={async () => { await refreshUser(); loadStudios() }} />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {studios.map((studio) => (
            <Card key={studio.id} className="overflow-hidden">
              <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="flex flex-col space-y-2 min-w-0 flex-1">
                  <CardTitle className="text-lg sm:text-xl">
                    <Link href={`/studios/${studio.id}`} className="inline-flex items-center gap-1 hover:text-primary">
                      <span className="truncate">{studio.name}</span>
                      <ExternalLink className="w-4 h-4 shrink-0" />
                    </Link>
                  </CardTitle>
                  {studio.slug && (
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs font-mono truncate max-w-full">{studio.slug}</Badge>
                    </div>
                  )}
                  {studio.description && (
                    <p className="text-sm text-muted-foreground break-words">{studio.description}</p>
                  )}
                  <div className="flex flex-col gap-1">
                    {studio.tier && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm ">{t('studio.tier')}:</span>
                        <span className="text-sm ">{studio.tier}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link href={`/studios/${studio.id}`}>{t('studio.viewDetails')}</Link>
                </Button>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span>{t('common.games')}: {studio.usage?.games ?? studio.game_count}</span>
                  <span>{t('studio.totalMembers')}: {studio.usage?.total_members ?? 0}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </>
  )
}

function ReferralCodeInput({ onActivated }: { onActivated: () => void }) {
  const { t } = useTranslation()
  const [code, setCode] = useState("")
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return

    setActivating(true)
    setError(null)
    try {
      await activateReferralCode(code.trim())
      setSuccess(true)
      setCode("")
      onActivated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired referral code")
    } finally {
      setActivating(false)
    }
  }

  return (
    <div className="w-full max-w-md mt-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{t('studio.referralHint')}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={handleActivate} className="flex gap-2">
        <div className="relative flex-1">
          <TicketPercent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('studio.enterReferralCode')}
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(null) }}
            className="pl-9"
            disabled={activating || success}
          />
        </div>
        <Button type="submit" disabled={activating || !code.trim() || success}>
          {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : t('studio.activate')}
        </Button>
      </form>
      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-500 mt-2">{t('studio.referralActivated')}</p>
      )}
    </div>
  )
}
