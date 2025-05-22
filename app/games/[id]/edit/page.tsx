"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { getGame, updateGame } from "@/lib/game-api"
import type { Game } from "@/types/game"
import { GameStatus } from "@/types/game"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function EditGamePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [game, setGame] = useState<Game | null>(null)
  const [name, setName] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const gameId = params.id

  useEffect(() => {
    async function loadGame() {
      try {
        setLoading(true)
        const gameData = await getGame(gameId)
        setGame(gameData)
        setName(gameData.name)
        setStatus(gameData.status)
        setError(null)
      } catch (err) {
        setError("Failed to load game details. Please try again.")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadGame();
  }, [gameId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      setError("Game name is required")
      return
    }

    try {
      setSaving(true)
      setError(null)

      await updateGame(gameId, { name, status })

      toast({
        title: "Game updated",
        description: `${name} has been updated successfully.`,
      })

      router.push(`/games/${gameId}`)
    } catch (err) {
      console.error(err)
      setError("Failed to update game. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse">
          <div className="h-8 w-1/3 bg-muted/50 rounded mb-4" />
          <div className="h-4 w-1/4 bg-muted/50 rounded mb-8" />
          <Card>
            <CardHeader className="h-24 bg-muted/50 rounded-t-lg" />
            <CardContent className="p-6">
              <div className="h-4 w-3/4 bg-muted/50 rounded mb-4" />
              <div className="h-4 w-1/2 bg-muted/50 rounded mb-4" />
              <div className="h-4 w-2/3 bg-muted/50 rounded" />
            </CardContent>
            <CardFooter className="bg-muted/20 h-12 rounded-b-lg" />
          </Card>
        </div>
      </div>
    )
  }

  if (error && !game) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>There was a problem loading the game details</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
            <Button className="ml-2" onClick={() => router.refresh()}>
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
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
          <h1 className="text-3xl font-bold tracking-tight">Edit Game</h1>
          <p className="text-muted-foreground">Update game details</p>
        </div>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Game Details</CardTitle>
          <CardDescription>Edit the information for your game</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{error}</div>}

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

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GameStatus.Development}>Development</SelectItem>
                  <SelectItem value={GameStatus.Alpha}>Alpha</SelectItem>
                  <SelectItem value={GameStatus.Beta}>Beta</SelectItem>
                  <SelectItem value={GameStatus.Released}>Released</SelectItem>
                  <SelectItem value={GameStatus.Archived}>Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
