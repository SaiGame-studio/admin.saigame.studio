"use client"

import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Loader2, Coins } from "lucide-react"
import { createTeam } from "@/lib/team-api"
import type { Team } from "@/types/team"
import { useTranslation } from "@/lib/i18n/use-translation"

const TEAM_COST = 10

interface CreateTeamDialogProps {
  studioId: string
  existingTeamCount?: number
  onTeamCreated: (team: Team) => void
}

export default function CreateTeamDialog({ studioId, existingTeamCount = 0, onTeamCreated }: CreateTeamDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError(t('team.nameRequired'))
      return
    }

    try {
      setLoading(true)
      setError(null)
      const newTeam = await createTeam(studioId, {
        name: name.trim(),
        description: description.trim() || undefined,
      })
      // Refresh coin balance so the float text shows the deduction
      window.dispatchEvent(new Event("wallet:refresh"))
      onTeamCreated(newTeam)
      setOpen(false)
      setName("")
      setDescription("")
    } catch (err) {
      console.error("Failed to create team:", err)
      setError(err instanceof Error ? err.message : t('team.failedCreate'))
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      setOpen(newOpen)
      if (!newOpen) {
        setName("")
        setDescription("")
        setError(null)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t('team.create')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('team.createTitle')}</DialogTitle>
            <DialogDescription>
              {t('team.createDesc')}
            </DialogDescription>
            <p className="text-xs text-muted-foreground pt-1">
              {t('team.createCostHintPt1')}<span className="text-green-500 font-medium">{t('team.createCostHintFree')}</span>{t('team.createCostHintPt2')}<span className="text-yellow-500 font-medium">🪙 {TEAM_COST} coins</span>
            </p>
            {existingTeamCount >= 1 && (
              <div className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-md px-3 py-2 mt-1">
                <Coins className="h-3.5 w-3.5 shrink-0" />
                <span>🪙 {TEAM_COST} coins {t('team.createCostCharge')}</span>
              </div>
            )}
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                {t('team.nameLabel')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder={t('team.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('team.descriptionLabel')}</Label>
              <Textarea
                id="description"
                placeholder={t('team.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={4}
              />
            </div>
            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? t('team.creating') : t('team.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
