"use client"

import Link from "next/link"
import { Store, Users, BookOpen, Dices } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n/useTranslation"

type GameNavSection = "shops" | "users" | "items" | "gacha"

interface GameNavButtonsProps {
  gameId: string
  /** Highlight the currently active section */
  active?: GameNavSection
}

export function GameNavButtons({ gameId, active }: GameNavButtonsProps) {
  const { t } = useTranslation()

  const btn = (section: GameNavSection) =>
    active === section ? "default" : "outline"

  return (
    <div className="flex gap-2 flex-wrap">
      <Button asChild variant={btn("shops")} className="flex items-center gap-2">
        <Link href={`/games/${gameId}/shops`}>
          <Store className="h-4 w-4" />
          {t("game.shops")}
        </Link>
      </Button>
      <Button asChild variant={btn("users")} className="flex items-center gap-2">
        <Link href={`/games/${gameId}/users`}>
          <Users className="h-4 w-4" />
          {t("game.users")}
        </Link>
      </Button>
      <Button asChild variant={btn("items")} className="flex items-center gap-2">
        <Link href={`/games/${gameId}/items`}>
          <BookOpen className="h-4 w-4" />
          Items
        </Link>
      </Button>
      <Button asChild variant={btn("gacha")} className="flex items-center gap-2">
        <Link href={`/games/${gameId}/gacha`}>
          <Dices className="h-4 w-4" />
          Loot Box
        </Link>
      </Button>
    </div>
  )
}
