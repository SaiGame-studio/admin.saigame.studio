"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createGame } from "@/lib/game-api"
import { fetchUserStudios } from "@/lib/studio-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2 } from "lucide-react"

export default function NewGamePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState("")
  const [studioId, setStudioId] = useState("")
  const [studios, setStudios] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function loadStudios() {
      setLoading(true)
      try {
        const studiosData = await fetchUserStudios()
        setStudios(studiosData)
        // Check for studio query param
        const studioParam = searchParams.get("studio")
        if (studioParam && studiosData.some(s => s.id === studioParam)) {
          setStudioId(studioParam)
        } else if (studiosData.length > 0) {
          setStudioId(studiosData[0].id)
        }
      } catch (err) {
        setError("Failed to load studios. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    loadStudios()
  }, [searchParams])

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
          Back
        </Button>
      </div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Game</h1>
          <p className="text-muted-foreground">Add a new game to your studio</p>
        </div>
      </div>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Game Details</CardTitle>
          <CardDescription>Enter the information for your new game</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="studio">Studio</Label>
              <Select value={studioId} onValueChange={setStudioId} disabled={loading || studios.length === 0}>
                <SelectTrigger id="studio">
                  <SelectValue placeholder="Select a studio" />
                </SelectTrigger>
                <SelectContent>
                  {studios.map((studio) => (
                    <SelectItem key={studio.id} value={studio.id}>{studio.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Game Name</Label>
              <Input
                id="name"
                placeholder="Enter game name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || loading || studios.length === 0}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Game
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
} 