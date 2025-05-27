"use client"

import React, {useEffect, useState} from "react"
import {useRouter} from "next/navigation"
import {useAuth} from "@/contexts/auth-context"
import {getStudioGames} from "@/lib/game-api"
import type {Game} from "@/types/game"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Gamepad2, Plus, ArrowRight} from "lucide-react"
import Link from "next/link"
import {formatDistanceToNow} from "date-fns"

export default function StudioGamesPage({params}: { params: { id: string } }) {
    const router = useRouter()
    const [games, setGames] = useState<Game[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const studioId = params.id

    useEffect(() => {
        async function loadGames() {
            try {
                setLoading(true)
                const gamesData = await getStudioGames(studioId)
                setGames(gamesData)
                setError(null)
            } catch (err) {
                setError("Failed to load games. Please try again.")
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        loadGames()
    }, [studioId])

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

    return (
        <div className="container mx-auto py-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Studio Games</h1>
                    <p className="text-muted-foreground">Manage games for this studio</p>
                </div>
                <Button asChild>
                    <Link href={`/studios/${studioId}/games/new`}>
                        <Plus className="mr-2 h-4 w-4"/>
                        New Game
                    </Link>
                </Button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="h-24 bg-muted/50 rounded-t-lg"/>
                            <CardContent className="p-6">
                                <div className="h-4 w-3/4 bg-muted/50 rounded mb-4"/>
                                <div className="h-4 w-1/2 bg-muted/50 rounded"/>
                            </CardContent>
                            <CardFooter className="bg-muted/20 h-12 rounded-b-lg"/>
                        </Card>
                    ))}
                </div>
            ) : error ? (
                <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle>Error</CardTitle>
                        <CardDescription>There was a problem loading the games</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>{error}</p>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" onClick={() => router.refresh()}>
                            Try Again
                        </Button>
                    </CardFooter>
                </Card>
            ) : games.length === 0 ? (
                <Card className="text-center p-6">
                    <CardHeader>
                        <Gamepad2 className="mx-auto h-12 w-12 text-muted-foreground"/>
                        <CardTitle className="mt-4">No Games Found</CardTitle>
                        <CardDescription>This studio doesn't have any games yet.</CardDescription>
                    </CardHeader>
                    <CardFooter className="justify-center">
                        <Button asChild>
                            <Link href={`/studios/${studioId}/games/new`}>
                                <Plus className="mr-2 h-4 w-4"/>
                                Create Your First Game
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ) : (
                <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                    {games.map((game) => (
                        <Card key={game.id} className="overflow-hidden">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-xl">{game.name}</CardTitle>
                                    <Badge className={getStatusColor(game.status)}>{game.status}</Badge>
                                </div>
                                <CardDescription>
                                    Created {formatDistanceToNow(new Date(game.created_at * 1000), {addSuffix: true})}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-2">
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <span>Shop Count: {game.shop_count}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="border-t bg-muted/20 pt-3">
                                <Button variant="ghost" size="sm" className="ml-auto" asChild>
                                    <Link href={`/games/${game.id}`}>
                                        View Details
                                        <ArrowRight className="ml-2 h-4 w-4"/>
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
