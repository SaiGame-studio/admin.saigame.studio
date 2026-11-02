"use client";
import { Check } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { toKebabCase } from "./section-heading";

const OFFER_POINTS = ["sponsorship", "infra", "lua"];
const PRICING_ROWS = ["oneTime", "perGame", "scale"];

export function OfferSection() {
    const { t } = useTranslation();
    return (<section id="why-sai-server-offer" className="grid gap-8 border-t py-16 lg:grid-cols-2">
      <div id="why-sai-server-offer-copy">
        <h2 id="why-sai-server-offer-title" className="mt-3 whitespace-pre-line text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">{t("whySaiServer.offer.title")}</h2>
        <p id="why-sai-server-offer-description" className="mt-4 text-base text-muted-foreground md:text-lg">{t("whySaiServer.offer.description")}</p>
        <ul id="why-sai-server-offer-points" className="mt-8 space-y-4">
          {OFFER_POINTS.map((point) => (<li id={`why-sai-server-offer-point-${point}`} key={point} className="flex gap-3">
              <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true"/>
              <span>{t(`whySaiServer.offer.points.${point}`)}</span>
            </li>))}
        </ul>
      </div>
      <div id="why-sai-server-offer-pricing" className="rounded-xl border bg-card p-6 md:p-8">
        <h3 id="why-sai-server-offer-pricing-title" className="text-xl font-semibold">{t("whySaiServer.offer.pricingTitle")}</h3>
        <dl id="why-sai-server-offer-pricing-list" className="mt-4">
          {PRICING_ROWS.map((row) => (<div id={`why-sai-server-offer-pricing-${toKebabCase(row)}`} key={row} className="border-t py-4 last:pb-0">
              <dt className="font-medium">{t(`whySaiServer.offer.pricing.${row}.title`)}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{t(`whySaiServer.offer.pricing.${row}.desc`)}</dd>
            </div>))}
        </dl>
      </div>
    </section>);
}
