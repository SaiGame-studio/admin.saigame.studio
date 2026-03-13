"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { getGame } from "@/lib/game-api"
import type { Game } from "@/types/game"

interface Props {
  gameId: string
  /** Pass the already-loaded Game to avoid an extra fetch. */
  game?: Game | null
  /** Single-line compact display (no description). */
  compact?: boolean
}

/**
 * Read-only banner for the "Allow tracing player event" game setting.
 * Self-fetches game data when no `game` prop is provided, so it stays
 * in sync regardless of which page renders it.
 */
export function AllowTracingPlayerEventSetting({ gameId, game: gameProp, compact }: Props) {
  const [game, setGame] = useState<Game | null>(gameProp ?? null)
  const [loading, setLoading] = useState(!gameProp)

  useEffect(() => {
    if (gameProp !== undefined) {
      setGame(gameProp)
      setLoading(false)
      return
    }
    setLoading(true)
    getGame(gameId)
      .then(setGame)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [gameId, gameProp])

  if (compact) {
    if (loading) {
      return (
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-4 w-8 rounded-full" />
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Allow tracing player event</span>
        <Switch
          id={`allow-tracing-${gameId}`}
          checked={game?.settings?.allow_tracing_player_event ?? false}
          disabled
          className="scale-75 origin-left"
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2 py-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
        <Skeleton className="h-3 w-72" />
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={`allow-tracing-${gameId}`} className="text-sm font-medium">
          Allow tracing player event
        </Label>
        <Switch
          id={`allow-tracing-${gameId}`}
          checked={game?.settings?.allow_tracing_player_event ?? false}
          disabled
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Automatically enabled when a{" "}
        <Link href={`/games/${gameId}/plugins`} className="font-medium text-blue-400 hover:underline">Rare</Link>{" "}
        plugin or above is activated. Cannot be changed manually.
      </p>
    </div>
  )
}
