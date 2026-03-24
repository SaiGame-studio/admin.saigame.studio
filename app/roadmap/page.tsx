"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Circle, Clock, Rocket } from "lucide-react"
import { useTranslation } from "@/lib/i18n/use-translation"

type RoadmapStatus = "completed" | "inProgress" | "planned" | "comingSoon"

interface RoadmapItem {
  titleKey: string
  descriptionKey: string
  status: RoadmapStatus
}

interface RoadmapPhase {
  phaseKey: string
  periodKey: string
  items: RoadmapItem[]
}

const phases: RoadmapPhase[] = [
  {
    phaseKey: "roadmap.phase1",
    periodKey: "roadmap.phase1Period",
    items: [
      { titleKey: "roadmap.studioManagement", descriptionKey: "roadmap.studioManagementDesc", status: "completed" },
      { titleKey: "roadmap.gameManagement", descriptionKey: "roadmap.gameManagementDesc", status: "completed" },
      { titleKey: "roadmap.userProfiles", descriptionKey: "roadmap.userProfilesDesc", status: "completed" },
      { titleKey: "roadmap.itemProfiles", descriptionKey: "roadmap.itemProfilesDesc", status: "completed" },
    ],
  },
  {
    phaseKey: "roadmap.phase2",
    periodKey: "roadmap.phase2Period",
    items: [
      { titleKey: "roadmap.shopSystem", descriptionKey: "roadmap.shopSystemDesc", status: "completed" },
      { titleKey: "roadmap.lootboxSystem", descriptionKey: "roadmap.lootboxSystemDesc", status: "completed" },
      { titleKey: "roadmap.teamManagement", descriptionKey: "roadmap.teamManagementDesc", status: "inProgress" },
      { titleKey: "roadmap.i18nSupport", descriptionKey: "roadmap.i18nSupportDesc", status: "inProgress" },
    ],
  },
  {
    phaseKey: "roadmap.phase3",
    periodKey: "roadmap.phase3Period",
    items: [
      { titleKey: "roadmap.analyticsdashboard", descriptionKey: "roadmap.analyticsDashboardDesc", status: "planned" },
      { titleKey: "roadmap.advancedPermissions", descriptionKey: "roadmap.advancedPermissionsDesc", status: "planned" },
      { titleKey: "roadmap.webhooks", descriptionKey: "roadmap.webhooksDesc", status: "planned" },
      { titleKey: "roadmap.apiDocs", descriptionKey: "roadmap.apiDocsDesc", status: "comingSoon" },
    ],
  },
]

const statusConfig: Record<RoadmapStatus, { icon: React.ReactNode; variant: "default" | "secondary" | "outline" | "destructive"; labelKey: string }> = {
  completed: { icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, variant: "default", labelKey: "roadmap.completed" },
  inProgress: { icon: <Clock className="h-5 w-5 text-blue-500" />, variant: "secondary", labelKey: "roadmap.inProgress" },
  planned: { icon: <Circle className="h-5 w-5 text-muted-foreground" />, variant: "outline", labelKey: "roadmap.planned" },
  comingSoon: { icon: <Rocket className="h-5 w-5 text-orange-500" />, variant: "outline", labelKey: "roadmap.comingSoon" },
}

export default function RoadmapPage() {
  const { t } = useTranslation()

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("roadmap.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("roadmap.subtitle")}</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-8">
        {(Object.entries(statusConfig) as [RoadmapStatus, typeof statusConfig[RoadmapStatus]][]).map(([status, config]) => (
          <div key={status} className="flex items-center gap-2">
            {config.icon}
            <span className="text-sm text-muted-foreground">{t(config.labelKey)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-8">
        {phases.map((phase) => (
          <div key={phase.phaseKey}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold">{t(phase.phaseKey)}</h2>
              <Badge variant="outline">{t(phase.periodKey)}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {phase.items.map((item) => {
                const config = statusConfig[item.status]
                return (
                  <Card key={item.titleKey} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {config.icon}
                          <CardTitle className="text-base">{t(item.titleKey)}</CardTitle>
                        </div>
                        <Badge variant={config.variant} className="shrink-0 text-xs">
                          {t(config.labelKey)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{t(item.descriptionKey)}</CardDescription>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
