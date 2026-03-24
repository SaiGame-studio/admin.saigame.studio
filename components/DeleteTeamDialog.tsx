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
import { useTranslation } from "@/lib/i18n/use-translation"

interface DeleteTeamDialogProps {
  team: Team
}

export function DeleteTeamDialog({ team }: DeleteTeamDialogProps) {
  const { t } = useTranslation()
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
        title: t('common.success'),
        description: t('team.deleteSuccess'),
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
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('team.deleteTeam') + ' failed',
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
          {t('team.deleteTeam')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('team.deleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p className="font-semibold text-destructive">
              {t('team.deleteWarning')}
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>{t('team.deleteItemTeam')} <strong>{team.name}</strong></li>
              <li>{t('team.deleteItemMembers')}</li>
              <li>{t('team.deleteItemGames')}</li>
            </ul>
            <div className="pt-4 space-y-2">
              <Label htmlFor="confirm-name" className="text-foreground">
                {t('team.deleteConfirmLabel')} <strong className="font-mono bg-muted px-1 py-0.5 rounded">{team.name}</strong> {t('team.deleteConfirmLabelSuffix')}
              </Label>
              <Input
                id="confirm-name"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={t('team.deleteConfirmPlaceholder')}
                disabled={loading}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={() => setConfirmText("")}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmed || loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('team.deleting')}
              </>
            ) : (
              t('team.deleteTeam')
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
