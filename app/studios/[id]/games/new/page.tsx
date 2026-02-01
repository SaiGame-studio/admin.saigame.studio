"use client"

import React, {useState} from "react"
import {useRouter} from "next/navigation"
import {createGame} from "@/lib/studio-api"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {ArrowLeft, Loader2} from "lucide-react"
import {useToast} from "@/components/ui/use-toast"

export default function NewGamePage({params}: { params: { id: string } }) {
    const router = useRouter()
    const {toast} = useToast()
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [gameType, setGameType] = useState("idle")
    const [maxPlayers, setMaxPlayers] = useState("1000")
    const [serverRegion, setServerRegion] = useState("us-west")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const studioId = React.use(params).id

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!name.trim()) {
            setError("Game name is required")
            return
        }

        try {
            setLoading(true)
            setError(null)

            await createGame(studioId, {
                name,
                description,
                game_type: gameType,
                config: {
                    max_players: parseInt(maxPlayers) || 1000,
                    server_region: serverRegion
                }
            })

            toast({
                title: "Game created",
                description: `${name} has been created successfully.`,
            })

            router.push(`/studios/${studioId}/games`)
        } catch (err) {
            console.error(err)
            setError("Failed to create game. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto py-6">
            <div className="mb-6">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Back
                </Button>
            </div>

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Create New Game</h1>
                    <p className="text-muted-foreground">Add a new game to your studio</p>
                </div>
            </div>

            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Game Details</CardTitle>
                    <CardDescription>Enter the information for your new game</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error &&
                            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{error}</div>}

                        <div className="space-y-2">
                            <Label htmlFor="name">Game Name *</Label>
                            <Input
                                id="name"
                                placeholder="Enter game name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                placeholder="Enter game description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="gameType">Game Type</Label>
                            <Input
                                id="gameType"
                                placeholder="e.g., idle, rpg, strategy"
                                value={gameType}
                                onChange={(e) => setGameType(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="maxPlayers">Max Players</Label>
                                <Input
                                    id="maxPlayers"
                                    type="number"
                                    placeholder="1000"
                                    value={maxPlayers}
                                    onChange={(e) => setMaxPlayers(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="serverRegion">Server Region</Label>
                                <Input
                                    id="serverRegion"
                                    placeholder="e.g., us-west, eu-central"
                                    value={serverRegion}
                                    onChange={(e) => setServerRegion(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="outline" type="button" onClick={() => router.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Create Game
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
