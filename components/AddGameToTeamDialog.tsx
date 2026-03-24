"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { fetchStudioGames } from "@/lib/studio-api"
import { assignGamesToTeam } from "@/lib/team-api"
import type { Game } from "@/types/game"
import { Plus, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/use-translation"

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
  const { t } = useTranslation()
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
      const errorMessage = err instanceof Error ? err.message : t('team.loadGamesForTeamError')
      console.error("Failed to load games:", err)

      toast({
        title: t('common.error'),
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
        title: t('team.validationError'),
        description: t('team.selectAtLeastOneGame'),
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      await assignGamesToTeam(teamId, selectedGameIds)
      
      toast({
        title: t('common.success'),
        description: t('team.addGamesSuccess'),
      })
      
      setOpen(false)
      setSelectedGameIds([])
      
      if (onGamesAdded) {
        onGamesAdded()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('team.addGamesError')
      console.error("Failed to add games:", err)

      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        {t('team.addGames')}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <SheetHeader>
              <SheetTitle>{t('team.addGamesTitle')}</SheetTitle>
              <SheetDescription>
                {t('team.addGamesDesc')}
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 flex-1 overflow-y-auto">
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
                  <p>{t('team.noAvailableGames')}</p>
                  <p className="text-sm mt-2">{t('team.allGamesAssigned')}</p>
                </div>
              )}
            </div>
            <SheetFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={loading || selectedGameIds.length === 0}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('team.add')} {selectedGameIds.length > 0 && `(${selectedGameIds.length})`}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
