"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { deleteTeam } from "@/lib/team-api"
import type { Team } from "@/types/team"
import { Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DeleteTeamDialogProps {
  team: Team
}

export function DeleteTeamDialog({ team }: DeleteTeamDialogProps) {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const isConfirmed = confirmText === team.name

  async function handleDelete() {
    if (!isConfirmed) return

    try {
      setLoading(true)
      await deleteTeam(team.id)

      toast({
        title: "Success",
        description: "Team deleted successfully.",
      })

      setOpen(false)

      // Redirect back to the studio page
      if (team.studio_id) {
        router.push(`/studios/${team.studio_id}`)
      } else {
        router.push("/studios")
      }
    } catch (err) {
      console.error("Failed to delete team:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete team. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Team
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Team - Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p className="font-semibold text-destructive">
              This action cannot be undone! This will permanently delete:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>The team <strong>{team.name}</strong></li>
              <li>All team member associations</li>
              <li>All game assignments for this team</li>
            </ul>
            <div className="pt-4 space-y-2">
              <Label htmlFor="confirm-name" className="text-foreground">
                Please type <strong className="font-mono bg-muted px-1 py-0.5 rounded">{team.name}</strong> to confirm:
              </Label>
              <Input
                id="confirm-name"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type team name here"
                disabled={loading}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={() => setConfirmText("")}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmed || loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Team"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
