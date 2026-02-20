"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { unassignTeamFromGame } from "@/lib/game-api"
import type { Team } from "@/types/team"
import { X, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/use-translation"

interface RemoveTeamFromGameDialogProps {
  gameId: string
  team: Team
  onTeamRemoved?: () => void
}

export function RemoveTeamFromGameDialog({ gameId, team, onTeamRemoved }: RemoveTeamFromGameDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { t } = useTranslation()

  async function handleRemove() {
    try {
      setLoading(true)
      await unassignTeamFromGame(gameId, team.id)
      
      toast({
        title: t('common.success'),
        description: t('team.unassignedSuccess'),
      })
      
      setOpen(false)
      
      if (onTeamRemoved) {
        onTeamRemoved()
      }
    } catch (err) {
      console.error("Failed to unassign team:", err)
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('team.unassignError'),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
          disabled={loading}
        >
          <X className="h-4 w-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('team.unassignTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('team.unassignPrefix')} <strong>{team.name}</strong> {t('team.unassignSuffix')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleRemove()
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('team.unassign')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
