"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createGame } from "@/lib/game-api"
import { fetchUserStudios, fetchStudio } from "@/lib/studio-api"
import type { Studio } from "@/types/studio"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, Gamepad2 } from "lucide-react"
import { useTranslation } from '@/lib/i18n/use-translation'
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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

const GAME_COST = 5

function NewGameForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState("")
  const [studioId, setStudioId] = useState("")
  const [studios, setStudios] = useState<Studio[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [studioDetail, setStudioDetail] = useState<Studio | null>(null)
  const [studioDetailLoading, setStudioDetailLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { t } = useTranslation();

  useEffect(() => {
    async function loadStudios() {
      setLoading(true)
      try {
        const studiosData = await fetchUserStudios()
        setStudios(studiosData)
      } catch (err) {
        setError("Failed to load studios. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    loadStudios()
  }, [])

  // Separate effect to handle studio selection after studios are loaded
  useEffect(() => {
    if (studios.length === 0) return
    
    const studioParam = searchParams.get("studio")
    console.log("Studio param from URL:", studioParam)
    console.log("Available studios:", studios)
    
    if (studioParam) {
      const studioExists = studios.some(s => s.id === studioParam)
      console.log("Studio exists:", studioExists)
      if (studioExists) {
        console.log("Setting studioId to:", studioParam)
        setStudioId(studioParam)
      } else {
        console.log("Studio param invalid, selecting first studio")
        setStudioId(studios[0].id)
      }
    } else {
      console.log("No studio param, selecting first studio")
      setStudioId(studios[0].id)
    }
  }, [studios, searchParams])

  // Fetch studio detail when studioId changes to get accurate limits/usage
  useEffect(() => {
    if (!studioId) {
      setStudioDetail(null)
      return
    }
    let cancelled = false
    setStudioDetailLoading(true)
    fetchStudio(studioId)
      .then(data => { if (!cancelled) setStudioDetail(data) })
      .catch(() => { if (!cancelled) setStudioDetail(null) })
      .finally(() => { if (!cancelled) setStudioDetailLoading(false) })
    return () => { cancelled = true }
  }, [studioId])

  const selectedStudio = studioDetail ?? studios.find(s => s.id === studioId)
  const studioLimitReached = !!(selectedStudio?.limits?.max_games != null && (selectedStudio.usage?.games ?? 0) >= selectedStudio.limits.max_games)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Game name is required")
      return
    }
    if (!studioId) {
      setError("Please select a studio")
      return
    }
    if (studioLimitReached) {
      setShowConfirm(true)
      return
    }
    await doCreateGame()
  }

  async function doCreateGame() {
    try {
      setSubmitting(true)
      setError(null)
      const token = localStorage.getItem("token") || ""
      const newGame = await createGame(studioId, { name, status: "development" }, token)
      // Refresh coin balance so the float text shows the deduction (if any)
      window.dispatchEvent(new Event("wallet:refresh"))
      if (newGame && newGame.id) {
        router.push(`/games/${newGame.id}`)
      } else {
        router.push("/games")
      }
    } catch (err: any) {
      setError(err.message || "Failed to create game. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
    <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm game creation</AlertDialogTitle>
          <AlertDialogDescription>
            This studio has reached its game limit. Creating{" "}
            <span className="font-semibold text-foreground">&ldquo;{name}&rdquo;</span> will cost an extra{" "}
            <span className="font-semibold text-foreground">🪙 {GAME_COST} coins</span>. Do you want to proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={async () => { setShowConfirm(false); await doCreateGame() }}>
            Confirm & Pay {GAME_COST} coins
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('game.createNew')}</h1>
          <p className="">{t('game.addToStudio')}</p>
        </div>
      </div>

      {/* Game limit / usage indicator */}
      {(selectedStudio || studioDetailLoading) && studioId && (
        <div className="max-w-2xl mx-auto mb-6 rounded-md border p-3 bg-muted/30 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Gamepad2 className="h-3.5 w-3.5" />
              Games usage
            </span>
            {studioDetailLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : selectedStudio?.limits?.max_games != null ? (
              <Badge variant={studioLimitReached ? "destructive" : (selectedStudio.usage?.games ?? 0) / selectedStudio.limits.max_games >= 0.8 ? "secondary" : "outline"}>
                {selectedStudio.usage?.games ?? 0} / {selectedStudio.limits.max_games}
              </Badge>
            ) : (
              <Badge variant="outline">{selectedStudio?.usage?.games ?? 0} / ∞</Badge>
            )}
          </div>
          {studioDetailLoading ? (
            <Skeleton className="h-1.5 w-full" />
          ) : selectedStudio?.limits?.max_games != null && (
            <Progress
              value={Math.min(((selectedStudio.usage?.games ?? 0) / selectedStudio.limits.max_games) * 100, 100)}
              className={`h-1.5 ${studioLimitReached ? "[&>div]:bg-destructive" : (selectedStudio.usage?.games ?? 0) / selectedStudio.limits.max_games >= 0.8 ? "[&>div]:bg-yellow-500" : ""}`}
            />
          )}
          {/* Coin cost hint */}
          {!studioDetailLoading && (
            <p className="text-xs text-muted-foreground">
              The first game is <span className="text-green-500 font-medium">free</span>, additional games cost <span className="text-yellow-500 font-medium">🪙 {GAME_COST} coins</span>
            </p>
          )}
        </div>
      )}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{t('game.details')}</CardTitle>
          <CardDescription>{t('game.detailsDesc')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="studio">{t('common.studio')}</Label>
              <Select value={studioId} onValueChange={setStudioId} disabled={loading || studios.length === 0}>
                <SelectTrigger id="studio">
                  <SelectValue placeholder={t('game.selectStudio')} />
                </SelectTrigger>
                <SelectContent>
                  {studios.map((studio) => {
                    const atLimit = studio.limits?.max_games != null && (studio.usage?.games ?? 0) >= studio.limits.max_games
                    return (
                      <SelectItem key={studio.id} value={studio.id} disabled={atLimit}>
                        {studio.name}{atLimit ? ` (limit reached)` : studio.limits?.max_games != null ? ` (${studio.usage?.games ?? 0}/${studio.limits.max_games})` : ''}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t('game.name')}</Label>
              <Input
                id="name"
                placeholder={t('game.enterName')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" onClick={() => router.back()}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={submitting || loading || studios.length === 0}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('game.create')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
    </>
  )
}

export default function NewGamePage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-muted/50 rounded mb-6" />
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="h-24 bg-muted/50" />
            <CardContent className="h-48 bg-muted/30" />
          </Card>
        </div>
      </div>
    }>
      <NewGameForm />
    </Suspense>
  )
} 