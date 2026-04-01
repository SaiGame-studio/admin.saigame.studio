"use client"

import { Mail, User, Package, Archive, Zap, Shield, ScrollText, Swords, ArrowLeftRight, LayoutTemplate } from "lucide-react"

export type PlayerNavTab = "info" | "items" | "containers" | "presets" | "generators" | "equipments" | "quests" | "battle" | "transactions"

interface PlayerSectionNavProps {
  gameId: string
  progressId: string
  activeTab: PlayerNavTab | "containers-detail"
  /** If provided, clicking a tab calls this instead of navigating (for in-page switching). */
  onTabChange?: (tab: PlayerNavTab) => void
  /** Badge counts shown next to tab labels. */
  counts?: {
    items?: number
    containers?: number
    containersHasMore?: boolean
    presets?: number
    generators?: number
    quests?: number
    transactions?: number
  }
}

import type { LucideIcon } from "lucide-react"

const TABS: { value: PlayerNavTab; label: string; icon: LucideIcon }[] = [
  { value: "info",         label: "Player Info",  icon: User           },
  { value: "items",        label: "Items",        icon: Package        },
  { value: "containers",   label: "Containers",   icon: Archive        },
  { value: "generators",   label: "Generators",   icon: Zap            },
  { value: "equipments",   label: "Equipments",   icon: Shield         },
  { value: "presets",      label: "Presets",      icon: LayoutTemplate },
  { value: "quests",       label: "Quests",       icon: ScrollText     },
  { value: "battle",       label: "Battle",       icon: Swords         },
  { value: "transactions", label: "Transactions", icon: ArrowLeftRight },
]

export function PlayerSectionNav({
  gameId,
  progressId,
  activeTab,
  onTabChange,
  counts = {},
}: PlayerSectionNavProps) {
  const isActive = (value: PlayerNavTab) =>
    value === activeTab || (value === "containers" && activeTab === "containers-detail")

  const badge = (value: PlayerNavTab) => {
    let n: number | undefined
    let plus = false
    if (value === "items" && counts.items != null) n = counts.items
    if (value === "containers" && counts.containers != null) {
      n = counts.containers
      plus = !!counts.containersHasMore
    }
    if (value === "presets" && counts.presets != null) n = counts.presets
    if (value === "generators" && counts.generators != null) n = counts.generators
    if (value === "quests" && counts.quests != null) n = counts.quests
    if (value === "transactions" && counts.transactions != null && activeTab === "transactions")
      n = counts.transactions
    if (!n) return null
    return (
      <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs leading-none">
        {n}{plus ? "+" : ""}
      </span>
    )
  }

  return (
    <div className="border-b mb-4">
      <div className="flex items-center">
        {TABS.map((tab) => {
          const active = isActive(tab.value)
          const href = `/games/${gameId}/players/${progressId}?tab=${tab.value}`
          return (
            <a
              key={tab.value}
              href={href}
              onClick={
                onTabChange
                  ? (e) => {
                      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return
                      e.preventDefault()
                      onTabChange(tab.value)
                    }
                  : undefined
              }
              className={`inline-flex items-center whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5 mr-1.5" />
              {tab.label}
              {badge(tab.value)}
            </a>
          )
        })}

        {/* Mail — always navigates */}
        <a
          href={`/games/${gameId}/mailbox?userId=${progressId}`}
          className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 -mb-px border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors"
        >
          <Mail className="h-3.5 w-3.5" />
          Mail
        </a>
      </div>
    </div>
  )
}
