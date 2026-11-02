"use client";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/use-translation";
import { SectionHeading } from "./section-heading";

export function SaiPlaySection() {
    const { t } = useTranslation();

    return (<section id="why-sai-server-sai-play" className="border-t py-16">
      <div id="why-sai-server-sai-play-card" className="rounded-xl bg-card p-6 md:p-8">
        <SectionHeading sectionId="why-sai-server-sai-play" eyebrow="Sai Play" title={t("whySaiServer.saiPlay.title")} description={t("whySaiServer.saiPlay.description")} />
        <Button id="why-sai-server-sai-play-button" className="mt-6" size="lg" asChild>
          <a id="why-sai-server-sai-play-link" href="https://play.saigame.studio">{t("whySaiServer.saiPlay.cta")}</a>
        </Button>
      </div>
    </section>);
}
