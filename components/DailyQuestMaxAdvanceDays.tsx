"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateGame } from "@/lib/game-api"
import { useToast } from "@/hooks/use-toast"
import type { Game } from "@/types/game"

const ADVANCE_DAY_OPTIONS = [1, 3, 7, 14, 30]

interface Props {
  game: Game
  onUpdate: (updated: Game) => void
  compact?: boolean
}

export function DailyQuestMaxAdvanceDays({ game, onUpdate, compact }: Props) {
  const { toast } = useToast()

  return (
    <Select
      value={String(game.settings?.daily_quest_max_advance_days ?? 30)}
      onValueChange={async (value) => {
        try {
          const updated = await updateGame(game.id, {
            settings: { ...game.settings, daily_quest_max_advance_days: Number(value) }
          })
          onUpdate(updated)
          toast({ title: "Settings updated", description: `Daily quest advance days set to ${value} days` })
        } catch {
          toast({ title: "Error", description: "Failed to update settings", variant: "destructive" })
        }
      }}
    >
      <SelectTrigger className={compact ? "w-20 h-6 text-xs border-0 shadow-none px-1 focus:ring-0" : "w-24 h-8 text-sm"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ADVANCE_DAY_OPTIONS.map((d) => (
          <SelectItem key={d} value={String(d)}>{d} days</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
