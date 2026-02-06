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

interface RemoveTeamFromGameDialogProps {
  gameId: string
  team: Team
  onTeamRemoved?: () => void
}

export function RemoveTeamFromGameDialog({ gameId, team, onTeamRemoved }: RemoveTeamFromGameDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleRemove() {
    try {
      setLoading(true)
      await unassignTeamFromGame(gameId, team.id)
      
      toast({
        title: "Success",
        description: "Team unassigned successfully.",
      })
      
      setOpen(false)
      
      if (onTeamRemoved) {
        onTeamRemoved()
      }
    } catch (err) {
      console.error("Failed to unassign team:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to unassign team. Please try again.",
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
          <AlertDialogTitle>Unassign Team from Game?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to unassign <strong>{team.name}</strong> from this game? 
            This action can be reversed by adding the team back.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleRemove()
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Unassign
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
