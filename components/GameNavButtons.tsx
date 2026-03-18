"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ShoppingCart, Users, Package, Mail, ScrollText, Hammer, BarChart2, Gamepad2, Trophy, ChevronsLeftRight, AlignJustify, Skull } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTranslation } from "@/lib/i18n/useTranslation"

const LS_KEY = "game-nav-expanded"

type GameNavSection = "shops" | "players" | "users" | "items" | "entities" | "mailbox" | "quests" | "leaderboard" | "plugins" | "analytic" | "detail"

interface GameNavButtonsProps {
  gameId: string
  active?: GameNavSection
  id?: string
}

interface NavItem {
  section: GameNavSection
  href: string
  icon: React.ReactNode
  label: string
}

export function GameNavButtons({ gameId, active, id }: GameNavButtonsProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  // Load from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      setExpanded(localStorage.getItem(LS_KEY) === "1")
    } catch {}
  }, [])

  const toggle = () => {
    setExpanded((prev) => {
      const next = !prev
      try { localStorage.setItem(LS_KEY, next ? "1" : "0") } catch {}
      return next
    })
  }

  const items: NavItem[] = [
    { section: "detail",      href: `/games/${gameId}`,             icon: <Gamepad2 className="h-4 w-4" />,   label: "Game"          },
    { section: "players",     href: `/games/${gameId}/players`,     icon: <Users className="h-4 w-4" />,      label: t("game.users") },
    { section: "shops",       href: `/games/${gameId}/shops`,       icon: <ShoppingCart className="h-4 w-4" />,      label: t("game.shops") },
    { section: "items",       href: `/games/${gameId}/items`,       icon: <Package className="h-4 w-4" />,     label: "Items"         },
    { section: "entities",    href: `/games/${gameId}/entities`,    icon: <Skull className="h-4 w-4" />,       label: "Entities"      },
    { section: "quests",      href: `/games/${gameId}/quests`,      icon: <ScrollText className="h-4 w-4" />, label: "Quests"        },
    { section: "leaderboard", href: `/games/${gameId}/leaderboard`, icon: <Trophy className="h-4 w-4" />,     label: "Leaderboard"   },
    { section: "analytic",    href: `/games/${gameId}/analytic`,    icon: <BarChart2 className="h-4 w-4" />,  label: "Analytic"      },
    { section: "plugins",     href: `/games/${gameId}/plugins`,     icon: <Hammer className="h-4 w-4" />,     label: "Upgrade"       },
    { section: "mailbox",     href: `/games/${gameId}/mailbox`,     icon: <Mail className="h-4 w-4" />,       label: "Mailbox"       },
  ]

  return (
    <TooltipProvider delayDuration={300}>
      <div id={id ?? "game-nav-buttons"} className="flex gap-1.5 flex-wrap items-center">
        {/* Nav items */}
        {items.map(({ section, href, icon, label }) => {
          const isActive = active === section
          if (expanded) {
            return (
              <Button
                key={section}
                asChild
                variant={isActive ? "default" : "outline"}
                size="sm"
                className="flex items-center gap-1.5"
              >
                <Link href={href}>
                  {icon}
                  {label}
                </Link>
              </Button>
            )
          }
          // Compact mode
          if (isActive) {
            return (
              <Button key={section} asChild variant="default" size="sm" className="flex items-center gap-1.5">
                <Link href={href}>
                  {icon}
                  {label}
                </Link>
              </Button>
            )
          }
          return (
            <Tooltip key={section}>
              <TooltipTrigger asChild>
                <Button asChild variant="outline" size="icon" className="h-8 w-8">
                  <Link href={href}>{icon}</Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{label}</TooltipContent>
            </Tooltip>
          )
        })}

        {/* Toggle button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={toggle}
            >
              {expanded
                ? <ChevronsLeftRight className="h-4 w-4" />
                : <AlignJustify className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {expanded ? "Compact nav" : "Expand nav"}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
