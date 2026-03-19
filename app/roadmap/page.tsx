"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CheckCircle2,
  Circle,
  Clock,
  Map,
  Zap,
  Globe,
  Wifi,
  ShoppingBag,
  Gamepad2,
  MessageCircle,
} from "lucide-react"

type PhaseStatus = "complete" | "in-progress" | "planned" | "planning"

interface FeatureItem {
  name: string
  description?: string
  completed?: string
  group?: string
}

interface Phase {
  number: number
  title: string
  theme: string
  status: PhaseStatus
  statusLabel: string
  completed?: FeatureItem[]
  planned?: FeatureItem[]
  capabilities?: FeatureItem[]
  footnote?: string
}

const phases: Phase[] = [
  {
    number: 1,
    title: "The Idle Game",
    theme: "Core platform infrastructure — authentication, multi-tenancy, player profiles",
    status: "complete",
    statusLabel: "Complete",
    completed: [
      { name: "Studio & Game Management", description: "Create and manage multiple studios and games from a single account", completed: "Feb 2026" },
      { name: "Player Profile & Progress", description: "Per-game player profiles with level, progress, and custom game data", completed: "Feb 2026" },
      { name: "User Profiles", description: "Display name, avatar, bio, and social links for each player", completed: "Feb 2026" },
      { name: "Team & Access Control", description: "Role-based team membership with controlled access per game", completed: "Feb 2026" },
      { name: "Studio & Game Quotas", description: "Per-studio and per-game usage limits based on subscription tier", completed: "Feb 2026" },
      { name: "Coin System", description: "In-game wallet for earning, spending, and tracking virtual currency", completed: "Feb 22, 2026" },
      { name: "Plugin Subscriptions", description: "Per-game plugin subscriptions that unlock higher player and content limits", completed: "Feb 23, 2026" },
    ],
  },
  {
    number: 2,
    title: "The Card Game",
    theme: "Full game economy — inventory, gacha, shop, quests, battles, leaderboard",
    status: "in-progress",
    statusLabel: "In Progress",
    completed: [
      { name: "Item & Inventory System", description: "Players can own, manage, and track in-game items across sessions", completed: "Feb 24, 2026" },
      { name: "Gacha / Loot Box", description: "Random loot packs with configurable weighted drop rates", completed: "Feb 25, 2026" },
      { name: "Player Mailbox", description: "Send gifts, items, and messages directly to players' in-game inboxes", completed: "Feb 26–27, 2026" },
      { name: "Passive Resource Generation", description: "Items and resources accumulate over time while the player is offline", completed: "Feb 27, 2026" },
      { name: "Shop System", description: "In-game shop with purchase limits, restock schedules, and per-item currency support", completed: "Mar 2, 2026" },
      { name: "Quest System", description: "Full quest lifecycle — definitions, conditions, rewards, chains, and quest-type filtering", completed: "Mar 3, 2026" },
      { name: "Quest Chain System", description: "Sequential and branching quest chains with unlock conditions and graph visualisation", completed: "Mar 4, 2026" },
      { name: "Daily Quest System", description: "Daily quest pools with weighted-random, fixed-rotation, weekly, and monthly assignment strategies", completed: "Mar 5, 2026" },
      { name: "Player Containers", description: "Grid-based inventory containers with item placement, grid visualisation, and per-player container management", completed: "Mar 6, 2026" },
    ],
    planned: [
      { name: "Battle Pass", group: "Progression" },
      { name: "World Quest", group: "Progression" },
      { name: "World Zone", group: "World" },
      { name: "Player Container", group: "Game Support" },
      { name: "IAP (Apple + Google Play)", group: "Monetization" },
      { name: "Clone Game Data", group: "Platform" },
      { name: "Crafting System", description: "Recipe-based item crafting — enables Merge-3 and RPG game types", group: "Game Support" },
    ],
  },
  {
    number: 3,
    title: "The Action RPG",
    theme: "Scale globally, co-op multiplayer",
    status: "planning",
    statusLabel: "Planning",
    footnote: "Primary goal: Support 100,000+ concurrent users globally with sub-100ms response times.",
    capabilities: [
      { name: "Unity Netcode Integration", description: "Seamless integration with Unity Netcode for Games to enable real-time co-op gameplay and open-world experiences (Genshin-like)" },
      { name: "Co-op Open World", description: "Large-scale open worlds supporting 4-8 player co-op gameplay with persistent world state" },
      { name: "Co-op Dungeons", description: "Instanced dungeon experiences with real-time team coordination" },
      { name: "Co-op Campaigns", description: "Story-driven cooperative campaigns with multiple players" },
    ],
  },
  {
    number: 4,
    title: "Realtime Multiplayer",
    theme: "Live bidirectional gameplay — matchmaking, real-time PvP",
    status: "planning",
    statusLabel: "Planning",
    footnote: "Primary goal: Enable real-time PvP and support MMO, Battle Royale, and Hero Shooter game types.",
    capabilities: [
      { name: "MMO", description: "Large-scale persistent multiplayer worlds with hundreds of concurrent players" },
      { name: "Battle Royale", description: "Last-player-standing competitive mode with real-time player elimination" },
      { name: "Hero Shooter", description: "Team-based tactical shooter with diverse character abilities and roles" },
    ],
  },
]

