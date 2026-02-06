"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { fetchStudioGames } from "@/lib/studio-api"
import { assignGamesToTeam } from "@/lib/team-api"
import type { Game } from "@/types/game"
import { Plus, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AddGameToTeamDialogProps {
  teamId: string
  studioId: string
  existingGameIds: string[]
  onGamesAdded?: () => void
}

export function AddGameToTeamDialog({ 
  teamId, 
  studioId, 
  existingGameIds,
  onGamesAdded 
}: AddGameToTeamDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([])
  const [availableGames, setAvailableGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [gamesLoading, setGamesLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadGames()
    }
  }, [open])

  async function loadGames() {
    try {
      setGamesLoading(true)
      const data = await fetchStudioGames(studioId)
      // Filter out games that are already assigned to this team
      const unassignedGames = data.filter(game => !existingGameIds.includes(game.id))
      setAvailableGames(unassignedGames)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load games. Please try again."
      console.error("Failed to load games:", err)
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setGamesLoading(false)
    }
  }

  function toggleGame(gameId: string) {
    setSelectedGameIds(prev => 
      prev.includes(gameId) 
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (selectedGameIds.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one game.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      await assignGamesToTeam(teamId, selectedGameIds)
      
      toast({
        title: "Success",
        description: `${selectedGameIds.length} game(s) added successfully.`,
      })
      
      setOpen(false)
      setSelectedGameIds([])
      
      if (onGamesAdded) {
        onGamesAdded()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add games. Please try again."
      console.error("Failed to add games:", err)
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Games
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Games to Team</DialogTitle>
            <DialogDescription>
              Select one or more games from your studio to assign to this team.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[400px] overflow-y-auto">
            {gamesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableGames.length > 0 ? (
              <div className="space-y-3">
                {availableGames.map((game) => (
                  <div key={game.id} className="flex items-start space-x-3 p-3 border rounded-md hover:bg-accent">
                    <Checkbox
                      id={`game-${game.id}`}
                      checked={selectedGameIds.includes(game.id)}
                      onCheckedChange={() => toggleGame(game.id)}
                      disabled={loading}
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor={`game-${game.id}`}
                        className="font-medium cursor-pointer"
                      >
                        {game.name}
                      </Label>
                      {game.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {game.description}
                        </p>
                      )}
                      <div className="flex gap-2 mt-1">
                        {game.slug && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {game.slug}
                          </span>
                        )}
                        {game.status && (
                          <span className="text-xs text-muted-foreground">
                            • {game.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No available games to add.</p>
                <p className="text-sm mt-2">All games from this studio are already assigned to this team.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || selectedGameIds.length === 0}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add {selectedGameIds.length > 0 && `(${selectedGameIds.length})`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
