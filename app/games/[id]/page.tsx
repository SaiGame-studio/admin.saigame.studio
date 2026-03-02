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
import { ArrowLeft, Edit, Gamepad2, ExternalLink, Store, Package, Users, Copy, Check, BarChart2, Hammer, BookOpen, Dices, ScrollText } from "lucide-react"
import Link from "next/link"
import { formatTimestamp } from "@/lib/utils/date-utils"
import { Progress } from "@/components/ui/progress"
import { GameNameEditable, GameStatusEditable, GameDescriptionEditable } from "@/components/StudioNameEditable"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb"
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { DeleteGameDialog } from "@/components/DeleteGameDialog"
import { GameNavButtons } from "@/components/GameNavButtons"
import { RemoveTeamFromGameDialog } from "@/components/RemoveTeamFromGameDialog"
import { AddTeamToGameDialog } from "@/components/AddTeamToGameDialog"
import { Skeleton } from "@/components/ui/skeleton"
import { getGamePlugins, getPluginCatalog, type GamePluginsResult, type Plugin } from "@/lib/plugin-api"

const fmt = (n: number) => n.toLocaleString()

const GEM_TIERS_MINI = [
  { image: "/materias/common.png",    label: "Uncommon",  text: "text-green-400"  },
  { image: "/materias/rare.png",      label: "Rare",      text: "text-blue-400"   },
  { image: "/materias/epic.png",      label: "Epic",      text: "text-red-400"    },
  { image: "/materias/legendary.png", label: "Legendary", text: "text-yellow-400" },
]

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
    const [copied, setCopied] = useState(false)
    const [gamePlugins, setGamePlugins] = useState<GamePluginsResult | null>(null)
    const [catalog, setCatalog] = useState<Plugin[]>([])
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

        async function loadPlugins() {
            try {
                const [catalogData, pluginsData] = await Promise.all([
                    getPluginCatalog(),
                    getGamePlugins(gameId),
                ])
                setCatalog(catalogData)
                setGamePlugins(pluginsData)
            } catch (err) {
                console.error("Failed to load plugins:", err)
            }
        }

        loadGame().then();
        loadTeams().then();
        loadPlugins().then();
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
                        <CardTitle>{t('common.error')}</CardTitle>
                        <CardDescription>{t('game.loadError')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>{error || t('game.notFoundText')}</p>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" onClick={() => router.back()}>
                            {t('common.back')}
                        </Button>
                        <Button className="ml-2" onClick={() => router.refresh()}>
                            {t('game.tryAgain')}
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
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => game.studio_id ? router.push(`/studios/${game.studio_id}`) : router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
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
                </div>
                <div className="flex gap-2 mt-4 md:mt-0 items-center flex-wrap">
                    <DeleteGameDialog game={game} />
                    <div className="w-px h-6 bg-border self-center" />
                    <GameNavButtons gameId={game.id} />
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-medium ">{t('game.gameId')}</h3>
                                    <div className="flex items-center gap-2">
                                        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm break-all">
                                            {game.id}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0"
                                            onClick={() => {
                                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                                    navigator.clipboard.writeText(game.id)
                                                } else {
                                                    const textarea = document.createElement('textarea')
                                                    textarea.value = game.id
                                                    textarea.style.position = 'fixed'
                                                    textarea.style.opacity = '0'
                                                    document.body.appendChild(textarea)
                                                    textarea.select()
                                                    document.execCommand('copy')
                                                    document.body.removeChild(textarea)
                                                }
                                                setCopied(true)
                                                setTimeout(() => setCopied(false), 2000)
                                            }}
                                        >
                                            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                        </Button>
                                    </div>
                                </div>
                                {game.studio_id && (
                                    <div>
                                        <h3 className="text-sm font-medium ">{t('common.studio')}</h3>
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
                                        <Link href={`/games/${game.id}/players`} className="text-primary hover:text-primary/80 flex items-center gap-1">
                                            {game.usage?.player_profiles ?? game.player_count ?? 0}
                                            <ExternalLink className="inline-block h-4 w-4 ml-1" />
                                        </Link>
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium ">{t('game.itemProfileCount')}</h3>
                                    <p className="text-lg">
                                        <Link href={`/games/${game.id}/items`} className="text-primary hover:text-primary/80 flex items-center gap-1">
                                            {game.usage?.items ?? 0}
                                            <ExternalLink className="inline-block h-4 w-4 ml-1" />
                                        </Link>
                                    </p>
                                </div>
                            </div>

                            {/* Mini Equipment Panel — 3rd column */}
                            {catalog.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                            {t('plugins.materia.equipment')}
                                        </p>
                                        <Link
                                            href={`/games/${game.id}/plugins`}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                        >
                                            <Hammer className="h-3.5 w-3.5" />
                                        </Link>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {catalog.filter(p => p.max_stacks > 0).map((plugin, idx) => {
                                            const tier = GEM_TIERS_MINI[idx % 4]
                                            const subs = gamePlugins?.subscriptions.filter(s => s.plugin.id === plugin.id) ?? []
                                            const owned = subs.reduce((sum, s) => sum + s.subscription.stack_count, 0)
                                            const cancelledOwned = subs.filter(s => s.is_cancelled).reduce((sum, s) => sum + s.subscription.stack_count, 0)
                                            const activeOwned = owned - cancelledOwned
                                            return (
                                                <div key={plugin.id} className="flex items-center gap-3">
                                                    <span className={`text-xs font-semibold w-20 shrink-0 ${tier.text}`}>{plugin.display_name}</span>
                                                    <div className="flex gap-1">
                                                        {Array.from({ length: plugin.max_stacks }).map((_, si) => (
                                                            <span key={si} className="relative inline-flex w-5 h-5">
                                                                <img
                                                                    src={tier.image}
                                                                    alt=""
                                                                    className="w-full h-full rounded-full"
                                                                    style={
                                                                        si < activeOwned
                                                                            ? undefined
                                                                            : si < owned
                                                                            ? { filter: "grayscale(0.6) brightness(0.7)", opacity: 0.6 }
                                                                            : { filter: "grayscale(1) brightness(0.3)", opacity: 0.3 }
                                                                    }
                                                                />
                                                                {si >= activeOwned && si < owned && (
                                                                    <span className="absolute inset-0 rounded-full border-2 border-orange-400/70" />
                                                                )}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">{owned}/{plugin.max_stacks}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <Button asChild variant="outline" size="sm" className="mt-4 w-full flex items-center gap-2">
                                        <Link href={`/games/${game.id}/plugins`}>
                                            <Hammer className="h-4 w-4" />
                                            Upgrade This Game
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Limits & Usage Section */}
                {(game.limits || game.usage) && (
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <BarChart2 className="mr-2 h-5 w-5" />
                                {t('game.limitsAndUsage')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Concurrent Users */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium">{t('game.onlineUsers')}</span>
                                        <span className={`text-muted-foreground ${game.limits?.max_concurrent_users != null && (game.usage?.concurrent_users ?? 0) >= game.limits.max_concurrent_users ? 'text-destructive font-semibold' : ''}`}>
                                            {fmt(game.usage?.concurrent_users ?? 0)} / {game.limits?.max_concurrent_users != null ? fmt(game.limits.max_concurrent_users) : '∞'}
                                            {game.limits?.max_concurrent_users != null && (game.usage?.concurrent_users ?? 0) >= game.limits.max_concurrent_users && ` (${t('game.limitReached')})`}
                                        </span>
                                    </div>
                                    <Progress
                                        value={game.limits?.max_concurrent_users
                                            ? Math.min(((game.usage?.concurrent_users ?? 0) / game.limits.max_concurrent_users) * 100, 100)
                                            : 0}
                                        className={`h-2 ${game.limits?.max_concurrent_users != null && (game.usage?.concurrent_users ?? 0) >= game.limits.max_concurrent_users ? '[&>div]:bg-destructive' : ''}`}
                                    />
                                </div>
                                {/* Player Profiles (Total Players) */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <Link href={`/games/${game.id}/players`} className="font-medium inline-flex items-center gap-1 text-primary hover:text-primary/80">
                                            {t('game.totalPlayer')}
                                            <ExternalLink className="h-3 w-3" />
                                        </Link>
                                        <span className={`text-muted-foreground ${game.limits?.max_player_profiles != null && (game.usage?.player_profiles ?? 0) >= game.limits.max_player_profiles ? 'text-destructive font-semibold' : ''}`}>
                                            {fmt(game.usage?.player_profiles ?? 0)} / {game.limits?.max_player_profiles != null ? fmt(game.limits.max_player_profiles) : '∞'}
                                            {game.limits?.max_player_profiles != null && (game.usage?.player_profiles ?? 0) >= game.limits.max_player_profiles && ` (${t('game.limitReached')})`}
                                        </span>
                                    </div>
                                    <Progress
                                        value={game.limits?.max_player_profiles
                                            ? Math.min(((game.usage?.player_profiles ?? 0) / game.limits.max_player_profiles) * 100, 100)
                                            : 0}
                                        className={`h-2 ${game.limits?.max_player_profiles != null && (game.usage?.player_profiles ?? 0) >= game.limits.max_player_profiles ? '[&>div]:bg-destructive' : ''}`}
                                    />
                                </div>
                                {/* Items */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <Link href={`/games/${game.id}/items`} className="font-medium inline-flex items-center gap-1 text-primary hover:text-primary/80">
                                            {t('game.items')}
                                            <ExternalLink className="h-3 w-3" />
                                        </Link>
                                        <span className={`text-muted-foreground ${game.limits?.max_items != null && (game.usage?.items ?? 0) >= game.limits.max_items ? 'text-destructive font-semibold' : ''}`}>
                                            {fmt(game.usage?.items ?? 0)} / {game.limits?.max_items != null ? fmt(game.limits.max_items) : '∞'}
                                            {game.limits?.max_items != null && (game.usage?.items ?? 0) >= game.limits.max_items && ` (${t('game.limitReached')})`}
                                        </span>
                                    </div>
                                    <Progress
                                        value={game.limits?.max_items
                                            ? Math.min(((game.usage?.items ?? 0) / game.limits.max_items) * 100, 100)
                                            : 0}
                                        className={`h-2 ${game.limits?.max_items != null && (game.usage?.items ?? 0) >= game.limits.max_items ? '[&>div]:bg-destructive' : ''}`}
                                    />
                                </div>
                                {/* Shops */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <Link href={`/games/${game.id}/shops`} className="font-medium inline-flex items-center gap-1 text-primary hover:text-primary/80">
                                            {t('game.shops')}
                                            <ExternalLink className="h-3 w-3" />
                                        </Link>
                                        <span className={`text-muted-foreground ${game.limits?.max_shops != null && (game.usage?.shops ?? 0) >= game.limits.max_shops ? 'text-destructive font-semibold' : ''}`}>
                                            {fmt(game.usage?.shops ?? 0)} / {game.limits?.max_shops != null ? fmt(game.limits.max_shops) : '∞'}
                                            {game.limits?.max_shops != null && (game.usage?.shops ?? 0) >= game.limits.max_shops && ` (${t('game.limitReached')})`}
                                        </span>
                                    </div>
                                    <Progress
                                        value={game.limits?.max_shops
                                            ? Math.min(((game.usage?.shops ?? 0) / game.limits.max_shops) * 100, 100)
                                            : 0}
                                        className={`h-2 ${game.limits?.max_shops != null && (game.usage?.shops ?? 0) >= game.limits.max_shops ? '[&>div]:bg-destructive' : ''}`}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Teams Section */}
                <Card className="lg:col-span-3 mt-6">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div>
                            <CardTitle>{t('studio.teams')}</CardTitle>
                            <CardDescription>{t('game.teamsDesc')}</CardDescription>
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
                            <p className="text-sm text-muted-foreground">{t('game.noTeamsAssigned')}</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
