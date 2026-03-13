"use client"

import Link from "next/link"
import { Hammer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n/use-translation"
import type { Plugin, GamePluginsResult } from "@/lib/plugin-api"

const GEM_TIERS = [
  { image: "/materias/common.png",    label: "Uncommon",  text: "text-green-400",  glowColor: "#22c55e" },
  { image: "/materias/rare.png",      label: "Rare",      text: "text-blue-400",   glowColor: "#3b82f6" },
  { image: "/materias/epic.png",      label: "Epic",      text: "text-red-400",    glowColor: "#ef4444" },
  { image: "/materias/legendary.png", label: "Legendary", text: "text-yellow-400", glowColor: "#eab308" },
]

interface EquipmentPanelProps {
  gameId: string
  catalog: Plugin[]
  gamePlugins: GamePluginsResult | null
}

export function EquipmentPanel({ gameId, catalog, gamePlugins }: EquipmentPanelProps) {
  const { t } = useTranslation()

  const visiblePlugins = catalog.filter((p) => p.max_stacks > 0)
  if (visiblePlugins.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-medium text-sm">{t("plugins.materia.equipment")}</span>
        <Link
          href={`/games/${gameId}/plugins`}
          className="text-muted-foreground hover:text-foreground"
        >
          <Hammer className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {visiblePlugins.map((plugin, idx) => {
          const tier = GEM_TIERS[idx % GEM_TIERS.length]
          const subs = gamePlugins?.subscriptions.filter(
            (s) => s.plugin.id === plugin.id && !s.subscription.is_revoked
          ) ?? []
          const owned = subs.length
          const cancelledOwned = subs.filter((s) => s.is_cancelled).length
          const activeOwned = owned - cancelledOwned

          return (
            <div key={plugin.id} className="flex items-center gap-2">
              <span className={`text-xs font-semibold w-20 shrink-0 ${tier.text}`}>
                {plugin.display_name}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: plugin.max_stacks }).map((_, si) => (
                  <span key={si} className="relative inline-flex w-5 h-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tier.image}
                      alt={tier.label}
                      className="w-full h-full rounded-full"
                      style={
                        si < activeOwned
                          ? { filter: `drop-shadow(0 0 4px ${tier.glowColor})` }
                          : si < owned
                          ? { filter: "grayscale(0.6) brightness(0.7)", opacity: 0.6 }
                          : { filter: "grayscale(1) brightness(0.3)", opacity: 0.3 }
                      }
                    />
                    {si >= activeOwned && si < owned && (
                      <span className="absolute inset-0 rounded-full border-2 border-orange-400/70" />
                    )}
                  </span>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {owned}/{plugin.max_stacks}
              </span>
            </div>
          )
        })}
      </div>

      <Button
        asChild
        variant="outline"
        size="sm"
        className="mt-3 w-full flex items-center gap-2"
      >
        <Link href={`/games/${gameId}/plugins`}>
          <Hammer className="h-4 w-4" />
          Upgrade This Game
        </Link>
      </Button>
    </div>
  )
}
