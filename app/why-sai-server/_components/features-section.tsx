"use client";
import { useTranslation } from "@/lib/i18n/use-translation";
import { SectionHeading, toKebabCase } from "./section-heading";
import { ZoomableImage } from "./zoomable-image";

const FEATURE_GROUPS = [
    { key: "players", items: ["auth", "cloudSave", "mailbox"] },
    { key: "economy", items: ["inventory", "gacha", "shop", "crafting", "generator", "loadouts"] },
    { key: "retention", items: ["quests", "leaderboards", "analytics"] },
];
// Web admin: a game's Item Catalogue with the feature tabs (Items, Gacha, Shops, Crafting, ...).
const GAME_DETAIL_IMAGE = { src: "/why-sai-server/game-detail.jpg", width: 1529, height: 747 };

export function FeaturesSection() {
    const { t } = useTranslation();
    return (<section id="why-sai-server-features" className="border-t py-16">
      <SectionHeading sectionId="why-sai-server-features" eyebrow={t("whySaiServer.features.eyebrow")} title={t("whySaiServer.features.title")} description={t("whySaiServer.features.description")}/>
      {FEATURE_GROUPS.map((group) => (<div id={`why-sai-server-features-group-${group.key}`} key={group.key} className="mt-10">
          <h3 id={`why-sai-server-features-group-${group.key}-title`} className="border-b pb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {t(`whySaiServer.features.groups.${group.key}`)}
          </h3>
          <div id={`why-sai-server-features-group-${group.key}-list`} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (<div id={`why-sai-server-feature-${toKebabCase(item)}`} key={item} className="rounded-xl border bg-card p-5">
                <h4 className="font-semibold">{t(`whySaiServer.features.items.${item}.title`)}</h4>
                <p className="mt-2 text-sm text-muted-foreground">{t(`whySaiServer.features.items.${item}.desc`)}</p>
              </div>))}
          </div>
        </div>))}
      <ZoomableImage id="why-sai-server-features-screenshot" className="mx-auto mt-12 max-w-5xl" sizes="(min-width: 1024px) 1024px, 100vw" {...GAME_DETAIL_IMAGE} alt={t("whySaiServer.features.screenshotAlt")} caption={t("whySaiServer.features.screenshotCaption")} zoomLabel={t("whySaiServer.integration.screenshotZoom")}/>
    </section>);
}
