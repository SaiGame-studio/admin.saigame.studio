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
import { fetchStudioTeams } from "@/lib/studio-api"
import { assignTeamToGame } from "@/lib/game-api"
import type { Team } from "@/types/team"
import { Plus, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/use-translation"

interface AddTeamToGameDialogProps {
  gameId: string
  studioId: string
  existingTeamIds: string[]
  onTeamsAdded?: () => void
}

export function AddTeamToGameDialog({ 
  gameId, 
  studioId, 
  existingTeamIds,
  onTeamsAdded 
}: AddTeamToGameDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [availableTeams, setAvailableTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [teamsLoading, setTeamsLoading] = useState(false)
  const { toast } = useToast()
  const { t } = useTranslation()

  useEffect(() => {
    if (open) {
      loadTeams()
    }
  }, [open])

  async function loadTeams() {
    try {
      setTeamsLoading(true)
      const data = await fetchStudioTeams(studioId)
      // Filter out teams that are already assigned to this game
      const unassignedTeams = data.filter(team => !existingTeamIds.includes(team.id))
      setAvailableTeams(unassignedTeams)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('team.loadTeamsError')
      console.error("Failed to load teams:", err)
      
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setTeamsLoading(false)
    }
  }

  function toggleTeam(teamId: string) {
    setSelectedTeamIds(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (selectedTeamIds.length === 0) {
      toast({
        title: t('team.validationError'),
        description: t('team.selectAtLeastOne'),
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      
      // Call assign API for each selected team
      await Promise.all(
        selectedTeamIds.map(teamId => assignTeamToGame(teamId, gameId))
      )
      
      toast({
        title: t('common.success'),
        description: `${selectedTeamIds.length} ${t('team.assignedSuccess')}`,
      })
      
      setOpen(false)
      setSelectedTeamIds([])
      
      if (onTeamsAdded) {
        onTeamsAdded()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('team.assignTeamsError')
      console.error("Failed to assign teams:", err)
      
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t('team.addTeams')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('team.addTeamsTitle')}</DialogTitle>
            <DialogDescription>
              {t('team.addTeamsDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[400px] overflow-y-auto">
            {teamsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableTeams.length > 0 ? (
              <div className="space-y-3">
                {availableTeams.map((team) => (
                  <div key={team.id} className="flex items-start space-x-3 p-3 border rounded-md hover:bg-accent">
                    <Checkbox
                      id={`team-${team.id}`}
                      checked={selectedTeamIds.includes(team.id)}
                      onCheckedChange={() => toggleTeam(team.id)}
                      disabled={loading}
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor={`team-${team.id}`}
                        className="font-medium cursor-pointer"
                      >
                        {team.name}
                      </Label>
                      {team.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {team.description}
                        </p>
                      )}
                      <div className="flex gap-2 mt-1">
                        {team.slug && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {team.slug}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          &bull; {team.is_active ? t('common.active') : t('common.inactive')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t('team.noTeamsAvailable')}</p>
                <p className="text-sm mt-2">{t('team.allTeamsAssigned')}</p>
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
              {t('common.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={loading || selectedTeamIds.length === 0}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('team.add')}{selectedTeamIds.length > 0 && ` (${selectedTeamIds.length})`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}