// All colors use CSS variable tokens — works with all custom themes (dark-green, light-warm, etc.)
const statusConfig: Record<
  PhaseStatus,
  { badgeClass: string; borderClass: string; headerClass: string; icon: React.ReactNode }
> = {
  complete: {
    badgeClass: "bg-primary/15 text-primary border border-primary/30",
    borderClass: "border-primary/40",
    headerClass: "bg-primary/5",
    icon: <CheckCircle2 className="h-4 w-4 text-primary" />,
  },
  "in-progress": {
    badgeClass: "bg-primary/10 text-primary/80 border border-primary/20",
    borderClass: "border-primary/25",
    headerClass: "bg-muted/60",
    icon: <Clock className="h-4 w-4 text-primary/70" />,
  },
  planned: {
    badgeClass: "bg-muted text-muted-foreground border border-border",
    borderClass: "border-border",
    headerClass: "bg-muted/40",
    icon: <Circle className="h-4 w-4 text-muted-foreground/50" />,
  },
  planning: {
    badgeClass: "bg-muted/60 text-muted-foreground border border-border/60",
    borderClass: "border-border/50",
    headerClass: "bg-muted/20",
    icon: <Circle className="h-4 w-4 text-muted-foreground/30" />,
  },
}

const phaseIcons: React.ReactNode[] = [
  <Gamepad2 key={1} className="h-5 w-5" />,
  <ShoppingBag key={2} className="h-5 w-5" />,
  <Globe key={3} className="h-5 w-5" />,
  <Wifi key={4} className="h-5 w-5" />,
]

// Single universal group badge style — adapts to any theme
const groupBadgeClass = "bg-muted text-muted-foreground border border-border"

export default function RoadmapPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Map className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Roadmap</h1>
        </div>
        <p className="text-muted-foreground ml-[52px]">
          The development roadmap — from foundation to realtime multiplayer.
        </p>
        <p className="text-xs text-muted-foreground mt-1 ml-[52px]">Last updated: Mar 6, 2026</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {phases.map((phase) => {
          const cfg = statusConfig[phase.status]
          return (
            <div
              key={phase.number}
              className={`rounded-lg border p-3 bg-card ${cfg.borderClass}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {cfg.icon}
                <span className="text-xs font-semibold text-muted-foreground">Phase {phase.number}</span>
              </div>
              <p className="text-xs font-medium leading-tight text-foreground">{phase.title}</p>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium mt-2 ${cfg.badgeClass}`}>
                {phase.statusLabel}
              </span>
            </div>
          )
        })}
      </div>

      {/* Phase cards */}
      <div className="space-y-8">
        {phases.map((phase) => {
          const cfg = statusConfig[phase.status]
          return (
            <Card key={phase.number} className={`border-2 ${cfg.borderClass}`}>
              <CardHeader className={`rounded-t-lg ${cfg.headerClass}`}>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-background/60 text-primary mt-0.5 flex-shrink-0">
                    {phaseIcons[phase.number - 1]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Phase {phase.number}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.badgeClass}`}>
                        {phase.statusLabel}
                      </span>
                    </div>
                    <CardTitle className="text-lg mt-0.5">{phase.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{phase.theme}</p>
                    {phase.footnote && (
                      <p className="text-xs text-muted-foreground mt-1.5 italic">{phase.footnote}</p>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-5 space-y-5">

                {/* Completed items */}
                {phase.completed && phase.completed.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      Completed
                    </h4>
                    <div className="space-y-2">
                      {phase.completed.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-start gap-3 p-2.5 rounded-md bg-muted/50 border-l-2 border-primary/50"
                        >
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground">{item.name}</span>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                            )}
                          </div>
                          {item.completed && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">{item.completed}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Planned items */}
                {phase.planned && phase.planned.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Circle className="h-3.5 w-3.5 text-muted-foreground/60" />
                      Planned
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {phase.planned.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center gap-2 p-2.5 rounded-md bg-muted/30 border border-border"
                        >
                          <Circle className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
                          <span className="text-sm flex-1 text-foreground">{item.name}</span>
                          {item.group && (
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium flex-shrink-0 ${groupBadgeClass}`}>
                              {item.group}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Capabilities */}
                {phase.capabilities && phase.capabilities.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-muted-foreground/60" />
                      Capabilities
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {phase.capabilities.map((item) => (
                        <div
                          key={item.name}
                          className="p-2.5 rounded-md bg-muted/30 border border-border"
                        >
                          <p className="text-sm font-medium text-foreground">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Discord CTA */}
      <div className="mt-12 rounded-xl border border-border bg-muted/30 p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 flex-shrink-0">
          <MessageCircle className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">Shape the Roadmap</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Have a feature request or idea? Join our Discord and share your feedback — every suggestion influences what we build next.
          </p>
        </div>
        <a
          href="https://discord.com/invite/tr7MxpMAH4"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0"
        >
          <MessageCircle className="h-4 w-4" />
          Join Discord
        </a>
      </div>
    </div>
  )
}