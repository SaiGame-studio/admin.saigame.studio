"use client"

import React, { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { fetchTeamDetails, fetchTeamMembers, fetchTeamGames } from "@/lib/team-api"
import { fetchStudio } from "@/lib/studio-api"
import { formatTimestamp } from "@/lib/utils/date-utils"
import type { Team, TeamMember } from "@/types/team"
import type { Studio } from "@/types/studio"
import type { Game } from "@/types/game"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, ArrowLeft, ExternalLink } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb"
import { AddMemberDialog } from "@/components/AddMemberDialog"
import { EditMemberRoleDialog } from "@/components/EditMemberRoleDialog"
import { RemoveMemberDialog } from "@/components/RemoveMemberDialog"
import { AddGameToTeamDialog } from "@/components/AddGameToTeamDialog"
import { RemoveGameFromTeamDialog } from "@/components/RemoveGameFromTeamDialog"
import TeamNameEditable, { TeamDescriptionEditable } from "@/components/TeamNameEditable"
import { CopyButton } from "@/components/CopyButton"
import { DeleteTeamDialog } from "@/components/DeleteTeamDialog"

export default function TeamDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [team, setTeam] = useState<Team | null>(null)
  const [studio, setStudio] = useState<Studio | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [membersLoading, setMembersLoading] = useState(true)
  const [gamesLoading, setGamesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [gamesError, setGamesError] = useState<string | null>(null)
  const hasFetched = useRef(false)

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
            const studioData = await fetchStudio(data.studio_id)
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

    async function loadGames() {
      try {
        setGamesLoading(true)
        const data = await fetchTeamGames(params.id)
        setGames(data)
        setGamesError(null)
      } catch (err) {
        setGamesError(err instanceof Error ? err.message : "Failed to load team games")
      } finally {
        setGamesLoading(false)
      }
    }

    loadTeam().then();
    loadMembers().then();
    loadGames().then();
  }, [params.id])

  const handleMemberAdded = () => {
    // Reload members list after adding a new member
    fetchTeamMembers(params.id)
      .then(data => setMembers(data))
      .catch(err => console.error("Failed to reload members:", err))
    // Refresh studio usage so slot counter stays accurate
    if (team?.studio_id) {
      fetchStudio(team.studio_id)
        .then(data => setStudio(data))
        .catch(err => console.error("Failed to refresh studio:", err))
    }
  }

  const handleGamesAdded = () => {
    // Reload games list after adding new games
    fetchTeamGames(params.id)
      .then(data => setGames(data))
      .catch(err => console.error("Failed to reload games:", err))
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
      ) : team ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => team?.studio_id ? router.push(`/studios/${team.studio_id}`) : router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <TeamNameEditable
                  team={team}
                  teamId={team.id}
                  onNameUpdate={newName => setTeam(prev => prev ? { ...prev, name: newName } : prev)}
                />
                <TeamDescriptionEditable
                  team={team}
                  teamId={team.id}
                  onDescriptionUpdate={newDescription => setTeam(prev => prev ? { ...prev, description: newDescription } : prev)}
                />
              </div>
            </div>
            <DeleteTeamDialog team={team} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">ID</p>
                  <p className="text-sm text-muted-foreground flex items-center">{team.id}<CopyButton text={team.id} /></p>
                </div>
                {team.slug && (
                  <div>
                    <p className="text-sm font-medium">Slug</p>
                    <Badge variant="outline" className="font-mono">{team.slug}</Badge>
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

          {/* Games Section */}
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Games</CardTitle>
                <CardDescription>Games assigned to this team</CardDescription>
              </div>
              {team.studio_id && (
                <AddGameToTeamDialog 
                  teamId={team.id} 
                  studioId={team.studio_id}
                  existingGameIds={games.map(g => g.id)}
                  onGamesAdded={handleGamesAdded}
                />
              )}
            </CardHeader>
            <CardContent className="group">
              {gamesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : games.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {games.map((game, index) => (
                    <React.Fragment key={game.id}>
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/games/${game.id}`}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          {game.name}
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <RemoveGameFromTeamDialog 
                          teamId={team.id}
                          game={game}
                          onGameRemoved={handleGamesAdded}
                        />
                      </div>
                      {index < games.length - 1 && (
                        <span className="text-muted-foreground">•</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No games assigned to this team.</p>
              )}
            </CardContent>
          </Card>

          {/* Members Section */}
          <Card className="mt-6 border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Members</CardTitle>
                <CardDescription>Members in this team</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {studio?.limits?.max_total_members != null && studio?.usage?.total_members != null && (
                  <div className="w-44 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Studio slots</span>
                      <span className={`font-semibold ${
                        studio.usage.total_members >= studio.limits.max_total_members
                          ? 'text-destructive'
                          : ''
                      }`}>
                        {studio.usage.total_members} / {studio.limits.max_total_members}
                      </span>
                    </div>
                    <Progress
                      value={Math.min((studio.usage.total_members / studio.limits.max_total_members) * 100, 100)}
                      className={`h-1.5 ${
                        studio.usage.total_members >= studio.limits.max_total_members
                          ? '[&>div]:bg-destructive'
                          : ''
                      }`}
                    />
                  </div>
                )}
                <AddMemberDialog
                  teamId={team.id}
                  onMemberAdded={handleMemberAdded}
                  studioMembersUsage={studio?.usage?.total_members}
                  studioMembersLimit={studio?.limits?.max_total_members}
                />
              </div>
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
                    <div key={member.id} className="p-4 border rounded-md group">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-lg">
                            {member.display_name || member.email || "-"}
                          </p>
                          {member.username && (
                            <p className="text-sm text-muted-foreground">@{member.username}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={member.is_active ? "default" : "secondary"}>
                            {member.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {member.role_name?.toLowerCase() !== "owner" && (
                            <RemoveMemberDialog 
                              teamId={team.id} 
                              member={member} 
                              onMemberRemoved={handleMemberAdded} 
                            />
                          )}
                        </div>
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
                          <p className="text-sm text-muted-foreground font-mono truncate flex items-center" title={member.user_id}>
                            {member.user_id}<CopyButton text={member.user_id} />
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
