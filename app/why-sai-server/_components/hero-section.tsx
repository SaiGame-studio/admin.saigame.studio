"use client";
import Link from "next/link";
import { Check, Circle, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/use-translation";

const SDK_SERVICES = [
    "SaiAuth",
    "2FA",
    "GamerProgress",
    "Mailbox",
    "PlayerContainer",
    "GachaPack",
    "ItemCrafting",
    "Shop",
    "DailyQuest",
    "LeaderBoard",
    "PlayerEvent",
    "BattleScript",
    "EquipmentSlot",
];

export function HeroSection() {
    const { t } = useTranslation();
    return (<section id="why-sai-server-hero" className="grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-20">
      <div id="why-sai-server-hero-copy">
        <h1 id="why-sai-server-hero-title" className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">{t("whySaiServer.hero.title")}</h1>
        <p id="why-sai-server-hero-subtitle" className="mt-6 whitespace-pre-line text-xl font-semibold">{t("whySaiServer.hero.subtitle").replace(/([.!?。])\s*/, "$1\n")}</p>
        <p id="why-sai-server-hero-description" className="mt-3 max-w-xl text-base text-muted-foreground md:text-lg">{t("whySaiServer.hero.description")}</p>
        <div id="why-sai-server-hero-actions" className="mt-8 flex flex-wrap gap-3">
          <Button id="why-sai-server-hero-offer-button" size="lg" asChild>
            <a id="why-sai-server-hero-offer-link" href="#why-sai-server-offer">{t("whySaiServer.hero.ctaOffer")}</a>
          </Button>
          <Button id="why-sai-server-hero-tutorials-button" size="lg" variant="outline" asChild>
            <Link id="why-sai-server-hero-tutorials-link" href="/tutorials">{t("whySaiServer.hero.ctaTutorials")}</Link>
          </Button>
        </div>
        <p id="why-sai-server-hero-tags" className="mt-6 text-sm text-muted-foreground">{t("whySaiServer.hero.tags")}</p>
      </div>

      <div id="why-sai-server-hero-inspector" className="overflow-hidden rounded-xl border bg-card font-mono text-sm shadow-sm">
        <div id="why-sai-server-hero-inspector-header" className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
          <span id="why-sai-server-hero-inspector-name" className="flex items-center gap-2"><Box id="why-sai-server-hero-inspector-icon" className="h-4 w-4" aria-hidden="true" />SaiServer</span>
          <span id="why-sai-server-hero-inspector-badge" className="rounded bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">Prefab</span>
        </div>
        <dl id="why-sai-server-hero-inspector-fields" className="space-y-2 border-b px-4 py-4">
          <div id="why-sai-server-hero-inspector-endpoint" className="flex justify-between gap-3">
            <dt id="why-sai-server-hero-inspector-endpoint-label" className="text-muted-foreground">Server Endpoint</dt>
            <dd id="why-sai-server-hero-inspector-endpoint-value">api.saigame.studio</dd>
          </div>
          <div id="why-sai-server-hero-inspector-game-id" className="flex justify-between gap-3">
            <dt id="why-sai-server-hero-inspector-game-id-label" className="text-muted-foreground">Game ID</dt>
            <dd id="why-sai-server-hero-inspector-game-id-value">••••-••••-7c2e</dd>
          </div>
        </dl>
        <div id="why-sai-server-hero-inspector-services" className="px-4 py-4">
          <p id="why-sai-server-hero-inspector-services-label" className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">{t("whySaiServer.hero.servicesLabel")}</p>
          <ul id="why-sai-server-hero-inspector-services-list" className="grid grid-cols-2 gap-x-4 gap-y-2">
            {SDK_SERVICES.map((service) => (<li id={`why-sai-server-hero-service-${service.toLowerCase()}`} key={service} className="truncate">
                <Circle id={`why-sai-server-hero-service-${service.toLowerCase()}-icon`} className="h-2 w-2 fill-current" aria-hidden="true" />{service}
              </li>))}
          </ul>
        </div>
        <div id="why-sai-server-hero-inspector-console" className="border-t bg-muted/30 px-4 py-3 text-primary"><Check id="why-sai-server-hero-inspector-console-icon" className="h-4 w-4" aria-hidden="true" />Connection test passed!</div>
      </div>
    </section>);
}
