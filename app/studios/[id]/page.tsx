"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchStudio, fetchStudioGames } from "@/lib/studio-api"
import { formatTimestamp } from "@/lib/utils/date-utils"
import type { Studio } from "@/types/studio"
import type { Game } from "@/types/game"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, ArrowLeft, Edit, Plus } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"

export default function StudioDetailsPage({ params }: { params: { id: string } }) {
  const [studio, setStudio] = useState<Studio | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [gamesLoading, setGamesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gamesError, setGamesError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadStudio() {
      try {
        setLoading(true)
        const data = await fetchStudio(params.id)
        setStudio(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load studio details")
      } finally {
        setLoading(false)
      }
    }

    async function loadGames() {
      try {
        setGamesLoading(true)
        const data = await fetchStudioGames(params.id)
        setGames(data)
        setGamesError(null)
      } catch (err) {
        setGamesError(err instanceof Error ? err.message : "Failed to load studio games")
      } finally {
        setGamesLoading(false)
      }
    }

    loadStudio().then();
    loadGames().then();
  }, [params.id])

  return (
    <div className="container mx-auto py-6">
      <Button variant="ghost" className="mb-6" onClick={() => router.push("/studios")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Studios
      </Button>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {gamesError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{gamesError}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2 mb-2" />
            <Skeleton className="h-4 w-1/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ) : studio ? (
        <>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold">{studio.name}</h1>
              <Badge className="mt-2">{studio.tier}</Badge>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/studios/${studio.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" /> Edit Studio
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Studio Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">ID</p>
                  <p className="text-sm text-muted-foreground">{studio.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Games Count</p>
                  <p className="text-sm">{studio.games_count}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">User Profile ID</p>
                  <p className="text-sm text-muted-foreground">{studio.user_profile_id}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Timestamps</CardTitle>
                <CardDescription>When this studio was created and last updated</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Created At</p>
                  <p className="text-sm text-muted-foreground">{formatTimestamp(studio.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Updated At</p>
                  <p className="text-sm text-muted-foreground">{formatTimestamp(studio.updated_at)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Games</CardTitle>
                <CardDescription>Games belonging to this studio</CardDescription>
              </div>
              <Button asChild>
                <a href={`/games/new?studio=${studio.id}`}>
                  <Plus className="mr-2 h-4 w-4" /> Create Game
                </a>
              </Button>
            </CardHeader>
            <CardContent>
              {gamesLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : games.length > 0 ? (
                <div className="space-y-4">
                  {games.map((game) => (
                    <div key={game.id} className="p-4 border rounded-md">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-lg">{game.name}</p>
                          <Badge className="mt-1">{game.status}</Badge>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => router.push(`/games/${game.id}`)}>
                          View Details
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-sm font-medium">ID</p>
                          <p className="text-sm text-muted-foreground">{game.id}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Shop Count</p>
                          <p className="text-sm text-muted-foreground">{game.shop_count}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Created At</p>
                          <p className="text-sm text-muted-foreground">{formatTimestamp(game.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Updated At</p>
                          <p className="text-sm text-muted-foreground">{formatTimestamp(game.updated_at)}</p>
                        </div>
                        {game.studio_id && (
                          <div>
                            <p className="text-sm font-medium">Studio ID</p>
                            <p className="text-sm text-muted-foreground">{game.studio_id}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No games found for this studio.</p>
                  <Button asChild className="mt-4">
                    <a href={`/games/new?studio=${studio.id}`}>
                      <Plus className="mr-2 h-4 w-4" /> Create Your First Game
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>The requested studio could not be found.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
