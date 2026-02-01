"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createGame } from "@/lib/game-api"
import { fetchUserStudios } from "@/lib/studio-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useTranslation } from '@/lib/i18n/use-translation'

function NewGameForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState("")
  const [studioId, setStudioId] = useState("")
  const [studios, setStudios] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
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
    try {
      setSubmitting(true)
      setError(null)
      const token = localStorage.getItem("token") || ""
      const newGame = await createGame(studioId, { name, status: "development" }, token)
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
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>
      </div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('game.createNew')}</h1>
          <p className="">{t('game.addToStudio')}</p>
        </div>
      </div>
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
                  {studios.map((studio) => (
                    <SelectItem key={studio.id} value={studio.id}>{studio.name}</SelectItem>
                  ))}
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