"use client";
import { Check } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { ZoomableImage } from "./zoomable-image";

// Sponsorship poster: a Go backend developer joining the studio's game project for 6 months, free.
// The Vietnamese poster is the original; other locales use the English version.
const OFFER_IMAGE = { width: 1054, height: 1492 };
const OFFER_IMAGE_SRC: Record<string, string> = {
    vi: "/why-sai-server/backend-sponsorship.png",
    en: "/why-sai-server/backend-sponsorship-en.png",
};
const OFFER_POINTS = ["sponsorship", "infra", "lua"];

export function OfferSection() {
    const { t, locale } = useTranslation();
    return (<section id="why-sai-server-offer" className="grid gap-8 border-t py-16 lg:grid-cols-2">
      <div id="why-sai-server-offer-copy" className="text-left">
        <h2 id="why-sai-server-offer-title" className="mt-3 whitespace-pre-line text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">{t("whySaiServer.offer.title")}</h2>
        <p id="why-sai-server-offer-description" className="mt-4 text-base text-muted-foreground md:text-lg">{t("whySaiServer.offer.description")}</p>
        <ul id="why-sai-server-offer-points" className="mt-8 space-y-4">
          {OFFER_POINTS.map((point) => (<li id={`why-sai-server-offer-point-${point}`} key={point} className="flex gap-3">
              <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true"/>
              <span>{t(`whySaiServer.offer.points.${point}`)}</span>
            </li>))}
        </ul>
      </div>
      <ZoomableImage id="why-sai-server-offer-poster" className="mx-auto w-full max-w-md lg:mr-0" {...OFFER_IMAGE} src={OFFER_IMAGE_SRC[locale] ?? OFFER_IMAGE_SRC.en} alt={t("whySaiServer.offer.posterAlt")} caption={t("whySaiServer.offer.posterCaption")} zoomLabel={t("whySaiServer.integration.screenshotZoom")}/>
    </section>);
}
