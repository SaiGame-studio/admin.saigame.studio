"use client"

import React, { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { fetchStudio, fetchStudioGames, fetchStudioTeams } from "@/lib/studio-api"
import { formatTimestamp } from "@/lib/utils/date-utils"
import type { Studio } from "@/types/studio"
import type { Game } from "@/types/game"
import type { Team } from "@/types/team"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, ArrowLeft, Edit, Plus, ExternalLink, BarChart2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import StudioNameEditable, { StudioDescriptionEditable } from "@/components/StudioNameEditable"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb"
import { useTranslation } from '@/lib/i18n/use-translation'
import CreateTeamDialog from "@/components/CreateTeamDialog"

export default function StudioDetailsPage({ params }: { params: { id: string } }) {
  const [studio, setStudio] = useState<Studio | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [gamesLoading, setGamesLoading] = useState(true)
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gamesError, setGamesError] = useState<string | null>(null)
  const [teamsError, setTeamsError] = useState<string | null>(null)
  const hasFetched = useRef(false)
  const router = useRouter()
  const { t } = useTranslation();

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    
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

    async function loadTeams() {
      try {
        setTeamsLoading(true)
        const data = await fetchStudioTeams(params.id)
        setTeams(data)
        setTeamsError(null)
      } catch (err) {
        setTeamsError(err instanceof Error ? err.message : "Failed to load studio teams")
      } finally {
        setTeamsLoading(false)
      }
    }

    loadStudio().then();
    loadGames().then();
    loadTeams().then();
  }, [params.id])

  return (
    <div className="container mx-auto py-6">
      <div className="mb-2">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href="/studios">{t('common.studios')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="">{studio?.name || t('studio.details')}</span>
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

      {gamesError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{gamesError}</AlertDescription>
        </Alert>
      )}

      {teamsError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{teamsError}</AlertDescription>
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
            <div className="group">
              <StudioNameEditable
                studio={studio}
                studioId={studio.id}
                onNameUpdate={newName => setStudio(prev => prev ? { ...prev, name: newName } : prev)}
              />
              <StudioDescriptionEditable
                studio={studio}
                studioId={studio.id}
                onDescriptionUpdate={newDescription => setStudio(prev => prev ? { ...prev, description: newDescription } : prev)}
              />
              <Badge className="mt-2">{studio.tier}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('studio.details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">ID</p>
                  <p className="text-sm ">{studio.id}</p>
                </div>
                {studio.slug && (
                  <div>
                    <p className="text-sm font-medium">Slug</p>
                    <Badge variant="outline" className="font-mono">{studio.slug}</Badge>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{t('studio.gamesCount')}</p>
                  <p className="text-sm">{studio.usage?.games ?? studio.game_count}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Owner User ID</p>
                  <p className="text-sm ">{studio.owner_user_id}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('studio.timestamps')}</CardTitle>
                <CardDescription>{t('studio.timestampsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">{t('studio.createdAt')}</p>
                  <p className="text-sm ">{formatTimestamp(studio.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t('studio.updatedAt')}</p>
                  <p className="text-sm ">{formatTimestamp(studio.updated_at)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Limits & Usage Section */}
          {(studio.limits || studio.usage) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart2 className="mr-2 h-5 w-5" />
                  Limits &amp; Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Games */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Games</span>
                      <span className="text-muted-foreground">
                        {studio.usage?.games ?? 0} / {studio.limits?.max_games ?? '∞'}
                      </span>
                    </div>
                    <Progress
                      value={studio.limits?.max_games
                        ? ((studio.usage?.games ?? 0) / studio.limits.max_games) * 100
                        : 0}
                      className="h-2"
                    />
                  </div>
                  {/* Total Members */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Total Members</span>
                      <span className="text-muted-foreground">
                        {studio.usage?.total_members ?? 0} / {studio.limits?.max_total_members ?? '∞'}
                      </span>
                    </div>
                    <Progress
                      value={studio.limits?.max_total_members
                        ? ((studio.usage?.total_members ?? 0) / studio.limits.max_total_members) * 100
                        : 0}
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Teams Section */}
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Teams</CardTitle>
                <CardDescription>Teams in this studio</CardDescription>
              </div>
              <CreateTeamDialog
                studioId={studio.id}
                onTeamCreated={(newTeam) => {
                  setTeams([...teams, newTeam])
                }}
              />
            </CardHeader>
            <CardContent>
              {teamsLoading ? (
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ) : teams.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {teams.map((team, index) => (
                    <React.Fragment key={team.id}>
                      <Link 
                        href={`/teams/${team.id}`}
                        className="inline-flex items-center gap-1 font-medium hover:text-primary transition-colors"
                      >
                        {team.name}
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      {index < teams.length - 1 && (
                        <span className="text-muted-foreground">•</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No teams found for this studio.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('common.games')}</CardTitle>
                <CardDescription>{t('studio.gamesBelonging')}</CardDescription>
              </div>
              <Button asChild>
                <a href={`/games/new?studio=${studio.id}`}>
                  <Plus className="mr-2 h-4 w-4" /> {t('studio.createGame')}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {games.map((game) => (
                    <div key={game.id} className="p-4 border rounded-md">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-lg">
                            <Link href={`/games/${game.id}`} className="inline-flex items-center gap-1 hover:text-primary">
                              {game.name}
                              <ExternalLink className="w-4 h-4 " />
                            </Link>
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => router.push(`/games/${game.id}`)}>
                          {t('studio.viewDetails')}
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-sm font-medium">ID</p>
                          <p className="text-sm ">{game.id}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{t('studio.status')}</p>
                          <p className="text-sm ">{game.status}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{t('studio.shopCount')}</p>
                          <p className="text-sm ">{game.usage?.shops ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{t('studio.totalPlayer')}</p>
                          <p className="text-sm ">{game.usage?.player_profiles ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{t('studio.itemProfileCount')}</p>
                          <p className="text-sm ">{game.usage?.items ?? 0}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="">No games found for this studio.</p>
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
