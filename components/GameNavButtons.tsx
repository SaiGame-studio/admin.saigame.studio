"use client"

import Link from "next/link"
import { Store, Users, BookOpen, Mail, ScrollText, Hammer, BarChart2, Gamepad2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n/useTranslation"

type GameNavSection = "shops" | "players" | "users" | "items" | "mailbox" | "quests" | "plugins" | "analytic" | "detail"

interface GameNavButtonsProps {
  gameId: string
  /** Highlight the currently active section */
  active?: GameNavSection
  /** HTML id attribute on the wrapper div */
  id?: string
}

export function GameNavButtons({ gameId, active, id }: GameNavButtonsProps) {
  const { t } = useTranslation()

  const btn = (section: GameNavSection) =>
    active === section ? "default" : "outline"

  return (
    <div id={id ?? "game-nav-buttons"} className="flex gap-2 flex-wrap">
      <Button asChild variant={btn("detail")} className="flex items-center gap-2">
        <Link href={`/games/${gameId}`}>
          <Gamepad2 className="h-4 w-4" />
          Game
        </Link>
      </Button>
      <Button asChild variant={btn("players")} className="flex items-center gap-2">
        <Link href={`/games/${gameId}/players`}>
          <Users className="h-4 w-4" />
          {t("game.users")}
        </Link>
      </Button>
      <Button asChild variant={btn("shops")} className="flex items-center gap-2">
        <Link href={`/games/${gameId}/shops`}>
          <Store className="h-4 w-4" />
          {t("game.shops")}
        </Link>
      </Button>
      <Button asChild variant={btn("items")} className="flex items-center gap-2">
        <Link href={`/games/${gameId}/items`}>
          <BookOpen className="h-4 w-4" />
          Items
        </Link>
      </Button>
      <Button asChild variant={btn("quests")} className="flex items-center gap-2">
        <Link href={`/games/${gameId}/quests`}>
          <ScrollText className="h-4 w-4" />
          Quests
        </Link>
      </Button>
      <Button asChild variant={btn("analytic")} className="flex items-center gap-2">
        <Link href={`/games/${gameId}/analytic`}>
          <BarChart2 className="h-4 w-4" />
          Analytic
        </Link>
      </Button>
      <Button asChild variant={btn("plugins")} className="flex items-center gap-2">
        <Link href={`/games/${gameId}/plugins`}>
          <Hammer className="h-4 w-4" />
          Upgrade
        </Link>
      </Button>
      <Button asChild variant={btn("mailbox")} className="flex items-center gap-2">
        <Link href={`/games/${gameId}/mailbox`}>
          <Mail className="h-4 w-4" />
          Mailbox
        </Link>
      </Button>
    </div>
  )
}
