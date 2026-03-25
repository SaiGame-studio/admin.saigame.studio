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
  ChevronDown,
} from "lucide-react"
import { useState } from "react"
import { FeatureRequestList } from "@/components/roadmap/feature-request-list"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { useTranslation } from "@/lib/i18n/useTranslation"

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

const groupBadgeClass = "bg-muted text-muted-foreground border border-border"

export default function RoadmapPage() {
  const [collapsedPhases, setCollapsedPhases] = useState<number[]>([1])
  const { locale } = useLanguage()
  const { t } = useTranslation(locale)

  const togglePhase = (phaseNumber: number) => {
    setCollapsedPhases(prev => 
      prev.includes(phaseNumber) 
        ? prev.filter(n => n !== phaseNumber) 
        : [...prev, phaseNumber]
    )
  }

  const phases: Phase[] = [
    {
      number: 1,
      title: t('roadmap.page.phases.1.title'),
      theme: t('roadmap.page.phases.1.theme'),
      status: "complete",
      statusLabel: t('roadmap.page.statusComplete'),
      completed: [
        { name: t('roadmap.page.phases.1.items.studioGame'), description: t('roadmap.page.phases.1.items.studioGameDesc'), completed: "Feb 2026" },
        { name: t('roadmap.page.phases.1.items.playerProfile'), description: t('roadmap.page.phases.1.items.playerProfileDesc'), completed: "Feb 2026" },
        { name: t('roadmap.page.phases.1.items.userProfiles'), description: t('roadmap.page.phases.1.items.userProfilesDesc'), completed: "Feb 2026" },
        { name: t('roadmap.page.phases.1.items.teamAccess'), description: t('roadmap.page.phases.1.items.teamAccessDesc'), completed: "Feb 2026" },
        { name: t('roadmap.page.phases.1.items.quotas'), description: t('roadmap.page.phases.1.items.quotasDesc'), completed: "Feb 2026" },
        { name: t('roadmap.page.phases.1.items.coinSystem'), description: t('roadmap.page.phases.1.items.coinSystemDesc'), completed: "Feb 22, 2026" },
        { name: t('roadmap.page.phases.1.items.pluginSubs'), description: t('roadmap.page.phases.1.items.pluginSubsDesc'), completed: "Feb 23, 2026" },
      ],
    },
    {
      number: 2,
      title: t('roadmap.page.phases.2.title'),
      theme: t('roadmap.page.phases.2.theme'),
      status: "in-progress",
      statusLabel: t('roadmap.page.statusInProgress'),
      completed: [
        { name: t('roadmap.page.phases.2.items.itemInventory'), description: t('roadmap.page.phases.2.items.itemInventoryDesc'), completed: "Feb 24, 2026" },
        { name: t('roadmap.page.phases.2.items.gacha'), description: t('roadmap.page.phases.2.items.gachaDesc'), completed: "Feb 25, 2026" },
        { name: t('roadmap.page.phases.2.items.mailbox'), description: t('roadmap.page.phases.2.items.mailboxDesc'), completed: "Feb 26–27, 2026" },
        { name: t('roadmap.page.phases.2.items.passiveResource'), description: t('roadmap.page.phases.2.items.passiveResourceDesc'), completed: "Feb 27, 2026" },
        { name: t('roadmap.page.phases.2.items.shop'), description: t('roadmap.page.phases.2.items.shopDesc'), completed: "Mar 2, 2026" },
        { name: t('roadmap.page.phases.2.items.quest'), description: t('roadmap.page.phases.2.items.questDesc'), completed: "Mar 3, 2026" },
        { name: t('roadmap.page.phases.2.items.questChain'), description: t('roadmap.page.phases.2.items.questChainDesc'), completed: "Mar 4, 2026" },
        { name: t('roadmap.page.phases.2.items.dailyQuest'), description: t('roadmap.page.phases.2.items.dailyQuestDesc'), completed: "Mar 5, 2026" },
        { name: t('roadmap.page.phases.2.items.containers'), description: t('roadmap.page.phases.2.items.containersDesc'), completed: "Mar 6, 2026" },
        { name: t('roadmap.page.phases.2.items.equipment'), description: t('roadmap.page.phases.2.items.equipmentDesc'), completed: "Mar 10, 2026" },
        { name: t('roadmap.page.phases.2.items.tags'), description: t('roadmap.page.phases.2.items.tagsDesc'), completed: "Mar 10, 2026" },
        { name: t('roadmap.page.phases.2.items.analytics'), description: t('roadmap.page.phases.2.items.analyticsDesc'), completed: "Mar 13, 2026" },
        { name: t('roadmap.page.phases.2.items.leaderboard'), description: t('roadmap.page.phases.2.items.leaderboardDesc'), completed: "Mar 16, 2026" },
        { name: t('roadmap.page.phases.2.items.achievement'), description: t('roadmap.page.phases.2.items.achievementDesc'), completed: "Mar 17, 2026" },
        { name: t('roadmap.page.phases.2.items.definitions'), description: t('roadmap.page.phases.2.items.definitionsDesc'), completed: "Mar 19, 2026" },
        { name: t('roadmap.page.phases.2.items.crafting'), description: t('roadmap.page.phases.2.items.craftingDesc'), completed: "Mar 21, 2026" },
      ],
      planned: [
        { name: t('roadmap.page.phases.2.items.battlePass'), group: "Progression" },
        { name: t('roadmap.page.phases.2.items.worldQuest'), group: "Progression" },
        { name: t('roadmap.page.phases.2.items.worldZone'), group: "World" },
        { name: t('roadmap.page.phases.2.items.iap'), group: "Monetization" },
        { name: t('roadmap.page.phases.2.items.cloneGame'), group: "Platform" },
        { name: t('roadmap.page.phases.2.items.gameDev'), group: "Platform" },
      ],
    },
    {
      number: 3,
      title: t('roadmap.page.phases.3.title'),
      theme: t('roadmap.page.phases.3.theme'),
      status: "planning",
      statusLabel: t('roadmap.page.statusPlanning'),
      footnote: t('roadmap.page.phases.3.footnote'),
      capabilities: [
        { name: t('roadmap.page.phases.3.items.netcode'), description: t('roadmap.page.phases.3.items.netcodeDesc') },
        { name: t('roadmap.page.phases.3.items.openWorld'), description: t('roadmap.page.phases.3.items.openWorldDesc') },
        { name: t('roadmap.page.phases.3.items.dungeons'), description: t('roadmap.page.phases.3.items.dungeonsDesc') },
        { name: t('roadmap.page.phases.3.items.campaigns'), description: t('roadmap.page.phases.3.items.campaignsDesc') },
        { name: t('roadmap.page.phases.3.items.trading'), description: t('roadmap.page.phases.3.items.tradingDesc') },
      ],
    },
    {
      number: 4,
      title: t('roadmap.page.phases.4.title'),
      theme: t('roadmap.page.phases.4.theme'),
      status: "planning",
      statusLabel: t('roadmap.page.statusPlanning'),
      footnote: t('roadmap.page.phases.4.footnote'),
      capabilities: [
        { name: t('roadmap.page.phases.4.items.mmo'), description: t('roadmap.page.phases.4.items.mmoDesc') },
        { name: t('roadmap.page.phases.4.items.battleRoyale'), description: t('roadmap.page.phases.4.items.battleRoyaleDesc') },
        { name: t('roadmap.page.phases.4.items.heroShooter'), description: t('roadmap.page.phases.4.items.heroShooterDesc') },
      ],
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Map className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{t('roadmap.page.title')}</h1>
        </div>
        <p className="text-muted-foreground ml-[52px]">
          {t('roadmap.page.subtitle')}
        </p>
        <p className="text-xs text-muted-foreground mt-1 ml-[52px]">{t('roadmap.page.lastUpdated')}</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        {phases.map((phase) => {
          const cfg = statusConfig[phase.status]
          return (
            <div
              key={phase.number}
              className={`rounded-lg border p-3 bg-card ${cfg.borderClass} cursor-pointer hover:bg-muted/30 transition-colors`}
              onClick={() => togglePhase(phase.number)}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {cfg.icon}
                <span className="text-xs font-semibold text-muted-foreground">{t(`roadmap.page.phase${phase.number}`)}</span>
              </div>
              <p className="text-xs font-medium leading-tight text-foreground">{phase.title}</p>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium mt-2 ${cfg.badgeClass}`}>
                {phase.statusLabel}
              </span>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Left Column: Platform Roadmap */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">{t('roadmap.page.devPlanTitle')}</h2>
            <p className="text-sm text-muted-foreground mb-6">{t('roadmap.page.devPlanSubtitle')}</p>
          </div>
          
          <div className="space-y-6">
            {phases.map((phase) => {
              const cfg = statusConfig[phase.status]
              const isCollapsed = collapsedPhases.includes(phase.number)
              
              return (
                <Card key={phase.number} className={`border-2 transition-all duration-300 ${cfg.borderClass} ${isCollapsed ? 'opacity-80' : 'opacity-100'}`}>
                  <CardHeader 
                    className={`rounded-t-lg transition-colors cursor-pointer group ${cfg.headerClass}`}
                    onClick={() => togglePhase(phase.number)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-background/60 text-primary mt-0.5 flex-shrink-0">
                        {phaseIcons[phase.number - 1]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {t(`roadmap.page.phase${phase.number}`)}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.badgeClass}`}>
                            {phase.statusLabel}
                          </span>
                        </div>
                        <CardTitle className="text-lg mt-0.5 flex items-center justify-between">
                          {phase.title}
                          <ChevronDown className={`h-5 w-5 text-muted-foreground/50 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''} group-hover:text-primary`} />
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{phase.theme}</p>
                        {phase.footnote && !isCollapsed && (
                          <p className="text-xs text-muted-foreground mt-1.5 italic animate-in fade-in duration-500">{phase.footnote}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {!isCollapsed && (
                    <CardContent className="pt-5 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                      {/* Completed items */}
                      {phase.completed && phase.completed.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                            {t('roadmap.page.completedSection')}
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
                            {t('roadmap.page.plannedSection')}
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
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
                            {t('roadmap.page.capabilitiesSection')}
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
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
                  )}
                </Card>
              )
            })}
          </div>
        </div>

        {/* Right Column: Feature Requests */}
        <div className="sticky top-8">
          <FeatureRequestList />
        </div>
      </div>

      {/* Discord CTA */}
      <div className="mt-12 rounded-xl border border-border bg-muted/30 p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 flex-shrink-0">
          <MessageCircle className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">{t('roadmap.page.discordTitle')}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('roadmap.page.discordDesc')}
          </p>
        </div>
        <a
          href="https://discord.com/invite/tr7MxpMAH4"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0"
        >
          <MessageCircle className="h-4 w-4" />
          {t('roadmap.page.joinDiscord')}
        </a>
      </div>
    </div>
  )
}