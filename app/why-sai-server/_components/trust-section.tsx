"use client";
import { useTranslation } from "@/lib/i18n/use-translation";
import { SectionHeading } from "./section-heading";

const TRUST_ITEMS = ["server", "idempotency", "odds", "liveops"];

export function TrustSection() {
    const { t } = useTranslation();
    return (<section id="why-sai-server-trust" className="border-t py-16">
      <SectionHeading sectionId="why-sai-server-trust" eyebrow={t("whySaiServer.trust.eyebrow")} title={t("whySaiServer.trust.title")}/>
      <div id="why-sai-server-trust-list" className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST_ITEMS.map((item) => (<div id={`why-sai-server-trust-${item}`} key={item}>
            <h3 className="font-semibold">{t(`whySaiServer.trust.items.${item}.title`)}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t(`whySaiServer.trust.items.${item}.desc`)}</p>
          </div>))}
      </div>
    </section>);
}
