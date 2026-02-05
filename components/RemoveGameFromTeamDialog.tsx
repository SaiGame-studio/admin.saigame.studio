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
import { unassignGameFromTeam } from "@/lib/team-api"
import type { Game } from "@/types/game"
import { X, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface RemoveGameFromTeamDialogProps {
  teamId: string
  game: Game
  onGameRemoved?: () => void
}

export function RemoveGameFromTeamDialog({ teamId, game, onGameRemoved }: RemoveGameFromTeamDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleRemove() {
    try {
      setLoading(true)
      await unassignGameFromTeam(teamId, game.id)
      
      toast({
        title: "Success",
        description: "Game unassigned successfully.",
      })
      
      setOpen(false)
      
      if (onGameRemoved) {
        onGameRemoved()
      }
    } catch (err) {
      console.error("Failed to unassign game:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to unassign game. Please try again.",
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
          <AlertDialogTitle>Unassign Game from Team?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to unassign <strong>{game.name}</strong> from this team? 
            This action can be reversed by adding the game back.
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
