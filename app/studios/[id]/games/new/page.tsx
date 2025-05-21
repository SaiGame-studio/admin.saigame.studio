"use client"

import type React from "react"
import {useState} from "react"
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
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const studioId = params.id

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!name.trim()) {
            setError("Game name is required")
            return
        }

        try {
            setLoading(true)
            setError(null)

            await createGame(studioId, {name})

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
                            <Label htmlFor="name">Game Name</Label>
                            <Input
                                id="name"
                                placeholder="Enter game name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
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
