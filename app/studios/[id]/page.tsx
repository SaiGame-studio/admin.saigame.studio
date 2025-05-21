"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchStudio, formatTimestamp } from "@/lib/studio-api"
import type { Studio } from "@/types/studio"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, ArrowLeft, Edit, Plus } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function StudioDetailsPage({ params }: { params: { id: string } }) {
  const [studio, setStudio] = useState<Studio | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

    loadStudio()
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
            <div className="space-x-2">
              <Button onClick={() => router.push(`/studios/${studio.id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" /> Edit Studio
              </Button>
              <Button onClick={() => router.push(`/studios/${studio.id}/games/new`)}>
                <Plus className="mr-2 h-4 w-4" /> Create Game
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
