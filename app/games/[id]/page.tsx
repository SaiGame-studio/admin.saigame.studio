"use client"

import React, {useEffect, useState} from "react"
import {useRouter} from "next/navigation"
import {useAuth} from "@/contexts/auth-context"
import {getGame} from "@/lib/game-api"
import type {Game} from "@/types/game"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {ArrowLeft, Edit, Trash2, Gamepad2} from "lucide-react"
import Link from "next/link"
import { formatTimestamp } from "@/lib/utils/date-utils"

export default function GameDetailsPage({params}: { params: { id: string } }) {
    const router = useRouter()
    const [game, setGame] = useState<Game | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    // @ts-ignore
    const gameId = React.use(params).id

    useEffect(() => {
        async function loadGame() {
            try {
                setLoading(true)
                const gameData = await getGame(gameId)
                setGame(gameData)
                setError(null)
            } catch (err) {
                setError("Failed to load game details. Please try again.")
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        loadGame().then();
    }, [gameId])

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
                    <div className="h-8 w-1/3 bg-muted/50 rounded mb-4"/>
                    <div className="h-4 w-1/4 bg-muted/50 rounded mb-8"/>
                    <Card>
                        <CardHeader className="h-24 bg-muted/50 rounded-t-lg"/>
                        <CardContent className="p-6">
                            <div className="h-4 w-3/4 bg-muted/50 rounded mb-4"/>
                            <div className="h-4 w-1/2 bg-muted/50 rounded mb-4"/>
                            <div className="h-4 w-2/3 bg-muted/50 rounded"/>
                        </CardContent>
                        <CardFooter className="bg-muted/20 h-12 rounded-b-lg"/>
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
            <div className="mb-6">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Back
                </Button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{game.name}</h1>
                    <p className="text-muted-foreground">Game details and management</p>
                </div>
                <div className="flex mt-4 md:mt-0 space-x-2">
                    <Button variant="outline" asChild>
                        <Link href={`/games/${game.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4"/>
                            Edit Game
                        </Link>
                    </Button>
                    <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4"/>
                        Delete Game
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Gamepad2 className="mr-2 h-5 w-5"/>
                            Game Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">Game Name</h3>
                                <p className="text-lg">{game.name}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                                <Badge className={`mt-1 ${getStatusColor(game.status)}`}>{game.status}</Badge>
                            </div>
                            {game.tier && (
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground">Tier</h3>
                                    <p className="text-lg">{game.tier}</p>
                                </div>
                            )}
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">Shop Count</h3>
                                <p className="text-lg">{game.shop_count}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground">Created At</h3>
                                    <p className="text-lg">{formatTimestamp(game.created_at)}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground">Last Updated</h3>
                                    <p className="text-lg">{formatTimestamp(game.updated_at)}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Game ID</CardTitle>
                        <CardDescription>Unique identifier for this game</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm break-all">
                            {game.id}
                        </code>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
