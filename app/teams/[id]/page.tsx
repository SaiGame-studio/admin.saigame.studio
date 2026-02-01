"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { fetchTeamDetails } from "@/lib/team-api"
import { fetchStudioWithCache } from "@/lib/studio-api"
import { formatTimestamp } from "@/lib/utils/date-utils"
import type { Team } from "@/types/team"
import type { Studio } from "@/types/studio"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, ArrowLeft, ExternalLink } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb"

export default function TeamDetailsPage({ params }: { params: { id: string } }) {
  const [team, setTeam] = useState<Team | null>(null)
  const [studio, setStudio] = useState<Studio | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasFetched = useRef(false)
  const router = useRouter()

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    
    async function loadTeam() {
      try {
        setLoading(true)
        const data = await fetchTeamDetails(params.id)
        setTeam(data)
        
        // Load studio data with cache if studio_id exists
        if (data.studio_id) {
          try {
            const studioData = await fetchStudioWithCache(data.studio_id)
            setStudio(studioData)
          } catch (err) {
            console.error("Failed to load studio:", err)
          }
        }
        
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load team details")
      } finally {
        setLoading(false)
      }
    }

    loadTeam().then();
  }, [params.id])

  return (
    <div className="container mx-auto py-6">
      <div className="mb-2">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href="/studios">Studios</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            {studio && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/studios/${team?.studio_id}`}>{studio.name}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
              </>
            )}
            <BreadcrumbItem>
              <span>{team?.name || "Team Details"}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

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
      ) : team ? (
        <>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{team.name}</h1>
              <Badge variant={team.is_active ? "default" : "secondary"}>
                {team.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">ID</p>
                  <p className="text-sm text-muted-foreground">{team.id}</p>
                </div>
                {team.slug && (
                  <div>
                    <p className="text-sm font-medium">Slug</p>
                    <Badge variant="outline" className="font-mono">{team.slug}</Badge>
                  </div>
                )}
                {team.description && (
                  <div>
                    <p className="text-sm font-medium">Description</p>
                    <p className="text-sm text-muted-foreground">{team.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">Studio</p>
                  <Link href={`/studios/${team.studio_id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    {studio?.name || team.studio_id}
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Timestamps</CardTitle>
                <CardDescription>Creation and update information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Created At</p>
                  <p className="text-sm text-muted-foreground">{formatTimestamp(team.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Updated At</p>
                  <p className="text-sm text-muted-foreground">{formatTimestamp(team.updated_at)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>The requested team could not be found.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
