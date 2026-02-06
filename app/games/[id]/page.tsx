"use client"

import React, { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { getGame, fetchGameTeams } from "@/lib/game-api"
import { fetchStudioWithCache } from "@/lib/studio-api"
import type { Game } from "@/types/game"
import type { Studio } from "@/types/studio"
import type { Team } from "@/types/team"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Gamepad2, ExternalLink, Store, Package, Users } from "lucide-react"
import Link from "next/link"
import { formatTimestamp } from "@/lib/utils/date-utils"
import { GameNameEditable, GameStatusEditable, GameDescriptionEditable } from "@/components/StudioNameEditable"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb"
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { DeleteGameDialog } from "@/components/DeleteGameDialog"
import { RemoveTeamFromGameDialog } from "@/components/RemoveTeamFromGameDialog"
import { AddTeamToGameDialog } from "@/components/AddTeamToGameDialog"
import { Skeleton } from "@/components/ui/skeleton"

export default function GameDetailsPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const { locale } = useLanguage()
    const { t } = useTranslation(locale)
    const [game, setGame] = useState<Game | null>(null)
    const [studio, setStudio] = useState<Studio | null>(null)
    const [teams, setTeams] = useState<Team[]>([])
    const [loading, setLoading] = useState(true)
    const [teamsLoading, setTeamsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const hasFetched = useRef(false)
    const gameId = params.id

    useEffect(() => {
        if (hasFetched.current) return
        hasFetched.current = true
        
        async function loadGame() {
            try {
                setLoading(true)
                const gameData = await getGame(gameId)
                setGame(gameData)
                
                // Load studio data if studio_id exists
                if (gameData.studio_id) {
                    try {
                        const studioData = await fetchStudioWithCache(gameData.studio_id)
                        setStudio(studioData)
                    } catch (err) {
                        console.error("Failed to load studio:", err)
                    }
                }
                
                setError(null)
            } catch (err) {
                setError("Failed to load game details. Please try again.")
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        async function loadTeams() {
            try {
                setTeamsLoading(true)
                const teamsData = await fetchGameTeams(gameId)
                setTeams(teamsData)
            } catch (err) {
                console.error("Failed to load teams:", err)
            } finally {
                setTeamsLoading(false)
            }
        }

        loadGame().then();
        loadTeams().then();
    }, [gameId])

    const handleTeamRemoved = () => {
        fetchGameTeams(gameId)
            .then(data => setTeams(data))
            .catch(err => console.error("Failed to reload teams:", err))
    }

    function getStatusColor(status: string) {
        switch (status) {
            case "released":
                return "bg-green-500"
            case "beta":
                return "bg-blue-500"
            case "alpha":
                return "bg-purple-500"
            case "development":
                return "bg-yellow-500"
            case "archived":
                return "bg-gray-500"
            default:
                return "bg-gray-500"
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

    if (error || !game) {
        return (
            <div className="container mx-auto py-6">
                <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle>Error</CardTitle>
                        <CardDescription>There was a problem loading the game details</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>{error || "Game not found"}</p>
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
            <div className="mb-2">
                <Breadcrumb>
                    <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/studios">{t('common.studios')}</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator>/</BreadcrumbSeparator>
                        {game.studio_id && (
                            <>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href={`/studios/${game.studio_id}`}>
                                        {studio?.name || game.studio?.name || t('common.studio')}
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                            </>
                        )}
                        <BreadcrumbItem>
                            <span className="">{game.name}</span>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div className="group">
                    <GameNameEditable
                        game={game}
                        gameId={game.id}
                        onNameUpdate={newName => setGame(prev => prev ? { ...prev, name: newName } : prev)}
                    />
                    <GameDescriptionEditable
                        game={game}
                        gameId={game.id}
                        onDescriptionUpdate={newDescription => setGame(prev => prev ? { ...prev, description: newDescription } : prev)}
                    />
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
                    <Button asChild variant="outline" className="flex items-center gap-2">
                        <Link href={`/games/${game.id}/shops`}>
                            <Store className="h-4 w-4" />
                            {t('game.shops')}
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="flex items-center gap-2">
                        <Link href={`/games/${game.id}/users`}>
                            <Users className="h-4 w-4" />
                            {t('game.users')}
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="flex items-center gap-2">
                        <Link href={`/games/${game.id}/item-profiles`}>
                            <Package className="h-4 w-4" />
                            {t('game.itemProfiles')}
                        </Link>
                    </Button>
                    <DeleteGameDialog game={game} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-3 group">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Gamepad2 className="mr-2 h-5 w-5" />
                            {t('game.information')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-medium ">{t('game.gameId')}</h3>
                                    <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm break-all">
                                        {game.id}
                                    </code>
                                </div>
                                {game.studio_id && (
                                    <div>
                                        <h3 className="text-sm font-medium ">Studio</h3>
                                        <Link 
                                            href={`/studios/${game.studio_id}`}
                                            className="inline-flex items-center gap-1 hover:text-primary transition-colors text-lg"
                                        >
                                            {studio?.name || game.studio_id}
                                            <ExternalLink className="w-4 h-4" />
                                        </Link>
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-sm font-medium ">{t('game.status')}</h3>
                                    <GameStatusEditable
                                        game={game}
                                        gameId={game.id}
                                        onStatusUpdate={newStatus => setGame(prev => prev ? { ...prev, status: newStatus } : prev)}
                                    />
                                </div>
                                {game.tier && (
                                    <div>
                                        <h3 className="text-sm font-medium ">{t('game.tier')}</h3>
                                        <p className="text-lg">{game.tier}</p>
                                    </div>
                                )}
                                {game.studio?.name && (
                                    <div>
                                        <h3 className="text-sm font-medium ">{t('game.studioName')}</h3>
                                        <p className="text-lg">
                                            <Link href={`/studios/${game.studio.id}`} className="inline-flex items-center gap-1 hover:text-primary">
                                                {game.studio.name}
                                                <ExternalLink className="w-4 h-4 " />
                                            </Link>
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-sm font-medium ">{t('game.createdAt')}</h3>
                                    <p className="text-lg">{formatTimestamp(game.created_at)}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium ">{t('game.updatedAt')}</h3>
                                    <p className="text-lg">{formatTimestamp(game.updated_at)}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-medium ">{t('game.shopCount')}</h3>
                                    <p className="text-lg">
                                        <Link href={`/games/${game.id}/shops`} className="text-primary hover:text-primary/80 flex items-center gap-1">
                                            {game.shop_count ?? 0}
                                            <ExternalLink className="inline-block h-4 w-4 ml-1" />
                                        </Link>
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium ">{t('game.totalPlayer')}</h3>
                                    <p className="text-lg">
                                        <Link href={`/games/${game.id}/users`} className="text-primary hover:text-primary/80 flex items-center gap-1">
                                            {game.player_count ?? 0}
                                            <ExternalLink className="inline-block h-4 w-4 ml-1" />
                                        </Link>
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium ">{t('game.itemProfileCount')}</h3>
                                    <p className="text-lg">
                                        <Link href={`/games/${game.id}/item-profiles`} className="text-primary hover:text-primary/80 flex items-center gap-1">
                                            {game.item_profile_count ?? 0}
                                            <ExternalLink className="inline-block h-4 w-4 ml-1" />
                                        </Link>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Teams Section */}
                <Card className="lg:col-span-3 mt-6">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div>
                            <CardTitle>Teams</CardTitle>
                            <CardDescription>Teams assigned to this game</CardDescription>
                        </div>
                        {game.studio_id && (
                            <AddTeamToGameDialog 
                                gameId={game.id} 
                                studioId={game.studio_id}
                                existingTeamIds={teams.map(t => t.id)}
                                onTeamsAdded={handleTeamRemoved}
                            />
                        )}
                    </CardHeader>
                    <CardContent className="group">
                        {teamsLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-full" />
                            </div>
                        ) : teams.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-2">
                                {teams.map((team, index) => (
                                    <React.Fragment key={team.id}>
                                        <div className="inline-flex items-center gap-1">
                                            <Link
                                                href={`/teams/${team.id}`}
                                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                            >
                                                {team.name}
                                                <ExternalLink className="w-4 h-4" />
                                            </Link>
                                            <RemoveTeamFromGameDialog 
                                                gameId={game.id}
                                                team={team}
                                                onTeamRemoved={handleTeamRemoved}
                                            />
                                        </div>
                                        {index < teams.length - 1 && (
                                            <span className="text-muted-foreground">•</span>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No teams assigned to this game.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
