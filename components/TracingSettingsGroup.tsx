"use client"

import Link from "next/link"
import { AllowTracingPlayerEventSetting } from "@/components/AllowTracingPlayerEventSetting"
import { LeaderboardTracingSetting } from "@/components/LeaderboardTracingSetting"
import type { Game } from "@/types/game"

interface Props {
  gameId: string
  game?: Game | null
}

/**
 * Renders both tracing settings (Allow tracing player event + Leaderboard tracing)
 * with a single shared description at the top.
 */
export function TracingSettingsGroup({ gameId, game }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Automatically enabled when a{" "}
        <Link href={`/games/${gameId}/plugins`} className="font-medium text-blue-400 hover:underline">
          Rare
        </Link>{" "}
        plugin or above is activated, or granted by an Admin. Cannot be changed manually.
      </p>
      <AllowTracingPlayerEventSetting gameId={gameId} game={game} hideDescription />
      <LeaderboardTracingSetting gameId={gameId} game={game} hideDescription />
    </div>
  )
}
