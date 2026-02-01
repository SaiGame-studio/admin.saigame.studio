"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { fetchTeamDetails, fetchTeamMembers } from "@/lib/team-api"
import { fetchStudioWithCache } from "@/lib/studio-api"
import { formatTimestamp } from "@/lib/utils/date-utils"
import type { Team, TeamMember } from "@/types/team"
import type { Studio } from "@/types/studio"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, ArrowLeft, ExternalLink } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb"
import { AddMemberDialog } from "@/components/AddMemberDialog"
import { EditMemberRoleDialog } from "@/components/EditMemberRoleDialog"

export default function TeamDetailsPage({ params }: { params: { id: string } }) {
  const [team, setTeam] = useState<Team | null>(null)
  const [studio, setStudio] = useState<Studio | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [membersLoading, setMembersLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [membersError, setMembersError] = useState<string | null>(null)
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

    async function loadMembers() {
      try {
        setMembersLoading(true)
        const data = await fetchTeamMembers(params.id)
        setMembers(data)
        setMembersError(null)
      } catch (err) {
        setMembersError(err instanceof Error ? err.message : "Failed to load team members")
      } finally {
        setMembersLoading(false)
      }
    }

    loadTeam().then();
    loadMembers().then();
  }, [params.id])

  const handleMemberAdded = () => {
    // Reload members list after adding a new member
    fetchTeamMembers(params.id)
      .then(data => setMembers(data))
      .catch(err => console.error("Failed to reload members:", err))
  }

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

      {membersError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{membersError}</AlertDescription>
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

          {/* Members Section */}
          <Card className="mt-6 border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Members</CardTitle>
                <CardDescription>Members in this team</CardDescription>
              </div>
              <AddMemberDialog teamId={team.id} onMemberAdded={handleMemberAdded} />
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : members.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {members.map((member) => (
                    <div key={member.id} className="p-4 border rounded-md">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-lg">
                            {member.display_name}
                          </p>
                          {member.username && (
                            <p className="text-sm text-muted-foreground">@{member.username}</p>
                          )}
                        </div>
                        <Badge variant={member.is_active ? "default" : "secondary"}>
                          {member.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-sm font-medium">Role</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-muted-foreground">{member.role_name}</p>
                            <EditMemberRoleDialog 
                              teamId={team.id} 
                              member={member} 
                              onRoleUpdated={handleMemberAdded} 
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Email</p>
                          <p className="text-sm text-muted-foreground">{member.email || "-"}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm font-medium">User ID</p>
                          <p className="text-sm text-muted-foreground font-mono truncate" title={member.user_id}>
                            {member.user_id}
                          </p>
                        </div>
                        {member.joined_at && (
                          <div>
                            <p className="text-sm font-medium">Joined At</p>
                            <p className="text-sm text-muted-foreground">{formatTimestamp(member.joined_at)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No members found for this team.</p>
                </div>
              )}
            </CardContent>
          </Card>
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
